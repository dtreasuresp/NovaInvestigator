begin;

-- =============================================================================
-- Migration: Strategy and OKR foundation
-- Scope: durable strategic objectives, independent OKR cycles and their
--        cycle-specific commitments.
--
-- CAME remains owned by Research in investigations.state. A strategic
-- objective may keep a source snapshot for traceability, but this migration
-- intentionally does not backfill JSONB actions or create a parallel CAME
-- catalog.
-- =============================================================================

-- 1. Durable strategic objectives
create table if not exists public.strategic_objectives (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'at_risk', 'achieved', 'cancelled', 'archived')),
  owner_user_id uuid references auth.users(id) on delete set null,
  source_investigation_id uuid references public.investigations(id) on delete set null,
  source_came_action_id text,
  source_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_snapshot) = 'object'),
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategic_objectives_tenant_status_idx
  on public.strategic_objectives (tenant_id, status, updated_at desc);
create index if not exists strategic_objectives_workspace_idx
  on public.strategic_objectives (tenant_id, workspace_id, status, updated_at desc);
create index if not exists strategic_objectives_team_idx
  on public.strategic_objectives (tenant_id, team_id, status, updated_at desc);
create index if not exists strategic_objectives_owner_idx
  on public.strategic_objectives (tenant_id, owner_user_id, status);
create index if not exists strategic_objectives_source_idx
  on public.strategic_objectives (tenant_id, source_investigation_id, source_came_action_id);

drop trigger if exists strategic_objectives_set_updated_at on public.strategic_objectives;
create trigger strategic_objectives_set_updated_at
before update on public.strategic_objectives
for each row execute function public.set_updated_at();

-- 2. Independent OKR cycles
create table if not exists public.okr_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  period_type text not null default 'quarterly'
    check (period_type in ('quarterly', 'annual', 'custom')),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'closed', 'archived')),
  owner_user_id uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists okr_cycles_tenant_status_idx
  on public.okr_cycles (tenant_id, status, start_date desc);
create index if not exists okr_cycles_workspace_idx
  on public.okr_cycles (tenant_id, workspace_id, status, start_date desc);
create index if not exists okr_cycles_team_idx
  on public.okr_cycles (tenant_id, team_id, status, start_date desc);

drop trigger if exists okr_cycles_set_updated_at on public.okr_cycles;
create trigger okr_cycles_set_updated_at
before update on public.okr_cycles
for each row execute function public.set_updated_at();

-- 3. Cycle-specific objective commitments
create table if not exists public.okr_cycle_objectives (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cycle_id uuid not null references public.okr_cycles(id) on delete cascade,
  strategic_objective_id uuid not null references public.strategic_objectives(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  commitment text not null default '',
  weight numeric(8,2) not null default 1.00 check (weight > 0),
  status text not null default 'not_started'
    check (status in ('not_started', 'on_track', 'at_risk', 'off_track', 'achieved', 'dropped')),
  progress numeric(5,2) not null default 0.00
    check (progress >= 0 and progress <= 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, strategic_objective_id)
);

create index if not exists okr_cycle_objectives_tenant_idx
  on public.okr_cycle_objectives (tenant_id, created_at desc);
create index if not exists okr_cycle_objectives_cycle_status_idx
  on public.okr_cycle_objectives (tenant_id, cycle_id, status, progress desc);
create index if not exists okr_cycle_objectives_objective_idx
  on public.okr_cycle_objectives (tenant_id, strategic_objective_id);

drop trigger if exists okr_cycle_objectives_set_updated_at on public.okr_cycle_objectives;
create trigger okr_cycle_objectives_set_updated_at
before update on public.okr_cycle_objectives
for each row execute function public.set_updated_at();

-- 4. Additive Project link for the next Strategy -> Initiative -> Project
-- layer. The existing free-text `projects.objective` remains backward
-- compatible; this column is the normalized relationship.
alter table public.projects
  add column if not exists strategic_objective_id uuid
    references public.strategic_objectives(id) on delete set null;

create index if not exists projects_strategic_objective_idx
  on public.projects (tenant_id, strategic_objective_id);

-- 5. Tenant and scope validation
create or replace function public.validate_strategic_objective_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  workspace_tenant_id uuid;
  team_tenant_id uuid;
  team_workspace_id uuid;
  investigation_tenant_id uuid;
begin
  if new.workspace_id is not null then
    select workspace.tenant_id
      into workspace_tenant_id
    from public.workspaces as workspace
    where workspace.id = new.workspace_id;

    if workspace_tenant_id is null or workspace_tenant_id <> new.tenant_id then
      raise exception using
        errcode = '23514',
        message = 'strategic objective workspace does not belong to tenant';
    end if;
  end if;

  if new.team_id is not null then
    select team.tenant_id, team.workspace_id
      into team_tenant_id, team_workspace_id
    from public.teams as team
    where team.id = new.team_id;

    if team_tenant_id is null or team_tenant_id <> new.tenant_id then
      raise exception using
        errcode = '23514',
        message = 'strategic objective team does not belong to tenant';
    end if;

    if new.workspace_id is not null
       and team_workspace_id is distinct from new.workspace_id then
      raise exception using
        errcode = '23514',
        message = 'strategic objective team does not belong to workspace';
    end if;
  end if;

  if new.source_investigation_id is not null then
    select investigation.tenant_id
      into investigation_tenant_id
    from public.investigations as investigation
    where investigation.id = new.source_investigation_id;

    if investigation_tenant_id is null or investigation_tenant_id <> new.tenant_id then
      raise exception using
        errcode = '23514',
        message = 'strategic objective source investigation does not belong to tenant';
    end if;
  end if;

  if new.owner_user_id is not null
     and not exists (
       select 1
       from public.memberships as membership
       where membership.tenant_id = new.tenant_id
         and membership.user_id = new.owner_user_id
         and membership.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'strategic objective owner must be an active tenant member';
  end if;

  if new.workspace_id is not null
     and new.owner_user_id is not null
     and not exists (
       select 1
       from public.workspace_memberships as workspace_membership
       where workspace_membership.workspace_id = new.workspace_id
         and workspace_membership.user_id = new.owner_user_id
         and workspace_membership.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'strategic objective owner must be an active workspace member';
  end if;

  if new.team_id is not null
     and new.owner_user_id is not null
     and not exists (
       select 1
       from public.team_members as team_member
       where team_member.team_id = new.team_id
         and team_member.user_id = new.owner_user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'strategic objective owner must belong to team';
  end if;

  return new;
end;
$$;

drop trigger if exists strategic_objectives_validate_scope on public.strategic_objectives;
create trigger strategic_objectives_validate_scope
before insert or update on public.strategic_objectives
for each row execute function public.validate_strategic_objective_scope();

create or replace function public.validate_okr_cycle_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  workspace_tenant_id uuid;
  team_tenant_id uuid;
  team_workspace_id uuid;
begin
  if new.workspace_id is not null then
    select workspace.tenant_id
      into workspace_tenant_id
    from public.workspaces as workspace
    where workspace.id = new.workspace_id;

    if workspace_tenant_id is null or workspace_tenant_id <> new.tenant_id then
      raise exception using
        errcode = '23514',
        message = 'OKR cycle workspace does not belong to tenant';
    end if;
  end if;

  if new.team_id is not null then
    select team.tenant_id, team.workspace_id
      into team_tenant_id, team_workspace_id
    from public.teams as team
    where team.id = new.team_id;

    if team_tenant_id is null or team_tenant_id <> new.tenant_id then
      raise exception using
        errcode = '23514',
        message = 'OKR cycle team does not belong to tenant';
    end if;

    if new.workspace_id is not null
       and team_workspace_id is distinct from new.workspace_id then
      raise exception using
        errcode = '23514',
        message = 'OKR cycle team does not belong to workspace';
    end if;
  end if;

  if new.owner_user_id is not null
     and not exists (
       select 1
       from public.memberships as membership
       where membership.tenant_id = new.tenant_id
         and membership.user_id = new.owner_user_id
         and membership.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle owner must be an active tenant member';
  end if;

  if new.workspace_id is not null
     and new.owner_user_id is not null
     and not exists (
       select 1
       from public.workspace_memberships as workspace_membership
       where workspace_membership.workspace_id = new.workspace_id
         and workspace_membership.user_id = new.owner_user_id
         and workspace_membership.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle owner must be an active workspace member';
  end if;

  if new.team_id is not null
     and new.owner_user_id is not null
     and not exists (
       select 1
       from public.team_members as team_member
       where team_member.team_id = new.team_id
         and team_member.user_id = new.owner_user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle owner must belong to team';
  end if;

  return new;
end;
$$;

drop trigger if exists okr_cycles_validate_scope on public.okr_cycles;
create trigger okr_cycles_validate_scope
before insert or update on public.okr_cycles
for each row execute function public.validate_okr_cycle_scope();

create or replace function public.validate_okr_cycle_objective_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  cycle_tenant_id uuid;
  cycle_workspace_id uuid;
  cycle_team_id uuid;
  cycle_status text;
  objective_tenant_id uuid;
  objective_workspace_id uuid;
  objective_team_id uuid;
begin
  if tg_op = 'DELETE' then
    select cycle.status
      into cycle_status
    from public.okr_cycles as cycle
    where cycle.id = old.cycle_id
      and cycle.tenant_id = old.tenant_id;

    if cycle_status in ('closed', 'archived') then
      raise exception using
        errcode = '42501',
        message = 'closed or archived OKR cycles are immutable';
    end if;

    return old;
  end if;

  select cycle.tenant_id, cycle.workspace_id, cycle.team_id, cycle.status
    into cycle_tenant_id, cycle_workspace_id, cycle_team_id, cycle_status
  from public.okr_cycles as cycle
  where cycle.id = new.cycle_id;

  select objective.tenant_id, objective.workspace_id, objective.team_id
    into objective_tenant_id, objective_workspace_id, objective_team_id
  from public.strategic_objectives as objective
  where objective.id = new.strategic_objective_id;

  if cycle_tenant_id is null
     or objective_tenant_id is null
     or new.tenant_id <> cycle_tenant_id
     or new.tenant_id <> objective_tenant_id then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle objective references must share tenant';
  end if;

  if cycle_workspace_id is not null
     and objective_workspace_id is not null
     and cycle_workspace_id <> objective_workspace_id then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle and objective must share workspace';
  end if;

  if cycle_team_id is not null
     and objective_team_id is not null
     and cycle_team_id <> objective_team_id then
    raise exception using
      errcode = '23514',
      message = 'OKR cycle and objective must share team';
  end if;

  if cycle_status not in ('draft', 'active') then
    raise exception using
      errcode = '42501',
      message = 'only draft or active OKR cycles can change objectives';
  end if;

  if new.owner_user_id is not null
     and not exists (
       select 1
       from public.memberships as membership
       where membership.tenant_id = new.tenant_id
         and membership.user_id = new.owner_user_id
         and membership.status = 'active'
     ) then
    raise exception using
      errcode = '23514',
      message = 'cycle objective owner must be an active tenant member';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
       or new.tenant_id <> old.tenant_id
       or new.cycle_id <> old.cycle_id
       or new.strategic_objective_id <> old.strategic_objective_id
       or new.created_at <> old.created_at
       or new.created_by is distinct from old.created_by then
      raise exception using
        errcode = '42501',
        message = 'OKR cycle objective identity fields are immutable';
    end if;

    if auth.uid() is not null then
      if new.version <> old.version + 1 then
        raise exception using
          errcode = '22003',
          message = 'OKR cycle objective version must increase by one';
      end if;

      if new.updated_by is distinct from auth.uid() then
        raise exception using
          errcode = '42501',
          message = 'OKR cycle objective updated_by must match authenticated user';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists okr_cycle_objectives_validate_scope on public.okr_cycle_objectives;
create trigger okr_cycle_objectives_validate_scope
before insert or update or delete on public.okr_cycle_objectives
for each row execute function public.validate_okr_cycle_objective_scope();

create or replace function public.validate_projects_strategic_objective_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  objective_tenant_id uuid;
  objective_workspace_id uuid;
begin
  if new.strategic_objective_id is null then
    return new;
  end if;

  select objective.tenant_id, objective.workspace_id
    into objective_tenant_id, objective_workspace_id
  from public.strategic_objectives as objective
  where objective.id = new.strategic_objective_id;

  if objective_tenant_id is null or objective_tenant_id <> new.tenant_id then
    raise exception using
      errcode = '23514',
      message = 'project strategic objective does not belong to tenant';
  end if;

  if new.workspace_id is not null
     and objective_workspace_id is not null
     and new.workspace_id <> objective_workspace_id then
    raise exception using
      errcode = '23514',
      message = 'project and strategic objective must share workspace';
  end if;

  return new;
end;
$$;

drop trigger if exists projects_validate_strategic_objective_scope on public.projects;
create trigger projects_validate_strategic_objective_scope
before insert or update on public.projects
for each row execute function public.validate_projects_strategic_objective_scope();

-- 6. Optimistic locking and lifecycle transitions
create or replace function public.validate_strategic_objective_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.id <> old.id
     or new.tenant_id <> old.tenant_id
     or new.created_at <> old.created_at
     or new.created_by is distinct from old.created_by then
    raise exception using
      errcode = '42501',
      message = 'strategic objective identity fields are immutable';
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if old.status = 'archived' then
    raise exception using
      errcode = '42501',
      message = 'archived strategic objectives are immutable';
  end if;

  if new.version <> old.version + 1 then
    raise exception using
      errcode = '22003',
      message = 'strategic objective version must increase by one';
  end if;

  if new.updated_by is distinct from auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'strategic objective updated_by must match authenticated user';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'archived' then
      if not public.has_capability(auth.uid(), old.tenant_id, 'strategy.objectives.archive') then
        raise exception using
          errcode = '42501',
          message = 'strategy.objectives.archive capability is required';
      end if;
      new.archived_at := coalesce(new.archived_at, clock_timestamp());
    elsif not public.has_capability(auth.uid(), old.tenant_id, 'strategy.objectives.update') then
      raise exception using
        errcode = '42501',
        message = 'strategy.objectives.update capability is required';
    end if;
  elsif not public.has_capability(auth.uid(), old.tenant_id, 'strategy.objectives.update') then
    raise exception using
      errcode = '42501',
      message = 'strategy.objectives.update capability is required';
  end if;

  return new;
end;
$$;

drop trigger if exists strategic_objectives_validate_update on public.strategic_objectives;
create trigger strategic_objectives_validate_update
before update on public.strategic_objectives
for each row execute function public.validate_strategic_objective_update();

create or replace function public.validate_okr_cycle_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.id <> old.id
     or new.tenant_id <> old.tenant_id
     or new.created_at <> old.created_at
     or new.created_by is distinct from old.created_by then
    raise exception using
      errcode = '42501',
      message = 'OKR cycle identity fields are immutable';
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if new.version <> old.version + 1 then
    raise exception using
      errcode = '22003',
      message = 'OKR cycle version must increase by one';
  end if;

  if new.updated_by is distinct from auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'OKR cycle updated_by must match authenticated user';
  end if;

  if old.status = 'archived' then
    raise exception using
      errcode = '42501',
      message = 'archived OKR cycles are immutable';
  end if;

  if old.status = 'closed'
     and (
       new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.period_type is distinct from old.period_type
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
       or new.owner_user_id is distinct from old.owner_user_id
       or new.status not in ('closed', 'archived')
     ) then
    raise exception using
      errcode = '42501',
      message = 'closed OKR cycles are immutable';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'active' and old.status = 'draft' then
      if not public.has_capability(auth.uid(), old.tenant_id, 'strategy.okr_cycles.update') then
        raise exception using
          errcode = '42501',
          message = 'strategy.okr_cycles.update capability is required';
      end if;
    elsif new.status = 'closed' and old.status = 'active' then
      if not public.has_capability(auth.uid(), old.tenant_id, 'strategy.okr_cycles.close') then
        raise exception using
          errcode = '42501',
          message = 'strategy.okr_cycles.close capability is required';
      end if;
    elsif new.status = 'archived' and old.status in ('draft', 'active', 'closed') then
      if not public.has_capability(auth.uid(), old.tenant_id, 'strategy.okr_cycles.archive') then
        raise exception using
          errcode = '42501',
          message = 'strategy.okr_cycles.archive capability is required';
      end if;
      new.archived_at := coalesce(new.archived_at, clock_timestamp());
    else
      raise exception using
        errcode = '22023',
        message = 'invalid OKR cycle status transition';
    end if;
  elsif old.status in ('draft', 'active')
     and not public.has_capability(auth.uid(), old.tenant_id, 'strategy.okr_cycles.update') then
    raise exception using
      errcode = '42501',
      message = 'strategy.okr_cycles.update capability is required';
  end if;

  if old.status in ('active', 'closed')
     and (
       new.period_type is distinct from old.period_type
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
     ) then
    raise exception using
      errcode = '42501',
      message = 'active OKR cycle dates and period are immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists okr_cycles_validate_update on public.okr_cycles;
create trigger okr_cycles_validate_update
before update on public.okr_cycles
for each row execute function public.validate_okr_cycle_update();

-- 7. RLS policies
alter table public.strategic_objectives enable row level security;
alter table public.okr_cycles enable row level security;
alter table public.okr_cycle_objectives enable row level security;

drop policy if exists strategic_objectives_select_visible on public.strategic_objectives;
create policy strategic_objectives_select_visible
on public.strategic_objectives
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and (
    workspace_id is null
    or public.is_active_workspace_member(auth.uid(), workspace_id)
    or public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.read')
  )
);

drop policy if exists strategic_objectives_insert_managed on public.strategic_objectives;
create policy strategic_objectives_insert_managed
on public.strategic_objectives
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.create')
);

drop policy if exists strategic_objectives_update_managed on public.strategic_objectives;
create policy strategic_objectives_update_managed
on public.strategic_objectives
for update
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.update')
  or public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.archive')
)
with check (
  updated_by = auth.uid()
  and (
    public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.update')
    or public.has_capability(auth.uid(), tenant_id, 'strategy.objectives.archive')
  )
);

drop policy if exists okr_cycles_select_visible on public.okr_cycles;
create policy okr_cycles_select_visible
on public.okr_cycles
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and (
    workspace_id is null
    or public.is_active_workspace_member(auth.uid(), workspace_id)
    or public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.read')
  )
);

drop policy if exists okr_cycles_insert_managed on public.okr_cycles;
create policy okr_cycles_insert_managed
on public.okr_cycles
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.create')
);

drop policy if exists okr_cycles_update_managed on public.okr_cycles;
create policy okr_cycles_update_managed
on public.okr_cycles
for update
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.update')
  or public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.close')
  or public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.archive')
)
with check (
  updated_by = auth.uid()
  and (
    public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.update')
    or public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.close')
    or public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycles.archive')
  )
);

drop policy if exists okr_cycle_objectives_select_visible on public.okr_cycle_objectives;
create policy okr_cycle_objectives_select_visible
on public.okr_cycle_objectives
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and exists (
    select 1
    from public.okr_cycles as cycle
    where cycle.id = okr_cycle_objectives.cycle_id
      and cycle.tenant_id = okr_cycle_objectives.tenant_id
      and (
        cycle.workspace_id is null
        or public.is_active_workspace_member(auth.uid(), cycle.workspace_id)
        or public.has_capability(auth.uid(), cycle.tenant_id, 'strategy.okr_cycles.read')
      )
  )
  and exists (
    select 1
    from public.strategic_objectives as objective
    where objective.id = okr_cycle_objectives.strategic_objective_id
      and objective.tenant_id = okr_cycle_objectives.tenant_id
      and (
        objective.workspace_id is null
        or public.is_active_workspace_member(auth.uid(), objective.workspace_id)
        or public.has_capability(auth.uid(), objective.tenant_id, 'strategy.objectives.read')
      )
  )
);

drop policy if exists okr_cycle_objectives_insert_managed on public.okr_cycle_objectives;
create policy okr_cycle_objectives_insert_managed
on public.okr_cycle_objectives
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycle_objectives.manage')
);

drop policy if exists okr_cycle_objectives_update_managed on public.okr_cycle_objectives;
create policy okr_cycle_objectives_update_managed
on public.okr_cycle_objectives
for update
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycle_objectives.manage')
)
with check (
  updated_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'strategy.okr_cycle_objectives.manage')
);

-- 8. Explicit privileges. Authenticated users can only use the operations
-- exposed by the policies; deletes are intentionally not granted.
grant usage on schema public to authenticated, service_role;
grant select on
  public.strategic_objectives,
  public.okr_cycles,
  public.okr_cycle_objectives
to authenticated;
grant insert, update on
  public.strategic_objectives,
  public.okr_cycles,
  public.okr_cycle_objectives
to authenticated;
grant all on
  public.strategic_objectives,
  public.okr_cycles,
  public.okr_cycle_objectives
to service_role;

revoke all on function public.validate_strategic_objective_scope() from public, anon, authenticated;
revoke all on function public.validate_okr_cycle_scope() from public, anon, authenticated;
revoke all on function public.validate_okr_cycle_objective_scope() from public, anon, authenticated;
revoke all on function public.validate_projects_strategic_objective_scope() from public, anon, authenticated;
revoke all on function public.validate_strategic_objective_update() from public, anon, authenticated;
revoke all on function public.validate_okr_cycle_update() from public, anon, authenticated;

-- 9. Capability catalog and system role presets
insert into public.capabilities (key, description, resource, action)
values
  ('strategy.objectives.read', 'Ver objetivos estrategicos dentro del alcance del tenant o workspace.', 'strategy.objectives', 'read'),
  ('strategy.objectives.create', 'Crear objetivos estrategicos dentro del tenant.', 'strategy.objectives', 'create'),
  ('strategy.objectives.update', 'Actualizar objetivos estrategicos no archivados.', 'strategy.objectives', 'update'),
  ('strategy.objectives.archive', 'Archivar objetivos estrategicos sin borrado fisico.', 'strategy.objectives', 'archive'),
  ('strategy.okr_cycles.read', 'Ver ciclos OKR y sus periodos dentro del alcance autorizado.', 'strategy.okr_cycles', 'read'),
  ('strategy.okr_cycles.create', 'Crear ciclos OKR independientes para el tenant.', 'strategy.okr_cycles', 'create'),
  ('strategy.okr_cycles.update', 'Actualizar ciclos OKR en borrador o activos.', 'strategy.okr_cycles', 'update'),
  ('strategy.okr_cycles.close', 'Cerrar ciclos OKR activos e impedir cambios posteriores.', 'strategy.okr_cycles', 'close'),
  ('strategy.okr_cycles.archive', 'Archivar ciclos OKR conservando su historial.', 'strategy.okr_cycles', 'archive'),
  ('strategy.okr_cycle_objectives.manage', 'Vincular objetivos a ciclos OKR y actualizar su compromiso y progreso.', 'strategy.okr_cycle_objectives', 'manage')
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability.key
from public.roles as role_row
cross join public.capabilities as capability
where role_row.tenant_id is null
  and role_row.key in ('owner', 'admin')
  and capability.key like 'strategy.%'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability_key
from public.roles as role_row
cross join (
  values
    ('strategy.objectives.read'),
    ('strategy.objectives.create'),
    ('strategy.objectives.update'),
    ('strategy.objectives.archive'),
    ('strategy.okr_cycles.read'),
    ('strategy.okr_cycles.create'),
    ('strategy.okr_cycles.update'),
    ('strategy.okr_cycles.close'),
    ('strategy.okr_cycles.archive'),
    ('strategy.okr_cycle_objectives.manage')
) as analyst_capabilities(capability_key)
where role_row.tenant_id is null
  and role_row.key = 'analyst'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability_key
from public.roles as role_row
cross join (
  values
    ('strategy.objectives.read'),
    ('strategy.okr_cycles.read')
) as viewer_capabilities(capability_key)
where role_row.tenant_id is null
  and role_row.key = 'viewer'
on conflict do nothing;

commit;
