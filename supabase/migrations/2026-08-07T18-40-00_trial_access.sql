begin;

create unique index if not exists access_grants_trial_tenant_user_unique
  on public.access_grants (tenant_id, user_id)
  where mode = 'trial';

create index if not exists access_grants_policy_id_idx
  on public.access_grants (policy_id);

insert into public.capabilities (key, description, resource, action)
values (
  'billing.trial.start',
  'Iniciar el acceso de prueba autenticado del tenant.',
  'billing',
  'trial.start'
)
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, 'billing.trial.start'
from public.roles as role_row
where role_row.tenant_id is null
  and role_row.key in ('owner', 'admin')
on conflict do nothing;

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
      'max_uses', v_grant.max_uses
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

revoke all on function public.start_trial(uuid) from public, anon;
grant execute on function public.start_trial(uuid) to authenticated, service_role;

commit;
