import { NextResponse } from 'next/server'

import { listAdminSubscriptions } from '@/features/billing/admin-service'
import { toErrorResponse } from '@/features/billing/http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const subscriptions = await listAdminSubscriptions()

    return NextResponse.json({ subscriptions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
