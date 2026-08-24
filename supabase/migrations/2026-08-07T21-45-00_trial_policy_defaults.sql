begin;

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
  'platform',
  null,
  true,
  1800,
  'first_access',
  1,
  false,
  true,
  null
)
on conflict do nothing;

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
select
  'tenant',
  tenant.id,
  platform_policy.enabled,
  platform_policy.duration_seconds,
  platform_policy.starts_on,
  platform_policy.max_sessions,
  platform_policy.allow_pdf,
  platform_policy.allow_checkout,
  null
from public.tenants as tenant
cross join public.trial_policies as platform_policy
where platform_policy.scope = 'platform'
  and platform_policy.tenant_id is null
  and not exists (
    select 1
    from public.trial_policies as existing_policy
    where existing_policy.scope = 'tenant'
      and existing_policy.tenant_id = tenant.id
  )
on conflict do nothing;

commit;
