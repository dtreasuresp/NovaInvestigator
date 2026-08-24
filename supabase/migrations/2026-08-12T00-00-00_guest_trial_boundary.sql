begin;

-- NovaStore guest trials are deliberately separate from Supabase Auth. A
-- guest session never creates auth.users, a tenant, or a membership.
alter table public.trial_policies
  add column if not exists allow_guest boolean not null default false;

create table if not exists public.platform_modules (
  module_key text primary key
    check (module_key ~ '^[a-z][a-z0-9._-]{1,99}$'),
  name text not null,
  description text,
  route_prefix text not null
    check (route_prefix like '/%'),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_policy_entitlements (
  policy_id uuid not null references public.trial_policies(id) on delete cascade,
  entitlement_key text not null
    check (entitlement_key ~ '^(modules|actions|limits)\.[a-z0-9._-]+$'),
  limit_value integer
    check (limit_value is null or limit_value >= 0),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (policy_id, entitlement_key)
);

create table if not exists public.guest_trial_eligibilities (
  eligibility_key_hash text primary key
    check (eligibility_key_hash ~ '^[a-f0-9]{64}$'),
  policy_id uuid references public.trial_policies(id) on delete set null,
  session_count integer not null default 0 check (session_count >= 0),
  first_started_at timestamptz,
  last_started_at timestamptz,
  claimed_at timestamptz,
  claimed_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_trial_sessions (
  id uuid primary key default gen_random_uuid(),
  eligibility_key_hash text not null
    references public.guest_trial_eligibilities(eligibility_key_hash) on delete cascade,
  policy_id uuid not null references public.trial_policies(id) on delete restrict,
  policy_version timestamptz not null,
  claim_nonce_hash text not null unique
    check (claim_nonce_hash ~ '^[a-f0-9]{64}$'),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  claimed_at timestamptz,
  claimed_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'ended', 'expired', 'claimed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > started_at),
  check (
    (status = 'active' and ended_at is null and claimed_at is null)
    or (status = 'ended' and ended_at is not null)
    or (status = 'expired' and expires_at <= updated_at)
    or (status = 'claimed' and claimed_at is not null and claimed_user_id is not null)
  )
);

create table if not exists public.access_grant_entitlements (
  grant_id uuid not null references public.access_grants(id) on delete cascade,
  entitlement_key text not null
    check (entitlement_key ~ '^(modules|actions|limits)\.[a-z0-9._-]+$'),
  limit_value integer
    check (limit_value is null or limit_value >= 0),
  is_enabled boolean not null default true,
  source text not null default 'policy'
    check (source in ('policy', 'trial_policy', 'plan', 'manual')),
  created_at timestamptz not null default now(),
  primary key (grant_id, entitlement_key)
);

create index if not exists guest_trial_eligibilities_policy_idx
  on public.guest_trial_eligibilities (policy_id, updated_at desc);

create index if not exists guest_trial_sessions_eligibility_status_idx
  on public.guest_trial_sessions (eligibility_key_hash, status, expires_at);

create index if not exists guest_trial_sessions_expires_idx
  on public.guest_trial_sessions (expires_at)
  where status = 'active';

create index if not exists access_grant_entitlements_key_idx
  on public.access_grant_entitlements (entitlement_key, grant_id);

drop trigger if exists platform_modules_set_updated_at on public.platform_modules;
create trigger platform_modules_set_updated_at
before update on public.platform_modules
for each row execute function public.set_updated_at();

drop trigger if exists trial_policy_entitlements_set_updated_at on public.trial_policy_entitlements;
create trigger trial_policy_entitlements_set_updated_at
before update on public.trial_policy_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists guest_trial_eligibilities_set_updated_at on public.guest_trial_eligibilities;
create trigger guest_trial_eligibilities_set_updated_at
before update on public.guest_trial_eligibilities
for each row execute function public.set_updated_at();

drop trigger if exists guest_trial_sessions_set_updated_at on public.guest_trial_sessions;
create trigger guest_trial_sessions_set_updated_at
before update on public.guest_trial_sessions
for each row execute function public.set_updated_at();

create or replace function public.validate_trial_policy_entitlement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_namespace text;
  v_key text;
begin
  v_namespace := split_part(new.entitlement_key, '.', 1);
  v_key := substring(new.entitlement_key from position('.' in new.entitlement_key) + 1);

  if v_namespace = 'modules' then
    if not exists (
      select 1
      from public.platform_modules as module_row
      where module_row.module_key = v_key
        and module_row.is_active
    ) then
      raise exception using
        errcode = '23514',
        message = 'trial_module_not_configured';
    end if;
  elsif v_namespace = 'actions' then
    if not exists (
      select 1
      from public.capabilities as capability
      where capability.key = v_key
        and capability.is_active
    ) then
      raise exception using
        errcode = '23514',
        message = 'trial_action_not_configured';
    end if;
  elsif v_namespace = 'limits' then
    if new.limit_value is null then
      raise exception using
        errcode = '23514',
        message = 'trial_limit_value_required';
    end if;
  else
    raise exception using
      errcode = '23514',
      message = 'trial_entitlement_namespace_invalid';
  end if;

  return new;
end;
$$;

drop trigger if exists trial_policy_entitlements_validate on public.trial_policy_entitlements;
create trigger trial_policy_entitlements_validate
before insert or update on public.trial_policy_entitlements
for each row execute function public.validate_trial_policy_entitlement();

create or replace function public.get_trial_policy_entitlements_json(
  p_policy_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', entitlement.entitlement_key,
        'limitValue', entitlement.limit_value,
        'isEnabled', entitlement.is_enabled
      )
      order by entitlement.entitlement_key
    ),
    '[]'::jsonb
  )
  from public.trial_policy_entitlements as entitlement
  where entitlement.policy_id = p_policy_id;
$$;

create or replace function public.start_guest_trial(
  p_eligibility_key_hash text,
  p_session_id uuid,
  p_claim_nonce_hash text
)
returns table (
  session_id uuid,
  policy_id uuid,
  policy_version timestamptz,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  allow_pdf boolean,
  allow_checkout boolean,
  entitlements jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_policy public.trial_policies%rowtype;
  v_eligibility public.guest_trial_eligibilities%rowtype;
  v_session public.guest_trial_sessions%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_eligibility_key_hash is null
     or p_eligibility_key_hash !~ '^[a-f0-9]{64}$'
     or p_session_id is null
     or p_claim_nonce_hash is null
     or p_claim_nonce_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'guest_trial_request_invalid';
  end if;

  select policy.*
  into v_policy
  from public.trial_policies as policy
  where policy.scope = 'platform'
    and policy.tenant_id is null
    and policy.enabled
    and policy.allow_guest
  order by policy.updated_at desc
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'guest_trial_not_configured';
  end if;

  insert into public.guest_trial_eligibilities (
    eligibility_key_hash,
    policy_id
  )
  values (
    p_eligibility_key_hash,
    v_policy.id
  )
  on conflict (eligibility_key_hash)
  do update
  set updated_at = v_now
  returning * into v_eligibility;

  if v_eligibility.claimed_at is not null
     or v_eligibility.session_count >= v_policy.max_sessions then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
  end if;

  insert into public.guest_trial_sessions (
    id,
    eligibility_key_hash,
    policy_id,
    policy_version,
    claim_nonce_hash,
    started_at,
    expires_at,
    status
  )
  values (
    p_session_id,
    p_eligibility_key_hash,
    v_policy.id,
    v_policy.updated_at,
    p_claim_nonce_hash,
    v_now,
    v_now + make_interval(secs => v_policy.duration_seconds::double precision),
    'active'
  )
  returning * into v_session;

  update public.guest_trial_eligibilities
  set
    policy_id = coalesce(policy_id, v_policy.id),
    session_count = session_count + 1,
    first_started_at = coalesce(first_started_at, v_now),
    last_started_at = v_now,
    updated_at = v_now
  where eligibility_key_hash = p_eligibility_key_hash;

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
    null,
    'system',
    'billing.guest_trial.started',
    'guest_trial_session',
    v_session.id,
    jsonb_build_object(
      'policy_id', v_policy.id,
      'policy_version', v_policy.updated_at,
      'starts_at', v_session.started_at,
      'expires_at', v_session.expires_at,
      'session_count', v_eligibility.session_count + 1
    ),
    jsonb_build_object('source', 'guest')
  );

  return query
  select
    v_session.id,
    v_policy.id,
    v_policy.updated_at,
    v_session.status,
    v_session.started_at,
    v_session.expires_at,
    v_policy.allow_pdf,
    false,
    public.get_trial_policy_entitlements_json(v_policy.id);
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
end;
$$;

create or replace function public.get_guest_trial_session(
  p_session_id uuid,
  p_claim_nonce_hash text
)
returns table (
  session_id uuid,
  policy_id uuid,
  policy_version timestamptz,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  claimed_at timestamptz,
  allow_pdf boolean,
  allow_checkout boolean,
  entitlements jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.guest_trial_sessions%rowtype;
  v_policy public.trial_policies%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select session.*
  into v_session
  from public.guest_trial_sessions as session
  where session.id = p_session_id
    and session.claim_nonce_hash = p_claim_nonce_hash
  for update;

  if not found then
    return;
  end if;

  if v_session.status = 'active' and v_session.expires_at <= v_now then
    update public.guest_trial_sessions
    set
      status = 'expired',
      updated_at = v_now
    where id = v_session.id;

    v_session.status := 'expired';
    v_session.updated_at := v_now;
  end if;

  select policy.*
  into v_policy
  from public.trial_policies as policy
  where policy.id = v_session.policy_id;

  return query
  select
    v_session.id,
    v_session.policy_id,
    v_session.policy_version,
    v_session.status,
    v_session.started_at,
    v_session.expires_at,
    v_session.ended_at,
    v_session.claimed_at,
    coalesce(v_policy.allow_pdf, false),
    false,
    public.get_trial_policy_entitlements_json(v_session.policy_id);
end;
$$;

create or replace function public.end_guest_trial(
  p_session_id uuid,
  p_claim_nonce_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated integer;
begin
  update public.guest_trial_sessions
  set
    status = case when status = 'active' then 'ended' else status end,
    ended_at = case when status = 'active' then clock_timestamp() else ended_at end,
    updated_at = clock_timestamp()
  where id = p_session_id
    and claim_nonce_hash = p_claim_nonce_hash
    and status in ('active', 'ended', 'expired');

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.claim_guest_trial(
  p_session_id uuid,
  p_claim_nonce_hash text
)
returns table (
  grant_id uuid,
  tenant_id uuid,
  user_id uuid,
  policy_id uuid,
  starts_at timestamptz,
  expires_at timestamptz,
  status text,
  entitlements jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_confirmed_at timestamptz;
  v_session public.guest_trial_sessions%rowtype;
  v_policy public.trial_policies%rowtype;
  v_grant public.access_grants%rowtype;
  v_tenant_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select auth_user.email_confirmed_at
  into v_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'email_not_confirmed';
  end if;

  select session.*
  into v_session
  from public.guest_trial_sessions as session
  where session.id = p_session_id
    and session.claim_nonce_hash = p_claim_nonce_hash
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
  end if;

  if v_session.status = 'claimed' then
    if v_session.claimed_user_id <> v_user_id then
      raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
    end if;

    select grant_row.*
    into v_grant
    from public.access_grants as grant_row
    where grant_row.tenant_id = (
      select membership.tenant_id
      from public.memberships as membership
      where membership.user_id = v_user_id
        and membership.status = 'active'
      order by membership.created_at
      limit 1
    )
      and grant_row.user_id = v_user_id
      and grant_row.mode = 'trial'
    order by grant_row.created_at desc
    limit 1;

    if not found then
      raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
    end if;

    return query
    select
      v_grant.id,
      v_grant.tenant_id,
      v_grant.user_id,
      v_grant.policy_id,
      v_grant.starts_at,
      v_grant.expires_at,
      v_grant.status,
      public.get_trial_policy_entitlements_json(v_grant.policy_id);
    return;
  end if;

  if v_session.status <> 'active' or v_session.expires_at <= v_now then
    update public.guest_trial_sessions
    set
      status = case when status = 'active' then 'expired' else status end,
      updated_at = v_now
    where id = v_session.id;

    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
  end if;

  select profile.primary_tenant_id
  into v_tenant_id
  from public.profiles as profile
  where profile.id = v_user_id
    and profile.status = 'active';

  if v_tenant_id is null
     or not exists (
       select 1
       from public.memberships as membership
       join public.tenants as tenant on tenant.id = membership.tenant_id
       where membership.tenant_id = v_tenant_id
         and membership.user_id = v_user_id
         and membership.status = 'active'
         and tenant.status = 'active'
     ) then
    raise exception using errcode = '42501', message = 'tenant_required';
  end if;

  select policy.*
  into v_policy
  from public.trial_policies as policy
  where policy.id = v_session.policy_id
  for share;

  if not found or not v_policy.enabled then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
  end if;

  select grant_row.*
  into v_grant
  from public.access_grants as grant_row
  where grant_row.tenant_id = v_tenant_id
    and grant_row.user_id = v_user_id
    and grant_row.mode = 'trial'
  for update;

  if found then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
  end if;

  insert into public.access_grants (
    tenant_id,
    user_id,
    mode,
    policy_id,
    starts_at,
    expires_at,
    max_uses,
    used_uses,
    status
  )
  values (
    v_tenant_id,
    v_user_id,
    'trial',
    v_session.policy_id,
    v_session.started_at,
    v_session.expires_at,
    1,
    0,
    'active'
  )
  returning * into v_grant;

  insert into public.access_grant_entitlements (
    grant_id,
    entitlement_key,
    limit_value,
    is_enabled,
    source
  )
  select
    v_grant.id,
    entitlement.entitlement_key,
    entitlement.limit_value,
    entitlement.is_enabled,
    'trial_policy'
  from public.trial_policy_entitlements as entitlement
  where entitlement.policy_id = v_session.policy_id;

  update public.guest_trial_sessions
  set
    status = 'claimed',
    claimed_at = v_now,
    claimed_user_id = v_user_id,
    updated_at = v_now
  where id = v_session.id;

  update public.guest_trial_eligibilities
  set
    claimed_at = v_now,
    claimed_user_id = v_user_id,
    updated_at = v_now
  where eligibility_key_hash = v_session.eligibility_key_hash;

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
    v_tenant_id,
    v_user_id,
    'user',
    'billing.guest_trial.claimed',
    'access_grant',
    v_grant.id,
    jsonb_build_object(
      'mode', v_grant.mode,
      'policy_id', v_grant.policy_id,
      'starts_at', v_grant.starts_at,
      'expires_at', v_grant.expires_at,
      'entitlements_snapshot', true
    ),
    jsonb_build_object('guest_trial_session_id', v_session.id)
  );

  return query
  select
    v_grant.id,
    v_grant.tenant_id,
    v_grant.user_id,
    v_grant.policy_id,
    v_grant.starts_at,
    v_grant.expires_at,
    v_grant.status,
    public.get_trial_policy_entitlements_json(v_grant.policy_id);
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'guest_trial_unavailable';
end;
$$;

revoke all on function public.validate_trial_policy_entitlement() from public, anon, authenticated;
revoke all on function public.get_trial_policy_entitlements_json(uuid) from public, anon, authenticated;
revoke all on function public.start_guest_trial(text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_guest_trial_session(uuid, text) from public, anon, authenticated;
revoke all on function public.end_guest_trial(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_guest_trial(uuid, text) from public, anon;

grant execute on function public.start_guest_trial(text, uuid, text) to service_role;
grant execute on function public.get_guest_trial_session(uuid, text) to service_role;
grant execute on function public.end_guest_trial(uuid, text) to service_role;
grant execute on function public.claim_guest_trial(uuid, text) to authenticated, service_role;

alter table public.platform_modules enable row level security;
alter table public.trial_policy_entitlements enable row level security;
alter table public.guest_trial_eligibilities enable row level security;
alter table public.guest_trial_sessions enable row level security;
alter table public.access_grant_entitlements enable row level security;

drop policy if exists platform_modules_select_platform_admin on public.platform_modules;
create policy platform_modules_select_platform_admin
on public.platform_modules
for select
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists platform_modules_insert_platform_admin on public.platform_modules;
create policy platform_modules_insert_platform_admin
on public.platform_modules
for insert
to authenticated
with check (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists platform_modules_update_platform_admin on public.platform_modules;
create policy platform_modules_update_platform_admin
on public.platform_modules
for update
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'))
with check (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists platform_modules_delete_platform_admin on public.platform_modules;
create policy platform_modules_delete_platform_admin
on public.platform_modules
for delete
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policy_entitlements_select_platform_admin on public.trial_policy_entitlements;
create policy trial_policy_entitlements_select_platform_admin
on public.trial_policy_entitlements
for select
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policy_entitlements_insert_platform_admin on public.trial_policy_entitlements;
create policy trial_policy_entitlements_insert_platform_admin
on public.trial_policy_entitlements
for insert
to authenticated
with check (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policy_entitlements_update_platform_admin on public.trial_policy_entitlements;
create policy trial_policy_entitlements_update_platform_admin
on public.trial_policy_entitlements
for update
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'))
with check (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policy_entitlements_delete_platform_admin on public.trial_policy_entitlements;
create policy trial_policy_entitlements_delete_platform_admin
on public.trial_policy_entitlements
for delete
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policies_select_platform_admin on public.trial_policies;
create policy trial_policies_select_platform_admin
on public.trial_policies
for select
to authenticated
using (public.has_platform_capability(auth.uid(), 'platform.billing.manage'));

drop policy if exists trial_policies_insert_platform_admin on public.trial_policies;
create policy trial_policies_insert_platform_admin
on public.trial_policies
for insert
to authenticated
with check (
  scope = 'platform'
  and tenant_id is null
  and public.has_platform_capability(auth.uid(), 'platform.billing.manage')
);

drop policy if exists trial_policies_update_platform_admin on public.trial_policies;
create policy trial_policies_update_platform_admin
on public.trial_policies
for update
to authenticated
using (
  scope = 'platform'
  and public.has_platform_capability(auth.uid(), 'platform.billing.manage')
)
with check (
  scope = 'platform'
  and tenant_id is null
  and public.has_platform_capability(auth.uid(), 'platform.billing.manage')
);

drop policy if exists trial_policies_delete_platform_admin on public.trial_policies;
create policy trial_policies_delete_platform_admin
on public.trial_policies
for delete
to authenticated
using (
  scope = 'platform'
  and public.has_platform_capability(auth.uid(), 'platform.billing.manage')
);

drop policy if exists access_grant_entitlements_select_self_or_admin on public.access_grant_entitlements;
create policy access_grant_entitlements_select_self_or_admin
on public.access_grant_entitlements
for select
to authenticated
using (
  exists (
    select 1
    from public.access_grants as grant_row
    where grant_row.id = access_grant_entitlements.grant_id
      and (
        grant_row.user_id = auth.uid()
        or public.has_capability(auth.uid(), grant_row.tenant_id, 'billing.entitlements.read')
      )
  )
);

grant usage on schema public to authenticated, service_role;
grant select on
  public.platform_modules,
  public.trial_policy_entitlements,
  public.access_grant_entitlements
to authenticated;
grant insert, update, delete on
  public.platform_modules,
  public.trial_policy_entitlements,
  public.trial_policies
to authenticated;
grant all on
  public.platform_modules,
  public.trial_policy_entitlements,
  public.guest_trial_eligibilities,
  public.guest_trial_sessions,
  public.access_grant_entitlements
to service_role;

insert into public.platform_modules (
  module_key,
  name,
  description,
  route_prefix,
  is_active,
  display_order
)
values (
  'investigator',
  'Investigator',
  'Investigación y análisis DAFO para clientes NovaStore.',
  '/apps/investigator',
  true,
  10
)
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  route_prefix = excluded.route_prefix,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

update public.trial_policies
set
  allow_guest = true,
  max_sessions = 1,
  updated_at = now()
where scope = 'platform'
  and tenant_id is null;

insert into public.trial_policy_entitlements (
  policy_id,
  entitlement_key,
  limit_value,
  is_enabled
)
select
  policy.id,
  entitlement.entitlement_key,
  entitlement.limit_value,
  true
from public.trial_policies as policy
cross join (
  values
    ('modules.investigator', null::integer),
    ('actions.investigations.read', null::integer),
    ('actions.investigations.create', null::integer),
    ('actions.investigations.update', null::integer),
    ('limits.investigations.max_active', 1)
) as entitlement(entitlement_key, limit_value)
where policy.scope = 'platform'
  and policy.tenant_id is null
on conflict (policy_id, entitlement_key) do update
set
  limit_value = excluded.limit_value,
  is_enabled = excluded.is_enabled,
  updated_at = now();

commit;
