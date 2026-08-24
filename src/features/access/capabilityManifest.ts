// Single source of truth for functional capabilities, matching the
// `capabilities` table seeded by
// `supabase/migrations/2026-08-07T00-00-00_access_foundation.sql`.
//
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 11:
// "El catálogo de base de datos debe coincidir con
// src/features/access/capabilityManifest.ts". If a capability is added,
// removed or renamed here, mirror the change in the SQL seed data in the
// same change set.
//
// Roles are presets of capabilities, not security boundaries by themselves;
// `member_capability_overrides` can grant or deny a capability per member
// regardless of role (see `access-service.ts`).
export const CAPABILITY_MANIFEST = [
  {
    key: 'investigations.read',
    resource: 'investigations',
    action: 'read',
    description: 'Ver investigaciones del tenant según ownership o acceso explícito.'
  },
  {
    key: 'investigations.create',
    resource: 'investigations',
    action: 'create',
    description: 'Crear nuevas investigaciones dentro del tenant.'
  },
  {
    key: 'investigations.update',
    resource: 'investigations',
    action: 'update',
    description: 'Editar investigaciones existentes del tenant.'
  },
  {
    key: 'investigations.archive',
    resource: 'investigations',
    action: 'archive',
    description: 'Archivar una investigación en lugar de eliminarla.'
  },
  {
    key: 'investigations.restore',
    resource: 'investigations',
    action: 'restore',
    description: 'Restaurar una investigación archivada.'
  },
  {
    key: 'investigations.close',
    resource: 'investigations',
    action: 'close',
    description: 'Cerrar el ciclo de una investigación.'
  },
  {
    key: 'investigations.export',
    resource: 'investigations',
    action: 'export',
    description: 'Exportar una investigación (por ejemplo a PDF).'
  },
  {
    key: 'ai.chat',
    resource: 'ai',
    action: 'chat',
    description: 'Chat conversacional de NovAi para toda NovaStore (Investigador, Kanban, Proyectos).'
  },
  {
    key: 'ai.free_chat',
    resource: 'ai',
    action: 'free_chat',
    description: 'Uso de chat libre sin plantillas en NovAi.'
  },
  {
    key: 'ai.report',
    resource: 'ai',
    action: 'report',
    description: 'Generación de dictámenes/reportes con NovAi.'
  },
  {
    key: 'users.read',
    resource: 'users',
    action: 'read',
    description: 'Ver miembros del tenant.'
  },
  {
    key: 'users.invite',
    resource: 'users',
    action: 'invite',
    description: 'Crear invitaciones administrativas para nuevos miembros.'
  },
  {
    key: 'users.update',
    resource: 'users',
    action: 'update',
    description: 'Actualizar rol o datos de un miembro existente.'
  },
  {
    key: 'users.disable',
    resource: 'users',
    action: 'disable',
    description: 'Suspender o revocar el acceso de un miembro.'
  },
  {
    key: 'teams.read',
    resource: 'teams',
    action: 'read',
    description: 'Ver los equipos funcionales y miembros del espacio de trabajo.'
  },
  {
    key: 'teams.create',
    resource: 'teams',
    action: 'create',
    description: 'Crear nuevos equipos de trabajo en el workspace.'
  },
  {
    key: 'teams.update',
    resource: 'teams',
    action: 'update',
    description: 'Editar información, logo y datos de un equipo de trabajo.'
  },
  {
    key: 'teams.members.manage',
    resource: 'teams',
    action: 'members.manage',
    description: 'Añadir, remover o modificar roles de miembros dentro de un equipo.'
  },
  {
    key: 'teams.delete',
    resource: 'teams',
    action: 'delete',
    description: 'Eliminar o archivar un equipo de trabajo.'
  },
  {
    key: 'access.read',
    resource: 'access',
    action: 'read',
    description: 'Ver roles, capacidades y overrides del tenant.'
  },
  {
    key: 'access.manage',
    resource: 'access',
    action: 'manage',
    description: 'Gestionar roles, capacidades y overrides del tenant.'
  },
  {
    key: 'billing.plans.read',
    resource: 'billing',
    action: 'plans.read',
    description: 'Ver planes disponibles.'
  },
  {
    key: 'billing.checkout.create',
    resource: 'billing',
    action: 'checkout.create',
    description: 'Iniciar un Checkout de Stripe.'
  },
  {
    key: 'billing.purchase.manage',
    resource: 'billing',
    action: 'purchase.manage',
    description: 'Configurar la política de compras y aprobar miembros para Checkout del tenant.'
  },
  {
    key: 'billing.subscription.read',
    resource: 'billing',
    action: 'subscription.read',
    description: 'Ver el estado de la suscripción del tenant.'
  },
  {
    key: 'billing.subscription.manage',
    resource: 'billing',
    action: 'subscription.manage',
    description: 'Cambiar, cancelar o reactivar la suscripción del tenant.'
  },
  {
    key: 'billing.invoices.read',
    resource: 'billing',
    action: 'invoices.read',
    description: 'Ver facturas del tenant.'
  },
  {
    key: 'billing.invoices.download',
    resource: 'billing',
    action: 'invoices.download',
    description: 'Descargar el PDF de una factura del tenant.'
  },
  {
    key: 'billing.plans.manage',
    resource: 'billing',
    action: 'plans.manage',
    description: 'Administrar el catálogo de planes de la plataforma.'
  },
  {
    key: 'billing.trial.read',
    resource: 'billing',
    action: 'trial.read',
    description: 'Ver la política de prueba vigente.'
  },
  {
    key: 'billing.trial.start',
    resource: 'billing',
    action: 'trial.start',
    description: 'Iniciar el acceso de prueba autenticado del tenant.'
  },
  {
    key: 'billing.trial.manage',
    resource: 'billing',
    action: 'trial.manage',
    description: 'Modificar la política de prueba del tenant o la plataforma.'
  },
  {
    key: 'billing.entitlements.read',
    resource: 'billing',
    action: 'entitlements.read',
    description: 'Ver los entitlements efectivos del tenant.'
  },
  {
    key: 'platform.tenants.read',
    resource: 'platform.tenants',
    action: 'read',
    description: 'Ver tenants desde el alcance de la plataforma.'
  },
  {
    key: 'platform.tenants.create',
    resource: 'platform.tenants',
    action: 'create',
    description: 'Crear tenants desde el alcance de la plataforma.'
  },
  {
    key: 'platform.tenants.manage',
    resource: 'platform.tenants',
    action: 'manage',
    description: 'Suspender, archivar o actualizar tenants desde la plataforma.'
  },
  {
    key: 'platform.memberships.manage',
    resource: 'platform.memberships',
    action: 'manage',
    description: 'Asignar y administrar membresías iniciales de tenants.'
  },
  {
    key: 'platform.users.read',
    resource: 'platform.users',
    action: 'read',
    description: 'Consultar perfiles necesarios para operaciones de plataforma.'
  },
  {
    key: 'platform.vid.read',
    resource: 'platform.vid',
    action: 'read',
    description: 'Consultar solicitudes VID pendientes desde la plataforma.'
  },
  {
    key: 'platform.vid.review',
    resource: 'platform.vid',
    action: 'review',
    description: 'Aprobar o rechazar verificaciones VID.'
  },
  {
    key: 'platform.billing.manage',
    resource: 'platform.billing',
    action: 'manage',
    description: 'Administrar configuración y operaciones billing de la plataforma.'
  },
  {
    key: 'platform.audit.read',
    resource: 'platform.audit',
    action: 'read',
    description: 'Consultar auditoría de operaciones de plataforma.'
  },
  {
    key: 'platform.access.roles.read',
    resource: 'platform.access.roles',
    action: 'read',
    description: 'Consultar todos los roles de la plataforma, tenants y aplicaciones.'
  },
  {
    key: 'platform.access.roles.manage',
    resource: 'platform.access.roles',
    action: 'manage',
    description: 'Crear, editar y activar roles de plataforma y roles globales.'
  },
  {
    key: 'platform.access.capabilities.read',
    resource: 'platform.access.capabilities',
    action: 'read',
    description: 'Consultar el catálogo completo de capacidades funcionales.'
  },
  {
    key: 'platform.access.capabilities.manage',
    resource: 'platform.access.capabilities',
    action: 'manage',
    description: 'Modificar las capacidades asignadas a cualquier rol administrable.'
  },
  {
    key: 'platform.access.tenant_roles.manage',
    resource: 'platform.access.tenant_roles',
    action: 'manage',
    description: 'Gestionar roles y permisos de cualquier tenant desde la plataforma.'
  },
  {
    key: 'platform.auth.registrations.manage',
    resource: 'platform.auth.registrations',
    action: 'manage',
    description: 'Configurar la retención y limpiar registros de autenticación pendientes.'
  }
] as const

export type CapabilityDefinition = (typeof CAPABILITY_MANIFEST)[number]

export type CapabilityKey = CapabilityDefinition['key']
export type PlatformCapabilityKey = Extract<CapabilityKey, `platform.${string}`> | 'billing.plans.manage'

export const CAPABILITY_KEYS: readonly CapabilityKey[] = CAPABILITY_MANIFEST.map(capability => capability.key)

const TENANT_CAPABILITY_KEYS = CAPABILITY_KEYS.filter(
  capability => !capability.startsWith('platform.') && capability !== 'billing.plans.manage'
)

const PLATFORM_CAPABILITY_KEY_SET: ReadonlySet<string> = new Set(
  CAPABILITY_MANIFEST.filter(
    capability => capability.key.startsWith('platform.') || capability.key === 'billing.plans.manage'
  ).map(capability => capability.key)
)

const CAPABILITY_KEY_SET: ReadonlySet<string> = new Set(CAPABILITY_KEYS)

export function isCapabilityKey(value: string): value is CapabilityKey {
  return CAPABILITY_KEY_SET.has(value)
}

export function isPlatformCapabilityKey(value: string): value is PlatformCapabilityKey {
  return PLATFORM_CAPABILITY_KEY_SET.has(value)
}

// System role presets. Roles are convenience bundles of capabilities; they
// are not the mechanism that enforces access (RLS + capability checks are).
// `anonymous_trial`, `anonymous_one_time` and `invited` are intentionally
// absent: they are access modalities, not roles (see plan section 6).
export const SYSTEM_ROLE_KEYS = ['owner', 'admin', 'analyst', 'viewer'] as const

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number]

// Default capability presets per system role, used only to seed
// `role_capabilities` and as a reference for admin UIs. The database remains
// the source of truth at runtime; this constant must stay in sync with the
// seed data in the SQL migration.
export const DEFAULT_ROLE_CAPABILITIES: Record<SystemRoleKey, readonly CapabilityKey[]> = {
  owner: TENANT_CAPABILITY_KEYS,
  admin: TENANT_CAPABILITY_KEYS.filter(key => key !== 'billing.trial.manage' && key !== 'billing.purchase.manage'),
  analyst: [
    'investigations.read',
    'investigations.create',
    'investigations.update',
    'investigations.archive',
    'investigations.restore',
    'investigations.close',
    'investigations.export',
    'ai.chat',
    'ai.free_chat',
    'ai.report',
    'users.read',
    'teams.read',
    'access.read',
    'billing.plans.read',
    'billing.subscription.read',
    'billing.invoices.read',
    'billing.entitlements.read'
  ],
  viewer: [
    'investigations.read',
    'users.read',
    'teams.read',
    'access.read',
    'billing.plans.read',
    'billing.subscription.read',
    'billing.invoices.read',
    'billing.entitlements.read'
  ]
}
