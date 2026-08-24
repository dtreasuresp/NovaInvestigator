import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

// Server-side Supabase client for Server Components, Server Actions and
// Route Handlers. Always create a new instance per request; never cache or
// share this client across requests.
//
// `setAll` may be called from a Server Component render, where Next.js does
// not allow writing cookies. That is expected: Server Components cannot
// refresh the session cookie, so session refresh must happen in a Server
// Action, Route Handler, or the project's `proxy.ts` (Next.js 16 successor
// to Middleware). See doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 8.3.
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component render; ignored because session
          // refresh is handled by a Route Handler, Server Action, or proxy.
        }
      }
    }
  })
}
