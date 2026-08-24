'use client'

import { format } from 'date-fns'

import type { BillingSummary } from '@/lib/billing/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCurrency } from '@/hooks/use-currency'
import { useI18n } from '@/hooks/use-i18n'

interface CurrentPlanSectionProps {
  billing: BillingSummary | null
  loading: boolean
  error: string | null
  onOpenPortal: () => Promise<void>
}

const getDateProgress = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0

  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  const nowMs = Date.now()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0

  return Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)))
}

export function CurrentPlanSection({ billing, loading, error, onOpenPortal }: CurrentPlanSectionProps) {
  const { formatAmountMinor } = useCurrency()
  const { t } = useI18n()
  const plan = billing?.plan

  const daysProgress = getDateProgress(
    billing?.subscription?.currentPeriodStart ?? billing?.accessGrant?.startsAt ?? null,
    billing?.subscription?.currentPeriodEnd ?? billing?.accessGrant?.expiresAt ?? null
  )

  return (
    <div className='mb-10'>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('billing.currentPlan')}</h3>
          <p className='text-muted-foreground text-sm'>
            Your active subscription plan, period status, and commercial terms for the organization.
          </p>
        </div>
        <div className='space-y-3 lg:col-span-2'>
          <Card>
            <CardContent className='space-y-6 pt-6'>
              {loading ? (
                <div className='bg-muted h-24 animate-pulse rounded' />
              ) : error ? (
                <p className='text-destructive text-sm'>{error}</p>
              ) : !plan ? (
                <div className='space-y-3'>
                  <p className='text-muted-foreground text-sm'>{t('userSettings.noActivePlanAssigned')}</p>
                  <Button variant='outline' size='sm' onClick={() => window.location.assign('/pages/billing/upgrade')}>
                    {t('billing.viewPlans')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h4 className='text-lg font-semibold'>{plan.name}</h4>
                        {plan.code === 'team' ? <Badge variant='secondary'>{t('userSettings.popularBadge')}</Badge> : null}
                      </div>
                      <p className='text-muted-foreground mt-1 text-sm capitalize'>
                        {billing?.subscription?.status ?? billing?.accessGrant?.status ?? plan.interval}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-semibold'>
                        {formatAmountMinor(plan.amountMinor, plan.currency)}
                        <span className='text-muted-foreground text-sm font-normal'>
                          {plan.interval === 'one_time' ? ' one-time' : `/${plan.interval}`}
                        </span>
                      </p>
                      <div className='mt-2 flex items-center justify-end gap-2'>
                        <Button
                          variant='default'
                          size='sm'
                          onClick={() => window.location.assign('/pages/billing/upgrade')}
                        >
                          {t('billing.upgradePlan')}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            billing?.subscription ? void onOpenPortal() : window.location.assign('/pages/billing/upgrade')
                          }
                        >
                          {billing?.subscription ? t('billing.manageBilling') : t('billing.viewPlans')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground'>{t('userSettings.periodProgress')}</span>
                      <span className='font-medium'>{daysProgress}%</span>
                    </div>
                    <Progress value={daysProgress} className='*:data-[slot=progress-track]:h-2' />
                    <p className='text-muted-foreground text-xs'>
                      {billing?.subscription?.currentPeriodEnd
                        ? `Period renews ${format(new Date(billing.subscription.currentPeriodEnd), 'MMM dd, yyyy')}`
                        : billing?.accessGrant?.expiresAt
                          ? `Access expires ${format(new Date(billing.accessGrant.expiresAt), 'MMM dd, yyyy')}`
                          : 'Billing period active'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
