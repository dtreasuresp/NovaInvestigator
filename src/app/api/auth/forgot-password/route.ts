// POST /api/auth/forgot-password
//
// Sends a Supabase Auth password-recovery email. Always responds 200 with a
// generic success message regardless of whether the email is registered —
// Supabase's own `resetPasswordForEmail()` already avoids revealing account
// existence, and this handler preserves that by never branching the HTTP
// response on "found"/"not found".
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getApplicationUrl } from '@/lib/billing/config'

import { handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const forgotPasswordRequestSchema = z.object({
  email: z.string().trim().min(1).max(320).email()
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(forgotPasswordRequestSchema, await readJsonBody(request))

    await enforceAuthRateLimit(request, 'forgot_password', body.email.toLowerCase())

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${getApplicationUrl()}/pages/auth/reset-password`
    })

    // Only surface genuinely actionable failures (e.g. Supabase-side rate
    // limiting). Anything else is swallowed into the same generic success
    // response to avoid leaking whether the email exists.
    if (error && (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit')) {
      throw mapSupabaseAuthError(error)
    }

    return NextResponse.json({ ok: true, messageKey: 'auth.passwordResetEmailSent' })
  } catch (error) {
    return handleRouteError(error)
  }
}
