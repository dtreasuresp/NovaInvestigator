begin;

create table if not exists public.tenant_plan_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  entitlement_key text not null
    check (length(trim(entitlement_key)) > 0),
  limit_value numeric
    check (limit_value is null or limit_value >= 0),
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, plan_id, entitlement_key)
);

create index if not exists tenant_plan_overrides_tenant_plan_idx
  on public.tenant_plan_overrides (tenant_id, plan_id);

create index if not exists tenant_plan_overrides_plan_entitlement_idx
  on public.tenant_plan_overrides (plan_id, entitlement_key);

drop trigger if exists tenant_plan_overrides_set_updated_at
  on public.tenant_plan_overrides;
create trigger tenant_plan_overrides_set_updated_at
before update on public.tenant_plan_overrides
for each row execute function public.set_updated_at();

alter table public.tenant_plan_overrides enable row level security;

drop policy if exists tenant_plan_overrides_select_managed
  on public.tenant_plan_overrides;
create policy tenant_plan_overrides_select_managed
on public.tenant_plan_overrides
for select
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'billing.entitlements.read')
);

comment on table public.tenant_plan_overrides is
  'Tenant-scoped effective entitlement overrides. Writes are server-side and audited.';

comment on column public.tenant_plan_overrides.limit_value is
  'Tenant-specific numeric limit. Null preserves the entitlement unlimited semantics.';

revoke all on public.tenant_plan_overrides from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.tenant_plan_overrides from authenticated;
grant select on public.tenant_plan_overrides to authenticated;
grant all on public.tenant_plan_overrides to service_role;

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

  select case
           when override_row.id is not null then override_row.limit_value
           else entitlement.limit_value
         end
    into v_limit
  from public.subscriptions as subscription
  join public.plans as plan
    on plan.id = subscription.plan_id
  join public.plan_entitlements as entitlement
    on entitlement.plan_id = plan.id
  left join public.tenant_plan_overrides as override_row
    on override_row.tenant_id = p_tenant_id
   and override_row.plan_id = plan.id
   and override_row.entitlement_key = entitlement.entitlement_key
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
    and case
          when override_row.id is not null then override_row.is_enabled
          else entitlement.is_enabled
        end
  order by subscription.updated_at desc
  limit 1;

  if not found then
    return query
    select false, 0, null::integer;
    return;
  end if;

  if v_limit is null then
    return query
    select true, 0, null::integer;
    return;
  end if;

  if v_limit < 1
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

revoke all on function public.consume_billing_entitlement_usage(uuid, text)
  from public, anon, authenticated;
grant execute on function public.consume_billing_entitlement_usage(uuid, text)
  to authenticated, service_role;

commit;
