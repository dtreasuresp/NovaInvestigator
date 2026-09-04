import type { ReactNode } from 'react'

import { getCurrentPrincipal } from '@/features/access'
import { resolveEffectiveAccessSnapshot } from '@/features/access/access-service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import PagesClientLayout from './layout-client'
import type { CurrentUser } from '@/hooks/use-current-user'
import type { EffectiveAccessSnapshot } from '@/features/access/types'

export const dynamic = 'force-dynamic'

export default async function PagesLayout({ children }: Readonly<{ children: ReactNode }>) {
  let initialUser: CurrentUser | null = null
  let initialSnapshot: EffectiveAccessSnapshot | null = null

  try {
    const [principal, snapshot] = await Promise.all([
      getCurrentPrincipal().catch(() => null),
      resolveEffectiveAccessSnapshot().catch(() => null)
    ])

    initialSnapshot = snapshot

    if (principal && !principal.isAnonymous) {
      const supabase = await createSupabaseServerClient()
      const [{ data: authUserData }, { data: profile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('display_name, avatar_url').eq('id', principal.userId).maybeSingle()
      ])

      const userMetadata = (authUserData?.user?.user_metadata ?? {}) as Record<string, unknown>
      const metaFirstName = (userMetadata.firstName as string) ?? ''
      const metaLastName = (userMetadata.lastName as string) ?? ''
      const metaFullName = `${metaFirstName} ${metaLastName}`.trim()
      const fullName = profile?.display_name?.trim() || metaFullName || principal.email?.split('@')[0] || 'Usuario'

      initialUser = {
        id: principal.userId,
        email: principal.email,
        fullName,
        avatar: profile?.avatar_url ?? (userMetadata.avatarUrl as string) ?? null,
        isAnonymous: false,
        accessMode: 'registered_manual',
        vidStatus: principal.vidStatus
      }
    }
  } catch {
    // Fail-safe: client hooks will transparently fetch if server-side resolution fails
  }

  return (
    <PagesClientLayout initialSnapshot={initialSnapshot} initialUser={initialUser}>
      {children}
    </PagesClientLayout>
  )
}
