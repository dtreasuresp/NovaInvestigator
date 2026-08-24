import { NextResponse } from 'next/server'

import { listAdminTrialPolicyEntitlements, updateAdminTrialPolicyEntitlement } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { adminTrialPolicyEntitlementSchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const entitlements = await listAdminTrialPolicyEntitlements()

    return NextResponse.json({ entitlements }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonBody(request, adminTrialPolicyEntitlementSchema)
    const entitlement = await updateAdminTrialPolicyEntitlement(body)

    return NextResponse.json({ entitlement }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
