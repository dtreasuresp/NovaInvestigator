// Single source of truth para etiquetas human-readable de entitlements
// SODA: lib/billing (infra compartida) — consumido por views y features, evita hardcode en views
// No hardcodea planes: mapea entitlement_key → label sin asumir qué plan lo tiene

const ENTITLEMENT_LABELS: Record<string, string> = {
  // NovAi
  'modules.novai': 'Módulo NovAi',
  'limits.ai_queries_monthly': 'Consultas IA mensuales',
  'limits.ai_queries_daily': 'Consultas IA diarias — tope 24h',
  'actions.ai.chat': 'Chat NovAi',
  'actions.ai.free_chat': 'Chat Libre NovAi',
  'actions.ai.report': 'Reportes NovAi',
  // Investigador
  'modules.investigator': 'Módulo de Investigación',
  'investigations.max_active': 'Máx. Investigaciones activas',
  'investigations.export_pdf_monthly': 'Exportaciones PDF/mes',
  'investigations.create': 'Creación de investigaciones',
  'investigations.export': 'Exportación de investigaciones',
  // Usuarios / Teams
  'users.max_members': 'Máx. Miembros/Colaboradores',
  'teams.max_teams': 'Máx. Equipos/Teams',
  // Storage
  'storage.max_bytes': 'Almacenamiento',
  // Kanban
  'kanban.projects_max': 'Máx. Proyectos Kanban',
  'kanban.tasks_max': 'Máx. Tareas Kanban',
  'modules.kanban': 'Módulo Kanban',
  // Plataforma
  'modules.billing': 'Módulo de Facturación',
  'modules.platform': 'Módulo de Plataforma'
}

export function getEntitlementLabel(key: string): string {
  return ENTITLEMENT_LABELS[key] ?? key
}

export function getEntitlementFullLabel(key: string): string {
  const label = getEntitlementLabel(key)
  // Ya incluye técnico entre paréntesis si viene de catálogo, pero para claves custom muestra ambos
  return label === key ? key : `${label} (${key})`
}
