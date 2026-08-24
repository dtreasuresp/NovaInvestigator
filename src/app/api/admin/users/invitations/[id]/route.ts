import { NextResponse } from 'next/server'

import {
  getTenantInvitation,
  revokeTenantInvitation,
  updateTenantInvitation
} from '@/features/users/service'
import { idParamSchema, invitationMutationRequestSchema, patchInvitationRequestSchema } from '@/features/users/schema'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/features/users/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const invitationId = parseRouteId(id, idParamSchema)
    const invitation = await getTenantInvitation(invitationId)

    return NextResponse.json(invitation)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const invitationId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, patchInvitationRequestSchema)
    const invitation = await updateTenantInvitation(invitationId, body)

    return NextResponse.json(invitation)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const invitationId = parseRouteId(id, idParamSchema)
    const body = await readJsonBody(request, invitationMutationRequestSchema)

    await revokeTenantInvitation(invitationId, body)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
