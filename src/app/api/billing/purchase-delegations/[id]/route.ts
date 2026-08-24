// DELETE /api/billing/purchase-delegations/:id — revokes a workspace
// member's delegated ability to start subscription Checkout.
import { NextResponse } from 'next/server'

import { parseRouteId, toErrorResponse } from '@/features/billing/http'
import { billingPurchaseDelegationIdSchema } from '@/features/billing/schema'
import { revokePurchaseDelegation } from '@/features/billing/service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const delegationId = parseRouteId(id, billingPurchaseDelegationIdSchema)

    return NextResponse.json(await revokePurchaseDelegation(delegationId))
  } catch (error) {
    return toErrorResponse(error)
  }
}
