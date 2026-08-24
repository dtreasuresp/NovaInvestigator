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
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export const PermProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [snapshot, setSnapshot] = useState<EffectiveAccessSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEffective = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/access/effective', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      })

      if (!response.ok) {
        setSnapshot(null)

        return
      }

      const nextSnapshot = (await response.json()) as EffectiveAccessSnapshot

      setSnapshot(nextSnapshot)
    } catch {
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchEffective()
  }, [fetchEffective])

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
      refetch: fetchEffective
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