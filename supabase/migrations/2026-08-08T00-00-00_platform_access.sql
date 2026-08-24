begin;

create table if not exists public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  is_system boolean not null default true check (is_system),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role_id uuid not null references public.platform_roles(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_role_capabilities (
  role_id uuid not null references public.platform_roles(id) on delete cascade,
  capability_key text not null references public.capabilities(key) on delete cascade,
  primary key (role_id, capability_key)
);

create index if not exists platform_memberships_status_idx
  on public.platform_memberships (status, created_at desc);

drop trigger if exists platform_memberships_set_updated_at on public.platform_memberships;
create trigger platform_memberships_set_updated_at
before update on public.platform_memberships
for each row execute function public.set_updated_at();

insert into public.capabilities (key, description, resource, action)
values
  ('platform.tenants.read', 'Ver tenants desde el alcance de la plataforma.', 'platform.tenants', 'read'),
  ('platform.tenants.create', 'Crear tenants desde el alcance de la plataforma.', 'platform.tenants', 'create'),
  ('platform.tenants.manage', 'Suspender, archivar o actualizar tenants desde la plataforma.', 'platform.tenants', 'manage'),
  ('platform.memberships.manage', 'Asignar y administrar membresías iniciales de tenants.', 'platform.memberships', 'manage'),
  ('platform.users.read', 'Consultar perfiles necesarios para operaciones de plataforma.', 'platform.users', 'read'),
  ('platform.kyc.read', 'Consultar solicitudes KYC pendientes desde la plataforma.', 'platform.kyc', 'read'),
  ('platform.kyc.review', 'Aprobar o rechazar verificaciones KYC.', 'platform.kyc', 'review'),
  ('platform.billing.manage', 'Administrar configuración y operaciones billing de la plataforma.', 'platform.billing', 'manage'),
  ('platform.audit.read', 'Consultar auditoría de operaciones de plataforma.', 'platform.audit', 'read')
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.platform_roles (key, name, is_system)
values ('super_admin', 'Super Admin', true)
on conflict (key) do update
set
  name = excluded.name,
  is_system = true;

-- Platform capabilities must never become tenant-owner permissions.
delete from public.role_capabilities as role_capability
using public.roles as role_row
where role_capability.role_id = role_row.id
  and role_row.tenant_id is null
  and (
    role_capability.capability_key like 'platform.%'
    or role_capability.capability_key = 'billing.plans.manage'
  );

insert into public.platform_role_capabilities (role_id, capability_key)
select platform_role.id, capability.key
from public.platform_roles as platform_role
cross join public.capabilities as capability
where platform_role.key = 'super_admin'
  and (
    capability.key like 'platform.%'
    or capability.key = 'billing.plans.manage'
  )
on conflict do nothing;

create or replace function public.is_active_platform_member(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_user_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.platform_memberships as membership
      where membership.user_id = p_user_id
        and membership.status = 'active'
    );
$$;

create or replace function public.get_platform_capabilities(
  p_user_id uuid
)
returns table(capability_key text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select capability.key as capability_key
  from public.capabilities as capability
  join public.platform_role_capabilities as role_capability
    on role_capability.capability_key = capability.key
  join public.platform_memberships as membership
    on membership.role_id = role_capability.role_id
   and membership.user_id = p_user_id
   and membership.status = 'active'
  where p_user_id = auth.uid()
    and capability.is_active;
$$;

create or replace function public.has_platform_capability(
  p_user_id uuid,
  p_capability_key text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.get_platform_capabilities(p_user_id) as effective
    where effective.capability_key = p_capability_key
  );
$$;

-- This is a one-time, server-only bootstrap primitive. Runtime platform
-- mutations must go through an authenticated SA capability check.
create or replace function public.provision_initial_super_admin(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role_id uuid;
  v_membership_id uuid;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'platform_user_required';
  end if;

  if exists (select 1 from public.platform_memberships) then
    raise exception using errcode = '42501', message = 'platform_bootstrap_already_completed';
  end if;

  select id
  into v_role_id
  from public.platform_roles
  where key = 'super_admin'
    and is_system;

  if v_role_id is null then
    raise exception using errcode = 'P0001', message = 'super_admin_role_not_configured';
  end if;

  insert into public.platform_memberships (
    user_id,
    role_id,
    status,
    created_by
  )
  values (
    p_user_id,
    v_role_id,
    'active',
    p_user_id
  )
  returning id into v_membership_id;

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
    null,
    p_user_id,
    'migration',
    'platform.super_admin.provisioned',
    'platform_membership',
    v_membership_id,
    jsonb_build_object('role_key', 'super_admin', 'status', 'active'),
    jsonb_build_object('bootstrap', true)
  );

  return v_membership_id;
end;
$$;

revoke all on function public.is_active_platform_member(uuid) from public, anon;
revoke all on function public.get_platform_capabilities(uuid) from public, anon;
revoke all on function public.has_platform_capability(uuid, text) from public, anon;
revoke all on function public.provision_initial_super_admin(uuid) from public, anon, authenticated;

grant execute on function public.is_active_platform_member(uuid) to authenticated, service_role;
grant execute on function public.get_platform_capabilities(uuid) to authenticated, service_role;
grant execute on function public.has_platform_capability(uuid, text) to authenticated, service_role;
grant execute on function public.provision_initial_super_admin(uuid) to service_role;

alter table public.platform_roles enable row level security;
alter table public.platform_memberships enable row level security;
alter table public.platform_role_capabilities enable row level security;

create policy platform_roles_select_members
on public.platform_roles
for select
to authenticated
using (public.is_active_platform_member(auth.uid()));

create policy platform_memberships_select_self_or_managed
on public.platform_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_platform_capability(auth.uid(), 'platform.memberships.manage')
);

create policy platform_role_capabilities_select_members
on public.platform_role_capabilities
for select
to authenticated
using (public.is_active_platform_member(auth.uid()));

drop policy if exists audit_logs_select_platform on public.audit_logs;
create policy audit_logs_select_platform
on public.audit_logs
for select
to authenticated
using (
  tenant_id is null
  and public.has_platform_capability(auth.uid(), 'platform.audit.read')
);

grant select on
  public.platform_roles,
  public.platform_memberships,
  public.platform_role_capabilities
to authenticated;

grant all on
  public.platform_roles,
  public.platform_memberships,
  public.platform_role_capabilities
to service_role;

commit;
