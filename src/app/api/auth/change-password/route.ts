// POST /api/auth/change-password
//
// Authenticated password change verification route.
// Validates that the current user knows their existing password before sending
// a secure password update verification email link.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getApplicationUrl } from '@/lib/billing/config'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200)
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(changePasswordRequestSchema, await readJsonBody(request))

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      throw AuthError.authRequired()
    }

    await enforceAuthRateLimit(request, 'reset_password', user.id)

    // Verify the user's current password first
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword
    })

    if (verifyError) {
      throw AuthError.invalidCredentials()
    }

    // Current password verified → send reset/change verification link to user's email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${getApplicationUrl()}/pages/auth/reset-password`
    })

    if (resetError) {
      throw mapSupabaseAuthError(resetError)
    }

    return NextResponse.json({ ok: true, messageKey: 'auth.passwordResetEmailSent' })
  } catch (error) {
    return handleRouteError(error)
  }
}
