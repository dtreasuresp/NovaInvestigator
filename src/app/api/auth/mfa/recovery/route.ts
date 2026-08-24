// POST /api/auth/mfa/recovery
//
// Generates a fresh one-time batch of MFA recovery codes for an already
// AAL2-verified session. Supabase Auth does not consume custom application
// recovery codes or elevate an AAL1 session, so this endpoint deliberately
// does not pretend to be a login fallback.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { recordAuditEntry } from '@/features/users/audit'
import { generateMfaRecoveryCodeBatch } from '@/lib/auth/mfa-recovery-codes'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../../_lib/http'
import { enforceAuthRateLimit } from '../../_lib/rate-limit'

const recoveryRequestSchema = z
  .object({
    regenerate: z.literal(true).optional()
  })
  .strict()

export async function POST(request: Request) {
  try {
    parseWithSchema(recoveryRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'mfa_recovery', user.id)

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError || !aalData || aalData.currentLevel !== 'aal2') {
      throw AuthError.mfaAal2Required()
    }

    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

    if (factorsError || !factorsData) {
      throw AuthError.internal()
    }

    const hasVerifiedTotp = factorsData.totp.some(factor => factor.status === 'verified')

    if (!hasVerifiedTotp) {
      throw AuthError.mfaFactorNotFound()
    }

    const batch = generateMfaRecoveryCodeBatch()
    const admin = createSupabaseAdminClient()

    const { data: insertedCount, error: replaceError } = await admin.rpc('replace_mfa_recovery_codes', {
      p_user_id: user.id,
      p_generation_id: batch.generationId,
      p_code_hashes: batch.hashes
    })

    if (replaceError || insertedCount !== batch.hashes.length) {
      throw AuthError.internal()
    }

    await recordAuditEntry({
      tenantId: null,
      actorUserId: user.id,
      action: 'auth.mfa.recovery_codes.generated',
      entityType: 'mfa_recovery_codes',
      entityId: user.id,
      source: 'user',
      metadata: {
        generationId: batch.generationId,
        count: batch.codes.length
      }
    })

    return NextResponse.json(
      {
        ok: true,
        recovery: {
          generationId: batch.generationId,
          codes: batch.codes
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
