begin;

create table if not exists public.pending_registrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  company_name text,
  created_at timestamptz not null default now(),
  check (company_name is null or length(btrim(company_name)) > 0)
);

alter table public.pending_registrations enable row level security;

revoke all on table public.pending_registrations from public, anon, authenticated;
grant all on table public.pending_registrations to service_role;

create or replace function public.complete_pending_registration(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_pending public.pending_registrations%rowtype;
  v_profile_status text;
  v_primary_tenant_id uuid;
  v_email_confirmed_at timestamptz;
  v_owner_role_id uuid;
  v_platform_trial_policy public.trial_policies%rowtype;
  v_tenant_id uuid;
  v_workspace_id uuid;
  v_now timestamptz := clock_timestamp();
  v_slug text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception using errcode = '42501', message = 'registration_user_mismatch';
  end if;

  select auth_user.email_confirmed_at
  into v_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = p_user_id;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'email_not_confirmed';
  end if;

  select pending.*
  into v_pending
  from public.pending_registrations as pending
  where pending.user_id = p_user_id
  for update;

  if not found then
    select profile.primary_tenant_id, profile.status
    into v_primary_tenant_id, v_profile_status
    from public.profiles as profile
    where profile.id = p_user_id;

    if found then
      if v_profile_status in ('suspended', 'deleted') then
        raise exception using errcode = '42501', message = 'account_not_active';
      end if;

      return v_primary_tenant_id;
    end if;

    raise exception using errcode = 'P0001', message = 'pending_registration_not_found';
  end if;

  insert into public.profiles (id, display_name)
  values (p_user_id, v_pending.display_name)
  on conflict (id) do nothing;

  select profile.primary_tenant_id, profile.status
  into v_primary_tenant_id, v_profile_status
  from public.profiles as profile
  where profile.id = p_user_id
  for update;

  if v_profile_status in ('suspended', 'deleted') then
    raise exception using errcode = '42501', message = 'account_not_active';
  end if;

  if v_pending.company_name is null then
    delete from public.pending_registrations
    where user_id = p_user_id;

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
      p_user_id,
      'user',
      'auth.registration.profile_completed',
      'profile',
      p_user_id,
      jsonb_build_object('status', 'active', 'registration_type', 'invitation'),
      jsonb_build_object('email_confirmed_at', v_email_confirmed_at)
    );

    return null;
  end if;

  if v_primary_tenant_id is not null then
    delete from public.pending_registrations
    where user_id = p_user_id;

    return v_primary_tenant_id;
  end if;

  select role.id
  into v_owner_role_id
  from public.roles as role
  where role.key = 'owner'
    and role.is_system
    and role.tenant_id is null
  limit 1;

  if v_owner_role_id is null then
    raise exception using errcode = 'P0001', message = 'owner_role_not_configured';
  end if;

  select policy.*
  into v_platform_trial_policy
  from public.trial_policies as policy
  where policy.scope = 'platform'
    and policy.tenant_id is null
    and policy.enabled
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'platform_trial_policy_not_configured';
  end if;

  v_slug := regexp_replace(lower(btrim(v_pending.company_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(left(v_slug, 48), '-');

  if v_slug = '' then
    v_slug := 'tenant';
  end if;

  v_slug := v_slug || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.tenants (
    name,
    slug,
    status,
    created_by
  )
  values (
    btrim(v_pending.company_name),
    v_slug,
    'active',
    p_user_id
  )
  returning id into v_tenant_id;

  update public.profiles
  set primary_tenant_id = v_tenant_id
  where id = p_user_id;

  insert into public.memberships (
    tenant_id,
    user_id,
    role_id,
    status,
    accepted_at
  )
  values (
    v_tenant_id,
    p_user_id,
    v_owner_role_id,
    'active',
    v_now
  );

  insert into public.workspaces (
    tenant_id,
    name,
    slug,
    created_by
  )
  values (
    v_tenant_id,
    'General',
    'general',
    p_user_id
  )
  returning id into v_workspace_id;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role_id,
    status,
    accepted_at
  )
  values (
    v_workspace_id,
    p_user_id,
    v_owner_role_id,
    'active',
    v_now
  );

  insert into public.trial_policies (
    scope,
    tenant_id,
    enabled,
    duration_seconds,
    starts_on,
    max_sessions,
    allow_pdf,
    allow_checkout,
    updated_by
  )
  values (
    'tenant',
    v_tenant_id,
    v_platform_trial_policy.enabled,
    v_platform_trial_policy.duration_seconds,
    v_platform_trial_policy.starts_on,
    v_platform_trial_policy.max_sessions,
    v_platform_trial_policy.allow_pdf,
    v_platform_trial_policy.allow_checkout,
    null
  );

  insert into public.audit_logs (
    tenant_id,
    workspace_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values (
    v_tenant_id,
    v_workspace_id,
    p_user_id,
    'user',
    'auth.registration.bootstrap_completed',
    'tenant',
    v_tenant_id,
    jsonb_build_object(
      'tenant_id', v_tenant_id,
      'workspace_id', v_workspace_id,
      'status', 'active',
      'registration_type', 'personal'
    ),
    jsonb_build_object('email_confirmed_at', v_email_confirmed_at)
  );

  delete from public.pending_registrations
  where user_id = p_user_id;

  return v_tenant_id;
end;
$$;

revoke all on function public.complete_pending_registration(uuid) from public, anon;
grant execute on function public.complete_pending_registration(uuid) to authenticated, service_role;

commit;
