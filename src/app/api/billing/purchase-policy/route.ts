// GET/PATCH /api/billing/purchase-policy — reads or updates the tenant-wide
// policy that controls who may start subscription Checkout.
import { NextResponse } from 'next/server'

import { billingPurchasePolicyRequestSchema } from '@/features/billing/schema'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { getPurchasePolicy, updatePurchasePolicy } from '@/features/billing/service'

export async function GET() {
  try {
    return NextResponse.json(await getPurchasePolicy())
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJsonBody(request, billingPurchasePolicyRequestSchema)

    return NextResponse.json(await updatePurchasePolicy(body))
  } catch (error) {
    return toErrorResponse(error)
  }
}
