// GET   /api/admin/users/:id — member detail (users.read)
// PATCH /api/admin/users/:id — role update, optimistic-locked on `updatedAt` (users.update)
import { NextResponse } from 'next/server'

import { getTenantMember, updateTenantMemberRole } from '@/features/users/service'
import { idParamSchema, patchUserRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const membershipId = parseRouteId(id, idParamSchema)
    const member = await getTenantMember(membershipId)

    return NextResponse.json(member)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const membershipId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, patchUserRequestSchema)
    const member = await updateTenantMemberRole(membershipId, body)

    return NextResponse.json(member)
  } catch (error) {
    return toErrorResponse(error)
  }
}
