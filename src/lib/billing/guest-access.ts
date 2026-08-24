import type { GuestGrantMode, GuestGrantStatus } from './types'

export interface GuestGrantSnapshot {
  mode: GuestGrantMode
  status: GuestGrantStatus
  startsAt: string
  expiresAt: string | null
  maxUses: number
  usedUses: number
}

export type GuestGrantDecision =
  | { allowed: true; reason: 'active' }
  | { allowed: false; reason: 'not_started' | 'expired' | 'consumed' | 'revoked' | 'inactive' }

const toMilliseconds = (value: string): number => {
  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) throw new Error('La fecha del grant de acceso no es válida.')

  return parsed
}

export const evaluateGuestGrant = (grant: GuestGrantSnapshot, now: Date): GuestGrantDecision => {
  if (grant.status === 'revoked') return { allowed: false, reason: 'revoked' }

  if (grant.status === 'consumed' || grant.usedUses >= grant.maxUses) {
    return { allowed: false, reason: 'consumed' }
  }

  if (!['pending', 'active'].includes(grant.status)) return { allowed: false, reason: 'inactive' }

  const nowMs = now.getTime()
  const startsAtMs = toMilliseconds(grant.startsAt)

  if (nowMs < startsAtMs) return { allowed: false, reason: 'not_started' }

  if (grant.expiresAt && nowMs >= toMilliseconds(grant.expiresAt)) {
    return { allowed: false, reason: 'expired' }
  }

  return { allowed: true, reason: 'active' }
}

export const consumeGuestGrant = (grant: GuestGrantSnapshot, now: Date): GuestGrantSnapshot => {
  const decision = evaluateGuestGrant(grant, now)

  if (!decision.allowed) {
    throw new Error(`El grant de acceso no se puede consumir: ${decision.reason}.`)
  }

  const usedUses = grant.usedUses + 1

  return {
    ...grant,
    usedUses,
    status: usedUses >= grant.maxUses ? 'consumed' : 'active',
    ...(usedUses >= grant.maxUses ? { expiresAt: grant.expiresAt } : {})
  }
}
