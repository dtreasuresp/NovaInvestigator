begin;

create table if not exists public.billing_entitlement_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entitlement_key text not null,
  period_start date not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, entitlement_key, period_start)
);

create index if not exists billing_entitlement_usage_tenant_period_idx
  on public.billing_entitlement_usage (tenant_id, period_start desc);

drop trigger if exists billing_entitlement_usage_set_updated_at
  on public.billing_entitlement_usage;
create trigger billing_entitlement_usage_set_updated_at
before update on public.billing_entitlement_usage
for each row execute function public.set_updated_at();

alter table public.billing_entitlement_usage enable row level security;

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
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authenticated user required';
  end if;

  if p_tenant_id is null
    or p_entitlement_key is distinct from 'investigations.export_pdf_monthly'
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported entitlement usage request';
  end if;

  if not public.is_active_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      errcode = '42501',
      message = 'active tenant membership required';
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'investigations.export') then
    raise exception using
      errcode = '42501',
      message = 'investigations export capability required';
  end if;

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
    and entitlement.entitlement_key = p_entitlement_key
    and entitlement.is_enabled
  order by subscription.updated_at desc
  limit 1;

  if v_limit is null
    or v_limit < 1
    or v_limit <> trunc(v_limit)
  then
    return query
    select false, 0, null::integer;
    return;
  end if;

  insert into public.billing_entitlement_usage as counter_row (
    tenant_id,
    entitlement_key,
    period_start,
    usage_count
  )
  values (
    p_tenant_id,
    p_entitlement_key,
    v_period_start,
    1
  )
  on conflict (tenant_id, entitlement_key, period_start)
  do update
  set usage_count = counter_row.usage_count + 1,
      updated_at = clock_timestamp()
  where counter_row.usage_count < v_limit
  returning id, usage_count
    into v_usage_id, v_usage_count;

  if not found then
    select usage.usage_count
      into v_usage_count
    from public.billing_entitlement_usage as usage
    where usage.tenant_id = p_tenant_id
      and usage.entitlement_key = p_entitlement_key
      and usage.period_start = v_period_start;

    return query
    select false, coalesce(v_usage_count, 0), v_limit::integer;
    return;
  end if;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values (
    p_tenant_id,
    v_user_id,
    'user',
    'investigations.export_pdf',
    'billing_entitlement_usage',
    v_usage_id,
    jsonb_build_object(
      'entitlement_key', p_entitlement_key,
      'period_start', v_period_start,
      'usage_count', v_usage_count,
      'limit_value', v_limit::integer
    ),
    jsonb_build_object('reservation', true)
  );

  return query
  select true, v_usage_count, v_limit::integer;
end;
$$;

comment on table public.billing_entitlement_usage is
  'Tenant-scoped calendar-period usage counters for numeric billing entitlements.';

comment on function public.consume_billing_entitlement_usage(uuid, text) is
  'Atomically reserves one monthly PDF export for an active subscription entitlement.';

revoke all on public.billing_entitlement_usage from anon, authenticated;
grant all on public.billing_entitlement_usage to service_role;

revoke all on function public.consume_billing_entitlement_usage(uuid, text)
  from public, anon, authenticated;
grant execute on function public.consume_billing_entitlement_usage(uuid, text)
  to authenticated, service_role;

commit;
