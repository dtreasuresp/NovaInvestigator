import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('centro único de roles y permisos', () => {
  it('usa rutas internas y no enlaces del template externo', () => {
    const navigation = read('src/configs/navConfig.tsx')

    assert.match(navigation, /label: 'Roles',\s+href: '\/apps\/roles'/)
    assert.match(navigation, /label: 'Permissions',\s+href: '\/apps\/permissions'/)
    assert.doesNotMatch(navigation, /shadcn-nextjs-admincn-admin-template\.vercel\.app\/apps\/(roles|permissions)/)
  })

  it('protege las páginas y resuelve una matriz multiámbito', () => {
    const rolesPage = read('src/app/(pages)/apps/roles/page.tsx')
    const permissionsPage = read('src/app/(pages)/apps/permissions/page.tsx')
    const service = read('src/features/users/service.ts')

    assert.match(rolesPage, /getCurrentPrincipal\(\)/)
    assert.match(rolesPage, /listUnifiedPermissionMatrixForAdmin\(\)/)
    assert.match(permissionsPage, /getCurrentPrincipal\(\)/)
    assert.match(permissionsPage, /listUnifiedPermissionMatrixForAdmin\(\)/)
    assert.match(service, /requirePlatformUsersPrincipal/)
    assert.match(service, /requireUsersPrincipal\(CAPABILITIES\.accessRead\)/)
    assert.match(service, /platform\.access\.capabilities\.manage/)
  })

  it('expone mutaciones unificadas con optimistic locking y protección del propio rol', () => {
    const roleRoute = read('src/app/api/admin/roles/[id]/route.ts')
    const disableRoute = read('src/app/api/admin/roles/[id]/disable/route.ts')
    const permissionsRoute = read('src/app/api/admin/roles/[id]/permissions/route.ts')
    const service = read('src/features/users/service.ts')

    assert.match(roleRoute, /patchUnifiedRoleRequestSchema/)
    assert.match(disableRoute, /disableUnifiedAccessRole/)
    assert.match(permissionsRoute, /replaceUnifiedRolePermissionsRequestSchema/)
    assert.match(permissionsRoute, /replaceUnifiedAccessRolePermissions/)
    assert.match(service, /role_version_conflict|updatedAt/)
    assert.match(service, /No puedes modificar el rol de tu propia sesión/)
    assert.match(service, /No puedes modificar las capacidades del rol de tu propia sesión/)
  })

  it('mantiene RLS y alinea el RPC con capabilities.manage para roles tenant', () => {
    const migration = read('supabase/migrations/2026-08-14T00-00-00_unified_access_center.sql')
    const forwardMigration = read('supabase/migrations/2026-08-14T01-00-00_unified_access_capability_manager.sql')

    assert.match(migration, /create policy roles_insert_managed/)
    assert.match(migration, /create policy roles_update_managed/)
    assert.match(migration, /public\.has_capability\(auth\.uid\(\), tenant_id, 'access\.manage'\)/)
    assert.match(migration, /security definer/)
    assert.match(migration, /set search_path = pg_catalog, public/)
    assert.match(forwardMigration, /replace_role_capabilities/)
    assert.match(forwardMigration, /platform\.access\.capabilities\.manage/)
    assert.match(forwardMigration, /revoke all on function public\.replace_role_capabilities/)
  })

  it('muestra la matriz completa y habilita edición según el ámbito administrable', () => {
    const rolesView = read('src/views/apps/access/roles/index.tsx')
    const permissionsView = read('src/views/apps/access/permissions/index.tsx')

    assert.match(rolesView, /memberCount/)
    assert.match(rolesView, /capabilityCount/)
    assert.match(rolesView, /canManage/)
    assert.match(rolesView, /\/api\/admin\/roles/)
    assert.match(permissionsView, /groupedCapabilities/)
    assert.match(permissionsView, /matrix\.overrides/)
    assert.match(permissionsView, /canManageSelectedRole/)
    assert.match(permissionsView, /matrix\.canManageCapabilities \|\| matrix\.canManageTenantRoles/)
    assert.match(permissionsView, /disabled=\{[\s\S]*!canManageSelectedRole/)
  })
})
