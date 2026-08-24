import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  EntitlementResolutionError
} from '@/features/access/errors'
import { evaluateEntitlement, isSubscriptionUsable } from '@/features/access/entitlement-evaluator'

const now = new Date('2026-08-09T12:00:00.000Z')

test('accepts an enabled entitlement below its numeric limit', () => {
  assert.deepEqual(
    evaluateEntitlement({
      tenantId: 'tenant-1',
      entitlement: 'investigations.max_active',
      subscriptionId: 'subscription-1',
      planId: 'plan-1',
      planCode: 'basic',
      planIsActive: true,
      entitlementRow: { is_enabled: true, limit_value: '5' },
      usage: 4
    }),
    {
      tenantId: 'tenant-1',
      entitlement: 'investigations.max_active',
      subscriptionId: 'subscription-1',
      planId: 'plan-1',
      planCode: 'basic',
      limit: 5
    }
  )
})

test('fails closed when the entitlement is missing or disabled', () => {
  assert.throws(
    () =>
      evaluateEntitlement({
        tenantId: 'tenant-1',
        entitlement: 'investigations.create',
        subscriptionId: 'subscription-1',
        planId: 'plan-1',
        planCode: 'basic',
        planIsActive: true,
        entitlementRow: null
      }),
    EntitlementRequiredError
  )

  assert.throws(
    () =>
      evaluateEntitlement({
        tenantId: 'tenant-1',
        entitlement: 'investigations.create',
        subscriptionId: 'subscription-1',
        planId: 'plan-1',
        planCode: 'basic',
        planIsActive: true,
        entitlementRow: { is_enabled: false, limit_value: null }
      }),
    EntitlementRequiredError
  )
})

test('rejects usage at or above the entitlement limit', () => {
  assert.throws(
    () =>
      evaluateEntitlement({
        tenantId: 'tenant-1',
        entitlement: 'investigations.max_active',
        subscriptionId: 'subscription-1',
        planId: 'plan-1',
        planCode: 'basic',
        planIsActive: true,
        entitlementRow: { is_enabled: true, limit_value: 5 },
        usage: 5
      }),
    EntitlementLimitExceededError
  )
})

test('rejects malformed entitlement limits without exposing provider errors', () => {
  assert.throws(
    () =>
      evaluateEntitlement({
        tenantId: 'tenant-1',
        entitlement: 'storage.max_bytes',
        subscriptionId: 'subscription-1',
        planId: 'plan-1',
        planCode: 'basic',
        planIsActive: true,
        entitlementRow: { is_enabled: true, limit_value: 'not-a-number' }
      }),
    EntitlementResolutionError
  )
})

test('only active, non-expired subscriptions can grant entitlements', () => {
  assert.equal(
    isSubscriptionUsable(
      {
        status: 'active',
        current_period_start: '2026-08-09T11:00:00.000Z',
        current_period_end: '2026-08-09T13:00:00.000Z'
      },
      now
    ),
    true
  )
  assert.equal(
    isSubscriptionUsable(
      {
        status: 'past_due',
        current_period_start: '2026-08-09T11:00:00.000Z',
        current_period_end: '2026-08-09T13:00:00.000Z'
      },
      now
    ),
    false
  )
  assert.equal(
    isSubscriptionUsable(
      {
        status: 'active',
        current_period_start: '2026-08-09T11:00:00.000Z',
        current_period_end: '2026-08-09T12:00:00.000Z'
      },
      now
    ),
    false
  )
})
