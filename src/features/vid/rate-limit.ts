import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRateLimitDefaults } from '@/lib/billing/config'
import { logger } from '@/lib/logger'

import { VidError } from './errors'

export type VidRateLimitAction = 'submit' | 'review'

export async function enforceVidRateLimit(action: VidRateLimitAction, key: string): Promise<void> {
  const defaults = getRateLimitDefaults()
  let admin: ReturnType<typeof createSupabaseAdminClient>

  try {
    admin = createSupabaseAdminClient()
  } catch (error) {
    logger.error('Rate limit de VID omitido: cliente administrativo no disponible', {
      action: 'vid.rate_limit',
      details: { errorType: error instanceof Error ? error.name : typeof error }
    })

    return
  }

  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_scope: 'vid',
    p_key: key,
    p_action: action,
    p_window_seconds: defaults.windowSeconds,
    p_max_attempts: action === 'submit' ? defaults.authenticatedRequests : defaults.checkoutRequests
  })

  if (error) {
    logger.error('Falló la comprobación de rate limit de VID', {
      action: 'vid.rate_limit',
      details: { errorType: error.name ?? 'supabase_error' }
    })

    return
  }

  if (data === false) {
    throw VidError.rateLimited()
  }
}
