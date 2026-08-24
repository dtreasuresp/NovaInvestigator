begin;

create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  status text not null,
  archived_at timestamptz,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  schema_version integer not null check (schema_version > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists investigations_tenant_updated_idx
  on public.investigations (tenant_id, updated_at desc);

create index if not exists investigations_tenant_owner_updated_idx
  on public.investigations (tenant_id, owner_id, updated_at desc);

create index if not exists investigations_tenant_status_idx
  on public.investigations (tenant_id, status);

drop trigger if exists investigations_set_updated_at on public.investigations;
create trigger investigations_set_updated_at
before update on public.investigations
for each row execute function public.set_updated_at();

create or replace function public.protect_investigation_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
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

drop trigger if exists investigations_protect_update on public.investigations;
create trigger investigations_protect_update
before update on public.investigations
for each row execute function public.protect_investigation_update();

create or replace function public.validate_investigation_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
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

  if new.status is distinct from old.status then
    if new.status = 'cerrada' then
      if not public.has_capability(auth.uid(), old.tenant_id, 'investigations.close') then
        raise exception using
          errcode = '42501',
          message = 'investigations.close capability is required';
      end if;
    elsif not public.has_capability(auth.uid(), old.tenant_id, 'investigations.update') then
      raise exception using
        errcode = '42501',
        message = 'investigations.update capability is required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists investigations_validate_transition on public.investigations;
create trigger investigations_validate_transition
before update on public.investigations
for each row execute function public.validate_investigation_transition();

create table if not exists public.investigation_revisions (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  version integer not null check (version > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  reason text not null check (length(btrim(reason)) > 0),
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (investigation_id, version)
);

create index if not exists investigation_revisions_tenant_created_idx
  on public.investigation_revisions (tenant_id, created_at desc);

create index if not exists investigation_revisions_investigation_version_idx
  on public.investigation_revisions (investigation_id, version desc);

create or replace function public.validate_investigation_revision_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  investigation_tenant_id uuid;
begin
  select investigation.tenant_id
    into investigation_tenant_id
  from public.investigations as investigation
  where investigation.id = new.investigation_id;

  if investigation_tenant_id is null
     or investigation_tenant_id <> new.tenant_id then
    raise exception using
      errcode = '23514',
      message = 'investigation revision tenant does not match investigation';
  end if;

  return new;
end;
$$;

drop trigger if exists investigation_revisions_validate_scope on public.investigation_revisions;
create trigger investigation_revisions_validate_scope
before insert on public.investigation_revisions
for each row execute function public.validate_investigation_revision_scope();

create or replace function public.prevent_investigation_revision_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'investigation_revisions are append-only';
end;
$$;

drop trigger if exists investigation_revisions_no_update_delete on public.investigation_revisions;
create trigger investigation_revisions_no_update_delete
before update or delete on public.investigation_revisions
for each row execute function public.prevent_investigation_revision_mutation();

revoke all on function public.protect_investigation_update() from public;
revoke all on function public.validate_investigation_transition() from public;
revoke all on function public.validate_investigation_revision_scope() from public;
revoke all on function public.prevent_investigation_revision_mutation() from public;

alter table public.investigations enable row level security;
alter table public.investigation_revisions enable row level security;

drop policy if exists investigations_select_visible on public.investigations;
create policy investigations_select_visible
on public.investigations
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'investigations.read')
);

drop policy if exists investigations_insert_owned on public.investigations;
create policy investigations_insert_owned
on public.investigations
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and updated_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'investigations.create')
);

drop policy if exists investigations_update_managed on public.investigations;
create policy investigations_update_managed
on public.investigations
for update
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and (
    public.has_capability(auth.uid(), tenant_id, 'investigations.update')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.archive')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.restore')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.close')
  )
)
with check (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and updated_by = auth.uid()
  and (
    public.has_capability(auth.uid(), tenant_id, 'investigations.update')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.archive')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.restore')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.close')
  )
);

drop policy if exists investigation_revisions_select_visible on public.investigation_revisions;
create policy investigation_revisions_select_visible
on public.investigation_revisions
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'investigations.read')
);

drop policy if exists investigation_revisions_insert_authorized on public.investigation_revisions;
create policy investigation_revisions_insert_authorized
on public.investigation_revisions
for insert
to authenticated
with check (
  changed_by = auth.uid()
  and public.is_active_tenant_member(auth.uid(), tenant_id)
  and exists (
    select 1
    from public.investigations as investigation
    where investigation.id = investigation_revisions.investigation_id
      and investigation.tenant_id = investigation_revisions.tenant_id
  )
  and (
    public.has_capability(auth.uid(), tenant_id, 'investigations.create')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.update')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.archive')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.restore')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.close')
  )
);

grant usage on schema public to authenticated, service_role;

grant select on
  public.investigations,
  public.investigation_revisions
to authenticated;

grant insert (
  tenant_id,
  owner_id,
  title,
  status,
  archived_at,
  state,
  schema_version,
  version,
  updated_by
) on public.investigations to authenticated;

grant update (
  title,
  status,
  archived_at,
  state,
  version,
  updated_by
) on public.investigations to authenticated;

grant insert (
  investigation_id,
  tenant_id,
  version,
  state,
  reason,
  changed_by
) on public.investigation_revisions to authenticated;

grant all on
  public.investigations,
  public.investigation_revisions
to service_role;

commit;
