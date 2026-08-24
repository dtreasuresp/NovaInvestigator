// POST /api/billing/checkout/one-time — creates a Stripe Checkout Session
// (mode: 'payment') for a registered tenant member's pending
// one-time-access grant. Never activates access itself: only the verified webhook
// (`checkout.session.completed`) flips the grant to `active` (plan section
// 7.2, 17.2 — "no activar acceso por redirección del navegador").
import { NextResponse } from 'next/server'

import { checkoutOneTimeRequestSchema } from '@/features/billing/schema'
import { readJsonBody, toErrorResponse, getCorrelationId, withCorrelationId } from '@/features/billing/http'
import { createOneTimeCheckout } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const input = await readJsonBody(request, checkoutOneTimeRequestSchema)
    const result = await createOneTimeCheckout(input, correlationId)

    return withCorrelationId(NextResponse.json(result), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
