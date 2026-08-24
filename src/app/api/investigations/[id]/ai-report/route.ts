import { NextResponse } from 'next/server'

import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationAiReport } from '@/lib/investigations/ai-reports'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })
    }

    const row = await getInvestigationAiReport(principal.client, principal.tenantId, id)

    if (!row) {
      return NextResponse.json({ report: null }, { status: 200 })
    }

    return NextResponse.json(
      {
        report: {
          investigationId: row.investigation_id,
          reportText: row.report_text,
          locale: row.locale,
          format: row.format,
          model: row.model,
          generatedAt: row.generated_at,
          generatedBy: row.generated_by
        }
      },
      { status: 200 }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
