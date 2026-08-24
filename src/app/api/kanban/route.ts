import { NextResponse } from 'next/server'
import * as z from 'zod'

import { requireAuthenticatedUser, requireModuleAccess } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { asKanbanClient } from '@/features/kanban/db-types'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const createColumnSchema = z.object({
  name: z.string().trim().min(1).max(50),
  position: z.number().int().optional()
})

export async function GET(request: Request) {
  try {
    const principal = await requireAuthenticatedUser()
    await requireModuleAccess('kanban')
    const supabase = await createSupabaseServerClient()
    const kanbanClient = asKanbanClient(supabase)

    if (!principal.primaryTenantId) {
      return NextResponse.json({ ok: true, columns: [], tasks: [], members: [], projects: [] })
    }

    const tenantId = principal.primaryTenantId

    // 1. Get or create default columns
    const { data: rawColumns, error: colError } = await kanbanClient
      .from('kanban_columns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })

    if (colError) {
      logger.error('Error loading kanban columns', { details: { error: colError.message } })
    }

    let columns = rawColumns ?? []

    if (columns.length === 0) {
      const defaultCols = [
        { tenant_id: tenantId, name: 'Backlog', slug: 'backlog', position: 0 },
        { tenant_id: tenantId, name: 'In Progress', slug: 'in_progress', position: 1 },
        { tenant_id: tenantId, name: 'Review', slug: 'review', position: 2 },
        { tenant_id: tenantId, name: 'Done', slug: 'done', position: 3 }
      ]

      const { data: insertedCols } = await kanbanClient
        .from('kanban_columns')
        .insert(defaultCols)
        .select('*')
        .order('position', { ascending: true })

      columns = insertedCols ?? []
    }

    // 2. Get tasks for the tenant
    const { data: tasks, error: tasksError } = await kanbanClient
      .from('kanban_tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })

    if (tasksError) {
      logger.error('Error loading kanban tasks', { details: { error: tasksError.message } })
    }

    // 3. Get tenant members for assignees list
    const { data: rawMemberships } = await supabase
      .from('memberships')
      .select('user_id, role_id, profiles(id, display_name, avatar_url, email)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    const memberships = (rawMemberships ?? []) as unknown as Array<{
      user_id: string
      role_id: string | null
      profiles: { id?: string; display_name?: string; avatar_url?: string; email?: string } | null
    }>

    const members = memberships.map(m => {
      const prof = m.profiles || {}
      const name = prof.display_name || prof.email?.split('@')[0] || 'Member'
      const initials = name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

      return {
        id: m.user_id,
        name,
        initials,
        avatar: prof.avatar_url ?? null,
        email: prof.email ?? '',
        role: m.role_id
      }
    })

    // 4. Get tenant investigations/projects
    const { data: rawInvestigations } = await supabase
      .from('investigations')
      .select('id, title, state, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    const investigations = (rawInvestigations ?? []) as unknown as Array<{
      id: string
      title: string | null
      state: unknown
      created_at: string
      updated_at: string
    }>

    const projects = investigations.map(inv => {
      const state = (inv.state ?? {}) as Record<string, unknown>
      const meta = (state.metadata ?? {}) as Record<string, unknown>

      return {
        id: inv.id,
        title: inv.title || (meta.organization as string) || 'Proyecto de Investigación',
        organization: (meta.organization as string) || 'Organización',
        status: (meta.status as string) || 'active'
      }
    })

    return NextResponse.json({
      ok: true,
      columns,
      tasks: tasks ?? [],
      members,
      projects
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireAuthenticatedUser()
    await requireModuleAccess('kanban')
    const body = parseWithSchema(createColumnSchema, await readJsonBody(request))
    const supabase = await createSupabaseServerClient()
    const kanbanClient = asKanbanClient(supabase)

    if (!principal.primaryTenantId) {
      throw AuthError.primaryTenantUnavailable()
    }

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')

    const { data: col, error } = await kanbanClient
      .from('kanban_columns')
      .insert({
        tenant_id: principal.primaryTenantId,
        name: body.name,
        slug,
        position: body.position ?? 99
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Error creating kanban column', { details: { error: error.message } })
      return NextResponse.json({ ok: false, message: 'Could not create column' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, column: col }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
