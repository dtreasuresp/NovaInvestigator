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

export const usePlanCatalog = () => {
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetch('/api/billing/plans', { cache: 'no-store' })
      .then(response => response.json() as Promise<PlansResponse>)
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