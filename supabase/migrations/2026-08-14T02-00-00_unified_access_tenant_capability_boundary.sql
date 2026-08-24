begin;

-- Tenant/global roles must never receive platform capabilities or the
-- platform-only billing capability, including through direct table inserts.
drop policy if exists role_capabilities_insert_managed on public.role_capabilities;
create policy role_capabilities_insert_managed
on public.role_capabilities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.roles as role_row
    join public.capabilities as capability
      on capability.key = role_capabilities.capability_key
     and capability.is_active
    where role_row.id = role_capabilities.role_id
      and (
        (
          role_row.tenant_id is not null
          and role_row.is_system = false
          and not role_capabilities.capability_key like 'platform.%'
          and role_capabilities.capability_key <> 'billing.plans.manage'
          and public.has_capability(auth.uid(), role_row.tenant_id, 'access.manage')
        )
        or (
          public.has_platform_capability(auth.uid(), 'platform.access.capabilities.manage')
          and not role_capabilities.capability_key like 'platform.%'
          and role_capabilities.capability_key <> 'billing.plans.manage'
        )
      )
  )
);

commit;
