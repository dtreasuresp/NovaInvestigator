'use client'

import { Separator } from '@/components/ui/separator'
import { useBilling } from '@/hooks/use-billing'
import { CurrentPlanSection } from './current-plan-section'
import { UsageLimitsSection } from './usage-limits-section'
import { PurchaseDelegationSection } from './purchase-delegation-section'
import { InvoiceHistorySection } from './invoice-history-section'

export default function UserBillingSettings() {
  const { billing, loading, error, openCustomerPortal } = useBilling()

  return (
    <section className='py-3'>
      <CurrentPlanSection
        billing={billing}
        loading={loading}
        error={error}
        onOpenPortal={openCustomerPortal}
      />
      <Separator className='my-10' />
      <UsageLimitsSection billing={billing} loading={loading} />
      <Separator className='my-10' />
      <PurchaseDelegationSection loading={loading} />
      <Separator className='my-10' />
      <InvoiceHistorySection invoices={billing?.invoices ?? []} loading={loading} />
    </section>
  )
}
