import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { logger } from '@/lib/logger'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const listKanbanTasksSchema = z.object({
  column_slug: z.enum(['backlog', 'in_progress', 'review', 'done']).optional().describe('Filtrar tareas por columna.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Filtrar tareas por prioridad.'),
  limit: z.number().int().min(1).max(30).optional().describe('Número máximo de tareas a retornar (por defecto 15).')
})

export type ListKanbanTasksInput = z.infer<typeof listKanbanTasksSchema>

export async function executeListKanbanTasks(
  args: ListKanbanTasksInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const columnSlug = args.column_slug
    const priority = args.priority
    const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 30) : 15

    const generalClient = principal.client as unknown as {
      from: (table: string) => any
    }

    let query = generalClient
      .from('kanban_tasks')
      .select('id, title, description, priority, due_date, tags, position, column_id, created_at, updated_at')
      .eq('tenant_id', principal.tenantId)
      .order('position', { ascending: true })
      .limit(limit)

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: tasks, error: taskErr } = await query

    if (taskErr) {
      logger.warn('NovAi tool list_kanban_tasks query error', {
        action: 'novai.tool.kanban',
        details: { errorMessage: taskErr.message }
      })

      return { toolName: 'list_kanban_tasks', success: false, error: 'No se pudieron consultar las tareas de Kanban.' }
    }

    const { data: cols } = await generalClient
      .from('kanban_columns')
      .select('id, name, slug')
      .eq('tenant_id', principal.tenantId)

    const colList = (cols || []) as Array<{ id: string; name: string; slug: string }>
    const colMap = new Map(colList.map(c => [c.id, { name: c.name, slug: c.slug }]))

    const taskList = (tasks || []) as Array<{
      id: string
      title: string
      description: string | null
      priority: string
      due_date: string | null
      tags: string[] | null
      column_id: string
    }>

    let mappedTasks = taskList.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.due_date,
      tags: t.tags,
      column: colMap.get(t.column_id)?.name || 'Desconocida',
      columnSlug: colMap.get(t.column_id)?.slug || 'unknown'
    }))

    if (columnSlug) {
      mappedTasks = mappedTasks.filter(t => t.columnSlug === columnSlug)
    }

    return {
      toolName: 'list_kanban_tasks',
      success: true,
      data: {
        totalReturned: mappedTasks.length,
        tasks: mappedTasks
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'list_kanban_tasks',
      success: false,
      error: `Error listando tareas de Kanban: ${errorMsg}`
    }
  }
}

export const listKanbanTasksTool: NovaiModularTool<typeof listKanbanTasksSchema> = {
  metadata: {
    name: 'list_kanban_tasks',
    label: 'Listar Tareas Kanban',
    description: 'Lista las tareas y proyectos del tablero Kanban accesibles para el usuario, con sus columnas, prioridades y fechas límite.',
    category: 'kanban',
    riskLevel: 'low'
  },
  schema: listKanbanTasksSchema,
  openAiDeclaration: {
    name: 'list_kanban_tasks',
    description: 'Lista las tareas y proyectos del tablero Kanban accesibles para el usuario, con sus columnas, prioridades y fechas límite.',
    parameters: {
      type: 'object',
      properties: {
        column_slug: {
          type: 'string',
          enum: ['backlog', 'in_progress', 'review', 'done'],
          description: 'Filtrar tareas por columna (opcional).'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filtrar tareas por prioridad (opcional).'
        },
        limit: {
          type: 'integer',
          description: 'Número máximo de tareas a retornar (por defecto 15).'
        }
      }
    }
  },
  execute: executeListKanbanTasks,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Lista las tareas y proyectos del tablero Kanban accesibles para el usuario.',
      inputSchema: listKanbanTasksSchema,
      execute: async (args: ListKanbanTasksInput) => {
        const res = await executeListKanbanTasks(args, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
