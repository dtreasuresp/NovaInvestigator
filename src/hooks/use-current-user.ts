'use client'

import { createContext, createElement, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

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

export interface CurrentUserContextValue {
  user: CurrentUser | null
  loading: boolean
  error: string | null
  refetch: (isSilent?: boolean) => Promise<void>
  setUser: (user: CurrentUser | null) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

let inFlightUserPromise: Promise<AuthMeResponse> | null = null
let cachedUser: CurrentUser | null = null

export async function fetchCurrentUserShared(): Promise<AuthMeResponse> {
  if (inFlightUserPromise) {
    return inFlightUserPromise
  }

  inFlightUserPromise = (async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      const payload = (await response.json()) as AuthMeResponse

      if (response.ok && payload.user) {
        cachedUser = payload.user
      } else if (response.status === 401 || payload.error?.code === 'AUTH_REQUIRED') {
        cachedUser = null
      }

      return payload
    } finally {
      inFlightUserPromise = null
    }
  })()

  return inFlightUserPromise
}

export interface CurrentUserProviderProps {
  children: ReactNode
  initialUser?: CurrentUser | null
}

export const CurrentUserProvider = ({ children, initialUser = null }: CurrentUserProviderProps) => {
  const [user, setUser] = useState<CurrentUser | null>(initialUser ?? cachedUser)
  const [loading, setLoading] = useState(!initialUser && !cachedUser)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async (isSilent = false) => {
    if (!isSilent && !user) setLoading(true)

    try {
      const payload = await fetchCurrentUserShared()

      if (payload.user) {
        setUser(payload.user)
        setError(null)
      } else if (payload.error?.code === 'AUTH_REQUIRED') {
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
  }, [user])

  useEffect(() => {
    if (initialUser && !user) {
      setUser(initialUser)
      setLoading(false)
    } else if (!user && !initialUser && !cachedUser) {
      void fetchUser(false)
    }

    const handleProfileUpdated = () => {
      void fetchUser(true)
    }

    window.addEventListener('novastore:profile-updated', handleProfileUpdated)

    return () => {
      window.removeEventListener('novastore:profile-updated', handleProfileUpdated)
    }
  }, [initialUser, user, fetchUser])

  const value = useMemo(
    () => ({ user, loading, error, refetch: fetchUser, setUser }),
    [user, loading, error, fetchUser]
  )

  return createElement(CurrentUserContext.Provider, { value }, children)
}

export const useCurrentUser = (): CurrentUserContextValue => {
  const context = useContext(CurrentUserContext)

  if (context) {
    return context
  }

  // Fallback for standalone usage outside of CurrentUserProvider
  const [user, setUser] = useState<CurrentUser | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async (isSilent = false) => {
    if (!isSilent && !user) setLoading(true)

    try {
      const payload = await fetchCurrentUserShared()

      if (payload.user) {
        setUser(payload.user)
        setError(null)
      } else if (payload.error?.code === 'AUTH_REQUIRED') {
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
  }, [user])

  useEffect(() => {
    if (!user && !cachedUser) {
      void fetchUser(false)
    }

    const handleProfileUpdated = () => {
      void fetchUser(true)
    }

    window.addEventListener('novastore:profile-updated', handleProfileUpdated)

    return () => {
      window.removeEventListener('novastore:profile-updated', handleProfileUpdated)
    }
  }, [user, fetchUser])

  return { user, loading, error, refetch: fetchUser, setUser }
}

export const CurrentUserHydrator = ({
  initialUser,
  children
}: {
  initialUser?: CurrentUser | null
  children: ReactNode
}) => {
  const { setUser } = useCurrentUser()

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
    }
  }, [initialUser, setUser])

  return createElement(Fragment, null, children)
}
