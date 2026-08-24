'use client'

// React Imports
import { useEffect, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Third-party Imports
import { AlertTriangleIcon, Loader2Icon, ShieldAlertIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { useI18n } from '@/hooks/use-i18n'

interface AccountSummary {
  isLastOwner: boolean
  ownedTenantsCount: number
  hasActiveSubscription: boolean
  subscriptionExpiresAt: string | null
  totalMemberships: number
}

const DangerZone = () => {
  const router = useRouter()
  const { t } = useI18n()

  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmedCheck, setConfirmedCheck] = useState(false)

  useEffect(() => {
    let active = true

    fetch('/api/user/account/summary')
      .then(async res => {
        if (!active) return

        if (!res.ok) return

        const data = (await res.json()) as { ok?: boolean; summary?: AccountSummary }

        if (data.summary) {
          setSummary(data.summary)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleDeleteAccount = async () => {
    if (!confirmedCheck) return

    setDeleting(true)

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE'
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { message?: string } }

      if (!response.ok) {
        toast.error(
          payload.error?.message ?? 'No se pudo eliminar la cuenta. Verifica que no seas el propietario único.'
        )

        return
      }

      toast.success('Tu cuenta ha sido eliminada correctamente.')
      router.replace('/pages/auth/login')
      router.refresh()
    } catch {
      toast.error('Error de red al procesar la solicitud de eliminación.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.dangerZoneTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.dangerZoneDesc')}</p>
        </div>
        <div className='flex items-center justify-center p-8 lg:col-span-2'>
          <Loader2Icon className='size-6 animate-spin text-muted-foreground' />
        </div>
      </div>
    )
  }

  const isOwnerBlocked = summary?.isLastOwner ?? false

  return (
    <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
      {/* Vertical Tabs List */}
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{t('userSettings.dangerZoneTitle')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('userSettings.dangerZoneDesc')}
        </p>
      </div>

      {/* Content */}
      <div className='space-y-6 lg:col-span-2'>
        <Card className='border-destructive/30 bg-destructive/5'>
          <CardContent className='pt-6'>
            <div className='flex justify-between gap-4 max-lg:flex-col lg:items-center'>
              <div className='space-y-1'>
                <h3 className='text-sm font-medium text-destructive flex items-center gap-2'>
                  <ShieldAlertIcon className='size-4' />
                  {t('userSettings.deleteAccountBtn')}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {t('userSettings.dangerZoneDesc')}
                </p>
              </div>

              {/* Account Deletion Safeguard Execution */}
              {isOwnerBlocked ? (
                <Alert variant='destructive' className='w-full lg:max-w-md'>
                  <AlertTriangleIcon className='size-4' />
                  <AlertTitle>{t('userSettings.deleteAccountBtn')}</AlertTitle>
                  <AlertDescription className='text-xs'>
                    No puedes eliminar tu cuenta porque eres el propietario activo de un Workspace o Tenant. Debes transferir la propiedad a otro miembro antes de proceder.
                  </AlertDescription>
                </Alert>
              ) : (
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button
                        variant='outline'
                        className='border-destructive! text-destructive! hover:bg-destructive/10! focus-visible:ring-destructive/20 max-lg:w-full'
                      />
                    }
                  >
                    <Trash2Icon />
                    {t('userSettings.deleteAccountBtn')}
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-lg'>
                    <DialogHeader className='space-y-2'>
                      <DialogTitle className='text-destructive flex items-center gap-2'>
                        <AlertTriangleIcon className='size-5' />
                        {t('userSettings.deleteAccountBtn')}
                      </DialogTitle>
                      <DialogDescription className='text-sm'>
                        Estás a punto de desactivar tu cuenta de usuario. Revisa las siguientes advertencias antes de continuar:
                      </DialogDescription>
                    </DialogHeader>

                    {/* Active Subscription Safeguard Warning */}
                    {summary?.hasActiveSubscription ? (
                      <Alert className='border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'>
                        <AlertTriangleIcon className='size-4 text-amber-600' />
                        <AlertTitle>{t('userSettings.activePlan')}</AlertTitle>
                        <AlertDescription className='text-xs'>
                          Tienes una suscripción pagada activa que vence el{' '}
                          <strong>
                            {summary.subscriptionExpiresAt
                              ? new Date(summary.subscriptionExpiresAt).toLocaleDateString()
                              : 'fin del período'}
                          </strong>
                          . Si eliminas tu cuenta ahora, perderás el tiempo de acceso restante de tu plan.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {/* Impact Summary */}
                    <div className='rounded-lg border bg-muted/40 p-4 text-xs space-y-2 text-muted-foreground'>
                      <p className='font-semibold text-foreground'>{t('userSettings.deleteAccountBtn') || 'Impacto de la eliminación'}:</p>
                      <ul className='list-disc pl-4 space-y-1'>
                        <li>{t('userSettings.deleteImpactMemberships', { count: summary?.totalMemberships ?? 0 }) || `Se desactivará tu perfil y acceso a ${summary?.totalMemberships ?? 0} espacio(s) de trabajo.`}</li>
                        <li>{t('userSettings.deleteImpactSession') || 'Se cerrará tu sesión activa de forma inmediata en todos los dispositivos.'}</li>
                        <li>{t('userSettings.deleteImpactData') || 'Tus datos personales y matrices serán desvinculados.'}</li>
                      </ul>
                    </div>

                    {/* Explicit Confirmation Checkbox */}
                    <div className='flex items-start gap-3 pt-2'>
                      <Checkbox
                        id='confirmDeletion'
                        checked={confirmedCheck}
                        onCheckedChange={checked => setConfirmedCheck(!!checked)}
                      />
                      <Label htmlFor='confirmDeletion' className='text-xs font-normal leading-relaxed text-muted-foreground cursor-pointer'>
                        Comprendo que se desactivará el acceso a mis datos e investigaciones de forma permanente.
                      </Label>
                    </div>

                    <div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-4'>
                      <DialogClose render={<Button variant='outline' disabled={deleting} />}>
                        {t('common.cancel')}
                      </DialogClose>
                      <Button
                        variant='destructive'
                        disabled={!confirmedCheck || deleting}
                        onClick={handleDeleteAccount}
                      >
                        {deleting ? t('common.saving') : t('userSettings.deleteAccountBtn')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DangerZone
