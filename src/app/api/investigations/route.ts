// GET  /api/investigations       — paginated metadata for the current tenant
// POST /api/investigations       — create an investigation for a registered user
import { NextResponse } from 'next/server'

import { createInvestigationRequestSchema, listInvestigationsQuerySchema } from '@/lib/investigations/schema'
import { createInvestigation, listInvestigations } from '@/lib/investigations/service'
import { parseQuery, readJsonBody, toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const query = parseQuery(request, listInvestigationsQuerySchema)
    const result = await listInvestigations(query)

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await readJsonBody(request, createInvestigationRequestSchema)
    const record = await createInvestigation(input)

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
