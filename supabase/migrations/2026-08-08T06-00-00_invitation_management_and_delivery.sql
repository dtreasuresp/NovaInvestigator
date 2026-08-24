begin;

alter table public.invitations
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivered_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_delivery_status_check'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_delivery_status_check
      check (delivery_status in ('pending', 'sent', 'failed'));
  end if;
end
$$;

create index if not exists invitations_email_status_idx
  on public.invitations (email, expires_at)
  where accepted_at is null and revoked_at is null;

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

drop policy if exists invitations_update_managed on public.invitations;
create policy invitations_update_managed
on public.invitations
for update
to authenticated
using (
  accepted_at is null
  and public.has_capability(auth.uid(), tenant_id, 'users.invite')
)
with check (
  accepted_at is null
  and public.has_capability(auth.uid(), tenant_id, 'users.invite')
);

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
  v_now timestamptz := clock_timestamp();
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then
    return;
  end if;

  select lower(auth_user.email)
  into v_email
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email is null then
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
  on conflict (tenant_id, user_id) do update
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
  on conflict (workspace_id, user_id) do update
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
