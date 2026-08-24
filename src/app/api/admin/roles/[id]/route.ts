import { NextResponse } from 'next/server'

import { updateUnifiedAccessRole } from '@/features/users/service'
import { idParamSchema, patchUnifiedRoleRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const roleId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, patchUnifiedRoleRequestSchema)
    const matrix = await updateUnifiedAccessRole(roleId, body)

    return NextResponse.json(matrix)
  } catch (error) {
    return toErrorResponse(error)
  }
}
