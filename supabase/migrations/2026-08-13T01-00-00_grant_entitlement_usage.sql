begin;

alter table public.billing_entitlement_usage
  add column if not exists grant_id uuid references public.access_grants(id) on delete cascade;

create index if not exists billing_entitlement_usage_grant_period_idx
  on public.billing_entitlement_usage (grant_id, entitlement_key, period_start desc)
  where grant_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'billing_entitlement_usage_grant_period_unique'
      and conrelid = 'public.billing_entitlement_usage'::regclass
  ) then
    alter table public.billing_entitlement_usage
      add constraint billing_entitlement_usage_grant_period_unique
      unique (grant_id, entitlement_key, period_start);
  end if;
end;
$$;

create or replace function public.consume_billing_grant_entitlement_usage(
  p_tenant_id uuid,
  p_grant_id uuid,
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
  v_grant public.access_grants%rowtype;
  v_limit integer;
  v_usage_id uuid;
  v_usage_count integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authenticated user required';
  end if;

  if p_tenant_id is null
    or p_grant_id is null
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

  select grant_row.*
    into v_grant
  from public.access_grants as grant_row
  where grant_row.id = p_grant_id
    and grant_row.tenant_id = p_tenant_id
    and grant_row.user_id = v_user_id
    and grant_row.mode in ('trial', 'one_time')
    and grant_row.status = 'active'
    and grant_row.starts_at <= v_now
    and (grant_row.expires_at is null or grant_row.expires_at > v_now)
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active access grant required';
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'investigations.export') then
    raise exception using
      errcode = '42501',
      message = 'investigations export capability required';
  end if;

  select entitlement.limit_value
    into v_limit
  from public.access_grant_entitlements as entitlement
  where entitlement.grant_id = p_grant_id
    and entitlement.entitlement_key = p_entitlement_key
    and entitlement.is_enabled;

  if v_limit is null or v_limit < 1 then
    return query
    select false, 0, null::integer;
    return;
  end if;

  insert into public.billing_entitlement_usage as counter_row (
    tenant_id,
    grant_id,
    entitlement_key,
    period_start,
    usage_count
  )
  values (
    p_tenant_id,
    p_grant_id,
    p_entitlement_key,
    v_period_start,
    1
  )
  on conflict (grant_id, entitlement_key, period_start)
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
    where usage.grant_id = p_grant_id
      and usage.entitlement_key = p_entitlement_key
      and usage.period_start = v_period_start;

    return query
    select false, coalesce(v_usage_count, 0), v_limit;
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
      'grant_id', p_grant_id,
      'period_start', v_period_start,
      'usage_count', v_usage_count,
      'limit_value', v_limit
    ),
    jsonb_build_object('reservation', true, 'grant_id', p_grant_id)
  );

  return query
  select true, v_usage_count, v_limit;
end;
$$;

comment on function public.consume_billing_grant_entitlement_usage(uuid, uuid, text) is
  'Atomically reserves one monthly entitlement use for an active trial or one-time access grant.';

revoke all on function public.consume_billing_grant_entitlement_usage(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.consume_billing_grant_entitlement_usage(uuid, uuid, text)
  to authenticated, service_role;

commit;
