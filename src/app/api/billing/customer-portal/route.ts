// POST /api/billing/customer-portal — creates a Stripe Customer Portal
// session for the caller's tenant (plan section 12.5: card management,
// cancellation, and billing history are delegated entirely to Stripe's
// hosted portal). Requires an active tenant membership and
// `billing.subscription.manage`.
import { NextResponse } from 'next/server'

import { toErrorResponse, getCorrelationId, withCorrelationId } from '@/features/billing/http'
import { createPortalSession } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const result = await createPortalSession(correlationId)

    return withCorrelationId(NextResponse.json(result), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
