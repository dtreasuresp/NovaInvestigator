-- Migration: 2026-08-15T18-00-00_fix_purchase_delegation_rpc_ambiguity.sql
-- Description: Fixes PostgreSQL Error 42702 (ambiguous column reference) in grant_billing_purchase_delegation and revoke_billing_purchase_delegation by adding #variable_conflict use_column and explicit table aliases.

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
#variable_conflict use_column
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

  select delegation.*
  into v_existing
  from public.workspace_billing_purchase_delegations as delegation
  where delegation.workspace_id = p_workspace_id
    and delegation.user_id = p_user_id
  for update;

  if found then
    update public.workspace_billing_purchase_delegations as delegation
    set
      granted_by = auth.uid(),
      status = 'active',
      revoked_at = null
    where delegation.id = v_existing.id
    returning delegation.* into v_delegation;
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
#variable_conflict use_column
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

  update public.workspace_billing_purchase_delegations as delegation
  set
    status = 'revoked',
    revoked_at = clock_timestamp()
  where delegation.id = p_delegation_id
  returning delegation.* into v_after;

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
