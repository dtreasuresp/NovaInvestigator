// POST /api/investigations/:id/export — prepares a PDF export request
// (plan section 14.2). All access control (session, membership, commercial
// access, capability `investigations.export`, PDF entitlement by modality,
// rate limit, and titularidad) lives in the service layer
// (`prepareInvestigationExport`); this handler only parses the route id,
// delegates, and maps errors — it never touches the repository/access
// internals directly.
//
// This endpoint NEVER generates the PDF itself: it returns a prepared DTO
// with a `generationUrl` pointing to the single renderer at
// `/api/generar-pdf`, which is the only place that consumes the monthly
// entitlement and performs the rendering.
import { NextResponse } from 'next/server'

import { idParamSchema } from '@/lib/investigations/schema'
import { prepareInvestigationExport } from '@/lib/investigations/service'
import { parseRouteId, toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = parseRouteId(rawId, idParamSchema)
    const prepared = await prepareInvestigationExport(id)

    return NextResponse.json({ export: prepared })
  } catch (error) {
    return toErrorResponse(error)
  }
}
