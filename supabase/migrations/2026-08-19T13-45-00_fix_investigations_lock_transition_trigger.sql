begin;

-- =============================================================================
-- Migration: 2026-08-19T13-45-00_fix_investigations_lock_transition_trigger.sql
-- Description: Fixes validate_investigation_transition trigger so versioned updates
--              modifying is_locked and access_level are recognized as valid business
--              field modifications without error 22023.
-- Reference: doc/plans/PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md (Decisión 36)
-- =============================================================================

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

  -- Ensure that versioned updates modify at least one business or access-control field
  if new.title is not distinct from old.title
     and new.status is not distinct from old.status
     and new.archived_at is not distinct from old.archived_at
     and new.state is not distinct from old.state
     and new.is_locked is not distinct from old.is_locked
     and new.access_level is not distinct from old.access_level then
    raise exception using
      errcode = '22023',
      message = 'investigation update must change a business field';
  end if;

  -- Require investigations.update capability for core content or protection changes
  if new.title is distinct from old.title
     or new.state is distinct from old.state
     or new.is_locked is distinct from old.is_locked
     or new.access_level is distinct from old.access_level then
    if not public.has_capability(auth.uid(), old.tenant_id, 'investigations.update') then
      raise exception using
        errcode = '42501',
        message = 'investigations.update capability is required';
    end if;
  end if;

  -- Verify archive / restore capabilities
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
