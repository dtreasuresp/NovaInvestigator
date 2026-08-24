import { NextResponse } from 'next/server'

import { getCorrelationId, parseQuery, toErrorResponse, withCorrelationId } from '@/features/vid/http'
import { listVidQuerySchema } from '@/features/vid/schema'
import { getPlatformVidRequests } from '@/features/vid/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)

  try {
    const query = parseQuery(request, listVidQuerySchema)
    const result = await getPlatformVidRequests(query)

    return withCorrelationId(
      NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } }),
      correlationId
    )
  } catch (error) {
    return toErrorResponse(error, correlationId)
  }
}
