-- Migration: Workspace, Tenant & Teams Schema Extension with Avatar and Storage Support
-- Date: 2026-08-14

-- 1. Extend workspaces table
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 2. Extend tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 5. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for teams
DROP POLICY IF EXISTS "teams_tenant_read" ON public.teams;
CREATE POLICY "teams_tenant_read" ON public.teams
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "teams_tenant_write" ON public.teams;
CREATE POLICY "teams_tenant_write" ON public.teams
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

-- 7. RLS Policies for team_members
DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams 
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.memberships 
        WHERE user_id = (SELECT auth.uid()) AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "team_members_write" ON public.team_members;
CREATE POLICY "team_members_write" ON public.team_members
  FOR ALL TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams 
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.memberships 
        WHERE user_id = (SELECT auth.uid()) AND status = 'active'
      )
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams 
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.memberships 
        WHERE user_id = (SELECT auth.uid()) AND status = 'active'
      )
    )
  );

-- 8. Storage RLS Policies for avatars bucket
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
CREATE POLICY "avatars_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
