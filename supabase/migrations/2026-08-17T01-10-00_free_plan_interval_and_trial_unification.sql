-- ============================================================================
-- Migration: 2026-08-17T01-10-00_free_plan_interval_and_trial_unification.sql
-- Description: Extends plans.interval to allow 'free' interval and seeds the
--              commercial free trial plan into public.plans.
-- ============================================================================

-- 1. Extend interval check constraint on public.plans
alter table public.plans drop constraint if exists plans_interval_check;
alter table public.plans add constraint plans_interval_check
  check (interval in ('free', 'one_time', 'month', 'year'));

-- 2. Update plans_check to allow free interval with amount_minor = 0
alter table public.plans drop constraint if exists plans_check;
alter table public.plans add constraint plans_check
  check (
    (not is_active)
    or (code = 'enterprise')
    or (interval = 'free' and amount_minor = 0)
    or (provider_price_id is not null and amount_minor > 0)
  );

-- 3. Insert or update the standard commercial trial / demo plan in public.plans
insert into public.plans (
  id,
  code,
  name,
  description,
  currency,
  interval,
  duration_seconds,
  amount_minor,
  provider_price_id,
  is_active,
  is_public,
  contact_sales
) values (
  'c0000000-0000-0000-0000-000000000000',
  'trial',
  'Try Demo',
  'Una sesión guiada de investigación completa sin tarjeta de crédito ni cobros posteriores.',
  'USD',
  'free',
  86400,
  0,
  null,
  true,
  true,
  false
)
on conflict (code) do update set
  interval = 'free',
  amount_minor = 0,
  is_active = true,
  is_public = true,
  duration_seconds = coalesce(public.plans.duration_seconds, 86400);

-- 4. Seed trial plan entitlements
insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
values
  ('c0000000-0000-0000-0000-000000000000', 'modules.investigator', 1, true),
  ('c0000000-0000-0000-0000-000000000000', 'investigations.create', 1, true),
  ('c0000000-0000-0000-0000-000000000000', 'investigations.max_active', 1, true),
  ('c0000000-0000-0000-0000-000000000000', 'investigations.export_pdf_monthly', 1, true),
  ('c0000000-0000-0000-0000-000000000000', 'users.max_members', 1, true),
  ('c0000000-0000-0000-0000-000000000000', 'storage.max_bytes', 104857600, true)
on conflict (plan_id, entitlement_key) do update set
  is_enabled = excluded.is_enabled,
  limit_value = excluded.limit_value;
