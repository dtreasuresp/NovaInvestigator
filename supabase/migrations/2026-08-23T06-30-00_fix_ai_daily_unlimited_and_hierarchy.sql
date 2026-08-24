-- ==============================================================================
-- Migración: Fix Daily AI Quota RPCs — Distinción de 'Sin Registro' vs 'Ilimitado (NULL)'
-- Fecha: 2026-08-23T06:30:00
-- ==============================================================================

begin;

-- 1. Redefinir get_ai_daily_remaining con jerarquía 3D estricta y distinción v_found vs v_limit IS NULL
create or replace function public.get_ai_daily_remaining(p_tenant_id uuid)
returns table (remaining integer, limit_value integer, consumed integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_limit numeric;
  v_consumed integer := 0;
  v_found boolean := false;
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

  -- Nivel 1: Tenant Plan Override (prioridad máxima)
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if found then
    v_found := true;
  end if;

  -- Nivel 2: Suscripción activa -> Plan -> Plan Entitlements
  if not v_found then
    select pe.limit_value into v_limit
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.plan_entitlements pe on pe.plan_id = p.id
    where s.tenant_id = p_tenant_id
      and s.status in ('active', 'trialing')
      and (s.current_period_start is null or s.current_period_start <= v_now)
      and (s.current_period_end is null or s.current_period_end > v_now)
      and p.is_active
      and lower(trim(pe.entitlement_key)) = 'limits.ai_queries_daily'
      and pe.is_enabled
    order by s.updated_at desc
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- Nivel 3: Tenant Entitlements (proyección de tenant / grant)
  if not v_found then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id
      and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily'
      and te.is_enabled
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- Caso A: Sin registro de entitlement -> 0 (denegado por defecto / fail closed)
  if not v_found then
    return query select 0::integer, 0::integer, 0::integer;
    return;
  end if;

  -- Caso B: Registro encontrado con limit_value NULL -> Ilimitado explícito
  if v_limit is null then
    return query select null::integer, null::integer, 0::integer;
    return;
  end if;

  -- Caso C: Límite numérico configurado -> Consultar bucket de consumo (ventana móvil 24h)
  select * into v_bucket
  from public.rate_limit_buckets b
  where b.scope = 'ai_chat_daily'
    and b.key = p_tenant_id::text
    and b.action = 'ai.chat.send'
  limit 1;

  if not found then
    return query select v_limit::integer, v_limit::integer, 0::integer;
    return;
  end if;

  -- Si la ventana expiró, el consumo actual en la ventana es 0
  if v_bucket.window_start + make_interval(secs => v_bucket.window_seconds::double precision) <= v_now then
    return query select v_limit::integer, v_limit::integer, 0::integer;
  else
    v_consumed := coalesce(v_bucket.attempt_count, 0);
    return query select greatest(0, v_limit::integer - v_consumed), v_limit::integer, v_consumed::integer;
  end if;
end;
$$;

-- 2. Redefinir consume_ai_daily_quota con la misma lógica estricta
create or replace function public.consume_ai_daily_quota(p_tenant_id uuid)
returns table (allowed boolean, remaining integer, limit_value integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_limit numeric;
  v_allowed boolean;
  v_found boolean := false;
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

  -- Nivel 1: Tenant Plan Override
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if found then
    v_found := true;
  end if;

  -- Nivel 2: Suscripción activa -> Plan
  if not v_found then
    select pe.limit_value into v_limit
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.plan_entitlements pe on pe.plan_id = p.id
    where s.tenant_id = p_tenant_id
      and s.status in ('active', 'trialing')
      and (s.current_period_start is null or s.current_period_start <= v_now)
      and (s.current_period_end is null or s.current_period_end > v_now)
      and p.is_active
      and lower(trim(pe.entitlement_key)) = 'limits.ai_queries_daily'
      and pe.is_enabled
    order by s.updated_at desc
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- Nivel 3: Tenant Entitlements
  if not v_found then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id
      and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily'
      and te.is_enabled
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- Caso A: Sin registro -> Denegado
  if not v_found then
    return query select false, 0::integer, 0::integer;
    return;
  end if;

  -- Caso B: Ilimitado explícito (NULL) -> Permitido sin descontar bucket
  if v_limit is null then
    return query select true, null::integer, null::integer;
    return;
  end if;

  if v_limit < 1 or v_limit <> trunc(v_limit) then
    return query select false, 0::integer, null::integer;
    return;
  end if;

  -- Caso C: Descontar atómicamente del rate limit bucket
  v_allowed := public.consume_rate_limit('ai_chat_daily', p_tenant_id::text, 'ai.chat.send', 86400, v_limit::integer);

  if v_allowed then
    return query select true, (v_limit::integer - (select attempt_count from public.rate_limit_buckets where scope='ai_chat_daily' and key=p_tenant_id::text and action='ai.chat.send')), v_limit::integer;
  else
    return query select false, 0::integer, v_limit::integer;
  end if;
end;
$$;

-- 3. Sincronizar tenant_entitlements para reflejar el plan activo actual
insert into public.tenant_entitlements (tenant_id, entitlement_key, limit_value, is_enabled, source, updated_at)
select s.tenant_id, pe.entitlement_key, pe.limit_value, pe.is_enabled, 'plan', now()
from public.subscriptions s
join public.plans p on p.id = s.plan_id
join public.plan_entitlements pe on pe.plan_id = p.id
where s.status in ('active', 'trialing')
  and (s.current_period_start is null or s.current_period_start <= now())
  and (s.current_period_end is null or s.current_period_end > now())
  and p.is_active
  and pe.entitlement_key in ('limits.ai_queries_daily', 'limits.ai_queries_monthly')
on conflict (tenant_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled, source = 'plan', updated_at = now();

-- 4. Permisos y comentarios
revoke all on function public.get_ai_daily_remaining(uuid) from public, anon, authenticated;
revoke all on function public.consume_ai_daily_quota(uuid) from public, anon, authenticated;
grant execute on function public.get_ai_daily_remaining(uuid) to authenticated, service_role;
grant execute on function public.consume_ai_daily_quota(uuid) to authenticated, service_role;

comment on function public.get_ai_daily_remaining(uuid) is 'Distinción estricta entre no encontrado (0/denegado) e ilimitado (NULL) con jerarquía 3D.';
comment on function public.consume_ai_daily_quota(uuid) is 'Consumo diario atómico con distinción estricta de ilimitado (NULL).';

commit;
