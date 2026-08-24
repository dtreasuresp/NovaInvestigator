begin;

create table if not exists public.platform_registration_settings (
  id boolean primary key default true check (id),
  pending_retention_days integer not null default 30
    check (pending_retention_days between 1 and 3650),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_registration_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists platform_registration_settings_set_updated_at
on public.platform_registration_settings;
create trigger platform_registration_settings_set_updated_at
before update on public.platform_registration_settings
for each row execute function public.set_updated_at();

create index if not exists pending_registrations_created_at_idx
on public.pending_registrations (created_at);

insert into public.capabilities (key, description, resource, action)
values (
  'platform.auth.registrations.manage',
  'Configurar la retención y limpiar registros de autenticación pendientes.',
  'platform.auth.registrations',
  'manage'
)
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.platform_role_capabilities (role_id, capability_key)
select platform_role.id, 'platform.auth.registrations.manage'
from public.platform_roles as platform_role
where platform_role.key = 'super_admin'
on conflict do nothing;

create or replace function public.get_pending_registration_cleanup_status()
returns table(
  retention_days integer,
  pending_count bigint,
  eligible_count bigint,
  oldest_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_retention_days integer;
begin
  if not public.has_platform_capability(auth.uid(), 'platform.auth.registrations.manage') then
    raise exception using errcode = '42501', message = 'platform_registration_cleanup_forbidden';
  end if;

  select settings.pending_retention_days
  into v_retention_days
  from public.platform_registration_settings as settings
  where settings.id = true;

  if v_retention_days is null then
    raise exception using errcode = 'P0001', message = 'platform_registration_settings_not_configured';
  end if;

  return query
  select
    v_retention_days,
    count(*)::bigint,
    count(*) filter (
      where pending.created_at < clock_timestamp() - make_interval(days => v_retention_days)
    )::bigint,
    min(pending.created_at)
  from public.pending_registrations as pending;
end;
$$;

create or replace function public.update_pending_registration_retention(
  p_retention_days integer
)
returns table(
  retention_days integer,
  pending_count bigint,
  eligible_count bigint,
  oldest_created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_platform_capability(auth.uid(), 'platform.auth.registrations.manage') then
    raise exception using errcode = '42501', message = 'platform_registration_cleanup_forbidden';
  end if;

  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception using errcode = '22023', message = 'platform_registration_retention_out_of_range';
  end if;

  update public.platform_registration_settings
  set
    pending_retention_days = p_retention_days,
    updated_by = auth.uid()
  where id = true;

  if not found then
    raise exception using errcode = 'P0001', message = 'platform_registration_settings_not_configured';
  end if;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    after_data,
    metadata
  )
  values (
    null,
    auth.uid(),
    'admin',
    'platform.auth.pending_registrations.retention_updated',
    'platform_registration_settings',
    jsonb_build_object('pending_retention_days', p_retention_days),
    jsonb_build_object('scope', 'global')
  );

  return query
  select *
  from public.get_pending_registration_cleanup_status();
end;
$$;

create or replace function public.cleanup_pending_registrations()
returns table(
  deleted_count bigint,
  retention_days integer,
  cutoff_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_retention_days integer;
  v_cutoff_at timestamptz;
  v_deleted_count bigint;
begin
  if not public.has_platform_capability(auth.uid(), 'platform.auth.registrations.manage') then
    raise exception using errcode = '42501', message = 'platform_registration_cleanup_forbidden';
  end if;

  select settings.pending_retention_days
  into v_retention_days
  from public.platform_registration_settings as settings
  where settings.id = true;

  if v_retention_days is null then
    raise exception using errcode = 'P0001', message = 'platform_registration_settings_not_configured';
  end if;

  v_cutoff_at := clock_timestamp() - make_interval(days => v_retention_days);

  with deleted as (
    delete from public.pending_registrations as pending
    where pending.created_at < v_cutoff_at
    returning pending.user_id
  )
  select count(*)::bigint
  into v_deleted_count
  from deleted;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    after_data,
    metadata
  )
  values (
    null,
    auth.uid(),
    'admin',
    'platform.auth.pending_registrations.cleaned',
    'pending_registrations',
    jsonb_build_object(
      'deleted_count', v_deleted_count,
      'retention_days', v_retention_days,
      'cutoff_at', v_cutoff_at
    ),
    jsonb_build_object('scope', 'global')
  );

  return query
  select v_deleted_count, v_retention_days, v_cutoff_at;
end;
$$;

revoke all on table public.platform_registration_settings from public, anon, authenticated;
grant all on table public.platform_registration_settings to service_role;

alter table public.platform_registration_settings enable row level security;

revoke all on function public.get_pending_registration_cleanup_status() from public, anon;
revoke all on function public.update_pending_registration_retention(integer) from public, anon;
revoke all on function public.cleanup_pending_registrations() from public, anon;

grant execute on function public.get_pending_registration_cleanup_status() to authenticated, service_role;
grant execute on function public.update_pending_registration_retention(integer) to authenticated, service_role;
grant execute on function public.cleanup_pending_registrations() to authenticated, service_role;

commit;
