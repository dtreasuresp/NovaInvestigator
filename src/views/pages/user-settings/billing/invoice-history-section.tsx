'use client'

import { format } from 'date-fns'
import { DownloadIcon } from 'lucide-react'

import type { BillingInvoice } from '@/lib/billing/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrency } from '@/hooks/use-currency'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

interface InvoiceHistorySectionProps {
  invoices: BillingInvoice[]
  loading: boolean
}

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
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function InvoiceHistorySection({ invoices, loading }: InvoiceHistorySectionProps) {
  const { formatAmountMinor } = useCurrency()
  const { t } = useI18n()

  return (
    <div className='mb-10'>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.invoiceHistoryTitle')}</h3>
          <p className='text-muted-foreground text-sm'>
            {t('userSettings.invoiceHistoryDesc')}
          </p>
        </div>
        <div className='space-y-3 lg:col-span-2'>
          <Card className='gap-0 py-0'>
            {loading ? (
              <CardContent className='py-8'>
                <div className='bg-muted h-16 animate-pulse rounded' />
              </CardContent>
            ) : invoices.length === 0 ? (
              <CardContent className='py-8'>
                <p className='text-muted-foreground text-sm'>{t('userSettings.noInvoices')}</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='text-muted-foreground pl-6'>{t('userSettings.colInvoice')}</TableHead>
                    <TableHead className='text-muted-foreground'>{t('roles.colStatus')}</TableHead>
                    <TableHead className='text-muted-foreground'>{t('userSettings.colTotal')}</TableHead>
                    <TableHead className='text-muted-foreground'>{t('userSettings.colTax')}</TableHead>
                    <TableHead className='text-muted-foreground'>{t('userSettings.colIssuedDate')}</TableHead>
                    <TableHead className='text-muted-foreground pr-6 text-right'>{t('users.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className='pl-6 font-medium'>{invoice.number ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-sm font-normal capitalize', INVOICE_STATUS_STYLES[invoice.status])}>
                          {formatInvoiceStatus(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmountMinor(invoice.amountMinor, invoice.currency)}</TableCell>
                      <TableCell>
                        {invoice.taxAmountMinor === null ? '—' : formatAmountMinor(invoice.taxAmountMinor, invoice.currency)}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {invoice.issuedAt ? format(new Date(invoice.issuedAt), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell className='pr-6 text-right'>
                        <Button
                          variant='ghost'
                          size='icon'
                          aria-label={`Open ${invoice.number ?? 'invoice'}`}
                          disabled={!invoice.hostedInvoiceUrl}
                          onClick={() =>
                            invoice.hostedInvoiceUrl && window.open(invoice.hostedInvoiceUrl, '_blank', 'noopener')
                          }
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
      </div>
    </div>
  )
}
