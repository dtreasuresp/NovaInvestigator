import { NextResponse } from 'next/server'

import {
  createStrategicObjective,
  listStrategicObjectives
} from '@/features/strategy/service'
import {
  createStrategicObjectiveSchema,
  strategicObjectiveFilterSchema
} from '@/features/strategy/schema'
import {
  parseQuery,
  readJsonBody,
  toErrorResponse
} from '@/features/strategy/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const filters = parseQuery(request, strategicObjectiveFilterSchema)
    const objectives = await listStrategicObjectives(filters)

    return NextResponse.json({ ok: true, objectives })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, createStrategicObjectiveSchema)
    const objective = await createStrategicObjective(body)

    return NextResponse.json({ ok: true, objective }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
