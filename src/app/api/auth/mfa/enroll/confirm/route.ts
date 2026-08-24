// POST /api/auth/mfa/enroll/confirm
//
// Confirms a pending TOTP enrollment by verifying a code generated in the
// user's authenticator app. On success the factor transitions to
// `verified` and the session is upgraded to AAL2 (the SDK saves the new
// session internally on `verify`).
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../../../_lib/http'
import { enforceAuthRateLimit } from '../../../_lib/rate-limit'

const confirmRequestSchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().trim().min(6).max(8)
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(confirmRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'mfa_verify', user.id)

    // Challenge the pending factor before verifying
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: body.factorId
    })

    if (challengeError || !challengeData) {
      throw AuthError.mfaChallengeExpired()
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: body.factorId,
      challengeId: challengeData.id,
      code: body.code
    })

    if (verifyError) {
      throw AuthError.mfaVerificationFailed()
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}