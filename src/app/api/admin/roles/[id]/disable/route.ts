import { NextResponse } from 'next/server'

import { disableEnableRequestSchema, idParamSchema } from '@/features/users/schema'
import { disableUnifiedAccessRole } from '@/features/users/service'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const roleId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, disableEnableRequestSchema)

    const role = await disableUnifiedAccessRole(roleId, body)

    return NextResponse.json(role)
  } catch (error) {
    return toErrorResponse(error)
  }
}
