begin;

-- Invitations always target an existing workspace. Existing invitations are
-- attached to the tenant's General workspace before the column becomes
-- mandatory.
alter table public.workspaces
  add constraint workspaces_id_tenant_unique unique (id, tenant_id);

alter table public.invitations
  add column if not exists workspace_id uuid;

insert into public.workspaces (tenant_id, name, slug, created_by)
select distinct invitation.tenant_id, 'General', 'general', null::uuid
from public.invitations as invitation
where not exists (
  select 1
  from public.workspaces as workspace
  where workspace.tenant_id = invitation.tenant_id
    and workspace.slug = 'general'
);

update public.invitations as invitation
set workspace_id = workspace.id
from public.workspaces as workspace
where workspace.tenant_id = invitation.tenant_id
  and workspace.slug = 'general'
  and invitation.workspace_id is null;

alter table public.invitations
  alter column workspace_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_workspace_tenant_fkey'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_workspace_tenant_fkey
      foreign key (workspace_id, tenant_id)
      references public.workspaces (id, tenant_id)
      on delete cascade;
  end if;
end
$$;

create index if not exists invitations_tenant_workspace_email_idx
  on public.invitations (tenant_id, workspace_id, email, expires_at);

-- Tenant-level users.invite is the functional permission for inviting into
-- any active workspace owned by that tenant.
drop policy if exists workspaces_select_visible on public.workspaces;
create policy workspaces_select_visible
on public.workspaces
for select
to authenticated
using (
  public.is_active_workspace_member(auth.uid(), id)
  or exists (
    select 1
    from public.memberships as membership
    where membership.user_id = auth.uid()
      and membership.tenant_id = workspaces.tenant_id
      and membership.status = 'active'
      and (
        public.has_capability(auth.uid(), workspaces.tenant_id, 'access.manage')
        or public.has_capability(auth.uid(), workspaces.tenant_id, 'users.invite')
      )
  )
);

-- Workspace membership access must remain subordinate to active tenant
-- membership. This prevents a revoked tenant membership from retaining
-- access through an otherwise active workspace membership.
create or replace function public.is_active_workspace_member(
  p_user_id uuid,
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_user_id is not null
    and p_workspace_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships as membership
      join public.workspaces as workspace
        on workspace.id = membership.workspace_id
      join public.memberships as tenant_membership
        on tenant_membership.tenant_id = workspace.tenant_id
       and tenant_membership.user_id = membership.user_id
       and tenant_membership.status = 'active'
      where membership.user_id = p_user_id
        and membership.workspace_id = p_workspace_id
        and membership.status = 'active'
        and workspace.status = 'active'
    );
$$;

drop policy if exists invitations_insert_managed on public.invitations;
create policy invitations_insert_managed
on public.invitations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'users.invite')
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = invitations.workspace_id
      and workspace.tenant_id = invitations.tenant_id
      and workspace.status = 'active'
  )
);

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
  where invitation.token_hash = p_token_hash
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

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated, service_role;

commit;
