import { NextResponse } from 'next/server'

import { getCorrelationId, parseRouteId, readJsonBody, toErrorResponse, withCorrelationId } from '@/features/vid/http'
import { vidRequestIdSchema, vidReviewRequestSchema } from '@/features/vid/schema'
import { reviewPlatformVidRequest } from '@/features/vid/service'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const correlationId = getCorrelationId(request)

  try {
    const { id } = await params
    const requestId = parseRouteId(id, vidRequestIdSchema)
    const body = await readJsonBody(request, vidReviewRequestSchema)
    const item = await reviewPlatformVidRequest({ ...body, requestId, correlationId })

    return withCorrelationId(NextResponse.json({ item }), correlationId)
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
