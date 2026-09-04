import { NextResponse } from 'next/server'

import {
  createOkrCycleObjective,
  listOkrCycleObjectives
} from '@/features/strategy/service'
import {
  createOkrCycleObjectiveSchema,
  okrCycleObjectiveFilterSchema
} from '@/features/strategy/schema'
import {
  parseQuery,
  readJsonBody,
  toErrorResponse
} from '@/features/strategy/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const filters = parseQuery(request, okrCycleObjectiveFilterSchema)
    const cycleObjectives = await listOkrCycleObjectives(filters)

    return NextResponse.json({ ok: true, cycleObjectives })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, createOkrCycleObjectiveSchema)
    const cycleObjective = await createOkrCycleObjective(body)

    return NextResponse.json({ ok: true, cycleObjective }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
