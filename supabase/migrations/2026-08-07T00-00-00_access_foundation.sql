begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text,
  timezone text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'deleted')),
  kyc_status text not null default 'pending'
    check (kyc_status in ('pending', 'verified', 'rejected')),
  kyc_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kyc_status = 'verified' and kyc_verified_at is not null)
    or (kyc_status <> 'verified' and kyc_verified_at is null)
  )
);

comment on column public.profiles.kyc_status is
  'Application KYC state. Raw KYC documents are never stored in this database.';
comment on column public.profiles.kyc_verified_at is
  'Timestamp of the latest successful KYC verification.';

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  check ((tenant_id is null) = is_system)
);

create unique index if not exists roles_system_key_unique
  on public.roles (key)
  where tenant_id is null;

create unique index if not exists roles_tenant_key_unique
  on public.roles (tenant_id, key)
  where tenant_id is not null;

create table if not exists public.capabilities (
  key text primary key,
  description text not null,
  resource text not null,
  action text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists memberships_user_status_idx
  on public.memberships (user_id, status);
create index if not exists memberships_tenant_status_idx
  on public.memberships (tenant_id, status);

create table if not exists public.role_capabilities (
  role_id uuid not null references public.roles(id) on delete cascade,
  capability_key text not null references public.capabilities(key) on delete cascade,
  primary key (role_id, capability_key)
);

create table if not exists public.member_capability_overrides (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  capability_key text not null references public.capabilities(key) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (membership_id, capability_key)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (email = lower(email)),
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invitations_tenant_email_idx
  on public.invitations (tenant_id, email, expires_at)
  where accepted_at is null and revoked_at is null;

create table if not exists public.trial_policies (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('platform', 'tenant')),
  tenant_id uuid references public.tenants(id) on delete cascade,
  enabled boolean not null default true,
  duration_seconds integer not null check (duration_seconds > 0),
  starts_on text not null default 'first_access'
    check (starts_on in ('first_access', 'first_action')),
  max_sessions integer not null default 1 check (max_sessions > 0),
  allow_pdf boolean not null default false,
  allow_checkout boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (
    (scope = 'platform' and tenant_id is null)
    or (scope = 'tenant' and tenant_id is not null)
  )
);

create unique index if not exists trial_policies_platform_unique
  on public.trial_policies (scope)
  where scope = 'platform';
create unique index if not exists trial_policies_tenant_unique
  on public.trial_policies (tenant_id)
  where scope = 'tenant';

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('trial', 'one_time')),
  policy_id uuid references public.trial_policies(id) on delete set null,
  provider_checkout_id text,
  provider_payment_id text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses > 0),
  used_uses integer not null default 0 check (used_uses >= 0 and used_uses <= max_uses),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'consumed', 'expired', 'revoked')),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists access_grants_user_status_idx
  on public.access_grants (user_id, tenant_id, status, created_at desc);
create unique index if not exists access_grants_checkout_unique
  on public.access_grants (provider_checkout_id)
  where provider_checkout_id is not null;
create unique index if not exists access_grants_payment_unique
  on public.access_grants (provider_payment_id)
  where provider_payment_id is not null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('user', 'admin', 'system', 'migration')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_idx
  on public.audit_logs (tenant_id, created_at desc);

create table if not exists public.rate_limit_buckets (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  action text not null,
  window_start timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  max_attempts integer not null check (max_attempts > 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, key, action)
);

create index if not exists rate_limit_buckets_updated_idx
  on public.rate_limit_buckets (updated_at);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists trial_policies_set_updated_at on public.trial_policies;
create trigger trial_policies_set_updated_at
before update on public.trial_policies
for each row execute function public.set_updated_at();

drop trigger if exists access_grants_set_updated_at on public.access_grants;
create trigger access_grants_set_updated_at
before update on public.access_grants
for each row execute function public.set_updated_at();

drop trigger if exists rate_limit_buckets_set_updated_at on public.rate_limit_buckets;
create trigger rate_limit_buckets_set_updated_at
before update on public.rate_limit_buckets
for each row execute function public.set_updated_at();

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

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
      from public.memberships as m
      where m.user_id = p_user_id
        and m.tenant_id = p_tenant_id
        and m.status = 'active'
    );
$$;

create or replace function public.get_effective_capabilities(
  p_user_id uuid,
  p_tenant_id uuid
)
returns table(capability_key text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.key as capability_key
  from public.capabilities as c
  join public.memberships as m
    on m.user_id = p_user_id
   and m.tenant_id = p_tenant_id
   and m.status = 'active'
  left join public.role_capabilities as role_capability
    on role_capability.role_id = m.role_id
   and role_capability.capability_key = c.key
  left join public.member_capability_overrides as deny_override
    on deny_override.membership_id = m.id
   and deny_override.capability_key = c.key
   and deny_override.effect = 'deny'
  left join public.member_capability_overrides as allow_override
    on allow_override.membership_id = m.id
   and allow_override.capability_key = c.key
   and allow_override.effect = 'allow'
  where p_user_id = auth.uid()
    and c.is_active
    and deny_override.membership_id is null
    and (allow_override.membership_id is not null or role_capability.capability_key is not null);
$$;

create or replace function public.has_capability(
  p_user_id uuid,
  p_tenant_id uuid,
  p_capability_key text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.get_effective_capabilities(p_user_id, p_tenant_id) as effective
    where effective.capability_key = p_capability_key
  );
$$;

create or replace function public.consume_access_grant(
  p_grant_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_user_id <> auth.uid() then
    return false;
  end if;

  update public.access_grants as grant_row
  set
    used_uses = grant_row.used_uses + 1,
    status = case
      when grant_row.used_uses + 1 >= grant_row.max_uses then 'consumed'
      else 'active'
    end,
    consumed_at = case
      when grant_row.used_uses + 1 >= grant_row.max_uses then v_now
      else grant_row.consumed_at
    end
  where grant_row.id = p_grant_id
    and grant_row.user_id = p_user_id
    and grant_row.status = 'active'
    and grant_row.starts_at <= v_now
    and (grant_row.expires_at is null or grant_row.expires_at > v_now)
    and grant_row.used_uses < grant_row.max_uses
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = p_user_id
        and profile.kyc_status = 'verified'
    );

  return found;
end;
$$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key text,
  p_action text,
  p_window_seconds integer,
  p_max_attempts integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_attempt_count integer;
  v_max_attempts integer;
begin
  if p_scope is null or p_key is null or p_action is null
     or p_window_seconds <= 0 or p_max_attempts <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Invalid rate limit parameters';
  end if;

  insert into public.rate_limit_buckets (
    scope,
    key,
    action,
    window_start,
    window_seconds,
    max_attempts,
    attempt_count,
    last_attempt_at,
    created_at,
    updated_at
  )
  values (
    p_scope,
    p_key,
    p_action,
    v_now,
    p_window_seconds,
    p_max_attempts,
    1,
    v_now,
    v_now,
    v_now
  )
  on conflict (scope, key, action) do update
  set
    window_start = case
      when public.rate_limit_buckets.window_start
        + make_interval(secs => public.rate_limit_buckets.window_seconds::double precision)
        <= excluded.last_attempt_at
      then excluded.window_start
      else public.rate_limit_buckets.window_start
    end,
    window_seconds = excluded.window_seconds,
    max_attempts = excluded.max_attempts,
    attempt_count = case
      when public.rate_limit_buckets.window_start
        + make_interval(secs => public.rate_limit_buckets.window_seconds::double precision)
        <= excluded.last_attempt_at
      then 1
      else public.rate_limit_buckets.attempt_count + 1
    end,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at
  returning attempt_count, max_attempts
  into v_attempt_count, v_max_attempts;

  return v_attempt_count <= v_max_attempts;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.prevent_audit_log_mutation() from public;
revoke all on function public.is_active_tenant_member(uuid, uuid) from public, anon;
revoke all on function public.get_effective_capabilities(uuid, uuid) from public, anon;
revoke all on function public.has_capability(uuid, uuid, text) from public, anon;
revoke all on function public.consume_access_grant(uuid, uuid) from public, anon;
revoke all on function public.consume_rate_limit(text, text, text, integer, integer) from public, anon, authenticated;

grant execute on function public.is_active_tenant_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_effective_capabilities(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_capability(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.consume_access_grant(uuid, uuid) to authenticated, service_role;
grant execute on function public.consume_rate_limit(text, text, text, integer, integer) to service_role;

insert into public.capabilities (key, description, resource, action)
values
  ('investigations.read', 'Ver investigaciones del tenant según ownership o acceso explícito.', 'investigations', 'read'),
  ('investigations.create', 'Crear nuevas investigaciones dentro del tenant.', 'investigations', 'create'),
  ('investigations.update', 'Editar investigaciones existentes del tenant.', 'investigations', 'update'),
  ('investigations.archive', 'Archivar una investigación en lugar de eliminarla.', 'investigations', 'archive'),
  ('investigations.restore', 'Restaurar una investigación archivada.', 'investigations', 'restore'),
  ('investigations.close', 'Cerrar el ciclo de una investigación.', 'investigations', 'close'),
  ('investigations.export', 'Exportar una investigación (por ejemplo a PDF).', 'investigations', 'export'),
  ('users.read', 'Ver miembros del tenant.', 'users', 'read'),
  ('users.invite', 'Crear invitaciones administrativas para nuevos miembros.', 'users', 'invite'),
  ('users.update', 'Actualizar rol o datos de un miembro existente.', 'users', 'update'),
  ('users.disable', 'Suspender o revocar el acceso de un miembro.', 'users', 'disable'),
  ('access.read', 'Ver roles, capacidades y overrides del tenant.', 'access', 'read'),
  ('access.manage', 'Gestionar roles, capacidades y overrides del tenant.', 'access', 'manage'),
  ('billing.plans.read', 'Ver planes disponibles.', 'billing', 'plans.read'),
  ('billing.checkout.create', 'Iniciar un Checkout de Stripe.', 'billing', 'checkout.create'),
  ('billing.subscription.read', 'Ver el estado de la suscripción del tenant.', 'billing', 'subscription.read'),
  ('billing.subscription.manage', 'Cambiar, cancelar o reactivar la suscripción del tenant.', 'billing', 'subscription.manage'),
  ('billing.invoices.read', 'Ver facturas del tenant.', 'billing', 'invoices.read'),
  ('billing.invoices.download', 'Descargar el PDF de una factura del tenant.', 'billing', 'invoices.download'),
  ('billing.plans.manage', 'Administrar el catálogo de planes de la plataforma.', 'billing', 'plans.manage'),
  ('billing.trial.read', 'Ver la política de prueba vigente.', 'billing', 'trial.read'),
  ('billing.trial.manage', 'Modificar la política de prueba.', 'billing', 'trial.manage'),
  ('billing.entitlements.read', 'Ver los entitlements efectivos del tenant.', 'billing', 'entitlements.read')
on conflict (key) do update
set
  description = excluded.description,
  resource = excluded.resource,
  action = excluded.action,
  is_active = true;

insert into public.roles (key, name, is_system)
values
  ('owner', 'Owner', true),
  ('admin', 'Admin', true),
  ('analyst', 'Analyst', true),
  ('viewer', 'Viewer', true)
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability.key
from public.roles as role_row
cross join public.capabilities as capability
where role_row.tenant_id is null
  and role_row.key = 'owner'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability.key
from public.roles as role_row
cross join public.capabilities as capability
where role_row.tenant_id is null
  and role_row.key = 'admin'
  and capability.key not in ('billing.trial.manage', 'billing.plans.manage')
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability_key
from public.roles as role_row
cross join (
  values
    ('investigations.read'),
    ('investigations.create'),
    ('investigations.update'),
    ('investigations.archive'),
    ('investigations.restore'),
    ('investigations.close'),
    ('investigations.export'),
    ('users.read'),
    ('access.read'),
    ('billing.plans.read'),
    ('billing.subscription.read'),
    ('billing.invoices.read'),
    ('billing.entitlements.read')
) as analyst_capabilities(capability_key)
where role_row.tenant_id is null
  and role_row.key = 'analyst'
on conflict do nothing;

insert into public.role_capabilities (role_id, capability_key)
select role_row.id, capability_key
from public.roles as role_row
cross join (
  values
    ('investigations.read'),
    ('users.read'),
    ('access.read'),
    ('billing.plans.read'),
    ('billing.subscription.read'),
    ('billing.invoices.read'),
    ('billing.entitlements.read')
) as viewer_capabilities(capability_key)
where role_row.tenant_id is null
  and role_row.key = 'viewer'
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.roles enable row level security;
alter table public.capabilities enable row level security;
alter table public.memberships enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.member_capability_overrides enable row level security;
alter table public.invitations enable row level security;
alter table public.trial_policies enable row level security;
alter table public.access_grants enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy tenants_select_member
on public.tenants
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_active_tenant_member(auth.uid(), id)
);

create policy roles_select_visible
on public.roles
for select
to authenticated
using (
  tenant_id is null
  or public.is_active_tenant_member(auth.uid(), tenant_id)
);

create policy capabilities_select_active
on public.capabilities
for select
to authenticated
using (is_active);

create policy memberships_select_visible
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_tenant_member(auth.uid(), tenant_id)
);

create policy role_capabilities_select_visible
on public.role_capabilities
for select
to authenticated
using (
  exists (
    select 1
    from public.roles as role_row
    where role_row.id = role_capabilities.role_id
      and (
        role_row.tenant_id is null
        or public.is_active_tenant_member(auth.uid(), role_row.tenant_id)
      )
  )
);

create policy member_overrides_select_visible
on public.member_capability_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and public.is_active_tenant_member(auth.uid(), membership.tenant_id)
  )
);

create policy member_overrides_insert_managed
on public.member_capability_overrides
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and public.has_capability(auth.uid(), membership.tenant_id, 'access.manage')
  )
);

create policy member_overrides_update_managed
on public.member_capability_overrides
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and public.has_capability(auth.uid(), membership.tenant_id, 'access.manage')
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and public.has_capability(auth.uid(), membership.tenant_id, 'access.manage')
  )
);

create policy member_overrides_delete_managed
on public.member_capability_overrides
for delete
to authenticated
using (
  exists (
    select 1
    from public.memberships as membership
    where membership.id = member_capability_overrides.membership_id
      and public.has_capability(auth.uid(), membership.tenant_id, 'access.manage')
  )
);

create policy invitations_select_managed
on public.invitations
for select
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'users.read')
  or public.has_capability(auth.uid(), tenant_id, 'users.invite')
);

create policy invitations_insert_managed
on public.invitations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_capability(auth.uid(), tenant_id, 'users.invite')
);

create policy trial_policies_select_tenant
on public.trial_policies
for select
to authenticated
using (
  scope = 'tenant'
  and public.has_capability(auth.uid(), tenant_id, 'billing.trial.read')
);

create policy trial_policies_insert_tenant
on public.trial_policies
for insert
to authenticated
with check (
  scope = 'tenant'
  and public.has_capability(auth.uid(), tenant_id, 'billing.trial.manage')
  and updated_by = auth.uid()
);

create policy trial_policies_update_tenant
on public.trial_policies
for update
to authenticated
using (
  scope = 'tenant'
  and public.has_capability(auth.uid(), tenant_id, 'billing.trial.manage')
)
with check (
  scope = 'tenant'
  and public.has_capability(auth.uid(), tenant_id, 'billing.trial.manage')
  and updated_by = auth.uid()
);

create policy trial_policies_delete_tenant
on public.trial_policies
for delete
to authenticated
using (
  scope = 'tenant'
  and public.has_capability(auth.uid(), tenant_id, 'billing.trial.manage')
);

create policy access_grants_select_self_or_member
on public.access_grants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_capability(auth.uid(), tenant_id, 'billing.entitlements.read')
);

create policy audit_logs_select_managed
on public.audit_logs
for select
to authenticated
using (
  tenant_id is not null
  and (
    public.has_capability(auth.uid(), tenant_id, 'access.manage')
    or public.has_capability(auth.uid(), tenant_id, 'billing.plans.manage')
  )
);

grant usage on schema public to authenticated, service_role;
grant select on
  public.profiles,
  public.tenants,
  public.roles,
  public.capabilities,
  public.memberships,
  public.role_capabilities,
  public.member_capability_overrides,
  public.invitations,
  public.trial_policies,
  public.access_grants,
  public.audit_logs
to authenticated;
grant insert, update, delete on
  public.member_capability_overrides,
  public.invitations,
  public.trial_policies
to authenticated;
grant all on
  public.profiles,
  public.tenants,
  public.roles,
  public.capabilities,
  public.memberships,
  public.role_capabilities,
  public.member_capability_overrides,
  public.invitations,
  public.trial_policies,
  public.access_grants,
  public.audit_logs,
  public.rate_limit_buckets
to service_role;

commit;
