import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { evaluateCommercialGrant, type CommercialGrantSnapshot } from '../../src/lib/billing/commercial-access'

const createGrant = (overrides: Partial<CommercialGrantSnapshot> = {}): CommercialGrantSnapshot => ({
  status: 'active',
  startsAt: '2026-08-07T10:00:00.000Z',
  expiresAt: '2026-08-07T11:00:00.000Z',
  maxUses: 1,
  usedUses: 0,
  ...overrides
})

describe('commercial access grants', () => {
  it('allows access only inside the server-evaluated window', () => {
    assert.equal(
      evaluateCommercialGrant(createGrant(), new Date('2026-08-07T10:30:00.000Z')),
      'active'
    )
    assert.equal(
      evaluateCommercialGrant(createGrant(), new Date('2026-08-07T09:59:59.000Z')),
      'missing'
    )
    assert.equal(
      evaluateCommercialGrant(createGrant(), new Date('2026-08-07T11:00:00.000Z')),
      'expired'
    )
  })

  it('fails closed for consumed, revoked, pending, and missing grants', () => {
    assert.equal(
      evaluateCommercialGrant(createGrant({ status: 'consumed', usedUses: 1 }), new Date('2026-08-07T10:30:00.000Z')),
      'missing'
    )
    assert.equal(
      evaluateCommercialGrant(createGrant({ status: 'revoked' }), new Date('2026-08-07T10:30:00.000Z')),
      'missing'
    )
    assert.equal(
      evaluateCommercialGrant(createGrant({ status: 'pending' }), new Date('2026-08-07T10:30:00.000Z')),
      'missing'
    )
    assert.equal(evaluateCommercialGrant(null, new Date('2026-08-07T10:30:00.000Z')), 'missing')
  })

  it('keeps an explicitly expired grant expired', () => {
    assert.equal(
      evaluateCommercialGrant(createGrant({ status: 'expired' }), new Date('2026-08-07T10:30:00.000Z')),
      'expired'
    )
  })
})
