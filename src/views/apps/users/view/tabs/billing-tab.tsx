'use client'

// Third-party Imports
import { format } from 'date-fns'
import { CheckIcon, DownloadIcon } from 'lucide-react'

// Type Imports
import type { AppUser } from '@/types/apps/user-types'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { cn } from '@/lib/utils'
import { useBilling } from '@/hooks/use-billing'
import { useCurrency } from '@/hooks/use-currency'

const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  open: 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  pending: 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400',
  void: 'bg-muted text-muted-foreground',
  uncollectible: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-destructive/10 text-destructive',
  draft: 'bg-muted text-muted-foreground'
}

const formatInvoiceStatus = (status: string): string => {
  const map: Record<string, string> = {
    paid: 'Pagada',
    open: 'Abierta',
    pending: 'Pendiente',
    void: 'Anulada',
    uncollectible: 'Incobrable',
    cancelled: 'Cancelada',
    draft: 'Borrador'
  }

  return map[status.toLowerCase()] ?? (status.charAt(0).toUpperCase() + status.slice(1))
}

const getDateProgress = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0

  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  const nowMs = Date.now()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0

  return Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)))
}

export interface BillingTabProps {
  user: AppUser
}

export function BillingTab({ user }: BillingTabProps) {
  const { t } = useI18n()
  const { billing, loading, error, openCustomerPortal } = useBilling()
  const { formatAmountMinor } = useCurrency()
  const billingPlan = billing?.plan
  const invoices = billing?.invoices ?? []

  const daysProgress = getDateProgress(
    billing?.subscription?.currentPeriodStart ??
      billing?.accessGrant?.startsAt ??
      billing?.guestAccess?.startsAt ??
      null,
    billing?.subscription?.currentPeriodEnd ??
      billing?.accessGrant?.expiresAt ??
      billing?.guestAccess?.expiresAt ??
      null
  )

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('platform.entitlementPlan')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {loading ? (
            <div className='bg-muted h-20 animate-pulse rounded' aria-busy='true' />
          ) : error ? (
            <p className='text-destructive text-sm' role='alert'>
              {error}
            </p>
          ) : !billingPlan ? (
            <div className='space-y-3'>
              <p className='text-muted-foreground text-sm'>{t('userSettings.noActivePlanAssigned') || 'Sin plan activo asignado.'}</p>
              <Button variant='outline' size='sm' onClick={() => window.location.assign('/pages/pricing')}>
                {t('pricingPage.ctaViewPlans') || 'Ver planes'}
              </Button>
            </div>
          ) : (
            <>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-lg font-semibold'>{billingPlan.name}</h3>
                    {billingPlan.code === 'team' ? <Badge variant='secondary'>{t('userSettings.popularBadge')}</Badge> : null}
                  </div>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {billing?.subscription?.status ??
                      billing?.accessGrant?.status ??
                      billing?.guestAccess?.mode ??
                      billingPlan.interval}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-semibold'>
                    {formatAmountMinor(billingPlan.amountMinor, billingPlan.currency)}
                    <span className='text-muted-foreground text-sm font-normal'>
                      {billingPlan.interval === 'one_time' ? ' pago único' : `/${billingPlan.interval}`}
                    </span>
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-2'
                    onClick={() =>
                      billing?.subscription ? void openCustomerPortal() : window.location.assign('/pages/billing/upgrade')
                    }
                  >
                    {billing?.subscription ? 'Gestionar facturación' : 'Mejorar Plan'}
                  </Button>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>{t('userSettings.periodProgress') || 'Progreso del período'}</span>
                  <span>{daysProgress}% del ciclo</span>
                </div>
                <Progress value={daysProgress} className='*:data-[slot=progress-track]:h-2' />
                <p className='text-muted-foreground text-xs'>
                {billing?.accessGrant?.expiresAt ?? billing?.guestAccess?.expiresAt
                  ? `El acceso expira el ${new Date(
                      billing.accessGrant?.expiresAt ?? billing.guestAccess?.expiresAt ?? ''
                    ).toLocaleDateString()}`
                  : 'Progreso del ciclo de facturación'}
                </p>
              </div>

              <ul className='grid gap-2 sm:grid-cols-2'>
                {billingPlan.features.map(feature => (
                  <li key={feature} className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <CheckIcon className='text-muted-foreground size-4 shrink-0' />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('userSettings.tabBilling') || 'Detalles de Facturación'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <p className='text-muted-foreground text-sm'>{t('forms.company')}</p>
              <p className='font-medium'>{user.company ?? '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>{t('forms.email')}</p>
              <p className='font-medium'>{user.billingEmail ?? user.email}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>{t('userSettings.taxId') || 'Identificación Fiscal'}</p>
              <p className='font-medium'>{user.taxId ?? '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>{t('forms.country')}</p>
              <p className='font-medium'>{user.country ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4'>
          <CardTitle className='text-base'>{t('userSettings.invoiceHistory') || 'Historial de Facturas'}</CardTitle>
        </CardHeader>
        {invoices.length === 0 ? (
          <CardContent className='py-8'>
            <p className='text-muted-foreground text-sm'>{t('userSettings.noInvoices') || 'No se encontraron facturas.'}</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='text-muted-foreground pl-6'>{t('userSettings.colInvoice') || 'Factura'}</TableHead>
                <TableHead className='text-muted-foreground'>{t('common.status')}</TableHead>
                <TableHead className='text-muted-foreground'>{t('userSettings.colTotal')}</TableHead>
                <TableHead className='text-muted-foreground'>{t('userSettings.colDate') || 'Fecha de Emisión'}</TableHead>
                <TableHead className='text-muted-foreground pr-6 text-right'>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className='pl-6 font-medium'>{invoice.number}</TableCell>
                  <TableCell>
                    <Badge className={cn('rounded-sm font-normal capitalize', INVOICE_STATUS_STYLES[invoice.status])}>
                      {formatInvoiceStatus(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatAmountMinor(invoice.amountMinor, invoice.currency)}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {invoice.issuedAt ? format(new Date(invoice.issuedAt), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className='pr-6 text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Descargar factura ${invoice.number ?? ''}`}
                      disabled={!invoice.hostedInvoiceUrl}
                      onClick={() => invoice.hostedInvoiceUrl && window.open(invoice.hostedInvoiceUrl, '_blank', 'noopener')}
                    >
                      <DownloadIcon className='size-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
