begin;

-- ==============================================================================
-- Fix: Missing AI entitlements should be 0 (denied), not null (unlimited)
-- Distinguishes "no row" (missing) vs "row with limit null" (explicit unlimited)
-- No plan hardcoding — pure generic logic, admin configures via UI
-- ==============================================================================

-- Fix get_billing_entitlement_usage for monthly (limits.ai_queries_monthly)
create or replace function public.get_billing_entitlement_usage(
  p_tenant_id uuid,
  p_entitlement_key text
)
returns table (
  usage_count integer,
  limit_value integer,
  remaining integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_period_start date := date_trunc('month', v_now)::date;
  v_limit numeric;
  v_usage integer := 0;
  v_canonical_key text;
  v_found boolean := false;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authenticated user required';
  end if;

  if p_tenant_id is null or p_entitlement_key is null then
    raise exception using
      errcode = '22023',
      message = 'unsupported entitlement usage request';
  end if;

  v_canonical_key := lower(trim(p_entitlement_key));

  if not public.is_active_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      errcode = '42501',
      message = 'active tenant membership required';
  end if;

  -- 1. Check tenant plan override first
  select override.limit_value
    into v_limit
  from public.tenant_plan_overrides as override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) in (v_canonical_key, 'limits.ai_queries_monthly', 'investigations.ai_queries_monthly')
    and override.is_enabled
  limit 1;

  if found then
    v_found := true;
  end if;

  -- 2. Check active subscription plan entitlement if not found in override
  if not v_found then
    select entitlement.limit_value
      into v_limit
    from public.subscriptions as subscription
    join public.plans as plan
      on plan.id = subscription.plan_id
    join public.plan_entitlements as entitlement
      on entitlement.plan_id = plan.id
    where subscription.tenant_id = p_tenant_id
      and subscription.status in ('active', 'trialing')
      and (
        subscription.current_period_start is null
        or subscription.current_period_start <= v_now
      )
      and (
        subscription.current_period_end is null
        or subscription.current_period_end > v_now
      )
      and plan.is_active
      and lower(trim(entitlement.entitlement_key)) in (v_canonical_key, 'limits.ai_queries_monthly', 'investigations.ai_queries_monthly')
      and entitlement.is_enabled
    order by subscription.updated_at desc
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- 3. Check tenant_entitlements projection (for daily/monthly)
  if not v_found then
    select te.limit_value
      into v_limit
    from public.tenant_entitlements as te
    where te.tenant_id = p_tenant_id
      and lower(trim(te.entitlement_key)) in (v_canonical_key, 'limits.ai_queries_monthly', 'investigations.ai_queries_monthly')
      and te.is_enabled
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- Read current usage
  select coalesce(usage.usage_count, 0)
    into v_usage
  from public.billing_entitlement_usage as usage
  where usage.tenant_id = p_tenant_id
    and usage.entitlement_key = v_canonical_key
    and usage.period_start = v_period_start
  limit 1;

  -- FIX: Missing row (not found) => limit 0 (denied), not null (unlimited)
  -- Only when row exists with limit null => unlimited (null)
  if not v_found then
    return query select coalesce(v_usage, 0), 0::integer, 0::integer;
  end if;

  if v_limit is null then
    -- Explicit unlimited (row exists with null)
    return query select coalesce(v_usage, 0), null::integer, null::integer;
  else
    return query select coalesce(v_usage, 0), v_limit::integer, greatest(0, v_limit::integer - coalesce(v_usage, 0));
  end if;
end;
$$;

-- Fix get_ai_daily_remaining for daily (limits.ai_queries_daily)
create or replace function public.get_ai_daily_remaining(p_tenant_id uuid)
returns table (remaining integer, limit_value integer, consumed integer)
language plpgsql security definer set search_path = pg_catalog, public
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

  -- resolver límite diario (override > subscription > tenant_entitlements)
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if found then
    v_found := true;
  end if;

  if not v_found then
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

    if found then
      v_found := true;
    end if;
  end if;

  if not v_found then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily' and te.is_enabled
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- FIX: Missing => 0 (denied), not null (unlimited)
  if not v_found then
    return query select 0::integer, 0::integer, 0::integer;
    return;
  end if;

  if v_limit is null then
    -- Explicit unlimited
    return query select null::integer, null::integer, 0::integer;
    return;
  end if;

  -- leer bucket diario (scope ai_chat_daily, action ai.chat.send)
  select * into v_bucket
  from public.rate_limit_buckets b
  where b.scope = 'ai_chat_daily' and b.key = p_tenant_id::text and b.action = 'ai.chat.send'
  limit 1;

  if not found then
    return query select v_limit::integer, v_limit::integer, 0::integer;
    return;
  end if;

  -- si ventana expiró, el bucket se reciclará en consume_rate_limit, aquí lo consideramos 0 consumo
  if v_bucket.window_start + make_interval(secs => v_bucket.window_seconds::double precision) <= v_now then
    return query select v_limit::integer, v_limit::integer, 0::integer;
  else
    v_consumed := coalesce(v_bucket.attempt_count, 0);
    return query select greatest(0, v_limit::integer - v_consumed), v_limit::integer, v_consumed::integer;
  end if;
end;
$$;

-- Fix consume_ai_daily_quota for daily (missing => denied, not unlimited)
create or replace function public.consume_ai_daily_quota(p_tenant_id uuid)
returns table (allowed boolean, remaining integer, limit_value integer)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_limit numeric;
  v_allowed boolean;
  v_found boolean := false;
begin
  -- resolver límite igual que en peek
  select override.limit_value into v_limit
  from public.tenant_plan_overrides override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) = 'limits.ai_queries_daily'
    and override.is_enabled
  limit 1;

  if found then
    v_found := true;
  end if;

  if not v_found then
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

    if found then
      v_found := true;
    end if;
  end if;

  if not v_found then
    select te.limit_value into v_limit
    from public.tenant_entitlements te
    where te.tenant_id = p_tenant_id and lower(trim(te.entitlement_key)) = 'limits.ai_queries_daily' and te.is_enabled
    limit 1;

    if found then
      v_found := true;
    end if;
  end if;

  -- FIX: Missing => denied (0), not unlimited
  if not v_found then
    return query select false, 0::integer, 0::integer;
    return;
  end if;

  -- null = explicit unlimited (row exists with null)
  if v_limit is null then
    return query select true, null::integer, null::integer;
    return;
  end if;

  if v_limit < 1 or v_limit <> trunc(v_limit) then
    return query select false, 0::integer, null::integer;
    return;
  end if;

  -- consume_rate_limit usa ventana 86400 (24h) por tenant
  v_allowed := public.consume_rate_limit('ai_chat_daily', p_tenant_id::text, 'ai.chat.send', 86400, v_limit::integer);

  if v_allowed then
    return query select true, (v_limit::integer - (select attempt_count from public.rate_limit_buckets where scope='ai_chat_daily' and key=p_tenant_id::text and action='ai.chat.send')), v_limit::integer;
  else
    return query select false, 0::integer, v_limit::integer;
  end if;
end;
$$;

revoke all on function public.get_billing_entitlement_usage(uuid, text) from public, anon, authenticated;
revoke all on function public.get_ai_daily_remaining(uuid) from public, anon, authenticated;
revoke all on function public.consume_ai_daily_quota(uuid) from public, anon, authenticated;
grant execute on function public.get_billing_entitlement_usage(uuid, text) to authenticated, service_role;
grant execute on function public.get_ai_daily_remaining(uuid) to authenticated, service_role;
grant execute on function public.consume_ai_daily_quota(uuid) to authenticated, service_role;

comment on function public.get_billing_entitlement_usage(uuid, text) is 'Fixed: Missing entitlement now returns 0 (denied), explicit null stays unlimited. No plan hardcoding.';
comment on function public.get_ai_daily_remaining(uuid) is 'Fixed: Missing daily now returns 0 (denied) per admin UI config, not unlimited.';
comment on function public.consume_ai_daily_quota(uuid) is 'Fixed: Missing daily now denies (false,0,0).';

commit;
