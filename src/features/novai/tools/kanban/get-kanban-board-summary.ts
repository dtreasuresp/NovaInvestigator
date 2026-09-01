import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getKanbanBoardSummarySchema = z.object({
  projectId: z.string().uuid().optional().describe('ID opcional del proyecto o investigación estratégica para obtener el resumen contextualizado.'),
  investigationId: z.string().uuid().optional().describe('ID opcional de la investigación estratégica asociada.')
})

export type GetKanbanBoardSummaryInput = z.infer<typeof getKanbanBoardSummarySchema>

export async function executeGetKanbanBoardSummary(
  args: GetKanbanBoardSummaryInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const generalClient = principal.client as unknown as {
      from: (table: string) => any
    }

    const targetContextId = args.projectId || args.investigationId

    const { data: cols } = await generalClient
      .from('kanban_columns')
      .select('id, name, slug, position')
      .eq('tenant_id', principal.tenantId)
      .order('position', { ascending: true })

    let taskQuery = generalClient
      .from('kanban_tasks')
      .select('id, column_id, priority, due_date, came_action_id, budget_amount, assignee_ids, project_id')
      .eq('tenant_id', principal.tenantId)

    if (targetContextId) {
      taskQuery = taskQuery.eq('project_id', targetContextId)
    }

    const { data: tasks } = await taskQuery

    const colList = (cols || []) as Array<{ id: string; name: string; slug: string }>
    const taskList = (tasks || []) as Array<{
      id: string
      column_id: string
      priority: string
      due_date: string | null
      came_action_id: string | null
      budget_amount: number | null
      assignee_ids: string[] | null
    }>

    const colCounts: Record<string, number> = {}

    for (const col of colList) {
      colCounts[col.name] = taskList.filter(t => t.column_id === col.id).length
    }

    const urgentCount = taskList.filter(t => t.priority === 'urgent' || t.priority === 'high').length
    const now = new Date()
    const overdueCount = taskList.filter(t => t.due_date && new Date(t.due_date) < now).length
    const unassignedCount = taskList.filter(t => !t.assignee_ids || t.assignee_ids.length === 0).length
    const totalBudget = taskList.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)

    // Calculate CAME coverage if context is provided
    let cameCoverageInfo: { totalCameActions?: number; coveredCameActions?: number; coveragePercent?: number } | undefined

    if (targetContextId) {
      // Check investigation state for cameActions
      const { data: inv } = await generalClient
        .from('investigations')
        .select('state')
        .eq('id', targetContextId)
        .eq('tenant_id', principal.tenantId)
        .maybeSingle()

      if (inv && inv.state) {
        const cameActions = (inv.state.cameActions || []) as Array<{ id: string }>
        const totalCame = cameActions.length
        const coveredCameSet = new Set(taskList.map(t => t.came_action_id).filter(Boolean))
        const coveredCount = cameActions.filter(a => coveredCameSet.has(a.id)).length
        const percent = totalCame > 0 ? Math.round((coveredCount / totalCame) * 100) : 0

        cameCoverageInfo = {
          totalCameActions: totalCame,
          coveredCameActions: coveredCount,
          coveragePercent: percent
        }
      }
    }

    return {
      toolName: 'get_kanban_board_summary',
      success: true,
      data: {
        contextId: targetContextId || 'all',
        totalTasks: taskList.length,
        columnsSummary: colCounts,
        urgentOrHighPriority: urgentCount,
        overdueTasks: overdueCount,
        unassignedTasks: unassignedCount,
        totalAllocatedBudget: totalBudget,
        ...(cameCoverageInfo ? { cameStrategicCoverage: cameCoverageInfo } : {})
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
    description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, tareas urgentes, vencidas, presupuesto y cobertura estratégica CAME).',
    category: 'kanban',
    riskLevel: 'low'
  },
  schema: getKanbanBoardSummarySchema,
  openAiDeclaration: {
    name: 'get_kanban_board_summary',
    description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, urgentes, vencidas, presupuesto y cobertura estratégica CAME).',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID opcional del proyecto o investigación estratégica para filtrar el resumen.'
        },
        investigationId: {
          type: 'string',
          description: 'ID opcional de la investigación asociada para contextualizar.'
        }
      }
    }
  },
  execute: executeGetKanbanBoardSummary,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, urgentes, vencidas, presupuesto y cobertura CAME).',
      inputSchema: getKanbanBoardSummarySchema,
      execute: async (args: GetKanbanBoardSummaryInput) => {
        const res = await executeGetKanbanBoardSummary(args, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
