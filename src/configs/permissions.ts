// Claves de permiso por app del template. 1 permiso por app.
import type { MenuItem } from '@/configs/navConfig'
import type { CapabilityKey } from '@/features/access/capabilityManifest'

export type PermissionKey =
  | 'apps.investigator'
  | 'apps.mail'
  | 'apps.calendar'
  | 'apps.users'
  | 'apps.chat'
  | 'apps.kanban'
  | 'apps.contact'
  | 'apps.roles'

export const ALL_PERMISSIONS: PermissionKey[] = [
  'apps.investigator',
  'apps.mail',
  'apps.calendar',
  'apps.users',
  'apps.chat',
  'apps.kanban',
  'apps.contact',
  'apps.roles'
]

// Conjunto otorgado por defecto. Recórtelo aquí (o desde una fuente real:
// backend, rol, localStorage) para ocultar ítems del sidebar.
export const USER_PERMISSIONS: ReadonlySet<PermissionKey> = new Set<PermissionKey>(ALL_PERMISSIONS)

// Mapeo ítem de menú → clave de permiso (apps con permiso propio).
export const APP_PERMISSION_BY_LABEL: Record<string, PermissionKey> = {
  Research: 'apps.investigator',
  Mail: 'apps.mail',
  Calendar: 'apps.calendar',
  Users: 'apps.users',
  Chat: 'apps.chat',
  Kanban: 'apps.kanban',
  Contact: 'apps.contact',
  'Roles & Permissions': 'apps.roles'
}

type AppAccessRequirement =
  | { module: string; capability?: never }
  | { module?: never; capability: CapabilityKey }

export const APP_ACCESS_BY_LABEL: Record<string, AppAccessRequirement> = {
  Research: { module: 'investigator' },
  Users: { capability: 'users.invite' },
  'Roles & Permissions': { capability: 'access.manage' }
}

export type AppAccessState = 'allowed' | 'locked' | 'hidden'

// Decide el estado de un ítem del grupo Apps en el sidebar:
// - 'locked': el plan del tenant no incluye el módulo requerido (se muestra
//   con candado + tag del plan mínimo, sin navegar a la app).
// - 'hidden': el usuario no tiene la capability RBAC requerida (se oculta).
// - 'allowed': accesible.
export const getAppItemAccess = (
  item: Pick<MenuItem, 'label' | 'moduleKey'>,
  hasCapability: (capability: CapabilityKey | string) => boolean,
  hasModule: (module: string) => boolean
): AppAccessState => {
  if (item.moduleKey) {
    return hasModule(item.moduleKey) ? 'allowed' : 'locked'
  }

  const requirement = APP_ACCESS_BY_LABEL[item.label]

  if (!requirement) {
    return 'allowed'
  }

  return requirement.module !== undefined
    ? hasModule(requirement.module)
      ? 'allowed'
      : 'locked'
    : hasCapability(requirement.capability)
      ? 'allowed'
      : 'hidden'
}

// Un ítem sin permiso propio (o con permiso otorgado) permanece visible.
export const hasAppItemPermission = (
  item: Pick<MenuItem, 'label'>,
  has: (permission: PermissionKey | string) => boolean
): boolean => {
  const permission = APP_PERMISSION_BY_LABEL[item.label]

  return permission ? has(permission) : true
}