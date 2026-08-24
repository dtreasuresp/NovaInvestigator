begin;

alter table public.roles
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.roles
set
  is_active = coalesce(is_active, true),
  updated_at = coalesce(updated_at, created_at, now())
where is_active is null
   or updated_at is null;

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create index if not exists roles_tenant_active_idx
  on public.roles (tenant_id, is_active, name);

drop policy if exists roles_insert_managed on public.roles;
create policy roles_insert_managed
on public.roles
for insert
to authenticated
with check (
  tenant_id is not null
  and is_system = false
  and is_active
  and public.has_capability(auth.uid(), tenant_id, 'access.manage')
);

drop policy if exists roles_update_managed on public.roles;
create policy roles_update_managed
on public.roles
for update
to authenticated
using (
  tenant_id is not null
  and is_system = false
  and public.has_capability(auth.uid(), tenant_id, 'access.manage')
)
with check (
  tenant_id is not null
  and is_system = false
  and public.has_capability(auth.uid(), tenant_id, 'access.manage')
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
      and role_row.tenant_id is not null
      and role_row.is_system = false
      and role_row.is_active
      and not role_capabilities.capability_key like 'platform.%'
      and role_capabilities.capability_key <> 'billing.plans.manage'
      and public.has_capability(auth.uid(), role_row.tenant_id, 'access.manage')
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
      and role_row.tenant_id is not null
      and role_row.is_system = false
      and role_row.is_active
      and public.has_capability(auth.uid(), role_row.tenant_id, 'access.manage')
  )
);

grant select, insert, update on public.roles to authenticated;
grant select, insert, delete on public.role_capabilities to authenticated;

create or replace function public.replace_role_capabilities(
  p_role_id uuid,
  p_capability_keys text[],
  p_updated_at timestamptz
)
returns setof public.roles
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_role public.roles%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select *
  into v_role
  from public.roles
  where id = p_role_id
  for update;

  if not found
     or v_role.tenant_id is null
     or v_role.is_system
     or not v_role.is_active then
    raise exception using errcode = '42501', message = 'role_not_manageable';
  end if;

  if not public.has_capability(auth.uid(), v_role.tenant_id, 'access.manage') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  if p_updated_at is null or v_role.updated_at <> p_updated_at then
    raise exception using errcode = '40001', message = 'role_version_conflict';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_capability_keys, array[]::text[])) as requested(capability_key)
    left join public.capabilities as capability
      on capability.key = requested.capability_key
     and capability.is_active
    where capability.key is null
       or requested.capability_key like 'platform.%'
       or requested.capability_key = 'billing.plans.manage'
  ) then
    raise exception using errcode = '22023', message = 'invalid_role_capability';
  end if;

  delete from public.role_capabilities
  where role_id = p_role_id;

  insert into public.role_capabilities (role_id, capability_key)
  select p_role_id, requested.capability_key
  from unnest(coalesce(p_capability_keys, array[]::text[])) as requested(capability_key);

  update public.roles
  set updated_at = v_now
  where id = p_role_id;

  return query
  select *
  from public.roles
  where id = p_role_id;
end;
$$;

revoke all on function public.replace_role_capabilities(uuid, text[], timestamptz)
from public, anon;
grant execute on function public.replace_role_capabilities(uuid, text[], timestamptz)
to authenticated, service_role;

commit;
