// POST /api/auth/mfa/enroll
//
// Creates a new (unverified) TOTP factor for the authenticated user and
// returns the QR code + secret needed to set up an authenticator app.
//
// Only allows a single verified factor (opt-in mode): if a verified TOTP
// factor already exists, return MFA_ALREADY_ENROLLED.
//
// The enrollment is NOT confirmed — the client must send the code back to
// POST /api/auth/mfa/enroll/confirm to activate the factor.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../../_lib/http'
import { enforceAuthRateLimit } from '../../_lib/rate-limit'

const enrollRequestSchema = z.object({
  friendlyName: z.string().trim().min(1).max(64).optional()
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(enrollRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'mfa_verify', user.id)

    // Only one verified TOTP factor is allowed in opt-in mode
    const { data: factorsData } = await supabase.auth.mfa.listFactors()

    const alreadyVerified = factorsData?.totp.some(factor => factor.status === 'verified')

    if (alreadyVerified) {
      throw AuthError.mfaAlreadyEnrolled()
    }

    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      ...(body.friendlyName ? { friendlyName: body.friendlyName } : {})
    })

    if (enrollError || !enrollData) {
      const errorCode = enrollError?.message?.toLowerCase() ?? ''

      if (errorCode.includes('already') || errorCode.includes('exists')) {
        throw AuthError.mfaAlreadyEnrolled()
      }

      if (errorCode.includes('limit') || errorCode.includes('too many')) {
        throw AuthError.mfaEnrollLimit()
      }

      throw AuthError.internal()
    }

    if (enrollData.type !== 'totp') {
      // Defensive: only TOTP is supported in opt-in mode
      throw AuthError.authServiceUnavailable()
    }

    return NextResponse.json({
      ok: true,
      factor: {
        id: enrollData.id,
        friendlyName: enrollData.friendly_name ?? null,
        qrCode: enrollData.totp.qr_code,
        secret: enrollData.totp.secret,
        uri: enrollData.totp.uri
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
