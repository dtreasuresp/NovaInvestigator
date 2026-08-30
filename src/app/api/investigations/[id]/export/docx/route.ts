import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import { buildUnifiedReportData } from '@/lib/export/report-model'
import { renderDocxReport } from '@/lib/export/docx-renderer'
import { listProjectsByTenant, type ProjectWithStats } from '@/features/projects/repository'
import {
  requireInvestigationsPrincipal,
  assertInvestigationsCommercialAccess,
  assertInvestigationsCapability
} from '@/lib/investigations/access'
import { INVESTIGATIONS_CAPABILITIES } from '@/lib/investigations/capabilities'
import { InvestigationError } from '@/lib/investigations/errors'
import { toErrorResponse } from '@/lib/investigations/http'
import { logger } from '@/lib/logger'
import type { InvestigationState } from '@/types/apps/investigator-types'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const tenantId = principal.tenantId

    await assertInvestigationsCommercialAccess(principal)
    await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.export)

    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { asInvestigationsClient } = await import('@/lib/investigations/db-types')
    const investigationsClient = asInvestigationsClient(supabase)
    const investigation = await getInvestigationById(investigationsClient, tenantId, id)

    if (!investigation) {
      throw InvestigationError.notFound()
    }

    const { searchParams } = new URL(request.url)
    const reportType = (searchParams.get('type') || 'full') as 'summary' | 'full'

    // Atomic usage consumption RPC
    const { data: usageRes, error: usageErr } = await supabase.rpc(
      'consume_billing_entitlement_usage',
      {
        p_tenant_id: tenantId,
        p_entitlement_key: 'investigations.export_docx_monthly'
      }
    )

    if (!usageErr && usageRes && usageRes.length > 0 && !usageRes[0].allowed) {
      const row = usageRes[0] as { limit_value?: number; current_usage?: number }
      throw InvestigationError.entitlementLimitExceeded(
        'investigations.export_docx_monthly',
        row.limit_value ?? 0,
        row.current_usage ?? 0
      )
    }

    const state = investigation.state as unknown as InvestigationState
    const analysis = calculateAnalysis(state)

    // Load projects if full report
    let projects: ProjectWithStats[] = []
    if (reportType === 'full') {
      projects = await listProjectsByTenant(tenantId, { investigationId: id })
    }

    const reportData = buildUnifiedReportData(
      state,
      analysis,
      reportType,
      projects as unknown as Parameters<typeof buildUnifiedReportData>[3]
    )

    const buffer = await renderDocxReport(reportData)
    const filename = `informe-estrategico-${investigation.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || id}.docx`

    const responseBody = new Uint8Array(buffer.byteLength)
    responseBody.set(buffer)

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    if (InvestigationError.isInvestigationError(error)) {
      return toErrorResponse(error)
    }

    logger.error('Error generando documento DOCX', {
      action: 'api.export_docx',
      details: { errorType: error instanceof Error ? error.name : typeof error }
    })

    return toErrorResponse(InvestigationError.internal())
  }
}
