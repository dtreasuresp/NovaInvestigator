-- Migration: Reorganize avatars bucket storage hierarchy to users/ prefix
-- Date: 2026-08-15T01:15:00
-- Author: DGTECNOVA / NovaStore
-- Purpose: Move legacy root avatars into users/ prefix and sync profiles.avatar_url

-- 1. Migrate storage objects in 'avatars' bucket
UPDATE storage.objects 
SET name = 'users/' || name 
WHERE bucket_id = 'avatars' 
  AND name NOT LIKE 'workspaces/%' 
  AND name NOT LIKE 'teams/%' 
  AND name NOT LIKE 'users/%';

-- 2. Update avatar_url in public.profiles to point to new 'users/' path
UPDATE public.profiles 
SET avatar_url = REPLACE(avatar_url, '/object/public/avatars/', '/object/public/avatars/users/')
WHERE avatar_url LIKE '%/storage/v1/object/public/avatars/%'
  AND avatar_url NOT LIKE '%/storage/v1/object/public/avatars/users/%'
  AND avatar_url NOT LIKE '%/storage/v1/object/public/avatars/workspaces/%'
  AND avatar_url NOT LIKE '%/storage/v1/object/public/avatars/teams/%';
