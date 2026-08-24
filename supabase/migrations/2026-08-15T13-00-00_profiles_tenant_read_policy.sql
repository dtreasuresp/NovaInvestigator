-- Migration: Allow active tenant members to read coworker profiles for team collaboration
-- Date: 2026-08-15

DROP POLICY IF EXISTS "profiles_select_tenant_members" ON public.profiles;

CREATE POLICY "profiles_select_tenant_members" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT m.user_id 
      FROM public.memberships m
      WHERE m.status = 'active'
        AND m.tenant_id IN (
          SELECT my_m.tenant_id 
          FROM public.memberships my_m 
          WHERE my_m.user_id = (SELECT auth.uid()) 
            AND my_m.status = 'active'
        )
    )
  );
