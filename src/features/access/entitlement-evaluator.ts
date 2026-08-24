import {
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  EntitlementResolutionError
} from './errors'

export interface SubscriptionSnapshot {
  status: string
  current_period_start: string | null
  current_period_end: string | null
}

export interface EntitlementEvaluationInput {
  tenantId: string
  entitlement: string
  subscriptionId: string | null
  planId: string | null
  planCode: string
  planIsActive: boolean
  entitlementRow: {
    is_enabled: boolean
    limit_value: number | string | null
  } | null
  usage?: number
}

export interface ResolvedEntitlement {
  tenantId: string
  entitlement: string
  subscriptionId: string | null
  planId: string | null
  planCode: string
  limit: number | null
}

export function isSubscriptionUsable(subscription: SubscriptionSnapshot, now: Date): boolean {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false
  }

  const periodStart = subscription.current_period_start ? Date.parse(subscription.current_period_start) : null
  const periodEnd = subscription.current_period_end ? Date.parse(subscription.current_period_end) : null
  const nowMillis = now.getTime()

  if (periodStart !== null && (!Number.isFinite(periodStart) || periodStart > nowMillis)) {
    return false
  }

  if (periodEnd !== null && (!Number.isFinite(periodEnd) || periodEnd <= nowMillis)) {
    return false
  }

  return true
}

export function evaluateEntitlement(input: EntitlementEvaluationInput): ResolvedEntitlement {
  const entitlement = input.entitlement.trim()

  if (
    entitlement.length === 0 ||
    !input.planIsActive ||
    !input.entitlementRow ||
    !input.entitlementRow.is_enabled
  ) {
    throw new EntitlementRequiredError(input.tenantId, entitlement)
  }

  const rawLimit = input.entitlementRow.limit_value
  let limit: number | null = null

  if (rawLimit !== null) {
    if (typeof rawLimit === 'string' && rawLimit.trim().length === 0) {
      throw new EntitlementResolutionError()
    }

    limit = Number(rawLimit)

    if (!Number.isFinite(limit) || limit < 0) {
      throw new EntitlementResolutionError()
    }
  }

  if (input.usage !== undefined) {
    if (!Number.isFinite(input.usage) || input.usage < 0) {
      throw new EntitlementResolutionError()
    }

    if (limit !== null && input.usage >= limit) {
      throw new EntitlementLimitExceededError(input.tenantId, entitlement, limit, input.usage)
    }
  }

  return {
    tenantId: input.tenantId,
    entitlement,
    subscriptionId: input.subscriptionId,
    planId: input.planId,
    planCode: input.planCode,
    limit
  }
}
