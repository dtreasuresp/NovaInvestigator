import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { consumeGuestGrant, evaluateGuestGrant, type GuestGrantSnapshot } from '../../src/lib/billing/guest-access'

const startsAt = '2026-08-07T10:00:00.000Z'

const createGrant = (overrides: Partial<GuestGrantSnapshot> = {}): GuestGrantSnapshot => ({
  mode: 'trial',
  status: 'active',
  startsAt,
  expiresAt: '2026-08-07T11:00:00.000Z',
  maxUses: 1,
  usedUses: 0,
  ...overrides
})

describe('guest access grants', () => {
  it('allows access only inside the configured window', () => {
    assert.deepEqual(evaluateGuestGrant(createGrant(), new Date('2026-08-07T10:30:00.000Z')), {
      allowed: true,
      reason: 'active'
    })
    assert.deepEqual(evaluateGuestGrant(createGrant(), new Date('2026-08-07T09:59:59.000Z')), {
      allowed: false,
      reason: 'not_started'
    })
    assert.deepEqual(evaluateGuestGrant(createGrant(), new Date('2026-08-07T11:00:00.000Z')), {
      allowed: false,
      reason: 'expired'
    })
  })

  it('consumes a one-use grant without allowing a second use', () => {
    const consumed = consumeGuestGrant(createGrant(), new Date('2026-08-07T10:30:00.000Z'))

    assert.equal(consumed.usedUses, 1)
    assert.equal(consumed.status, 'consumed')
    assert.deepEqual(evaluateGuestGrant(consumed, new Date('2026-08-07T10:30:01.000Z')), {
      allowed: false,
      reason: 'consumed'
    })
  })

  it('does not allow revoked grants', () => {
    assert.deepEqual(evaluateGuestGrant(createGrant({ status: 'revoked' }), new Date('2026-08-07T10:30:00.000Z')), {
      allowed: false,
      reason: 'revoked'
    })
  })
})
