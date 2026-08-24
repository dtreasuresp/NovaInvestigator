import { NextResponse, type NextRequest } from 'next/server'

import {
  getGuestTrialCookieDeletionOptions,
  getGuestTrialStatus,
  GUEST_TRIAL_COOKIE_NAME
} from '@/features/billing/guest-trial-service'
import { getCorrelationId, toErrorResponse, withCorrelationId } from '@/features/billing/http'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request)
  const cookieValue = request.cookies.get(GUEST_TRIAL_COOKIE_NAME)?.value ?? null

  try {
    const guestTrial = await getGuestTrialStatus(cookieValue)
    const response = NextResponse.json({ guestTrial })

    if (!guestTrial || guestTrial.status === 'claimed') {
      response.cookies.set(GUEST_TRIAL_COOKIE_NAME, '', getGuestTrialCookieDeletionOptions())
    }

    return withCorrelationId(response, correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
