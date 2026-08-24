'use client'

import { useCallback, useEffect, useState } from 'react'

import { AlertCircleIcon, Clock3Icon, DatabaseZapIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'

interface CleanupStatus {
  retentionDays: number
  pendingCount: number
  eligibleCount: number
  oldestCreatedAt: string | null
}

interface CleanupResult {
  deletedCount: number
  retentionDays: number
  cutoffAt: string
}

const isCleanupResult = (value: unknown): value is CleanupResult => {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.deletedCount === 'number' &&
    typeof candidate.retentionDays === 'number' &&
    typeof candidate.cutoffAt === 'string'
  )
}

const isCleanupStatus = (value: unknown): value is CleanupStatus => {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.retentionDays === 'number' &&
    typeof candidate.pendingCount === 'number' &&
    typeof candidate.eligibleCount === 'number' &&
    (typeof candidate.oldestCreatedAt === 'string' || candidate.oldestCreatedAt === null)
  )
}

const formatDate = (value: string | null) => {
  if (!value) return 'Sin registros pendientes'

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

const RegistrationCleanup = () => {
  const { t } = useI18n()
  const [status, setStatus] = useState<CleanupStatus | null>(null)
  const [retentionDays, setRetentionDays] = useState('')
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const requestStatus = useCallback(async () => {
    const response = await fetch('/api/platform/pending-registrations', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })

    const payload: unknown = await response.json()

    if (!response.ok || typeof payload !== 'object' || payload === null || !('status' in payload)) {
      throw new Error('status_request_failed')
    }

    if (!isCleanupStatus(payload.status)) {
      throw new Error('status_response_invalid')
    }

    return payload.status
  }, [])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      const nextStatus = await requestStatus()

      setStatus(nextStatus)
      setRetentionDays(String(nextStatus.retentionDays))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [requestStatus])

  useEffect(() => {
    let mounted = true

    requestStatus()
      .then(nextStatus => {
        if (!mounted) return

        setStatus(nextStatus)
        setRetentionDays(String(nextStatus.retentionDays))
        setError(false)
      })
      .catch(() => {
        if (mounted) {
          setError(true)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [requestStatus])

  const handleSaveRetention = async () => {
    const parsedRetentionDays = Number(retentionDays)

    if (!Number.isInteger(parsedRetentionDays) || parsedRetentionDays < 1 || parsedRetentionDays > 3650) {
      toast.error('Indica un número entero entre 1 y 3650 días.')

      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/platform/pending-registrations', {
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: parsedRetentionDays })
      })

      const payload: unknown = await response.json()

      if (!response.ok || typeof payload !== 'object' || payload === null || !('status' in payload)) {
        throw new Error('retention_update_failed')
      }

      if (!isCleanupStatus(payload.status)) {
        throw new Error('status_response_invalid')
      }

      setStatus(payload.status)
      setRetentionDays(String(payload.status.retentionDays))
      toast.success('Retención actualizada correctamente.')
    } catch {
      toast.error('No se pudo guardar la retención. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleCleanup = async () => {
    setCleaning(true)
    setConfirmOpen(false)

    try {
      const response = await fetch('/api/platform/pending-registrations', {
        method: 'POST',
        headers: { Accept: 'application/json' }
      })

      const payload: unknown = await response.json()

      if (
        !response.ok ||
        typeof payload !== 'object' ||
        payload === null ||
        !('result' in payload) ||
        !('status' in payload) ||
        !isCleanupResult(payload.result) ||
        !isCleanupStatus(payload.status)
      ) {
        throw new Error('cleanup_failed')
      }

      setResult(payload.result)
      setStatus(payload.status)
      setRetentionDays(String(payload.status.retentionDays))
      toast.success(`Limpieza completada: ${payload.result.deletedCount} registros eliminados.`)
    } catch {
      toast.error('No se pudo ejecutar la limpieza. Inténtalo de nuevo.')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='space-y-1'>
        <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>{t('roles.scopePlatform')}</p>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('platformAdmin.registrationCleanupTitle')}</h1>
        <p className='text-muted-foreground max-w-3xl text-sm'>
          {t('platformAdmin.registrationCleanupDesc')}
        </p>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertCircleIcon />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            Comprueba tu sesión de Super Admin y vuelve a intentarlo.
            <Button variant='link' className='ml-1 h-auto p-0' onClick={() => void loadStatus()}>
              {t('common.retry') || 'Reintentar'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock3Icon className='text-muted-foreground size-4' />
              Política de retención
            </CardTitle>
            <CardDescription>
              El valor se aplica globalmente y solo puede cambiarlo un Super Admin. El rango permitido es de 1 a 3650 días.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Label htmlFor='pending-registration-retention'>{t('platformAdmin.retentionDays') || 'Conservar durante (días)'}</Label>
            <div className='flex max-w-sm gap-2'>
              <Input
                id='pending-registration-retention'
                type='number'
                min={1}
                max={3650}
                value={retentionDays}
                onChange={event => setRetentionDays(event.target.value)}
                disabled={loading || saving || cleaning}
              />
              <Button onClick={() => void handleSaveRetention()} disabled={loading || saving || cleaning}>
                {saving ? (t('common.saving') || 'Guardando...') : (t('common.save') || 'Guardar')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card size='sm'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <DatabaseZapIcon className='text-muted-foreground size-4' />
              Estado actual
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-baseline justify-between gap-4'>
              <span className='text-muted-foreground text-sm'>{t('nav.pendingRegistrations')}</span>
              <strong>{loading || !status ? '—' : status.pendingCount}</strong>
            </div>
            <div className='flex items-baseline justify-between gap-4'>
              <span className='text-muted-foreground text-sm'>{t('platformAdmin.eligibleRecords') || 'Elegibles'}</span>
              <strong>{loading || !status ? '—' : status.eligibleCount}</strong>
            </div>
            <Separator />
            <div className='space-y-1'>
              <span className='text-muted-foreground text-xs'>{t('mail.oldestFirst')}</span>
              <p className='text-sm'>{loading || !status ? '—' : formatDate(status.oldestCreatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='border-destructive/30'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trash2Icon className='text-destructive size-4' />
            Limpieza manual
          </CardTitle>
          <CardDescription>
            Ejecuta la eliminación de los registros cuya fecha de creación supera la retención configurada. La operación queda registrada en auditoría.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <Alert>
              <AlertTitle>{t('common.completed') || 'Limpieza completada'}</AlertTitle>
              <AlertDescription>
                Se eliminaron {result.deletedCount} registros anteriores a {formatDate(result.cutoffAt)}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className='justify-end border-t'>
          <Button
            variant='destructive'
            onClick={() => setConfirmOpen(true)}
            disabled={loading || !status || status.eligibleCount === 0 || saving || cleaning}
          >
            {cleaning ? 'Limpiando...' : 'Limpiar registros elegibles'}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('common.confirm') || '¿Ejecutar limpieza?'}</DialogTitle>
            <DialogDescription>
              Se eliminarán {status?.eligibleCount ?? 0} intenciones de registro antiguas. Las cuentas de Auth y los usuarios con email confirmado no se modificarán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant='destructive' onClick={() => void handleCleanup()}>
              Confirmar limpieza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RegistrationCleanup
