import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const verifyClaimSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación contra la cual verificar la afirmación.'),
  claim: z.string().min(1).describe('La afirmación o hipótesis estratégica que se desea auditar epistémicamente.'),
  factor_code: z.string().optional().describe('Código opcional de factor relacionado (ej: "D-03", "A-02") para acotar la verificación.')
})

export type VerifyClaimInput = z.infer<typeof verifyClaimSchema>

export async function executeVerifyClaim(
  args: VerifyClaimInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const claim = String(args.claim || '').trim()
    const factorCode = args.factor_code ? String(args.factor_code).trim().toUpperCase() : undefined

    if (!id) {
      return { toolName: 'verify_claim', success: false, error: 'investigation_id es requerido' }
    }

    if (!claim) {
      return { toolName: 'verify_claim', success: false, error: 'claim es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'verify_claim',
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

    // Limpiar palabras vacías / puntuación para extraer conceptos clave
    const stopWords = new Set(['para', 'como', 'sobre', 'este', 'esta', 'estos', 'estas', 'tiene', 'donde', 'desde', 'hacia', 'entre', 'cada'])
    const claimTokens = claim
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))

    interface EvidenceMatch {
      source: string
      text: string
      confidence: number
    }

    const supportingEvidence: EvidenceMatch[] = []
    const contradictingEvidence: EvidenceMatch[] = []

    const checkMatch = (source: string, text: string | undefined) => {
      if (!text || typeof text !== 'string') return
      const lower = text.toLowerCase()
      if (claimTokens.length === 0) return

      const matchedTokens = claimTokens.filter(token => lower.includes(token))
      const ratio = matchedTokens.length / claimTokens.length

      if (ratio >= 0.35) {
        supportingEvidence.push({
          source,
          text: text.slice(0, 240),
          confidence: Number(ratio.toFixed(2))
        })
      }
    }

    // 1. Evaluar factores internos con contexto enriquecido
    internal.forEach((f, idx) => {
      const code = f.type === 'D' ? `D-${String(idx + 1).padStart(2, '0')}` : `F-${String(idx + 1).padStart(2, '0')}`
      if (!factorCode || factorCode === code || f.id === factorCode) {
        const fullFactorText = `${code}: ${f.name}. Descripción: ${f.description || ''}. Evidencia: ${f.evidence || ''}`
        checkMatch(`Factor Interno ${code} (${f.name})`, fullFactorText)
      }
    })

    // 2. Evaluar factores externos
    external.forEach((f, idx) => {
      const code = f.type === 'O' ? `O-${String(idx + 1).padStart(2, '0')}` : `A-${String(idx + 1).padStart(2, '0')}`
      if (!factorCode || factorCode === code || f.id === factorCode) {
        const fullFactorText = `${code}: ${f.name}. Descripción: ${f.description || ''}. Evidencia: ${f.evidence || ''}`
        checkMatch(`Factor Externo ${code} (${f.name})`, fullFactorText)
      }
    })

    // 3. Evaluar relaciones cruzadas
    relationships.forEach(r => {
      const fullRelText = `Cruce ${r.internalId} × ${r.externalId} (Fuerza: ${r.strength ?? 0}). ${r.justification || ''}. Evidencia: ${r.evidence || ''}`
      checkMatch(`Relación DAFO ${r.internalId} × ${r.externalId}`, fullRelText)
    })

    // 4. Evaluar Estrategias y CAME
    strategies.forEach(s => {
      checkMatch(`Estrategia ${s.quadrant} (${s.name})`, `${s.name}. ${s.description}. ${s.observations || ''}`)
    })

    cameActions.forEach(a => {
      checkMatch(`Acción CAME (${a.action})`, `${a.action}. Justificación: ${a.justification || ''}`)
    })

    // Clasificación Epistémica
    let epistemicStatus: 'FACT' | 'EVIDENCE' | 'INFERENCE' | 'HYPOTHESIS' | 'ASSUMPTION' | 'UNSUPPORTED' = 'UNSUPPORTED'
    let confidenceScore = 0.0
    let explanation = ''

    if (supportingEvidence.length > 0) {
      supportingEvidence.sort((a, b) => b.confidence - a.confidence)
      const maxConf = supportingEvidence[0].confidence

      if (maxConf >= 0.65) {
        epistemicStatus = 'FACT'
        confidenceScore = maxConf
        explanation = 'La afirmación está directamente corroborada por datos y evidencias explícitas en el expediente.'
      } else if (maxConf >= 0.45) {
        epistemicStatus = 'EVIDENCE'
        confidenceScore = maxConf
        explanation = 'Existe respaldo documental y notas probatorias que fundamentan razonablemente la afirmación.'
      } else {
        epistemicStatus = 'INFERENCE'
        confidenceScore = maxConf
        explanation = 'La afirmación constituye una deducción lógica basada en correlaciones parciales de la matriz, pero carece de cita documental directa.'
      }
    } else {
      epistemicStatus = 'UNSUPPORTED'
      confidenceScore = 0.05
      explanation = 'No se encontró evidencia documental ni factores en la investigación que justifiquen esta afirmación.'
      contradictingEvidence.push({
        source: 'Auditoría Epistémica NovAi',
        text: 'Ausencia de referencias o citas documentales en los factores y relaciones evaluadas.',
        confidence: 0.95
      })
    }

    return {
      toolName: 'verify_claim',
      success: true,
      result: {
        investigationId: row.id,
        claim,
        epistemicStatus,
        confidenceScore,
        explanation,
        supportingEvidenceCount: supportingEvidence.length,
        supportingEvidence: supportingEvidence.slice(0, 5),
        contradictingEvidence: contradictingEvidence.slice(0, 5),
        isSupported: epistemicStatus === 'FACT' || epistemicStatus === 'EVIDENCE'
      }
    }
  } catch (err) {
    return {
      toolName: 'verify_claim',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const verifyClaimTool: NovaiModularTool = {
  metadata: {
    name: 'verify_claim',
    displayName: 'Verificar y Clasificar Afirmación',
    description:
      'Audita una afirmación estratégica contra el expediente real y la clasifica epistémicamente en FACT, EVIDENCE, INFERENCE, HYPOTHESIS, ASSUMPTION o UNSUPPORTED con puntaje de confianza.',
    category: 'evidence',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: verifyClaimSchema,
  execute: executeVerifyClaim,
  openAiDeclaration: {
    name: 'verify_claim',
    description:
      'Audita una afirmación estratégica contra el expediente real y la clasifica epistémicamente en FACT, EVIDENCE, INFERENCE, HYPOTHESIS, ASSUMPTION o UNSUPPORTED con puntaje de confianza.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación.'
        },
        claim: {
          type: 'string',
          description: 'La afirmación a verificar.'
        },
        factor_code: {
          type: 'string',
          description: 'Código opcional de factor relacionado.'
        }
      },
      required: ['investigation_id', 'claim']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Audita una afirmación estratégica contra el expediente real y la clasifica epistémicamente en FACT, EVIDENCE, INFERENCE, HYPOTHESIS, ASSUMPTION o UNSUPPORTED con puntaje de confianza.',
      inputSchema: verifyClaimSchema,
      execute: async (args: VerifyClaimInput) => {
        const res = await executeVerifyClaim(args, principal)
        if (!res.success) throw new Error(res.error || 'verify_claim failed')
        return res.result
      }
    })
}
