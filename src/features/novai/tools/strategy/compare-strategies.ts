import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState, Strategy } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const compareStrategiesSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación.'),
  strategy_ids: z.array(z.string()).optional().describe('Lista opcional de IDs o nombres de estrategias a comparar. Si se omite, se compararán todas las estrategias registradas.')
})

export type CompareStrategiesInput = z.infer<typeof compareStrategiesSchema>

export async function executeCompareStrategies(
  args: CompareStrategiesInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()

    if (!id) {
      return { toolName: 'compare_strategies', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'compare_strategies',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const strategies = Array.isArray(state?.strategies) ? state.strategies : []
    const cameActions = Array.isArray(state?.cameActions) ? state.cameActions : []
    const qspmScores = state?.qspmScores || {}

    let targetStrategies: Strategy[] = []

    if (args.strategy_ids && args.strategy_ids.length > 0) {
      targetStrategies = strategies.filter(s =>
        args.strategy_ids?.some(query => s.id === query || s.name.toLowerCase().includes(query.toLowerCase()))
      )
    } else {
      targetStrategies = strategies
    }

    if (targetStrategies.length < 2) {
      return {
        toolName: 'compare_strategies',
        success: true,
        result: {
          investigationId: row.id,
          message: 'Se requieren al menos 2 estrategias formuladas en la investigación para realizar una comparación multicriterio.',
          totalStrategiesFound: targetStrategies.length,
          strategies: targetStrategies
        }
      }
    }

    // Análisis comparativo estructurado
    const comparisons = targetStrategies.map(s => {
      const actions = cameActions.filter(a => a.strategyId === s.id || a.action.toLowerCase().includes(s.name.toLowerCase()))
      const qspmForStrat = qspmScores[s.id] || {}
      const qspmValues = Object.values(qspmForStrat).filter(v => typeof v === 'number') as number[]
      const averageAttractiveness = qspmValues.length > 0
        ? Number((qspmValues.reduce((acc, v) => acc + v, 0) / qspmValues.length).toFixed(2))
        : null

      return {
        id: s.id,
        name: s.name,
        quadrant: s.quadrant,
        orientation: s.orientation,
        factorsAddressedCount: (s.relatedFactors || []).length,
        factorsAddressed: s.relatedFactors || [],
        cameActionsCount: actions.length,
        cameActionsPlanned: actions.map(a => a.action),
        averageAttractivenessScore: averageAttractiveness,
        description: s.description,
        strategicFit: s.quadrant === 'FO' ? 'Crecimiento y Expansión' : s.quadrant === 'DA' ? 'Supervivencia y Mitigación Crítica' : s.quadrant === 'DO' ? 'Reorientación Operativa' : 'Defensiva'
      }
    })

    return {
      toolName: 'compare_strategies',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        totalCompared: comparisons.length,
        selectedStrategyId: state.selectedStrategyId,
        comparisons,
        analysisSummary: 'La comparación evalúa orientación estratégica (FO/DO/FA/DA), cobertura de factores críticos, volumen de acciones CAME y calificación de atractivo QSPM.'
      }
    }
  } catch (err) {
    return {
      toolName: 'compare_strategies',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const compareStrategiesTool: NovaiModularTool = {
  metadata: {
    name: 'compare_strategies',
    displayName: 'Comparar Estrategias Formuladas',
    description:
      'Compara dos o más alternativas estratégicas evaluando orientación (FO/DO/FA/DA), cobertura de factores, atractivo QSPM y viabilidad operativa en CAME.',
    category: 'platform',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: compareStrategiesSchema,
  execute: executeCompareStrategies,
  openAiDeclaration: {
    name: 'compare_strategies',
    description:
      'Compara dos o más alternativas estratégicas evaluando orientación (FO/DO/FA/DA), cobertura de factores, atractivo QSPM y viabilidad operativa en CAME.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        strategy_ids: { type: 'array', items: { type: 'string' }, description: 'IDs de las estrategias a comparar.' }
      },
      required: ['investigation_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Compara dos o más alternativas estratégicas evaluando orientación (FO/DO/FA/DA), cobertura de factores, atractivo QSPM y viabilidad operativa en CAME.',
      inputSchema: compareStrategiesSchema,
      execute: async (args: CompareStrategiesInput) => {
        const res = await executeCompareStrategies(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
