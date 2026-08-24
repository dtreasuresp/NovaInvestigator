begin;

-- 1. Insert ai_copilot into platform_modules
insert into public.platform_modules (
  module_key,
  name,
  description,
  route_prefix,
  is_active,
  display_order
)
values (
  'ai_copilot',
  'Copiloto IA',
  'Copiloto estratégico de Inteligencia Artificial para análisis DAFO y dictámenes.',
  '/apps/investigator',
  true,
  15
)
on conflict (module_key) do update
set
  name = excluded.name,
  description = excluded.description,
  route_prefix = excluded.route_prefix,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

-- 2. Insert capabilities
insert into public.capabilities (key, resource, action, description)
values
  (
    'investigations.ai_copilot',
    'investigations',
    'ai_copilot',
    'Interactuar con el Copiloto de IA y prompts predefinidos.'
  ),
  (
    'investigations.ai_free_text',
    'investigations',
    'ai_free_text',
    'Uso de chat interactivo libre con el Copiloto de IA.'
  ),
  (
    'investigations.ai_academic_report',
    'investigations',
    'ai_academic_report',
    'Redacción de dictamen metodológico enriquecido con IA.'
  )
on conflict (key) do update
set description = excluded.description;

-- 3. Link capabilities to roles
insert into public.role_capabilities (role_id, capability_key)
select r.id, c.key
from public.roles as r
cross join (
  values
    ('investigations.ai_copilot'),
    ('investigations.ai_free_text'),
    ('investigations.ai_academic_report')
) as c(key)
where r.key in ('owner', 'admin', 'analyst')
on conflict (role_id, capability_key) do nothing;

commit;
