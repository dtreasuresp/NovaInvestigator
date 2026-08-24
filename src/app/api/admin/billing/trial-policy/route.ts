import { NextResponse } from 'next/server'

import { getAdminTrialPolicy, updateAdminTrialPolicy } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { adminTrialPolicyUpdateSchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const policy = await getAdminTrialPolicy()

    return NextResponse.json({ policy }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJsonBody(request, adminTrialPolicyUpdateSchema)
    const policy = await updateAdminTrialPolicy(body)

    return NextResponse.json({ policy }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
