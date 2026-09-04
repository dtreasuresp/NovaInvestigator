import { NextResponse } from 'next/server'

import {
  getOkrCycle,
  updateOkrCycle
} from '@/features/strategy/service'
import {
  okrCycleIdSchema,
  updateOkrCycleSchema
} from '@/features/strategy/schema'
import {
  parseRouteId,
  readJsonBody,
  toErrorResponse
} from '@/features/strategy/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, okrCycleIdSchema)
    const cycle = await getOkrCycle(id)

    return NextResponse.json({ ok: true, cycle })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, okrCycleIdSchema)
    const body = await readJsonBody(request, updateOkrCycleSchema)
    const cycle = await updateOkrCycle(id, body)

    return NextResponse.json({ ok: true, cycle })
  } catch (error) {
    return toErrorResponse(error)
  }
}
