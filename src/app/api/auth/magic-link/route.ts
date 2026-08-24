// POST /api/auth/magic-link
//
// Sends a Supabase Auth passwordless magic link to a registered user with a
// confirmed email address.
//
// SECURITY & GOVERNANCE:
// - Only emails belonging to existing, confirmed (email_confirmed_at != null)
//   and active profiles are permitted to request a magic link.
// - Anonymous sessions and unverified emails are rejected with a structured
//   `auth.userNotFoundOrUnverified` error directing the user to register first.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { getSupabaseIdentity } from '@/lib/auth/principal'
import { getApplicationUrl } from '@/lib/billing/config'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const magicLinkRequestSchema = z.object({
  email: z.string().trim().min(1).max(320).email()
})

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(magicLinkRequestSchema, await readJsonBody(request))
    const normalizedEmail = body.email.toLowerCase()

    await enforceAuthRateLimit(request, 'magic_link', normalizedEmail)

    const existingIdentity = await getSupabaseIdentity()

    if (existingIdentity) {
      throw AuthError.alreadyAuthenticated()
    }

    const admin = createSupabaseAdminClient()
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (listError) {
      throw AuthError.authServiceUnavailable()
    }

    const targetUser = users.find(user => user.email?.toLowerCase() === normalizedEmail)

    if (!targetUser || !targetUser.email_confirmed_at) {
      throw AuthError.userNotFoundOrUnverified()
    }

    const { data: profile } = await admin.from('profiles').select('status').eq('id', targetUser.id).maybeSingle()

    if (profile?.status === 'suspended' || profile?.status === 'deleted') {
      throw AuthError.accountSuspended()
    }

    const supabase = await createSupabaseServerClient()
    const redirectUrl = `${getApplicationUrl()}/api/auth/callback`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: body.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl
      }
    })

    if (otpError) {
      throw mapSupabaseAuthError(otpError)
    }

    return NextResponse.json({ ok: true, messageKey: 'auth.magicLinkSent' })
  } catch (error) {
    return handleRouteError(error)
  }
}
