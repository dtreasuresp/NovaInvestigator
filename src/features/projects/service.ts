import { requireProjectsPrincipal, assertProjectsCapability, assertTeamMemberEligible, getTeamLeaderId, assertProjectLimitEntitlement } from './access'
import * as repository from './repository'
import type { CreateProjectInput, UpdateProjectInput, ProjectFilterInput } from './schema'
import { ProjectError } from './errors'
import { logger } from '@/lib/logger'
import { getInvestigationById } from '@/lib/investigations/repository'
import type { InvestigationState, CameAction } from '@/types/apps/investigator-types'

export async function listProjects(filters?: ProjectFilterInput): Promise<repository.ProjectWithStats[]> {
  const principal = await requireProjectsPrincipal()
  await assertProjectsCapability(principal, 'projects.read')

  return repository.listProjectsByTenant(principal.primaryTenantId!, filters)
}

export async function getProject(projectId: string): Promise<repository.ProjectDetail> {
  const principal = await requireProjectsPrincipal()
  await assertProjectsCapability(principal, 'projects.read')

  const project = await repository.getProjectById(principal.primaryTenantId!, projectId)
  if (!project) {
    throw ProjectError.notFound()
  }

  return project
}

export async function createProject(input: CreateProjectInput): Promise<repository.ProjectDetail> {
  const principal = await requireProjectsPrincipal()
  await assertProjectsCapability(principal, 'projects.create')
  const tenantId = principal.primaryTenantId!

  // 1. Quota / Entitlement evaluation
  const currentCount = await repository.countActiveProjects(tenantId)
  await assertProjectLimitEntitlement(tenantId, currentCount)

  // 2. Team & Leader Resolution
  let resolvedLeaderId = input.leaderUserId ?? null

  if (input.teamId) {
    if (resolvedLeaderId) {
      await assertTeamMemberEligible(tenantId, input.teamId, resolvedLeaderId)
    } else {
      resolvedLeaderId = await getTeamLeaderId(tenantId, input.teamId)
    }

    // Validate all activity assignees belong to the team
    for (const activity of input.activities) {
      for (const assigneeId of activity.assigneeIds) {
        await assertTeamMemberEligible(tenantId, input.teamId, assigneeId)
      }
    }
  }

  // 3. Budget Mode & Calculation Rules
  let finalBudgetTotal = input.budgetTotal

  if (input.budgetMode === 'action_based') {
    const sumActivities = input.activities.reduce((acc, act) => acc + (act.budgetAmount || 0), 0)
    const sumActions = input.cameActions.reduce((acc, act) => acc + (act.budgetAllocated || 0), 0)
    finalBudgetTotal = Math.max(sumActivities, sumActions, input.budgetTotal)
  } else if (input.budgetMode === 'total_first') {
    const sumActivities = input.activities.reduce((acc, act) => acc + (act.budgetAmount || 0), 0)
    const sumActions = input.cameActions.reduce((acc, act) => acc + (act.budgetAllocated || 0), 0)
    const allocated = Math.max(sumActivities, sumActions)

    if (finalBudgetTotal > 0 && allocated > finalBudgetTotal) {
      throw ProjectError.budgetLimitExceeded(finalBudgetTotal, allocated)
    }
  }

  const sanitizedInput: CreateProjectInput = {
    ...input,
    budgetTotal: finalBudgetTotal
  }

  // 4. Persistence Transaction
  const created = await repository.createProjectTransaction(
    tenantId,
    principal.userId,
    sanitizedInput,
    resolvedLeaderId
  )

  logger.info('Proyecto estratégico creado exitosamente', {
    action: 'projects.create',
    details: {
      userId: principal.userId,
      tenantId,
      projectId: created.id,
      name: created.name,
      investigationId: created.investigation_id,
      teamId: created.team_id,
      activitiesCount: created.tasks.length,
      budgetTotal: created.budget_total
    }
  })

  return created
}

export async function updateProject(
  projectId: string,
  patch: UpdateProjectInput
): Promise<repository.ProjectDetail> {
  const principal = await requireProjectsPrincipal()
  await assertProjectsCapability(principal, 'projects.update')
  const tenantId = principal.primaryTenantId!

  const existing = await repository.getProjectById(tenantId, projectId)
  if (!existing) {
    throw ProjectError.notFound()
  }

  if (patch.leaderUserId && existing.team_id) {
    await assertTeamMemberEligible(tenantId, existing.team_id, patch.leaderUserId)
  }

  const updated = await repository.updateProject(tenantId, projectId, patch)

  logger.info('Proyecto actualizado', {
    action: 'projects.update',
    details: {
      userId: principal.userId,
      tenantId,
      projectId,
      patch
    }
  })

  return updated
}

export async function listInvestigationProjects(investigationId: string): Promise<repository.ProjectWithStats[]> {
  const principal = await requireProjectsPrincipal()
  await assertProjectsCapability(principal, 'projects.read')

  return repository.listProjectsByTenant(principal.primaryTenantId!, { investigationId })
}

export interface EligibleCameActionItem {
  action: CameAction
  isAssigned: boolean
}

export async function listEligibleCameActions(
  investigationId: string
): Promise<EligibleCameActionItem[]> {
  const principal = await requireProjectsPrincipal()
  const tenantId = principal.primaryTenantId!

  const supabase = await (await import('@/lib/supabase/server')).createSupabaseServerClient()
  const { asInvestigationsClient } = await import('@/lib/investigations/db-types')
  const investigationsClient = asInvestigationsClient(supabase)

  const investigation = await getInvestigationById(investigationsClient, tenantId, investigationId)
  if (!investigation) {
    throw ProjectError.notFound('investigations.errors.notFound')
  }

  const assignedActionIds = await repository.listAssignedCameActionIds(tenantId, investigationId)
  const assignedSet = new Set(assignedActionIds)

  const state = investigation.state as unknown as InvestigationState
  const cameActions = state?.cameActions || []

  return cameActions.map(action => ({
    action,
    isAssigned: assignedSet.has(action.id)
  }))
}
