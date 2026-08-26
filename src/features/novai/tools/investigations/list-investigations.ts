import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { listInvestigationMetadata } from '@/lib/investigations/repository'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const listInvestigationsSchema = z.object({
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional().describe('Filtrar investigaciones por estado operativo.'),
  search: z.string().optional().describe('Texto de búsqueda para filtrar por título u organización.'),
  limit: z.number().int().min(1).max(25).optional().describe('Número máximo de investigaciones a retornar (por defecto 10).')
})

export type ListInvestigationsInput = z.infer<typeof listInvestigationsSchema>

export async function executeListInvestigations(
  args: ListInvestigationsInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const status = args.status
    const search = typeof args.search === 'string' ? args.search.toLowerCase() : undefined
    const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 25) : 10

    const result = await listInvestigationMetadata(principal.client, {
      tenantId: principal.tenantId,
      page: 1,
      pageSize: limit,
      status,
      includeArchived: false
    })

    let items = result.items

    if (search) {
      items = items.filter(it => (it.title || '').toLowerCase().includes(search))
    }

    return {
      toolName: 'list_investigations',
      success: true,
      data: {
        totalAccessible: result.total,
        returnedCount: items.length,
        investigations: items.map(it => ({
          id: it.id,
          title: it.title,
          status: it.status,
          updatedAt: it.updated_at,
          createdAt: it.created_at,
          isLocked: it.is_locked,
          accessLevel: it.access_level
        }))
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'list_investigations',
      success: false,
      error: `Error listando investigaciones: ${errorMsg}`
    }
  }
}

export const listInvestigationsTool: NovaiModularTool<typeof listInvestigationsSchema> = {
  metadata: {
    name: 'list_investigations',
    label: 'Listar Investigaciones',
    description: 'Lista las investigaciones estratégicas activas y accesibles para el usuario en su espacio de trabajo / equipo actual.',
    category: 'investigations',
    riskLevel: 'low'
  },
  schema: listInvestigationsSchema,
  openAiDeclaration: {
    name: 'list_investigations',
    description: 'Lista las investigaciones estratégicas activas y accesibles para el usuario en su espacio de trabajo / equipo actual.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'in_progress', 'completed', 'archived'],
          description: 'Filtrar investigaciones por estado operativo (opcional).'
        },
        search: {
          type: 'string',
          description: 'Texto de búsqueda para filtrar por título u organización (opcional).'
        },
        limit: {
          type: 'integer',
          description: 'Número máximo de investigaciones a retornar (por defecto 10).'
        }
      }
    }
  },
  execute: executeListInvestigations,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Lista las investigaciones estratégicas activas y accesibles para el usuario en su espacio de trabajo.',
      inputSchema: listInvestigationsSchema,
      execute: async (args: ListInvestigationsInput) => {
        const res = await executeListInvestigations(args, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
