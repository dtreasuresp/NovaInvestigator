begin;

create or replace function public.replace_role_capabilities(
  p_role_id uuid,
  p_capability_keys text[],
  p_updated_at timestamptz
)
returns setof public.roles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role public.roles%rowtype;
  v_now timestamptz := clock_timestamp();
  v_platform_manager boolean := public.has_platform_capability(auth.uid(), 'platform.access.tenant_roles.manage');
  v_capability_manager boolean := public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage');
  v_can_manage boolean;
  v_requested text;
  v_before_capabilities text[];
begin
  select *
  into v_role
  from public.roles
  where id = p_role_id
  for update;

  if not found or not v_role.is_active then
    raise exception using errcode = '42501', message = 'role_not_manageable';
  end if;

  v_can_manage := case
    when v_platform_manager or v_capability_manager then true
    when v_role.tenant_id is null then false
    else public.has_capability(auth.uid(), v_role.tenant_id, 'access.manage')
  end;

  if not v_can_manage then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  if exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and role_id = p_role_id
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'self_role_mutation';
  end if;

  if p_updated_at is null or v_role.updated_at <> p_updated_at then
    raise exception using errcode = '40001', message = 'role_version_conflict';
  end if;

  select coalesce(array_agg(capability_key order by capability_key), array[]::text[])
  into v_before_capabilities
  from public.role_capabilities
  where role_id = p_role_id;

  foreach v_requested in array coalesce(p_capability_keys, array[]::text[]) loop
    if not exists (
      select 1
      from public.capabilities
      where key = v_requested
        and is_active
        and not key like 'platform.%'
        and key <> 'billing.plans.manage'
    ) then
      raise exception using errcode = '22023', message = 'invalid_role_capability';
    end if;

    if not v_platform_manager
       and not v_capability_manager
       and v_role.tenant_id is not null
       and not public.has_capability(auth.uid(), v_role.tenant_id, v_requested) then
      raise exception using errcode = '42501', message = 'capability_not_assignable';
    end if;
  end loop;

  delete from public.role_capabilities
  where role_id = p_role_id;

  insert into public.role_capabilities (role_id, capability_key)
  select p_role_id, requested.capability_key
  from unnest(coalesce(p_capability_keys, array[]::text[])) as requested(capability_key);

  update public.roles
  set updated_at = v_now
  where id = p_role_id
  returning * into v_role;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id, before_data, after_data, metadata
  )
  values (
    null, auth.uid(), 'admin', 'access.role.permissions.updated', 'role', p_role_id,
    jsonb_build_object('capability_keys', coalesce(v_before_capabilities, array[]::text[])),
    jsonb_build_object('capability_keys', coalesce(p_capability_keys, array[]::text[])),
    jsonb_build_object('target_tenant_id', v_role.tenant_id)
  );

  return next v_role;
end;
$$;

revoke all on function public.replace_role_capabilities(uuid, text[], timestamptz) from public, anon;
grant execute on function public.replace_role_capabilities(uuid, text[], timestamptz)
to authenticated, service_role;

commit;
