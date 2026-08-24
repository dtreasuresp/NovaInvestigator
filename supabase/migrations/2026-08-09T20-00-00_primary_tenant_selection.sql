begin;

create or replace function public.set_primary_tenant(
  p_tenant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_tenant_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select profile.primary_tenant_id
  into v_previous_tenant_id
  from public.profiles as profile
  where profile.id = v_user_id
    and profile.status = 'active'
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'account_setup_required';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    join public.tenants as tenant
      on tenant.id = membership.tenant_id
    where membership.user_id = v_user_id
      and membership.tenant_id = p_tenant_id
      and membership.status = 'active'
      and tenant.status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'primary_tenant_membership_required';
  end if;

  update public.profiles
  set primary_tenant_id = p_tenant_id
  where id = v_user_id;

  if v_previous_tenant_id is distinct from p_tenant_id then
    insert into public.audit_logs (
      tenant_id,
      actor_user_id,
      source,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data
    )
    values (
      p_tenant_id,
      v_user_id,
      'user',
      'profile.primary_tenant.updated',
      'profile',
      v_user_id,
      jsonb_build_object('primaryTenantId', v_previous_tenant_id),
      jsonb_build_object('primaryTenantId', p_tenant_id)
    );
  end if;

  return p_tenant_id;
end;
$$;

comment on function public.set_primary_tenant(uuid) is
  'Sets the authenticated user''s default tenant only when an active tenant membership exists.';

revoke all on function public.set_primary_tenant(uuid) from public, anon;
grant execute on function public.set_primary_tenant(uuid) to authenticated;

commit;
