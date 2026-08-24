import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

// Public, browser-safe Supabase client. Uses the publishable/anon key only;
// authorization is enforced by Postgres RLS, never by this client.
export function createSupabaseBrowserClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key'

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
