// Repository para `investigation_ai_reports` — última versión del dictamen IA
// Tenant-scoped, columnas explícitas, upsert por investigation_id.
import type { InvestigationAiReportRow, InvestigationsSupabaseClient } from './db-types'
import { InvestigationError } from './errors'
import { logger } from '@/lib/logger'

const AI_REPORT_COLUMNS =
  'investigation_id, tenant_id, report_text, locale, format, model, generated_at, generated_by, created_at, updated_at' as const

export async function getInvestigationAiReport(
  client: InvestigationsSupabaseClient,
  tenantId: string,
  investigationId: string
): Promise<InvestigationAiReportRow | null> {
  const { data, error } = await client
    .from('investigation_ai_reports')
    .select(AI_REPORT_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('investigation_id', investigationId)
    .maybeSingle()

  if (error) {
    logger.warn('No se pudo leer el dictamen IA cacheado', {
      action: 'investigations.ai_report.get',
      details: { tenantId, investigationId, errorMessage: error.message }
    })
    throw InvestigationError.internal('No se pudo leer el dictamen con IA.')
  }

  return (data as InvestigationAiReportRow | null) ?? null
}

export interface UpsertAiReportInput {
  tenantId: string
  investigationId: string
  reportText: string
  locale: string
  format: string
  model?: string | null
  generatedBy: string | null
}

export async function upsertInvestigationAiReport(
  client: InvestigationsSupabaseClient,
  input: UpsertAiReportInput
): Promise<InvestigationAiReportRow> {
  const { data, error } = await client
    .from('investigation_ai_reports')
    .upsert(
      {
        investigation_id: input.investigationId,
        tenant_id: input.tenantId,
        report_text: input.reportText,
        locale: input.locale,
        format: input.format,
        model: input.model ?? null,
        generated_by: input.generatedBy
      },
      { onConflict: 'investigation_id' }
    )
    .select(AI_REPORT_COLUMNS)
    .single()

  if (error || !data) {
    logger.error('No se pudo guardar el dictamen IA', {
      action: 'investigations.ai_report.upsert',
      details: { tenantId: input.tenantId, investigationId: input.investigationId, errorMessage: error?.message }
    })
    throw InvestigationError.internal('No se pudo guardar el dictamen con IA.')
  }

  return data as InvestigationAiReportRow
}
