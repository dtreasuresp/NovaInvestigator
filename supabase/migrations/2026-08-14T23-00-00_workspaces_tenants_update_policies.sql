-- Migration: Ensure workspace and tenant updates are permitted for authorized members
-- Date: 2026-08-14

-- 1. Ensure workspaces update policy covers active tenant members & owners
DROP POLICY IF EXISTS "workspaces_update_managed" ON public.workspaces;
CREATE POLICY "workspaces_update_managed" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT auth.uid())) 
    OR is_active_tenant_member((SELECT auth.uid()), tenant_id)
    OR has_capability((SELECT auth.uid()), tenant_id, 'access.manage')
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid())) 
    OR is_active_tenant_member((SELECT auth.uid()), tenant_id)
    OR has_capability((SELECT auth.uid()), tenant_id, 'access.manage')
  );

-- 2. Ensure tenants update policy covers creators, active members & platform admins
DROP POLICY IF EXISTS "tenants_update_managed" ON public.tenants;
CREATE POLICY "tenants_update_managed" ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR is_active_tenant_member((SELECT auth.uid()), id)
    OR has_platform_capability((SELECT auth.uid()), 'platform.access.roles.manage')
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR is_active_tenant_member((SELECT auth.uid()), id)
    OR has_platform_capability((SELECT auth.uid()), 'platform.access.roles.manage')
  );
