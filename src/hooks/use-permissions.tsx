'use client'

// React Imports
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { PermissionKey } from '@/configs/permissions'
import { isPlatformCapabilityKey, type CapabilityKey, type PlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type { EffectiveAccessSnapshot } from '@/features/access/types'

export interface PermissionsContextValue {
  has: (permission: PermissionKey | string) => boolean
  hasAction: (action: string) => boolean
  hasModule: (module: string) => boolean
  capabilities: ReadonlySet<CapabilityKey>
  platformCapabilities: ReadonlySet<PlatformCapabilityKey>
  snapshot: EffectiveAccessSnapshot | null
  loading: boolean
  refetch: () => Promise<void>
  setSnapshot: (snapshot: EffectiveAccessSnapshot | null) => void
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

let inFlightEffectivePromise: Promise<EffectiveAccessSnapshot | null> | null = null

export interface PermProviderProps {
  children: ReactNode
  initialSnapshot?: EffectiveAccessSnapshot | null
}

export const PermProvider = ({ children, initialSnapshot = null }: PermProviderProps) => {
  const [snapshot, setSnapshot] = useState<EffectiveAccessSnapshot | null>(initialSnapshot)
  const [loading, setLoading] = useState(!initialSnapshot)

  const fetchEffective = useCallback(async () => {
    if (inFlightEffectivePromise) {
      const existing = await inFlightEffectivePromise

      if (existing) {
        setSnapshot(existing)
      }

      return
    }

    setLoading(true)

    inFlightEffectivePromise = (async () => {
      try {
        const response = await fetch('/api/access/effective', {
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        })

        if (!response.ok) {
          return null
        }

        const nextSnapshot = (await response.json()) as EffectiveAccessSnapshot

        return nextSnapshot
      } catch {
        return null
      } finally {
        inFlightEffectivePromise = null
        setLoading(false)
      }
    })()

    const result = await inFlightEffectivePromise

    if (result) {
      setSnapshot(result)
    }
  }, [])

  useEffect(() => {
    if (initialSnapshot && !snapshot) {
      setSnapshot(initialSnapshot)
      setLoading(false)
    } else if (!snapshot && !initialSnapshot) {
      void fetchEffective()
    }
  }, [initialSnapshot, snapshot, fetchEffective])

  const capabilities = useMemo(() => new Set(snapshot?.capabilities ?? []), [snapshot])
  const platformCapabilities = useMemo(() => new Set(snapshot?.platformCapabilities ?? []), [snapshot])

  const has = useCallback(
    (permission: PermissionKey | string) => {
      if (permission.startsWith('apps.')) {
        return snapshot?.status === 'active' && snapshot.modules.includes(permission.slice('apps.'.length))
      }

      if (isPlatformCapabilityKey(permission)) {
        return platformCapabilities.has(permission)
      }

      return capabilities.has(permission as CapabilityKey)
    },
    [capabilities, platformCapabilities, snapshot]
  )

  const hasAction = useCallback(
    (action: string) => {
      const normalized = action.startsWith('actions.') ? action.slice('actions.'.length) : action

      return snapshot?.status === 'active' && snapshot.actions.includes(normalized)
    },
    [snapshot]
  )

  const hasModule = useCallback(
    (module: string) => {
      const normalized = module.startsWith('modules.') ? module.slice('modules.'.length) : module

      return snapshot?.status === 'active' && snapshot.modules.includes(normalized)
    },
    [snapshot]
  )

  const value = useMemo(
    () => ({
      has,
      hasAction,
      hasModule,
      capabilities,
      platformCapabilities,
      snapshot,
      loading,
      refetch: fetchEffective,
      setSnapshot
    }),
    [capabilities, fetchEffective, has, hasAction, hasModule, loading, platformCapabilities, snapshot]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export const usePermissions = (): PermissionsContextValue => {
  const context = useContext(PermissionsContext)

  if (!context) throw new Error('usePermissions debe usarse dentro de PermProvider')

  return context
}

export const PermHydrator = ({
  initialSnapshot,
  children
}: {
  initialSnapshot?: EffectiveAccessSnapshot | null
  children: ReactNode
}) => {
  const { setSnapshot } = usePermissions()

  useEffect(() => {
    if (initialSnapshot) {
      setSnapshot(initialSnapshot)
    }
  }, [initialSnapshot, setSnapshot])

  return <>{children}</>
}