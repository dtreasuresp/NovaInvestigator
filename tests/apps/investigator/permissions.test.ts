import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Config Imports
import { getAppItemAccess } from '../../../src/configs/permissions'
import { navItems } from '../../../src/configs/navConfig'

const allCaps = () => true
const noCaps = () => false
const allModules = () => true
const noModules = () => false

const only = (keys: string[]) => {
  const set = new Set(keys)

  return (module: string) => set.has(module)
}

describe('sidebar gating', () => {
  it('con permisos por defecto, el ítem Investigator permanece visible', () => {
    const investigator = navItems
      .find(group => group.groupLabel === 'Apps')
      ?.items.find(item => item.label === 'Investigator')

    assert.ok(investigator)
    assert.strictEqual(getAppItemAccess(investigator, allCaps, allModules), 'allowed')
  })

  it('sin el módulo requerido, los ítems con moduleKey quedan bloqueados (locked)', () => {
    const apps = navItems.find(group => group.groupLabel === 'Apps')?.items || []
    const projects = apps.find(item => item.label === 'Projects')
    const investigator = apps.find(item => item.label === 'Investigator')

    assert.ok(projects)
    assert.ok(investigator)
    assert.strictEqual(getAppItemAccess(projects, allCaps, noModules), 'locked')
    assert.strictEqual(getAppItemAccess(investigator, allCaps, noModules), 'locked')
  })

  it('un ítem sin requisito propio nunca se oculta ni se bloquea', () => {
    const investigations = navItems
      .find(group => group.groupLabel === 'Dashboard')
      ?.items.find(item => item.label === 'Investigations')

    assert.ok(investigations)
    assert.strictEqual(getAppItemAccess(investigations, noCaps, noModules), 'allowed')
  })

  it('sin la capability requerida, un ítem sin moduleKey se oculta (hidden)', () => {
    const roles = navItems
      .find(group => group.groupLabel === 'Administration')
      ?.items.find(item => item.label === 'Roles & Permissions')

    assert.ok(roles)
    assert.strictEqual(getAppItemAccess(roles, noCaps, allModules), 'hidden')
  })

  it('sin acceso al módulo investigator, la app no desaparece: se bloquea', () => {
    const apps = navItems.find(group => group.groupLabel === 'Apps')?.items || []
    const states = new Map(apps.map(item => [item.label, getAppItemAccess(item, noCaps, only(['kanban']))]))
    const visible = apps.filter(item => states.get(item.label) !== 'hidden').map(item => item.label)

    // Projects queda 'allowed' (módulo kanban otorgado), Investigator y NovAi 'locked'
    // (módulo investigator denegado): ninguno se oculta, el candado los mantiene.
    assert.deepEqual(
      [...states.entries()].sort(),
      [
        ['Investigator', 'locked'],
        ['NovAi', 'locked'],
        ['Projects', 'allowed']
      ]
    )
    assert.deepEqual(visible, ['NovAi', 'Projects', 'Investigator'])
  })
})