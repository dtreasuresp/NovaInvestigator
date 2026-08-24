// GET /api/billing/invoices/:id — a single invoice for the caller's tenant.
// Requires an active tenant membership and `billing.invoices.read`; tenant
// scope is always derived from the caller's membership, never trusted from
// the URL alone (the repository query filters by tenant_id as well).
import { NextResponse } from 'next/server'

import { invoiceIdParamSchema } from '@/features/billing/schema'
import { parseRouteId, toErrorResponse } from '@/features/billing/http'
import { getInvoice } from '@/features/billing/service'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, invoiceIdParamSchema)
    const invoice = await getInvoice(id)

    return NextResponse.json(invoice)
  } catch (error) {
    return toErrorResponse(error)
  }
}
