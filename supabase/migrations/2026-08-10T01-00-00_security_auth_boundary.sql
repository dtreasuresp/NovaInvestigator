begin;

create or replace function public.is_active_tenant_member(
  p_user_id uuid,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_user_id is not null
    and p_tenant_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.tenants as tenant
      join public.memberships as membership
        on membership.tenant_id = tenant.id
      where membership.user_id = p_user_id
        and membership.tenant_id = p_tenant_id
        and membership.status = 'active'
        and tenant.status = 'active'
    );
$$;

revoke all on function public.is_active_tenant_member(uuid, uuid) from public, anon;
grant execute on function public.is_active_tenant_member(uuid, uuid) to authenticated, service_role;

alter function public.accept_invitation(text) rename to accept_invitation_unconfirmed_legacy;
alter function public.accept_invitation_by_id(uuid) rename to accept_invitation_by_id_unconfirmed_legacy;

revoke all on function public.accept_invitation_unconfirmed_legacy(text) from public, anon, authenticated, service_role;
revoke all on function public.accept_invitation_by_id_unconfirmed_legacy(uuid) from public, anon, authenticated, service_role;

create or replace function public.accept_invitation(p_token_hash text)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  workspace_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_confirmed_at timestamptz;
  v_invitation_id uuid;
begin
  if v_user_id is null then
    return;
  end if;

  select auth_user.email_confirmed_at
  into v_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email_confirmed_at is null then
    return;
  end if;

  select invitation.id
  into v_invitation_id
  from public.invitations as invitation
  join public.tenants as tenant
    on tenant.id = invitation.tenant_id
   and tenant.status = 'active'
  join public.workspaces as workspace
    on workspace.id = invitation.workspace_id
   and workspace.tenant_id = invitation.tenant_id
   and workspace.status = 'active'
  where invitation.token_hash = p_token_hash
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > clock_timestamp();

  if v_invitation_id is null then
    return;
  end if;

  return query
  select *
  from public.accept_invitation_by_id(v_invitation_id);
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated, service_role;

create or replace function public.accept_invitation_by_id(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  workspace_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_now timestamptz := clock_timestamp();
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then
    return;
  end if;

  select lower(auth_user.email), auth_user.email_confirmed_at
  into v_email, v_email_confirmed_at
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    return;
  end if;

  select invitation.*
  into v_invitation
  from public.invitations as invitation
  join public.tenants as tenant
    on tenant.id = invitation.tenant_id
   and tenant.status = 'active'
  join public.workspaces as workspace
    on workspace.id = invitation.workspace_id
   and workspace.tenant_id = invitation.tenant_id
   and workspace.status = 'active'
  where invitation.id = p_invitation_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > v_now
  for update of invitation;

  if not found or lower(v_invitation.email) <> v_email then
    return;
  end if;

  if exists (
    select 1
    from public.memberships as membership
    where membership.tenant_id = v_invitation.tenant_id
      and membership.user_id = v_user_id
      and membership.status in ('suspended', 'revoked')
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.workspace_memberships as membership
    where membership.workspace_id = v_invitation.workspace_id
      and membership.user_id = v_user_id
      and membership.status in ('suspended', 'revoked')
  ) then
    return;
  end if;

  insert into public.memberships (
    tenant_id,
    user_id,
    role_id,
    status,
    invited_at,
    accepted_at
  )
  values (
    v_invitation.tenant_id,
    v_user_id,
    v_invitation.role_id,
    'active',
    v_invitation.created_at,
    v_now
  )
  on conflict on constraint memberships_tenant_id_user_id_key do update
    set status = 'active',
        accepted_at = coalesce(public.memberships.accepted_at, excluded.accepted_at)
    where public.memberships.status = 'pending';

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role_id,
    status,
    invited_at,
    accepted_at
  )
  values (
    v_invitation.workspace_id,
    v_user_id,
    v_invitation.role_id,
    'active',
    v_invitation.created_at,
    v_now
  )
  on conflict on constraint workspace_memberships_workspace_id_user_id_key do update
    set status = 'active',
        accepted_at = coalesce(public.workspace_memberships.accepted_at, excluded.accepted_at)
    where public.workspace_memberships.status = 'pending';

  update public.invitations
  set accepted_at = v_now
  where id = v_invitation.id;

  insert into public.audit_logs (
    tenant_id,
    workspace_id,
    actor_user_id,
    source,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    v_invitation.tenant_id,
    v_invitation.workspace_id,
    v_user_id,
    'user',
    'users.invitation.accepted',
    'invitation',
    v_invitation.id,
    jsonb_build_object(
      'workspace_id', v_invitation.workspace_id,
      'role_id', v_invitation.role_id
    )
  );

  return query
  select v_invitation.id, v_invitation.tenant_id, v_invitation.workspace_id;
end;
$$;

revoke all on function public.accept_invitation_by_id(uuid) from public, anon;
grant execute on function public.accept_invitation_by_id(uuid) to authenticated, service_role;

commit;
