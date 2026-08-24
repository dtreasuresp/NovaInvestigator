// POST /api/auth/logout
//
// Signs out the current Supabase session (registered or anonymous),
// clearing the session cookie via `createSupabaseServerClient()`. Idempotent
// when there is no session at all — signing out is inherently safe to call
// repeatedly, so this never returns an error for "already signed out".
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

import { handleRouteError } from '../_lib/http'
import { enforceAuthRateLimit, getRequestIpKey } from '../_lib/rate-limit'

export async function POST(request: Request) {
  try {
    await enforceAuthRateLimit(request, 'logout', getRequestIpKey(request))

    const supabase = await createSupabaseServerClient()

    await supabase.auth.signOut()

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
