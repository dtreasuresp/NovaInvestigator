import { evaluateCommercialGrant } from '@/lib/billing/commercial-access'
import type { CommercialAccessSummary } from '@/lib/billing/types'

import { isSubscriptionUsable } from './entitlement-evaluator'
import type { AccessGrantRow, SubscriptionRow } from '@/features/billing/db-types'

export type CommercialAccessGrantInput = Pick<
  AccessGrantRow,
  'mode' | 'status' | 'starts_at' | 'expires_at' | 'max_uses' | 'used_uses'
> & {
  readonly id?: string
  readonly created_at?: string
}

export interface CommercialAccessEvaluationInput {
  readonly subscription: Pick<SubscriptionRow, 'status' | 'current_period_start' | 'current_period_end'> | null
  readonly planIsActive: boolean
  readonly accessGrant?: CommercialAccessGrantInput | null
  readonly accessGrants?: readonly CommercialAccessGrantInput[]
}

export interface SelectedCommercialGrant {
  readonly grant: CommercialAccessGrantInput
  readonly status: CommercialAccessSummary['status']
}

export const selectCommercialGrant = (
  grants: readonly CommercialAccessGrantInput[],
  now: Date
): SelectedCommercialGrant | null => {
  const evaluated = grants.map(grant => ({
    grant,
    status: evaluateCommercialGrant(
      {
        status: grant.status,
        startsAt: grant.starts_at,
        expiresAt: grant.expires_at,
        maxUses: grant.max_uses,
        usedUses: grant.used_uses
      },
      now
    )
  }))

  return (
    evaluated.find(candidate => candidate.status === 'active') ??
    evaluated.find(candidate => candidate.status === 'expired') ??
    evaluated[0] ??
    null
  )
}

export const evaluateCommercialAccess = (
  input: CommercialAccessEvaluationInput,
  now: Date
): CommercialAccessSummary => {
  if (input.subscription && input.planIsActive && isSubscriptionUsable(input.subscription, now)) {
    return {
      status: 'active',
      source: 'subscription',
      startsAt: input.subscription.current_period_start,
      expiresAt: input.subscription.current_period_end
    }
  }

  const grants = input.accessGrants ?? (input.accessGrant ? [input.accessGrant] : [])
  const selectedGrant = selectCommercialGrant(grants, now)

  return {
    status: selectedGrant?.status ?? 'missing',
    source: selectedGrant?.grant.mode ?? (input.subscription ? 'subscription' : null),
    startsAt: selectedGrant?.grant.starts_at ?? input.subscription?.current_period_start ?? null,
    expiresAt: selectedGrant?.grant.expires_at ?? input.subscription?.current_period_end ?? null
  }
}
