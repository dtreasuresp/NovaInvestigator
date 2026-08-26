import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const searchEvidenceSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación donde buscar evidencia.'),
  query: z.string().min(1).describe('El término de búsqueda, palabra clave o concepto a rastrear en las evidencias documentales.'),
  factor_type: z.enum(['ALL', 'D', 'F', 'O', 'A']).optional().default('ALL').describe('Filtrar por tipo de factor: D (Debilidades), F (Fortalezas), O (Oportunidades), A (Amenazas) o ALL.')
})

export type SearchEvidenceInput = z.infer<typeof searchEvidenceSchema>

export async function executeSearchEvidence(
  args: SearchEvidenceInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const query = String(args.query || '').trim().toLowerCase()
    const factorType = args.factor_type || 'ALL'

    if (!id) {
      return { toolName: 'search_evidence', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'search_evidence',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []
    const cameActions = Array.isArray(state?.cameActions) ? state.cameActions : []

    interface MatchItem {
      category: 'factor' | 'relationship' | 'came_action'
      code: string
      title: string
      matchedField: string
      snippet: string
      relevanceScore: number
      evidenceText: string
    }

    const matches: MatchItem[] = []

    const testMatch = (text: string | undefined): { isMatch: boolean; snippet: string } => {
      if (!text || typeof text !== 'string') return { isMatch: false, snippet: '' }
      const lower = text.toLowerCase()
      const idx = lower.indexOf(query)
      if (idx === -1) return { isMatch: false, snippet: '' }

      const start = Math.max(0, idx - 40)
      const end = Math.min(text.length, idx + query.length + 60)
      const snippet = (start > 0 ? '...' : '') + text.slice(start, end).trim() + (end < text.length ? '...' : '')
      return { isMatch: true, snippet }
    }

    // 1. Factores internos
    if (factorType === 'ALL' || factorType === 'D' || factorType === 'F') {
      internal.forEach((f, idx) => {
        if (factorType !== 'ALL' && f.type !== factorType) return
        const code = f.type === 'D' ? `D-${String(idx + 1).padStart(2, '0')}` : `F-${String(idx + 1).padStart(2, '0')}`

        const evMatch = testMatch(f.evidence)
        if (evMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'evidence',
            snippet: evMatch.snippet,
            relevanceScore: 0.95,
            evidenceText: f.evidence || ''
          })
          return
        }

        const descMatch = testMatch(f.description)
        if (descMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'description',
            snippet: descMatch.snippet,
            relevanceScore: 0.8,
            evidenceText: f.evidence || f.description || ''
          })
          return
        }

        const nameMatch = testMatch(f.name)
        if (nameMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'name',
            snippet: f.name,
            relevanceScore: 0.7,
            evidenceText: f.evidence || ''
          })
        }
      })
    }

    // 2. Factores externos
    if (factorType === 'ALL' || factorType === 'O' || factorType === 'A') {
      external.forEach((f, idx) => {
        if (factorType !== 'ALL' && f.type !== factorType) return
        const code = f.type === 'O' ? `O-${String(idx + 1).padStart(2, '0')}` : `A-${String(idx + 1).padStart(2, '0')}`

        const evMatch = testMatch(f.evidence)
        if (evMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'evidence',
            snippet: evMatch.snippet,
            relevanceScore: 0.95,
            evidenceText: f.evidence || ''
          })
          return
        }

        const descMatch = testMatch(f.description)
        if (descMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'description',
            snippet: descMatch.snippet,
            relevanceScore: 0.8,
            evidenceText: f.evidence || f.description || ''
          })
          return
        }

        const nameMatch = testMatch(f.name)
        if (nameMatch.isMatch) {
          matches.push({
            category: 'factor',
            code,
            title: f.name,
            matchedField: 'name',
            snippet: f.name,
            relevanceScore: 0.7,
            evidenceText: f.evidence || ''
          })
        }
      })
    }

    // 3. Relaciones DAFO
    relationships.forEach(r => {
      const evMatch = testMatch(r.evidence)
      const justMatch = testMatch(r.justification)

      if (evMatch.isMatch || justMatch.isMatch) {
        matches.push({
          category: 'relationship',
          code: `${r.internalId} × ${r.externalId}`,
          title: `Relación ${r.quadrant || ''} (Fuerza: ${r.strength ?? 'N/A'})`,
          matchedField: evMatch.isMatch ? 'evidence' : 'justification',
          snippet: evMatch.isMatch ? evMatch.snippet : justMatch.snippet,
          relevanceScore: 0.85,
          evidenceText: r.evidence || r.justification || ''
        })
      }
    })

    // 4. Acciones CAME
    cameActions.forEach(a => {
      const actMatch = testMatch(a.action)
      const justMatch = testMatch(a.justification)

      if (actMatch.isMatch || justMatch.isMatch) {
        matches.push({
          category: 'came_action',
          code: `CAME-${a.type}`,
          title: a.action,
          matchedField: actMatch.isMatch ? 'action' : 'justification',
          snippet: actMatch.isMatch ? actMatch.snippet : justMatch.snippet,
          relevanceScore: 0.75,
          evidenceText: a.justification || a.observations || ''
        })
      }
    })

    matches.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return {
      toolName: 'search_evidence',
      success: true,
      result: {
        investigationId: row.id,
        query,
        totalMatches: matches.length,
        results: matches.slice(0, 10)
      }
    }
  } catch (err) {
    return {
      toolName: 'search_evidence',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const searchEvidenceTool: NovaiModularTool = {
  metadata: {
    name: 'search_evidence',
    displayName: 'Buscar Evidencia Indexada',
    description:
      'Busca evidencia documental, citas, descripciones y justificaciones indexadas en la investigación que coincidan con una consulta o término clave.',
    category: 'evidence',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: searchEvidenceSchema,
  execute: executeSearchEvidence,
  openAiDeclaration: {
    name: 'search_evidence',
    description:
      'Busca evidencia documental, citas, descripciones y justificaciones indexadas en la investigación que coincidan con una consulta o término clave.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación.'
        },
        query: {
          type: 'string',
          description: 'El término de búsqueda o palabra clave.'
        },
        factor_type: {
          type: 'string',
          enum: ['ALL', 'D', 'F', 'O', 'A'],
          description: 'Filtrar por tipo de factor.'
        }
      },
      required: ['investigation_id', 'query']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Busca evidencia documental, citas, descripciones y justificaciones indexadas en la investigación que coincidan con una consulta o término clave.',
      inputSchema: searchEvidenceSchema,
      execute: async (args: SearchEvidenceInput) => {
        const res = await executeSearchEvidence(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
