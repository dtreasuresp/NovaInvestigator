begin;

alter table public.profiles
  add column if not exists primary_tenant_id uuid
  references public.tenants(id)
  on delete set null;

create index if not exists profiles_primary_tenant_idx
  on public.profiles (primary_tenant_id);

-- Only backfill an unambiguous primary tenant. Users with multiple
-- self-created tenants must choose explicitly instead of inheriting an
-- arbitrary row order.
update public.profiles as profile
set primary_tenant_id = tenant.id
from public.tenants as tenant
where profile.primary_tenant_id is null
  and tenant.created_by = profile.id
  and exists (
    select 1
    from public.memberships as membership
    where membership.tenant_id = tenant.id
      and membership.user_id = profile.id
      and membership.status = 'active'
  )
  and not exists (
    select 1
    from public.tenants as other_tenant
    where other_tenant.created_by = profile.id
      and other_tenant.id <> tenant.id
  );

commit;
