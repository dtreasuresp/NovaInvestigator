'use client'

// React Imports
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Third-party Imports
import { toast } from 'sonner'

// Project Imports
import { useBilling } from '@/hooks/use-billing'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  createRemoteInvestigation,
  getRemoteInvestigation,
  InvestigationClientError,
  listRemoteInvestigations,
  mapRemoteInvestigation,
  patchRemoteInvestigation,
  toggleRemoteInvestigationLock,
  transitionRemoteInvestigation,
  updateRemoteInvestigationSharing
} from '@/lib/investigations/client'

// Type Imports
import type {
  Analysis,
  CameAction,
  CameCriteriaValues,
  Factor,
  FactorGroup,
  FactorType,
  InvestigationCollaborator,
  InvestigationState,
  QspmStrategyResult,
  Quadrant,
  Strategy,
  ValidationResult
} from '@/types/apps/investigator-types'
import type { AiQuotaInfo } from '@/features/novai/schema'

// Util Imports
import {
  calculateAnalysis,
  changeFactorType,
  createNewCameAction,
  createNewFactor,
  createNewStrategy,
  createRelationship,
  generateDraftCameActions,
  normalizeFactorWeights,
  relationStatusForStrength,
  removeCameAction,
  removeStrategy,
  reorderFactor,
  syncRelationships,
  validateInvestigation
} from '@/utils/investigator/domain'
import { createBlankState, createDemoState } from '@/utils/investigator/demo'
import {
  clearWorkspaceStorage,
  normalizeStoredState,
  inspectWorkspaceMigration,
  statusForChange,
  withHistory
} from '@/utils/investigator/workspace'
import type { WorkspaceMigrationSnapshot } from '@/utils/investigator/workspace'

export type InvestigationSyncStatus = 'loading' | 'synced' | 'saving' | 'memory' | 'error'
export type InvestigationMigrationStatus = 'none' | 'available' | 'migrating' | 'completed' | 'error'

export interface InvestigationMigrationState {
  status: InvestigationMigrationStatus
  count: number
  totalBytes: number
  completed: number
  total: number
  canImport: boolean
  storageWarning: boolean
  error: string | null
}

export interface InvestigatorAnalysisContextValue {
  state: InvestigationState
  investigations: InvestigationState[]
  analysis: Analysis
  validation: ValidationResult
  selectedStrategy: Strategy | undefined
  selectedResult: QspmStrategyResult | undefined
  hydrated: boolean
  syncStatus: InvestigationSyncStatus
  localMigration: InvestigationMigrationState
  isReadOnly: boolean
  isOwner: boolean
  isCollaboratorEditor: boolean
  isLocked: boolean
  accessLevel: 'private' | 'team_read' | 'team_write'
  collaborators: InvestigationCollaborator[]
  currentUserId: string | null
  toggleLock: (
    researchId: string,
    isLocked: boolean,
    accessLevel?: 'private' | 'team_read' | 'team_write'
  ) => Promise<void>
  updateSharing: (
    researchId: string,
    accessLevel: 'private' | 'team_read' | 'team_write',
    isLocked: boolean,
    collaborators: InvestigationCollaborator[]
  ) => Promise<void>
  updateFactor: (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => void
  addFactor: (group: FactorGroup, type: FactorType) => void
  deleteFactor: (factorId: string) => void
  moveFactor: (group: FactorGroup, factorId: string, direction: 'up' | 'down') => void
  updateFactorType: (factorId: string, newType: FactorType) => void
  normalizeWeights: (group: FactorGroup) => void
  updateMetadata: (field: string, value: string) => void
  updateRelationship: (relationshipId: string, field: string, value: string | number) => void
  addRelationship: (internalId: string, externalId: string) => void
  applyDafoProposal: (
    proposalRelations: Array<{
      internalId: string
      externalId: string
      quadrant: Quadrant | null
      strength: number | null
      justification: string
      evidence: string
      evaluator: string
    }>,
    mode?: 'missing_only' | 'overwrite_all'
  ) => void
  updateQspmScore: (strategyId: string, factorId: string, value: string) => void
  applyQspmProposal: (
    scores: Record<string, Record<string, number | null>>,
    proposedStrategies?: Strategy[]
  ) => void
  updateStrategy: (strategyId: string, field: string, value: string) => void
  addStrategy: () => void
  deleteStrategy: (strategyId: string) => void
  updateCameAction: (actionId: string, field: string, value: string) => void
  updateCameActionCriteria: (actionId: string, criterionKey: keyof CameCriteriaValues, value: number) => void
  generateCameDraft: () => void
  saveCameAction: (actionId: string, nextAction: Partial<CameAction>) => void
  updateCameCriterion: (criterionId: string, value: string) => void
  addCameAction: () => void
  deleteCameAction: (actionId: string) => void
  selectStrategy: (strategyId: string | null) => void
  updateSelectionJustification: (value: string) => void
  confirmSelection: () => void
  createNewResearch: () => void
  loadDemo: () => void
  clearAnalysis: () => void
  openResearch: (research: InvestigationState) => void
  duplicateResearch: (research: InvestigationState) => void
  archiveResearch: (researchId: string) => void
  restoreResearch: (researchId: string) => void
  closeResearch: (researchId: string) => void
  renameResearch: (researchId: string, title: string) => void
  migrateLocalInvestigations: () => Promise<boolean>
  aiQuota: AiQuotaInfo | null
  isLoadingAiQuota: boolean
  refreshAiQuota: () => Promise<void>
}

const InvestigatorAnalysisContext = createContext<InvestigatorAnalysisContextValue | null>(null)

const serializeState = (value: InvestigationState) => JSON.stringify(value)

const isDemoState = (value: InvestigationState) =>
  value.metadata.label === 'demostrativo-simulado' || value.metadata.id === 'ETECSA-DEMO-01'

const notifyInvestigationError = (error: unknown) => {
  if (error instanceof InvestigationClientError) {
    if (error.status === 409 || error.code === 'VERSION_CONFLICT') {
      toast.error('La investigación cambió en otra sesión. Recarga la investigación antes de guardar.')

      return
    }

    if (error.status === 401 || error.status === 403) {
      toast.error('No tienes acceso para guardar esta investigación.')

      return
    }

    toast.error(`No se pudo sincronizar la investigación (${error.messageKey}).`)

    return
  }

  toast.error(error instanceof Error ? error.message : 'No se pudo sincronizar la investigación.')
}

export const InvestigatorAnalysisProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [state, setState] = useState<InvestigationState>(createBlankState)
  const [investigations, setInvestigations] = useState<InvestigationState[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [syncStatus, setSyncStatus] = useState<InvestigationSyncStatus>('loading')
  const { billing, loading: billingLoading, error: billingError } = useBilling()
  const { user } = useCurrentUser()
  const currentUserId = user?.id ?? null

  const remotePersistenceEnabled =
    billing?.accessMode === 'registered_subscription' || billing?.accessMode === 'registered_one_time'

  const remoteVersionsRef = useRef(new Map<string, number>())
  const remoteAliasesRef = useRef(new Map<string, string>())
  const migrationSnapshotRef = useRef<WorkspaceMigrationSnapshot | null>(null)
  const dirtyRef = useRef(false)
  const syncSequenceRef = useRef(0)
  const lastSyncedStateRef = useRef<string | null>(null)
  const [migrationSnapshot, setMigrationSnapshot] = useState<WorkspaceMigrationSnapshot | null>(null)
  const [migrationStatus, setMigrationStatus] = useState<InvestigationMigrationStatus>('none')
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [migrationProgress, setMigrationProgress] = useState({ completed: 0, total: 0 })

  const [aiQuota, setAiQuota] = useState<AiQuotaInfo | null>(null)
  const [isLoadingAiQuota, setIsLoadingAiQuota] = useState<boolean>(true)

  // Canal para sincronizar cuota entre pestañas (BroadcastChannel + polling backup)
  const aiQuotaChannelRef = useRef<BroadcastChannel | null>(null)

  const refreshAiQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/investigations/ai/quota', { cache: 'no-store' })

      if (res.ok) {
        const data = (await res.json()) as AiQuotaInfo

        setAiQuota(data)


        // Propaga a otras pestañas
        try {
          aiQuotaChannelRef.current?.postMessage(data)
        } catch {
          // ignore
        }
      }
    } catch {
      // Ignore quota fetch error in offline/local mode
    } finally {
      setIsLoadingAiQuota(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de cuota al montar (patrón preexistente)
    void refreshAiQuota()
  }, [refreshAiQuota])

  // Sync multi-pestaña: BroadcastChannel + focus / visibility
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel('novastore:ai-quota')

    aiQuotaChannelRef.current = channel

    channel.onmessage = (event: MessageEvent<AiQuotaInfo>) => {
      if (event.data && typeof event.data === 'object' && 'allowed' in event.data) {
        setAiQuota(event.data as AiQuotaInfo)
        setIsLoadingAiQuota(false)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshAiQuota()
      }
    }

    const handleFocus = () => {
      void refreshAiQuota()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      channel.close()
      aiQuotaChannelRef.current = null
    }
  }, [refreshAiQuota])

  const isOwner = useMemo(() => {
    if (!remotePersistenceEnabled || isDemoState(state)) return true
    if (!state.metadata.ownerId || !currentUserId) return true

    return state.metadata.ownerId === currentUserId
  }, [remotePersistenceEnabled, state, currentUserId])

  const isLocked = Boolean(state.metadata.isLocked)
  const accessLevel = state.metadata.accessLevel ?? 'team_write'
  const collaborators = useMemo(() => state.metadata.collaborators ?? [], [state.metadata.collaborators])

  const isCollaboratorEditor = useMemo(() => {
    if (!currentUserId) return false

    return collaborators.some(c => c.userId === currentUserId && c.role === 'editor')
  }, [collaborators, currentUserId])

  const isReadOnly = useMemo(() => {
    if (!remotePersistenceEnabled || isDemoState(state)) return false
    if (isOwner || isCollaboratorEditor) return false

    return isLocked || accessLevel === 'team_read'
  }, [remotePersistenceEnabled, state.metadata?.label, state.metadata?.id, isOwner, isCollaboratorEditor, isLocked, accessLevel])

  const isReadOnlyRef = useRef(isReadOnly)

  isReadOnlyRef.current = isReadOnly

  useEffect(() => {
    const snapshot = inspectWorkspaceMigration()

    migrationSnapshotRef.current = snapshot

    /* eslint-disable react-hooks/set-state-in-effect */
    setMigrationSnapshot(snapshot)

    if (snapshot.storageWarning) {
      setMigrationStatus('error')
      setMigrationError('No se pudo leer la copia local de investigaciones.')
    } else if (snapshot.items.length > 0) {
      setMigrationStatus('available')
      setMigrationProgress({ completed: 0, total: snapshot.items.length })
    }

    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (billingLoading) return

    let cancelled = false

    remoteVersionsRef.current.clear()
    remoteAliasesRef.current.clear()
    dirtyRef.current = false
    lastSyncedStateRef.current = null

    // This effect resets the client state when the resolved billing mode changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false)

    if (billingError) {
      setState(createBlankState())
      setInvestigations([])
      setSyncStatus('error')
      setHydrated(true)
      toast.error('No se pudo resolver el acceso de facturación para sincronizar investigaciones.')

      return () => {
        cancelled = true
      }
    }

    if (!remotePersistenceEnabled) {
      const demo = createDemoState()

      setState(demo)
      setInvestigations([demo])
      lastSyncedStateRef.current = serializeState(demo)
      setSyncStatus('memory')
      setHydrated(true)

      return () => {
        cancelled = true
      }
    }

    setSyncStatus('loading')

    const loadRemoteWorkspace = async () => {
      try {
        const records = await listRemoteInvestigations()

        if (cancelled) return

        const remoteStates = records.map(mapRemoteInvestigation)

        records.forEach(record => {
          remoteVersionsRef.current.set(record.id, record.version)
          remoteAliasesRef.current.set(record.id, record.id)
        })

        let savedLastOpenedId: string | null = null

        try {
          savedLastOpenedId = localStorage.getItem('novastore:last_opened_investigation_id')
        } catch {
          // ignore
        }

        const unarchived = remoteStates.filter(item => !item.metadata.archivedAt)

        const activeFromStorage = savedLastOpenedId
          ? unarchived.find(item => item.metadata.id === savedLastOpenedId)
          : undefined

        let active = activeFromStorage

        if (!active && unarchived.length > 0) {
          active = [...unarchived].sort((a: InvestigationState, b: InvestigationState) => {
            const timeA = new Date(a.metadata.lastOpenedAt || a.metadata.updatedAt || 0).getTime()
            const timeB = new Date(b.metadata.lastOpenedAt || b.metadata.updatedAt || 0).getTime()

            return timeB - timeA
          })[0]
        }

        if (!active) {
          active = remoteStates[0]
        }

        if (active) {
          setState(active)
          lastSyncedStateRef.current = serializeState(active)

          try {
            localStorage.setItem('novastore:last_opened_investigation_id', active.metadata.id)
          } catch {
            // ignore
          }
        } else {
          setState(createBlankState())
        }

        setInvestigations(remoteStates)
        setSyncStatus('synced')
        setHydrated(true)
      } catch (error) {
        if (cancelled) return

        setState(createBlankState())
        setInvestigations([])
        setSyncStatus('error')
        setHydrated(true)
        notifyInvestigationError(error)
      }
    }

    void loadRemoteWorkspace()

    return () => {
      cancelled = true
    }
  }, [billingError, billingLoading, remotePersistenceEnabled])

  // Realtime Supabase changes listener
  useEffect(() => {
    if (!hydrated || !remotePersistenceEnabled || isDemoState(state) || !state.metadata?.id) {
      return
    }

    const activeId = state.metadata.id
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null

    try {
      supabase = createSupabaseBrowserClient()
    } catch {
      return
    }

    const channel = supabase
      .channel(`investigation_realtime_${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'investigations',
          filter: `id=eq.${activeId}`
        },
        payload => {
          if (!payload.new || typeof payload.new !== 'object') return
          const newRow = payload.new as Record<string, unknown>
          const newVersion = typeof newRow.version === 'number' ? newRow.version : undefined
          const updatedBy = typeof newRow.updated_by === 'string' ? newRow.updated_by : undefined

          if (newVersion) {
            const currentVersion = remoteVersionsRef.current.get(activeId) ?? 0

            if (newVersion > currentVersion) {
              remoteVersionsRef.current.set(activeId, newVersion)

              // Only reconcile from remote if the local state is clean and the change originated elsewhere
              if (!dirtyRef.current && updatedBy !== currentUserId) {
                void getRemoteInvestigation(activeId)
                  .then(record => {
                    const updatedState = mapRemoteInvestigation(record)

                    lastSyncedStateRef.current = serializeState(updatedState)
                    setState(updatedState)
                    setInvestigations(current =>
                      current.map(item => (item.metadata.id === activeId ? updatedState : item))
                    )
                    setSyncStatus('synced')
                  })
                  .catch(() => {})
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [hydrated, remotePersistenceEnabled, state.metadata?.id, currentUserId])

  useEffect(() => {
    if (!hydrated) return

    // Keep the active record in the list view without using localStorage as a source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvestigations(current => {
      const index = current.findIndex(item => item.metadata?.id === state.metadata?.id)

      if (index === -1) return current

      return current.map(item => (item.metadata?.id === state.metadata?.id ? state : item))
    })
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated || !remotePersistenceEnabled || !dirtyRef.current || isDemoState(state)) {
      return
    }

    const serialized = serializeState(state)

    if (serialized === lastSyncedStateRef.current) {
      dirtyRef.current = false

      return
    }

    const sequence = ++syncSequenceRef.current
    const localId = state.metadata.id

    setSyncStatus('saving')

    const timeoutId = window.setTimeout(() => {
      const save = async () => {
        try {
          const remoteId = remoteAliasesRef.current.get(localId) ?? localId
          const version = remoteVersionsRef.current.get(remoteId)

          const record =
            version === undefined
              ? await createRemoteInvestigation(state)
              : await patchRemoteInvestigation(remoteId, version, state)

          const savedState = mapRemoteInvestigation(record)

          remoteVersionsRef.current.set(record.id, record.version)
          remoteAliasesRef.current.set(localId, record.id)

          if (sequence !== syncSequenceRef.current) return

          dirtyRef.current = false
          lastSyncedStateRef.current = serializeState(savedState)

          // Non-destructive update: update metadata/version without replacing in-flight input fields
          setState(current => {
            if (current.metadata.id !== localId && current.metadata.id !== record.id) {
              return current
            }

            return {
              ...current,
              metadata: {
                ...current.metadata,
                id: record.id,
                version: record.version,
                updatedAt: record.updatedAt,
                status: record.status,
                ownerId: record.ownerId ?? current.metadata.ownerId,
                createdByName: record.createdByName ?? current.metadata.createdByName,
                updatedByName: record.updatedByName ?? current.metadata.updatedByName,
                lastOpenedAt: record.lastOpenedAt ?? current.metadata.lastOpenedAt,
                lastOpenedByName: record.lastOpenedByName ?? current.metadata.lastOpenedByName
              }
            }
          })

          setInvestigations(current => {
            const index = current.findIndex(
              item => item.metadata.id === localId || item.metadata.id === record.id
            )

            if (index === -1) return [...current, savedState]

            return current.map((item, itemIndex) => (itemIndex === index ? savedState : item))
          })
          setSyncStatus('synced')
        } catch (error) {
          if (sequence !== syncSequenceRef.current) return

          // Auto-reconciliation for concurrent saves (HTTP 409)
          if (
            error instanceof InvestigationClientError &&
            (error.status === 409 || error.code === 'VERSION_CONFLICT')
          ) {
            try {
              const remoteId = remoteAliasesRef.current.get(localId) ?? localId
              const latestRecord = await getRemoteInvestigation(remoteId)
              const latestState = mapRemoteInvestigation(latestRecord)

              remoteVersionsRef.current.set(latestRecord.id, latestRecord.version)
              dirtyRef.current = false
              lastSyncedStateRef.current = serializeState(latestState)
              setState(latestState)
              setInvestigations(current =>
                current.map(item => (item.metadata.id === latestRecord.id ? latestState : item))
              )
              setSyncStatus('synced')
              toast.info('La investigación se sincronizó con los cambios más recientes del equipo.')

              return
            } catch {
              // fallback to notify
            }
          }

          setSyncStatus('error')
          notifyInvestigationError(error)
        }
      }

      void save()
    }, 3500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [state, hydrated, remotePersistenceEnabled])

  const analysis = useMemo(() => calculateAnalysis(state), [state])
  const validation = useMemo(() => validateInvestigation(state, analysis), [state, analysis])
  const selectedStrategy = state.strategies.find(strategy => strategy.id === state.selectedStrategyId)
  const selectedResult = analysis.qspm.results.find(result => result.strategyId === state.selectedStrategyId)

  const commitState = useCallback(
    (
      producer: InvestigationState | ((current: InvestigationState) => InvestigationState),
      reason: string,
      requestedStatus?: string
    ) => {
      if (isReadOnlyRef.current) {
        toast.warning('Esta investigación está en modo solo lectura.')

        return
      }

      setState(current => {
        dirtyRef.current = true
        const produced = typeof producer === 'function' ? producer(current) : producer

        const next: InvestigationState = {
          ...produced,
          metadata: {
            ...produced.metadata,
            status: requestedStatus || statusForChange(current, reason),
            validation: requestedStatus || statusForChange(current, reason),
            updatedAt: new Date().toISOString()
          }
        }

        return withHistory(
          current,
          next,
          reason,
          current.metadata.updatedByName || current.metadata.author
        )
      })
    },
    []
  )

  const updateFactor = useCallback(
    (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => {
      commitState(
        current => ({
          ...current,
          [group]: current[group].map(factor =>
            factor.id === factorId
              ? {
                  ...factor,
                  [field]:
                    field === 'weight'
                      ? Number.parseFloat(value as string) || 0
                      : field === 'rating'
                        ? Number.parseInt(value as string, 10) || 1
                        : value
                }
              : factor
          )
        }),
        `${group === 'internal' ? 'EFI' : 'EFE'} actualizado`
      )
    },
    [commitState]
  )

  const updateMetadata = useCallback(
    (field: string, value: string) => {
      commitState(
        current => ({
          ...current,
          metadata: {
            ...current.metadata,
            [field]: value
          }
        }),
        'contexto actualizado'
      )
    },
    [commitState]
  )

  const updateRelationship = useCallback(
    (relationshipId: string, field: string, value: string | number) => {
      commitState(
        current => ({
          ...current,
          relationships: current.relationships.map(relationship =>
            relationship.id === relationshipId
              ? {
                  ...relationship,
                  ...(field === 'strength'
                    ? {
                        strength: Number.parseInt(value as string, 10),
                        status: relationStatusForStrength(Number.parseInt(value as string, 10))
                      }
                    : { [field]: value })
                }
              : relationship
          )
        }),
        'relación DAFO actualizada'
      )
    },
    [commitState]
  )

  const addRelationship = useCallback(
    (internalId: string, externalId: string) => {
      commitState(current => {
        if (current.relationships.some(r => r.internalId === internalId && r.externalId === externalId))
          return current
        const relationship = createRelationship(current, internalId, externalId)

        return relationship ? { ...current, relationships: [...current.relationships, relationship] } : current
      }, 'par DAFO añadido')
    },
    [commitState]
  )

  const applyDafoProposal = useCallback(
    (
      proposalRelations: Array<{
        internalId: string
        externalId: string
        quadrant: Quadrant | null
        strength: number | null
        justification: string
        evidence: string
        evaluator: string
      }>,
      mode: 'missing_only' | 'overwrite_all' = 'missing_only'
    ) => {
      commitState(
        current => {
          const proposalMap = new Map(proposalRelations.map(r => [`${r.internalId}:${r.externalId}`, r]))

          const nextRelations = current.relationships.map(rel => {
                      const prop = proposalMap.get(`${rel.internalId}:${rel.externalId}`)
                      if (!prop) return rel

                      if (mode === 'missing_only' && rel.strength !== null && rel.strength !== undefined) {
                        return rel
                      }

                      // Si strength es null, mantener el estado actual (pendiente) - no sobrescribir
                      if (prop.strength === null) {
                        return rel
                      }

                      return {
                        ...rel,
                        strength: prop.strength,
                        status: relationStatusForStrength(prop.strength),
                        justification: prop.justification || rel.justification,
                        evidence: prop.evidence || rel.evidence,
                        evaluator: prop.evaluator || rel.evaluator
                      }
                    })

          return {
            ...current,
            relationships: nextRelations
          }
        },
        'Propuesta de cruces DAFO generada por NovAi'
      )
    },
    [commitState]
  )

  const updateQspmScore = useCallback(
    (strategyId: string, factorId: string, value: string) => {
      const score = value === '' ? null : Number.parseInt(value, 10)

      commitState(
        current => ({
          ...current,
          qspmScores: {
            ...current.qspmScores,
            [strategyId]: {
              ...current.qspmScores[strategyId],
              [factorId]: Number.isInteger(score) && score! >= 1 && score! <= 4 ? score : null
            }
          }
        }),
        'puntuación QSPM actualizada'
      )
    },
    [commitState]
  )

  const applyQspmProposal = useCallback(
    (
      scores: Record<string, Record<string, number | null>>,
      proposedStrategies?: Strategy[]
    ) => {
      commitState(
        current => {
          let nextStrategies = current.strategies

          if (proposedStrategies && proposedStrategies.length > 0) {
            const existingIds = new Set(current.strategies.map(s => s.id))
            const toAdd = proposedStrategies.filter(s => !existingIds.has(s.id))
            nextStrategies = [...current.strategies, ...toAdd]
          }

          const nextQspmScores = {
            ...current.qspmScores,
            ...scores
          }

          return {
            ...current,
            strategies: nextStrategies,
            qspmScores: nextQspmScores
          }
        },
        'Calificaciones QSPM generadas por NovAi'
      )
    },
    [commitState]
  )

  const updateStrategy = useCallback(
    (strategyId: string, field: string, value: string) => {
      commitState(
        current => ({
          ...current,
          strategies: current.strategies.map(strategy =>
            strategy.id === strategyId
              ? {
                  ...strategy,
                  [field]:
                    field === 'relatedFactors'
                      ? String(value)
                          .split(',')
                          .map(item => item.trim())
                          .filter(Boolean)
                      : value
                }
              : strategy
          )
        }),
        'alternativa QSPM actualizada'
      )
    },
    [commitState]
  )

  const updateCameAction = useCallback(
    (actionId: string, field: string, value: string) => {
      commitState(
        current => ({
          ...current,
          cameActions: current.cameActions.map(action =>
            action.id === actionId ? { ...action, [field]: value } : action
          )
        }),
        'ficha CAME actualizada'
      )
    },
    [commitState]
  )

  const saveCameAction = useCallback(
    (actionId: string, nextAction: Partial<CameAction>) => {
      commitState(
        current => ({
          ...current,
          cameActions: current.cameActions.map(action =>
            action.id === actionId ? { ...action, ...nextAction } : action
          )
        }),
        'ficha CAME guardada'
      )
    },
    [commitState]
  )

  const updateCameCriterion = useCallback(
    (criterionId: string, value: string) => {
      commitState(
        current => ({
          ...current,
          cameCriteria: current.cameCriteria.map(criterion =>
            criterion.id === criterionId
              ? { ...criterion, weight: Math.max(0, Math.min(1, Number.parseFloat(value) || 0)) }
              : criterion
          )
        }),
        'criterio CAME actualizado'
      )
    },
    [commitState]
  )

  const addFactor = useCallback(
    (group: FactorGroup, type: FactorType) => {
      commitState(
        current => {
          const newFactor = createNewFactor(current[group], type)
          const nextInternal = group === 'internal' ? [...current.internal, newFactor] : current.internal
          const nextExternal = group === 'external' ? [...current.external, newFactor] : current.external
          const nextRelationships = syncRelationships(nextInternal, nextExternal, current.relationships)

          return {
            ...current,
            internal: nextInternal,
            external: nextExternal,
            relationships: nextRelationships
          }
        },
        `factor ${type} añadido`
      )
    },
    [commitState]
  )

  const deleteFactor = useCallback(
    (factorId: string) => {
      commitState(
        current => {
          const isInternal = current.internal.some(f => f.id === factorId)
          const nextInternal = isInternal ? current.internal.filter(f => f.id !== factorId) : current.internal
          const nextExternal = !isInternal ? current.external.filter(f => f.id !== factorId) : current.external
          const nextRelationships = syncRelationships(nextInternal, nextExternal, current.relationships)

          return {
            ...current,
            internal: nextInternal,
            external: nextExternal,
            relationships: nextRelationships,
            cameActions: current.cameActions.filter(a => a.factorId !== factorId)
          }
        },
        `factor ${factorId} eliminado`
      )
    },
    [commitState]
  )

  const moveFactor = useCallback(
    (group: FactorGroup, factorId: string, direction: 'up' | 'down') => {
      commitState(
        current => ({
          ...current,
          [group]: reorderFactor(current[group], factorId, direction)
        }),
        `factor ${factorId} reordenado`
      )
    },
    [commitState]
  )

  const updateFactorType = useCallback(
    (factorId: string, newType: FactorType) => {
      commitState(current => {
        const isInternal = current.internal.some(f => f.id === factorId)
        const sourceGroup: FactorGroup = isInternal ? 'internal' : 'external'
        const factor = current[sourceGroup].find(f => f.id === factorId)

        if (!factor) return current
        const updated = changeFactorType(factor, newType)

        let nextInternal = current.internal
        let nextExternal = current.external

        if (updated.group === sourceGroup) {
          if (sourceGroup === 'internal') {
            nextInternal = current.internal.map(f => (f.id === factorId ? updated : f))
          } else {
            nextExternal = current.external.map(f => (f.id === factorId ? updated : f))
          }
        } else {
          if (sourceGroup === 'internal') {
            nextInternal = current.internal.filter(f => f.id !== factorId)
            nextExternal = [...current.external, updated]
          } else {
            nextExternal = current.external.filter(f => f.id !== factorId)
            nextInternal = [...current.internal, updated]
          }
        }

        const nextRelationships = syncRelationships(nextInternal, nextExternal, current.relationships)

        return {
          ...current,
          internal: nextInternal,
          external: nextExternal,
          relationships: nextRelationships
        }
      }, `tipo de ${factorId} cambiado a ${newType}`)
    },
    [commitState]
  )

  const normalizeWeights = useCallback(
    (group: FactorGroup) => {
      commitState(
        current => ({
          ...current,
          [group]: normalizeFactorWeights(current[group])
        }),
        `pesos de ${group} normalizados a 1.00`
      )
      toast.success(`Pesos ${group === 'internal' ? 'EFI' : 'EFE'} normalizados proporcionalmente a 1.00.`)
    },
    [commitState]
  )

  const addStrategy = useCallback(() => {
    commitState(current => ({
      ...current,
      strategies: [...current.strategies, createNewStrategy(current.strategies)]
    }), 'estrategia añadida')
  }, [commitState])

  const deleteStrategy = useCallback(
    (strategyId: string) => {
      commitState(current => removeStrategy(current, strategyId), `estrategia ${strategyId} eliminada`)
    },
    [commitState]
  )

  const addCameAction = useCallback(() => {
    commitState(current => ({
      ...current,
      cameActions: [...current.cameActions, createNewCameAction('NEW')]
    }), 'ficha CAME añadida')
  }, [commitState])

  const deleteCameAction = useCallback(
    (actionId: string) => {
      commitState(current => removeCameAction(current, actionId), `ficha ${actionId} eliminada`)
    },
    [commitState]
  )

  const updateCameActionCriteria = useCallback(
    (actionId: string, criterionKey: keyof CameCriteriaValues, value: number) => {
      commitState(
        current => ({
          ...current,
          cameActions: current.cameActions.map(action =>
            action.id === actionId
              ? {
                  ...action,
                  criteria: {
                    ...action.criteria,
                    [criterionKey]: Math.max(1, Math.min(5, value))
                  }
                }
              : action
          )
        }),
        `criterio ${criterionKey} de ficha ${actionId} actualizado a ${value}`
      )
    },
    [commitState]
  )

  const generateCameDraft = useCallback(() => {
    commitState(
      current => ({
        ...current,
        cameActions: generateDraftCameActions(current)
      }),
      'borrador de acciones CAME generado desde diagnóstico'
    )
    toast.success('Borrador de acciones CAME generado a partir del diagnóstico y la estrategia seleccionada.')
  }, [commitState])

  const selectStrategy = useCallback(
    (strategyId: string | null) => {
      commitState(current => ({ ...current, selectedStrategyId: strategyId }), 'alternativa QSPM seleccionada')
    },
    [commitState]
  )

  const updateSelectionJustification = useCallback(
    (value: string) => {
      commitState(current => ({ ...current, selectionJustification: value }), 'justificación QSPM actualizada')
    },
    [commitState]
  )

  const confirmSelection = useCallback(() => {
    if (!validation.valid) {
      toast.error(
        `No se puede validar todavía: ${validation.errors} errores y ${validation.warnings} advertencias pendientes.`
      )

      return
    }

    commitState(current => current, 'validación', 'validada')
    toast.success('Investigación validada.')
  }, [validation, commitState])

  const applyRemoteRecord = useCallback(
    (requestedId: string, record: Awaited<ReturnType<typeof transitionRemoteInvestigation>>) => {
      const mapped = mapRemoteInvestigation(record)
      const activeIdAtRequest = state.metadata.id
      const isActive = activeIdAtRequest === requestedId || activeIdAtRequest === record.id
      const hasUnsavedActiveChanges = isActive && dirtyRef.current

      remoteVersionsRef.current.set(record.id, record.version)
      remoteAliasesRef.current.set(requestedId, record.id)
      remoteAliasesRef.current.set(record.id, record.id)

      setInvestigations(current =>
        current.map(item => {
          if (item.metadata.id !== requestedId && item.metadata.id !== record.id) return item

          return hasUnsavedActiveChanges
            ? { ...item, metadata: { ...item.metadata, ...mapped.metadata } }
            : mapped
        })
      )

      if (isActive) {
        setState(current =>
          hasUnsavedActiveChanges
            ? { ...current, metadata: { ...current.metadata, ...mapped.metadata } }
            : mapped
        )
      }

      if (isActive && !hasUnsavedActiveChanges) {
        dirtyRef.current = false
        lastSyncedStateRef.current = serializeState(mapped)
        setSyncStatus('synced')
      }
    },
    [state.metadata.id]
  )

  const migrateLocalInvestigations = useCallback(async (): Promise<boolean> => {
    const snapshot = migrationSnapshotRef.current

    if (!remotePersistenceEnabled) {
      const error = new Error('La importación requiere una suscripción o una compra única registrada.')

      setMigrationStatus('error')
      setMigrationError(error.message)
      notifyInvestigationError(error)

      return false
    }

    if (!snapshot || snapshot.storageWarning || snapshot.items.length === 0) {
      const error = new Error('No hay investigaciones locales válidas para importar.')

      setMigrationStatus('error')
      setMigrationError(error.message)
      notifyInvestigationError(error)

      return false
    }

    setMigrationStatus('migrating')
    setMigrationError(null)
    setMigrationProgress({ completed: 0, total: snapshot.items.length })

    try {
      for (const [index, item] of snapshot.items.entries()) {
        let record

        try {
          record = await createRemoteInvestigation(item, {
            idempotencyKey: `migration-${item.metadata.id}`.slice(0, 128),
            source: 'migration'
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'error remoto desconocido'

          throw new Error(`No se pudo importar "${item.metadata.title}". ${message}`)
        }

        if (!record.id || !record.state || typeof record.version !== 'number') {
          throw new Error('La respuesta remota de la importación no es válida.')
        }

        const mapped = mapRemoteInvestigation(record)

        remoteVersionsRef.current.set(record.id, record.version)
        remoteAliasesRef.current.set(item.metadata.id, record.id)
        remoteAliasesRef.current.set(record.id, record.id)

        setInvestigations(current => {
          const existingIndex = current.findIndex(
            currentItem => currentItem.metadata.id === item.metadata.id || currentItem.metadata.id === record.id
          )

          if (existingIndex === -1) return [mapped, ...current]

          return current.map((currentItem, currentIndex) =>
            currentIndex === existingIndex ? mapped : currentItem
          )
        })

        setState(current => (current.metadata.id === item.metadata.id ? mapped : current))
        setMigrationProgress({ completed: index + 1, total: snapshot.items.length })
      }

      clearWorkspaceStorage()
      migrationSnapshotRef.current = null
      setMigrationSnapshot(null)
      setMigrationStatus('completed')
      toast.success(`${snapshot.items.length} investigación${snapshot.items.length === 1 ? '' : 'es'} importada${snapshot.items.length === 1 ? '' : 's'} correctamente.`)

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la importación.'

      setMigrationStatus('error')
      setMigrationError(message)
      notifyInvestigationError(error)

      return false
    }
  }, [remotePersistenceEnabled])

  const transitionResearch = useCallback(
    (
      researchId: string,
      action: 'archive' | 'restore' | 'close',
      applyInMemory: () => void,
      successMessage: string,
      pendingState?: InvestigationState
    ) => {
      const remoteId = remoteAliasesRef.current.get(researchId) ?? researchId
      const version = remoteVersionsRef.current.get(remoteId)
      const isActive = state.metadata.id === researchId

      if (!remotePersistenceEnabled) {
        applyInMemory()
        toast.success(successMessage)

        return
      }

      if (version === undefined) {
        applyInMemory()

        if (!pendingState || isActive) {
          toast.success(successMessage)

          return
        }

        void createRemoteInvestigation(pendingState)
          .then(record => {
            applyRemoteRecord(researchId, record)
            toast.success(successMessage)
          })
          .catch(error => {
            setSyncStatus('error')
            notifyInvestigationError(error)
          })

        return
      }

      void transitionRemoteInvestigation(remoteId, action, version)
        .then(record => {
          applyRemoteRecord(researchId, record)
          toast.success(successMessage)
        })
        .catch(error => {
          setSyncStatus('error')
          notifyInvestigationError(error)
        })
    },
    [applyRemoteRecord, remotePersistenceEnabled, state.metadata.id]
  )

  const createNewResearch = useCallback(() => {
    const dynamicId = `INV-${Date.now().toString().slice(-6)}`
    const blank = createBlankState(dynamicId)

    dirtyRef.current = true
    setState(blank)
    setInvestigations(current => [blank, ...current.filter(item => item.metadata.id !== blank.metadata.id)])
    toast.success('Nueva investigación creada como borrador.')
  }, [])

  const loadDemo = useCallback(() => {
    const demo = createDemoState()

    dirtyRef.current = false
    lastSyncedStateRef.current = serializeState(demo)
    setState(demo)
    setInvestigations(current => [demo, ...current.filter(item => item.metadata.id !== demo.metadata.id)])
    setSyncStatus('memory')
    toast.success('Escenario demostrativo ETECSA cargado.')
  }, [])

  const clearAnalysis = useCallback(() => {
    createNewResearch()
  }, [createNewResearch])

  const openResearch = useCallback(
    (research: InvestigationState) => {
      const opened = normalizeStoredState(research)

      dirtyRef.current = false
      lastSyncedStateRef.current = serializeState(opened)
      setState(opened)
      setSyncStatus(remoteVersionsRef.current.has(opened.metadata.id) ? 'synced' : 'memory')

      if (opened.metadata.id) {
        try {
          localStorage.setItem('novastore:last_opened_investigation_id', opened.metadata.id)
        } catch {
          // ignore storage error
        }
      }

      toast.success(`Investigación "${research.metadata.title || research.metadata.id}" abierta.`)

      if (remotePersistenceEnabled && !isDemoState(opened) && opened.metadata.id) {
        void getRemoteInvestigation(opened.metadata.id, { touch: true })
          .then(record => {
            const updated = mapRemoteInvestigation(record)

            remoteVersionsRef.current.set(record.id, record.version)
            setState(current => (current.metadata.id === record.id ? updated : current))
            setInvestigations(current =>
              current.map(item => (item.metadata.id === record.id ? updated : item))
            )
          })
          .catch(() => {})
      }
    },
    [remotePersistenceEnabled]
  )

  const toggleLock = useCallback(
    async (
      researchId: string,
      nextIsLocked: boolean,
      nextAccessLevel?: 'private' | 'team_read' | 'team_write'
    ) => {
      if (!remotePersistenceEnabled || isDemoState(state)) {
        commitState(
          current => ({
            ...current,
            metadata: {
              ...current.metadata,
              isLocked: nextIsLocked,
              ...(nextAccessLevel ? { accessLevel: nextAccessLevel } : {})
            }
          }),
          'cambio de protección de autor'
        )
        toast.success(nextIsLocked ? 'Investigación protegida.' : 'Investigación desprotegida.')

        return
      }

      const remoteId = remoteAliasesRef.current.get(researchId) ?? researchId
      const version = remoteVersionsRef.current.get(remoteId)

      if (version === undefined) {
        toast.error('No se pudo encontrar la versión remota de la investigación.')

        return
      }

      try {
        const record = await toggleRemoteInvestigationLock(
          remoteId,
          version,
          nextIsLocked,
          nextAccessLevel
        )

        const updatedState = mapRemoteInvestigation(record)

        remoteVersionsRef.current.set(record.id, record.version)
        lastSyncedStateRef.current = serializeState(updatedState)
        setState(current => (current.metadata.id === researchId ? updatedState : current))
        setInvestigations(current =>
          current.map(item => (item.metadata.id === researchId ? updatedState : item))
        )
        toast.success(
          nextIsLocked
            ? 'Investigación protegida. Solo el autor puede modificarla.'
            : 'Investigación desprotegida. Colaboración de equipo habilitada.'
        )
      } catch (error) {
        notifyInvestigationError(error)
      }
    },
    [commitState, remotePersistenceEnabled, state]
  )

  const updateSharing = useCallback(
    async (
      researchId: string,
      nextAccessLevel: 'private' | 'team_read' | 'team_write',
      nextIsLocked: boolean,
      nextCollaborators: InvestigationCollaborator[]
    ) => {
      if (!remotePersistenceEnabled || isDemoState(state)) {
        commitState(
          current => ({
            ...current,
            metadata: {
              ...current.metadata,
              accessLevel: nextAccessLevel,
              isLocked: nextIsLocked,
              collaborators: nextCollaborators
            }
          }),
          'actualización de gobernanza y colaboradores'
        )
        toast.success('Permisos y colaboradores actualizados.')

        return
      }

      const remoteId = remoteAliasesRef.current.get(researchId) ?? researchId
      const version = remoteVersionsRef.current.get(remoteId)

      if (version === undefined) {
        toast.error('No se pudo encontrar la versión remota de la investigación.')

        return
      }

      try {
        const record = await updateRemoteInvestigationSharing(remoteId, version, {
          accessLevel: nextAccessLevel,
          isLocked: nextIsLocked,
          collaborators: nextCollaborators
        })

        const updatedState = mapRemoteInvestigation(record)

        remoteVersionsRef.current.set(record.id, record.version)
        lastSyncedStateRef.current = serializeState(updatedState)
        setState(current => (current.metadata.id === researchId ? updatedState : current))
        setInvestigations(current =>
          current.map(item => (item.metadata.id === researchId ? updatedState : item))
        )
        toast.success('Permisos de acceso y colaboradores guardados exitosamente.')
      } catch (error) {
        notifyInvestigationError(error)
      }
    },
    [commitState, remotePersistenceEnabled, state]
  )

  const duplicateResearch = useCallback(
    (research: InvestigationState) => {
      const duplicate = normalizeStoredState(research)

      duplicate.metadata = {
        ...duplicate.metadata,
        id: `INV-${Date.now().toString().slice(-6)}`,
        title: `${duplicate.metadata.title || 'Investigación'} (copia)`,
        label: 'copia-de-trabajo',
        validation: 'borrador',
        status: 'borrador',
        archivedAt: null,
        updatedAt: new Date().toISOString()
      }
      duplicate.history = []
      dirtyRef.current = true
      lastSyncedStateRef.current = null
      setState(duplicate)
      setInvestigations(current => [
        duplicate,
        ...current.filter(item => item.metadata.id !== duplicate.metadata.id)
      ])
      toast.success('Copia de investigación creada.')
    },
    []
  )

  const archiveResearch = useCallback(
    (researchId: string) => {
      const archivedAt = new Date().toISOString()
      const research = investigations.find(item => item.metadata.id === researchId)

      const pendingState = research
        ? { ...research, metadata: { ...research.metadata, archivedAt } }
        : undefined

      transitionResearch(
        researchId,
        'archive',
        () => {
          dirtyRef.current = remotePersistenceEnabled
          setInvestigations(current =>
            current.map(item =>
              item.metadata.id === researchId
                ? { ...item, metadata: { ...item.metadata, archivedAt } }
                : item
            )
          )

          if (researchId === state.metadata.id) {
            setState(current => ({
              ...current,
              metadata: { ...current.metadata, archivedAt }
            }))
          }
        },
        'Investigación archivada. Puede recuperarse desde el archivo.',
        pendingState
      )
    },
    [investigations, remotePersistenceEnabled, state.metadata.id, transitionResearch]
  )

  const restoreResearch = useCallback(
    (researchId: string) => {
      const research = investigations.find(item => item.metadata.id === researchId)

      const pendingState = research
        ? {
            ...research,
            metadata: {
              ...research.metadata,
              archivedAt: null,
              status: research.metadata.status === 'cerrada' ? 'cerrada' : 'borrador'
            }
          }
        : undefined

      transitionResearch(
        researchId,
        'restore',
        () => {
          dirtyRef.current = remotePersistenceEnabled
          setInvestigations(current =>
            current.map(item =>
              item.metadata.id === researchId
                ? {
                    ...item,
                    metadata: {
                      ...item.metadata,
                      archivedAt: null,
                      status: item.metadata.status === 'cerrada' ? 'cerrada' : 'borrador'
                    }
                  }
                : item
            )
          )

          if (researchId === state.metadata.id) {
            setState(current => ({
              ...current,
              metadata: {
                ...current.metadata,
                archivedAt: null,
                status: current.metadata.status === 'cerrada' ? 'cerrada' : 'borrador'
              }
            }))
          }
        },
        'Investigación recuperada del archivo.',
        pendingState
      )
    },
    [investigations, remotePersistenceEnabled, state.metadata.id, transitionResearch]
  )

  const closeResearch = useCallback(
    (researchId: string) => {
      const updatedAt = new Date().toISOString()
      const research = investigations.find(item => item.metadata.id === researchId)

      const pendingState = research
        ? {
            ...research,
            metadata: {
              ...research.metadata,
              status: 'cerrada',
              validation: 'cerrada',
              updatedAt
            }
          }
        : undefined

      transitionResearch(
        researchId,
        'close',
        () => {
          dirtyRef.current = remotePersistenceEnabled
          setInvestigations(current =>
            current.map(item =>
              item.metadata.id === researchId
                ? {
                    ...item,
                    metadata: {
                      ...item.metadata,
                      status: 'cerrada',
                      validation: 'cerrada',
                      updatedAt
                    }
                  }
                : item
            )
          )

          if (researchId === state.metadata.id) {
            setState(current => ({
              ...current,
              metadata: {
                ...current.metadata,
                status: 'cerrada',
                validation: 'cerrada',
                updatedAt
              }
            }))
          }
        },
        'Investigación cerrada.',
        pendingState
      )
    },
    [investigations, remotePersistenceEnabled, state.metadata.id, transitionResearch]
  )

  const renameResearch = useCallback(
    (researchId: string, title: string) => {
      const nextTitle = String(title || '').trim()

      if (!nextTitle) return

      const updatedAt = new Date().toISOString()

      // Optimistic instant UI update for responsiveness
      setInvestigations(current =>
        current.map(item =>
          item.metadata.id === researchId
            ? { ...item, metadata: { ...item.metadata, title: nextTitle, updatedAt } }
            : item
        )
      )

      if (researchId === state.metadata.id) {
        commitState(
          current => ({
            ...current,
            metadata: { ...current.metadata, title: nextTitle, updatedAt }
          }),
          'investigación renombrada'
        )
      } else {
        const research = investigations.find(item => item.metadata.id === researchId)

        if (!research) return

        const nextResearch = {
          ...research,
          metadata: { ...research.metadata, title: nextTitle, updatedAt }
        }

        const remoteId = remoteAliasesRef.current.get(researchId) ?? researchId
        const version = remoteVersionsRef.current.get(remoteId)

        if (remotePersistenceEnabled) {
          const save =
            version === undefined
              ? createRemoteInvestigation(nextResearch)
              : patchRemoteInvestigation(remoteId, version, nextResearch)

          void save
            .then(record => {
              applyRemoteRecord(researchId, record)
            })
            .catch(error => {
              setSyncStatus('error')
              notifyInvestigationError(error)
            })

          return
        }
      }

      toast.success('Nombre de investigación actualizado.')
    },
    [applyRemoteRecord, commitState, investigations, remotePersistenceEnabled, state.metadata.id]
  )

  const value = useMemo<InvestigatorAnalysisContextValue>(
    () => ({
      state,
      investigations,
      analysis,
      validation,
      selectedStrategy,
      selectedResult,
      hydrated,
      syncStatus,
      localMigration: {
        status: migrationStatus,
        count: migrationSnapshot?.items.length ?? 0,
        totalBytes: migrationSnapshot?.totalBytes ?? 0,
        completed: migrationProgress.completed,
        total: migrationProgress.total,
        canImport: Boolean(remotePersistenceEnabled),
        storageWarning: migrationSnapshot?.storageWarning ?? false,
        error: migrationError
      },
      isReadOnly,
      isOwner,
      isCollaboratorEditor,
      isLocked,
      accessLevel,
      collaborators,
      currentUserId,
      toggleLock,
      updateSharing,
      updateFactor,
      addFactor,
      deleteFactor,
      moveFactor,
      updateFactorType,
      normalizeWeights,
      updateMetadata,
      updateRelationship,
      addRelationship,
      applyDafoProposal,
      updateQspmScore,
      applyQspmProposal,
      updateStrategy,
      addStrategy,
      deleteStrategy,
      updateCameAction,
      updateCameActionCriteria,
      generateCameDraft,
      saveCameAction,
      updateCameCriterion,
      addCameAction,
      deleteCameAction,
      selectStrategy,
      updateSelectionJustification,
      confirmSelection,
      createNewResearch,
      loadDemo,
      clearAnalysis,
      openResearch,
      duplicateResearch,
      archiveResearch,
      restoreResearch,
      closeResearch,
      renameResearch,
      migrateLocalInvestigations,
      aiQuota,
      isLoadingAiQuota,
      refreshAiQuota
    }),
    [
      state,
      investigations,
      analysis,
      validation,
      selectedStrategy,
      selectedResult,
      hydrated,
      syncStatus,
      migrationStatus,
      migrationSnapshot,
      migrationProgress,
      remotePersistenceEnabled,
      migrationError,
      isReadOnly,
      isOwner,
      isCollaboratorEditor,
      isLocked,
      accessLevel,
      collaborators,
      currentUserId,
      toggleLock,
      updateSharing,
      updateFactor,
      addFactor,
      deleteFactor,
      moveFactor,
      updateFactorType,
      normalizeWeights,
      updateMetadata,
      updateRelationship,
      addRelationship,
      applyDafoProposal,
      updateQspmScore,
      applyQspmProposal,
      updateStrategy,
      addStrategy,
      deleteStrategy,
      updateCameAction,
      updateCameActionCriteria,
      generateCameDraft,
      saveCameAction,
      updateCameCriterion,
      addCameAction,
      deleteCameAction,
      selectStrategy,
      updateSelectionJustification,
      confirmSelection,
      createNewResearch,
      loadDemo,
      clearAnalysis,
      openResearch,
      duplicateResearch,
      archiveResearch,
      restoreResearch,
      closeResearch,
      renameResearch,
      migrateLocalInvestigations,
      aiQuota,
      isLoadingAiQuota,
      refreshAiQuota
    ]
  )

  return <InvestigatorAnalysisContext.Provider value={value}>{children}</InvestigatorAnalysisContext.Provider>
}

export const useOptionalInvestigatorAnalysis = (): InvestigatorAnalysisContextValue | null => {
  return useContext(InvestigatorAnalysisContext)
}

export const useInvestigatorAnalysis = (): InvestigatorAnalysisContextValue => {
  const context = useContext(InvestigatorAnalysisContext)

  if (!context) throw new Error('useInvestigatorAnalysis debe usarse dentro de InvestigatorAnalysisProvider')

  return context
}