import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import { auditInvestigationConsistency } from '../../evidence-engine'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const challengeAnalysisSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a cuestionar críticamente.')
})

export type ChallengeAnalysisInput = z.infer<typeof challengeAnalysisSchema>

export async function executeChallengeAnalysis(
  args: ChallengeAnalysisInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()

    if (!id) {
      return { toolName: 'challenge_analysis', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'challenge_analysis',
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

    const calculated = calculateAnalysis(state)
    const audit = auditInvestigationConsistency(state)

    interface ChallengeFinding {
      area: 'bias' | 'blindspot' | 'overoptimism' | 'unmitigated_risk' | 'evidence_gap'
      severity: 'high' | 'medium' | 'low'
      title: string
      critique: string
      counterPerspective: string
      recommendation: string
    }

    const challenges: ChallengeFinding[] = []

    // 1. Detección de Sesgo de Sobre-Optimismo (Dominancia FO con amenazas críticas no atendidas)
    const highSeverityThreats = external.filter(f => f.type === 'A' && (f.weight || 0) >= 0.15)
    if (calculated.relations.dominant === 'FO' && highSeverityThreats.length > 0) {
      const threatsAddressed = strategies.some(s => s.quadrant === 'DA' || s.quadrant === 'FA')
      if (!threatsAddressed) {
        challenges.push({
          area: 'overoptimism',
          severity: 'high',
          title: 'Sesgo Ofensivo: Amenazas críticas externas desatendidas en la estrategia',
          critique: `La matriz arroja un cuadrante dominante FO (Ofensivo), pero existen ${highSeverityThreats.length} amenazas de alto impacto que no están siendo mitigadas con estrategias FA o DA.`,
          counterPerspective: 'Un crecimiento acelerado sin blindaje defensivo frente a competidores o regulación puede derivar en insolvencia operativa.',
          recommendation: 'Formular al menos una estrategia de contingencia DA/FA para cada amenaza con peso ≥ 0.15.'
        })
      }
    }

    // 2. Detección de Puntos Únicos de Fallo (Factores con peso desproporcionado)
    const dominantFactors = [...internal, ...external].filter(f => (f.weight || 0) >= 0.30)
    dominantFactors.forEach(f => {
      challenges.push({
        area: 'blindspot',
        severity: 'medium',
        title: `Punto Único de Fallo en Factor "${f.name}"`,
        critique: `El factor concentra ${(Number(f.weight) * 100).toFixed(0)}% del peso total. Cualquier variación en su evaluación distorsionará severamente toda la conclusión estratégica.`,
        counterPerspective: '¿Se ha sobrestimado este factor por eventos recientes o sesgo de disponibilidad?',
        recommendation: 'Desagregar este factor en componentes más específicos o justificar empíricamente su peso atípico.'
      })
    })

    // 3. Brecha de Evidencia en Factores Clave
    const keyFactorsWithoutEvidence = [...internal, ...external].filter(
      f => (f.weight || 0) >= 0.15 && (!f.evidence || f.evidence.trim().length < 15)
    )
    if (keyFactorsWithoutEvidence.length > 0) {
      challenges.push({
        area: 'evidence_gap',
        severity: 'high',
        title: 'Vulnerabilidad Epistémica: Factores de alto peso sin respaldo documental',
        critique: `${keyFactorsWithoutEvidence.length} factores con ponderación significativa carecen de citas documentales verificables (${keyFactorsWithoutEvidence.map(f => f.name).join(', ')}).`,
        counterPerspective: 'El diagnóstico podría estar sustentado en percepciones subjetivas del equipo evaluador en lugar de datos de mercado.',
        recommendation: 'Incorporar auditorías, estados financieros o estudios sectoriales que prueben estos factores.'
      })
    }

    // 4. Inacción Operativa en CAME
    const unaddressedWeaknesses = internal.filter(f => f.type === 'D' && (f.weight || 0) >= 0.15).filter(
      d => !cameActions.some(a => a.factorId === d.id || a.factor.toLowerCase().includes(d.name.toLowerCase()))
    )
    if (unaddressedWeaknesses.length > 0) {
      challenges.push({
        area: 'unmitigated_risk',
        severity: 'high',
        title: 'Brecha de Ejecución: Debilidades críticas sin plan de acción CAME',
        critique: `Existen debilidades mayores (${unaddressedWeaknesses.map(d => d.name).join(', ')}) sin acciones de corrección en el plan CAME.`,
        counterPerspective: 'Diagnosticar un problema sin asignar responsable ni presupuesto de mitigación es inútil estratégicamente.',
        recommendation: 'Definir acciones operativas tipo "Corregir (C)" en la matriz CAME para estas debilidades.'
      })
    }

    return {
      toolName: 'challenge_analysis',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        dominantQuadrant: calculated.relations.dominant,
        redTeamFindingsCount: challenges.length,
        criticalRisksCount: challenges.filter(c => c.severity === 'high').length,
        challenges,
        antiSycophancyNote: 'NovAi actúa aquí como analista crítico independiente (Red-Team), identificando vulnerabilidades y sesgos no evidentes en la formulación.'
      }
    }
  } catch (err) {
    return {
      toolName: 'challenge_analysis',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const challengeAnalysisTool: NovaiModularTool = {
  metadata: {
    name: 'challenge_analysis',
    displayName: 'Cuestionar Diagnóstico (Red-Team)',
    description:
      'Evalúa críticamente la investigación como auditor Red-Team: cuestiona sesgos de sobre-optimismo, identifica puntos únicos de fallo, amenazas no mitigadas y brechas de evidencia.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: challengeAnalysisSchema,
  execute: executeChallengeAnalysis,
  openAiDeclaration: {
    name: 'challenge_analysis',
    description:
      'Evalúa críticamente la investigación como auditor Red-Team: cuestiona sesgos de sobre-optimismo, identifica puntos únicos de fallo, amenazas no mitigadas y brechas de evidencia.',
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
        'Evalúa críticamente la investigación como auditor Red-Team: cuestiona sesgos de sobre-optimismo, identifica puntos únicos de fallo, amenazas no mitigadas y brechas de evidencia.',
      inputSchema: challengeAnalysisSchema,
      execute: async (args: ChallengeAnalysisInput) => {
        const res = await executeChallengeAnalysis(args, principal)
        if (!res.success) throw new Error(res.error || 'challenge_analysis failed')
        return res.result
      }
    })
}
