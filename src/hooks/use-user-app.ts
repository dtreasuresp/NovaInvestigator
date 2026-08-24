'use client'

// This hook backs the real, tenant-scoped admin member list
// (src/views/apps/users/list/*): it no longer reads/writes
// src/fake-db/apps/users.ts, it calls the protected, paginated
// src/app/api/admin/users/** endpoints (backed by
// src/features/users/service.ts). The unrelated, still-fake profile view
// under src/views/apps/users/view/* keeps using src/fake-db/apps/users.ts
// directly and is unaffected by this hook.

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Third-party Imports
import { toast } from 'sonner'

// Type Imports
import type { TenantMemberSummary, TenantWorkspaceSummary } from '@/features/users/types'
import type { UserFilters, UserSorting, UserStatus } from '@/types/apps/user-types'

const DEFAULT_FILTERS: UserFilters = {
  role: 'all',
  status: 'all',
  search: ''
}

const DEFAULT_ROWS_PER_PAGE = 10
const DEFAULT_CURRENT_PAGE = 1

// Maps the UI's `UserStatus` vocabulary (kept for visual continuity with the
// existing badge styles in user-table-columns.tsx) onto the real
// `memberships.status` values from src/lib/supabase/database.types.ts.
// `revoked` has no dedicated badge in the current UI language, so it renders
// as "Inactive".
const STATUS_TO_MEMBERSHIP: Record<Exclude<UserStatus, never>, string> = {
  Active: 'active',
  Pending: 'pending',
  Suspended: 'suspended',
  Inactive: 'revoked'
}

const MEMBERSHIP_TO_STATUS: Record<string, UserStatus> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  revoked: 'Inactive'
}

export const membershipStatusToUiStatus = (status: string): UserStatus => MEMBERSHIP_TO_STATUS[status] ?? 'Inactive'

interface ErrorShape {
  error?: { code?: string; messageKey?: string }
}

const extractErrorMessage = (payload: unknown, fallback: string): string => {
  const shape = payload as ErrorShape

  return shape?.error?.messageKey ?? fallback
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export interface InviteMemberInput {
  email: string
  roleKey: string
  workspaceId: string
}

export interface UpdateMemberRoleInput {
  roleKey: string
}

export function useUserApp() {
  const [members, setMembers] = useState<TenantMemberSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [workspaces, setWorkspaces] = useState<TenantWorkspaceSummary[]>([])
  const [workspacesLoading, setWorkspacesLoading] = useState(true)

  const [filters, setFiltersState] = useState<UserFilters>(DEFAULT_FILTERS)
  const [rowsPerPage, setRowsPerPageState] = useState(DEFAULT_ROWS_PER_PAGE)
  const [currentPage, setCurrentPage] = useState(DEFAULT_CURRENT_PAGE)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [sorting, setSorting] = useState<UserSorting | null>(null)
  const [sheetMode, setSheetMode] = useState<'add' | 'edit' | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / rowsPerPage)), [rowsPerPage, total])

  // Sorting is applied to the current, already-paginated page only: the
  // admin members endpoint (GET /api/admin/users) does not expose a
  // cross-page sort parameter (see src/features/users/schema.ts), so a
  // column click reorders what is visible rather than the whole tenant. This
  // preserves the sortable table header UI without requiring the repository
  // to support ORDER BY across three separately-fetched tables
  // (memberships/roles/profiles+auth emails).
  const sortedMembers = useMemo(() => {
    if (!sorting) return members

    const sorted = [...members].sort((a, b) => {
      switch (sorting.id) {
        case 'user':
          return a.name.localeCompare(b.name)
        case 'role':
          return a.roleName.localeCompare(b.roleName)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'joinedDate':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        default:
          return 0
      }
    })

    return sorting.desc ? sorted.reverse() : sorted
  }, [members, sorting])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(rowsPerPage)
      })

      if (filters.role !== 'all') params.set('role', filters.role)
      if (filters.status !== 'all') params.set('status', STATUS_TO_MEMBERSHIP[filters.status])
      if (filters.search.trim()) params.set('search', filters.search.trim())

      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        setMembers([])
        setTotal(0)
        setError(extractErrorMessage(payload, 'users.listUnavailable'))

        return
      }

      const result = payload as { items: TenantMemberSummary[]; total: number }

      setMembers(result.items ?? [])
      setTotal(result.total ?? 0)
    } catch (requestError) {
      setMembers([])
      setTotal(0)
      setError(requestError instanceof Error ? requestError.message : 'users.listUnavailable')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters, rowsPerPage])

  const fetchWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true)

    try {
      const response = await fetch('/api/admin/workspaces', { cache: 'no-store' })
      const payload = (await parseJsonSafe(response)) as { items?: TenantWorkspaceSummary[] }

      if (!response.ok) {
        setWorkspaces([])
        toast.error(extractErrorMessage(payload, 'No se pudieron cargar los workspaces.'))

        return
      }

      setWorkspaces(payload.items ?? [])
    } catch (requestError) {
      setWorkspaces([])
      toast.error(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los workspaces.')
    } finally {
      setWorkspacesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchMembers(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchMembers])

  const stats = useMemo(
    () => ({
      totalUsers: total,
      activeUsers: members.filter(member => member.status === 'active').length,
      pendingUsers: members.filter(member => member.status === 'pending').length,
      suspendedUsers: members.filter(member => member.status === 'suspended').length
    }),
    [members, total]
  )

  const totalFilteredCount = total
  const showingFrom = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
  const showingTo = Math.min(currentPage * rowsPerPage, total)

  const editingMember = useMemo(
    () => members.find(member => member.id === editingMemberId) ?? null,
    [editingMemberId, members]
  )

  const paginatedUserIds = useMemo(() => members.map(member => member.id), [members])
  const isAllSelected = members.length > 0 && paginatedUserIds.every(id => selectedUserIds.includes(id))
  const isIndeterminate = paginatedUserIds.some(id => selectedUserIds.includes(id)) && !isAllSelected
  const rowSelection = Object.fromEntries(selectedUserIds.map(id => [id, true]))

  const handleFilterChange = useCallback((nextFilters: Partial<UserFilters>) => {
    setFiltersState(prev => ({ ...prev, ...nextFilters }))
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setFiltersState(prev => ({ ...prev, search }))
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handleRowsPerPageChange = useCallback((n: number) => {
    setRowsPerPageState(n)
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(Math.max(page, 1), totalPages))
    },
    [totalPages]
  )

  const handleSortingChange = useCallback((nextSorting: UserSorting | null) => {
    setSorting(nextSorting)
  }, [])

  const handleSelectUser = useCallback((id: string) => {
    setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]))
  }, [])

  const handleSelectAll = useCallback((userIds: string[]) => {
    setSelectedUserIds(prev => {
      const allSelected = userIds.length > 0 && userIds.every(id => prev.includes(id))

      if (allSelected) {
        const idSet = new Set(userIds)

        return prev.filter(id => !idSet.has(id))
      }

      return [...new Set([...prev, ...userIds])]
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedUserIds([])
  }, [])

  const handleOpenAddSheet = useCallback(() => {
    setSheetMode('add')
    setEditingMemberId(null)
    void fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleOpenEditSheet = useCallback((memberId: string) => {
    setSheetMode('edit')
    setEditingMemberId(memberId)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetMode(null)
    setEditingMemberId(null)
  }, [])

  const handleInviteMember = useCallback(
    async (data: InviteMemberInput) => {
      setMutating(true)

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        const payload = await parseJsonSafe(response)

        if (!response.ok) {
          toast.error(extractErrorMessage(payload, 'No se pudo crear la invitación.'))

          return false
        }

        const invitation = payload as { acceptanceUrl?: string }

        toast.success(`Invitación enviada a ${data.email}.`, {
          description: invitation.acceptanceUrl ?? 'El usuario invitado recibirá el enlace de aceptación por correo.'
        })
        setSheetMode(null)
        await fetchMembers()

        return true
      } catch (requestError) {
        toast.error(requestError instanceof Error ? requestError.message : 'No se pudo crear la invitación.')

        return false
      } finally {
        setMutating(false)
      }
    },
    [fetchMembers]
  )

  const handleUpdateMemberRole = useCallback(
    async (member: TenantMemberSummary, data: UpdateMemberRoleInput) => {
      setMutating(true)

      try {
        const response = await fetch(`/api/admin/users/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: member.updatedAt, roleKey: data.roleKey })
        })

        const payload = await parseJsonSafe(response)

        if (!response.ok) {
          const shape = payload as ErrorShape

          if (shape?.error?.code === 'VERSION_CONFLICT') {
            toast.error('El miembro fue modificado por otra sesión. Recargando datos actualizados.')
            await fetchMembers()
          } else {
            toast.error(extractErrorMessage(payload, 'No se pudo actualizar el rol.'))
          }

          return false
        }

        toast.success('Rol actualizado correctamente.')
        setSheetMode(null)
        setEditingMemberId(null)
        await fetchMembers()

        return true
      } catch (requestError) {
        toast.error(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el rol.')

        return false
      } finally {
        setMutating(false)
      }
    },
    [fetchMembers]
  )

  const setMemberStatus = useCallback(
    async (member: TenantMemberSummary, action: 'disable' | 'enable') => {
      setMutating(true)

      try {
        const response = await fetch(`/api/admin/users/${member.id}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: member.updatedAt })
        })

        const payload = await parseJsonSafe(response)

        if (!response.ok) {
          toast.error(
            extractErrorMessage(
              payload,
              action === 'disable' ? 'No se pudo suspender al miembro.' : 'No se pudo habilitar al miembro.'
            )
          )

          return false
        }

        toast.success(action === 'disable' ? 'Miembro suspendido.' : 'Miembro habilitado.')
        await fetchMembers()

        return true
      } catch (requestError) {
        toast.error(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el estado del miembro.')

        return false
      } finally {
        setMutating(false)
      }
    },
    [fetchMembers]
  )

  const handleDisableMember = useCallback((member: TenantMemberSummary) => setMemberStatus(member, 'disable'), [setMemberStatus])
  const handleEnableMember = useCallback((member: TenantMemberSummary) => setMemberStatus(member, 'enable'), [setMemberStatus])

  return {
    members,
    paginatedUsers: sortedMembers,
    loading,
    error,
    mutating,
    stats,
    filters,
    totalPages,
    totalFilteredCount,
    showingFrom,
    showingTo,
    rowsPerPage,
    currentPage,
    selectedUserIds,
    isAllSelected,
    isIndeterminate,
    rowSelection,
    sorting,
    sheetMode,
    editingMember,
    handleFilterChange,
    handleSearchChange,
    handleRowsPerPageChange,
    handlePageChange,
    handleSortingChange,
    handleSelectUser,
    handleSelectAll,
    handleClearSelection,
    handleOpenAddSheet,
    handleOpenEditSheet,
    handleCloseSheet,
    handleInviteMember,
    handleUpdateMemberRole,
    handleDisableMember,
    handleEnableMember,
    refresh: fetchMembers,
    workspaces,
    workspacesLoading
  }
}
