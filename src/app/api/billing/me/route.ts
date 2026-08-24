// GET /api/billing/me — real-data source for Billing & Plans tab
// (plan section 13.3), serving guest trials and registered tenant subscriptions.
import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/features/billing/http'
import { getBillingSummary } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const summary = await getBillingSummary()

    return NextResponse.json(summary)
  } catch (error) {
    return toErrorResponse(error)
  }
}
