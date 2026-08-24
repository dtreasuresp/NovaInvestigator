// POST /api/auth/resend-confirmation
//
// Re-sends Supabase Auth's signup confirmation email without revealing whether
// an address belongs to an account. Invitation links are validated before they
// are attached to the confirmation redirect.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { buildEmailConfirmationRedirect } from '../_lib/email-confirmation'
import { handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { assertPendingInvitation } from '../_lib/invitation'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const resendConfirmationRequestSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
  invitationToken: z.string().trim().min(1).max(256).optional()
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(resendConfirmationRequestSchema, await readJsonBody(request))

    await enforceAuthRateLimit(request, 'resend_confirmation', body.email.toLowerCase())

    if (body.invitationToken) {
      await assertPendingInvitation(createSupabaseAdminClient(), body.invitationToken, body.email)
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: body.email,
      options: {
        emailRedirectTo: buildEmailConfirmationRedirect(body.invitationToken)
      }
    })

    if (error && (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit')) {
      throw mapSupabaseAuthError(error)
    }

    return NextResponse.json({ ok: true, messageKey: 'auth.confirmationEmailSent' })
  } catch (error) {
    return handleRouteError(error)
  }
}
