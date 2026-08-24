begin;

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
  v_checkout_id text := trim(p_checkout_id);
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null
     or p_grant_id is null
     or p_tenant_id is null
     or p_checkout_id is null
     or length(v_checkout_id) = 0 then
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

  if exists (
    select 1
    from public.access_grants as grant_row
    where grant_row.id = p_grant_id
      and grant_row.tenant_id = p_tenant_id
      and grant_row.user_id = v_user_id
      and grant_row.mode = 'one_time'
      and grant_row.status = 'active'
      and grant_row.provider_checkout_id = v_checkout_id
  ) then
    return true;
  end if;

  update public.access_grants as grant_row
  set
    provider_checkout_id = v_checkout_id,
    updated_at = v_now
  where grant_row.id = p_grant_id
    and grant_row.tenant_id = p_tenant_id
    and grant_row.user_id = v_user_id
    and grant_row.mode = 'one_time'
    and grant_row.status = 'pending'
    and (
      grant_row.provider_checkout_id is null
      or grant_row.provider_checkout_id = v_checkout_id
    );

  return found;
end;
$$;

revoke all on function public.attach_one_time_checkout_reference(uuid, uuid, text) from public, anon;
grant execute on function public.attach_one_time_checkout_reference(uuid, uuid, text) to authenticated, service_role;

commit;
