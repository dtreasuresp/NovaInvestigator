-- Migration: 2026-08-16T23-35-00_plans_visibility_and_contact_sales.sql
-- Description: Adds is_public and contact_sales flags to public.plans to support dynamic catalogue visibility and custom quote / contact sales acquisition modes.

ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS contact_sales BOOLEAN NOT NULL DEFAULT false;

-- Enterprise plan is configured for custom quote / contact sales by default
UPDATE public.plans
SET contact_sales = true
WHERE code = 'enterprise';
