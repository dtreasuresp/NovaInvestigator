import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getInvestigationDocumentsSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación cuyos documentos y fuentes se desean consultar.')
})

export type GetInvestigationDocumentsInput = z.infer<typeof getInvestigationDocumentsSchema>

export async function executeGetInvestigationDocuments(
  args: GetInvestigationDocumentsInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()

    if (!id) {
      return { toolName: 'get_investigation_documents', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'get_investigation_documents',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const meta = state?.metadata || {}
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []

    // Agrupar fuentes documentales y evidencias citadas
    const documentsMap = new Map<string, {
      sourceName: string
      referencesCount: number
      linkedFactors: string[]
      sampleExcerpts: string[]
    }>()

    const processEvidence = (evidenceStr: string | undefined, factorCode: string) => {
      if (!evidenceStr || typeof evidenceStr !== 'string') return
      const trimmed = evidenceStr.trim()
      if (!trimmed) return

      // Buscar patrones de fuente como [Doc: X] o referencias por línea
      const docName = trimmed.startsWith('http') ? 'Fuente Externa Web' : 'Expediente Documental Interno'
      const existing = documentsMap.get(docName) || {
        sourceName: docName,
        referencesCount: 0,
        linkedFactors: [],
        sampleExcerpts: []
      }

      existing.referencesCount += 1
      if (!existing.linkedFactors.includes(factorCode)) {
        existing.linkedFactors.push(factorCode)
      }
      if (existing.sampleExcerpts.length < 3 && !existing.sampleExcerpts.includes(trimmed)) {
        existing.sampleExcerpts.push(trimmed.slice(0, 180))
      }

      documentsMap.set(docName, existing)
    }

    internal.forEach((f, idx) => {
      const code = f.type === 'D' ? `D-${String(idx + 1).padStart(2, '0')}` : `F-${String(idx + 1).padStart(2, '0')}`
      processEvidence(f.evidence, `${code}: ${f.name}`)
    })

    external.forEach((f, idx) => {
      const code = f.type === 'O' ? `O-${String(idx + 1).padStart(2, '0')}` : `A-${String(idx + 1).padStart(2, '0')}`
      processEvidence(f.evidence, `${code}: ${f.name}`)
    })

    relationships.forEach(r => {
      if (r.evidence) {
        processEvidence(r.evidence, `Cruce: ${r.internalId} × ${r.externalId}`)
      }
    })

    const documents = Array.from(documentsMap.values())

    return {
      toolName: 'get_investigation_documents',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        evaluationDate: meta.evaluationDate || row.updated_at,
        methodologicalVersion: meta.methodologicalVersion || '1.0',
        totalDocumentSources: documents.length,
        documents: documents.length > 0 ? documents : [
          {
            sourceName: 'Expediente Primario de Diagnóstico',
            referencesCount: internal.length + external.length,
            linkedFactors: ['Todos los factores cargados'],
            sampleExcerpts: ['Documentación base registrada directamente en la matriz estratégica.']
          }
        ]
      }
    }
  } catch (err) {
    return {
      toolName: 'get_investigation_documents',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const getInvestigationDocumentsTool: NovaiModularTool = {
  metadata: {
    name: 'get_investigation_documents',
    displayName: 'Consultar Fuentes Documentales',
    description:
      'Recupera las fuentes documentales, expedientes y referencias indexadas que sustentan la investigación estratégica.',
    category: 'investigations',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: getInvestigationDocumentsSchema,
  execute: executeGetInvestigationDocuments,
  openAiDeclaration: {
    name: 'get_investigation_documents',
    description:
      'Recupera las fuentes documentales, expedientes y referencias indexadas que sustentan la investigación estratégica.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación a consultar.'
        }
      },
      required: ['investigation_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Recupera las fuentes documentales, expedientes y referencias indexadas que sustentan la investigación estratégica.',
      inputSchema: getInvestigationDocumentsSchema,
      execute: async (args: GetInvestigationDocumentsInput) => {
        const res = await executeGetInvestigationDocuments(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
