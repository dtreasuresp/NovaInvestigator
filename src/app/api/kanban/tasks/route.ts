import { NextResponse } from 'next/server'
import * as z from 'zod'

import { requireAuthenticatedUser, requireModuleAccess } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { asKanbanClient } from '@/features/kanban/db-types'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const createTaskSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  coverImage: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  cameActionId: z.string().optional().nullable()
})

export async function POST(request: Request) {
  try {
    const principal = await requireAuthenticatedUser()
    await requireModuleAccess('kanban')
    const body = parseWithSchema(createTaskSchema, await readJsonBody(request))
    const supabase = await createSupabaseServerClient()
    const kanbanClient = asKanbanClient(supabase)

    if (!principal.primaryTenantId) {
      throw AuthError.primaryTenantUnavailable()
    }

    const tenantId = principal.primaryTenantId

    // Determine highest position in column
    const { data: maxPosRow } = await kanbanClient
      .from('kanban_tasks')
      .select('position')
      .eq('tenant_id', tenantId)
      .eq('column_id', body.columnId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxPosRow?.position ?? -1) + 1

    const { data: task, error } = await kanbanClient
      .from('kanban_tasks')
      .insert({
        tenant_id: tenantId,
        column_id: body.columnId,
        title: body.title,
        description: body.description ?? '',
        priority: body.priority,
        cover_image: body.coverImage ?? null,
        assignee_ids: body.assigneeIds,
        due_date: body.dueDate ? new Date(body.dueDate).toISOString() : null,
        project_id: body.projectId ?? null,
        came_action_id: body.cameActionId ?? null,
        position: nextPosition,
        created_by: principal.userId
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Error creating kanban task', { details: { error: error.message } })
      return NextResponse.json({ ok: false, message: 'Could not create task' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, task }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
