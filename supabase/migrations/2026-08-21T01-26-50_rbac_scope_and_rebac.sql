begin;

-- ==============================================================================
-- PLAN_REFACTOR_RBAC Fase 1: role_scope + ReBAC + tenant_entitlements
-- Doc: doc/plans/PLAN_REFACTOR_RBAC §15-16, §5-6, §10
-- Arquitectura SODA: src/features/access + src/features/ai consumen esto
-- ==============================================================================

-- 1. Roles con scope explícito (§16)
alter table public.roles
  add column if not exists scope text not null default 'tenant'
  check (scope in ('tenant','workspace','team','platform'));

create index if not exists roles_scope_idx on public.roles(scope);
create index if not exists roles_scope_key_idx on public.roles(scope, key) where tenant_id is null;

-- Backfill scopes para roles sistema existentes
update public.roles set scope = 'tenant' where is_system and scope = 'tenant' and key in ('owner','admin','analyst','viewer');
-- Los roles de sistema con scope tenant ya quedan correctos; platform roles se crearán con scope='platform' cuando se necesiten

comment on column public.roles.scope is 'Scope del rol según PLAN_REFACTOR_RBAC §16: tenant|workspace|team|platform. Un mismo usuario puede tener roles distintos por scope.';

-- 2. Team members: FK a roles con scope team (§6: teams no son roles, el rol vive dentro de la relación)
alter table public.team_members
  add column if not exists role_id uuid references public.roles(id) on delete restrict;

-- Crear roles de team si no existen (scope team, is_system true)
insert into public.roles (key, name, is_system, scope)
values
  ('team_leader', 'Team Leader', true, 'team'),
  ('team_analyst', 'Team Analyst', true, 'team'),
  ('team_viewer', 'Team Viewer', true, 'team'),
  ('team_member', 'Team Member', true, 'team')
on conflict do nothing;

-- Backfill team_members.role_id desde la columna legacy `role` text
do $$
declare
  v_default_role_id uuid;
begin
  select id into v_default_role_id from public.roles where key = 'team_member' and scope = 'team' limit 1;
  if v_default_role_id is not null then
    update public.team_members
    set role_id = v_default_role_id
    where role_id is null;
  end if;
end $$;

create index if not exists team_members_role_idx on public.team_members(role_id);

comment on column public.team_members.role_id is 'FK a roles(scope=team). Reemplaza la antigua columna text role según §6: el rol tiene significado dentro de la relación con el Team.';

-- Mantener la columna legacy `role` text por compatibilidad en esta migración (se eliminará en una migración posterior tras validar)
-- No hacemos DROP COLUMN aún para no romper código que aún lee team_members.role

-- 3. Resource relationships — ReBAC (§5, §15)
create table if not exists public.resource_relationships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject_type text not null check (subject_type in ('user','team','workspace')),
  subject_id uuid not null,
  relation text not null check (relation in ('member_of','belongs_to','owner_of','editor_of','viewer_of')),
  object_type text not null check (object_type in ('team','workspace','tenant','investigation','resource')),
  object_id uuid not null,
  created_at timestamptz not null default now(),
  unique (subject_type, subject_id, relation, object_type, object_id)
);

create index if not exists resource_relationships_tenant_idx on public.resource_relationships(tenant_id, object_type, object_id);
create index if not exists resource_relationships_subject_idx on public.resource_relationships(subject_type, subject_id, relation);
create index if not exists resource_relationships_object_idx on public.resource_relationships(object_type, object_id, relation);

alter table public.resource_relationships enable row level security;

drop policy if exists resource_relationships_select_member on public.resource_relationships;
create policy resource_relationships_select_member
on public.resource_relationships for select to authenticated
using (public.is_active_tenant_member(auth.uid(), tenant_id));

drop policy if exists resource_relationships_insert_member on public.resource_relationships;
create policy resource_relationships_insert_member
on public.resource_relationships for insert to authenticated
with check (public.is_active_tenant_member(auth.uid(), tenant_id));

grant select on public.resource_relationships to authenticated;
grant all on public.resource_relationships to service_role;

comment on table public.resource_relationships is 'ReBAC §5: expresa relaciones member_of / belongs_to para Zanzibar-lite. user member_of team belongs_to workspace belongs_to tenant.';

-- 4. Tenant entitlements — proyección local de Stripe (§10, §20)
create table if not exists public.tenant_entitlements (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entitlement_key text not null,
  limit_value numeric,
  is_enabled boolean not null default true,
  source text not null default 'plan' check (source in ('plan','override','stripe')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, entitlement_key)
);

create index if not exists tenant_entitlements_tenant_idx on public.tenant_entitlements(tenant_id);

drop trigger if exists tenant_entitlements_set_updated_at on public.tenant_entitlements;
create trigger tenant_entitlements_set_updated_at
before update on public.tenant_entitlements
for each row execute function public.set_updated_at();

alter table public.tenant_entitlements enable row level security;

drop policy if exists tenant_entitlements_select_member on public.tenant_entitlements;
create policy tenant_entitlements_select_member
on public.tenant_entitlements for select to authenticated
using (public.is_active_tenant_member(auth.uid(), tenant_id));

grant select on public.tenant_entitlements to authenticated;
grant all on public.tenant_entitlements to service_role;

comment on table public.tenant_entitlements is 'Proyección local de entitlements efectivos del tenant (§10). Stripe es source-of-truth; el Authorization Engine lee aquí, nunca a Stripe en cada request.';

-- 5. Helper ReBAC (§5)
create or replace function public.is_member_of_team(p_user_id uuid, p_team_id uuid)
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select
    p_user_id is not null and p_team_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = p_team_id and tm.user_id = p_user_id
    );
$$;

create or replace function public.team_belongs_to_workspace(p_team_id uuid, p_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.workspace_id = p_workspace_id
  );
$$;

revoke all on function public.is_member_of_team(uuid, uuid) from public, anon;
revoke all on function public.team_belongs_to_workspace(uuid, uuid) from public, anon;
grant execute on function public.is_member_of_team(uuid, uuid) to authenticated, service_role;
grant execute on function public.team_belongs_to_workspace(uuid, uuid) to authenticated, service_role;

commit;
