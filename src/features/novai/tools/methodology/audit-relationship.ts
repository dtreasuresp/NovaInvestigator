import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { auditDafoCrossing } from '../../methodology-knowledge'
import type { InvestigationState, Factor, Relationship } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const auditRelationshipSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a consultar.'),
  internal_factor_code: z.string().min(1).describe('El código o ID del factor interno (ej: "D-03", "D-01", "F-02").'),
  external_factor_code: z.string().min(1).describe('El código o ID del factor externo (ej: "A-02", "A-01", "O-01").')
})

export type AuditRelationshipInput = z.infer<typeof auditRelationshipSchema>

export async function executeAuditRelationship(
  args: AuditRelationshipInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const internalCode = String(args.internal_factor_code || '').trim().toUpperCase()
    const externalCode = String(args.external_factor_code || '').trim().toUpperCase()

    if (!id || !internalCode || !externalCode) {
      return { toolName: 'audit_relationship', success: false, error: 'investigation_id, internal_factor_code y external_factor_code son requeridos' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'audit_relationship',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []

    // Helper para resolver factor
    const resolveFactor = (code: string, list: Factor[]): { factor: Factor | null; canonicalCode: string } => {
      const match = code.match(/^([DFOA])-?0*(\d+)$/i)
      if (match) {
        const type = match[1].toUpperCase()
        const idx = parseInt(match[2], 10)
        const filtered = list.filter(f => f.type === type)
        if (filtered[idx - 1]) {
          return { factor: filtered[idx - 1], canonicalCode: `${type}-${String(idx).padStart(2, '0')}` }
        }
      }

      const byIdOrName = list.find(f => f.id === code || f.name.toLowerCase().includes(code.toLowerCase()))
      if (byIdOrName) {
        const idx = list.filter(f => f.type === byIdOrName.type).findIndex(f => f.id === byIdOrName.id)
        return { factor: byIdOrName, canonicalCode: `${byIdOrName.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}` }
      }

      return { factor: null, canonicalCode: code }
    }

    const resolvedInternal = resolveFactor(internalCode, internal)
    const resolvedExternal = resolveFactor(externalCode, external)

    if (!resolvedInternal.factor) {
      return {
        toolName: 'audit_relationship',
        success: false,
        error: `No se encontró el factor interno "${args.internal_factor_code}" en la investigación.`
      }
    }

    if (!resolvedExternal.factor) {
      return {
        toolName: 'audit_relationship',
        success: false,
        error: `No se encontró el factor externo "${args.external_factor_code}" en la investigación.`
      }
    }

    const fInternal = resolvedInternal.factor
    const fExternal = resolvedExternal.factor

    // Buscar relación explícita registrada en la matriz
    const rel = relationships.find(r =>
      (r.internalId === fInternal.id && r.externalId === fExternal.id) ||
      (r.internalId === resolvedInternal.canonicalCode && r.externalId === resolvedExternal.canonicalCode)
    )

    const strength = typeof rel?.strength === 'number' ? rel.strength : 0
    const justification = (rel?.justification || '').trim()
    const crossingEvidence = (rel?.evidence || '').trim()

    // Ejecutar axioma de auditoría metodológica determinista
    const crossingAudit = auditDafoCrossing(fInternal, fExternal, strength)

    interface Finding {
      code: string
      severity: 'high' | 'medium' | 'low' | 'info'
      message: string
    }

    const findings: Finding[] = []

    if (crossingAudit.isSuspiciousZero) {
      findings.push({
        code: 'SUSPICIOUS_ZERO_CROSSING',
        severity: 'high',
        message: crossingAudit.auditRationale || 'Cruce crítico calificado en 0 a pesar de alta severidad de factores.'
      })
    }

    // Comprobación de evidencia de conexión estratégica (Anti-Sycophancy)
    let evidenceConnectionStatus: 'proven' | 'plausible_unproven' | 'unjustified' = 'plausible_unproven'
    let evidenceConfidence = 0.5

    if (crossingEvidence.length > 0) {
      evidenceConnectionStatus = 'proven'
      evidenceConfidence = 0.9
    } else if (justification.length > 0) {
      evidenceConnectionStatus = 'plausible_unproven'
      evidenceConfidence = 0.6
      findings.push({
        code: 'UNPROVEN_STRATEGIC_LINK',
        severity: 'medium',
        message: `Ambos factores (${resolvedInternal.canonicalCode} y ${resolvedExternal.canonicalCode}) existen y tienen justificación temática, pero carecen de evidencia empírica directa que demuestre el impacto causal entre ambos.`
      })
    } else {
      evidenceConnectionStatus = 'unjustified'
      evidenceConfidence = 0.2
      findings.push({
        code: 'UNJUSTIFIED_CROSSING',
        severity: 'high',
        message: 'No existe justificación ni evidencia documentada para esta relación estratégica en la matriz.'
      })
    }

    let recommendation = ''
    if (crossingAudit.isSuspiciousZero) {
      recommendation = `Revisar y calibrar la fuerza del cruce a un mínimo de ${crossingAudit.suggestedMinScore} (${crossingAudit.auditRationale}).`
    } else if (evidenceConnectionStatus === 'plausible_unproven') {
      recommendation = 'Mantener la relación como plausible pero sin asignarle fuerza máxima hasta incorporar evidencia empírica que sustente el vínculo causal.'
    } else {
      recommendation = 'Relación estratégica metodológicamente consistente y documentada.'
    }

    const quadrant = `${fInternal.type}${fExternal.type}`

    return {
      toolName: 'audit_relationship',
      success: true,
      result: {
        investigationId: row.id,
        crossing: `${resolvedInternal.canonicalCode} × ${resolvedExternal.canonicalCode}`,
        quadrant,
        internalFactor: {
          code: resolvedInternal.canonicalCode,
          name: fInternal.name,
          type: fInternal.type,
          weight: fInternal.weight,
          rating: fInternal.rating,
          evidence: fInternal.evidence || 'Sin evidencia explícita.'
        },
        externalFactor: {
          code: resolvedExternal.canonicalCode,
          name: fExternal.name,
          type: fExternal.type,
          weight: fExternal.weight,
          rating: fExternal.rating,
          evidence: fExternal.evidence || 'Sin evidencia explícita.'
        },
        matrixState: {
          strength,
          status: rel?.status || (strength === 0 ? 'sin relación' : strength === 3 ? 'fuerte' : strength === 2 ? 'moderada' : 'débil'),
          justification: justification || 'Sin justificación registrada.',
          evidence: crossingEvidence || 'Sin evidencia directa registrada para este cruce.'
        },
        audit: {
          isSuspiciousZero: crossingAudit.isSuspiciousZero,
          evidenceConnectionStatus,
          confidence: evidenceConfidence,
          findings,
          recommendation
        }
      }
    }
  } catch (err) {
    return {
      toolName: 'audit_relationship',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const auditRelationshipTool: NovaiModularTool = {
  metadata: {
    name: 'audit_relationship',
    displayName: 'Auditar Cruce DAFO',
    description:
      'Audita formalmente una relación estratégica cruzada (FO, DO, FA, DA) entre un factor interno y uno externo (ej: D-03 × A-02), evaluando causalidad, sesgos, ceros sospechosos y solidez probatoria.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: auditRelationshipSchema,
  execute: executeAuditRelationship,
  openAiDeclaration: {
    name: 'audit_relationship',
    description:
      'Audita formalmente una relación estratégica cruzada (FO, DO, FA, DA) entre un factor interno y uno externo (ej: D-03 × A-02), evaluando causalidad, sesgos, ceros sospechosos y solidez probatoria.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        internal_factor_code: { type: 'string', description: 'El código del factor interno (ej: "D-03", "F-01").' },
        external_factor_code: { type: 'string', description: 'El código del factor externo (ej: "A-02", "O-01").' }
      },
      required: ['investigation_id', 'internal_factor_code', 'external_factor_code']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Audita formalmente una relación estratégica cruzada (FO, DO, FA, DA) entre un factor interno y uno externo (ej: D-03 × A-02), evaluando causalidad, sesgos, ceros sospechosos y solidez probatoria.',
      inputSchema: auditRelationshipSchema,
      execute: async (args: AuditRelationshipInput) => {
        const res = await executeAuditRelationship(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
