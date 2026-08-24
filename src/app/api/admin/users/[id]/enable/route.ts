// POST /api/admin/users/:id/enable — reactivate a suspended member,
// optimistic-locked on `updatedAt` (users.disable — enabling/disabling is a
// single capability per src/features/access/capabilityManifest.ts).
import { NextResponse } from 'next/server'

import { enableTenantMember } from '@/features/users/service'
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
    const member = await enableTenantMember(membershipId, body)

    return NextResponse.json(member)
  } catch (error) {
    return toErrorResponse(error)
  }
}
