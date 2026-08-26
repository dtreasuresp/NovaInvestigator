import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getKanbanBoardSummarySchema = z.object({})

export type GetKanbanBoardSummaryInput = z.infer<typeof getKanbanBoardSummarySchema>

export async function executeGetKanbanBoardSummary(
  _args: GetKanbanBoardSummaryInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const generalClient = principal.client as unknown as {
      from: (table: string) => any
    }

    const { data: cols } = await generalClient
      .from('kanban_columns')
      .select('id, name, slug, position')
      .eq('tenant_id', principal.tenantId)
      .order('position', { ascending: true })

    const { data: tasks } = await generalClient
      .from('kanban_tasks')
      .select('id, column_id, priority, due_date')
      .eq('tenant_id', principal.tenantId)

    const colList = (cols || []) as Array<{ id: string; name: string; slug: string }>
    const taskList = (tasks || []) as Array<{ id: string; column_id: string; priority: string; due_date: string | null }>

    const colCounts: Record<string, number> = {}

    for (const col of colList) {
      colCounts[col.name] = taskList.filter(t => t.column_id === col.id).length
    }

    const urgentCount = taskList.filter(t => t.priority === 'urgent' || t.priority === 'high').length
    const now = new Date()
    const overdueCount = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length

    return {
      toolName: 'get_kanban_board_summary',
      success: true,
      data: {
        totalTasks: taskList.length,
        columnsSummary: colCounts,
        urgentOrHighPriority: urgentCount,
        overdueTasks: overdueCount
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'get_kanban_board_summary',
      success: false,
      error: `Error obteniendo resumen del tablero Kanban: ${errorMsg}`
    }
  }
}

export const getKanbanBoardSummaryTool: NovaiModularTool<typeof getKanbanBoardSummarySchema> = {
  metadata: {
    name: 'get_kanban_board_summary',
    label: 'Resumen Tablero Kanban',
    description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, tareas urgentes y vencidas).',
    category: 'kanban',
    riskLevel: 'low'
  },
  schema: getKanbanBoardSummarySchema,
  openAiDeclaration: {
    name: 'get_kanban_board_summary',
    description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, tareas urgentes y vencidas).',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  execute: executeGetKanbanBoardSummary,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, urgentes y vencidas).',
      inputSchema: getKanbanBoardSummarySchema,
      execute: async () => {
        const res = await executeGetKanbanBoardSummary({}, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
