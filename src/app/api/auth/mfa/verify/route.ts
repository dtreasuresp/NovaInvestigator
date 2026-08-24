// POST /api/auth/mfa/verify
//
// Verifies a TOTP code for the authenticated user during login (AAL1 → AAL2
// upgrade). Uses the same challenge → verify pattern from the official
// Supabase MFA docs:
//   1. listFactors() → find the unverified TOTP factor
//   2. challenge({ factorId }) → get challengeId
//   3. verify({ factorId, challengeId, code }) → success
//
// On success the session cookie is automatically upgraded from AAL1 to AAL2
// by the Supabase SDK's `_saveSession` hook inside `verify()`.
//
// Rate-limited per user ID under the `mfa_verify` action.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../../_lib/http'
import { enforceAuthRateLimit } from '../../_lib/rate-limit'

const verifyRequestSchema = z.object({
  code: z.string().trim().min(6).max(8)
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(verifyRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'mfa_verify', user.id)

    // ── 1. List factors ────────────────────────────────────────────────
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

    if (factorsError) {
      throw AuthError.internal()
    }

    const totpFactors = factorsData.totp

    if (totpFactors.length === 0) {
      throw AuthError.mfaFactorNotFound()
    }

    // Use the first TOTP factor (there should only be one in opt-in mode)
    const factor = totpFactors[0]

    if (!factor) {
      throw AuthError.mfaFactorNotFound()
    }

    // ── 2. Challenge ───────────────────────────────────────────────────
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id
    })

    if (challengeError) {
      // Challenge creation failed — likely expired or invalid factor state
      throw AuthError.mfaChallengeExpired()
    }

    // ── 3. Verify ──────────────────────────────────────────────────────
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code: body.code
    })

    if (verifyError) {
      // Check if the error is a verification failure
      const errorCode = verifyError.message?.toLowerCase() ?? ''

      if (errorCode.includes('verification failed') || errorCode.includes('invalid')) {
        throw AuthError.mfaVerificationFailed()
      }

      throw AuthError.mfaVerificationFailed()
    }

    // On success the SDK auto-updates the session cookie to AAL2 via
    // `_saveSession` inside `verify()`. No explicit session save needed.

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
