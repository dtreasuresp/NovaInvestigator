// POST /api/billing/checkout/subscription — creates a Stripe Checkout
// Session (mode: 'subscription') for the caller's tenant. Requires an
// active tenant membership and `billing.checkout.create`; never trusts a
// client-supplied tenant/plan price, only the server-validated plan row.
import { NextResponse } from 'next/server'

import { checkoutSubscriptionRequestSchema } from '@/features/billing/schema'
import { readJsonBody, toErrorResponse, getCorrelationId, withCorrelationId } from '@/features/billing/http'
import { createSubscriptionCheckout } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const input = await readJsonBody(request, checkoutSubscriptionRequestSchema)
    const result = await createSubscriptionCheckout(input, correlationId)

    return withCorrelationId(NextResponse.json(result), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
