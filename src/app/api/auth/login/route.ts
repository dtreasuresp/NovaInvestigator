// POST /api/auth/login
//
// Authenticates a registered user with Supabase Auth (email + password),
// setting the session cookie via `createSupabaseServerClient()`. Also
// enforces the `profiles.status` check server-side — Supabase Auth alone
// does not know about this app's own `suspended`/`deleted` states (plan
// section 6.1), so a successful Supabase sign-in for a suspended profile is
// immediately signed back out.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { completePendingRegistration } from '../_lib/registration'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'

const loginRequestSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
  password: z.string().min(1).max(200)
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(loginRequestSchema, await readJsonBody(request))

    await enforceAuthRateLimit(request, 'login', body.email.toLowerCase())

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password
    })

    if (error || !data.user) {
      throw error ? mapSupabaseAuthError(error) : AuthError.invalidCredentials()
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      throw AuthError.emailNotConfirmed()
    }

    const { data: profile } = await supabase.from('profiles').select('status').eq('id', data.user.id).maybeSingle()

    if (profile?.status === 'suspended' || profile?.status === 'deleted') {
      await supabase.auth.signOut()
      throw AuthError.accountSuspended()
    }

    try {
      await completePendingRegistration(supabase, data.user.id)
    } catch (registrationError) {
      // If the pending registration is not found, the account setup was already completed in the past
      if (
        AuthError.isAuthError(registrationError) &&
        registrationError.code === 'ACCOUNT_SETUP_REQUIRED'
      ) {
        // User setup already completed, proceed
      } else {
        await supabase.auth.signOut()
        throw registrationError
      }
    }

    // ── MFA detection ────────────────────────────────────────────────
    // If the user has enrolled a verified TOTP factor, Supabase Auth keeps
    // the session at AAL1 after password sign-in (opt-in mode). Detect
    // this via `getAuthenticatorAssuranceLevel()` and signal the client
    // to navigate to the two-steps verification screen. The AAL1 session
    // cookie stays in place so the verify endpoint can use it to issue a
    // challenge.
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalData?.nextLevel === 'aal2') {
      return NextResponse.json({ ok: true, mfaRequired: true })
    }

    // Anonymous identities never have a password, so a successful password
    // sign-in here always means a registered account. Reject profiles this
    // app has separately marked suspended/deleted before handing back a
    // live session cookie.
    return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email ?? null } })
  } catch (error) {
    return handleRouteError(error)
  }
}
