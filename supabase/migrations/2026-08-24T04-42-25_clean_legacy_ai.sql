begin;

-- ==============================================================================
-- Limpieza total legacy ai_copilot / investigations.ai_* → ai.* / modules.novai
-- No hardcodea planes, backfill desde datos existentes y luego borra legacy
-- ==============================================================================

-- 1. Backfill plan_entitlements legacy → novai / ai.*
-- modules.ai_copilot → modules.novai
insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
select pe.plan_id, 'modules.novai', pe.limit_value, pe.is_enabled
from public.plan_entitlements pe
where pe.entitlement_key = 'modules.ai_copilot'
on conflict (plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

-- actions aliases → ai.*
insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
select pe.plan_id, 'actions.ai.chat', pe.limit_value, pe.is_enabled
from public.plan_entitlements pe
where pe.entitlement_key = 'actions.investigations.ai_copilot'
on conflict (plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
select pe.plan_id, 'actions.ai.free_chat', pe.limit_value, pe.is_enabled
from public.plan_entitlements pe
where pe.entitlement_key = 'actions.investigations.ai_free_text'
on conflict (plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, is_enabled)
select pe.plan_id, 'actions.ai.report', pe.limit_value, pe.is_enabled
from public.plan_entitlements pe
where pe.entitlement_key = 'actions.investigations.ai_academic_report'
on conflict (plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

-- Backfill tenant overrides si existen
insert into public.tenant_plan_overrides (tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by)
select tpo.tenant_id, tpo.plan_id, 'modules.novai', tpo.limit_value, tpo.is_enabled, tpo.created_by, tpo.updated_by
from public.tenant_plan_overrides tpo
where tpo.entitlement_key = 'modules.ai_copilot'
on conflict (tenant_id, plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

insert into public.tenant_plan_overrides (tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by)
select tpo.tenant_id, tpo.plan_id, 'actions.ai.chat', tpo.limit_value, tpo.is_enabled, tpo.created_by, tpo.updated_by
from public.tenant_plan_overrides tpo
where tpo.entitlement_key = 'actions.investigations.ai_copilot'
on conflict (tenant_id, plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

insert into public.tenant_plan_overrides (tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by)
select tpo.tenant_id, tpo.plan_id, 'actions.ai.free_chat', tpo.limit_value, tpo.is_enabled, tpo.created_by, tpo.updated_by
from public.tenant_plan_overrides tpo
where tpo.entitlement_key = 'actions.investigations.ai_free_text'
on conflict (tenant_id, plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

insert into public.tenant_plan_overrides (tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by)
select tpo.tenant_id, tpo.plan_id, 'actions.ai.report', tpo.limit_value, tpo.is_enabled, tpo.created_by, tpo.updated_by
from public.tenant_plan_overrides tpo
where tpo.entitlement_key = 'actions.investigations.ai_academic_report'
on conflict (tenant_id, plan_id, entitlement_key) do update
set limit_value = excluded.limit_value, is_enabled = excluded.is_enabled;

-- 2. Borrar legacy de plan_entitlements y overrides
delete from public.plan_entitlements where entitlement_key in ('modules.ai_copilot','actions.investigations.ai_copilot','actions.investigations.ai_free_text','actions.investigations.ai_academic_report');
delete from public.tenant_plan_overrides where entitlement_key in ('modules.ai_copilot','actions.investigations.ai_copilot','actions.investigations.ai_free_text','actions.investigations.ai_academic_report');

-- 3. Borrar capabilities y role_capabilities legacy
delete from public.role_capabilities where capability_key in ('investigations.ai_copilot','investigations.ai_free_text','investigations.ai_academic_report');
delete from public.capabilities where key in ('investigations.ai_copilot','investigations.ai_free_text','investigations.ai_academic_report');

-- 4. Borrar módulo legacy ai_copilot (NovAi es el canónico)
delete from public.platform_modules where module_key = 'ai_copilot';

commit;
