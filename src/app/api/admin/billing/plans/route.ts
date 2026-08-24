import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createAdminPlan, listAdminPlans } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'

export const runtime = 'nodejs'

const entitlementSchema = z.object({
  entitlementKey: z.string().min(1),
  limitValue: z.number().nullable(),
  isEnabled: z.boolean()
})

const createPlanSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().optional().nullable(),
  providerProductId: z.string().optional().nullable(),
  providerPriceId: z.string().optional().nullable(),
  currency: z.string().length(3),
  interval: z.enum(['free', 'one_time', 'month', 'year']),
  durationSeconds: z.number().int().positive().nullable().optional(),
  amountMinor: z.number().int().min(0),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  contactSales: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  entitlements: z.array(entitlementSchema).optional()
})

export async function GET() {
  try {
    const plans = await listAdminPlans()

    return NextResponse.json({ plans }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, createPlanSchema)
    const plan = await createAdminPlan(body)

    return NextResponse.json({ plan }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
