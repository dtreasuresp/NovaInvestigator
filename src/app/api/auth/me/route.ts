// GET /api/auth/me
//
// Returns the current principal in the exact shape consumed by `useCurrentUser`.
import { NextResponse } from 'next/server'

import { getCurrentPrincipal } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { AuthError, handleRouteError } from '../_lib/http'

export async function GET() {
  try {
    const principal = await getCurrentPrincipal()

    if (!principal) {
      throw AuthError.authRequired()
    }

    if (principal.isAnonymous) {
      throw AuthError.authRequired()
    }

    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', principal.userId)
      .maybeSingle()

    const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    const metaFirstName = (userMetadata.firstName as string) ?? ''
    const metaLastName = (userMetadata.lastName as string) ?? ''
    const metaFullName = `${metaFirstName} ${metaLastName}`.trim()

    const fullName = profile?.display_name?.trim() || metaFullName || principal.email?.split('@')[0] || 'Usuario'

    return NextResponse.json({
      user: {
        id: principal.userId,
        email: principal.email,
        fullName,
        avatar: profile?.avatar_url ?? (userMetadata.avatarUrl as string) ?? null,
        isAnonymous: false,
        accessMode: 'registered_manual',
        vidStatus: principal.vidStatus
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
