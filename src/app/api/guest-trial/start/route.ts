import { NextResponse, type NextRequest } from 'next/server'

import {
  assertGuestStartAllowed,
  getGuestTrialCookieOptions,
  getGuestTrialEligibilityKeyHash,
  getGuestTrialStatus,
  GUEST_TRIAL_COOKIE_NAME,
  startGuestTrial
} from '@/features/billing/guest-trial-service'
import { getCorrelationId, toErrorResponse, withCorrelationId } from '@/features/billing/http'
import { asBillingClient } from '@/features/billing/db-types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = getCorrelationId(request)

  try {
    const serverClient = asBillingClient(await createSupabaseServerClient())

    await assertGuestStartAllowed(serverClient)

    const existingCookie = request.cookies.get(GUEST_TRIAL_COOKIE_NAME)?.value ?? null
    const existingStatus = await getGuestTrialStatus(existingCookie)

    if (existingStatus?.status === 'active') {
      return withCorrelationId(NextResponse.json({ guestTrial: existingStatus }), correlationId)
    }

    const result = await startGuestTrial(getGuestTrialEligibilityKeyHash(request))
    const response = NextResponse.json({ guestTrial: result.status }, { status: 201 })

    response.cookies.set(
      GUEST_TRIAL_COOKIE_NAME,
      result.cookie.value,
      getGuestTrialCookieOptions(result.cookie.maxAge)
    )

    return withCorrelationId(response, correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
