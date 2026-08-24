// POST /api/admin/users/:id/disable — suspend a member, optimistic-locked on
// `updatedAt` (users.disable). Refuses to suspend the last active owner.
import { NextResponse } from 'next/server'

import { disableTenantMember } from '@/features/users/service'
import { idParamSchema, disableEnableRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const membershipId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, disableEnableRequestSchema)
    const member = await disableTenantMember(membershipId, body)

    return NextResponse.json(member)
  } catch (error) {
    return toErrorResponse(error)
  }
}
