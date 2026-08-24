begin;

alter table public.access_grants
  add column if not exists source_plan_id uuid references public.plans(id) on delete restrict,
  add column if not exists revoked_at timestamptz;

create index if not exists access_grants_source_plan_status_idx
  on public.access_grants (source_plan_id, tenant_id, status, created_at desc);

create or replace function public.canonicalize_billing_entitlement_key(p_key text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when length(btrim(p_key)) = 0 then ''
    when lower(btrim(p_key)) ~ '^(modules|actions|limits)\.' then lower(btrim(p_key))
    when lower(btrim(p_key)) like '%.max_%'
      or lower(btrim(p_key)) like '%_monthly'
      or lower(btrim(p_key)) like '%_bytes'
      then 'limits.' || lower(btrim(p_key))
    else 'actions.' || lower(btrim(p_key))
  end;
$$;

comment on function public.canonicalize_billing_entitlement_key(text) is
  'Canonicalizes legacy billing entitlement keys without changing the source plan rows.';

with candidates as (
  select
    grant_row.id as grant_id,
    public.canonicalize_billing_entitlement_key(entitlement.entitlement_key) as entitlement_key,
    entitlement.limit_value,
    entitlement.is_enabled,
    'trial_policy'::text as source
  from public.access_grants as grant_row
  join public.trial_policy_entitlements as entitlement
    on entitlement.policy_id = grant_row.policy_id
  where grant_row.mode = 'trial'
    and grant_row.policy_id is not null
),
deduplicated as (
  select distinct on (grant_id, entitlement_key)
    grant_id,
    entitlement_key,
    limit_value,
    is_enabled,
    source
  from candidates
  where entitlement_key ~ '^(modules|actions|limits)\.[a-z0-9._-]+$'
    and (
      entitlement_key not like 'limits.%'
      or limit_value is not null
    )
  order by grant_id, entitlement_key
)
insert into public.access_grant_entitlements (
  grant_id,
  entitlement_key,
  limit_value,
  is_enabled,
  source
)
select
  grant_id,
  entitlement_key,
  limit_value,
  is_enabled,
  source
from deduplicated
on conflict (grant_id, entitlement_key) do nothing;

with candidates as (
  select
    grant_row.id as grant_id,
    public.canonicalize_billing_entitlement_key(entitlement.entitlement_key) as entitlement_key,
    case
      when entitlement.limit_value is null then null
      when entitlement.limit_value = trunc(entitlement.limit_value)
        and entitlement.limit_value between 0 and 2147483647
        then entitlement.limit_value::integer
      else null
    end as limit_value,
    entitlement.is_enabled,
    'plan'::text as source
  from public.access_grants as grant_row
  join public.plan_entitlements as entitlement
    on entitlement.plan_id = grant_row.source_plan_id
  where grant_row.mode = 'one_time'
    and grant_row.source_plan_id is not null
),
deduplicated as (
  select distinct on (grant_id, entitlement_key)
    grant_id,
    entitlement_key,
    limit_value,
    is_enabled,
    source
  from candidates
  where entitlement_key ~ '^(modules|actions|limits)\.[a-z0-9._-]+$'
    and (
      entitlement_key not like 'limits.%'
      or limit_value is not null
    )
  order by grant_id, entitlement_key
)
insert into public.access_grant_entitlements (
  grant_id,
  entitlement_key,
  limit_value,
  is_enabled,
  source
)
select
  grant_id,
  entitlement_key,
  limit_value,
  is_enabled,
  source
from deduplicated
on conflict (grant_id, entitlement_key) do nothing;

with revoked as (
  update public.access_grants
  set
    status = 'revoked',
    revoked_at = coalesce(revoked_at, clock_timestamp()),
    updated_at = clock_timestamp()
  where mode = 'one_time'
    and source_plan_id is null
    and status in ('pending', 'active')
  returning id, tenant_id, user_id, provider_checkout_id, provider_payment_id
)
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
select
  tenant_id,
  null,
  'migration',
  'billing.one_time.unlinked_revoked',
  'access_grant',
  id,
  jsonb_build_object(
    'status', 'revoked',
    'reason', 'source_plan_missing',
    'provider_checkout_id', provider_checkout_id,
    'provider_payment_id', provider_payment_id
  ),
  jsonb_build_object('migration', '2026-08-13T00-00-00_effective_access_snapshots')
from revoked;

create or replace function public.start_trial(p_tenant_id uuid)
returns table (
  grant_id uuid,
  tenant_id uuid,
  user_id uuid,
  mode text,
  policy_id uuid,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  used_uses integer,
  status text,
  consumed_at timestamptz,
  allow_pdf boolean,
  allow_checkout boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_policy public.trial_policies%rowtype;
  v_existing public.access_grants%rowtype;
  v_grant public.access_grants%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.status = 'active'
      and profile.kyc_status = 'verified'
  ) then
    raise exception using errcode = '42501', message = 'kyc_required';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    join public.tenants as tenant on tenant.id = membership.tenant_id
    where membership.tenant_id = p_tenant_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
      and tenant.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'tenant_required';
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'billing.trial.start') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  select *
  into v_existing
  from public.access_grants as grant_row
  where grant_row.tenant_id = p_tenant_id
    and grant_row.user_id = v_user_id
    and grant_row.mode = 'trial'
  order by grant_row.created_at desc
  limit 1;

  if found then
    select *
    into v_policy
    from public.trial_policies as policy
    where policy.id = v_existing.policy_id
      and policy.enabled;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      coalesce(v_policy.allow_pdf, false),
      coalesce(v_policy.allow_checkout, false);
    return;
  end if;

  select *
  into v_policy
  from public.trial_policies as policy
  where policy.scope = 'tenant'
    and policy.tenant_id = p_tenant_id
    and policy.enabled
  order by policy.updated_at desc
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'trial_policy_not_configured';
  end if;

  insert into public.access_grants (
    tenant_id,
    user_id,
    mode,
    policy_id,
    starts_at,
    expires_at,
    max_uses,
    used_uses,
    status
  )
  values (
    p_tenant_id,
    v_user_id,
    'trial',
    v_policy.id,
    v_now,
    v_now + make_interval(secs => v_policy.duration_seconds::double precision),
    v_policy.max_sessions,
    0,
    'active'
  )
  returning * into v_grant;

  insert into public.access_grant_entitlements (
    grant_id,
    entitlement_key,
    limit_value,
    is_enabled,
    source
  )
  select
    v_grant.id,
    entitlement.entitlement_key,
    entitlement.limit_value,
    entitlement.is_enabled,
    'trial_policy'
  from public.trial_policy_entitlements as entitlement
  where entitlement.policy_id = v_policy.id
  on conflict (grant_id, entitlement_key) do nothing;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_tenant_id,
    v_user_id,
    'user',
    'billing.trial.start',
    'access_grant',
    v_grant.id,
    jsonb_build_object(
      'mode', v_grant.mode,
      'policy_id', v_grant.policy_id,
      'starts_at', v_grant.starts_at,
      'expires_at', v_grant.expires_at,
      'max_uses', v_grant.max_uses,
      'entitlements_snapshot', true
    )
  );

  return query
  select
    v_grant.id,
    v_grant.tenant_id,
    v_grant.user_id,
    v_grant.mode,
    v_grant.policy_id,
    v_grant.starts_at,
    v_grant.expires_at,
    v_grant.max_uses,
    v_grant.used_uses,
    v_grant.status,
    v_grant.consumed_at,
    v_policy.allow_pdf,
    v_policy.allow_checkout;
exception
  when unique_violation then
    select *
    into v_existing
    from public.access_grants as grant_row
    where grant_row.tenant_id = p_tenant_id
      and grant_row.user_id = v_user_id
      and grant_row.mode = 'trial'
    order by grant_row.created_at desc
    limit 1;

    if not found then
      raise;
    end if;

    select *
    into v_policy
    from public.trial_policies as policy
    where policy.id = v_existing.policy_id
      and policy.enabled;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      coalesce(v_policy.allow_pdf, false),
      coalesce(v_policy.allow_checkout, false);
end;
$$;

drop function if exists public.create_pending_one_time_grant(uuid, uuid);

create or replace function public.create_pending_one_time_grant(
  p_grant_id uuid,
  p_tenant_id uuid,
  p_plan_id uuid
)
returns table (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  mode text,
  policy_id uuid,
  source_plan_id uuid,
  provider_checkout_id text,
  provider_payment_id text,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  used_uses integer,
  status text,
  consumed_at timestamptz,
  revoked_at timestamptz,
  retention_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_plan public.plans%rowtype;
  v_existing public.access_grants%rowtype;
  v_grant public.access_grants%rowtype;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_grant_id is null or p_tenant_id is null or p_plan_id is null then
    raise exception using errcode = '22023', message = 'invalid_grant_reference';
  end if;

  select plan.*
  into v_plan
  from public.plans as plan
  where plan.id = p_plan_id
    and plan.is_active
    and plan.interval = 'one_time';

  if not found then
    raise exception using errcode = 'P0001', message = 'plan_not_found';
  end if;

  select auth_user.email_confirmed_at
  into v_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'email_confirmation_required';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.status = 'active'
      and profile.kyc_status = 'verified'
  ) then
    raise exception using errcode = '42501', message = 'kyc_required';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    join public.tenants as tenant on tenant.id = membership.tenant_id
    where membership.user_id = v_user_id
      and membership.tenant_id = p_tenant_id
      and membership.status = 'active'
      and tenant.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'tenant_required';
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'billing.checkout.create') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  select grant_row.*
  into v_existing
  from public.access_grants as grant_row
  where grant_row.id = p_grant_id;

  if found then
    if v_existing.user_id <> v_user_id
       or v_existing.tenant_id <> p_tenant_id
       or v_existing.mode <> 'one_time'
       or v_existing.source_plan_id is distinct from p_plan_id then
      raise exception using errcode = '23505', message = 'one_time_grant_conflict';
    end if;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.source_plan_id,
      v_existing.provider_checkout_id,
      v_existing.provider_payment_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      v_existing.revoked_at,
      v_existing.retention_until,
      v_existing.created_at,
      v_existing.updated_at;
    return;
  end if;

  insert into public.access_grants (
    id,
    tenant_id,
    user_id,
    mode,
    source_plan_id,
    starts_at,
    expires_at,
    max_uses,
    used_uses,
    status
  )
  values (
    p_grant_id,
    p_tenant_id,
    v_user_id,
    'one_time',
    p_plan_id,
    v_now,
    null,
    1,
    0,
    'pending'
  )
  returning * into v_grant;

  insert into public.access_grant_entitlements (
    grant_id,
    entitlement_key,
    limit_value,
    is_enabled,
    source
  )
  select distinct on (canonical.entitlement_key)
    v_grant.id,
    canonical.entitlement_key,
    canonical.limit_value,
    canonical.is_enabled,
    'plan'
  from (
    select
      public.canonicalize_billing_entitlement_key(entitlement.entitlement_key) as entitlement_key,
      case
        when entitlement.limit_value is null then null
        when entitlement.limit_value = trunc(entitlement.limit_value)
          and entitlement.limit_value between 0 and 2147483647
          then entitlement.limit_value::integer
        else null
      end as limit_value,
      entitlement.is_enabled
    from public.plan_entitlements as entitlement
    where entitlement.plan_id = p_plan_id
  ) as canonical
  where canonical.entitlement_key ~ '^(modules|actions|limits)\.[a-z0-9._-]+$'
    and (
      canonical.entitlement_key not like 'limits.%'
      or canonical.limit_value is not null
    )
  order by canonical.entitlement_key;

  return query
  select
    v_grant.id,
    v_grant.tenant_id,
    v_grant.user_id,
    v_grant.mode,
    v_grant.policy_id,
    v_grant.source_plan_id,
    v_grant.provider_checkout_id,
    v_grant.provider_payment_id,
    v_grant.starts_at,
    v_grant.expires_at,
    v_grant.max_uses,
    v_grant.used_uses,
    v_grant.status,
    v_grant.consumed_at,
    v_grant.revoked_at,
    v_grant.retention_until,
    v_grant.created_at,
    v_grant.updated_at;
exception
  when unique_violation then
    select grant_row.*
    into v_existing
    from public.access_grants as grant_row
    where grant_row.id = p_grant_id;

    if not found
       or v_existing.user_id <> v_user_id
       or v_existing.tenant_id <> p_tenant_id
       or v_existing.mode <> 'one_time'
       or v_existing.source_plan_id is distinct from p_plan_id then
      raise;
    end if;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.source_plan_id,
      v_existing.provider_checkout_id,
      v_existing.provider_payment_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      v_existing.revoked_at,
      v_existing.retention_until,
      v_existing.created_at,
      v_existing.updated_at;
end;
$$;

revoke all on function public.canonicalize_billing_entitlement_key(text) from public, anon, authenticated;
revoke all on function public.start_trial(uuid) from public, anon;
revoke all on function public.create_pending_one_time_grant(uuid, uuid, uuid) from public, anon;

grant execute on function public.start_trial(uuid) to authenticated, service_role;
grant execute on function public.create_pending_one_time_grant(uuid, uuid, uuid) to authenticated, service_role;

commit;
