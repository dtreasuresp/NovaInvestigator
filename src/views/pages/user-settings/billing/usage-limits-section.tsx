'use client'

import type { BillingSummary } from '@/lib/billing/types'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/hooks/use-i18n'

interface UsageLimitsSectionProps {
  billing: BillingSummary | null
  loading: boolean
}

export function UsageLimitsSection({ billing, loading }: UsageLimitsSectionProps) {
  const { t } = useI18n()
  const limits = billing?.plan?.limits ?? {}

  const maxInvestigations = limits['investigations.max_active'] ?? null
  const maxMembers = limits['users.max_members'] ?? null
  const maxPdfMonthly = limits['investigations.export_pdf_monthly'] ?? null

  const getPercent = (value: number, max: number | null) => {
    if (!max || max <= 0) return 0

    return Math.min(100, Math.round((value / max) * 100))
  }

  const isMembersExceeded = maxMembers !== null && maxMembers < 2

  return (
    <div className='mb-10'>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.usageLimitsTitle')}</h3>
          <p className='text-muted-foreground text-sm'>
            {t('userSettings.usageLimitsDesc') || 'Límites de recursos y cuotas mensuales configurados para el plan activo de tu organización.'}
          </p>
        </div>
        <div className='space-y-3 lg:col-span-2'>
          <Card>
            <CardContent className='pt-6'>
              {loading ? (
                <div className='bg-muted h-48 animate-pulse rounded' />
              ) : (
                <div className='divide-y divide-border/60'>
                  {/* Item 1: Active Investigations */}
                  <div className='space-y-2.5 pb-6 first:pt-0'>
                    <div className='text-sm font-medium text-foreground'>{t('userSettings.activeInvestigations')}</div>
                    <Progress
                      value={getPercent(1, maxInvestigations)}
                      className='*:data-[slot=progress-track]:h-2'
                    />
                    <div className='flex items-center justify-between text-xs text-muted-foreground'>
                      <span>{t('userSettings.investigationsInUse', { count: 1 }) || '1 investigación en uso'}</span>
                      <span>
                        {maxInvestigations !== null
                          ? `${maxInvestigations} ${maxInvestigations === 1 ? 'investigación incluida' : 'investigaciones incluidas'}`
                          : 'Ilimitadas'}
                      </span>
                    </div>
                  </div>

                  {/* Item 2: Organization Members */}
                  <div className='space-y-2.5 py-6'>
                    <div className='text-sm font-medium text-foreground'>{t('userSettings.orgMembers')}</div>
                    <Progress
                      value={getPercent(2, maxMembers)}
                      className={`*:data-[slot=progress-track]:h-2 ${
                        isMembersExceeded ? '*:data-[slot=progress-indicator]:bg-destructive' : ''
                      }`}
                    />
                    <div className='flex items-center justify-between text-xs text-muted-foreground'>
                      <span className={isMembersExceeded ? 'text-destructive font-medium' : ''}>
                        {t('userSettings.membersAssigned', { count: 2 }) || '2 miembros asignados'}
                      </span>
                      <span className={isMembersExceeded ? 'text-destructive font-medium' : ''}>
                        {maxMembers !== null
                          ? `${maxMembers} ${maxMembers === 1 ? 'plaza incluida' : 'plazas incluidas'}`
                          : 'Plazas ilimitadas'}
                      </span>
                    </div>
                    {isMembersExceeded ? (
                      <p className='text-xs text-destructive font-medium'>
                        ⚠️ Límite del plan excedido (2 miembros asignados para 1 plaza permitida). Actualiza el plan para restablecer la conformidad.
                      </p>
                    ) : null}
                  </div>

                  {/* Item 3: PDF Exports (Monthly) */}
                  <div className='space-y-2.5 py-6'>
                    <div className='text-sm font-medium text-foreground'>{t('userSettings.pdfExportsMonthly')}</div>
                    <Progress
                      value={getPercent(0, maxPdfMonthly)}
                      className='*:data-[slot=progress-track]:h-2'
                    />
                    <div className='flex items-center justify-between text-xs text-muted-foreground'>
                      <span>{t('userSettings.exportsInUse', { count: 0 }) || '0 exportaciones utilizadas'}</span>
                      <span>
                        {maxPdfMonthly !== null
                          ? `${maxPdfMonthly} exportaciones/mes incluidas`
                          : 'Exportaciones ilimitadas'}
                      </span>
                    </div>
                  </div>

                  {/* Item 4: Workspace Storage */}
                  <div className='space-y-2.5 pt-6 last:pb-0'>
                    <div className='text-sm font-medium text-foreground'>{t('userSettings.workspaceStorage')}</div>
                    <Progress
                      value={5}
                      className='*:data-[slot=progress-track]:h-2'
                    />
                    <div className='flex items-center justify-between text-xs text-muted-foreground'>
                      <span>{t('userSettings.storageInUse', { size: '5.0 MiB' }) || '5.0 MiB en uso'}</span>
                      <span>{t('userSettings.storageIncluded', { size: '100 MiB' }) || '100 MiB incluidos'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
