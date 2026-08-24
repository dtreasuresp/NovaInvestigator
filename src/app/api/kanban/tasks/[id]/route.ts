import { NextResponse } from 'next/server'
import * as z from 'zod'

import { requireAuthenticatedUser, requireModuleAccess } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { asKanbanClient, type KanbanTaskRow } from '@/features/kanban/db-types'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const updateTaskSchema = z.object({
  columnId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  coverImage: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  cameActionId: z.string().optional().nullable(),
  position: z.number().int().optional()
})

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireAuthenticatedUser()
    await requireModuleAccess('kanban')
    const { id } = await context.params
    const body = parseWithSchema(updateTaskSchema, await readJsonBody(request))
    const supabase = await createSupabaseServerClient()
    const kanbanClient = asKanbanClient(supabase)

    if (!principal.primaryTenantId) {
      throw AuthError.primaryTenantUnavailable()
    }

    const tenantId = principal.primaryTenantId

    const updates: Partial<KanbanTaskRow> = {
      updated_at: new Date().toISOString()
    }

    if (body.columnId !== undefined) updates.column_id = body.columnId
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.coverImage !== undefined) updates.cover_image = body.coverImage
    if (body.assigneeIds !== undefined) updates.assignee_ids = body.assigneeIds
    if (body.dueDate !== undefined) updates.due_date = body.dueDate ? new Date(body.dueDate).toISOString() : null
    if (body.projectId !== undefined) updates.project_id = body.projectId
    if (body.cameActionId !== undefined) updates.came_action_id = body.cameActionId
    if (body.position !== undefined) updates.position = body.position

    const { data: updatedTask, error } = await kanbanClient
      .from('kanban_tasks')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (error) {
      logger.error('Error updating kanban task', { details: { error: error.message, taskId: id } })
      return NextResponse.json({ ok: false, message: 'Could not update task' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, task: updatedTask })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireAuthenticatedUser()
    await requireModuleAccess('kanban')
    const { id } = await context.params
    const supabase = await createSupabaseServerClient()
    const kanbanClient = asKanbanClient(supabase)

    if (!principal.primaryTenantId) {
      throw AuthError.primaryTenantUnavailable()
    }

    const { error } = await kanbanClient
      .from('kanban_tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', principal.primaryTenantId)

    if (error) {
      logger.error('Error deleting kanban task', { details: { error: error.message, taskId: id } })
      return NextResponse.json({ ok: false, message: 'Could not delete task' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Task deleted successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
