import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

// Public, browser-safe Supabase client. Uses the publishable/anon key only;
// authorization is enforced by Postgres RLS, never by this client.
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
