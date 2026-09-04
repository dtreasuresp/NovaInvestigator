import { NextResponse } from 'next/server'

import {
  createOkrCycle,
  listOkrCycles
} from '@/features/strategy/service'
import {
  createOkrCycleSchema,
  okrCycleFilterSchema
} from '@/features/strategy/schema'
import {
  parseQuery,
  readJsonBody,
  toErrorResponse
} from '@/features/strategy/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const filters = parseQuery(request, okrCycleFilterSchema)
    const cycles = await listOkrCycles(filters)

    return NextResponse.json({ ok: true, cycles })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, createOkrCycleSchema)
    const cycle = await createOkrCycle(body)

    return NextResponse.json({ ok: true, cycle }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
