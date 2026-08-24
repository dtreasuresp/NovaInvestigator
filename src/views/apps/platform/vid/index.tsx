'use client'

import { useCallback, useEffect, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, ClipboardCheckIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { VidRequestStatus } from '@/lib/supabase/database.types'
import type { VidAdminRequestSummary, VidRequestSummary, VidReviewAction } from '@/features/vid/types'
import { useI18n } from '@/hooks/use-i18n'

const statusLabel: Record<VidRequestStatus, string> = {
  pending: 'Pendiente',
  under_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  needs_resubmission: 'Requiere nuevos datos'
}

const statusVariant: Record<VidRequestStatus, 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  under_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  needs_resubmission: 'destructive'
}

const errorMessageByCode: Record<string, string> = {
  UNAUTHENTICATED: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  FORBIDDEN: 'No tienes capacidad para revisar verificaciones VID.',
  NOT_FOUND: 'La solicitud ya no existe o no está disponible.',
  CONFLICT: 'La solicitud cambió en otra sesión. Recarga la cola antes de reintentar.',
  RATE_LIMITED: 'Se alcanzó el límite temporal de revisiones. Espera un momento.',
  VALIDATION_ERROR: 'La decisión o el motivo no cumplen el formato esperado.'
}

type DecisionDialog = {
  item: VidAdminRequestSummary
  action: Exclude<VidReviewAction, 'start_review'>
}

const parseJson = (response: Response): Promise<unknown> => response.json().catch(() => null)

const isVidRequest = (value: unknown): value is VidRequestSummary => {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.userId === 'string' &&
    (item.status === 'pending' ||
      item.status === 'under_review' ||
      item.status === 'approved' ||
      item.status === 'rejected' ||
      item.status === 'needs_resubmission') &&
    (item.verificationMethod === 'manual' || item.verificationMethod === 'provider') &&
    (typeof item.providerReference === 'string' || item.providerReference === null) &&
    (typeof item.decisionReason === 'string' || item.decisionReason === null) &&
    (typeof item.reviewerUserId === 'string' || item.reviewerUserId === null) &&
    typeof item.submittedAt === 'string' &&
    (typeof item.reviewedAt === 'string' || item.reviewedAt === null) &&
    typeof item.retentionUntil === 'string' &&
    typeof item.version === 'number' &&
    (typeof item.correlationId === 'string' || item.correlationId === null) &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

const isVidItem = (value: unknown): value is VidAdminRequestSummary => {
  if (!isVidRequest(value)) return false

  const item = value as VidAdminRequestSummary

  return (
    (typeof item.displayName === 'string' || item.displayName === null) &&
    (item.profileVidStatus === 'pending' ||
      item.profileVidStatus === 'verified' ||
      item.profileVidStatus === 'rejected' ||
      item.profileVidStatus === null)
  )
}

const isVidResponse = (value: unknown): value is { items: VidAdminRequestSummary[]; total: number } => {
  if (typeof value !== 'object' || value === null) return false

  const payload = value as Record<string, unknown>

  return typeof payload.total === 'number' && Array.isArray(payload.items) && payload.items.every(isVidItem)
}

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload !== 'object' || payload === null) return fallback

  const error = (payload as { error?: { code?: string } }).error

  return (error?.code && errorMessageByCode[error.code]) || fallback
}

const formatDate = (value: string | null): string => {
  if (!value) return 'Fecha no disponible'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const actionTitle: Record<DecisionDialog['action'], string> = {
  approve: 'Aprobar verificación',
  reject: 'Rechazar verificación',
  request_resubmission: 'Solicitar nuevos datos',
  reopen: 'Reabrir solicitud'
}

const actionDescription: Record<DecisionDialog['action'], string> = {
  approve: 'La cuenta quedará con VID verificada; el acceso comercial depende del plan y entitlement vigente.',
  reject: 'La cuenta conservará el estado VID rechazado hasta que se envíe una nueva solicitud.',
  request_resubmission: 'La cuenta seguirá pendiente y podrá volver a enviar la solicitud con los datos corregidos.',
  reopen: 'La solicitud volverá a la cola pendiente para una nueva revisión.'
}

const PAGE_SIZE = 20

const VidReview = () => {
  const { t } = useI18n()
  const [items, setItems] = useState<VidAdminRequestSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DecisionDialog | null>(null)
  const [reason, setReason] = useState('')

  const loadQueue = useCallback(async (nextPage = 1) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/vid?page=${nextPage}&pageSize=${PAGE_SIZE}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      const payload: unknown = await parseJson(response)

      if (!response.ok || !isVidResponse(payload)) {
        throw new Error(getErrorMessage(payload, 'No se pudo cargar la cola de revisión VID.'))
      }

      setItems(payload.items)
      setTotal(payload.total)
      setPage(nextPage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la cola de revisión VID.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue(1)
  }, [loadQueue])

  const runAction = async (item: VidAdminRequestSummary, action: VidReviewAction, actionReason?: string) => {
    setActingId(item.id)
    setError(null)

    try {
      const response = await fetch(`/api/platform/vid/${item.id}/review`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: item.version,
          action,
          ...(actionReason ? { reason: actionReason } : {})
        })
      })

      const payload: unknown = await parseJson(response)

      if (!response.ok || typeof payload !== 'object' || payload === null || !('item' in payload)) {
        throw new Error(getErrorMessage(payload, 'No se pudo actualizar la solicitud VID.'))
      }

      const updatedRequest = payload.item

      if (!isVidRequest(updatedRequest)) {
        throw new Error('La respuesta de la revisión VID no tiene un formato válido.')
      }

      setItems(current => current.map(currentItem => (currentItem.id === item.id ? { ...currentItem, ...updatedRequest } : currentItem)))
      toast.success('Solicitud VID actualizada.')
      setDialog(null)
      setReason('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la solicitud VID.')
    } finally {
      setActingId(null)
    }
  }

  const openDialog = (item: VidAdminRequestSummary, action: DecisionDialog['action']) => {
    setReason('')
    setDialog({ item, action })
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>{t('roles.scopePlatform')}</p>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('platformAdmin.vidTitle')}</h1>
          <p className='text-muted-foreground max-w-3xl text-sm'>
            {t('platformAdmin.vidDesc')}
          </p>
        </div>
        <Button variant='outline' onClick={() => void loadQueue(page)} disabled={loading || actingId !== null}>
          <SearchIcon />
          {t('common.refresh')}
        </Button>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertCircleIcon />
          <AlertTitle>{t('common.error') || 'No se pudo completar la operación'}</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant='link' className='ml-1 h-auto p-0' onClick={() => void loadQueue()}>
              {t('common.retry') || 'Reintentar'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {[1, 2, 3, 4].map(item => (
            <Card key={item}>
              <CardHeader>
                <Skeleton className='h-5 w-48' />
                <Skeleton className='h-4 w-72' />
              </CardHeader>
              <CardContent className='space-y-3'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-9 w-32' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center gap-2 py-16 text-center'>
            <ClipboardCheckIcon className='text-muted-foreground size-8' />
            <p className='font-medium'>{t('userSettings.noVidRequests') || 'No hay solicitudes VID'}</p>
            <p className='text-muted-foreground text-sm'>{t('userSettings.vidQueueEmptyDesc') || 'La cola se actualizará cuando un usuario solicite una revisión.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          {items.map(item => (
            <Card key={item.id}>
              <CardHeader className='border-b'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0 space-y-1'>
                    <CardTitle className='truncate'>{item.displayName || (t('common.userWithoutName') || 'Usuario sin nombre')}</CardTitle>
                    <CardDescription className='truncate'>{item.userId}</CardDescription>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <dl className='grid gap-3 text-sm sm:grid-cols-2'>
                  <div>
                    <dt className='text-muted-foreground'>{t('common.filter') || 'Método'}</dt>
                    <dd className='font-medium'>{item.verificationMethod === 'manual' ? (t('common.manual') || 'Manual') : (t('common.provider') || 'Proveedor')}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>{t('userSettings.colDate') || 'Enviada'}</dt>
                    <dd className='font-medium'>{formatDate(item.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>{t('common.version') || 'Versión'}</dt>
                    <dd className='font-medium'>{item.version}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>{t('invitations.statusExpired') || 'Retención'}</dt>
                    <dd className='font-medium'>{formatDate(item.retentionUntil)}</dd>
                  </div>
                </dl>
                {item.decisionReason && (
                  <Alert variant='destructive'>
                    <AlertCircleIcon />
                    <AlertDescription>{item.decisionReason}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className='flex flex-wrap justify-end gap-2 border-t'>
                {item.status === 'pending' && (
                  <Button
                    variant='outline'
                    onClick={() => void runAction(item, 'start_review')}
                    disabled={actingId !== null}
                  >
                    Tomar revisión
                  </Button>
                )}
                {(item.status === 'pending' || item.status === 'under_review') && (
                  <>
                    <Button onClick={() => openDialog(item, 'approve')} disabled={actingId !== null}>
                      <CheckCircle2Icon />
                      Aprobar
                    </Button>
                    <Button variant='destructive' onClick={() => openDialog(item, 'reject')} disabled={actingId !== null}>
                      Rechazar
                    </Button>
                    <Button variant='outline' onClick={() => openDialog(item, 'request_resubmission')} disabled={actingId !== null}>
                      Solicitar reenvío
                    </Button>
                  </>
                )}
                {(item.status === 'rejected' || item.status === 'needs_resubmission') && (
                  <Button variant='outline' onClick={() => openDialog(item, 'reopen')} disabled={actingId !== null}>
                    <RotateCcwIcon />
                    Reabrir
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-muted-foreground text-xs'>
          Mostrando {items.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, total)} de {total} solicitudes. Las decisiones
          quedan registradas en la auditoría de plataforma.
        </p>
        {total > PAGE_SIZE && (
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void loadQueue(page - 1)}
              disabled={loading || actingId !== null || page === 1}
            >
              Anterior
            </Button>
            <span className='text-muted-foreground text-xs'>
              Página {page} de {Math.ceil(total / PAGE_SIZE)}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void loadQueue(page + 1)}
              disabled={loading || actingId !== null || page >= Math.ceil(total / PAGE_SIZE)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog ? actionTitle[dialog.action] : 'Decisión VID'}</DialogTitle>
            <DialogDescription>{dialog ? actionDescription[dialog.action] : ''}</DialogDescription>
          </DialogHeader>
          {dialog && (dialog.action === 'reject' || dialog.action === 'request_resubmission') && (
            <div className='space-y-2'>
              <Label htmlFor='vid-decision-reason'>{t('common.description') || 'Motivo'}</Label>
              <Textarea
                id='vid-decision-reason'
                value={reason}
                onChange={event => setReason(event.target.value)}
                placeholder={t('common.description') || 'Describe de forma breve qué debe corregirse.'}
                maxLength={1000}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialog(null)} disabled={actingId !== null}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={dialog?.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => {
                if (!dialog) return
                void runAction(dialog.item, dialog.action, reason.trim() || undefined)
              }}
              disabled={
                actingId !== null ||
                (dialog?.action !== 'approve' && dialog?.action !== 'reopen' && reason.trim().length === 0)
              }
            >
              {actingId ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VidReview
