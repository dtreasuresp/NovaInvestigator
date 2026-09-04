'use client'

// React Imports
import { useEffect, useState } from 'react'

// Type Imports
import type { BillingPlan } from '@/lib/billing/types'

// Util Imports
import { pickCheapestPlanForModule } from '@/lib/billing/plan-catalog'

type PlansResponse = {
  plans?: BillingPlan[]
  error?: { messageKey?: string }
}

let inFlightPlansPromise: Promise<PlansResponse> | null = null
let cachedPlansResponse: { data: PlansResponse; timestamp: number } | null = null
const PLANS_CACHE_TTL_MS = 60000

export async function fetchPlansShared(): Promise<PlansResponse> {
  const now = Date.now()

  if (cachedPlansResponse && now - cachedPlansResponse.timestamp < PLANS_CACHE_TTL_MS) {
    return cachedPlansResponse.data
  }

  if (inFlightPlansPromise) {
    return inFlightPlansPromise
  }

  inFlightPlansPromise = (async () => {
    try {
      const response = await fetch('/api/billing/plans', { cache: 'no-store' })
      const payload = (await response.json()) as PlansResponse

      if (response.ok && payload.plans) {
        cachedPlansResponse = { data: payload, timestamp: Date.now() }
      }

      return payload
    } finally {
      inFlightPlansPromise = null
    }
  })()

  return inFlightPlansPromise
}

export const usePlanCatalog = () => {
  const [plans, setPlans] = useState<BillingPlan[] | null>(cachedPlansResponse?.data.plans ?? null)
  const [loading, setLoading] = useState(!cachedPlansResponse)

  useEffect(() => {
    let mounted = true

    fetchPlansShared()
      .then(payload => {
        if (mounted) {
          setPlans(payload.plans ?? null)
        }
      })
      .catch(() => {
        if (mounted) {
          setPlans(null)
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
  }, [])

  const planForModule = (moduleKey: string | undefined): BillingPlan | null =>
    moduleKey && plans ? pickCheapestPlanForModule(plans, moduleKey) : null

  return { plans, loading, planForModule }
}