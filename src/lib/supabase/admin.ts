import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

// Service-role Supabase client. Bypasses Row Level Security entirely.
//
// STRICT RULES:
// - Never import this module from a Client Component ('use client') or any
//   code bundled for the browser.
// - Only call from trusted server contexts: Route Handlers, Server Actions,
//   and webhook handlers (e.g. Stripe) that have already validated the
//   request (signature, admin capability, etc.).
// - Never forward SUPABASE_SERVICE_ROLE_KEY, this client, or its responses
//   directly to the client without passing through the access/capability
//   guards in `src/features/access`.
export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseAdminClient() must never be called from the browser.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values. SUPABASE_SERVICE_ROLE_KEY must only be set in server environments.'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}
