begin;

-- =============================================================================
-- Migration: Project Activities Hierarchy & Work Packages
-- Date: 2026-08-31
-- Scope: Multi-tier Strategic Execution (Investigation -> CAME -> Project -> Activity -> Kanban Task)
-- =============================================================================

-- 1. Tabla de Actividades de Proyecto (Work Packages / Paquetes de Trabajo Tácticos)
create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  came_action_id text, -- Opcional: Código CAME de origen (e.g. 'ACC-F-01')
  title text not null,
  description text default '',
  owner_user_id uuid references auth.users(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  start_date timestamptz,
  end_date timestamptz,
  budget numeric(12,2) not null default 0.00 check (budget >= 0),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices de rendimiento
create index if not exists project_activities_project_idx on public.project_activities (project_id, position);
create index if not exists project_activities_came_idx on public.project_activities (project_id, came_action_id);
create index if not exists project_activities_tenant_idx on public.project_activities (tenant_id);
create index if not exists project_activities_owner_idx on public.project_activities (owner_user_id);

-- Trigger de updated_at
drop trigger if exists project_activities_set_updated_at on public.project_activities;
create trigger project_activities_set_updated_at
before update on public.project_activities
for each row execute function public.set_updated_at();

-- 3. Vincular kanban_tasks con project_activities
alter table public.kanban_tasks
  add column if not exists activity_id uuid references public.project_activities(id) on delete cascade;

create index if not exists kanban_tasks_activity_idx on public.kanban_tasks (activity_id);

-- 4. Habilitar RLS en project_activities
alter table public.project_activities enable row level security;

drop policy if exists project_activities_tenant_member_read on public.project_activities;
create policy project_activities_tenant_member_read
on public.project_activities
for select
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_activities.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists project_activities_tenant_member_write on public.project_activities;
create policy project_activities_tenant_member_write
on public.project_activities
for all
to authenticated
using (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_activities.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships as m
    where m.tenant_id = project_activities.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

commit;
