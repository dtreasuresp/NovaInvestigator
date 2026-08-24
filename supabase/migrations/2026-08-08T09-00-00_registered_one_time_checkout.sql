begin;

create or replace function public.create_pending_one_time_grant(
  p_grant_id uuid,
  p_tenant_id uuid
)
returns table (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  mode text,
  policy_id uuid,
  provider_checkout_id text,
  provider_payment_id text,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  used_uses integer,
  status text,
  consumed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_existing public.access_grants%rowtype;
  v_grant public.access_grants%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_grant_id is null or p_tenant_id is null then
    raise exception using errcode = '22023', message = 'invalid_grant_reference';
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
       or v_existing.mode <> 'one_time' then
      raise exception using errcode = '23505', message = 'one_time_grant_conflict';
    end if;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.provider_checkout_id,
      v_existing.provider_payment_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      v_existing.created_at,
      v_existing.updated_at;
    return;
  end if;

  insert into public.access_grants (
    id,
    tenant_id,
    user_id,
    mode,
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
    v_now,
    null,
    1,
    0,
    'pending'
  )
  returning * into v_grant;

  return query
  select
    v_grant.id,
    v_grant.tenant_id,
    v_grant.user_id,
    v_grant.mode,
    v_grant.policy_id,
    v_grant.provider_checkout_id,
    v_grant.provider_payment_id,
    v_grant.starts_at,
    v_grant.expires_at,
    v_grant.max_uses,
    v_grant.used_uses,
    v_grant.status,
    v_grant.consumed_at,
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
       or v_existing.mode <> 'one_time' then
      raise;
    end if;

    return query
    select
      v_existing.id,
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.mode,
      v_existing.policy_id,
      v_existing.provider_checkout_id,
      v_existing.provider_payment_id,
      v_existing.starts_at,
      v_existing.expires_at,
      v_existing.max_uses,
      v_existing.used_uses,
      v_existing.status,
      v_existing.consumed_at,
      v_existing.created_at,
      v_existing.updated_at;
end;
$$;

create or replace function public.attach_one_time_checkout_reference(
  p_grant_id uuid,
  p_tenant_id uuid,
  p_checkout_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null
     or p_grant_id is null
     or p_tenant_id is null
     or p_checkout_id is null
     or length(trim(p_checkout_id)) = 0 then
    return false;
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.status = 'active'
      and profile.kyc_status = 'verified'
  ) then
    return false;
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
    return false;
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'billing.checkout.create') then
    return false;
  end if;

  update public.access_grants as grant_row
  set
    provider_checkout_id = trim(p_checkout_id),
    updated_at = v_now
  where grant_row.id = p_grant_id
    and grant_row.tenant_id = p_tenant_id
    and grant_row.user_id = v_user_id
    and grant_row.mode = 'one_time'
    and grant_row.status = 'pending'
    and (
      grant_row.provider_checkout_id is null
      or grant_row.provider_checkout_id = trim(p_checkout_id)
    );

  return found;
end;
$$;

revoke all on function public.create_pending_one_time_grant(uuid, uuid) from public, anon;
revoke all on function public.attach_one_time_checkout_reference(uuid, uuid, text) from public, anon;

grant execute on function public.create_pending_one_time_grant(uuid, uuid) to authenticated, service_role;
grant execute on function public.attach_one_time_checkout_reference(uuid, uuid, text) to authenticated, service_role;

commit;
