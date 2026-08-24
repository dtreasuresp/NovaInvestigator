import { NextResponse } from 'next/server'

import { listAdminBillingInvoices } from '@/features/billing/admin-service'
import { getCorrelationId, parseQuery, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { adminBillingInvoicesQuerySchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const { tenantId, limit } = parseQuery(request, adminBillingInvoicesQuerySchema)
    const invoices = await listAdminBillingInvoices(tenantId, limit)

    return withCorrelationId(
      NextResponse.json({ invoices }, { headers: { 'Cache-Control': 'private, no-store' } }),
      correlationId
    )
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
