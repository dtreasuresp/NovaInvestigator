import { NextResponse } from 'next/server'
import * as z from 'zod'

import { updateAdminPlan } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'

export const runtime = 'nodejs'

const entitlementSchema = z.object({
  entitlementKey: z.string().min(1),
  limitValue: z.number().nullable(),
  isEnabled: z.boolean()
})

const updatePlanSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().optional().nullable(),
  providerProductId: z.string().optional().nullable(),
  providerPriceId: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  interval: z.enum(['free', 'one_time', 'month', 'year']).optional(),
  durationSeconds: z.number().int().positive().nullable().optional(),
  amountMinor: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  contactSales: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  entitlements: z.array(entitlementSchema).optional()
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJsonBody(request, updatePlanSchema)
    const plan = await updateAdminPlan(id, body)

    return NextResponse.json({ plan }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
