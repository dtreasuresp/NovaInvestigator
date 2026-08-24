import { NextResponse, type NextRequest } from 'next/server'

import { getApplicationUrl } from '@/lib/billing/config'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import {
  claimGuestTrial,
  getGuestTrialCookieDeletionOptions,
  GUEST_TRIAL_COOKIE_NAME
} from '@/features/billing/guest-trial-service'
import { BillingError } from '@/features/billing/errors'

import { completePendingRegistration } from '../_lib/registration'

const DEFAULT_NEXT_PATH = '/pages/pricing?onboarding=1'

function getSafeNextPath(value: string | null): string {
  const candidate = value?.trim()

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return DEFAULT_NEXT_PATH
  }

  try {
    const destination = new URL(candidate, 'http://auth.local')

    if (destination.origin !== 'http://auth.local') {
      return DEFAULT_NEXT_PATH
    }

    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return DEFAULT_NEXT_PATH
  }
}

function redirectToVerificationError(): NextResponse {
  return NextResponse.redirect(new URL('/pages/auth/verify-email?status=invalid', getApplicationUrl()))
}

function redirectToRegistrationSetup(): NextResponse {
  return NextResponse.redirect(new URL('/pages/auth/login?registration=pending', getApplicationUrl()))
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return redirectToVerificationError()
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectToVerificationError()
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user || !user.email_confirmed_at) {
    await supabase.auth.signOut()

    return redirectToVerificationError()
  }

  try {
    await completePendingRegistration(supabase, user.id)
  } catch (finalizationError) {
    logger.error('Falló la finalización del registro en el callback de autenticación', {
      action: 'api.auth.callback.registration',
      details: { errorType: finalizationError instanceof Error ? finalizationError.name : typeof finalizationError }
    })
    await supabase.auth.signOut()

    return redirectToRegistrationSetup()
  }

  const guestTrialCookie = request.cookies.get(GUEST_TRIAL_COOKIE_NAME)?.value ?? null
  let clearGuestTrialCookie = false

  if (guestTrialCookie) {
    try {
      await claimGuestTrial(supabase, guestTrialCookie)
      clearGuestTrialCookie = true
    } catch (claimError) {
      logger.warn('No se pudo asociar el trial guest durante el callback de autenticación', {
        action: 'api.auth.callback.guest_trial_claim',
        details: {
          errorCode: BillingError.isBillingError(claimError) ? claimError.code : 'UNKNOWN'
        }
      })

      if (BillingError.isBillingError(claimError) && claimError.code === 'TRIAL_UNAVAILABLE') {
        clearGuestTrialCookie = true
      }
    }
  }

  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'))
  const response = NextResponse.redirect(new URL(nextPath, getApplicationUrl()))

  if (clearGuestTrialCookie) {
    response.cookies.set(GUEST_TRIAL_COOKIE_NAME, '', getGuestTrialCookieDeletionOptions())
  }

  return response
}
