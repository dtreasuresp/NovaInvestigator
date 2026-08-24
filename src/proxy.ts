// Next.js 16 Proxy (formerly Middleware). Runs before every matched request.
//
// Per doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section
// 8.3 and `src/lib/supabase/server.ts`'s header comment: Server Components
// cannot write cookies, so refreshing the Supabase session cookie has to
// happen in a Server Action, Route Handler, or here.
//
// This file intentionally does ONLY two things, matching the Next.js
// authentication guide's "optimistic checks" pattern
// (node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Optimistic checks with Proxy (Optional)"):
//   1. Refresh/propagate the Supabase session cookie (`supabase.auth.getUser()`
//      forces a token refresh when the access token is stale).
//   2. Redirect based on the presence/absence of a registered, confirmed
//      session — never based on role, capability, tenant, or entitlement, all
//      of which require a database round trip and MUST be re-checked
//      server-side (Route Handlers / `src/features/access`), not just here. A
//      signed-out user hitting `/apps/*` directly (bypassing this redirect,
//      e.g. a stale prefetch) must still be rejected by the actual data layer.
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { isRegisteredConfirmedUser } from '@/lib/auth/identity-policy'
import type { Database } from '@/lib/supabase/database.types'

// Routes that require a registered user with a confirmed email. This is only
// an optimistic redirect; server-side guards remain the authority.
const PROTECTED_PATH_PREFIXES = [
  '/apps',
  '/billing',
  '/dashboard',
  '/datatable',
  '/forms',
  '/pages/user-profile',
  '/pages/user-settings'
]

const GUEST_TRIAL_COOKIE_NAME = 'novastore_guest_trial'
const GUEST_TRIAL_PATH_PREFIXES = ['/apps/investigator']

// Auth pages a session-holding user should be bounced away from.
const AUTH_ENTRY_PATH_PREFIXES = ['/pages/auth/login', '/pages/auth/register']

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Missing Supabase configuration: let the request through unchanged.
  // Route Handlers/Server Components will raise a clear, actionable error
  // instead of the proxy silently blocking every page.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({ request })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      }
    }
  })

  // Do not read from local storage/cookie contents directly — `getUser()`
  // validates against Supabase and refreshes the access token when needed,
  // which is what keeps the cookie itself trustworthy for later requests.
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const hasRegisteredConfirmedSession = isRegisteredConfirmedUser(user)
  const hasGuestTrialCookie = request.cookies.has(GUEST_TRIAL_COOKIE_NAME)
  const isGuestTrialRoute = matchesPrefix(path, GUEST_TRIAL_PATH_PREFIXES)

  if (
    !hasRegisteredConfirmedSession &&
    matchesPrefix(path, PROTECTED_PATH_PREFIXES) &&
    !(hasGuestTrialCookie && isGuestTrialRoute)
  ) {
    return NextResponse.redirect(new URL('/pages/auth/login', request.url))
  }

  if (hasRegisteredConfirmedSession && matchesPrefix(path, AUTH_ENTRY_PATH_PREFIXES)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  // Skip the Next.js internals, API routes (each Route Handler manages its
  // own auth/session logic), and common static assets.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
}
