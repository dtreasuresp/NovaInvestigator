import { NextResponse } from 'next/server'

import { getOkrCycleObjective, updateOkrCycleObjective } from '@/features/strategy/service'
import {
  okrCycleObjectiveIdSchema,
  updateOkrCycleObjectiveSchema
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
    const id = parseRouteId(rawId, okrCycleObjectiveIdSchema)
    const cycleObjective = await getOkrCycleObjective(id)

    return NextResponse.json({ ok: true, cycleObjective })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, okrCycleObjectiveIdSchema)
    const body = await readJsonBody(request, updateOkrCycleObjectiveSchema)
    const cycleObjective = await updateOkrCycleObjective(id, body)

    return NextResponse.json({ ok: true, cycleObjective })
  } catch (error) {
    return toErrorResponse(error)
  }
}
