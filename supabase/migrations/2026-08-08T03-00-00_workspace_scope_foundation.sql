begin;

-- A tenant is the customer/organization boundary. Workspaces are the
-- operational boundaries inside that organization.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_tenant_slug_unique
  on public.workspaces (tenant_id, slug);

create index if not exists workspaces_tenant_status_idx
  on public.workspaces (tenant_id, status, created_at desc);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_status_idx
  on public.workspace_memberships (user_id, status);

create index if not exists workspace_memberships_workspace_status_idx
  on public.workspace_memberships (workspace_id, status);

drop trigger if exists workspace_memberships_set_updated_at on public.workspace_memberships;
create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function public.set_updated_at();

-- Existing tenants receive one default workspace. Existing tenant
-- memberships remain the organization-level membership and are mirrored into
-- the default workspace so this migration does not remove access.
insert into public.workspaces (tenant_id, name, slug, created_by)
select tenant.id, 'General', 'general', tenant.created_by
from public.tenants as tenant
where not exists (
  select 1
  from public.workspaces as workspace
  where workspace.tenant_id = tenant.id
    and workspace.slug = 'general'
);

insert into public.workspace_memberships (
  workspace_id,
  user_id,
  role_id,
  status,
  invited_at,
  accepted_at,
  created_at,
  updated_at
)
select
  workspace.id,
  membership.user_id,
  membership.role_id,
  membership.status,
  membership.invited_at,
  membership.accepted_at,
  membership.created_at,
  membership.updated_at
from public.memberships as membership
join public.workspaces as workspace
  on workspace.tenant_id = membership.tenant_id
 and workspace.slug = 'general'
on conflict (workspace_id, user_id) do nothing;

create or replace function public.is_active_workspace_member(
  p_user_id uuid,
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_user_id is not null
    and p_workspace_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships as membership
      join public.workspaces as workspace
        on workspace.id = membership.workspace_id
      where membership.user_id = p_user_id
        and membership.workspace_id = p_workspace_id
        and membership.status = 'active'
        and workspace.status = 'active'
    );
$$;

create or replace function public.get_effective_workspace_capabilities(
  p_user_id uuid,
  p_workspace_id uuid
)
returns table(capability_key text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select capability.key as capability_key
  from public.capabilities as capability
  join public.workspace_memberships as workspace_membership
    on workspace_membership.workspace_id = p_workspace_id
   and workspace_membership.user_id = p_user_id
   and workspace_membership.status = 'active'
  join public.workspaces as workspace
    on workspace.id = workspace_membership.workspace_id
   and workspace.status = 'active'
  join public.memberships as tenant_membership
    on tenant_membership.user_id = p_user_id
   and tenant_membership.tenant_id = workspace.tenant_id
   and tenant_membership.status = 'active'
  left join public.role_capabilities as role_capability
    on role_capability.role_id = workspace_membership.role_id
   and role_capability.capability_key = capability.key
  left join public.member_capability_overrides as deny_override
    on deny_override.membership_id = tenant_membership.id
   and deny_override.capability_key = capability.key
   and deny_override.effect = 'deny'
  left join public.member_capability_overrides as allow_override
    on allow_override.membership_id = tenant_membership.id
   and allow_override.capability_key = capability.key
   and allow_override.effect = 'allow'
  where p_user_id = auth.uid()
    and capability.is_active
    and deny_override.membership_id is null
    and (allow_override.membership_id is not null or role_capability.capability_key is not null);
$$;

create or replace function public.has_workspace_capability(
  p_user_id uuid,
  p_workspace_id uuid,
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
    from public.get_effective_workspace_capabilities(p_user_id, p_workspace_id) as effective
    where effective.capability_key = p_capability_key
  );
$$;

revoke all on function public.is_active_workspace_member(uuid, uuid) from public, anon;
revoke all on function public.get_effective_workspace_capabilities(uuid, uuid) from public, anon;
revoke all on function public.has_workspace_capability(uuid, uuid, text) from public, anon;

grant execute on function public.is_active_workspace_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_effective_workspace_capabilities(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_workspace_capability(uuid, uuid, text) to authenticated, service_role;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

create policy workspaces_select_visible
on public.workspaces
for select
to authenticated
using (
  public.is_active_workspace_member(auth.uid(), id)
  or exists (
    select 1
    from public.memberships as membership
    where membership.user_id = auth.uid()
      and membership.tenant_id = workspaces.tenant_id
      and membership.status = 'active'
      and public.has_capability(auth.uid(), workspaces.tenant_id, 'access.manage')
  )
);

create policy workspaces_insert_managed
on public.workspaces
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'access.manage')
);

create policy workspaces_update_managed
on public.workspaces
for update
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'access.manage')
)
with check (
  public.has_capability(auth.uid(), tenant_id, 'access.manage')
);

create policy workspace_memberships_select_visible
on public.workspace_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_workspace_member(auth.uid(), workspace_id)
  or exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = workspace_memberships.workspace_id
      and public.has_capability(auth.uid(), workspace.tenant_id, 'users.read')
  )
);

create policy workspace_memberships_insert_managed
on public.workspace_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = workspace_memberships.workspace_id
      and public.has_capability(auth.uid(), workspace.tenant_id, 'users.invite')
  )
);

create policy workspace_memberships_update_managed
on public.workspace_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = workspace_memberships.workspace_id
      and public.has_capability(auth.uid(), workspace.tenant_id, 'users.update')
  )
)
with check (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = workspace_memberships.workspace_id
      and public.has_capability(auth.uid(), workspace.tenant_id, 'users.update')
  )
);

create policy workspace_memberships_delete_managed
on public.workspace_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = workspace_memberships.workspace_id
      and public.has_capability(auth.uid(), workspace.tenant_id, 'users.disable')
  )
);

grant select, insert, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;
grant all on public.workspaces, public.workspace_memberships to service_role;

alter table public.audit_logs
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create index if not exists audit_logs_workspace_created_idx
  on public.audit_logs (workspace_id, created_at desc);

commit;
