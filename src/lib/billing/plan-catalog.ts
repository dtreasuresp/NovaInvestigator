import type { BillingPlan } from './types'

const MODULE_PREFIX = 'modules.'

const normalizeModuleKey = (key: string) => key.trim().toLowerCase().replace(MODULE_PREFIX, '')

const periodMonths = (plan: BillingPlan) => (plan.interval === 'year' ? 12 : 1)

/**
 * Plan activo más barato (precio mensualizado) cuyo catálogo (`features`)
 * incluye el módulo pedido. Los planes one-time se excluyen: el "plan mínimo"
 * del sidebar representa una suscripción recurrente. Devuelve null si ningún
 * plan activo ofrece el módulo (el ítem se muestra sin tag, solo con candado).
 */
export function pickCheapestPlanForModule(
  plans: readonly BillingPlan[],
  moduleKey: string
): BillingPlan | null {
  const target = normalizeModuleKey(moduleKey)

  let best: BillingPlan | null = null

  for (const plan of plans) {
    if (plan.interval === 'one_time') {
      continue
    }

    const includesModule = plan.features.some(feature => {
      const normalizedFeature = feature.trim().toLowerCase()

      return normalizedFeature.startsWith(MODULE_PREFIX) && normalizeModuleKey(normalizedFeature) === target
    })

    if (!includesModule) {
      continue
    }

    if (!best) {
      best = plan

      continue
    }

    const candidatePrice = plan.amountMinor / periodMonths(plan)
    const bestPrice = best.amountMinor / periodMonths(best)

    if (candidatePrice < bestPrice) {
      best = plan
    }
  }

  return best
}