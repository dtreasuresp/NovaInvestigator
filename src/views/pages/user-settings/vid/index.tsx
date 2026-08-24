'use client'

import { useCallback, useEffect, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Clock3Icon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { VidRequestStatus } from '@/lib/supabase/database.types'
import type { VidRequestSummary, VidUserState } from '@/features/vid/types'
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
  PROFILE_UNAVAILABLE: 'Tu perfil todavía no está disponible para iniciar la verificación.',
  ALREADY_VERIFIED: 'Tu cuenta ya tiene la verificación VID aprobada.',
  CONFLICT: 'La solicitud cambió o ya existe una revisión abierta. Recarga la página.',
  RATE_LIMITED: 'Has realizado demasiadas solicitudes. Espera un momento y vuelve a intentarlo.'
}

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
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  )
}

const isVidState = (value: unknown): value is VidUserState => {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Record<string, unknown>

  return (
    (item.vidStatus === 'unverified' ||
      item.vidStatus === 'pending' ||
      item.vidStatus === 'under_review' ||
      item.vidStatus === 'verified' ||
      item.vidStatus === 'rejected') &&
    (item.request === null || isVidRequest(item.request))
  )
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

const VidVerification = () => {
  const { t } = useI18n()
  const [state, setState] = useState<VidUserState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadState = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vid', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok || typeof payload !== 'object' || payload === null || !('state' in payload) || !isVidState(payload.state)) {
        throw new Error(getErrorMessage(payload, 'No se pudo cargar el estado de verificación.'))
      }

      setState(payload.state)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el estado de verificación.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadState()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadState])

  const submitRequest = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/vid', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationMethod: 'manual' })
      })

      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok || typeof payload !== 'object' || payload === null || !('state' in payload) || !isVidState(payload.state)) {
        throw new Error(getErrorMessage(payload, 'No se pudo enviar la solicitud de verificación.'))
      }

      setState(payload.state)
      toast.success('Solicitud VID enviada para revisión.')
    } catch (requestError) {
      const errorMsg = requestError instanceof Error ? requestError.message : 'No se pudo enviar la solicitud de verificación.'

      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const request = state?.request ?? null

  const canSubmit =
    state !== null &&
    state.vidStatus !== 'verified' &&
    (!request || request.status === 'rejected' || request.status === 'needs_resubmission')

  return (
    <section className='grid grid-cols-1 gap-10 py-3 lg:grid-cols-3'>
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{t('nav.digitalVerification')}</h3>
        <p className='text-muted-foreground text-sm'>{t('userSettings.vidSubtitle') || 'Solicita una verificación digital básica como capa de seguridad de la cuenta.'}</p>
      </div>

      <div className='space-y-6 lg:col-span-2'>
        {error && (
          <Alert variant='destructive'>
            <AlertCircleIcon />
            <AlertTitle>{t('common.error')}</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant='link' className='ml-1 h-auto p-0' onClick={() => void loadState()}>
                {t('common.refresh')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShieldCheckIcon className='text-muted-foreground size-4' />
              {t('userSettings.vidVerification') || 'Verificación VID'}
            </CardTitle>
            <CardDescription>
              NovaStore conserva el resultado y los metadatos mínimos de la revisión, nunca documentos de identidad crudos.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            {loading ? (
              <div className='space-y-3'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-4 w-full max-w-lg' />
              </div>
            ) : state?.vidStatus === 'verified' ? (
              <Alert>
                <CheckCircle2Icon />
                <AlertTitle>{t('common.success') || 'Verificación aprobada'}</AlertTitle>
                <AlertDescription>
                  Tu cuenta puede utilizar las funciones comerciales habilitadas por tu tenant y plan.
                </AlertDescription>
              </Alert>
            ) : request?.status === 'pending' || request?.status === 'under_review' ? (
              <Alert>
                <Clock3Icon />
                <AlertTitle>{t('common.status') || 'Solicitud en revisión'}</AlertTitle>
                <AlertDescription>
                  Recibimos tu solicitud el {formatDate(request.submittedAt)}. El equipo de plataforma todavía debe resolverla.
                </AlertDescription>
              </Alert>
            ) : request?.status === 'rejected' || request?.status === 'needs_resubmission' ? (
              <Alert variant='destructive'>
                <AlertCircleIcon />
                <AlertTitle>{statusLabel[request.status]}</AlertTitle>
                <AlertDescription>
                  {request.decisionReason ?? 'Revisa los datos solicitados y vuelve a enviar la solicitud.'}
                </AlertDescription>
              </Alert>
            ) : (
              <p className='text-muted-foreground text-sm'>
                Todavía no has enviado una solicitud. La verificación VID es independiente del acceso comercial y de la exportación de
                documentos.
              </p>
            )}

            {request && (
              <div className='flex flex-wrap items-center gap-3 border-t pt-4'>
                <Badge variant={statusVariant[request.status]}>{statusLabel[request.status]}</Badge>
                <span className='text-muted-foreground text-xs'>Enviada {formatDate(request.submittedAt)}</span>
                <span className='text-muted-foreground text-xs'>Retención hasta {formatDate(request.retentionUntil)}</span>
              </div>
            )}

            {canSubmit && (
              <Button onClick={() => void submitRequest()} disabled={submitting}>
                <ShieldCheckIcon />
                {submitting ? 'Enviando...' : request ? 'Enviar nuevamente' : 'Solicitar revisión'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default VidVerification
