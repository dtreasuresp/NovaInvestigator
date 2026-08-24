import { NextResponse } from 'next/server'

import { listAdminBillingAuditLogs } from '@/features/billing/admin-service'
import { toErrorResponse } from '@/features/billing/http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const auditLogs = await listAdminBillingAuditLogs()

    return NextResponse.json({ auditLogs }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
