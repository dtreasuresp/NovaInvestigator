import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import { auditInvestigationConsistency } from '../../evidence-engine'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getInvestigationDetailsSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a consultar.')
})

export type GetInvestigationDetailsInput = z.infer<typeof getInvestigationDetailsSchema>

export async function executeGetInvestigationDetails(
  args: GetInvestigationDetailsInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()

    if (!id) {
      return { toolName: 'get_investigation_details', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'get_investigation_details',
        success: false,
        error: 'La investigación no existe o no tienes permisos de acceso para consultarla (ReBAC).'
      }
    }

    const state = row.state as unknown as InvestigationState
    let analysisSummary: unknown = null
    let auditReport: unknown = null
    const meta = state?.metadata || {}

    if (state && Array.isArray(state.internal) && Array.isArray(state.external)) {
      const calculated = calculateAnalysis(state)
      const audit = auditInvestigationConsistency(state)

      auditReport = {
        hasCriticalContradictions: audit.hasCriticalContradictions,
        findingsCount: audit.findings.length,
        findings: audit.findings,
        suspiciousZeroCrossings: audit.suspiciousDafoCrossings
      }

      analysisSummary = {
        efiIndex: calculated.efi.total,
        efeIndex: calculated.efe.total,
        dominantQuadrant: calculated.relations.dominant,
        totalInternalFactors: state.internal.length,
        totalExternalFactors: state.external.length,
        totalStrategies: (state.strategies || []).length,
        totalCameActions: (calculated.came?.actions || []).length,
        selectedStrategy: state.strategies?.find(s => s.id === state.selectedStrategyId)?.name || null,
        internalFactors: state.internal.map(f => ({
          id: f.id,
          name: f.name,
          weight: f.weight,
          rating: f.rating,
          type: f.type,
          evidence: f.evidence || null
        })),
        externalFactors: state.external.map(f => ({
          id: f.id,
          name: f.name,
          weight: f.weight,
          rating: f.rating,
          type: f.type,
          evidence: f.evidence || null
        })),
        evaluatedRelationships: (state.relationships || []).map(r => ({
          internalId: r.internalId,
          externalId: r.externalId,
          quadrant: r.quadrant,
          strength: r.strength,
          justification: r.justification || null
        })),
        cameActions: (calculated.came?.actions || []).map(a => ({
          action: a.action,
          factor: a.factor,
          priority: a.priority,
          category: a.category
        }))
      }
    }

    return {
      toolName: 'get_investigation_details',
      success: true,
      data: {
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accessLevel: row.access_level,
        author: meta.author || null,
        organization: meta.organization || null,
        description: meta.problem || meta.objective || null,
        analysis: analysisSummary,
        audit: auditReport
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'get_investigation_details',
      success: false,
      error: `Error consultando expediente: ${errorMsg}`
    }
  }
}

export const getInvestigationDetailsTool: NovaiModularTool<typeof getInvestigationDetailsSchema> = {
  metadata: {
    name: 'get_investigation_details',
    label: 'Consultar Expediente',
    description: 'Obtiene el expediente detallado de una investigación (diagnóstico, factores EFI/EFE, matrices DAFO, estrategias QSPM y plan CAME) tras validar permisos ReBAC.',
    category: 'investigations',
    riskLevel: 'low'
  },
  schema: getInvestigationDetailsSchema,
  openAiDeclaration: {
    name: 'get_investigation_details',
    description: 'Obtiene el expediente detallado de una investigación (diagnóstico, autor, factores EFI/EFE, matrices DAFO, estrategias QSPM y plan CAME) tras validar permisos ReBAC.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación a consultar.'
        }
      },
      required: ['investigation_id']
    }
  },
  execute: executeGetInvestigationDetails,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Obtiene el expediente detallado de una investigación (diagnóstico, factores EFI/EFE, matrices DAFO, estrategias QSPM y plan CAME) tras validar permisos ReBAC.',
      inputSchema: getInvestigationDetailsSchema,
      execute: async (args: GetInvestigationDetailsInput) => {
        const res = await executeGetInvestigationDetails(args, principal)
        if (!res.success) throw new Error(res.error || 'get_investigation_details failed')
        return res.data
      }
    })
}
