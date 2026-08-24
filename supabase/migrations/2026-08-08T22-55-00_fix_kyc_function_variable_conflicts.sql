begin;

create or replace function public.submit_kyc_request(
  p_verification_method text default 'manual',
  p_provider_reference text default null,
  p_correlation_id text default null
)
returns table(
  id uuid,
  user_id uuid,
  status text,
  verification_method text,
  provider_reference text,
  metadata jsonb,
  decision_reason text,
  reviewer_user_id uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  retention_until timestamptz,
  version integer,
  correlation_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_request public.kyc_requests%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'kyc_authentication_required';
  end if;

  if p_verification_method is null
     or p_verification_method not in ('manual', 'provider') then
    raise exception using errcode = '22023', message = 'kyc_verification_method_invalid';
  end if;

  if p_provider_reference is not null
     and char_length(btrim(p_provider_reference)) not between 1 and 255 then
    raise exception using errcode = '22023', message = 'kyc_provider_reference_invalid';
  end if;

  select *
  into v_profile
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if not found or v_profile.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'kyc_profile_unavailable';
  end if;

  if v_profile.kyc_status = 'verified' then
    raise exception using errcode = 'P0001', message = 'kyc_already_verified';
  end if;

  if exists (
    select 1
    from public.kyc_requests as existing_request
    where existing_request.user_id = v_user_id
      and existing_request.status in ('pending', 'under_review')
  ) then
    raise exception using errcode = '23505', message = 'kyc_submission_pending';
  end if;

  insert into public.kyc_requests (
    user_id,
    status,
    verification_method,
    provider_reference,
    metadata,
    submitted_at,
    retention_until,
    correlation_id
  )
  values (
    v_user_id,
    'pending',
    p_verification_method,
    nullif(btrim(p_provider_reference), ''),
    jsonb_build_object('source', p_verification_method),
    clock_timestamp(),
    clock_timestamp() + interval '5 years',
    nullif(btrim(p_correlation_id), '')
  )
  returning * into v_request;

  update public.profiles as profile
  set
    kyc_status = 'pending',
    kyc_verified_at = null
  where profile.id = v_user_id;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values (
    null,
    v_user_id,
    'user',
    'kyc.request.submitted',
    'kyc_request',
    v_request.id,
    jsonb_build_object(
      'status', v_request.status,
      'verification_method', v_request.verification_method,
      'retention_until', v_request.retention_until,
      'version', v_request.version
    ),
    jsonb_build_object(
      'scope', 'user',
      'correlation_id', p_correlation_id
    )
  );

  return query
  select
    request.id,
    request.user_id,
    request.status,
    request.verification_method,
    request.provider_reference,
    request.metadata,
    request.decision_reason,
    request.reviewer_user_id,
    request.submitted_at,
    request.reviewed_at,
    request.retention_until,
    request.version,
    request.correlation_id,
    request.created_at,
    request.updated_at
  from public.kyc_requests as request
  where request.id = v_request.id;
end;
$$;

create or replace function public.review_kyc_request(
  p_request_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null,
  p_correlation_id text default null
)
returns table(
  id uuid,
  user_id uuid,
  status text,
  verification_method text,
  provider_reference text,
  metadata jsonb,
  decision_reason text,
  reviewer_user_id uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  retention_until timestamptz,
  version integer,
  correlation_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_request public.kyc_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_before_status text;
  v_before_version integer;
  v_action_name text;
  v_now timestamptz := clock_timestamp();
begin
  if v_reviewer_id is null then
    raise exception using errcode = '42501', message = 'kyc_authentication_required';
  end if;

  if not public.has_platform_capability(v_reviewer_id, 'platform.kyc.review') then
    raise exception using errcode = '42501', message = 'kyc_review_forbidden';
  end if;

  if p_request_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'kyc_review_input_invalid';
  end if;

  if p_action is null
     or p_action not in ('start_review', 'approve', 'reject', 'request_resubmission', 'reopen') then
    raise exception using errcode = '22023', message = 'kyc_review_action_invalid';
  end if;

  if p_action in ('reject', 'request_resubmission')
     and (p_reason is null or char_length(btrim(p_reason)) = 0) then
    raise exception using errcode = '22023', message = 'kyc_review_reason_required';
  end if;

  if p_reason is not null and char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'kyc_review_reason_invalid';
  end if;

  select *
  into v_request
  from public.kyc_requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'kyc_request_not_found';
  end if;

  if v_request.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'kyc_version_conflict';
  end if;

  select *
  into v_profile
  from public.profiles as profile
  where profile.id = v_request.user_id
  for update;

  if not found or v_profile.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'kyc_profile_unavailable';
  end if;

  v_before_status := v_request.status;
  v_before_version := v_request.version;

  if p_action = 'start_review' then
    if v_request.status <> 'pending' then
      raise exception using errcode = 'P0001', message = 'kyc_invalid_transition';
    end if;

    update public.kyc_requests as kyc_request
    set
      status = 'under_review',
      reviewer_user_id = v_reviewer_id,
      version = kyc_request.version + 1,
      updated_at = v_now
    where kyc_request.id = v_request.id;

    v_action_name := 'platform.kyc.review_started';
  elsif p_action = 'approve' then
    if v_request.status not in ('pending', 'under_review') then
      raise exception using errcode = 'P0001', message = 'kyc_invalid_transition';
    end if;

    update public.kyc_requests as kyc_request
    set
      status = 'approved',
      decision_reason = nullif(btrim(p_reason), ''),
      reviewer_user_id = v_reviewer_id,
      reviewed_at = v_now,
      version = kyc_request.version + 1,
      updated_at = v_now
    where kyc_request.id = v_request.id;

    update public.profiles as profile
    set
      kyc_status = 'verified',
      kyc_verified_at = v_now
    where profile.id = v_request.user_id;

    v_action_name := 'platform.kyc.approved';
  elsif p_action = 'reject' then
    if v_request.status not in ('pending', 'under_review') then
      raise exception using errcode = 'P0001', message = 'kyc_invalid_transition';
    end if;

    update public.kyc_requests as kyc_request
    set
      status = 'rejected',
      decision_reason = btrim(p_reason),
      reviewer_user_id = v_reviewer_id,
      reviewed_at = v_now,
      version = kyc_request.version + 1,
      updated_at = v_now
    where kyc_request.id = v_request.id;

    update public.profiles as profile
    set
      kyc_status = 'rejected',
      kyc_verified_at = null
    where profile.id = v_request.user_id;

    v_action_name := 'platform.kyc.rejected';
  elsif p_action = 'request_resubmission' then
    if v_request.status not in ('pending', 'under_review') then
      raise exception using errcode = 'P0001', message = 'kyc_invalid_transition';
    end if;

    update public.kyc_requests as kyc_request
    set
      status = 'needs_resubmission',
      decision_reason = btrim(p_reason),
      reviewer_user_id = v_reviewer_id,
      reviewed_at = v_now,
      version = kyc_request.version + 1,
      updated_at = v_now
    where kyc_request.id = v_request.id;

    update public.profiles as profile
    set
      kyc_status = 'pending',
      kyc_verified_at = null
    where profile.id = v_request.user_id;

    v_action_name := 'platform.kyc.resubmission_requested';
  else
    if v_request.status not in ('rejected', 'needs_resubmission') then
      raise exception using errcode = 'P0001', message = 'kyc_invalid_transition';
    end if;

    if exists (
      select 1
      from public.kyc_requests as open_request
      where open_request.user_id = v_request.user_id
        and open_request.id <> v_request.id
        and open_request.status in ('pending', 'under_review')
    ) then
      raise exception using errcode = '23505', message = 'kyc_submission_pending';
    end if;

    update public.kyc_requests as kyc_request
    set
      status = 'pending',
      decision_reason = null,
      reviewer_user_id = null,
      reviewed_at = null,
      version = kyc_request.version + 1,
      updated_at = v_now
    where kyc_request.id = v_request.id;

    update public.profiles as profile
    set
      kyc_status = 'pending',
      kyc_verified_at = null
    where profile.id = v_request.user_id;

    v_action_name := 'platform.kyc.reopened';
  end if;

  select *
  into v_request
  from public.kyc_requests as request
  where request.id = p_request_id;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  )
  values (
    null,
    v_reviewer_id,
    'admin',
    v_action_name,
    'kyc_request',
    v_request.id,
    jsonb_build_object(
      'status', v_before_status,
      'version', v_before_version
    ),
    jsonb_build_object(
      'status', v_request.status,
      'version', v_request.version,
      'decision_reason', v_request.decision_reason
    ),
    jsonb_build_object(
      'scope', 'platform',
      'correlation_id', p_correlation_id
    )
  );

  return query
  select
    request.id,
    request.user_id,
    request.status,
    request.verification_method,
    request.provider_reference,
    request.metadata,
    request.decision_reason,
    request.reviewer_user_id,
    request.submitted_at,
    request.reviewed_at,
    request.retention_until,
    request.version,
    request.correlation_id,
    request.created_at,
    request.updated_at
  from public.kyc_requests as request
  where request.id = v_request.id;
end;
$$;

revoke all on function public.submit_kyc_request(text, text, text) from public, anon;
revoke all on function public.review_kyc_request(uuid, integer, text, text, text) from public, anon;
grant execute on function public.submit_kyc_request(text, text, text) to authenticated, service_role;
grant execute on function public.review_kyc_request(uuid, integer, text, text, text) to authenticated, service_role;

commit;
