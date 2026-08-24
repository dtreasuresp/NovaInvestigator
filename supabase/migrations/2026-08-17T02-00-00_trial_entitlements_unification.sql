-- Migration: 2026-08-17T02-00-00_trial_entitlements_unification.sql
-- Description: Unifies trial access grant entitlement copy from canonical plan_entitlements

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
  v_plan public.plans%rowtype;
  v_existing public.access_grants%rowtype;
  v_grant public.access_grants%rowtype;
  v_now timestamptz := clock_timestamp();
  v_duration_secs integer;
  v_has_pdf boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.status = 'active'
      and profile.vid_status = 'verified'
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

  -- 1. Resolve active trial policy (scope = tenant or platform fallback)
  select *
  into v_policy
  from public.trial_policies as policy
  where (policy.scope = 'tenant' and policy.tenant_id = p_tenant_id and policy.enabled)
     or (policy.scope = 'platform' and policy.enabled)
  order by case when policy.scope = 'tenant' then 1 else 2 end, policy.updated_at desc
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'trial_policy_not_configured';
  end if;

  -- 2. Resolve active trial plan
  select *
  into v_plan
  from public.plans as plan
  where (plan.code = 'trial' or plan.interval = 'free')
    and plan.is_active
  order by case when plan.code = 'trial' then 1 else 2 end, plan.display_order asc
  limit 1;

  v_duration_secs := coalesce(v_plan.duration_seconds, v_policy.duration_seconds, 86400);

  -- 3. Create access grant
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
    v_now + make_interval(secs => v_duration_secs::double precision),
    coalesce(v_policy.max_sessions, 1),
    0,
    'active'
  )
  returning * into v_grant;

  -- 4. Copy canonical plan entitlements directly from plan_entitlements
  if v_plan.id is not null then
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
      'plan'
    from public.plan_entitlements as entitlement
    where entitlement.plan_id = v_plan.id
    on conflict (grant_id, entitlement_key) do nothing;
  end if;

  -- 5. Fallback copy from trial_policy_entitlements if plan had no entitlements
  if not exists (select 1 from public.access_grant_entitlements where grant_id = v_grant.id) then
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
  end if;

  -- 6. Audit trial start
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
    to_jsonb(v_grant)
  );

  select exists (
    select 1
    from public.access_grant_entitlements
    where grant_id = v_grant.id
      and entitlement_key in ('investigations.export_pdf', 'investigations.export_pdf_monthly')
      and is_enabled
  ) into v_has_pdf;

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
    coalesce(v_has_pdf, v_policy.allow_pdf, false),
    coalesce(v_policy.allow_checkout, false);
end;
$$;
