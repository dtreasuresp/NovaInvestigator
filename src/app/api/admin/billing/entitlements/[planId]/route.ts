import { NextResponse } from 'next/server'

import { updateAdminTenantEntitlement } from '@/features/billing/admin-service'
import {
  getCorrelationId,
  parseQuery,
  parseRouteId,
  readJsonBody,
  toErrorResponse,
  withCorrelationId
} from '@/features/billing/http'
import {
  adminBillingEntitlementRequestSchema,
  adminBillingPlanIdParamSchema,
  adminBillingTenantQuerySchema
} from '@/features/billing/schema'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ planId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const correlationId = getCorrelationId(request)

  try {
    const { planId: rawPlanId } = await params
    const planId = parseRouteId(rawPlanId, adminBillingPlanIdParamSchema)
    const { tenantId } = parseQuery(request, adminBillingTenantQuerySchema)
    const body = await readJsonBody(request, adminBillingEntitlementRequestSchema)
    const entitlement = await updateAdminTenantEntitlement(tenantId, planId, body)

    return withCorrelationId(
      NextResponse.json({ entitlement }, { headers: { 'Cache-Control': 'private, no-store' } }),
      correlationId
    )
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
