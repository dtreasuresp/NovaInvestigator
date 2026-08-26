import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { listInvestigationMetadata } from '@/lib/investigations/repository'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getInvestigationsStatsSchema = z.object({})

export type GetInvestigationsStatsInput = z.infer<typeof getInvestigationsStatsSchema>

export async function executeGetInvestigationsStats(
  _args: GetInvestigationsStatsInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const result = await listInvestigationMetadata(principal.client, {
      tenantId: principal.tenantId,
      page: 1,
      pageSize: 50,
      includeArchived: false
    })

    const byStatus: Record<string, number> = {}

    for (const it of result.items) {
      byStatus[it.status] = (byStatus[it.status] || 0) + 1
    }

    return {
      toolName: 'get_investigations_stats',
      success: true,
      data: {
        totalAccessibleInvestigations: result.total,
        statusDistribution: byStatus,
        recentTitles: result.items.slice(0, 5).map(it => ({ id: it.id, title: it.title, status: it.status }))
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'get_investigations_stats',
      success: false,
      error: `Error obteniendo estadísticas: ${errorMsg}`
    }
  }
}

export const getInvestigationsStatsTool: NovaiModularTool<typeof getInvestigationsStatsSchema> = {
  metadata: {
    name: 'get_investigations_stats',
    label: 'Estadísticas de Investigaciones',
    description: 'Obtiene estadísticas agregadas y métricas globales de las investigaciones accesibles para el usuario en el tenant.',
    category: 'investigations',
    riskLevel: 'low'
  },
  schema: getInvestigationsStatsSchema,
  openAiDeclaration: {
    name: 'get_investigations_stats',
    description: 'Obtiene estadísticas agregadas y métricas globales de las investigaciones accesibles para el usuario en el tenant.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  execute: executeGetInvestigationsStats,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Obtiene estadísticas agregadas y métricas globales de las investigaciones accesibles para el usuario en el tenant.',
      inputSchema: getInvestigationsStatsSchema,
      execute: async () => {
        const res = await executeGetInvestigationsStats({}, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
