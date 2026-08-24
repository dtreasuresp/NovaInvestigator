// GET /api/billing/checkout/context?workspaceId=<uuid> — hydrates the upgrade
// wizard: caller profile, plan catalog, current plan, billing Checkout
// authorization (for the requested workspace or the caller's default one) and
// the caller's stored billing purchase address. Requires an authenticated,
// active tenant membership (registered actor).
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCorrelationId, parseQuery, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { getCheckoutContext } from '@/features/billing/service'

export const runtime = 'nodejs'

const checkoutContextQuerySchema = z.object({
  workspaceId: z.string().uuid().optional()
})

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const { workspaceId } = parseQuery(request, checkoutContextQuerySchema)
    const result = await getCheckoutContext(workspaceId)

    return withCorrelationId(NextResponse.json(result), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}