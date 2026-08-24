begin;

-- Platform roles are managed from the same access center as tenant roles.
-- `is_system` continues to identify the immutable super_admin preset; it is
-- no longer used as a table-wide prohibition on custom platform roles.
alter table public.platform_roles
  drop constraint if exists platform_roles_is_system_check;

alter table public.platform_roles
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.platform_roles
set
  is_active = coalesce(is_active, true),
  updated_at = coalesce(updated_at, created_at, now())
where is_active is null
   or updated_at is null;

drop trigger if exists platform_roles_set_updated_at on public.platform_roles;
create trigger platform_roles_set_updated_at
before update on public.platform_roles
for each row execute function public.set_updated_at();

create index if not exists platform_roles_active_idx
  on public.platform_roles (is_active, name);

insert into public.capabilities (key, description, resource, action)
values
  (
    'platform.access.roles.read',
    'Consultar todos los roles de la plataforma, tenants y aplicaciones.',
    'platform.access.roles',
    'read'
  ),
  (
    'platform.access.roles.manage',
    'Crear, editar y activar roles de plataforma y roles globales.',
    'platform.access.roles',
    'manage'
  ),
  (
    'platform.access.capabilities.read',
    'Consultar el catálogo completo de capacidades funcionales.',
    'platform.access.capabilities',
    'read'
  ),
  (
    'platform.access.capabilities.manage',
    'Modificar las capacidades asignadas a cualquier rol administrable.',
    'platform.access.capabilities',
    'manage'
  ),
  (
    'platform.access.tenant_roles.manage',
    'Gestionar roles y permisos de cualquier tenant desde la plataforma.',
    'platform.access.tenant_roles',
    'manage'
  )
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.platform_role_capabilities (role_id, capability_key)
select platform_role.id, capability.key
from public.platform_roles as platform_role
cross join public.capabilities as capability
where platform_role.key = 'super_admin'
  and platform_role.is_system
  and platform_role.is_active
  and capability.is_active
  and (
    capability.key like 'platform.%'
    or capability.key = 'billing.plans.manage'
  )
on conflict do nothing;

-- Only the platform role manager can mutate platform role definitions.
drop policy if exists platform_roles_select_members on public.platform_roles;
create policy platform_roles_select_members
on public.platform_roles
for select
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.access.roles.read'));

drop policy if exists platform_roles_insert_managed on public.platform_roles;
create policy platform_roles_insert_managed
on public.platform_roles
for insert
to authenticated
with check (
  is_system = false
  and public.has_platform_capability(auth.uid(), 'platform.access.roles.manage')
);

drop policy if exists platform_roles_update_managed on public.platform_roles;
create policy platform_roles_update_managed
on public.platform_roles
for update
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.access.roles.manage'))
with check (
  is_system
  or public.has_platform_capability(auth.uid(), 'platform.access.roles.manage')
);

drop policy if exists platform_memberships_select_self_or_managed on public.platform_memberships;
create policy platform_memberships_select_self_or_managed
on public.platform_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_platform_capability(auth.uid(), 'platform.memberships.manage')
  or public.has_platform_capability(auth.uid(), 'platform.access.roles.read')
);

drop policy if exists platform_role_capabilities_select_members on public.platform_role_capabilities;
create policy platform_role_capabilities_select_members
on public.platform_role_capabilities
for select
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.access.capabilities.read'));

drop policy if exists platform_role_capabilities_insert_managed on public.platform_role_capabilities;
create policy platform_role_capabilities_insert_managed
on public.platform_role_capabilities
for insert
to authenticated
with check (
  public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage')
  and exists (
    select 1
    from public.capabilities as capability
    where capability.key = platform_role_capabilities.capability_key
      and capability.is_active
      and (
        capability.key like 'platform.%'
        or capability.key = 'billing.plans.manage'
      )
  )
);

drop policy if exists platform_role_capabilities_delete_managed on public.platform_role_capabilities;
create policy platform_role_capabilities_delete_managed
on public.platform_role_capabilities
for delete
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage'));

drop policy if exists roles_select_visible on public.roles;
create policy roles_select_visible
on public.roles
for select
to authenticated
using (
  tenant_id is null
  or public.is_active_tenant_member(auth.uid(), tenant_id)
  or public.has_platform_capability(auth.uid(), 'platform.access.roles.read')
);

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_visible
on public.tenants
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_active_tenant_member(auth.uid(), id)
  or public.has_platform_capability(auth.uid(), 'platform.access.roles.read')
);

drop policy if exists roles_insert_managed on public.roles;
create policy roles_insert_managed
on public.roles
for insert
to authenticated
with check (
  (
    tenant_id is not null
    and is_system = false
    and is_active
    and public.has_capability(auth.uid(), tenant_id, 'access.manage')
  )
  or (
    public.has_platform_capability(auth.uid(), 'platform.access.tenant_roles.manage')
    and (
      tenant_id is null
      or exists (
        select 1 from public.tenants
        where tenants.id = roles.tenant_id
          and tenants.status = 'active'
      )
    )
  )
);

drop policy if exists roles_update_managed on public.roles;
create policy roles_update_managed
on public.roles
for update
to authenticated
using (
  (
    tenant_id is not null
    and is_system = false
    and public.has_capability(auth.uid(), tenant_id, 'access.manage')
  )
  or public.has_platform_capability(auth.uid(), 'platform.access.tenant_roles.manage')
)
with check (
  (
    tenant_id is not null
    and is_system = false
    and public.has_capability(auth.uid(), tenant_id, 'access.manage')
  )
  or (
    public.has_platform_capability(auth.uid(), 'platform.access.tenant_roles.manage')
    and (
      tenant_id is null
      or exists (
        select 1 from public.tenants
        where tenants.id = roles.tenant_id
          and tenants.status = 'active'
      )
    )
  )
);

drop policy if exists role_capabilities_select_visible on public.role_capabilities;
create policy role_capabilities_select_visible
on public.role_capabilities
for select
to authenticated
using (
  exists (
    select 1
    from public.roles as role_row
    where role_row.id = role_capabilities.role_id
      and (
        role_row.tenant_id is null
        or public.is_active_tenant_member(auth.uid(), role_row.tenant_id)
        or public.has_platform_capability(auth.uid(), 'platform.access.capabilities.read')
      )
  )
);

drop policy if exists role_capabilities_insert_managed on public.role_capabilities;
create policy role_capabilities_insert_managed
on public.role_capabilities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roles as role_row
    join public.capabilities as capability
      on capability.key = role_capabilities.capability_key
     and capability.is_active
    where role_row.id = role_capabilities.role_id
      and (
        (
          role_row.tenant_id is not null
          and role_row.is_system = false
          and not role_capabilities.capability_key like 'platform.%'
          and role_capabilities.capability_key <> 'billing.plans.manage'
          and public.has_capability(auth.uid(), role_row.tenant_id, 'access.manage')
        )
        or public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage')
      )
  )
);

drop policy if exists role_capabilities_delete_managed on public.role_capabilities;
create policy role_capabilities_delete_managed
on public.role_capabilities
for delete
to authenticated
using (
  exists (
    select 1
    from public.roles as role_row
    where role_row.id = role_capabilities.role_id
      and (
        (
          role_row.tenant_id is not null
          and role_row.is_system = false
          and public.has_capability(auth.uid(), role_row.tenant_id, 'access.manage')
        )
        or public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage')
      )
  )
);

drop policy if exists memberships_select_visible on public.memberships;
create policy memberships_select_visible
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_tenant_member(auth.uid(), tenant_id)
  or public.has_platform_capability(auth.uid(), 'platform.access.roles.read')
);

drop policy if exists member_capability_overrides_select_visible on public.member_capability_overrides;
create policy member_capability_overrides_select_visible
on public.member_capability_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and (
        membership.user_id = auth.uid()
        or public.is_active_tenant_member(auth.uid(), membership.tenant_id)
        or public.has_platform_capability(auth.uid(), 'platform.access.capabilities.read')
      )
  )
);

create or replace function public.protect_last_platform_super_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role_id uuid;
  v_next_role_id uuid;
  v_next_status text;
begin
  if tg_op = 'DELETE' then
    v_role_id := old.role_id;
    v_next_role_id := null;
    v_next_status := null;
  else
    v_role_id := old.role_id;
    v_next_role_id := new.role_id;
    v_next_status := new.status;
  end if;

  if exists (
    select 1
    from public.platform_roles
    where id = v_role_id
      and key = 'super_admin'
  )
  and (
    tg_op = 'DELETE'
    or v_next_status <> 'active'
    or v_next_role_id is distinct from v_role_id
  )
  and (
    select count(*)
    from public.platform_memberships
    where role_id = v_role_id
      and status = 'active'
  ) <= 1 then
    raise exception using errcode = 'P0001', message = 'last_super_admin_protected';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_last_platform_super_admin on public.platform_memberships;
create trigger protect_last_platform_super_admin
before update or delete on public.platform_memberships
for each row execute function public.protect_last_platform_super_admin();

create or replace function public.protect_platform_role_definition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.key is distinct from old.key
     or (old.is_system and not new.is_system) then
    raise exception using errcode = 'P0001', message = 'platform_role_key_immutable';
  end if;

  if old.key = 'super_admin' and old.is_active and not new.is_active then
    raise exception using errcode = 'P0001', message = 'last_super_admin_protected';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_platform_role_definition on public.platform_roles;
create trigger protect_platform_role_definition
before update on public.platform_roles
for each row execute function public.protect_platform_role_definition();

create or replace function public.protect_super_admin_recovery_capabilities()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role_id uuid;
  v_capability_key text;
  v_capability_changed boolean := false;
begin
  v_role_id := old.role_id;
  v_capability_key := old.capability_key;

  if tg_op = 'UPDATE' then
    v_capability_changed := new.capability_key is distinct from old.capability_key;
  end if;

  if exists (
    select 1
    from public.platform_roles
    where id = v_role_id
      and key = 'super_admin'
  )
  and v_capability_key in (
    'platform.access.roles.manage',
    'platform.access.capabilities.manage',
    'platform.access.tenant_roles.manage',
    'platform.memberships.manage'
  )
  and (
    select count(*)
    from public.platform_memberships
    where role_id = v_role_id
      and status = 'active'
  ) <= 1
  and (
    tg_op = 'DELETE'
    or v_capability_changed
  ) then
    raise exception using errcode = 'P0001', message = 'last_super_admin_protected';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_super_admin_recovery_capabilities on public.platform_role_capabilities;
create trigger protect_super_admin_recovery_capabilities
before update or delete on public.platform_role_capabilities
for each row execute function public.protect_super_admin_recovery_capabilities();

create or replace function public.create_platform_role(
  p_key text,
  p_name text
)
returns setof public.platform_roles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role public.platform_roles%rowtype;
begin
  if not public.has_platform_capability(auth.uid(), 'platform.access.roles.manage') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  if p_key is null
     or p_key !~ '^[a-z0-9][a-z0-9_-]{1,63}$'
     or p_key = 'super_admin' then
    raise exception using errcode = '22023', message = 'invalid_role_key';
  end if;

  insert into public.platform_roles (key, name, is_system, is_active)
  values (p_key, p_name, false, true)
  returning * into v_role;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id, after_data
  )
  values (
    null, auth.uid(), 'admin', 'access.platform_role.created',
    'platform_role', v_role.id,
    jsonb_build_object('key', v_role.key, 'name', v_role.name)
  );

  return next v_role;
end;
$$;

create or replace function public.update_platform_role(
  p_role_id uuid,
  p_name text,
  p_is_active boolean,
  p_updated_at timestamptz
)
returns setof public.platform_roles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role public.platform_roles%rowtype;
  v_now timestamptz := clock_timestamp();
  v_before_data jsonb;
begin
  if not public.has_platform_capability(auth.uid(), 'platform.access.roles.manage') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  select *
  into v_role
  from public.platform_roles
  where id = p_role_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'role_not_found';
  end if;

  if p_updated_at is null or v_role.updated_at <> p_updated_at then
    raise exception using errcode = '40001', message = 'role_version_conflict';
  end if;

  v_before_data := jsonb_build_object('name', v_role.name, 'is_active', v_role.is_active);

  if exists (
    select 1
    from public.platform_memberships
    where user_id = auth.uid()
      and role_id = p_role_id
      and status = 'active'
  )
  and p_is_active = false then
    raise exception using errcode = 'P0001', message = 'self_role_mutation';
  end if;

  if p_is_active = false
     and exists (
       select 1
       from public.platform_memberships
       where role_id = p_role_id
         and status = 'active'
     ) then
    raise exception using errcode = 'P0001', message = 'role_has_active_members';
  end if;

  update public.platform_roles
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    is_active = coalesce(p_is_active, is_active),
    updated_at = v_now
  where id = p_role_id
  returning * into v_role;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id,
    before_data, after_data
  )
  values (
    null, auth.uid(), 'admin', 'access.platform_role.updated',
    'platform_role', v_role.id,
    v_before_data,
    jsonb_build_object('name', v_role.name, 'is_active', v_role.is_active)
  );

  return next v_role;
end;
$$;

create or replace function public.replace_platform_role_capabilities(
  p_role_id uuid,
  p_capability_keys text[],
  p_updated_at timestamptz
)
returns setof public.platform_roles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role public.platform_roles%rowtype;
  v_now timestamptz := clock_timestamp();
  v_requested text;
  v_before_capabilities text[];
begin
  if not public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  select *
  into v_role
  from public.platform_roles
  where id = p_role_id
    and is_active
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'role_not_manageable';
  end if;

  if exists (
    select 1
    from public.platform_memberships
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
  from public.platform_role_capabilities
  where role_id = p_role_id;

  foreach v_requested in array coalesce(p_capability_keys, array[]::text[]) loop
    if not exists (
      select 1
      from public.capabilities
      where key = v_requested
        and is_active
        and (
          key like 'platform.%'
          or key = 'billing.plans.manage'
        )
    )
    or not public.has_platform_capability(auth.uid(), v_requested) then
      raise exception using errcode = '22023', message = 'invalid_role_capability';
    end if;
  end loop;

  delete from public.platform_role_capabilities
  where role_id = p_role_id;

  insert into public.platform_role_capabilities (role_id, capability_key)
  select p_role_id, requested.capability_key
  from unnest(coalesce(p_capability_keys, array[]::text[])) as requested(capability_key);

  update public.platform_roles
  set updated_at = v_now
  where id = p_role_id
  returning * into v_role;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id, before_data, after_data
  )
  values (
    null, auth.uid(), 'admin', 'access.platform_role.permissions.updated',
    'platform_role', p_role_id,
    jsonb_build_object('capability_keys', coalesce(v_before_capabilities, array[]::text[])),
    jsonb_build_object('capability_keys', coalesce(p_capability_keys, array[]::text[]))
  );

  return next v_role;
end;
$$;

create or replace function public.create_unified_tenant_role(
  p_tenant_id uuid,
  p_key text,
  p_name text,
  p_global boolean default false
)
returns setof public.roles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role public.roles%rowtype;
  v_platform_manager boolean := public.has_platform_capability(auth.uid(), 'platform.access.tenant_roles.manage');
begin
  if p_key is null
     or p_key !~ '^[a-z0-9][a-z0-9_-]{1,63}$'
     or p_name is null
     or trim(p_name) = '' then
    raise exception using errcode = '22023', message = 'invalid_role_input';
  end if;

  if p_global then
    if not v_platform_manager then
      raise exception using errcode = '42501', message = 'capability_denied';
    end if;

    if exists (
      select 1 from public.roles
      where tenant_id is null and key = p_key
    ) then
      raise exception using errcode = '23505', message = 'role_key_conflict';
    end if;

    insert into public.roles (tenant_id, key, name, is_system, is_active)
    values (null, p_key, trim(p_name), true, true)
    returning * into v_role;
  else
    if p_tenant_id is null then
      raise exception using errcode = '22023', message = 'tenant_required';
    end if;

    if not v_platform_manager
       and not public.has_capability(auth.uid(), p_tenant_id, 'access.manage') then
      raise exception using errcode = '42501', message = 'capability_denied';
    end if;

    if not exists (
      select 1 from public.tenants
      where id = p_tenant_id
        and status = 'active'
    ) then
      raise exception using errcode = 'P0002', message = 'tenant_not_found';
    end if;

    if exists (
      select 1 from public.roles
      where tenant_id = p_tenant_id and key = p_key
    ) then
      raise exception using errcode = '23505', message = 'role_key_conflict';
    end if;

    insert into public.roles (tenant_id, key, name, is_system, is_active)
    values (p_tenant_id, p_key, trim(p_name), false, true)
    returning * into v_role;
  end if;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id, after_data, metadata
  )
  values (
    null, auth.uid(), 'admin', 'access.role.created', 'role', v_role.id,
    jsonb_build_object('key', v_role.key, 'name', v_role.name, 'is_system', v_role.is_system),
    jsonb_build_object('target_tenant_id', v_role.tenant_id)
  );

  return next v_role;
end;
$$;

create or replace function public.update_unified_tenant_role(
  p_role_id uuid,
  p_name text,
  p_is_active boolean,
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
  v_before_data jsonb;
begin
  select *
  into v_role
  from public.roles
  where id = p_role_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'role_not_found';
  end if;

  if v_role.tenant_id is null then
    if not v_platform_manager then
      raise exception using errcode = '42501', message = 'capability_denied';
    end if;
  elsif not v_platform_manager
     and not public.has_capability(auth.uid(), v_role.tenant_id, 'access.manage') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  if v_role.is_system
     and v_role.tenant_id is null
     and not v_platform_manager then
    raise exception using errcode = '42501', message = 'role_not_manageable';
  end if;

  if p_updated_at is null or v_role.updated_at <> p_updated_at then
    raise exception using errcode = '40001', message = 'role_version_conflict';
  end if;

  v_before_data := jsonb_build_object('name', v_role.name, 'is_active', v_role.is_active);

  if exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and role_id = p_role_id
      and status = 'active'
  )
  and p_is_active = false then
    raise exception using errcode = 'P0001', message = 'self_role_mutation';
  end if;

  if p_is_active = false
     and exists (
       select 1
       from public.memberships
       where role_id = p_role_id
         and status = 'active'
     ) then
    raise exception using errcode = 'P0001', message = 'role_has_active_members';
  end if;

  update public.roles
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    is_active = coalesce(p_is_active, is_active),
    updated_at = v_now
  where id = p_role_id
  returning * into v_role;

  insert into public.audit_logs (
    tenant_id, actor_user_id, source, action, entity_type, entity_id,
    before_data, after_data, metadata
  )
  values (
    null, auth.uid(), 'admin', 'access.role.updated', 'role', v_role.id,
    v_before_data,
    jsonb_build_object('name', v_role.name, 'is_active', v_role.is_active),
    jsonb_build_object('target_tenant_id', v_role.tenant_id)
  );

  return next v_role;
end;
$$;

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
    when v_platform_manager then true
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

revoke all on function public.create_platform_role(text, text) from public, anon;
revoke all on function public.update_platform_role(uuid, text, boolean, timestamptz) from public, anon;
revoke all on function public.replace_platform_role_capabilities(uuid, text[], timestamptz) from public, anon;
revoke all on function public.create_unified_tenant_role(uuid, text, text, boolean) from public, anon;
revoke all on function public.update_unified_tenant_role(uuid, text, boolean, timestamptz) from public, anon;
revoke all on function public.replace_role_capabilities(uuid, text[], timestamptz) from public, anon;

grant execute on function public.create_platform_role(text, text) to authenticated, service_role;
grant execute on function public.update_platform_role(uuid, text, boolean, timestamptz) to authenticated, service_role;
grant execute on function public.replace_platform_role_capabilities(uuid, text[], timestamptz)
to authenticated, service_role;
grant execute on function public.create_unified_tenant_role(uuid, text, text, boolean)
to authenticated, service_role;
grant execute on function public.update_unified_tenant_role(uuid, text, boolean, timestamptz)
to authenticated, service_role;
grant execute on function public.replace_role_capabilities(uuid, text[], timestamptz)
to authenticated, service_role;

grant select, insert, update on public.platform_roles to authenticated;
grant select on public.platform_memberships, public.platform_role_capabilities to authenticated;
grant select, insert, update on public.roles to authenticated;
grant select, insert, delete on public.role_capabilities to authenticated;
grant select on public.memberships, public.member_capability_overrides to authenticated;

commit;
