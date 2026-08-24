begin;

-- 1. Insert capability for AI Copilot
insert into public.capabilities (key, resource, action, description)
values (
  'investigations.ai_copilot',
  'investigations',
  'ai_copilot',
  'Interactuar con el Copiloto de IA y generar dictámenes enriquecidos.'
)
on conflict (key) do update
set description = excluded.description;

-- 2. Link capability to roles (owner, admin, analyst)
insert into public.role_capabilities (role_key, capability_key)
values
  ('owner', 'investigations.ai_copilot'),
  ('admin', 'investigations.ai_copilot'),
  ('analyst', 'investigations.ai_copilot')
on conflict (role_key, capability_key) do nothing;

-- 3. Extend consume_billing_entitlement_usage to support AI query limits
create or replace function public.consume_billing_entitlement_usage(
  p_tenant_id uuid,
  p_entitlement_key text
)
returns table (
  allowed boolean,
  usage_count integer,
  limit_value integer
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
  v_usage_id uuid;
  v_usage_count integer;
  v_canonical_key text;
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

  -- Validate specific capabilities based on entitlement
  if v_canonical_key = 'investigations.export_pdf_monthly' then
    if not public.has_capability(v_user_id, p_tenant_id, 'investigations.export') then
      raise exception using
        errcode = '42501',
        message = 'investigations export capability required';
    end if;
  elsif v_canonical_key in ('limits.ai_queries_monthly', 'investigations.ai_queries_monthly', 'ai.queries_monthly') then
    if not public.has_capability(v_user_id, p_tenant_id, 'investigations.ai_copilot') then
      raise exception using
        errcode = '42501',
        message = 'investigations ai copilot capability required';
    end if;
  end if;

  -- 1. Check tenant plan override first
  select override.limit_value
    into v_limit
  from public.tenant_plan_overrides as override
  where override.tenant_id = p_tenant_id
    and lower(trim(override.entitlement_key)) in (v_canonical_key, 'limits.ai_queries_monthly', 'investigations.ai_queries_monthly')
    and override.is_enabled
  limit 1;

  -- 2. If no override, check active subscription plan entitlement
  if v_limit is null then
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
  end if;

  if v_limit is null
    or v_limit < 1
    or v_limit <> trunc(v_limit)
  then
    return query
    select false, 0, null::integer;
    return;
  end if;

  insert into public.billing_entitlement_usage as usage (
    tenant_id,
    entitlement_key,
    period_start,
    usage_count
  )
  values (
    p_tenant_id,
    v_canonical_key,
    v_period_start,
    1
  )
  on conflict (tenant_id, entitlement_key, period_start) do update
  set usage_count = case
    when usage.usage_count < v_limit then usage.usage_count + 1
    else usage.usage_count
  end
  returning usage.id, usage.usage_count
  into v_usage_id, v_usage_count;

  if v_usage_count <= v_limit then
    return query
    select true, v_usage_count, v_limit::integer;
  else
    return query
    select false, v_usage_count, v_limit::integer;
  end if;
end;
$$;

-- 4. Function to query current usage without consuming/incrementing
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

  -- 2. Check active subscription plan entitlement
  if v_limit is null then
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
  end if;

  -- Read current usage
  select coalesce(usage.usage_count, 0)
    into v_usage
  from public.billing_entitlement_usage as usage
  where usage.tenant_id = p_tenant_id
    and usage.entitlement_key = v_canonical_key
    and usage.period_start = v_period_start
  limit 1;

  if v_limit is null then
    return query select coalesce(v_usage, 0), null::integer, null::integer;
  else
    return query select coalesce(v_usage, 0), v_limit::integer, greatest(0, v_limit::integer - coalesce(v_usage, 0));
  end if;
end;
$$;

commit;
