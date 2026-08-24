import { cache } from 'react'

import { isRegisteredConfirmedUser } from '@/lib/auth/identity-policy'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Identity states as defined in
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 6.1.
// `invited` is derived from a pending membership, not from Supabase Auth
// alone, so it is resolved by `src/features/access/access-service.ts`
// rather than here.
export type AuthState = 'anonymous' | 'registered' | 'suspended'

export interface SupabaseIdentity {
  userId: string
  email: string | null
  isAnonymous: boolean
}

// Reads the raw Supabase Auth identity for the current request. Returns
// `null` unless the session belongs to a registered user whose email is
// confirmed. This does not query any application table and never throws for
// "no usable session" — callers decide whether that is an error.
//
// Wrapped in React's `cache()` so multiple calls during the same render
// pass reuse a single Supabase round-trip.
export const getSupabaseIdentity = cache(async (): Promise<SupabaseIdentity | null> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  if (!isRegisteredConfirmedUser(user)) {
    return null
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    isAnonymous: false
  }
})
