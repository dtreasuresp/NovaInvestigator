import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState, Strategy, Factor, Relationship, CameAction } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const traceStrategySchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a consultar.'),
  strategy_id: z.string().min(1).describe('El ID o nombre de la estrategia cuya cadena de trazabilidad se desea auditar.')
})

export type TraceStrategyInput = z.infer<typeof traceStrategySchema>

export async function executeTraceStrategy(
  args: TraceStrategyInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const stratIdQuery = String(args.strategy_id || '').trim()

    if (!id || !stratIdQuery) {
      return { toolName: 'trace_strategy', success: false, error: 'investigation_id y strategy_id son requeridos' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'trace_strategy',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const strategies = Array.isArray(state?.strategies) ? state.strategies : []
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []
    const cameActions = Array.isArray(state?.cameActions) ? state.cameActions : []
    const qspmScores = state?.qspmScores || {}

    const strategy = strategies.find(s => s.id === stratIdQuery || s.name.toLowerCase().includes(stratIdQuery.toLowerCase()))

    if (!strategy) {
      return {
        toolName: 'trace_strategy',
        success: false,
        error: `No se encontró ninguna estrategia con el ID o nombre "${args.strategy_id}".`
      }
    }

    // 1. Resolver factores vinculados
    const relatedFactorIds = strategy.relatedFactors || []
    const resolvedFactors: Array<{
      id: string
      code: string
      name: string
      type: string
      weight: number
      rating: number
      evidence: string
    }> = []

    relatedFactorIds.forEach(fId => {
      const fInt = internal.find(f => f.id === fId || f.name.toLowerCase().includes(fId.toLowerCase()))
      if (fInt) {
        const idx = internal.filter(f => f.type === fInt.type).findIndex(f => f.id === fInt.id)
        resolvedFactors.push({
          id: fInt.id,
          code: `${fInt.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`,
          name: fInt.name,
          type: fInt.type,
          weight: fInt.weight,
          rating: fInt.rating,
          evidence: fInt.evidence || 'Sin evidencia explícita.'
        })
        return
      }

      const fExt = external.find(f => f.id === fId || f.name.toLowerCase().includes(fId.toLowerCase()))
      if (fExt) {
        const idx = external.filter(f => f.type === fExt.type).findIndex(f => f.id === fExt.id)
        resolvedFactors.push({
          id: fExt.id,
          code: `${fExt.type}-${String(idx >= 0 ? idx + 1 : 1).padStart(2, '0')}`,
          name: fExt.name,
          type: fExt.type,
          weight: fExt.weight,
          rating: fExt.rating,
          evidence: fExt.evidence || 'Sin evidencia explícita.'
        })
      }
    })

    // 2. Cruces DAFO que fundamentan la estrategia
    const linkedRelationships = relationships.filter(r =>
      relatedFactorIds.includes(r.internalId) && relatedFactorIds.includes(r.externalId)
    )

    // 3. Acciones CAME generadas
    const linkedCameActions = cameActions.filter(a =>
      a.strategyId === strategy.id || a.action.toLowerCase().includes(strategy.name.toLowerCase())
    )

    // 4. Puntuación QSPM
    const stratQspm = qspmScores[strategy.id] || null

    // Construcción del Grafo de Linaje Estratégico
    const lineageGraph = {
      root: {
        type: 'strategy',
        id: strategy.id,
        name: strategy.name,
        quadrant: strategy.quadrant,
        orientation: strategy.orientation,
        description: strategy.description
      },
      qspmEvaluation: stratQspm ? { hasScore: true, scores: stratQspm } : { hasScore: false },
      cameActions: linkedCameActions.map(a => ({
        id: a.id,
        type: a.type,
        action: a.action,
        status: a.status,
        responsible: a.responsible
      })),
      dafoCrossings: linkedRelationships.map(r => ({
        internalId: r.internalId,
        externalId: r.externalId,
        quadrant: r.quadrant,
        strength: r.strength,
        evidence: r.evidence || r.justification || ''
      })),
      underlyingFactors: resolvedFactors,
      evidenceSources: resolvedFactors.map(f => ({
        factorCode: f.code,
        factorName: f.name,
        evidenceText: f.evidence
      }))
    }

    return {
      toolName: 'trace_strategy',
      success: true,
      result: {
        investigationId: row.id,
        strategyId: strategy.id,
        strategyName: strategy.name,
        lineage: lineageGraph
      }
    }
  } catch (err) {
    return {
      toolName: 'trace_strategy',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const traceStrategyTool: NovaiModularTool = {
  metadata: {
    name: 'trace_strategy',
    displayName: 'Rastrear Linaje de Estrategia',
    description:
      'Reconstruye el árbol de trazabilidad completo de una estrategia: Strategy → QSPM → CAME → Cruce DAFO → Factores → Evidencia Documental → Fuente.',
    category: 'platform',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: traceStrategySchema,
  execute: executeTraceStrategy,
  openAiDeclaration: {
    name: 'trace_strategy',
    description:
      'Reconstruye el árbol de trazabilidad completo de una estrategia: Strategy → QSPM → CAME → Cruce DAFO → Factores → Evidencia Documental → Fuente.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        strategy_id: { type: 'string', description: 'El ID o nombre de la estrategia.' }
      },
      required: ['investigation_id', 'strategy_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Reconstruye el árbol de trazabilidad completo de una estrategia: Strategy → QSPM → CAME → Cruce DAFO → Factores → Evidencia Documental → Fuente.',
      inputSchema: traceStrategySchema,
      execute: async (args: TraceStrategyInput) => {
        const res = await executeTraceStrategy(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
