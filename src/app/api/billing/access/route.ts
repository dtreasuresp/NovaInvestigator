// GET /api/billing/access — read-only legacy guest-trial status for the current
// anonymous session. Returns `{ guestAccess: null }` for
// registered principals rather than an error, since they simply have no
// guest access to report.
import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/features/billing/http'
import { getGuestAccessStatus } from '@/features/billing/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const result = await getGuestAccessStatus()

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
