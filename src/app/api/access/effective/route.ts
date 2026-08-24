import { NextResponse } from 'next/server'

import { resolveEffectiveAccessSnapshot } from '@/features/access/access-service'
import {
  GUEST_TRIAL_COOKIE_NAME,
  getGuestTrialCookieDeletionOptions
} from '@/features/billing/guest-trial-service'
import { toErrorResponse } from '@/features/billing/http'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const snapshot = await resolveEffectiveAccessSnapshot()

    const response = NextResponse.json(snapshot, {
      headers: { 'cache-control': 'private, no-store' }
    })

    if (snapshot.principal === 'guest' && snapshot.status !== 'active') {
      response.cookies.set(GUEST_TRIAL_COOKIE_NAME, '', getGuestTrialCookieDeletionOptions())
    }

    return response
  } catch (error) {
    return toErrorResponse(error)
  }
}
