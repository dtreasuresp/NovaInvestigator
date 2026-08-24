import { NextResponse, type NextRequest } from 'next/server'

import {
  claimGuestTrial,
  getGuestTrialCookieDeletionOptions,
  GUEST_TRIAL_COOKIE_NAME
} from '@/features/billing/guest-trial-service'
import { getCorrelationId, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request)
  const cookieValue = request.cookies.get(GUEST_TRIAL_COOKIE_NAME)?.value ?? null

  try {
    const serverClient = await createSupabaseServerClient()
    const claim = await claimGuestTrial(serverClient, cookieValue)
    const response = NextResponse.json({ claimed: claim !== null, trialAccess: claim })

    response.cookies.set(GUEST_TRIAL_COOKIE_NAME, '', getGuestTrialCookieDeletionOptions())

    return withCorrelationId(response, correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
