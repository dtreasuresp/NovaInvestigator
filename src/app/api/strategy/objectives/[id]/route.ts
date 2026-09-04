import { NextResponse } from 'next/server'

import {
  getStrategicObjective,
  updateStrategicObjective
} from '@/features/strategy/service'
import {
  strategicObjectiveIdSchema,
  updateStrategicObjectiveSchema
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
    const id = parseRouteId(rawId, strategicObjectiveIdSchema)
    const objective = await getStrategicObjective(id)

    return NextResponse.json({ ok: true, objective })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, strategicObjectiveIdSchema)
    const body = await readJsonBody(request, updateStrategicObjectiveSchema)
    const objective = await updateStrategicObjective(id, body)

    return NextResponse.json({ ok: true, objective })
  } catch (error) {
    return toErrorResponse(error)
  }
}
