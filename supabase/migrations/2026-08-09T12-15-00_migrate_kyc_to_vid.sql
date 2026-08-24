begin;

/*
 * Forward migration from the legacy KYC vocabulary to VID.
 *
 * Historical audit rows are intentionally not rewritten. They are append-only
 * records and retain the terminology that was valid when they were created.
 */

alter table public.profiles
  rename column kyc_status to vid_status;

alter table public.profiles
  rename column kyc_verified_at to vid_verified_at;

alter table public.profiles
  rename constraint profiles_kyc_status_check to profiles_vid_status_check;

alter table public.profiles
  rename constraint profiles_check to profiles_vid_consistency_check;

comment on column public.profiles.vid_status is
  'Digital identity verification status. This is a security signal and not a commercial access gate.';

comment on column public.profiles.vid_verified_at is
  'Timestamp at which the digital identity verification was approved.';

alter table public.kyc_requests
  rename to vid_requests;

alter table public.vid_requests
  rename constraint kyc_requests_check to vid_requests_status_review_check;

alter table public.vid_requests
  rename constraint kyc_requests_correlation_id_check to vid_requests_correlation_id_check;

alter table public.vid_requests
  rename constraint kyc_requests_decision_reason_check to vid_requests_decision_reason_check;

alter table public.vid_requests
  rename constraint kyc_requests_metadata_check to vid_requests_metadata_check;

alter table public.vid_requests
  rename constraint kyc_requests_pkey to vid_requests_pkey;

alter table public.vid_requests
  rename constraint kyc_requests_provider_reference_check to vid_requests_provider_reference_check;

alter table public.vid_requests
  rename constraint kyc_requests_reviewer_user_id_fkey to vid_requests_reviewer_user_id_fkey;

alter table public.vid_requests
  rename constraint kyc_requests_status_check to vid_requests_status_check;

alter table public.vid_requests
  rename constraint kyc_requests_user_id_fkey to vid_requests_user_id_fkey;

alter table public.vid_requests
  rename constraint kyc_requests_verification_method_check to vid_requests_verification_method_check;

alter table public.vid_requests
  rename constraint kyc_requests_version_check to vid_requests_version_check;

alter index if exists public.kyc_requests_status_submitted_idx
  rename to vid_requests_status_submitted_idx;

alter index if exists public.kyc_requests_user_created_idx
  rename to vid_requests_user_created_idx;

alter index if exists public.kyc_requests_one_open_per_user_idx
  rename to vid_requests_one_open_per_user_idx;

alter trigger kyc_requests_set_updated_at on public.vid_requests
  rename to vid_requests_set_updated_at;

comment on table public.vid_requests is
  'VID workflow metadata and decisions only. Raw identity documents are never stored here.';

comment on column public.vid_requests.retention_until is
  'Minimum retention deadline for the digital identity result and metadata. Legal requirements may extend it.';

/*
 * Copy every existing assignment before retiring the old capability keys.
 * The old rows can then be removed without losing platform, tenant-role, or
 * member override assignments.
 */
insert into public.capabilities (
  key,
  description,
  resource,
  action,
  is_active,
  created_at
)
select
  case old_capability.key
    when 'platform.kyc.read' then 'platform.vid.read'
    when 'platform.kyc.review' then 'platform.vid.review'
  end,
  case old_capability.key
    when 'platform.kyc.read' then 'Consultar solicitudes VID pendientes desde la plataforma.'
    when 'platform.kyc.review' then 'Aprobar o rechazar verificaciones VID.'
  end,
  case old_capability.key
    when 'platform.kyc.read' then 'platform.vid'
    when 'platform.kyc.review' then 'platform.vid'
  end,
  old_capability.action,
  old_capability.is_active,
  old_capability.created_at
from public.capabilities as old_capability
where old_capability.key in ('platform.kyc.read', 'platform.kyc.review')
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = excluded.is_active;

insert into public.platform_role_capabilities (role_id, capability_key)
select
  assignment.role_id,
  case assignment.capability_key
    when 'platform.kyc.read' then 'platform.vid.read'
    when 'platform.kyc.review' then 'platform.vid.review'
  end
from public.platform_role_capabilities as assignment
where assignment.capability_key in ('platform.kyc.read', 'platform.kyc.review')
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select
  assignment.role_id,
  case assignment.capability_key
    when 'platform.kyc.read' then 'platform.vid.read'
    when 'platform.kyc.review' then 'platform.vid.review'
  end
from public.role_capabilities as assignment
where assignment.capability_key in ('platform.kyc.read', 'platform.kyc.review')
on conflict do nothing;

insert into public.member_capability_overrides (
  membership_id,
  capability_key,
  effect,
  reason,
  created_by,
  created_at
)
select
  override_row.membership_id,
  case override_row.capability_key
    when 'platform.kyc.read' then 'platform.vid.read'
    when 'platform.kyc.review' then 'platform.vid.review'
  end,
  override_row.effect,
  override_row.reason,
  override_row.created_by,
  override_row.created_at
from public.member_capability_overrides as override_row
where override_row.capability_key in ('platform.kyc.read', 'platform.kyc.review')
on conflict do nothing;

delete from public.capabilities
where key in ('platform.kyc.read', 'platform.kyc.review');

drop policy if exists profiles_select_platform_kyc on public.profiles;

create policy profiles_select_platform_vid
on public.profiles
for select
to authenticated
using (
  public.has_platform_capability(auth.uid(), 'platform.vid.read')
);

alter table public.vid_requests enable row level security;

drop policy if exists kyc_requests_select_visible on public.vid_requests;

create policy vid_requests_select_visible
on public.vid_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_platform_capability(auth.uid(), 'platform.vid.read')
);

drop policy if exists kyc_requests_insert_own on public.vid_requests;

create policy vid_requests_insert_own
on public.vid_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reviewer_user_id is null
  and reviewed_at is null
);

revoke all on table public.vid_requests from public, anon;
grant select, insert on table public.vid_requests to authenticated;
grant all on table public.vid_requests to service_role;

/*
 * The existing VID request RPCs are generated from the applied KYC functions
 * so their validation, optimistic locking, retention, and audit behavior stay
 * identical while all persisted and emitted names move to VID.
 */
alter function public.submit_kyc_request(text, text, text)
  rename to submit_vid_request;

alter function public.review_kyc_request(uuid, integer, text, text, text)
  rename to review_vid_request;

do $migration$
declare
  v_definition text;
begin
  for v_definition in
    select pg_get_functiondef(p.oid)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in ('submit_vid_request', 'review_vid_request')
  loop
    v_definition := replace(v_definition, 'public.kyc_requests', 'public.vid_requests');
    v_definition := replace(v_definition, 'kyc_status', 'vid_status');
    v_definition := replace(v_definition, 'kyc_verified_at', 'vid_verified_at');
    v_definition := replace(v_definition, 'platform.kyc.', 'platform.vid.');
    v_definition := replace(v_definition, 'kyc_', 'vid_');
    execute v_definition;
  end loop;
end;
$migration$;

revoke all on function public.submit_vid_request(text, text, text) from public, anon;
revoke all on function public.review_vid_request(uuid, integer, text, text, text) from public, anon;
grant execute on function public.submit_vid_request(text, text, text) to authenticated, service_role;
grant execute on function public.review_vid_request(uuid, integer, text, text, text) to authenticated, service_role;

/*
 * Commercial access must not depend on VID. These replacements preserve the
 * existing transaction and idempotency logic while requiring a permanent user
 * with a confirmed email where the prior KYC check was enforced.
 */
do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname = 'consume_access_grant';

  if v_definition is null then
    raise exception 'Expected function public.consume_access_grant(uuid, uuid) was not found';
  end if;

  v_definition := replace(
    v_definition,
    'profile.kyc_status = ''verified''',
    'profile.status = ''active'' and exists (select 1 from auth.users as auth_user where auth_user.id = p_user_id and auth_user.email_confirmed_at is not null)'
  );
  execute v_definition;
end;
$migration$;

do $migration$
declare
  v_definition text;
begin
  for v_definition in
    select pg_get_functiondef(p.oid)
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'start_trial',
        'create_pending_one_time_grant',
        'attach_one_time_checkout_reference'
      )
  loop
    v_definition := replace(
      v_definition,
      'profile.kyc_status = ''verified''',
      'exists (select 1 from auth.users as auth_user where auth_user.id = v_user_id and auth_user.email_confirmed_at is not null)'
    );
    v_definition := replace(v_definition, 'message = ''kyc_required''', 'message = ''email_confirmation_required''');
    execute v_definition;
  end loop;
end;
$migration$;

commit;
