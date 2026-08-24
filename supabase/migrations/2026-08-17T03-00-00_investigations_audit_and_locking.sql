begin;

-- =============================================================================
-- Migration: 2026-08-17T03-00-00_investigations_audit_and_locking.sql
-- Description: Adds audit access tracking (last_opened_at, last_opened_by) and
--              author protection / collaborative access control (is_locked,
--              access_level) to public.investigations.
-- Reference: doc/plans/PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md (Decisión 35)
-- =============================================================================

alter table public.investigations
  add column if not exists last_opened_at timestamptz,
  add column if not exists last_opened_by uuid references auth.users(id) on delete set null,
  add column if not exists is_locked boolean not null default false,
  add column if not exists access_level text not null default 'team_write' check (access_level in ('private', 'team_read', 'team_write'));

create index if not exists investigations_tenant_last_opened_idx
  on public.investigations (tenant_id, last_opened_at desc);

create index if not exists investigations_tenant_locked_idx
  on public.investigations (tenant_id, is_locked);

-- Function to safely record access/opening of an investigation
create or replace function public.touch_investigation_access(
  p_investigation_id uuid,
  p_tenant_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.investigations
  set
    last_opened_at = clock_timestamp(),
    last_opened_by = p_user_id
  where id = p_investigation_id
    and tenant_id = p_tenant_id;
end;
$$;

grant execute on function public.touch_investigation_access(uuid, uuid, uuid) to authenticated;

-- Update trigger function to allow touch access without requiring version increments
create or replace function public.protect_investigation_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Allow touch access without bumping version or updated_by
  if (old.title = new.title
      and old.status = new.status
      and old.state = new.state
      and old.version = new.version
      and old.is_locked = new.is_locked
      and old.access_level = new.access_level
      and old.archived_at is not distinct from new.archived_at) then
    new.updated_at = old.updated_at;
    new.updated_by = old.updated_by;
    return new;
  end if;

  if new.id <> old.id
     or new.tenant_id <> old.tenant_id
     or new.owner_id <> old.owner_id
     or new.created_at <> old.created_at
     or new.schema_version <> old.schema_version then
    raise exception using
      errcode = '42501',
      message = 'investigation identity fields are immutable';
  end if;

  if new.version <> old.version + 1 then
    raise exception using
      errcode = '22003',
      message = 'investigation version must increase by one';
  end if;

  if new.updated_by is distinct from auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'updated_by must match the authenticated user';
  end if;

  return new;
end;
$$;

create or replace function public.validate_investigation_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Allow touch access without requiring business field changes
  if (old.title = new.title
      and old.status = new.status
      and old.state = new.state
      and old.version = new.version
      and old.is_locked = new.is_locked
      and old.access_level = new.access_level
      and old.archived_at is not distinct from new.archived_at) then
    return new;
  end if;

  -- Allow lock / accessLevel changes
  if (old.title = new.title
      and old.status = new.status
      and old.state = new.state
      and old.version = new.version
      and old.archived_at is not distinct from new.archived_at
      and (old.is_locked <> new.is_locked or old.access_level <> new.access_level)) then
    return new;
  end if;

  if new.title is not distinct from old.title
     and new.status is not distinct from old.status
     and new.archived_at is not distinct from old.archived_at
     and new.state is not distinct from old.state then
    raise exception using
      errcode = '22023',
      message = 'investigation update must change a business field';
  end if;

  if new.title is distinct from old.title
     or new.state is distinct from old.state then
    if not public.has_capability(auth.uid(), old.tenant_id, 'investigations.update') then
      raise exception using
        errcode = '42501',
        message = 'investigations.update capability is required';
    end if;
  end if;

  if new.archived_at is distinct from old.archived_at then
    if new.archived_at is null then
      if not public.has_capability(auth.uid(), old.tenant_id, 'investigations.restore') then
        raise exception using
          errcode = '42501',
          message = 'investigations.restore capability is required';
      end if;
    elsif not public.has_capability(auth.uid(), old.tenant_id, 'investigations.archive') then
      raise exception using
        errcode = '42501',
        message = 'investigations.archive capability is required';
    end if;
  end if;

  return new;
end;
$$;

commit;
