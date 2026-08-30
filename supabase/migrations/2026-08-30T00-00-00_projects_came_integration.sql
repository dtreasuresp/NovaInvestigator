begin;

-- =============================================================================
-- Migration: Projects & CAME Integration, Kanban Synchronization & DOCX Export
-- Date: 2026-08-30
-- Scope: NovaResearch Projects, Project Members, CAME Actions Traceability & Usage
-- =============================================================================

-- 1. Tabla de Proyectos (Standalone y Derivados de Investigación)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  investigation_id uuid references public.investigations(id) on delete set null,
  name text not null,
  description text default '',
  objective text default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  start_date timestamptz,
  end_date timestamptz,
  leader_user_id uuid references auth.users(id) on delete set null,
  budget_total numeric(12,2) not null default 0.00 check (budget_total >= 0),
  budget_mode text not null default 'action_based' check (budget_mode in ('action_based', 'total_first')),
  status text not null default 'active' check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  idempotency_key text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_tenant_idx on public.projects (tenant_id, created_at desc);
create index if not exists projects_investigation_idx on public.projects (investigation_id);
create index if not exists projects_team_idx on public.projects (team_id);
create index if not exists projects_workspace_idx on public.projects (workspace_id);
create index if not exists projects_idempotency_idx on public.projects (tenant_id, idempotency_key) where idempotency_key is not null;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- 2. Tabla de Miembros del Proyecto (Subconjunto del Team)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_project_idx on public.project_members (project_id);
create index if not exists project_members_user_idx on public.project_members (user_id);
create index if not exists project_members_tenant_idx on public.project_members (tenant_id);

-- 3. Tabla de Trazabilidad y Snapshot CAME -> Project
create table if not exists public.project_came_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  investigation_id uuid not null references public.investigations(id) on delete cascade,
  came_action_id text not null,
  action_type text not null check (action_type in ('C', 'A', 'M', 'E')),
  budget_allocated numeric(12,2) not null default 0.00 check (budget_allocated >= 0),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, came_action_id)
);

create index if not exists project_came_actions_project_idx on public.project_came_actions (project_id);
create index if not exists project_came_actions_investigation_idx on public.project_came_actions (investigation_id);
create index if not exists project_came_actions_tenant_idx on public.project_came_actions (tenant_id);

-- 4. Extensión de kanban_tasks con Presupuesto y Clave Foránea a projects
alter table public.kanban_tasks
  add column if not exists budget_amount numeric(12,2) not null default 0.00;

alter table public.kanban_tasks
  drop constraint if exists kanban_tasks_project_id_fkey;

alter table public.kanban_tasks
  add constraint kanban_tasks_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

-- 5. Habilitar RLS en nuevas tablas
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_came_actions enable row level security;

-- Políticas RLS para projects
drop policy if exists projects_tenant_member_read on public.projects;
create policy projects_tenant_member_read
on public.projects
for select
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = projects.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists projects_tenant_member_write on public.projects;
create policy projects_tenant_member_write
on public.projects
for all
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = projects.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = projects.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- Políticas RLS para project_members
drop policy if exists project_members_tenant_read on public.project_members;
create policy project_members_tenant_read
on public.project_members
for select
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_members.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists project_members_tenant_write on public.project_members;
create policy project_members_tenant_write
on public.project_members
for all
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_members.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_members.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- Políticas RLS para project_came_actions
drop policy if exists project_came_actions_tenant_read on public.project_came_actions;
create policy project_came_actions_tenant_read
on public.project_came_actions
for select
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_came_actions.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists project_came_actions_tenant_write on public.project_came_actions;
create policy project_came_actions_tenant_write
on public.project_came_actions
for all
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_came_actions.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_came_actions.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- 6. Extender la función RPC para consumo atómico de exportaciones PDF y DOCX
create or replace function public.consume_billing_entitlement_usage(
  p_tenant_id uuid,
  p_entitlement_key text
)
returns table (
  allowed boolean,
  usage_count integer,
  limit_value integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_period_start date := date_trunc('month', v_now)::date;
  v_limit numeric;
  v_usage_id uuid;
  v_usage_count integer;
  v_required_capability text;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authenticated user required';
  end if;

  if p_tenant_id is null
    or p_entitlement_key not in ('investigations.export_pdf_monthly', 'investigations.export_docx_monthly')
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported entitlement usage request';
  end if;

  if not public.is_active_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      errcode = '42501',
      message = 'active tenant membership required';
  end if;

  v_required_capability := case
    when p_entitlement_key = 'investigations.export_docx_monthly' then 'investigations.export'
    else 'investigations.export'
  end;

  if not public.has_capability(v_user_id, p_tenant_id, v_required_capability) then
    raise exception using
      errcode = '42501',
      message = 'investigations export capability required';
  end if;

  select entitlement.limit_value
    into v_limit
  from public.subscriptions as subscription
  join public.plans as plan
    on plan.id = subscription.plan_id
  join public.plan_entitlements as entitlement
    on entitlement.plan_id = plan.id
  where subscription.tenant_id = p_tenant_id
    and subscription.status in ('active', 'trialing')
    and (
      subscription.current_period_start is null
      or subscription.current_period_start <= v_now
    )
    and (
      subscription.current_period_end is null
      or subscription.current_period_end > v_now
    )
    and plan.is_active
    and entitlement.entitlement_key = p_entitlement_key
    and entitlement.is_enabled
  order by subscription.updated_at desc
  limit 1;

  if v_limit is null
    or v_limit < 1
    or v_limit <> trunc(v_limit)
  then
    return query
    select false, 0, null::integer;
    return;
  end if;

  insert into public.billing_entitlement_usage (
    tenant_id,
    entitlement_key,
    period_start,
    usage_count
  )
  values (
    p_tenant_id,
    p_entitlement_key,
    v_period_start,
    1
  )
  on conflict (tenant_id, entitlement_key, period_start)
  do update
  set usage_count = public.billing_entitlement_usage.usage_count + 1
  returning id, public.billing_entitlement_usage.usage_count
  into v_usage_id, v_usage_count;

  if v_usage_count > v_limit then
    update public.billing_entitlement_usage
    set usage_count = usage_count - 1
    where id = v_usage_id;

    return query
    select false, (v_usage_count - 1), v_limit::integer;
    return;
  end if;

  return query
  select true, v_usage_count, v_limit::integer;
end;
$$;

-- 7. Registrar nuevas capacidades funcionales de Proyectos
insert into public.capabilities (key, resource, action, description)
values
  ('projects.read', 'projects', 'read', 'Ver los proyectos del tenant y sus actividades vinculadas.'),
  ('projects.create', 'projects', 'create', 'Crear proyectos independientes o derivados de una investigación CAME.'),
  ('projects.update', 'projects', 'update', 'Actualizar datos, presupuesto y miembros de un proyecto.'),
  ('projects.delete', 'projects', 'delete', 'Archivar o eliminar proyectos del tenant.')
on conflict (key) do update
set description = excluded.description;

-- Asignar capacidades a roles por defecto
insert into public.role_capabilities (role_id, capability_key)
select r.id, c.key
from public.roles r
cross join (
  values 
    ('projects.read'),
    ('projects.create'),
    ('projects.update'),
    ('projects.delete')
) as c(key)
where r.key in ('owner', 'admin') and r.is_system
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select r.id, c.key
from public.roles r
cross join (
  values 
    ('projects.read'),
    ('projects.create'),
    ('projects.update')
) as c(key)
where r.key in ('analyst') and r.is_system
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select r.id, 'projects.read'
from public.roles r
where r.key in ('viewer') and r.is_system
on conflict do nothing;

commit;
