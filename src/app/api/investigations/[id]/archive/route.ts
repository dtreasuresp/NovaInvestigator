// POST /api/investigations/:id/archive — archives an investigation; requires `version`.
import { NextResponse } from 'next/server'

import { idParamSchema, versionOnlyRequestSchema } from '@/lib/investigations/schema'
import { archiveInvestigation } from '@/lib/investigations/service'
import { parseRouteId, readJsonBody, toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, idParamSchema)
    const input = await readJsonBody(request, versionOnlyRequestSchema)
    const record = await archiveInvestigation(id, input)

    return NextResponse.json(record)
  } catch (error) {
    return toErrorResponse(error)
  }
}
