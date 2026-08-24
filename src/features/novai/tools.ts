import { tool } from 'ai'
import { z } from 'zod'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { listInvestigationMetadata, getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import { getAiQuotaInfo } from './service'
import { logger } from '@/lib/logger'
import type { InvestigationState } from '@/types/apps/investigator-types'
import { auditInvestigationConsistency } from './evidence-engine'

// Declaraciones formales de herramientas para Gemini y proveedores compatibles con OpenAI
export const NOVAI_TOOL_DECLARATIONS = [
  {
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
  {
    name: 'get_investigation_details',
    description: 'Obtiene el expediente detallado de una investigación (diagnóstico, autor, factores EFI/EFE, matrices DAFO, estrategias QSPM y plan CAME) tras validar permisos ReBAC.',
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
  {
    name: 'get_investigations_stats',
    description: 'Obtiene estadísticas agregadas y métricas globales de las investigaciones accesibles para el usuario en el tenant.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
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
  {
    name: 'get_kanban_board_summary',
    description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, tareas urgentes y vencidas).',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_workspace_members_and_teams',
    description: 'Lista los equipos de trabajo (teams) y colaboradores del workspace a los que el usuario tiene visibilidad.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_tenant_billing_and_quota_info',
    description: 'Obtiene información sobre el plan contratado, módulos habilitados comercialmente y estado de cuotas de IA (mensual y diaria).',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
]

export const NOVAI_OPENAI_TOOLS = NOVAI_TOOL_DECLARATIONS.map(d => ({
  type: 'function' as const,
  function: {
    name: d.name,
    description: d.description,
    parameters: d.parameters
  }
}))

export interface OpenAiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolExecutionResult {
  toolName: string
  success: boolean
  data?: unknown
  error?: string
}

// Ejecutor server-side seguro bajo RLS y ReBAC
export async function executeNovaiTool(
  name: string,
  args: Record<string, unknown>,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  const client = principal.client
  
  const generalClient = client as unknown as {
    from: (table: string) => any
  }

  try {
    switch (name) {
      case 'list_investigations': {
        const status = typeof args.status === 'string' ? args.status : undefined
        const search = typeof args.search === 'string' ? args.search.toLowerCase() : undefined
        const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 25) : 10

        const result = await listInvestigationMetadata(client, {
          tenantId: principal.tenantId,
          page: 1,
          pageSize: limit,
          status,
          includeArchived: false
        })

        let items = result.items
        if (search) {
          items = items.filter(it =>
            (it.title || '').toLowerCase().includes(search)
          )
        }

        return {
          toolName: name,
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
      }

      case 'get_investigation_details': {
        const id = String(args.investigation_id || '').trim()
        if (!id) {
          return { toolName: name, success: false, error: 'investigation_id es requerido' }
        }

        const row = await getInvestigationById(client, principal.tenantId, id)
        if (!row) {
          return {
            toolName: name,
            success: false,
            error: 'La investigación no existe o no tienes permisos de acceso para consultarla (ReBAC).'
          }
        }

        const state = row.state as unknown as InvestigationState
        let analysisSummary: unknown = null
        let auditReport: unknown = null
        const meta = state?.metadata || {}

        if (state && Array.isArray(state.internal) && Array.isArray(state.external)) {
          const calculated = calculateAnalysis(state)
          const audit = auditInvestigationConsistency(state)
          auditReport = {
            hasCriticalContradictions: audit.hasCriticalContradictions,
            findingsCount: audit.findings.length,
            findings: audit.findings,
            suspiciousZeroCrossings: audit.suspiciousDafoCrossings
          }

          analysisSummary = {
            efiIndex: calculated.efi.total,
            efeIndex: calculated.efe.total,
            dominantQuadrant: calculated.relations.dominant,
            totalInternalFactors: state.internal.length,
            totalExternalFactors: state.external.length,
            totalStrategies: (state.strategies || []).length,
            totalCameActions: (calculated.came?.actions || []).length,
            selectedStrategy: state.strategies?.find(s => s.id === state.selectedStrategyId)?.name || null,
            internalFactors: state.internal.map(f => ({
              id: f.id,
              name: f.name,
              weight: f.weight,
              rating: f.rating,
              type: f.type,
              evidence: f.evidence || null
            })),
            externalFactors: state.external.map(f => ({
              id: f.id,
              name: f.name,
              weight: f.weight,
              rating: f.rating,
              type: f.type,
              evidence: f.evidence || null
            })),
            evaluatedRelationships: (state.relationships || []).map(r => ({
              internalId: r.internalId,
              externalId: r.externalId,
              quadrant: r.quadrant,
              strength: r.strength,
              justification: r.justification || null
            })),
            cameActions: (calculated.came?.actions || []).map(a => ({
              action: a.action,
              factor: a.factor,
              priority: a.priority,
              category: a.category
            }))
          }
        }

        return {
          toolName: name,
          success: true,
          data: {
            id: row.id,
            title: row.title,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            accessLevel: row.access_level,
            author: meta.author || null,
            organization: meta.organization || null,
            description: meta.problem || meta.objective || null,
            analysis: analysisSummary,
            audit: auditReport
          }
        }
      }

      case 'get_investigations_stats': {
        const result = await listInvestigationMetadata(client, {
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
          toolName: name,
          success: true,
          data: {
            totalAccessibleInvestigations: result.total,
            statusDistribution: byStatus,
            recentTitles: result.items.slice(0, 5).map(it => ({ id: it.id, title: it.title, status: it.status }))
          }
        }
      }

      case 'list_kanban_tasks': {
        const columnSlug = typeof args.column_slug === 'string' ? args.column_slug : undefined
        const priority = typeof args.priority === 'string' ? args.priority : undefined
        const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 30) : 15

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
          return { toolName: name, success: false, error: 'No se pudieron consultar las tareas de Kanban.' }
        }

        // Consultar nombres de columnas
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
          toolName: name,
          success: true,
          data: {
            totalReturned: mappedTasks.length,
            tasks: mappedTasks
          }
        }
      }

      case 'get_kanban_board_summary': {
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
          toolName: name,
          success: true,
          data: {
            totalTasks: taskList.length,
            columnsSummary: colCounts,
            urgentOrHighPriority: urgentCount,
            overdueTasks: overdueCount
          }
        }
      }

      case 'list_workspace_members_and_teams': {
        const { data: teams } = await generalClient
          .from('teams')
          .select('id, name, slug, description, created_at')
          .eq('tenant_id', principal.tenantId)

        const { data: members } = await generalClient
          .from('memberships')
          .select('user_id, role, status, created_at')
          .eq('tenant_id', principal.tenantId)
          .eq('status', 'active')

        return {
          toolName: name,
          success: true,
          data: {
            teams: teams || [],
            activeMembersCount: (members || []).length
          }
        }
      }

      case 'get_tenant_billing_and_quota_info': {
        const quota = await getAiQuotaInfo(principal)

        return {
          toolName: name,
          success: true,
          data: {
            isAllowed: quota.allowed,
            canUseFreeText: quota.canUseFreeText,
            monthlyLimit: quota.limitValue,
            monthlyRemaining: quota.remaining,
            dailyLimit: quota.dailyLimitValue,
            dailyRemaining: quota.dailyRemaining
          }
        }
      }

      default:
        return { toolName: name, success: false, error: `Herramienta desconocida: ${name}` }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.error('Error al ejecutar tool de NovAi', {
      action: 'novai.tool.execute',
      details: { toolName: name, errorMessage: errorMsg, tenantId: principal.tenantId }
    })

    return { toolName: name, success: false, error: errorMsg }
  }
}

/**
 * Adaptador de herramientas gobernadas para Vercel AI SDK Core (`ai`).
 */
export function getNovaiVercelTools(principal: InvestigationsPrincipal) {
  return {
    list_investigations: tool({
      description: 'Lista las investigaciones estratégicas activas y accesibles para el usuario en su espacio de trabajo.',
      inputSchema: z.object({
        status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(25).optional()
      }),
      execute: async (args: { status?: 'draft' | 'in_progress' | 'completed' | 'archived'; search?: string; limit?: number }) => {
        const res = await executeNovaiTool('list_investigations', args, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    get_investigation_details: tool({
      description: 'Obtiene el expediente detallado de una investigación (diagnóstico, factores EFI/EFE, matrices DAFO, estrategias QSPM y plan CAME) tras validar permisos ReBAC.',
      inputSchema: z.object({
        investigation_id: z.string().describe('El ID único (UUID) de la investigación a consultar.')
      }),
      execute: async (args: { investigation_id: string }) => {
        const res = await executeNovaiTool('get_investigation_details', args, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    get_investigations_stats: tool({
      description: 'Obtiene estadísticas agregadas y métricas globales de las investigaciones accesibles para el usuario en el tenant.',
      inputSchema: z.object({}),
      execute: async () => {
        const res = await executeNovaiTool('get_investigations_stats', {}, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    list_kanban_tasks: tool({
      description: 'Lista las tareas y proyectos del tablero Kanban accesibles para el usuario.',
      inputSchema: z.object({
        column_slug: z.enum(['backlog', 'in_progress', 'review', 'done']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        limit: z.number().int().min(1).max(25).optional()
      }),
      execute: async (args: { column_slug?: 'backlog' | 'in_progress' | 'review' | 'done'; priority?: 'low' | 'medium' | 'high' | 'urgent'; limit?: number }) => {
        const res = await executeNovaiTool('list_kanban_tasks', args, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    get_kanban_board_summary: tool({
      description: 'Obtiene una radiografía ejecutiva del tablero Kanban (total de tareas por columna, urgentes y vencidas).',
      inputSchema: z.object({}),
      execute: async () => {
        const res = await executeNovaiTool('get_kanban_board_summary', {}, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    list_workspace_members_and_teams: tool({
      description: 'Lista los equipos de trabajo (teams) y colaboradores del workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        const res = await executeNovaiTool('list_workspace_members_and_teams', {}, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    }),
    get_tenant_billing_and_quota_info: tool({
      description: 'Obtiene información sobre el plan contratado, módulos habilitados y estado de cuotas de IA.',
      inputSchema: z.object({}),
      execute: async () => {
        const res = await executeNovaiTool('get_tenant_billing_and_quota_info', {}, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
  }
}

