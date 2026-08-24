begin;

/*
 * Legal retention is enforced in the database so service-role jobs cannot
 * accidentally shorten a deadline or delete payment evidence too early.
 * Seven years is the minimum; an operator may extend a row's deadline when
 * a longer legal period applies.
 */

alter table public.audit_logs
  add column if not exists retention_until timestamptz;

-- Historical audit rows are append-only after creation. The retention
-- deadline is a schema backfill, so suspend that trigger only for this
-- update and restore it before the migration continues.
alter table public.audit_logs disable trigger audit_logs_no_update;

update public.audit_logs
set retention_until = created_at + interval '7 years'
where retention_until is null
   or retention_until < created_at + interval '7 years';

alter table public.audit_logs enable trigger audit_logs_no_update;

alter table public.audit_logs
  alter column retention_until set default (now() + interval '7 years'),
  alter column retention_until set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_retention_min_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_retention_min_check
      check (retention_until >= created_at + interval '7 years');
  end if;
end;
$$;

create index if not exists audit_logs_retention_until_idx
  on public.audit_logs (retention_until);

comment on column public.audit_logs.retention_until is
  'Legal retention deadline. This value may be extended but never shortened below seven years.';

alter table public.billing_invoices
  add column if not exists retention_until timestamptz;

update public.billing_invoices
set retention_until = created_at + interval '7 years'
where retention_until is null
   or retention_until < created_at + interval '7 years';

alter table public.billing_invoices
  alter column retention_until set default (now() + interval '7 years'),
  alter column retention_until set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'billing_invoices_retention_min_check'
  ) then
    alter table public.billing_invoices
      add constraint billing_invoices_retention_min_check
      check (retention_until >= created_at + interval '7 years');
  end if;
end;
$$;

create index if not exists billing_invoices_retention_until_idx
  on public.billing_invoices (retention_until);

comment on column public.billing_invoices.retention_until is
  'Legal retention deadline for the invoice and its payment evidence. This value may be extended but never shortened.';

alter table public.billing_webhook_events
  add column if not exists retention_until timestamptz;

update public.billing_webhook_events
set retention_until = created_at + interval '7 years'
where retention_until is null
   or retention_until < created_at + interval '7 years';

alter table public.billing_webhook_events
  alter column retention_until set default (now() + interval '7 years'),
  alter column retention_until set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'billing_webhook_events_retention_min_check'
  ) then
    alter table public.billing_webhook_events
      add constraint billing_webhook_events_retention_min_check
      check (retention_until >= created_at + interval '7 years');
  end if;
end;
$$;

create index if not exists billing_webhook_events_retention_until_idx
  on public.billing_webhook_events (retention_until);

comment on column public.billing_webhook_events.retention_until is
  'Legal retention deadline for sanitized provider evidence. This value may be extended but never shortened.';

alter table public.access_grants
  add column if not exists retention_until timestamptz;

update public.access_grants
set retention_until = created_at + interval '7 years'
where retention_until is null
   or retention_until < created_at + interval '7 years';

alter table public.access_grants
  alter column retention_until set default (now() + interval '7 years'),
  alter column retention_until set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'access_grants_retention_min_check'
  ) then
    alter table public.access_grants
      add constraint access_grants_retention_min_check
      check (retention_until >= created_at + interval '7 years');
  end if;
end;
$$;

create index if not exists access_grants_payment_retention_idx
  on public.access_grants (retention_until)
  where provider_payment_id is not null;

comment on column public.access_grants.retention_until is
  'Legal retention deadline for the access grant and linked payment evidence. This value may be extended but never shortened.';

alter table public.vid_requests
  add column if not exists redacted_at timestamptz;

update public.vid_requests
set retention_until = created_at + interval '7 years'
where retention_until < created_at + interval '7 years';

alter table public.vid_requests
  alter column retention_until set default (now() + interval '7 years');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vid_requests_retention_min_check'
  ) then
    alter table public.vid_requests
      add constraint vid_requests_retention_min_check
      check (retention_until >= created_at + interval '7 years');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'vid_requests_redaction_deadline_check'
  ) then
    alter table public.vid_requests
      add constraint vid_requests_redaction_deadline_check
      check (redacted_at is null or redacted_at >= retention_until);
  end if;
end;
$$;

create index if not exists vid_requests_retention_pending_redaction_idx
  on public.vid_requests (retention_until)
  where redacted_at is null;

comment on column public.vid_requests.redacted_at is
  'Timestamp when provider references, reviewer identity, decision reason, and free-form metadata were redacted after the legal deadline.';

create table if not exists public.legal_retention_archives (
  id uuid primary key default gen_random_uuid(),
  source_table text not null
    check (
      source_table in (
        'audit_logs',
        'billing_invoices',
        'billing_webhook_events',
        'access_grants',
        'vid_requests'
      )
    ),
  source_id uuid not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  source_snapshot jsonb not null,
  retention_until timestamptz not null,
  archived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_table, source_id),
  check (archived_at >= retention_until)
);

create index if not exists legal_retention_archives_source_deadline_idx
  on public.legal_retention_archives (source_table, retention_until);

create index if not exists legal_retention_archives_tenant_archived_idx
  on public.legal_retention_archives (tenant_id, archived_at);

comment on table public.legal_retention_archives is
  'Immutable archive manifest for records whose legal retention deadline has elapsed. Source rows remain available to authorized retention and compliance processes.';

comment on column public.legal_retention_archives.retention_until is
  'Source-row legal retention deadline. Archive manifests are created only after this deadline.';

revoke all on table public.legal_retention_archives from public, anon, authenticated;
grant all on table public.legal_retention_archives to service_role;

alter table public.legal_retention_archives enable row level security;

create or replace function public.prevent_legal_retention_archive_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'legal retention archive manifests are append-only';
end;
$$;

revoke all on function public.prevent_legal_retention_archive_mutation() from public;

drop trigger if exists legal_retention_archives_no_update_delete on public.legal_retention_archives;
create trigger legal_retention_archives_no_update_delete
before update or delete on public.legal_retention_archives
for each row execute function public.prevent_legal_retention_archive_mutation();

create or replace function public.enforce_legal_retention_floor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.retention_until < new.created_at + interval '7 years' then
    new.retention_until := new.created_at + interval '7 years';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_legal_retention_floor() from public;

drop trigger if exists vid_requests_retention_floor on public.vid_requests;
create trigger vid_requests_retention_floor
before insert or update on public.vid_requests
for each row execute function public.enforce_legal_retention_floor();

create or replace function public.prevent_legal_retention_reduction()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.created_at <> old.created_at then
      raise exception using
        errcode = '42501',
        message = 'retained records cannot change created_at';
    end if;

    if new.retention_until < old.retention_until then
      raise exception using
        errcode = '42501',
        message = 'legal retention deadlines cannot be shortened';
    end if;

    if new.retention_until < new.created_at + interval '7 years' then
      raise exception using
        errcode = '42501',
        message = 'legal retention deadline is below the seven-year minimum';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_legal_retention_reduction() from public;

drop trigger if exists audit_logs_legal_retention on public.audit_logs;
create trigger audit_logs_legal_retention
before update on public.audit_logs
for each row execute function public.prevent_legal_retention_reduction();

drop trigger if exists billing_invoices_legal_retention on public.billing_invoices;
create trigger billing_invoices_legal_retention
before update on public.billing_invoices
for each row execute function public.prevent_legal_retention_reduction();

drop trigger if exists billing_webhook_events_legal_retention on public.billing_webhook_events;
create trigger billing_webhook_events_legal_retention
before update on public.billing_webhook_events
for each row execute function public.prevent_legal_retention_reduction();

drop trigger if exists vid_requests_legal_retention on public.vid_requests;
create trigger vid_requests_legal_retention
before update on public.vid_requests
for each row execute function public.prevent_legal_retention_reduction();

create or replace function public.prevent_payment_evidence_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.provider_payment_id is not null
       and new.provider_payment_id is distinct from old.provider_payment_id then
      raise exception using
        errcode = '42501',
        message = 'payment evidence identifiers are immutable';
    end if;

    if new.created_at <> old.created_at then
      raise exception using
        errcode = '42501',
        message = 'payment evidence cannot change created_at';
    end if;

    if new.retention_until < old.retention_until then
      raise exception using
        errcode = '42501',
        message = 'payment evidence retention deadlines cannot be shortened';
    end if;
  elsif tg_op = 'DELETE'
    and old.provider_payment_id is not null
    and old.retention_until > clock_timestamp() then
    raise exception using
      errcode = '42501',
      message = 'payment evidence cannot be deleted during legal retention';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.prevent_payment_evidence_mutation() from public;

drop trigger if exists access_grants_payment_evidence_protection on public.access_grants;
create trigger access_grants_payment_evidence_protection
before update or delete on public.access_grants
for each row execute function public.prevent_payment_evidence_mutation();

create or replace function public.prevent_vid_request_delete_during_retention()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.retention_until > clock_timestamp() then
    raise exception using
      errcode = '42501',
      message = 'vid requests cannot be deleted during legal retention';
  end if;

  return old;
end;
$$;

revoke all on function public.prevent_vid_request_delete_during_retention() from public;

drop trigger if exists vid_requests_no_delete_during_retention on public.vid_requests;
create trigger vid_requests_no_delete_during_retention
before delete on public.vid_requests
for each row execute function public.prevent_vid_request_delete_during_retention();

create or replace function public.prevent_redacted_vid_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.redacted_at is not null
     and (
       new.user_id is distinct from old.user_id
       or new.status is distinct from old.status
       or new.verification_method is distinct from old.verification_method
       or new.provider_reference is distinct from old.provider_reference
       or new.metadata is distinct from old.metadata
       or new.decision_reason is distinct from old.decision_reason
       or new.reviewer_user_id is distinct from old.reviewer_user_id
       or new.submitted_at is distinct from old.submitted_at
       or new.reviewed_at is distinct from old.reviewed_at
       or new.retention_until is distinct from old.retention_until
       or new.redacted_at is distinct from old.redacted_at
       or new.version is distinct from old.version
       or new.correlation_id is distinct from old.correlation_id
       or new.created_at is distinct from old.created_at
     ) then
    raise exception using
      errcode = '42501',
      message = 'redacted vid requests are immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_redacted_vid_mutation() from public;

drop trigger if exists vid_requests_redacted_immutable on public.vid_requests;
create trigger vid_requests_redacted_immutable
before update on public.vid_requests
for each row execute function public.prevent_redacted_vid_mutation();

commit;
