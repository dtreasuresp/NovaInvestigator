import { NextResponse } from 'next/server'

import { getCorrelationId, readJsonBody, toErrorResponse, withCorrelationId } from '@/features/vid/http'
import { submitVidRequestSchema } from '@/features/vid/schema'
import { getCurrentVidState, submitCurrentUserVid } from '@/features/vid/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const state = await getCurrentVidState()

    return withCorrelationId(
      NextResponse.json({ state }, { headers: { 'Cache-Control': 'private, no-store' } }),
      correlationId
    )
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const body = await readJsonBody(request, submitVidRequestSchema)
    const state = await submitCurrentUserVid({ ...body, correlationId })

    return withCorrelationId(NextResponse.json({ state }, { status: 201 }), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
