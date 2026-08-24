// Rate limiting for billing checkout/portal endpoints, built on the same
// `consume_rate_limit` SQL function and `rate_limit_buckets` table used by
// `src/app/api/auth/_lib/rate-limit.ts` (plan section 17.3: "Se aplican rate
// limits a inicio anónimo, Checkout, PDF y endpoints de prueba.").
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { getRateLimitDefaults } from '@/lib/billing/config'

import { BillingError } from './errors'

export type BillingRateLimitAction =
  | 'checkout_one_time'
  | 'checkout_subscription'
  | 'checkout_address'
  | 'customer_portal'
  | 'pdf_export'
  | 'trial_start'
  | 'guest_trial_start'

// Consumes one attempt from the named bucket for `key` and throws
// `BillingError.rateLimited()` once the window's attempt budget is
// exhausted. Fails OPEN on infrastructure errors (RPC unreachable, etc.):
// mirrors the auth rate limiter's reasoning — a rate limiter that fails
// closed turns a transient Supabase hiccup into a full billing outage.
export async function enforceBillingRateLimit(action: BillingRateLimitAction, key: string): Promise<void> {
  const defaults = getRateLimitDefaults()

  let admin: ReturnType<typeof createSupabaseAdminClient>

  try {
    admin = createSupabaseAdminClient()
  } catch (configError) {
    logger.warn('Rate limit omitido: admin client no disponible', {
      action: 'billing/rate-limit',
      details: { error: configError instanceof Error ? configError.message : configError }
    })

    return
  }

  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_scope: 'billing',
    p_key: key,
    p_action: action,
    p_window_seconds: defaults.windowSeconds,
    p_max_attempts:
      action === 'pdf_export'
        ? defaults.pdfRequests
        : action === 'guest_trial_start'
          ? defaults.anonymousRequests
          : defaults.checkoutRequests
  })

  if (error) {
    logger.warn('Fallo en la verificación de rate limit', {
      action: 'billing/rate-limit',
      details: { error: error.message }
    })

    return
  }

  if (data === false) {
    throw BillingError.rateLimited()
  }
}
