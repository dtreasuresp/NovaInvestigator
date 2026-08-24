// GET /api/auth/mfa/status
//
// Returns the current MFA status for the authenticated user:
//   - currentLevel / nextLevel (AAL1 vs AAL2)
//   - list of verified TOTP factors
//
// Follows the same auth pattern as every Route Handler under src/app/api/auth:
// createSupabaseServerClient → getUser → map Supabase errors to AuthError.
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError } from '../../_lib/http'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError) {
      throw AuthError.internal()
    }

    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

    if (factorsError) {
      throw AuthError.internal()
    }

    const verifiedTotp = factorsData.totp.filter(f => f.status === 'verified')

    return NextResponse.json({
      ok: true,
      mfa: {
        currentLevel: aalData.currentLevel,
        nextLevel: aalData.nextLevel,
        factors: verifiedTotp.map(f => ({
          id: f.id,
          friendlyName: f.friendly_name,
          createdAt: f.created_at
        }))
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
