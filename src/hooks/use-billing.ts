'use client'

import { useCallback, useEffect, useState } from 'react'

import type { BillingSummary } from '@/lib/billing/types'

type BillingResponse = Partial<BillingSummary> & {
  billing?: BillingSummary
  error?: { code?: string; messageKey?: string }
}

const isBillingSummary = (value: BillingResponse): value is BillingSummary =>
  typeof value.accessMode === 'string' &&
  typeof value.accountStatus === 'string' &&
  typeof value.commercialAccess === 'object' &&
  value.commercialAccess !== null &&
  typeof value.commercialAccess.status === 'string' &&
  Array.isArray(value.invoices)

export const useBilling = () => {
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const response = await fetch('/api/billing/me', { cache: 'no-store' })
      const payload = (await response.json()) as BillingResponse

      if (!response.ok) {
        setError(payload.error?.messageKey ?? 'billing.summaryUnavailable')
        setErrorCode(payload.error?.code ?? null)

        return
      }

      const nextBilling = payload.billing ?? (isBillingSummary(payload) ? payload : null)

      if (!nextBilling) {
        setError('billing.summaryUnavailable')
        setErrorCode(null)
        setBilling(null)

        return
      }

      setBilling(nextBilling)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'billing.summaryUnavailable')
      setErrorCode(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await refresh()
    }

    void load()
  }, [refresh])

  const openCustomerPortal = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const payload = (await response.json()) as { portalUrl?: string; error?: { messageKey?: string } }

      if (!response.ok || !payload.portalUrl) {
        throw new Error(payload.error?.messageKey ?? 'billing.portalUnavailable')
      }

      window.location.assign(payload.portalUrl)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'billing.portalUnavailable')
    }
  }, [])

  return { billing, loading, error, errorCode, refresh, openCustomerPortal }
}
