import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateCommercialAccess,
  selectCommercialGrant,
  type CommercialAccessEvaluationInput
} from '../../src/features/access/commercial-access'

const now = new Date('2026-08-07T10:30:00.000Z')

const createGrant = (
  overrides: Partial<NonNullable<CommercialAccessEvaluationInput['accessGrant']>> = {}
): NonNullable<CommercialAccessEvaluationInput['accessGrant']> => ({
  mode: 'trial',
  status: 'active',
  starts_at: '2026-08-07T10:00:00.000Z',
  expires_at: '2026-08-07T11:00:00.000Z',
  max_uses: 1,
  used_uses: 0,
  ...overrides
})

describe('commercial access evaluator', () => {
  it('allows an active trial grant', () => {
    const result = evaluateCommercialAccess(
      {
        subscription: null,
        planIsActive: false,
        accessGrant: createGrant()
      },
      now
    )

    assert.deepEqual(result, {
      status: 'active',
      source: 'trial',
      startsAt: '2026-08-07T10:00:00.000Z',
      expiresAt: '2026-08-07T11:00:00.000Z'
    })
  })

  it('allows an active one-time grant', () => {
    const result = evaluateCommercialAccess(
      {
        subscription: null,
        planIsActive: false,
        accessGrant: createGrant({ mode: 'one_time' })
      },
      now
    )

    assert.equal(result.status, 'active')
    assert.equal(result.source, 'one_time')
  })

  it('returns expired when the commercial grant window has ended', () => {
    const result = evaluateCommercialAccess(
      {
        subscription: null,
        planIsActive: false,
        accessGrant: createGrant({ expires_at: '2026-08-07T10:30:00.000Z' })
      },
      now
    )

    assert.equal(result.status, 'expired')
  })

  it('fails closed when there is no commercial access', () => {
    const result = evaluateCommercialAccess(
      {
        subscription: null,
        planIsActive: false,
        accessGrant: null
      },
      now
    )

    assert.equal(result.status, 'missing')
  })

  it('prioritizes an active subscription over a grant', () => {
    const result = evaluateCommercialAccess(
      {
        subscription: {
          status: 'active',
          current_period_start: '2026-08-01T00:00:00.000Z',
          current_period_end: '2026-09-01T00:00:00.000Z'
        },
        planIsActive: true,
        accessGrant: createGrant({ status: 'expired' })
      },
      now
    )

    assert.deepEqual(result, {
      status: 'active',
      source: 'subscription',
      startsAt: '2026-08-01T00:00:00.000Z',
      expiresAt: '2026-09-01T00:00:00.000Z'
    })
  })

  it('selects an active grant over a newer pending checkout grant', () => {
    const selected = selectCommercialGrant(
      [
        createGrant({
          id: 'pending-checkout',
          status: 'pending',
          created_at: '2026-08-07T10:20:00.000Z'
        }),
        createGrant({
          id: 'active-trial',
          created_at: '2026-08-07T10:00:00.000Z'
        })
      ],
      now
    )

    assert.equal(selected?.grant.id, 'active-trial')
    assert.equal(selected?.status, 'active')
  })
})
