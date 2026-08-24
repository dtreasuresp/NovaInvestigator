import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

import { createLogger } from '../../src/lib/logger'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('billing correlation ids', () => {
  it('propagates the request id through checkout and webhook boundaries', () => {
    const oneTimeRoute = read('src/app/api/billing/checkout/one-time/route.ts')
    const subscriptionRoute = read('src/app/api/billing/checkout/subscription/route.ts')
    const portalRoute = read('src/app/api/billing/customer-portal/route.ts')
    const webhookRoute = read('src/app/api/webhooks/stripe/route.ts')
    const service = read('src/features/billing/service.ts')

    assert.match(oneTimeRoute, /createOneTimeCheckout\(input, correlationId\)/)
    assert.match(subscriptionRoute, /createSubscriptionCheckout\(input, correlationId\)/)
    assert.match(portalRoute, /createPortalSession\(correlationId\)/)
    assert.match(webhookRoute, /processStripeWebhookEvent\(rawPayload, signatureHeader, client, correlationId\)/)
    assert.match(service, /closeActiveTrialGrantsByTenant\(client, tenantId, userId \?\? null, correlationId\)/)
  })

  it('stores the correlation id in the upgrade audit metadata', () => {
    const migration = read('supabase/migrations/2026-08-10T02-00-00_billing_correlation_ids.sql')

    assert.match(migration, /p_correlation_id text default null/)
    assert.match(migration, /'correlation_id', v_correlation_id/)
    assert.match(migration, /correlation_id_invalid/)
  })
})

describe('central logger failure handling', () => {
  it('emits a safe diagnostic instead of silently swallowing serialization failures', () => {
    const originalConsoleError = console.error
    const output: unknown[][] = []
    const circularDetails: Record<string, unknown> = {}

    circularDetails.self = circularDetails

    console.error = (...args: unknown[]) => {
      output.push(args)
    }

    try {
      createLogger().info('test', { details: circularDetails })
    } finally {
      console.error = originalConsoleError
    }

    assert.equal(output.length, 1)
    assert.match(String(output[0]?.[0]), /application_logger_failed/)
  })
})
