import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { auditInvestigationConsistency } from '../../evidence-engine'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const findContradictionsSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a auditar.')
})

export type FindContradictionsInput = z.infer<typeof findContradictionsSchema>

export async function executeFindContradictions(
  args: FindContradictionsInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()

    if (!id) {
      return { toolName: 'find_contradictions', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'find_contradictions',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const audit = auditInvestigationConsistency(state)

    interface ContradictionItem {
      contradictionId: string
      type: 'FACTOR_EVIDENCE_CONTRADICTION' | 'FACTOR_FACTOR_CONTRADICTION' | 'MATRIX_CONTRADICTION' | 'STRATEGY_CONTRADICTION'
      severity: 'high' | 'medium' | 'low'
      category: string
      title: string
      explanation: string
      recommendation: string
    }

    const contradictions: ContradictionItem[] = []

    // 1. Contradicciones metodológicas de factores (calificaciones inválidas o sumatorias)
    audit.findings.forEach((f, idx) => {
      let type: ContradictionItem['type'] = 'FACTOR_FACTOR_CONTRADICTION'
      if (f.code.includes('WEIGHT')) type = 'MATRIX_CONTRADICTION'
      if (f.code.includes('EVIDENCE')) type = 'FACTOR_EVIDENCE_CONTRADICTION'

      contradictions.push({
        contradictionId: `contr-${idx + 1}-${f.code.toLowerCase()}`,
        type,
        severity: f.severity === 'high' ? 'high' : 'medium',
        category: f.category,
        title: f.code.replace(/_/g, ' '),
        explanation: f.message,
        recommendation: f.suggestedAction
      })
    })

    // 2. Contradicciones en cruces DAFO (Ceros sospechosos en vulnerabilidades críticas)
    audit.suspiciousDafoCrossings.forEach((s, idx) => {
      contradictions.push({
        contradictionId: `contr-crossing-${idx + 1}`,
        type: 'MATRIX_CONTRADICTION',
        severity: 'high',
        category: 'dafo',
        title: `Cero sospechoso en cruce ${s.internalFactor} × ${s.externalFactor}`,
        explanation: `Se asignó fuerza 0 a la interacción entre el factor interno "${s.internalFactor}" y el factor externo "${s.externalFactor}", a pesar de que ambos tienen máxima severidad. ${s.rationale}`,
        recommendation: `Asignar una fuerza mínima sugerida de ${s.suggestedMin} o justificar explícitamente la ausencia de correlación.`
      })
    })

    return {
      toolName: 'find_contradictions',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        hasCriticalContradictions: audit.hasCriticalContradictions || contradictions.filter(c => c.severity === 'high').length > 0,
        totalContradictions: contradictions.length,
        contradictions,
        summary: {
          criticalCount: contradictions.filter(c => c.severity === 'high').length,
          mediumCount: contradictions.filter(c => c.severity === 'medium').length,
          lowCount: contradictions.filter(c => c.severity === 'low').length,
          efiValidWeightSum: audit.efiStatus.isValidSum,
          efeValidWeightSum: audit.efeStatus.isValidSum
        }
      }
    }
  } catch (err) {
    return {
      toolName: 'find_contradictions',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const findContradictionsTool: NovaiModularTool = {
  metadata: {
    name: 'find_contradictions',
    displayName: 'Detectar Contradicciones Estratégicas',
    description:
      'Identifica deterministamente inconsistencias matemáticas, calificaciones incompatibles, vacíos probatorios y ceros sospechosos en la investigación.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: findContradictionsSchema,
  execute: executeFindContradictions,
  openAiDeclaration: {
    name: 'find_contradictions',
    description:
      'Identifica deterministamente inconsistencias matemáticas, calificaciones incompatibles, vacíos probatorios y ceros sospechosos en la investigación.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' }
      },
      required: ['investigation_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Identifica deterministamente inconsistencias matemáticas, calificaciones incompatibles, vacíos probatorios y ceros sospechosos en la investigación.',
      inputSchema: findContradictionsSchema,
      execute: async (args: FindContradictionsInput) => {
        const res = await executeFindContradictions(args, principal)
        if (!res.success) throw new Error(res.error || 'find_contradictions failed')
        return res.result
      }
    })
}
