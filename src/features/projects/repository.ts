import { createSupabaseServerClient } from '@/lib/supabase/server'
import { asProjectsClient, type ProjectRow, type ProjectMemberRow, type ProjectCameActionRow } from './db-types'
import { asKanbanClient, type KanbanDatabase } from '@/features/kanban/db-types'
import type { CreateProjectInput, UpdateProjectInput, ProjectFilterInput } from './schema'
import { ProjectError } from './errors'
import { logger } from '@/lib/logger'

export interface ProjectWithStats extends ProjectRow {
  membersCount: number
  cameActionsCount: number
  tasksTotal: number
  tasksCompleted: number
  tasksInProgress: number
  progressPercentage: number
  budgetAllocated: number
}

export interface ProjectDetail extends ProjectRow {
  members: Array<ProjectMemberRow & { profile?: { displayName?: string; email?: string; avatarUrl?: string | null } }>
  cameActions: ProjectCameActionRow[]
  tasks: Array<{
    id: string
    title: string
    description: string
    priority: string
    dueDate: string | null
    assigneeIds: string[]
    cameActionId: string | null
    budgetAmount: number
    columnId: string
    status?: string
  }>
  progressPercentage: number
}

export async function listProjectsByTenant(
  tenantId: string,
  filters?: ProjectFilterInput
): Promise<ProjectWithStats[]> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)

  let query = projectsClient
    .from('projects')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filters?.investigationId) {
    query = query.eq('investigation_id', filters.investigationId)
  }
  if (filters?.teamId) {
    query = query.eq('team_id', filters.teamId)
  }
  if (filters?.workspaceId) {
    query = query.eq('workspace_id', filters.workspaceId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data: rawProjects, error } = await query

  if (error) {
    logger.error('Error fetching projects', { details: { error: error.message, tenantId } })
    throw ProjectError.internal({ message: error.message })
  }

  const projects = rawProjects ?? []
  if (projects.length === 0) return []

  const projectIds = projects.map(p => p.id)

  // Fetch tasks stats for all retrieved projects
  const { data: rawTasks } = await supabase
    .from('kanban_tasks')
    .select('id, project_id, column_id, budget_amount, kanban_columns(slug)')
    .eq('tenant_id', tenantId)
    .in('project_id', projectIds)

  const tasks = (rawTasks ?? []) as unknown as Array<{
    id: string
    project_id: string | null
    column_id: string
    budget_amount: number | null
    kanban_columns: { slug?: string } | null
  }>

  // Fetch members count
  const { data: rawMembers } = await projectsClient
    .from('project_members')
    .select('project_id, id')
    .eq('tenant_id', tenantId)
    .in('project_id', projectIds)

  const members = (rawMembers ?? []) as unknown as Array<{
    project_id: string
    id: string
  }>

  // Fetch came actions count
  const { data: rawCameActions } = await projectsClient
    .from('project_came_actions')
    .select('project_id, id, budget_allocated')
    .eq('tenant_id', tenantId)
    .in('project_id', projectIds)

  const cameActions = (rawCameActions ?? []) as unknown as Array<{
    project_id: string
    id: string
    budget_allocated: number
  }>

  return projects.map(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id)
    const projectMembers = members.filter(m => m.project_id === project.id)
    const projectCameActions = cameActions.filter(c => c.project_id === project.id)

    const tasksTotal = projectTasks.length
    const tasksCompleted = projectTasks.filter(t => {
      const colSlug = (t.kanban_columns as unknown as { slug?: string } | null)?.slug?.toLowerCase() || ''
      return colSlug.includes('done') || colSlug.includes('complet')
    }).length
    const tasksInProgress = projectTasks.filter(t => {
      const colSlug = (t.kanban_columns as unknown as { slug?: string } | null)?.slug?.toLowerCase() || ''
      return colSlug.includes('progress') || colSlug.includes('proceso') || colSlug.includes('review')
    }).length

    const progressPercentage = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

    const budgetFromTasks = projectTasks.reduce((acc, t) => acc + (Number(t.budget_amount) || 0), 0)
    const budgetFromActions = projectCameActions.reduce((acc, c) => acc + (Number(c.budget_allocated) || 0), 0)
    const budgetAllocated = Math.max(budgetFromTasks, budgetFromActions)

    return {
      ...project,
      membersCount: projectMembers.length,
      cameActionsCount: projectCameActions.length,
      tasksTotal,
      tasksCompleted,
      tasksInProgress,
      progressPercentage,
      budgetAllocated
    }
  })
}

export async function getProjectById(
  tenantId: string,
  projectId: string
): Promise<ProjectDetail | null> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)

  const { data: project, error } = await projectsClient
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !project) {
    return null
  }

  // Fetch members with profiles
  const { data: rawMembers } = await projectsClient
    .from('project_members')
    .select('*, profiles:user_id(display_name, email, avatar_url)')
    .eq('project_id', projectId)
    .eq('tenant_id', tenantId)

  const typedMembers = (rawMembers ?? []) as unknown as Array<{
    id: string
    tenant_id: string
    project_id: string
    user_id: string
    role: 'leader' | 'member'
    created_at: string
    profiles?: { display_name?: string; email?: string; avatar_url?: string | null } | null
  }>

  // Fetch came actions
  const { data: cameActions } = await projectsClient
    .from('project_came_actions')
    .select('*')
    .eq('project_id', projectId)
    .eq('tenant_id', tenantId)

  // Fetch tasks
  const { data: rawTasks } = await supabase
    .from('kanban_tasks')
    .select('id, title, description, priority, due_date, assignee_ids, came_action_id, budget_amount, column_id, kanban_columns(slug, name)')
    .eq('project_id', projectId)
    .eq('tenant_id', tenantId)
    .order('position', { ascending: true })

  const typedTasks = (rawTasks ?? []) as unknown as Array<{
    id: string
    title: string
    description: string | null
    priority: string
    due_date: string | null
    assignee_ids: string[] | null
    came_action_id: string | null
    budget_amount: number | null
    column_id: string
    kanban_columns: { slug?: string; name?: string } | null
  }>

  const tasks = typedTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    priority: t.priority,
    dueDate: t.due_date,
    assigneeIds: t.assignee_ids || [],
    cameActionId: t.came_action_id,
    budgetAmount: Number(t.budget_amount) || 0,
    columnId: t.column_id,
    status: t.kanban_columns?.name || 'Backlog'
  }))

  const tasksTotal = tasks.length
  const tasksCompleted = typedTasks.filter(t => {
    const colSlug = t.kanban_columns?.slug?.toLowerCase() || ''
    return colSlug.includes('done') || colSlug.includes('complet')
  }).length

  const progressPercentage = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  const members = typedMembers.map(m => {
    const prof = m.profiles
    return {
      id: m.id,
      tenant_id: m.tenant_id,
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      profile: {
        displayName: prof?.display_name,
        email: prof?.email,
        avatarUrl: prof?.avatar_url
      }
    }
  })

  return {
    ...project,
    members,
    cameActions: cameActions ?? [],
    tasks,
    progressPercentage
  }
}

export async function createProjectTransaction(
  tenantId: string,
  userId: string,
  input: CreateProjectInput,
  resolvedLeaderId: string | null
): Promise<ProjectDetail> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)
  const kanbanClient = asKanbanClient(supabase)

  // 1. Check idempotency if key provided
  if (input.idempotencyKey) {
    const { data: existing } = await projectsClient
      .from('projects')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle()

    if (existing) {
      const detail = await getProjectById(tenantId, existing.id)
      if (detail) return detail
    }
  }

  // 2. Insert into projects
  const { data: newProject, error: projectError } = await projectsClient
    .from('projects')
    .insert({
      tenant_id: tenantId,
      workspace_id: input.workspaceId ?? null,
      team_id: input.teamId ?? null,
      investigation_id: input.investigationId ?? null,
      name: input.name,
      description: input.description ?? '',
      objective: input.objective ?? '',
      priority: input.priority,
      start_date: input.startDate ? new Date(input.startDate).toISOString() : null,
      end_date: input.endDate ? new Date(input.endDate).toISOString() : null,
      leader_user_id: resolvedLeaderId,
      budget_total: input.budgetTotal,
      budget_mode: input.budgetMode,
      status: 'active',
      idempotency_key: input.idempotencyKey ?? null,
      created_by: userId
    })
    .select('*')
    .single()

  if (projectError || !newProject) {
    logger.error('Error inserting project', { details: { error: projectError?.message, tenantId } })
    throw ProjectError.internal({ message: projectError?.message })
  }

  const projectId = newProject.id

  // 3. Insert project members (Leader + any unique assignees)
  const memberUserIds = new Set<string>()
  if (resolvedLeaderId) memberUserIds.add(resolvedLeaderId)

  input.activities.forEach(act => {
    act.assigneeIds.forEach(id => memberUserIds.add(id))
  })

  const memberRows = Array.from(memberUserIds).map(uid => ({
    tenant_id: tenantId,
    project_id: projectId,
    user_id: uid,
    role: uid === resolvedLeaderId ? ('leader' as const) : ('member' as const)
  }))

  if (memberRows.length > 0) {
    const { error: memberError } = await projectsClient
      .from('project_members')
      .insert(memberRows)

    if (memberError) {
      logger.error('Error inserting project members', { details: { error: memberError.message } })
    }
  }

  // 4. Insert CAME actions snapshots if any
  if (input.cameActions && input.cameActions.length > 0 && input.investigationId) {
    const cameRows = input.cameActions.map(action => ({
      tenant_id: tenantId,
      project_id: projectId,
      investigation_id: input.investigationId!,
      came_action_id: action.cameActionId,
      action_type: action.actionType,
      budget_allocated: action.budgetAllocated,
      snapshot: {
        title: action.title,
        ...action.snapshot,
        importedAt: new Date().toISOString()
      }
    }))

    const { error: cameError } = await projectsClient
      .from('project_came_actions')
      .insert(cameRows)

    if (cameError) {
      logger.error('Error inserting project came actions', { details: { error: cameError.message } })
    }
  }

  // 5. Insert Kanban tasks if any
  if (input.activities && input.activities.length > 0) {
    // Resolve default Backlog column for tenant if columnId not provided
    let defaultColumnId = input.activities[0].columnId
    if (!defaultColumnId) {
      const { data: firstCol } = await kanbanClient
        .from('kanban_columns')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      defaultColumnId = firstCol?.id ?? null
    }

    if (defaultColumnId) {
      const taskRows: KanbanDatabase['public']['Tables']['kanban_tasks']['Insert'][] = input.activities.map((act, index) => ({
        tenant_id: tenantId,
        column_id: act.columnId || defaultColumnId!,
        project_id: projectId,
        came_action_id: act.cameActionId ?? null,
        title: act.title,
        description: act.description || '',
        priority: act.priority,
        cover_image: null,
        tags: [],
        due_date: act.dueDate ? new Date(act.dueDate).toISOString() : null,
        assignee_ids: act.assigneeIds,
        budget_amount: act.budgetAmount || 0,
        position: index,
        created_by: userId
      }))

      const { error: tasksError } = await kanbanClient
        .from('kanban_tasks')
        .insert(taskRows)

      if (tasksError) {
        logger.error('Error inserting kanban tasks for project', { details: { error: tasksError.message } })
      }
    }
  }

  const result = await getProjectById(tenantId, projectId)
  if (!result) throw ProjectError.internal({ message: 'Could not load created project' })
  return result
}

export async function updateProject(
  tenantId: string,
  projectId: string,
  patch: UpdateProjectInput
): Promise<ProjectDetail> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)

  const updateData: Partial<ProjectRow> = {}
  if (patch.name !== undefined) updateData.name = patch.name
  if (patch.description !== undefined) updateData.description = patch.description
  if (patch.objective !== undefined) updateData.objective = patch.objective
  if (patch.priority !== undefined) updateData.priority = patch.priority
  if (patch.startDate !== undefined) updateData.start_date = patch.startDate ? new Date(patch.startDate).toISOString() : null
  if (patch.endDate !== undefined) updateData.end_date = patch.endDate ? new Date(patch.endDate).toISOString() : null
  if (patch.leaderUserId !== undefined) updateData.leader_user_id = patch.leaderUserId
  if (patch.budgetTotal !== undefined) updateData.budget_total = patch.budgetTotal
  if (patch.budgetMode !== undefined) updateData.budget_mode = patch.budgetMode
  if (patch.status !== undefined) updateData.status = patch.status

  const { error } = await projectsClient
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .eq('tenant_id', tenantId)

  if (error) {
    logger.error('Error updating project', { details: { error: error.message, projectId } })
    throw ProjectError.internal({ message: error.message })
  }

  const updated = await getProjectById(tenantId, projectId)
  if (!updated) throw ProjectError.notFound()
  return updated
}

export async function countActiveProjects(tenantId: string): Promise<number> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)

  const { count, error } = await projectsClient
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')

  if (error) {
    logger.error('Error counting active projects', { details: { error: error.message, tenantId } })
    return 0
  }

  return count ?? 0
}

export async function listAssignedCameActionIds(
  tenantId: string,
  investigationId: string
): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const projectsClient = asProjectsClient(supabase)

  const { data, error } = await projectsClient
    .from('project_came_actions')
    .select('came_action_id')
    .eq('tenant_id', tenantId)
    .eq('investigation_id', investigationId)

  if (error) {
    logger.error('Error fetching assigned came action ids', { details: { error: error.message } })
    return []
  }

  return (data ?? []).map(r => r.came_action_id)
}
