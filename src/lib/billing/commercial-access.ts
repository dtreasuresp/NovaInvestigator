import type { AccessGrantStatus } from '@/lib/supabase/database.types'

import type { CommercialAccessStatus } from './types'

export interface CommercialGrantSnapshot {
  status: AccessGrantStatus
  startsAt: string
  expiresAt: string | null
  maxUses: number
  usedUses: number
}

const parseDate = (value: string): number => {
  const parsed = Date.parse(value)

  if (!Number.isFinite(parsed)) {
    throw new Error('La fecha del acceso comercial no es válida.')
  }

  return parsed
}

export const evaluateCommercialGrant = (
  grant: CommercialGrantSnapshot | null,
  now: Date
): CommercialAccessStatus => {
  if (!grant) return 'missing'

  if (grant.status === 'expired') return 'expired'

  if (grant.status !== 'active' || grant.usedUses >= grant.maxUses) {
    return 'missing'
  }

  if (now.getTime() < parseDate(grant.startsAt)) {
    return 'missing'
  }

  if (grant.expiresAt !== null && now.getTime() >= parseDate(grant.expiresAt)) {
    return 'expired'
  }

  return 'active'
}
