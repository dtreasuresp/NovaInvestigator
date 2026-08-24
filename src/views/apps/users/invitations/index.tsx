'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'
import {
  AlertCircleIcon,
  CheckIcon,
  Clock3Icon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type {
  InvitationDeliveryStatus,
  ListReceivedInvitationsResult,
  ListTenantInvitationsResult,
  ReceivedInvitationSummary,
  TenantInvitationStatus,
  TenantInvitationSummary,
  TenantRoleSummary,
  TenantWorkspaceSummary
} from '@/features/users/types'

import { UserPagination } from '../list/user-pagination'
import { useI18n } from '@/hooks/use-i18n'

const PAGE_SIZE = 10

type PageMode = 'admin' | 'received'

interface ErrorShape {
  error?: {
    code?: string
    messageKey?: string
  }
}

interface EditDraft {
  email: string
  roleKey: string
  workspaceId: string
  updatedAt: string
}

const invitationStatusLabel: Record<TenantInvitationStatus, string> = {
  pending: 'Pendiente',
  expired: 'Expirada'
}

const invitationStatusVariant: Record<TenantInvitationStatus, 'default' | 'destructive'> = {
  pending: 'default',
  expired: 'destructive'
}

const deliveryStatusLabel: Record<InvitationDeliveryStatus, string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  failed: 'Error'
}

const deliveryStatusVariant: Record<InvitationDeliveryStatus, 'outline' | 'default' | 'destructive'> = {
  pending: 'outline',
  sent: 'default',
  failed: 'destructive'
}

const errorMessageByCode: Record<string, string> = {
  INVITATION_DELIVERY_FAILED:
    'La invitación se guardó, pero no se pudo enviar el correo. Revisa Resend y vuelve a intentarlo.',
  VERSION_CONFLICT: 'La invitación cambió en otra sesión. Recarga la lista antes de volver a intentarlo.',
  INVALID_TRANSITION: 'La invitación ya no puede modificarse en su estado actual.',
  FORBIDDEN: 'No tienes permiso para gestionar invitaciones en este tenant.',
  UNAUTHENTICATED: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  TENANT_REQUIRED: 'No hay un tenant activo asociado a esta cuenta.'
}

function parseJsonSafe(response: Response): Promise<unknown> {
  return response
    .json()
    .catch(() => null)
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }

  const error = (payload as ErrorShape).error

  return (error?.code && errorMessageByCode[error.code]) || fallback
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function isTenantInvitationSummary(value: unknown): value is TenantInvitationSummary {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.tenantId === 'string' &&
    typeof item.workspaceId === 'string' &&
    typeof item.workspaceName === 'string' &&
    (typeof item.workspaceSlug === 'string' || item.workspaceSlug === null) &&
    typeof item.email === 'string' &&
    typeof item.roleId === 'string' &&
    typeof item.roleKey === 'string' &&
    typeof item.roleName === 'string' &&
    (item.status === 'pending' || item.status === 'expired') &&
    (item.deliveryStatus === 'pending' || item.deliveryStatus === 'sent' || item.deliveryStatus === 'failed') &&
    typeof item.expiresAt === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

function isReceivedInvitationSummary(value: unknown): value is ReceivedInvitationSummary {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.tenantId === 'string' &&
    typeof item.tenantName === 'string' &&
    typeof item.workspaceId === 'string' &&
    typeof item.workspaceName === 'string' &&
    typeof item.email === 'string' &&
    typeof item.roleId === 'string' &&
    typeof item.roleKey === 'string' &&
    typeof item.roleName === 'string' &&
    typeof item.invitedByName === 'string' &&
    (typeof item.invitedByEmail === 'string' || item.invitedByEmail === null) &&
    (item.status === 'pending' || item.status === 'expired') &&
    typeof item.expiresAt === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

function isAdminResponse(value: unknown): value is ListTenantInvitationsResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return (
    Array.isArray(payload.items) &&
    payload.items.every(isTenantInvitationSummary) &&
    typeof payload.page === 'number' &&
    typeof payload.pageSize === 'number' &&
    typeof payload.total === 'number'
  )
}

function isReceivedResponse(value: unknown): value is ListReceivedInvitationsResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return Array.isArray(payload.items) && payload.items.every(isReceivedInvitationSummary)
}

function isWorkspaceResponse(value: unknown): value is { items: TenantWorkspaceSummary[] } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return (
    Array.isArray(payload.items) &&
    payload.items.every(item => {
      if (typeof item !== 'object' || item === null) return false
      const workspace = item as Record<string, unknown>

      return (
        typeof workspace.id === 'string' &&
        typeof workspace.name === 'string' &&
        typeof workspace.slug === 'string' &&
        (workspace.status === 'active' || workspace.status === 'suspended' || workspace.status === 'archived')
      )
    })
  )
}

function isRoleResponse(value: unknown): value is { items: TenantRoleSummary[] } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return (
    Array.isArray(payload.items) &&
    payload.items.every(item => {
      if (typeof item !== 'object' || item === null) return false
      const role = item as Record<string, unknown>

      return typeof role.id === 'string' && typeof role.key === 'string' && typeof role.name === 'string'
    })
  )
}

const InvitationsApp = () => {
  const { t } = useI18n()
  const router = useRouter()
  const [mode, setMode] = useState<PageMode | null>(null)
  const [adminItems, setAdminItems] = useState<TenantInvitationSummary[]>([])
  const [receivedItems, setReceivedItems] = useState<ReceivedInvitationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<TenantInvitationSummary | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [revoking, setRevoking] = useState<TenantInvitationSummary | null>(null)
  const [workspaces, setWorkspaces] = useState<TenantWorkspaceSummary[]>([])
  const [roles, setRoles] = useState<TenantRoleSummary[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  const filteredReceivedItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    if (!normalized) {
      return receivedItems
    }

    return receivedItems.filter(item =>
      [item.tenantName, item.workspaceName, item.roleName, item.invitedByName].some(value =>
        value.toLowerCase().includes(normalized)
      )
    )
  }, [receivedItems, search])

  const loadInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const adminParams = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE)
      })

      if (search.trim()) {
        adminParams.set('search', search.trim())
      }

      const adminResponse = await fetch(`/api/admin/users/invitations?${adminParams.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      const adminPayload = await parseJsonSafe(adminResponse)

      if (adminResponse.ok && isAdminResponse(adminPayload)) {
        setMode('admin')
        setAdminItems(adminPayload.items)
        setTotal(adminPayload.total)
        setReceivedItems([])

        return
      }

      const receivedResponse = await fetch('/api/auth/invitations', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      const receivedPayload = await parseJsonSafe(receivedResponse)

      if (!receivedResponse.ok || !isReceivedResponse(receivedPayload)) {
        throw new Error(getErrorMessage(receivedPayload, getErrorMessage(adminPayload, 'No se pudieron cargar las invitaciones.')))
      }

      setMode('received')
      setReceivedItems(receivedPayload.items)
      setAdminItems([])
      setTotal(receivedPayload.items.length)
    } catch (requestError) {
      setMode(null)
      setAdminItems([])
      setReceivedItems([])
      setTotal(0)
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las invitaciones.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadInvitations(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInvitations])

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages))
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const loadEditOptions = async () => {
    setOptionsLoading(true)

    try {
      const [workspacesResponse, rolesResponse] = await Promise.all([
        fetch('/api/admin/workspaces', { headers: { Accept: 'application/json' }, cache: 'no-store' }),
        fetch('/api/admin/users/roles', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      ])

      const [workspacesPayload, rolesPayload] = await Promise.all([
        parseJsonSafe(workspacesResponse),
        parseJsonSafe(rolesResponse)
      ])

      if (!workspacesResponse.ok || !isWorkspaceResponse(workspacesPayload)) {
        throw new Error(getErrorMessage(workspacesPayload, 'No se pudieron cargar los workspaces.'))
      }

      if (!rolesResponse.ok || !isRoleResponse(rolesPayload)) {
        throw new Error(getErrorMessage(rolesPayload, 'No se pudieron cargar los roles.'))
      }

      setWorkspaces(workspacesPayload.items)
      setRoles(rolesPayload.items)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las opciones de edición.')
    } finally {
      setOptionsLoading(false)
    }
  }

  const openEdit = (invitation: TenantInvitationSummary) => {
    setError(null)
    setEditing(invitation)
    setEditDraft({
      email: invitation.email,
      roleKey: invitation.roleKey,
      workspaceId: invitation.workspaceId,
      updatedAt: invitation.updatedAt
    })
    void loadEditOptions()
  }

  const closeEdit = () => {
    setEditing(null)
    setEditDraft(null)
  }

  const handleSaveEdit = async () => {
    if (!editing || !editDraft) return

    setMutatingId(editing.id)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/invitations/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(editDraft)
      })

      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'No se pudo actualizar la invitación.'))
      }

      const recipientEmail = editDraft.email

      closeEdit()
      toast.success(`Invitación enviada a ${recipientEmail}.`, {
        description: 'El enlace actualizado fue enviado al usuario invitado.'
      })
      await loadInvitations()
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la invitación.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleResend = async (invitation: TenantInvitationSummary) => {
    setMutatingId(invitation.id)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/invitations/${invitation.id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ updatedAt: invitation.updatedAt })
      })

      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'No se pudo reenviar la invitación.'))
      }

      toast.success(`Invitación enviada a ${invitation.email}.`, {
        description: 'El usuario invitado recibirá un enlace actualizado por correo.'
      })
      await loadInvitations()
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'No se pudo reenviar la invitación.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleRevoke = async () => {
    if (!revoking) return

    setMutatingId(revoking.id)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/invitations/${revoking.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ updatedAt: revoking.updatedAt })
      })

      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'No se pudo revocar la invitación.'))
      }

      setRevoking(null)
      toast.success('La invitación se revocó correctamente.')
      await loadInvitations()
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'No se pudo revocar la invitación.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleAccept = async (invitation: ReceivedInvitationSummary) => {
    setMutatingId(invitation.id)
    setError(null)

    try {
      const response = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ invitationId: invitation.id })
      })

      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'La invitación no es válida o ya no está disponible.'))
      }

      setReceivedItems(items => items.filter(item => item.id !== invitation.id))
      toast.success(`Ahora tienes acceso a ${invitation.workspaceName}.`)
      router.refresh()
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'No se pudo aceptar la invitación.')
    } finally {
      setMutatingId(null)
    }
  }

  const renderAdminTable = () => (
    <Card className='py-0 shadow-none'>
      <div className='w-full'>
        <div className='border-b'>
          <div className='flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between'>
            <div>
              <CardTitle className='text-base'>{t('invitations.pendingTitle')}</CardTitle>
              <CardDescription>{t('invitations.pendingDesc')}</CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Label htmlFor='search-invitation' className='sr-only'>
                {t('invitations.searchPlaceholder')}
              </Label>
              <InputGroup className='w-full sm:w-64'>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id='search-invitation'
                  value={search}
                  onChange={event => handleSearchChange(event.target.value)}
                  placeholder={t('invitations.searchPlaceholder')}
                  type='search'
                />
              </InputGroup>
              <Button
                aria-label={t('common.refresh')}
                variant='outline'
                size='icon'
                onClick={() => void loadInvitations()}
                disabled={loading}
              >
                <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className='flex flex-col gap-3 p-6 pt-0'>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className='h-14 w-full' />
              ))}
            </div>
          ) : adminItems.length === 0 ? (
            <div className='text-muted-foreground px-6 py-16 text-center text-sm'>
              {search ? t('investigations.noSearchResults') : t('invitations.emptyState')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invitations.colEmail')}</TableHead>
                  <TableHead>{t('invitations.colWorkspace')}</TableHead>
                  <TableHead>{t('invitations.colRole')}</TableHead>
                  <TableHead>{t('invitations.colStatus')}</TableHead>
                  <TableHead>{t('invitations.colDelivery')}</TableHead>
                  <TableHead>{t('users.colJoinedDate')}</TableHead>
                  <TableHead className='text-right'>{t('invitations.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminItems.map(invitation => (
                  <TableRow key={invitation.id}>
                    <TableCell className='font-medium'>{invitation.email}</TableCell>
                    <TableCell>{invitation.workspaceName}</TableCell>
                    <TableCell>{invitation.roleName}</TableCell>
                    <TableCell>
                      <Badge variant={invitationStatusVariant[invitation.status]}>
                        {invitation.status === 'pending' ? t('invitations.statusPending') : t('invitations.statusExpired')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={deliveryStatusVariant[invitation.deliveryStatus]}>
                        {invitation.deliveryStatus === 'pending'
                          ? t('invitations.deliveryPending')
                          : invitation.deliveryStatus === 'sent'
                            ? t('invitations.deliverySent')
                            : t('invitations.deliveryFailed')}
                      </Badge>
                    </TableCell>
                    <TableCell className='whitespace-nowrap'>{formatDate(invitation.expiresAt)}</TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-1'>
                        <Button
                          aria-label={`${t('invitations.edit')} ${invitation.email}`}
                          title={t('invitations.edit')}
                          variant='ghost'
                          size='icon'
                          onClick={() => openEdit(invitation)}
                          disabled={mutatingId !== null}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          aria-label={`Reenviar invitación a ${invitation.email}`}
                          title={t('invitations.resend')}
                          variant='ghost'
                          size='icon'
                          onClick={() => void handleResend(invitation)}
                          disabled={mutatingId !== null}
                        >
                          <SendIcon />
                        </Button>
                        <Button
                          aria-label={`Revocar invitación de ${invitation.email}`}
                          title={t('invitations.revoke') || 'Revocar invitación'}
                          variant='ghost'
                          size='icon'
                          onClick={() => setRevoking(invitation)}
                          disabled={mutatingId !== null}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <UserPagination
          showingFrom={showingFrom}
          showingTo={showingTo}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </Card>
  )

  const renderReceivedTable = () => (
    <Card className='py-0 shadow-none'>
      <CardHeader className='gap-1 border-b px-6 py-4'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-base'>{t('nav.invitations')}</CardTitle>
            <CardDescription>{t('invitations.receivedInvitationsDesc') || 'Revisa las invitaciones enviadas a tu correo y acepta las que correspondan.'}</CardDescription>
          </div>
          <Button
            aria-label={t('common.refresh')}
            variant='outline'
            size='icon'
            onClick={() => void loadInvitations()}
            disabled={loading}
          >
            <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
          </Button>
        </div>
        <div className='pt-3'>
          <Label htmlFor='search-received-invitation' className='sr-only'>
            Buscar invitación recibida
          </Label>
          <InputGroup className='w-full sm:max-w-xs'>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              id='search-received-invitation'
              value={search}
              onChange={event => handleSearchChange(event.target.value)}
              placeholder={t('datatables.search')}
              type='search'
            />
          </InputGroup>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {loading ? (
          <div className='flex flex-col gap-3 p-6'>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className='h-16 w-full' />
            ))}
          </div>
        ) : filteredReceivedItems.length === 0 ? (
          <div className='text-muted-foreground px-6 py-16 text-center text-sm'>
            {search ? 'No hay invitaciones que coincidan con la búsqueda.' : 'No tienes invitaciones pendientes.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roles.scopeTenant')}</TableHead>
                <TableHead>{t('invitations.invitedBy') || 'Invitado por'}</TableHead>
                <TableHead>{t('userSettings.role')}</TableHead>
                <TableHead>{t('platform.planStatus')}</TableHead>
                <TableHead>{t('invitations.statusExpired')}</TableHead>
                <TableHead className='text-right'>{t('platform.planAction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceivedItems.map(invitation => (
                <TableRow key={invitation.id}>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{invitation.tenantName}</span>
                      <span className='text-muted-foreground text-xs'>{invitation.workspaceName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{invitation.invitedByName}</TableCell>
                  <TableCell>{invitation.roleName}</TableCell>
                  <TableCell>
                    <Badge variant={invitationStatusVariant[invitation.status]}>
                      {invitationStatusLabel[invitation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className='whitespace-nowrap'>{formatDate(invitation.expiresAt)}</TableCell>
                  <TableCell className='text-right'>
                    <Button
                      size='sm'
                      onClick={() => void handleAccept(invitation)}
                      disabled={invitation.status !== 'pending' || mutatingId !== null}
                    >
                      <CheckIcon />
                      Aceptar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter className='justify-between border-t'>
        <p className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Clock3Icon className='size-4' />
          La expiración se valida en el servidor
        </p>
        <span className='text-muted-foreground text-sm'>{filteredReceivedItems.length} invitación(es)</span>
      </CardFooter>
    </Card>
  )

  return (
    <div className='flex flex-col gap-3 lg:gap-6'>
      {error ? (
        <Alert variant='destructive'>
          <AlertCircleIcon />
          <AlertTitle>{t('common.error') || 'No se pudo completar la operación.'}</AlertTitle>
          <AlertDescription className='flex flex-wrap items-center gap-2'>
            <span>{error}</span>
            <Button variant='link' className='h-auto p-0' onClick={() => void loadInvitations()}>
              {t('common.retry') || 'Reintentar'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {mode === 'admin' ? renderAdminTable() : mode === 'received' ? renderReceivedTable() : (
        <Card className='py-0 shadow-none'>
          <div className='flex flex-col gap-3 border-b p-6'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-10 w-full' />
          </div>
          <CardContent className='flex flex-col gap-3 p-6'>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className='h-14 w-full' />
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={open => !open && closeEdit()}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('datatables.edit')}</DialogTitle>
            <DialogDescription>
              Al guardar se generará un enlace nuevo y se enviará al correo actualizado.
            </DialogDescription>
          </DialogHeader>

          {editDraft ? (
            <div className='grid gap-4 py-2'>
              <div className='grid gap-2'>
                <Label htmlFor='invitation-email'>{t('invitations.colEmail')}</Label>
                <Input
                  id='invitation-email'
                  type='email'
                  value={editDraft.email}
                  onChange={event => setEditDraft({ ...editDraft, email: event.target.value })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='invitation-workspace'>{t('invitations.colWorkspace') || 'Espacio de Trabajo'}</Label>
                <Select
                  items={workspaces.map(workspace => ({ label: workspace.name, value: workspace.id }))}
                  value={editDraft.workspaceId}
                  onValueChange={value => value && setEditDraft({ ...editDraft, workspaceId: value })}
                  disabled={optionsLoading}
                >
                  <SelectTrigger id='invitation-workspace'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map(workspace => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='invitation-role'>{t('userSettings.role')}</Label>
                <Select
                  items={roles.map(role => ({ label: role.name, value: role.key }))}
                  value={editDraft.roleKey}
                  onValueChange={value => value && setEditDraft({ ...editDraft, roleKey: value })}
                  disabled={optionsLoading}
                >
                  <SelectTrigger id='invitation-role'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.key}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant='outline' onClick={closeEdit} disabled={mutatingId !== null}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={optionsLoading || mutatingId !== null}>
              <CheckIcon />
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revoking !== null} onOpenChange={open => !open && setRevoking(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('invitations.revoke') || 'Revocar invitación'}</DialogTitle>
            <DialogDescription>
              El enlace dejará de ser válido y la invitación se conservará como registro de auditoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRevoking(null)} disabled={mutatingId !== null}>
              Cancelar
            </Button>
            <Button variant='destructive' onClick={() => void handleRevoke()} disabled={mutatingId !== null}>
              <Trash2Icon />
              Revocar invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InvitationsApp
