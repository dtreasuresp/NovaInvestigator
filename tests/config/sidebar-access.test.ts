import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Config Imports
import { getAppItemAccess } from '../../src/configs/permissions'
import { navItems } from '../../src/configs/navConfig'

// Util Imports
import { pickCheapestPlanForModule } from '../../src/lib/billing/plan-catalog'
import type { BillingPlan } from '../../src/lib/billing/types'

const plan = (overrides: Partial<BillingPlan>): BillingPlan => ({
  id: `plan-${overrides.code ?? 'x'}`,
  code: overrides.code ?? 'x',
  name: overrides.name ?? 'Plan',
  description: null,
  currency: 'USD',
  interval: 'month',
  durationSeconds: null,
  amountMinor: 1000,
  providerPriceId: null,
  isActive: true,
  features: [],
  limits: {},
  ...overrides
})

const grantAll = () => true
const denyAll = () => false

const grantOnlyModules = (modules: string[]) => {
  const set = new Set(modules)

  return (module: string) => set.has(module)
}

describe('getAppItemAccess', () => {
  it('item sin requisito ni moduleKey es allowed', () => {
    const pricing = navItems.find(group => group.groupLabel === 'User access')?.items.find(
      item => item.label === 'Pricing'
    )

    assert.ok(pricing)
    assert.strictEqual(getAppItemAccess(pricing, grantAll, grantAll), 'allowed')
    assert.strictEqual(getAppItemAccess(pricing, denyAll, denyAll), 'allowed')
  })

  it('Projects (moduleKey kanban) es locked cuando el plan no incluye el módulo', () => {
    const projects = navItems.find(group => group.groupLabel === 'Apps')?.items.find(
      item => item.label === 'Projects'
    )

    assert.ok(projects)
    assert.strictEqual(projects.moduleKey, 'kanban')
    assert.strictEqual(getAppItemAccess(projects, grantAll, grantOnlyModules([])), 'locked')
    assert.strictEqual(getAppItemAccess(projects, grantAll, grantOnlyModules(['kanban'])), 'allowed')
  })

  it('Research (moduleKey investigator) prioriza el módulo sobre el mapeo por label', () => {
    const research = navItems.find(group => group.groupLabel === 'Apps')?.items.find(
      item => item.label === 'Research'
    )

    assert.ok(research)
    assert.strictEqual(research.moduleKey, 'investigator')
    assert.strictEqual(getAppItemAccess(research, denyAll, grantOnlyModules(['investigator'])), 'allowed')
    assert.strictEqual(getAppItemAccess(research, grantAll, grantOnlyModules([])), 'locked')
  })

  it('requisito por capability sin permiso se mantiene hidden', () => {
    const users = navItems.find(group => group.groupLabel === 'Administration')?.items.find(
      item => item.label === 'Users'
    )

    assert.ok(users)
    assert.strictEqual(getAppItemAccess(users, denyAll, grantAll), 'hidden')
    assert.strictEqual(getAppItemAccess(users, grantAll, grantAll), 'allowed')
  })
})

describe('pickCheapestPlanForModule', () => {
  it('elige el plan mensual más barato que incluye el módulo', () => {
    const basic = plan({ code: 'basic', name: 'Basic', amountMinor: 500 })
    const team = plan({ code: 'team', name: 'Team', amountMinor: 1500, features: ['modules.kanban'] })
    const enterprise = plan({ code: 'enterprise', name: 'Enterprise', amountMinor: 3000, features: ['modules.kanban'] })

    assert.equal(pickCheapestPlanForModule([basic, team, enterprise], 'kanban')?.name, 'Team')
  })

  it('normaliza el periodo anual para comparar precios', () => {
    const teamYearly = plan({ code: 'team', name: 'Team', interval: 'year', amountMinor: 12000, features: ['modules.kanban'] })
    const enterprise = plan({ code: 'enterprise', name: 'Enterprise', amountMinor: 900, features: ['modules.kanban'] })

    assert.equal(pickCheapestPlanForModule([teamYearly, enterprise], 'kanban')?.name, 'Enterprise')
  })

  it('excluye planes one-time del criterio de plan mínimo', () => {
    const oneTime = plan({ code: 'one_time_access', name: 'One-time access', interval: 'one_time', amountMinor: 100, features: ['modules.kanban'] })
    const team = plan({ code: 'team', name: 'Team', amountMinor: 1500, features: ['modules.kanban'] })

    assert.equal(pickCheapestPlanForModule([oneTime, team], 'kanban')?.name, 'Team')
  })

  it('devuelve null si ningún plan incluye el módulo', () => {
    const basic = plan({ code: 'basic', name: 'Basic', amountMinor: 500 })

    assert.equal(pickCheapestPlanForModule([basic], 'kanban'), null)
    assert.equal(pickCheapestPlanForModule([], 'investigator'), null)
  })

  it('acepta claves con prefijo modules. y es insensible a mayúsculas', () => {
    const team = plan({ code: 'team', name: 'Team', amountMinor: 1500, features: ['MODULES.KANBAN'] })

    assert.equal(pickCheapestPlanForModule([team], 'modules.kanban')?.name, 'Team')
  })
})