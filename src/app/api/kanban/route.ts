import { NextResponse } from 'next/server'
import * as z from 'zod'

import { requireAuthenticatedUser, requireModuleAccess } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
    const admin = createSupabaseAdminClient()

    const { data: rawMemberships } = await admin
      .from('memberships')
      .select('user_id, role_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    const membershipUserIds = Array.from(
      new Set([...(rawMemberships ?? []).map(m => m.user_id), principal.userId])
    )

    const [rawProfilesRes, rawRolesRes, rawUsersRes] = await Promise.all([
      admin.from('profiles').select('id, display_name, avatar_url').in('id', membershipUserIds),
      admin.from('roles').select('id, key, name'),
      Promise.all(
        membershipUserIds.map(async uid => {
          try {
            const { data } = await admin.auth.admin.getUserById(uid)
            return {
              id: uid,
              email: data.user?.email ?? null,
              meta: (data.user?.user_metadata as Record<string, unknown> | null) ?? null
            }
          } catch {
            return { id: uid, email: null, meta: null }
          }
        })
      )
    ])

    const profileMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>()
    ;(rawProfilesRes.data ?? []).forEach(p => profileMap.set(p.id, p))

    const roleMap = new Map<string, { key: string; name: string }>()
    ;(rawRolesRes.data ?? []).forEach(r => roleMap.set(r.id, { key: r.key, name: r.name }))

    const userAuthMap = new Map<string, { email: string | null; meta: Record<string, unknown> | null }>()
    rawUsersRes.forEach(u => userAuthMap.set(u.id, { email: u.email, meta: u.meta }))

    const membershipRoleMap = new Map<string, string>()
    ;(rawMemberships ?? []).forEach(m => membershipRoleMap.set(m.user_id, m.role_id))

    const members = membershipUserIds.map(userId => {
      const prof = profileMap.get(userId)
      const roleId = membershipRoleMap.get(userId)
      const roleInfo = roleId ? roleMap.get(roleId) : null
      const isCurrentPrincipal = userId === principal.userId
      const authInfo = userAuthMap.get(userId)
      const email = authInfo?.email || (isCurrentPrincipal ? principal.email ?? '' : '')
      const meta = authInfo?.meta

      const metaFullName =
        meta?.firstName && meta?.lastName
          ? `${String(meta.firstName).trim()} ${String(meta.lastName).trim()}`
          : meta?.full_name && meta.full_name !== 'dtreasuresp'
            ? String(meta.full_name).trim()
            : meta?.name
              ? String(meta.name).trim()
              : null

      const candidateName =
        prof?.display_name?.trim() ||
        metaFullName ||
        (email ? email.split('@')[0] : null) ||
        (isCurrentPrincipal ? 'Mi Usuario' : 'Miembro')

      const name = candidateName.trim()
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'U'

      const roleKey = roleInfo?.key || (isCurrentPrincipal ? 'owner' : 'member')
      const roleName = roleInfo?.name || (isCurrentPrincipal ? 'Owner' : 'Miembro')

      return {
        id: userId,
        name,
        initials,
        avatar: prof?.avatar_url ?? null,
        email,
        role: roleKey,
        roleName
      }
    })

    // 4. Get tenant projects from projects table
    const { data: rawRealProjects } = await supabase
      .from('projects')
      .select('id, name, description, priority, status, investigation_id, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    let projects: Array<{ id: string; title: string; organization: string; status: string; investigationId?: string | null }> = []

    if (rawRealProjects && rawRealProjects.length > 0) {
      projects = (rawRealProjects as unknown as Array<{ id: string; name: string; description: string; status: string; investigation_id: string | null }>).map(p => ({
        id: p.id,
        title: p.name,
        organization: p.description || 'Proyecto',
        status: p.status,
        investigationId: p.investigation_id
      }))
    } else {
      // Fallback: Get tenant investigations
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

      projects = investigations.map(inv => {
        const state = (inv.state ?? {}) as Record<string, unknown>
        const meta = (state.metadata ?? {}) as Record<string, unknown>

        return {
          id: inv.id,
          title: inv.title || (meta.organization as string) || 'Proyecto de Investigación',
          organization: (meta.organization as string) || 'Organización',
          status: (meta.status as string) || 'active',
          investigationId: inv.id
        }
      })
    }

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
