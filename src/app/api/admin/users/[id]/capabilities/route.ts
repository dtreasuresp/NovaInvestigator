// GET   /api/admin/users/:id/capabilities — effective capabilities for a
//        member, with role/allow-override/deny-override provenance (access.read)
// PATCH /api/admin/users/:id/capabilities — create/update/clear per-member
//        capability overrides, audited (access.manage)
import { NextResponse } from 'next/server'

import { getTenantMemberCapabilities, patchTenantMemberCapabilities } from '@/features/users/service'
import { idParamSchema, patchCapabilitiesRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const membershipId = parseRouteId(id, idParamSchema)
    const detail = await getTenantMemberCapabilities(membershipId)

    return NextResponse.json(detail)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const membershipId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, patchCapabilitiesRequestSchema)
    const detail = await patchTenantMemberCapabilities(membershipId, body)

    return NextResponse.json(detail)
  } catch (error) {
    return toErrorResponse(error)
  }
}
