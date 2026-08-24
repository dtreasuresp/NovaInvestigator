begin;

-- ==============================================================================
-- NovAi — módulo independiente con ai.* y alias investigations.ai_*
-- SODA: src/features/novai (independiente), src/views/apps/novai, src/app/(pages)/apps/novai
-- Mantiene vínculo Investigador vía adapters, floating para resto, sin floating en NovAi
-- Quota compartida tenant-global limits.ai_queries_monthly/daily (ya existe)
-- ==============================================================================

-- 1. Platform module NovAi independiente (no subordinado a Investigator)
insert into public.platform_modules (
  module_key,
  name,
  description,
  route_prefix,
  is_active,
  display_order
)
values (
  'novai',
  'NovAi',
  'Asistente IA conversacional para toda NovaStore (Investigador, Kanban, Proyectos).',
  '/apps/novai',
  true,
  12
)
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  route_prefix = excluded.route_prefix,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

-- Mantener ai_copilot legacy para compatibilidad billing (no se borra)
-- Si existía con route_prefix /apps/investigator, lo dejamos; NovAi es el nuevo canónico
-- Opcional: alinear ai_copilot a /apps/novai si se quiere unificar, pero se preserva por compat
-- update public.platform_modules set route_prefix='/apps/novai' where module_key='ai_copilot';

-- 2. Capabilities nuevas ai.* (renombrado) + mantener alias investigations.ai_* para compatibilidad
insert into public.capabilities (key, resource, action, description)
values
  ('ai.chat', 'ai', 'chat', 'Chat conversacional general de NovAi (toda NovaStore).'),
  ('ai.free_chat', 'ai', 'free_chat', 'Chat libre sin plantillas en NovAi.'),
  ('ai.report', 'ai', 'report', 'Generación de dictámenes/reportes con NovAi.')
on conflict (key) do update
set description = excluded.description,
    resource = excluded.resource,
    action = excluded.action,
    is_active = true;

-- 3. Grants ai.* a owner/admin/analyst (igual que investigations.ai_*) — SCOPE tenant
insert into public.role_capabilities (role_id, capability_key)
select r.id, c.key
from public.roles as r
cross join (values ('ai.chat'), ('ai.free_chat'), ('ai.report')) as c(key)
where r.key in ('owner','admin','analyst')
  and r.is_system = true
on conflict (role_id, capability_key) do nothing;

-- Alias legacy: asegurar que investigations.ai_* siguen otorgados (ya existen, idempotente)
insert into public.role_capabilities (role_id, capability_key)
select r.id, c.key
from public.roles as r
cross join (values ('investigations.ai_copilot'), ('investigations.ai_free_text'), ('investigations.ai_academic_report')) as c(key)
where r.key in ('owner','admin','analyst')
  and r.is_system = true
on conflict (role_id, capability_key) do nothing;

commit;
