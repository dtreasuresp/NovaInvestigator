// POST /api/billing/checkout/address — persists the caller's billing purchase
// address for a workspace they are authorized to buy for. Idempotent on
// (user_id, workspace_id); the security-definer RPC re-checks membership +
// Checkout authorization and writes the audit row.
import { NextResponse } from 'next/server'

import { getCorrelationId, readJsonBody, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { billingPurchaseAddressRequestSchema } from '@/features/billing/schema'
import { savePurchaseAddress } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const input = await readJsonBody(request, billingPurchaseAddressRequestSchema)
    const result = await savePurchaseAddress(input)

    return withCorrelationId(NextResponse.json(result), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}