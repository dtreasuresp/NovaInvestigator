begin;

-- 1. Tablas de Kanban
create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kanban_columns_tenant_workspace_idx
  on public.kanban_columns (tenant_id, workspace_id, position);

create table if not exists public.kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  project_id uuid references public.investigations(id) on delete set null,
  title text not null,
  description text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  due_date timestamptz,
  cover_image text,
  tags text[] default '{}',
  assignee_ids uuid[] default '{}',
  came_action_id text,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kanban_tasks_tenant_column_idx
  on public.kanban_tasks (tenant_id, column_id, position);

create index if not exists kanban_tasks_project_idx
  on public.kanban_tasks (project_id);

drop trigger if exists kanban_tasks_set_updated_at on public.kanban_tasks;
create trigger kanban_tasks_set_updated_at
before update on public.kanban_tasks
for each row execute function public.set_updated_at();

-- 2. RLS
alter table public.kanban_columns enable row level security;
alter table public.kanban_tasks enable row level security;

create policy kanban_columns_tenant_member_read
on public.kanban_columns
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_columns.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy kanban_columns_tenant_member_write
on public.kanban_columns
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_columns.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_columns.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy kanban_tasks_tenant_member_read
on public.kanban_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_tasks.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy kanban_tasks_tenant_member_write
on public.kanban_tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_tasks.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = kanban_tasks.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- 3. Seed default columns for existing workspaces / tenants
insert into public.kanban_columns (tenant_id, workspace_id, name, slug, position)
select w.tenant_id, w.id, cols.name, cols.slug, cols.position
from public.workspaces as w
cross join (
  values
    ('Backlog', 'backlog', 0),
    ('In Progress', 'in_progress', 1),
    ('Review', 'review', 2),
    ('Done', 'done', 3)
) as cols(name, slug, position)
where not exists (
  select 1 from public.kanban_columns kc
  where kc.workspace_id = w.id and kc.slug = cols.slug
);

commit;
