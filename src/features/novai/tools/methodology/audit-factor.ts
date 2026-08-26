import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { isWeaknessType, isStrengthType } from '../../methodology-knowledge'
import type { InvestigationState, Factor } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const auditFactorSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a auditar.'),
  factor_code: z.string().min(1).describe('El código canónico del factor (ej: "D-03", "F-01", "O-02", "A-02") o ID/nombre.')
})

export type AuditFactorInput = z.infer<typeof auditFactorSchema>

export async function executeAuditFactor(
  args: AuditFactorInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const factorCodeQuery = String(args.factor_code || '').trim().toUpperCase()

    if (!id || !factorCodeQuery) {
      return { toolName: 'audit_factor', success: false, error: 'investigation_id y factor_code son requeridos' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'audit_factor',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []

    let targetFactor: Factor | null = null
    let canonicalCode = factorCodeQuery
    let factorCategory: 'internal' | 'external' = 'internal'

    // Resolver por código tipo D-01 / D-1
    const match = factorCodeQuery.match(/^([DFOA])-?0*(\d+)$/i)
    if (match) {
      const type = match[1].toUpperCase()
      const idx = parseInt(match[2], 10)
      if (type === 'D' || type === 'F') {
        const filtered = internal.filter(f => f.type === type)
        if (filtered[idx - 1]) {
          targetFactor = filtered[idx - 1]
          factorCategory = 'internal'
          canonicalCode = `${type}-${String(idx).padStart(2, '0')}`
        }
      } else {
        const filtered = external.filter(f => f.type === type)
        if (filtered[idx - 1]) {
          targetFactor = filtered[idx - 1]
          factorCategory = 'external'
          canonicalCode = `${type}-${String(idx).padStart(2, '0')}`
        }
      }
    }

    // Fallback: búsqueda por ID o nombre
    if (!targetFactor) {
      targetFactor = internal.find(f => f.id === args.factor_code || f.name.toLowerCase().includes(args.factor_code.toLowerCase())) || null
      if (targetFactor) {
        factorCategory = 'internal'
        const idx = internal.filter(f => f.type === targetFactor?.type).findIndex(f => f.id === targetFactor?.id)
        canonicalCode = `${targetFactor.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`
      }
    }

    if (!targetFactor) {
      targetFactor = external.find(f => f.id === args.factor_code || f.name.toLowerCase().includes(args.factor_code.toLowerCase())) || null
      if (targetFactor) {
        factorCategory = 'external'
        const idx = external.filter(f => f.type === targetFactor?.type).findIndex(f => f.id === targetFactor?.id)
        canonicalCode = `${targetFactor.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`
      }
    }

    if (!targetFactor) {
      return {
        toolName: 'audit_factor',
        success: false,
        error: `No se encontró ningún factor con el código o nombre "${args.factor_code}".`
      }
    }

    interface AuditFinding {
      ruleCode: string
      severity: 'critical' | 'warning' | 'info'
      message: string
      suggestedFix: string
    }

    const findings: AuditFinding[] = []

    // 1. Calibración de escala de calificación
    if (isWeaknessType(targetFactor.type)) {
      if (targetFactor.rating === 3 || targetFactor.rating === 4) {
        findings.push({
          ruleCode: 'INVALID_WEAKNESS_RATING',
          severity: 'critical',
          message: `La debilidad "${targetFactor.name}" (${canonicalCode}) tiene calificación ${targetFactor.rating}. Las debilidades solo pueden calificarse con 1 (Mayor) o 2 (Menor).`,
          suggestedFix: 'Modificar calificación a 1 (Debilidad Mayor) o 2 (Debilidad Menor).'
        })
      }
    }

    if (isStrengthType(targetFactor.type)) {
      if (targetFactor.rating === 1 || targetFactor.rating === 2) {
        findings.push({
          ruleCode: 'INVALID_STRENGTH_RATING',
          severity: 'critical',
          message: `La fortaleza "${targetFactor.name}" (${canonicalCode}) tiene calificación ${targetFactor.rating}. Las fortalezas solo pueden calificarse con 3 (Menor) o 4 (Mayor).`,
          suggestedFix: 'Modificar calificación a 3 (Fortaleza Menor) o 4 (Fortaleza Mayor).'
        })
      }
    }

    // 2. Calibración de ponderación (weight)
    const weight = Number(targetFactor.weight || 0)
    if (weight <= 0) {
      findings.push({
        ruleCode: 'ZERO_WEIGHT',
        severity: 'critical',
        message: `El factor tiene ponderación 0.00, por lo que no aporta valor analítico a la matriz.`,
        suggestedFix: 'Asignar una ponderación representativa entre 0.01 y 0.30.'
      })
    } else if (weight > 0.35) {
      findings.push({
        ruleCode: 'EXCESSIVE_WEIGHT',
        severity: 'warning',
        message: `La ponderación es ${weight.toFixed(2)} (más del 35% del total). Puede sobrecargar y sesgar el índice ponderado.`,
        suggestedFix: 'Evaluar si el factor puede desagregarse o moderar su peso relativo.'
      })
    }

    // 3. Auditoría de respaldo probatorio (Evidence Quality)
    const evidenceText = (targetFactor.evidence || '').trim()
    let evidenceQuality: 'high' | 'medium' | 'insufficient' | 'missing' = 'missing'

    if (evidenceText.length === 0) {
      evidenceQuality = 'missing'
      if (weight >= 0.15) {
        findings.push({
          ruleCode: 'HIGH_IMPACT_MISSING_EVIDENCE',
          severity: 'critical',
          message: `Factor de alto impacto (${(weight * 100).toFixed(0)}% de peso) sin respaldo probatorio ni fuente documental registrada.`,
          suggestedFix: 'Añadir cita o estudio probatorio para sustentar este factor crítico.'
        })
      } else {
        findings.push({
          ruleCode: 'MISSING_EVIDENCE',
          severity: 'warning',
          message: 'No se registró evidencia documental explícita para este factor.',
          suggestedFix: 'Registrar la fuente documental o métrica de origen.'
        })
      }
    } else if (evidenceText.length < 20) {
      evidenceQuality = 'insufficient'
      findings.push({
        ruleCode: 'VAGUE_EVIDENCE',
        severity: 'warning',
        message: 'La evidencia registrada es muy escueta o no cita fuentes verificables.',
        suggestedFix: 'Especificar reporte, fecha, métrica o área emisora.'
      })
    } else {
      evidenceQuality = evidenceText.toLowerCase().includes('informe') || evidenceText.toLowerCase().includes('estudio') || evidenceText.toLowerCase().includes('reporte') || evidenceText.toLowerCase().includes('auditoría') ? 'high' : 'medium'
    }

    const calculatedScore = Number((weight * (targetFactor.rating || 0)).toFixed(3))
    const isMethodologicallyValid = findings.filter(f => f.severity === 'critical').length === 0

    return {
      toolName: 'audit_factor',
      success: true,
      result: {
        investigationId: row.id,
        factor: {
          code: canonicalCode,
          name: targetFactor.name,
          type: targetFactor.type,
          category: factorCategory,
          weight,
          rating: targetFactor.rating,
          calculatedScore,
          evidence: evidenceText
        },
        audit: {
          isMethodologicallyValid,
          evidenceQuality,
          criticalErrorsCount: findings.filter(f => f.severity === 'critical').length,
          warningsCount: findings.filter(f => f.severity === 'warning').length,
          findings
        }
      }
    }
  } catch (err) {
    return {
      toolName: 'audit_factor',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const auditFactorTool: NovaiModularTool = {
  metadata: {
    name: 'audit_factor',
    displayName: 'Auditar Factor Metodológico',
    description:
      'Audita la calibración de escala (1-2 para debilidades, 3-4 para fortalezas), ponderación y calidad probatoria de un factor específico.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: auditFactorSchema,
  execute: executeAuditFactor,
  openAiDeclaration: {
    name: 'audit_factor',
    description:
      'Audita la calibración de escala (1-2 para debilidades, 3-4 para fortalezas), ponderación y calidad probatoria de un factor específico.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        factor_code: { type: 'string', description: 'El código del factor (ej: "D-03", "F-01", "O-02", "A-02") o su nombre.' }
      },
      required: ['investigation_id', 'factor_code']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Audita la calibración de escala (1-2 para debilidades, 3-4 para fortalezas), ponderación y calidad probatoria de un factor específico.',
      inputSchema: auditFactorSchema,
      execute: async (args: AuditFactorInput) => {
        const res = await executeAuditFactor(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
