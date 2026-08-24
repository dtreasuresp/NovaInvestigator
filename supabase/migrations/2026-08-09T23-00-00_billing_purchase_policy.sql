begin;

alter table public.tenants
  add column if not exists billing_purchase_policy text not null default 'owner_only';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_billing_purchase_policy_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_billing_purchase_policy_check
      check (billing_purchase_policy in ('owner_only', 'approved_members', 'all_active_members'));
  end if;
end;
$$;

create table if not exists public.workspace_billing_purchase_delegations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (workspace_id, user_id),
  check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create index if not exists workspace_billing_purchase_delegations_status_idx
  on public.workspace_billing_purchase_delegations (workspace_id, status, created_at desc);

drop trigger if exists workspace_billing_purchase_delegations_set_updated_at
  on public.workspace_billing_purchase_delegations;
create trigger workspace_billing_purchase_delegations_set_updated_at
before update on public.workspace_billing_purchase_delegations
for each row execute function public.set_updated_at();

create table if not exists public.billing_subscription_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  initiated_by uuid not null references auth.users(id) on delete restrict,
  client_reference_id text not null unique,
  request_idempotency_key text,
  provider_checkout_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'open', 'completed', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_subscription_checkout_intents_request_key_unique
  on public.billing_subscription_checkout_intents (tenant_id, request_idempotency_key)
  where request_idempotency_key is not null
    and status not in ('released', 'expired');

create unique index if not exists billing_subscription_checkout_intents_active_tenant_unique
  on public.billing_subscription_checkout_intents (tenant_id)
  where status in ('pending', 'open');

create index if not exists billing_subscription_checkout_intents_expiry_idx
  on public.billing_subscription_checkout_intents (status, expires_at);

drop trigger if exists billing_subscription_checkout_intents_set_updated_at
  on public.billing_subscription_checkout_intents;
create trigger billing_subscription_checkout_intents_set_updated_at
before update on public.billing_subscription_checkout_intents
for each row execute function public.set_updated_at();

alter table public.workspace_billing_purchase_delegations enable row level security;
alter table public.billing_subscription_checkout_intents enable row level security;

revoke all on table public.workspace_billing_purchase_delegations from public, anon, authenticated;
revoke all on table public.billing_subscription_checkout_intents from public, anon, authenticated;
grant all on table public.workspace_billing_purchase_delegations to service_role;
grant all on table public.billing_subscription_checkout_intents to service_role;

create or replace function public.is_active_workspace_owner(
  p_user_id uuid,
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    p_user_id is not null
    and p_workspace_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships as workspace_membership
      join public.workspaces as workspace
        on workspace.id = workspace_membership.workspace_id
      join public.roles as role_row
        on role_row.id = workspace_membership.role_id
       and role_row.key = 'owner'
      join public.memberships as tenant_membership
        on tenant_membership.user_id = workspace_membership.user_id
       and tenant_membership.tenant_id = workspace.tenant_id
       and tenant_membership.status = 'active'
      join public.tenants as tenant
        on tenant.id = workspace.tenant_id
       and tenant.status = 'active'
      where workspace_membership.user_id = p_user_id
        and workspace_membership.workspace_id = p_workspace_id
        and workspace_membership.status = 'active'
        and workspace.status = 'active'
    );
$$;

create or replace function public.authorize_billing_checkout(
  p_user_id uuid,
  p_tenant_id uuid,
  p_workspace_id uuid default null
)
returns table (
  workspace_id uuid,
  policy text,
  authorization_source text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_workspace_id uuid;
  v_membership_id uuid;
  v_policy text;
  v_authorization_source text;
begin
  if p_user_id is null or p_user_id <> auth.uid() then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_user_id
      and profile.status = 'active'
  ) then
    return;
  end if;

  select
    workspace.id,
    tenant_membership.id
  into
    v_workspace_id,
    v_membership_id
  from public.workspaces as workspace
  join public.workspace_memberships as workspace_membership
    on workspace_membership.workspace_id = workspace.id
   and workspace_membership.user_id = p_user_id
   and workspace_membership.status = 'active'
  join public.memberships as tenant_membership
    on tenant_membership.user_id = p_user_id
   and tenant_membership.tenant_id = workspace.tenant_id
   and tenant_membership.status = 'active'
  join public.tenants as tenant
    on tenant.id = workspace.tenant_id
   and tenant.status = 'active'
  where workspace.tenant_id = p_tenant_id
    and workspace.status = 'active'
    and (p_workspace_id is null or workspace.id = p_workspace_id)
  order by
    case when workspace.slug = 'general' then 0 else 1 end,
    workspace.created_at,
    workspace.id
  limit 1;

  if v_workspace_id is null then
    return;
  end if;

  select tenant.billing_purchase_policy
  into v_policy
  from public.tenants as tenant
  where tenant.id = p_tenant_id
    and tenant.status = 'active';

  if v_policy is null then
    return;
  end if;

  if public.is_active_workspace_owner(p_user_id, v_workspace_id) then
    v_authorization_source := 'owner';
  elsif exists (
    select 1
    from public.member_capability_overrides as override_row
    where override_row.membership_id = v_membership_id
      and override_row.capability_key = 'billing.checkout.create'
      and override_row.effect = 'deny'
  ) then
    return;
  elsif v_policy = 'approved_members'
    and exists (
      select 1
      from public.workspace_billing_purchase_delegations as delegation
      where delegation.workspace_id = v_workspace_id
        and delegation.user_id = p_user_id
        and delegation.status = 'active'
    ) then
    v_authorization_source := 'approved_member';
  elsif v_policy = 'all_active_members' then
    v_authorization_source := 'all_active_member';
  else
    return;
  end if;

  return query
  select v_workspace_id, v_policy, v_authorization_source;
end;
$$;

create or replace function public.get_billing_purchase_policy(
  p_tenant_id uuid
)
returns table (
  tenant_id uuid,
  policy text,
  can_manage boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    tenant.id,
    tenant.billing_purchase_policy,
    exists (
      select 1
      from public.workspace_memberships as workspace_membership
      join public.workspaces as workspace
        on workspace.id = workspace_membership.workspace_id
       and workspace.tenant_id = tenant.id
       and workspace.status = 'active'
      join public.roles as role_row
        on role_row.id = workspace_membership.role_id
       and role_row.key = 'owner'
      where workspace_membership.user_id = auth.uid()
        and workspace_membership.status = 'active'
        and public.has_capability(auth.uid(), tenant.id, 'billing.purchase.manage')
    )
  from public.tenants as tenant
  join public.memberships as membership
    on membership.tenant_id = tenant.id
   and membership.user_id = auth.uid()
   and membership.status = 'active'
  where tenant.id = p_tenant_id
    and tenant.status = 'active';
$$;

create or replace function public.set_billing_purchase_policy(
  p_tenant_id uuid,
  p_policy text
)
returns table (
  tenant_id uuid,
  policy text
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_before text;
  v_workspace_id uuid;
begin
  if p_policy not in ('owner_only', 'approved_members', 'all_active_members') then
    raise exception using errcode = '22023', message = 'invalid_billing_purchase_policy';
  end if;

  select workspace.id
  into v_workspace_id
  from public.workspace_memberships as workspace_membership
  join public.workspaces as workspace
    on workspace.id = workspace_membership.workspace_id
   and workspace.tenant_id = p_tenant_id
   and workspace.status = 'active'
  join public.roles as role_row
    on role_row.id = workspace_membership.role_id
   and role_row.key = 'owner'
  where workspace_membership.user_id = auth.uid()
    and workspace_membership.status = 'active'
    and public.has_capability(auth.uid(), p_tenant_id, 'billing.purchase.manage')
  order by workspace.created_at, workspace.id
  limit 1;

  if v_workspace_id is null then
    raise exception using errcode = '42501', message = 'billing_purchase_policy_forbidden';
  end if;

  select tenant.billing_purchase_policy
  into v_before
  from public.tenants as tenant
  where tenant.id = p_tenant_id
    and tenant.status = 'active'
  for update;

  if v_before is null then
    raise exception using errcode = '42501', message = 'tenant_required';
  end if;

  if v_before <> p_policy then
    update public.tenants
    set billing_purchase_policy = p_policy
    where id = p_tenant_id;

    insert into public.audit_logs (
      tenant_id,
      workspace_id,
      actor_user_id,
      source,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data
    )
    values (
      p_tenant_id,
      v_workspace_id,
      auth.uid(),
      'admin',
      'billing.purchase_policy.updated',
      'tenant',
      p_tenant_id,
      jsonb_build_object('billingPurchasePolicy', v_before),
      jsonb_build_object('billingPurchasePolicy', p_policy)
    );
  end if;

  return query
  select p_tenant_id, p_policy;
end;
$$;

create or replace function public.list_billing_purchase_delegations(
  p_tenant_id uuid,
  p_workspace_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  granted_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not exists (
    select 1
    from public.workspace_memberships as workspace_membership
    join public.workspaces as workspace
      on workspace.id = workspace_membership.workspace_id
     and workspace.tenant_id = p_tenant_id
     and workspace.status = 'active'
    where workspace_membership.user_id = auth.uid()
      and workspace_membership.workspace_id = p_workspace_id
      and workspace_membership.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'billing_purchase_delegations_forbidden';
  end if;

  if not public.is_active_workspace_owner(auth.uid(), p_workspace_id)
     or not public.has_capability(auth.uid(), p_tenant_id, 'billing.purchase.manage') then
    raise exception using errcode = '42501', message = 'billing_purchase_delegations_forbidden';
  end if;

  return query
  select
    delegation.id,
    delegation.workspace_id,
    delegation.user_id,
    delegation.granted_by,
    delegation.status,
    delegation.created_at,
    delegation.updated_at,
    delegation.revoked_at
  from public.workspace_billing_purchase_delegations as delegation
  where delegation.workspace_id = p_workspace_id
  order by delegation.created_at desc, delegation.id;
end;
$$;

create or replace function public.grant_billing_purchase_delegation(
  p_tenant_id uuid,
  p_workspace_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  granted_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_existing public.workspace_billing_purchase_delegations%rowtype;
  v_delegation public.workspace_billing_purchase_delegations%rowtype;
begin
  if not public.is_active_workspace_owner(auth.uid(), p_workspace_id)
     or not public.has_capability(auth.uid(), p_tenant_id, 'billing.purchase.manage') then
    raise exception using errcode = '42501', message = 'billing_purchase_delegation_forbidden';
  end if;

  if not exists (
    select 1
    from public.workspaces as workspace
    join public.tenants as tenant
      on tenant.id = workspace.tenant_id
     and tenant.status = 'active'
    where workspace.id = p_workspace_id
      and workspace.tenant_id = p_tenant_id
      and workspace.status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'workspace_not_found';
  end if;

  if not exists (
    select 1
    from public.workspace_memberships as workspace_membership
    join public.memberships as tenant_membership
      on tenant_membership.user_id = workspace_membership.user_id
     and tenant_membership.tenant_id = p_tenant_id
     and tenant_membership.status = 'active'
    where workspace_membership.workspace_id = p_workspace_id
      and workspace_membership.user_id = p_user_id
      and workspace_membership.status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'billing_purchase_delegation_target_not_found';
  end if;

  select *
  into v_existing
  from public.workspace_billing_purchase_delegations
  where workspace_id = p_workspace_id
    and user_id = p_user_id
  for update;

  if found then
    update public.workspace_billing_purchase_delegations
    set
      granted_by = auth.uid(),
      status = 'active',
      revoked_at = null
    where id = v_existing.id
    returning * into v_delegation;
  else
    insert into public.workspace_billing_purchase_delegations (
      workspace_id,
      user_id,
      granted_by
    )
    values (
      p_workspace_id,
      p_user_id,
      auth.uid()
    )
    returning * into v_delegation;
  end if;

  insert into public.audit_logs (
    tenant_id,
    workspace_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    p_tenant_id,
    p_workspace_id,
    auth.uid(),
    'admin',
    'billing.purchase.delegation.granted',
    'workspace_billing_purchase_delegation',
    v_delegation.id,
    case when v_existing.id is null then null else jsonb_build_object(
      'status', v_existing.status,
      'userId', v_existing.user_id
    ) end,
    jsonb_build_object(
      'status', v_delegation.status,
      'userId', v_delegation.user_id
    )
  );

  return query
  select
    v_delegation.id,
    v_delegation.workspace_id,
    v_delegation.user_id,
    v_delegation.granted_by,
    v_delegation.status,
    v_delegation.created_at,
    v_delegation.updated_at,
    v_delegation.revoked_at;
end;
$$;

create or replace function public.revoke_billing_purchase_delegation(
  p_tenant_id uuid,
  p_delegation_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  granted_by uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_before public.workspace_billing_purchase_delegations%rowtype;
  v_after public.workspace_billing_purchase_delegations%rowtype;
begin
  select delegation.*
  into v_before
  from public.workspace_billing_purchase_delegations as delegation
  join public.workspaces as workspace
    on workspace.id = delegation.workspace_id
   and workspace.tenant_id = p_tenant_id
  where delegation.id = p_delegation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'billing_purchase_delegation_not_found';
  end if;

  if not public.is_active_workspace_owner(auth.uid(), v_before.workspace_id)
     or not public.has_capability(auth.uid(), p_tenant_id, 'billing.purchase.manage') then
    raise exception using errcode = '42501', message = 'billing_purchase_delegation_forbidden';
  end if;

  if v_before.status = 'revoked' then
    return query
    select
      v_before.id,
      v_before.workspace_id,
      v_before.user_id,
      v_before.granted_by,
      v_before.status,
      v_before.created_at,
      v_before.updated_at,
      v_before.revoked_at;
    return;
  end if;

  update public.workspace_billing_purchase_delegations
  set
    status = 'revoked',
    revoked_at = clock_timestamp()
  where id = p_delegation_id
  returning * into v_after;

  insert into public.audit_logs (
    tenant_id,
    workspace_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    p_tenant_id,
    v_after.workspace_id,
    auth.uid(),
    'admin',
    'billing.purchase.delegation.revoked',
    'workspace_billing_purchase_delegation',
    v_after.id,
    jsonb_build_object('status', v_before.status, 'userId', v_before.user_id),
    jsonb_build_object('status', v_after.status, 'userId', v_after.user_id)
  );

  return query
  select
    v_after.id,
    v_after.workspace_id,
    v_after.user_id,
    v_after.granted_by,
    v_after.status,
    v_after.created_at,
    v_after.updated_at,
    v_after.revoked_at;
end;
$$;

create or replace function public.reserve_billing_subscription_checkout(
  p_tenant_id uuid,
  p_workspace_id uuid,
  p_plan_id uuid,
  p_idempotency_key text default null
)
returns table (
  id uuid,
  tenant_id uuid,
  workspace_id uuid,
  plan_id uuid,
  initiated_by uuid,
  client_reference_id text,
  request_idempotency_key text,
  provider_checkout_id text,
  status text,
  expires_at timestamptz,
  is_new boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_authorization record;
  v_plan_exists boolean;
  v_existing_subscription_id uuid;
  v_intent public.billing_subscription_checkout_intents%rowtype;
  v_now timestamptz := clock_timestamp();
  v_idempotency_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
begin
  select *
  into v_authorization
  from public.authorize_billing_checkout(auth.uid(), p_tenant_id, p_workspace_id);

  if not found then
    raise exception using errcode = '42501', message = 'billing_purchase_not_allowed';
  end if;

  select exists (
    select 1
    from public.plans as plan
    where plan.id = p_plan_id
      and plan.is_active
      and plan.interval <> 'one_time'
      and plan.provider_price_id is not null
  )
  into v_plan_exists;

  if not v_plan_exists then
    raise exception using errcode = '22023', message = 'plan_not_found';
  end if;

  select subscription.id
  into v_existing_subscription_id
  from public.subscriptions as subscription
  where subscription.tenant_id = p_tenant_id
    and (
      subscription.status in ('active', 'trialing', 'past_due', 'unpaid')
      or (
        subscription.status = 'incomplete'
        and subscription.created_at > v_now - interval '1 hour'
      )
      or (
        subscription.status = 'canceled'
        and subscription.current_period_end is not null
        and subscription.current_period_end > v_now
      )
    )
  order by subscription.updated_at desc
  limit 1
  for update;

  if v_existing_subscription_id is not null then
    raise exception using errcode = 'P0001', message = 'subscription_already_active';
  end if;

  select intent.*
  into v_intent
  from public.billing_subscription_checkout_intents as intent
  where intent.tenant_id = p_tenant_id
    and intent.status in ('pending', 'open')
  order by intent.created_at desc
  limit 1
  for update;

  if found then
    if v_intent.expires_at <= v_now then
      update public.billing_subscription_checkout_intents
      set status = 'expired'
      where id = v_intent.id;
    elsif v_intent.plan_id = p_plan_id then
      return query
      select
        v_intent.id,
        v_intent.tenant_id,
        v_intent.workspace_id,
        v_intent.plan_id,
        v_intent.initiated_by,
        v_intent.client_reference_id,
        v_intent.request_idempotency_key,
        v_intent.provider_checkout_id,
        v_intent.status,
        v_intent.expires_at,
        false;
      return;
    else
      raise exception using errcode = 'P0001', message = 'subscription_checkout_in_progress';
    end if;
  end if;

  insert into public.billing_subscription_checkout_intents (
    tenant_id,
    workspace_id,
    plan_id,
    initiated_by,
    client_reference_id,
    request_idempotency_key,
    expires_at
  )
  values (
    p_tenant_id,
    v_authorization.workspace_id,
    p_plan_id,
    auth.uid(),
    gen_random_uuid()::text,
    v_idempotency_key,
    v_now + interval '30 minutes'
  )
  on conflict do nothing
  returning * into v_intent;

  if not found then
    select intent.*
    into v_intent
    from public.billing_subscription_checkout_intents as intent
    where intent.tenant_id = p_tenant_id
      and intent.status in ('pending', 'open')
    order by intent.created_at desc
    limit 1
    for update;

    if found and v_intent.plan_id = p_plan_id then
      return query
      select
        v_intent.id,
        v_intent.tenant_id,
        v_intent.workspace_id,
        v_intent.plan_id,
        v_intent.initiated_by,
        v_intent.client_reference_id,
        v_intent.request_idempotency_key,
        v_intent.provider_checkout_id,
        v_intent.status,
        v_intent.expires_at,
        false;
      return;
    end if;

    raise exception using errcode = 'P0001', message = 'subscription_checkout_in_progress';
  end if;

  return query
  select
    v_intent.id,
    v_intent.tenant_id,
    v_intent.workspace_id,
    v_intent.plan_id,
    v_intent.initiated_by,
    v_intent.client_reference_id,
    v_intent.request_idempotency_key,
    v_intent.provider_checkout_id,
    v_intent.status,
    v_intent.expires_at,
    true;
end;
$$;

create or replace function public.attach_billing_subscription_checkout(
  p_tenant_id uuid,
  p_intent_id uuid,
  p_provider_checkout_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_intent public.billing_subscription_checkout_intents%rowtype;
begin
  select intent.*
  into v_intent
  from public.billing_subscription_checkout_intents as intent
  where intent.id = p_intent_id
    and intent.tenant_id = p_tenant_id
  for update;

  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from public.authorize_billing_checkout(auth.uid(), p_tenant_id, v_intent.workspace_id)
  ) then
    return false;
  end if;

  if v_intent.provider_checkout_id is not null then
    return v_intent.provider_checkout_id = p_provider_checkout_id;
  end if;

  if v_intent.status <> 'pending' then
    return false;
  end if;

  update public.billing_subscription_checkout_intents
  set
    provider_checkout_id = p_provider_checkout_id,
    status = 'open'
  where id = p_intent_id
    and tenant_id = p_tenant_id
    and status = 'pending';

  return found;
end;
$$;

create or replace function public.release_billing_subscription_checkout(
  p_tenant_id uuid,
  p_intent_id uuid
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  update public.billing_subscription_checkout_intents
  set status = 'released'
  where id = p_intent_id
    and tenant_id = p_tenant_id
    and initiated_by = auth.uid()
    and status = 'pending'
  returning true;
$$;

create or replace function public.create_billing_customer_for_workspace(
  p_tenant_id uuid,
  p_workspace_id uuid,
  p_provider_customer_id text,
  p_billing_email text
)
returns table (
  id uuid,
  tenant_id uuid,
  provider_customer_id text,
  billing_email text,
  country text,
  tax_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_provider_customer_id text := nullif(trim(p_provider_customer_id), '');
  v_billing_email text := nullif(trim(coalesce(p_billing_email, '')), '');
  v_customer public.billing_customers%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_tenant_id is null or v_provider_customer_id is null then
    raise exception using errcode = '22023', message = 'invalid_billing_customer';
  end if;

  if not exists (
    select 1
    from public.authorize_billing_checkout(v_user_id, p_tenant_id, p_workspace_id)
  ) then
    raise exception using errcode = '42501', message = 'billing_purchase_not_allowed';
  end if;

  select customer.*
  into v_customer
  from public.billing_customers as customer
  where customer.tenant_id = p_tenant_id
  for update;

  if found then
    if v_customer.provider_customer_id <> v_provider_customer_id then
      raise exception using errcode = '23505', message = 'billing_customer_conflict';
    end if;

    return query
    select
      v_customer.id,
      v_customer.tenant_id,
      v_customer.provider_customer_id,
      v_customer.billing_email,
      v_customer.country,
      v_customer.tax_id,
      v_customer.created_at,
      v_customer.updated_at;
    return;
  end if;

  insert into public.billing_customers (
    tenant_id,
    provider_customer_id,
    billing_email
  )
  values (
    p_tenant_id,
    v_provider_customer_id,
    v_billing_email
  )
  returning * into v_customer;

  return query
  select
    v_customer.id,
    v_customer.tenant_id,
    v_customer.provider_customer_id,
    v_customer.billing_email,
    v_customer.country,
    v_customer.tax_id,
    v_customer.created_at,
    v_customer.updated_at;
exception
  when unique_violation then
    select customer.*
    into v_customer
    from public.billing_customers as customer
    where customer.tenant_id = p_tenant_id
    for update;

    if found and v_customer.provider_customer_id = v_provider_customer_id then
      return query
      select
        v_customer.id,
        v_customer.tenant_id,
        v_customer.provider_customer_id,
        v_customer.billing_email,
        v_customer.country,
        v_customer.tax_id,
        v_customer.created_at,
        v_customer.updated_at;
      return;
    end if;

    raise;
end;
$$;

create or replace function public.create_billing_customer(
  p_tenant_id uuid,
  p_provider_customer_id text,
  p_billing_email text
)
returns table (
  id uuid,
  tenant_id uuid,
  provider_customer_id text,
  billing_email text,
  country text,
  tax_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select *
  from public.create_billing_customer_for_workspace(
    p_tenant_id,
    null,
    p_provider_customer_id,
    p_billing_email
  );
$$;

create or replace function public.create_billing_customer(
  p_tenant_id uuid,
  p_provider_customer_id text,
  p_billing_email text,
  p_workspace_id uuid
)
returns table (
  id uuid,
  tenant_id uuid,
  provider_customer_id text,
  billing_email text,
  country text,
  tax_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select *
  from public.create_billing_customer_for_workspace(
    p_tenant_id,
    p_workspace_id,
    p_provider_customer_id,
    p_billing_email
  );
$$;

insert into public.capabilities (key, description, resource, action)
values (
  'billing.purchase.manage',
  'Configurar la política de compras y aprobar miembros para Checkout del tenant.',
  'billing',
  'purchase.manage'
)
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, 'billing.purchase.manage'
from public.roles as role_row
where role_row.tenant_id is null
  and role_row.key = 'owner'
on conflict do nothing;

delete from public.role_capabilities
where capability_key = 'billing.purchase.manage'
  and role_id in (
    select role_row.id
    from public.roles as role_row
    where role_row.tenant_id is null
      and role_row.key <> 'owner'
  );

revoke all on function public.is_active_workspace_owner(uuid, uuid) from public, anon;
revoke all on function public.authorize_billing_checkout(uuid, uuid, uuid) from public, anon;
revoke all on function public.get_billing_purchase_policy(uuid) from public, anon;
revoke all on function public.set_billing_purchase_policy(uuid, text) from public, anon;
revoke all on function public.list_billing_purchase_delegations(uuid, uuid) from public, anon;
revoke all on function public.grant_billing_purchase_delegation(uuid, uuid, uuid) from public, anon;
revoke all on function public.revoke_billing_purchase_delegation(uuid, uuid) from public, anon;
revoke all on function public.reserve_billing_subscription_checkout(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.attach_billing_subscription_checkout(uuid, uuid, text) from public, anon;
revoke all on function public.release_billing_subscription_checkout(uuid, uuid) from public, anon;
revoke all on function public.create_billing_customer_for_workspace(uuid, uuid, text, text) from public, anon;
revoke all on function public.create_billing_customer(uuid, text, text) from public, anon;
revoke all on function public.create_billing_customer(uuid, text, text, uuid) from public, anon;

grant execute on function public.is_active_workspace_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.authorize_billing_checkout(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.get_billing_purchase_policy(uuid) to authenticated, service_role;
grant execute on function public.set_billing_purchase_policy(uuid, text) to authenticated, service_role;
grant execute on function public.list_billing_purchase_delegations(uuid, uuid) to authenticated, service_role;
grant execute on function public.grant_billing_purchase_delegation(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.revoke_billing_purchase_delegation(uuid, uuid) to authenticated, service_role;
grant execute on function public.reserve_billing_subscription_checkout(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.attach_billing_subscription_checkout(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.release_billing_subscription_checkout(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_billing_customer_for_workspace(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.create_billing_customer(uuid, text, text) to authenticated, service_role;
grant execute on function public.create_billing_customer(uuid, text, text, uuid) to authenticated, service_role;

commit;
