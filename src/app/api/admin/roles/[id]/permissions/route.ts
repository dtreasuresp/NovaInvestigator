import { NextResponse } from 'next/server'

import { replaceUnifiedAccessRolePermissions } from '@/features/users/service'
import { idParamSchema, replaceUnifiedRolePermissionsRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const roleId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, replaceUnifiedRolePermissionsRequestSchema)
    const matrix = await replaceUnifiedAccessRolePermissions(roleId, body)

    return NextResponse.json(matrix)
  } catch (error) {
    return toErrorResponse(error)
  }
}
