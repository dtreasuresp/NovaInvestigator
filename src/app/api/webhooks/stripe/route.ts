// POST /api/webhooks/stripe — signed, idempotent Stripe webhook endpoint
// (plan section 12.4, 15.3). Verifies the `stripe-signature` header against
// the raw request body before interpreting anything, records the event in
// `billing_webhook_events` for idempotency/audit, and only then updates
// subscriptions/invoices/guest access grants. This is the ONLY place that
// may activate a one-time guest grant or sync a subscription — the
// Checkout success_url never does (plan section 7.2, 17.2).
//
// Uses the service-role client, per plan section 10.4 ("los webhooks de
// Stripe... usarán un cliente administrativo únicamente durante una
// transacción controlada"). Never logs the raw payload, headers, or
// secrets — only the sanitized, already-redacted fields captured by
// `sanitizeStripeEventForStorage` in src/lib/billing/server.ts.
import { NextResponse } from 'next/server'

import { asBillingClient } from '@/features/billing/db-types'
import { BillingError } from '@/features/billing/errors'
import { getCorrelationId, withCorrelationId } from '@/features/billing/http'
import { processStripeWebhookEvent } from '@/features/billing/service'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)
  const rawPayload = await request.text()
  const signatureHeader = request.headers.get('stripe-signature')

  try {
    const client = asBillingClient(createSupabaseAdminClient())
    const result = await processStripeWebhookEvent(rawPayload, signatureHeader, client, correlationId)

    return withCorrelationId(NextResponse.json({ received: true, status: result.status }), correlationId)
  } catch (error) {
    if (BillingError.isBillingError(error)) {
      return withCorrelationId(NextResponse.json(error.toResponseBody(), { status: error.httpStatus }), correlationId)
    }

    // The webhook never logs the raw payload, headers, or secrets — only a
    // safe error-name diagnostic is written to the central logger.
    logger.error('webhook Stripe no pudo procesarse', {
      action: 'webhooks/stripe',
      correlationId,
      details: { error: error instanceof Error ? error.name : typeof error }
    })

    return withCorrelationId(NextResponse.json(BillingError.internal().toResponseBody(), { status: 500 }), correlationId)
  }
}
