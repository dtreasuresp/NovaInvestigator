// POST /api/auth/reset-password
//
// Completes a password reset for the CURRENT session's recovery cookie. The
// existing template UI (`src/views/pages/auth/reset-password/reset-password-
// form.tsx`) only ever sends `{ password }` — it relies on the Supabase
// recovery link the user clicked having already established a recovery
// session in cookies (via the browser client's URL detection before this
// form is submitted). This handler does not — and, restricted to
// `src/app/api/auth/*`, cannot — perform that code exchange itself; it only
// validates that a session already exists and applies the new password to
// it. See report/assumptions for the gap this implies.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { getSupabaseIdentity } from '@/lib/auth/principal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const resetPasswordRequestSchema = z.object({
  password: z.string().min(8).max(200)
})

export async function POST(request: Request) {
  try {
    const identity = await getSupabaseIdentity()

    if (!identity || identity.isAnonymous) {
      throw AuthError.recoverySessionRequired()
    }

    const body = parseWithSchema(resetPasswordRequestSchema, await readJsonBody(request))

    await enforceAuthRateLimit(request, 'reset_password', identity.userId)

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({ password: body.password })

    if (error) {
      throw mapSupabaseAuthError(error)
    }

    return NextResponse.json({ ok: true, messageKey: 'auth.passwordReset' })
  } catch (error) {
    return handleRouteError(error)
  }
}
