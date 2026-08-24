-- Migration: Add tags column to public.teams
-- Date: 2026-08-15

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
