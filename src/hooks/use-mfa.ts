'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

export interface MfaFactorInfo {
  id: string
  friendlyName: string | null
  createdAt: string
}

export interface MfaStatus {
  currentLevel: 'aal1' | 'aal2' | 'aal3' | null
  nextLevel: 'aal1' | 'aal2' | 'aal3' | null
  factors: MfaFactorInfo[]
}

type MfaStatusResponse = {
  ok?: boolean
  mfa?: MfaStatus
  error?: { messageKey?: string }
}

export const useMfaStatus = () => {
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/mfa/status', { cache: 'no-store' })
      const payload = (await response.json()) as MfaStatusResponse

      if (!response.ok) {
        setError(payload.error?.messageKey ?? 'auth.authRequired')

        return
      }

      setStatus(payload.mfa ?? null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'auth.authRequired')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await refresh()
    }

    void load()
  }, [refresh])

  return { status, loading, error, refresh }
}
