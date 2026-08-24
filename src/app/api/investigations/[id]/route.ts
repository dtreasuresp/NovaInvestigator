// GET   /api/investigations/:id — returns the authorized full state
// PATCH /api/investigations/:id — requires `version`; 409 on optimistic conflict
import { NextResponse } from 'next/server'

import { idParamSchema, patchInvestigationRequestSchema } from '@/lib/investigations/schema'
import { getInvestigation, patchInvestigation } from '@/lib/investigations/service'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, idParamSchema)
    const url = new URL(request.url)
    const touch = url.searchParams.get('touch') === 'true'
    const record = await getInvestigation(id, { touch })

    return NextResponse.json(record)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, idParamSchema)
    const input = await readJsonBody(request, patchInvestigationRequestSchema)
    const record = await patchInvestigation(id, input)

    return NextResponse.json(record)
  } catch (error) {
    return toErrorResponse(error)
  }
}
