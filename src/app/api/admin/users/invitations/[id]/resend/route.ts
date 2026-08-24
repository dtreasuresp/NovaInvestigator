import { NextResponse } from 'next/server'

import { resendTenantInvitation } from '@/features/users/service'
import { idParamSchema, invitationMutationRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const invitationId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, invitationMutationRequestSchema)
    const invitation = await resendTenantInvitation(invitationId, body)

    return NextResponse.json(invitation)
  } catch (error) {
    return toErrorResponse(error)
  }
}
