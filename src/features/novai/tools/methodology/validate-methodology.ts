import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import { auditInvestigationConsistency } from '../../evidence-engine'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const validateMethodologySchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a auditar metodológicamente.'),
  stage: z.enum(['ALL', 'EFI', 'EFE', 'DAFO', 'CAME', 'QSPM']).optional().default('ALL').describe('Etapa específica a validar o ALL para evaluación integral.')
})

export type ValidateMethodologyInput = z.infer<typeof validateMethodologySchema>

export async function executeValidateMethodology(
  args: ValidateMethodologyInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const stage = args.stage || 'ALL'

    if (!id) {
      return { toolName: 'validate_methodology', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'validate_methodology',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []
    const strategies = Array.isArray(state?.strategies) ? state.strategies : []
    const cameActions = Array.isArray(state?.cameActions) ? state.cameActions : []

    const audit = auditInvestigationConsistency(state)
    const calculated = calculateAnalysis(state)

    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // 1. Validación EFI
    if (stage === 'ALL' || stage === 'EFI') {
      const efiSum = internal.reduce((acc, f) => acc + (Number(f.weight) || 0), 0)
      if (Math.abs(efiSum - 1.0) > 0.005 && internal.length > 0) {
        errors.push(`EFI: La sumatoria de ponderaciones es ${efiSum.toFixed(3)}, debiendo ser exactamente 1.00.`)
      }
      if (internal.length === 0) {
        warnings.push('EFI: No se han registrado factores internos (Debilidades o Fortalezas).')
      }
      audit.efiStatus.ratingErrors.forEach(err => errors.push(`EFI: ${err}`))
    }

    // 2. Validación EFE
    if (stage === 'ALL' || stage === 'EFE') {
      const efeSum = external.reduce((acc, f) => acc + (Number(f.weight) || 0), 0)
      if (Math.abs(efeSum - 1.0) > 0.005 && external.length > 0) {
        errors.push(`EFE: La sumatoria de ponderaciones es ${efeSum.toFixed(3)}, debiendo ser exactamente 1.00.`)
      }
      if (external.length === 0) {
        warnings.push('EFE: No se han registrado factores externos (Oportunidades o Amenazas).')
      }
      audit.efeStatus.ratingErrors.forEach(err => errors.push(`EFE: ${err}`))
    }

    // 3. Validación DAFO
    if (stage === 'ALL' || stage === 'DAFO') {
      const expectedTotalCrossings = internal.length * external.length
      if (relationships.length === 0 && expectedTotalCrossings > 0) {
        warnings.push(`DAFO: La matriz de cruces está vacía (0/${expectedTotalCrossings} interacciones evaluadas).`)
      }
      if (audit.suspiciousDafoCrossings.length > 0) {
        warnings.push(`DAFO: Se detectaron ${audit.suspiciousDafoCrossings.length} cruces con cero sospechoso en factores críticos.`)
      }
    }

    // 4. Validación CAME
    if (stage === 'ALL' || stage === 'CAME') {
      if (strategies.length > 0 && cameActions.length === 0) {
        warnings.push('CAME: Existen estrategias definidas pero no se han formulado planes de acción CAME operativos.')
      }
    }

    // 5. Validación QSPM
    if (stage === 'ALL' || stage === 'QSPM') {
      if (strategies.length >= 2 && (!state.qspmScores || Object.keys(state.qspmScores).length === 0)) {
        recommendations.push('QSPM: Se sugiere evaluar la matriz cuantitativa de planeación estratégica para comparar y priorizar las alternativas.')
      }
    }

    const status = errors.length > 0 ? 'ERRORS' : warnings.length > 0 ? 'WARNINGS' : 'VALID'
    const methodologyScore = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))

    return {
      toolName: 'validate_methodology',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        stageEvaluated: stage,
        status,
        methodologyScore,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        errors,
        warnings,
        recommendations,
        calculatedIndices: {
          efiTotal: calculated.efi.total,
          efeTotal: calculated.efe.total,
          dominantQuadrant: calculated.relations.dominant
        }
      }
    }
  } catch (err) {
    return {
      toolName: 'validate_methodology',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const validateMethodologyTool: NovaiModularTool = {
  metadata: {
    name: 'validate_methodology',
    displayName: 'Validar Metodología Estratégica',
    description:
      'Evalúa la conformidad metodológica integral o por etapa (EFI, EFE, DAFO, CAME, QSPM) asegurando rigor académico y ausencia de errores estructurales.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: validateMethodologySchema,
  execute: executeValidateMethodology,
  openAiDeclaration: {
    name: 'validate_methodology',
    description:
      'Evalúa la conformidad metodológica integral o por etapa (EFI, EFE, DAFO, CAME, QSPM) asegurando rigor académico y ausencia de errores estructurales.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        stage: { type: 'string', enum: ['ALL', 'EFI', 'EFE', 'DAFO', 'CAME', 'QSPM'], description: 'Etapa específica a validar.' }
      },
      required: ['investigation_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Evalúa la conformidad metodológica integral o por etapa (EFI, EFE, DAFO, CAME, QSPM) asegurando rigor académico y ausencia de errores estructurales.',
      inputSchema: validateMethodologySchema,
      execute: async (args: ValidateMethodologyInput) => {
        const res = await executeValidateMethodology(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
