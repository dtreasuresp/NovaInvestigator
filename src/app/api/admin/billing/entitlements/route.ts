import { NextResponse } from 'next/server'

import { listAdminTenantEntitlements } from '@/features/billing/admin-service'
import { getCorrelationId, parseQuery, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { adminBillingTenantQuerySchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const { tenantId } = parseQuery(request, adminBillingTenantQuerySchema)
    const entitlements = await listAdminTenantEntitlements(tenantId)

    return withCorrelationId(
      NextResponse.json({ entitlements }, { headers: { 'Cache-Control': 'private, no-store' } }),
      correlationId
    )
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
