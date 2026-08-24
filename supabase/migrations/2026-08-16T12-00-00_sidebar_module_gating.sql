begin;

-- Registra el módulo Kanban en el catálogo de `platform_modules` para que:
-- 1) `filterInactiveModuleEntitlements` no descarte los entitlements
--    `modules.kanban` de los planes/trials que lo habiliten, y
-- 2) el sidebar pueda calcular el plan mínimo que incluye la app Projects.
-- Idempotente: en bases existentes donde el admin ya gestionó la fila, no la
-- modifica (se omiten name/description/route_prefix propios de la plataforma).
insert into public.platform_modules (
  module_key,
  name,
  description,
  route_prefix,
  is_active,
  display_order
)
values (
  'kanban',
  'Projects',
  'Tablero ágil de proyectos, iniciativas CAME y tareas operativas para clientes NovaStore.',
  '/apps/kanban',
  true,
  20
)
on conflict (module_key) do nothing;

-- Los entitlements `modules.kanban` por plan son configuración de negocio
-- gestionada desde /apps/platform/billing (Selector Inteligente de Módulos).
-- Esta migración deliberadamente no inyecta ni modifica plan_entitlements.

commit;