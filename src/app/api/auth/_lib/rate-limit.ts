// Explicit rate-limit hook for the auth Route Handlers, built on the
// `consume_rate_limit` SQL function and `rate_limit_buckets` table already
// declared in `src/lib/supabase/database.types.ts` (the access foundation
// schema). See doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 17.3: "Se aplican rate limits a inicio anónimo, Checkout, PDF y
// endpoints de prueba."
//
// Uses the service-role client because `rate_limit_buckets` is
// platform-level bookkeeping, not user-owned data, and unauthenticated
// callers (login, register, anonymous, forgot/reset-password) have no
// Postgres session to run this under in the first place.
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRateLimitDefaults } from '@/lib/billing/config'
import { logger } from '@/lib/logger'

import { AuthError } from './http'

// Best-effort client identifier for anonymous/unauthenticated requests.
// Never trusted for anything beyond rate-limit bucketing.
export function getRequestIpKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    const [first] = forwardedFor.split(',')

    if (first?.trim()) return first.trim()
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export type AuthRateLimitAction =
  | 'login'
  | 'register'
  | 'anonymous'
  | 'convert'
  | 'logout'
  | 'forgot_password'
  | 'resend_confirmation'
  | 'reset_password'
  | 'magic_link'
  | 'mfa_verify'
  | 'mfa_recovery'

// Consumes one attempt from the named bucket for `key` and throws
// `AuthError.rateLimited()` once the window's attempt budget is exhausted.
//
// Fails OPEN on infrastructure errors (RPC unreachable, etc.): a rate limiter
// that fails closed turns a transient Supabase hiccup into a full auth
// outage, which is a worse security posture than temporarily allowing a few
// extra attempts through. The failure is still logged (without payload/
// credential data) so it is visible in server logs.
export async function enforceAuthRateLimit(request: Request, action: AuthRateLimitAction, key: string): Promise<void> {
  const defaults = getRateLimitDefaults()
  const maxAttempts = action === 'anonymous' ? defaults.anonymousRequests : defaults.checkoutRequests

  let admin: ReturnType<typeof createSupabaseAdminClient>

  try {
    admin = createSupabaseAdminClient()
  } catch (configError) {
    // Supabase env vars not configured: nothing to rate limit against, and
    // every other Supabase call in this request will fail immediately after
    // anyway, so let that surface the real error instead of masking it here.

    logger.error('Rate limit de autenticación omitido: cliente administrativo no disponible', {
      action: 'auth.rate_limit',
      details: { errorType: configError instanceof Error ? configError.name : typeof configError }
    })

    return
  }

  try {
    const rateLimitPromise = admin.rpc('consume_rate_limit', {
      p_scope: 'auth',
      p_key: key,
      p_action: action,
      p_window_seconds: defaults.windowSeconds,
      p_max_attempts: maxAttempts
    })

    const timeoutPromise = new Promise<{ data: null; error: { name: string } }>(resolve =>
      setTimeout(() => resolve({ data: null, error: { name: 'timeout' } }), 2000)
    )

    const { data, error } = await Promise.race([rateLimitPromise, timeoutPromise])

    if (error) {
      logger.error('Falló la comprobación de rate limit de autenticación', {
        action: 'auth.rate_limit',
        details: { errorType: error.name ?? 'supabase_error' }
      })

      return
    }

    if (data === false) {
      throw AuthError.rateLimited()
    }
  } catch (error) {
    if (AuthError.isAuthError(error)) {
      throw error
    }

    logger.error('Excepción durante la comprobación de rate limit', {
      action: 'auth.rate_limit',
      details: { errorType: error instanceof Error ? error.name : typeof error }
    })
  }
}
