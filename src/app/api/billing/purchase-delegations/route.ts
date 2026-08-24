// GET/POST /api/billing/purchase-delegations — lists or grants workspace
// members who may start subscription Checkout when policy is approved_members.
import { NextResponse } from 'next/server'

import { billingPurchaseDelegationRequestSchema, billingWorkspaceIdQuerySchema } from '@/features/billing/schema'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { getPurchaseDelegations, grantPurchaseDelegation } from '@/features/billing/service'
import { BillingError } from '@/features/billing/errors'

const parseWorkspaceId = (request: Request): string => {
  const parsed = billingWorkspaceIdQuerySchema.safeParse({
    workspaceId: new URL(request.url).searchParams.get('workspaceId')
  })

  if (!parsed.success) {
    throw BillingError.validation('El workspace indicado no es válido.')
  }

  return parsed.data.workspaceId
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getPurchaseDelegations(parseWorkspaceId(request)))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, billingPurchaseDelegationRequestSchema)

    return NextResponse.json(await grantPurchaseDelegation(body), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
