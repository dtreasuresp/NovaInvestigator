'use client'

import { useCallback, useEffect, useState } from 'react'

import type { VidStatus } from '@/lib/supabase/database.types'

export interface CurrentUser {
  id: string
  email: string | null
  fullName: string
  avatar: string | null
  isAnonymous: boolean
  vidStatus: VidStatus | null
  accessMode:
    | 'anonymous_trial'
    | 'anonymous_one_time'
    | 'registered_trial'
    | 'registered_one_time'
    | 'registered_subscription'
    | 'registered_manual'
}

interface AuthMeResponse {
  user?: CurrentUser
  error?: { code?: string; messageKey?: string }
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)

    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      const payload = (await response.json()) as AuthMeResponse

      if (response.ok && payload.user) {
        setUser(payload.user)
        setError(null)
      } else if (response.status === 401 || payload.error?.code === 'AUTH_REQUIRED') {
        setUser(null)
        setError(null)
      } else {
        setError(payload.error?.messageKey ?? 'auth.sessionUnavailable')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'auth.sessionUnavailable')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUser(false)

    // Silent background revalidation when profile/avatar changes (zero loading dialogs or screen blocking)
    const handleProfileUpdated = () => {
      void fetchUser(true)
    }

    window.addEventListener('novastore:profile-updated', handleProfileUpdated)

    return () => {
      window.removeEventListener('novastore:profile-updated', handleProfileUpdated)
    }
  }, [fetchUser])

  return { user, loading, error, refetch: fetchUser }
}
