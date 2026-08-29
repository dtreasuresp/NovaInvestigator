import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState, Factor } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getFactorEvidenceSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a consultar.'),
  factor_code: z.string().min(1).describe('El código canónico del factor (ej: "D-01", "D-03", "F-02", "O-01", "A-02") o el ID/nombre del factor.')
})

export type GetFactorEvidenceInput = z.infer<typeof getFactorEvidenceSchema>

export async function executeGetFactorEvidence(
  args: GetFactorEvidenceInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const codeQuery = String(args.factor_code || '').trim().toUpperCase()

    if (!id) {
      return { toolName: 'get_factor_evidence', success: false, error: 'investigation_id es requerido' }
    }

    if (!codeQuery) {
      return { toolName: 'get_factor_evidence', success: false, error: 'factor_code es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'get_factor_evidence',
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

    let targetFactor: Factor | null = null
    let canonicalCode = codeQuery
    let factorCategory: 'internal' | 'external' = 'internal'
    let factorTypeName = ''

    // Helper para comparar códigos D-01 / D-1 / id / nombre
    const parseCodeIndex = (code: string): { type: string; idx: number } | null => {
      const match = code.match(/^([DFOA])-?0*(\d+)$/i)
      if (match) {
        return { type: match[1].toUpperCase(), idx: parseInt(match[2], 10) }
      }
      return null
    }

    const parsedQuery = parseCodeIndex(codeQuery)

    if (parsedQuery) {
      if (parsedQuery.type === 'D' || parsedQuery.type === 'F') {
        const filtered = internal.filter(f => f.type === parsedQuery.type)
        const target = filtered[parsedQuery.idx - 1]
        if (target) {
          targetFactor = target
          factorCategory = 'internal'
          canonicalCode = `${parsedQuery.type}-${String(parsedQuery.idx).padStart(2, '0')}`
        }
      } else if (parsedQuery.type === 'O' || parsedQuery.type === 'A') {
        const filtered = external.filter(f => f.type === parsedQuery.type)
        const target = filtered[parsedQuery.idx - 1]
        if (target) {
          targetFactor = target
          factorCategory = 'external'
          canonicalCode = `${parsedQuery.type}-${String(parsedQuery.idx).padStart(2, '0')}`
        }
      }
    }

    // Fallback: búsqueda por ID o coincidencia en el nombre
    if (!targetFactor) {
      targetFactor = internal.find(f => f.id === args.factor_code || f.name.toLowerCase().includes(args.factor_code.toLowerCase())) || null
      if (targetFactor) {
        factorCategory = 'internal'
        const listOfType = internal.filter(f => f.type === targetFactor?.type)
        const idx = listOfType.findIndex(f => f.id === targetFactor?.id)
        canonicalCode = `${targetFactor.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`
      }
    }

    if (!targetFactor) {
      targetFactor = external.find(f => f.id === args.factor_code || f.name.toLowerCase().includes(args.factor_code.toLowerCase())) || null
      if (targetFactor) {
        factorCategory = 'external'
        const listOfType = external.filter(f => f.type === targetFactor?.type)
        const idx = listOfType.findIndex(f => f.id === targetFactor?.id)
        canonicalCode = `${targetFactor.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`
      }
    }

    if (!targetFactor) {
      return {
        toolName: 'get_factor_evidence',
        success: false,
        error: `No se encontró ningún factor con el código o nombre "${args.factor_code}" en la investigación.`
      }
    }

    switch (targetFactor.type) {
      case 'D': factorTypeName = 'Debilidad (Factor Interno)'; break
      case 'F': factorTypeName = 'Fortaleza (Factor Interno)'; break
      case 'O': factorTypeName = 'Oportunidad (Factor Externo)'; break
      case 'A': factorTypeName = 'Amenaza (Factor Externo)'; break
    }

    // Relaciones DAFO cruzadas vinculadas a este factor
    const linkedRelationships = relationships
      .filter(r => r.internalId === targetFactor?.id || r.externalId === targetFactor?.id)
      .map(r => ({
        relationshipId: r.id,
        quadrant: r.quadrant,
        strength: r.strength,
        status: r.status,
        justification: r.justification || '',
        evidence: r.evidence || '',
        pairedFactorId: r.internalId === targetFactor?.id ? r.externalId : r.internalId
      }))

    // Estrategias vinculadas
    const linkedStrategies = strategies
      .filter(s => (s.relatedFactors || []).includes(targetFactor?.id || '') || (s.relatedFactors || []).includes(canonicalCode))
      .map(s => ({
        id: s.id,
        name: s.name,
        quadrant: s.quadrant,
        description: s.description,
        observations: s.observations
      }))

    // Acciones CAME vinculadas
    const linkedCameActions = cameActions
      .filter(a => a.factorId === targetFactor?.id || a.factor.toLowerCase().includes(targetFactor?.name.toLowerCase() || ''))
      .map(a => ({
        id: a.id,
        type: a.type,
        action: a.action,
        status: a.status,
        responsible: a.responsible,
        justification: a.justification
      }))

    const score = Number(((targetFactor.weight || 0) * (targetFactor.rating || 0)).toFixed(3))

    return {
      toolName: 'get_factor_evidence',
      success: true,
      result: {
        investigationId: row.id,
        factor: {
          id: targetFactor.id,
          code: canonicalCode,
          name: targetFactor.name,
          type: targetFactor.type,
          typeName: factorTypeName,
          category: factorCategory,
          weight: targetFactor.weight,
          rating: targetFactor.rating,
          score,
          description: targetFactor.description || '',
          evidence: targetFactor.evidence || 'No se registró evidencia documental explícita para este factor.',
          hasEvidence: Boolean(targetFactor.evidence && targetFactor.evidence.trim().length > 0)
        },
        traceability: {
          totalCrossings: linkedRelationships.length,
          relationships: linkedRelationships,
          totalStrategies: linkedStrategies.length,
          strategies: linkedStrategies,
          totalCameActions: linkedCameActions.length,
          cameActions: linkedCameActions
        }
      }
    }
  } catch (err) {
    return {
      toolName: 'get_factor_evidence',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const getFactorEvidenceTool: NovaiModularTool = {
  metadata: {
    name: 'get_factor_evidence',
    displayName: 'Consultar Evidencia de Factor',
    description:
      'Recupera la ficha completa, evidencia documental, ponderación, calificación y trazabilidad hacia matrices, estrategias y acciones CAME de un factor específico (ej: D-03, F-01, O-02, A-02).',
    category: 'evidence',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: getFactorEvidenceSchema,
  execute: executeGetFactorEvidence,
  openAiDeclaration: {
    name: 'get_factor_evidence',
    description:
      'Recupera la ficha completa, evidencia documental, ponderación, calificación y trazabilidad hacia matrices, estrategias y acciones CAME de un factor específico (ej: D-03, F-01, O-02, A-02).',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación.'
        },
        factor_code: {
          type: 'string',
          description: 'El código del factor (ej: "D-03", "F-01", "O-02", "A-02") o su nombre.'
        }
      },
      required: ['investigation_id', 'factor_code']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Recupera la ficha completa, evidencia documental, ponderación, calificación y trazabilidad hacia matrices, estrategias y acciones CAME de un factor específico (ej: D-03, F-01, O-02, A-02).',
      inputSchema: getFactorEvidenceSchema,
      execute: async (args: GetFactorEvidenceInput) => {
        const res = await executeGetFactorEvidence(args, principal)
        if (!res.success) throw new Error(res.error || 'get_factor_evidence failed')
        return res.result
      }
    })
}
