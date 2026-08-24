begin;

-- ==============================================================================
-- PLAN_REFACTOR_RBAC Fase 3 + Requisito AI Chat: entitlements diarios AI
-- Doc: PLAN_REFACTOR_RBAC §10-11 (entitlements + policies) + HIPÓTESIS plan final
-- Complementa: 2026-08-19T22-00-00_ai_copilot_entitlements_and_usage.sql
-- Mantiene SODA: src/features/ai + src/features/access
-- ==============================================================================

-- 1. Semilla de entitlement diario en planes existentes (idempotente)
insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
select p.id, 'limits.ai_queries_daily', v.limit_value, true
from public.plans p
join (values
  ('free', 10),
  ('basic', 20),
  ('team', 100),
  ('enterprise', null),
  ('trial', 10),
  ('one_time_access', 5)
) as v(plan_code, limit_value) on lower(p.code) = v.plan_code
on conflict (plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = true;

-- También hidratar tenant_entitlements para tenants con suscripción activa (proyección local §10)
insert into public.tenant_entitlements (tenant_id, entitlement_key, limit_value, is_enabled, source)
select s.tenant_id, 'limits.ai_queries_daily', pe.limit_value, pe.is_enabled, 'plan'
from public.subscriptions s
join public.plans p on p.id = s.plan_id
join public.plan_entitlements pe on pe.plan_id = p.id
where pe.entitlement_key = 'limits.ai_queries_daily'
  and s.status in ('active','trialing')
  and (s.current_period_start is null or s.current_period_start <= now())
  and (s.current_period_end is null or s.current_period_end > now())
  and p.is_active
on conflict (tenant_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled, source = 'plan', updated_at = now();

-- 2. Peek diario sin consumo (policy contextual §11) — reutiliza rate_limit_buckets
create or replace function public.get_ai_daily_remaining(p_tenant_id uuid)
returns table (remaining integer, limit_value integer, consumed integer)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_limit numeric;
  v_consumed integer := 0;
  v_bucket record;
begin
  if v_user_id is null then
    raise exception using errcode='42501', message='authenticated user required';
  end if;
  if p_tenant_id is null then
    raise exception using errcode='22023', message='tenant required';
  end if;
  if not public.is_active_tenant_member(v_user_id, p_tenant_id) then
    raise exception using errcode='42501', message='active tenant membership required';
  end if;

  -- resolver límite diario (override > subscription > tenant_entitlements)
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if v_limit is null then
    select pe.limit_value into v_limit
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.plan_entitlements pe on pe.plan_id = p.id
    where s.tenant_id = p_tenant_id
      and s.status in ('active','trialing')
      and (s.current_period_start is null or s.current_period_start <= now())
      and (s.current_period_end is null or s.current_period_end > now())
      and p.is_active
      and lower(trim(pe.entitlement_key)) = 'limits.ai_queries_daily'
      and pe.is_enabled
    order by s.updated_at desc
    limit 1;
  end if;

  if v_limit is null then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily' and te.is_enabled
    limit 1;
  end if;

  if v_limit is null then
    return query select null::integer, null::integer, 0;
    return;
  end if;

  if v_limit is null then
    return query select null::integer, null::integer, 0;
    return;
  end if;

  -- leer bucket diario (scope ai_chat_daily, action ai.chat.send)
  select * into v_bucket
  from public.rate_limit_buckets b
  where b.scope = 'ai_chat_daily' and b.key = p_tenant_id::text and b.action = 'ai.chat.send'
  limit 1;

  if not found then
    return query select v_limit::integer, v_limit::integer, 0;
    return;
  end if;

  -- si ventana expiró, el bucket se reciclará en consume_rate_limit, aquí lo consideramos 0
  if v_bucket.window_start + make_interval(secs => v_bucket.window_seconds::double precision) <= v_now then
    return query select v_limit::integer, v_limit::integer, 0;
  else
    v_consumed := coalesce(v_bucket.attempt_count, 0);
    return query select greatest(0, v_limit::integer - v_consumed), v_limit::integer, v_consumed;
  end if;
end;
$$;

-- 3. Consumo diario atómico (policy) — wrapper sobre consume_rate_limit con límite del plan
create or replace function public.consume_ai_daily_quota(p_tenant_id uuid)
returns table (allowed boolean, remaining integer, limit_value integer)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_limit numeric;
  v_allowed boolean;
begin
  -- resolver límite igual que en peek
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if v_limit is null then
    select pe.limit_value into v_limit
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.plan_entitlements pe on pe.plan_id = p.id
    where s.tenant_id = p_tenant_id
      and s.status in ('active','trialing')
      and (s.current_period_start is null or s.current_period_start <= now())
      and (s.current_period_end is null or s.current_period_end > now())
      and p.is_active
      and lower(trim(pe.entitlement_key)) = 'limits.ai_queries_daily'
      and pe.is_enabled
    order by s.updated_at desc
    limit 1;
  end if;

  if v_limit is null then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily' and te.is_enabled
    limit 1;
  end if;

  -- null = ilimitado
  if v_limit is null then
    return query select true, null::integer, null::integer;
    return;
  end if;

  if v_limit < 1 or v_limit <> trunc(v_limit) then
    return query select false, 0, null::integer;
    return;
  end if;

  -- consume_rate_limit usa ventana 86400 (24h) por tenant
  v_allowed := public.consume_rate_limit('ai_chat_daily', p_tenant_id::text, 'ai.chat.send', 86400, v_limit::integer);

  if v_allowed then
    return query select true, (v_limit::integer - (select attempt_count from public.rate_limit_buckets where scope='ai_chat_daily' and key=p_tenant_id::text and action='ai.chat.send')), v_limit::integer;
  else
    return query select false, 0, v_limit::integer;
  end if;
end;
$$;

revoke all on function public.get_ai_daily_remaining(uuid) from public, anon, authenticated;
revoke all on function public.consume_ai_daily_quota(uuid) from public, anon, authenticated;
grant execute on function public.get_ai_daily_remaining(uuid) to authenticated, service_role;
grant execute on function public.consume_ai_daily_quota(uuid) to authenticated, service_role;

comment on function public.get_ai_daily_remaining(uuid) is 'Policy contextual §11: peek del tope diario de IA (limits.ai_queries_daily) por tenant. No consume.';
comment on function public.consume_ai_daily_quota(uuid) is 'Policy contextual §11: consume 1 unidad diaria de IA atómicamente vía rate_limit_buckets 24h.';

commit;
