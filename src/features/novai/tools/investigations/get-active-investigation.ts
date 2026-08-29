import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById, listInvestigationMetadata } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getActiveInvestigationSchema = z.object({
  investigation_id: z
    .string()
    .optional()
    .describe('El ID único (UUID) de la investigación activa si se conoce del contexto. Si no se pasa, se resolverá la investigación activa más reciente.')
})

export type GetActiveInvestigationInput = z.infer<typeof getActiveInvestigationSchema>

export async function executeGetActiveInvestigation(
  args: GetActiveInvestigationInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    let investigationId = String(args.investigation_id || '').trim()

    // Si no se proporcionó ID, resolver la más reciente del tenant bajo RLS
    if (!investigationId) {
      const list = await listInvestigationMetadata(principal.client, {
        tenantId: principal.tenantId,
        page: 1,
        pageSize: 5,
        includeArchived: false
      })

      if (!list.items || list.items.length === 0) {
        return {
          toolName: 'get_active_investigation',
          success: true,
          result: {
            hasActiveInvestigation: false,
            message: 'No existen investigaciones activas en el espacio de trabajo del tenant.',
            candidates: []
          }
        }
      }

      investigationId = list.items[0].id
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, investigationId)

    if (!row) {
      return {
        toolName: 'get_active_investigation',
        success: false,
        error: `No se encontró la investigación con ID ${investigationId} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const meta = state?.metadata || {}
    const internal = Array.isArray(state?.internal) ? state.internal : []
    const external = Array.isArray(state?.external) ? state.external : []
    const relationships = Array.isArray(state?.relationships) ? state.relationships : []
    const strategies = Array.isArray(state?.strategies) ? state.strategies : []
    const cameActions = Array.isArray(state?.cameActions) ? state.cameActions : []

    let calculatedSummary: unknown = null

    if (internal.length > 0 || external.length > 0) {
      try {
        const calculated = calculateAnalysis(state)
        calculatedSummary = {
          efiTotal: calculated.efi.total,
          efeTotal: calculated.efe.total,
          dominantQuadrant: calculated.relations.dominant
        }
      } catch {
        // ignore math calculation on incomplete drafts
      }
    }

    const result = {
      hasActiveInvestigation: true,
      investigationId: row.id,
      title: row.title,
      status: row.status,
      ownerId: row.owner_id,
      version: row.version,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      problem: meta.problem || '',
      objective: meta.objective || '',
      assumptions: meta.assumptions || '',
      counts: {
        weaknesses: internal.filter(f => f.type === 'D').length,
        strengths: internal.filter(f => f.type === 'F').length,
        opportunities: external.filter(f => f.type === 'O').length,
        threats: external.filter(f => f.type === 'A').length,
        totalInternal: internal.length,
        totalExternal: external.length,
        totalRelationships: relationships.length,
        totalStrategies: strategies.length,
        totalCameActions: cameActions.length
      },
      calculatedSummary
    }

    return {
      toolName: 'get_active_investigation',
      success: true,
      result
    }
  } catch (err) {
    return {
      toolName: 'get_active_investigation',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const getActiveInvestigationTool: NovaiModularTool = {
  metadata: {
    name: 'get_active_investigation',
    displayName: 'Determinar Investigación Activa',
    description:
      'Identifica y recupera deterministamente la investigación estratégica activa en el contexto del usuario dentro del tenant autenticado. Úsala para fijar el expediente bajo análisis antes de responder preguntas sobre matrices, factores o estrategias.',
    category: 'investigations',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: getActiveInvestigationSchema,
  execute: executeGetActiveInvestigation,
  openAiDeclaration: {
    name: 'get_active_investigation',
    description:
      'Identifica y recupera deterministamente la investigación estratégica activa en el contexto del usuario dentro del tenant autenticado.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: {
          type: 'string',
          description: 'El ID único (UUID) de la investigación activa si se conoce del contexto.'
        }
      },
      required: []
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Identifica y recupera deterministamente la investigación estratégica activa en el contexto del usuario dentro del tenant autenticado.',
      inputSchema: getActiveInvestigationSchema,
      execute: async (args: GetActiveInvestigationInput) => {
        const res = await executeGetActiveInvestigation(args, principal)
        if (!res.success) throw new Error(res.error || 'get_active_investigation failed')
        return res.result
      }
    })
}
