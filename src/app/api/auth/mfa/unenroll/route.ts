// POST /api/auth/mfa/unenroll
//
// Removes a verified TOTP factor, effectively disabling two-factor
// authentication for the account.
//
// Supabase requires an AAL2 session to unenroll a verified factor — the
// caller must have already completed the two-steps verification during this
// login session.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { recordAuditEntry } from '@/features/users/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../../_lib/http'
import { enforceAuthRateLimit } from '../../_lib/rate-limit'

const unenrollRequestSchema = z.object({
  factorId: z.string().uuid()
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(unenrollRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'mfa_verify', user.id)

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError || !aalData || aalData.currentLevel !== 'aal2') {
      throw AuthError.mfaAal2Required()
    }

    // Ensure the target factor belongs to the current user and is verified
    // before removing it (defence in depth — the SDK already scopes this to
    // the session user).
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

    if (factorsError || !factorsData) {
      throw AuthError.internal()
    }

    const target = factorsData.totp.find(factor => factor.id === body.factorId && factor.status === 'verified')

    if (!target) {
      throw AuthError.mfaFactorNotFound()
    }

    // Revoke first so a transient Auth response cannot leave application-owned
    // recovery material active after the factor is disabled.
    const admin = createSupabaseAdminClient()

    const { error: revokeError } = await admin.rpc('revoke_mfa_recovery_codes', {
      p_user_id: user.id
    })

    if (revokeError) {
      throw AuthError.internal()
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: body.factorId })

    if (unenrollError) {
      throw AuthError.internal()
    }

    await recordAuditEntry({
      tenantId: null,
      actorUserId: user.id,
      action: 'auth.mfa.disabled',
      entityType: 'mfa_factor',
      entityId: body.factorId,
      source: 'user',
      metadata: {
        recoveryCodesRevoked: true
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
