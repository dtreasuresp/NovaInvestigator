// POST /api/billing/access/trial — starts or reuses the authenticated
// tenant-scoped Trial grant. The service applies email-confirmation,
// capability, tenant, idempotency, audit, and rate-limit checks.
import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/features/billing/http'
import { startTrial } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const result = await startTrial()

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
