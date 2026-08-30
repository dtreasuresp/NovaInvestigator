import { requireAuthenticatedUser } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { evaluateEntitlement } from '@/features/access/entitlement-evaluator'
import { ProjectError } from './errors'

export type ProjectsPrincipal = Awaited<ReturnType<typeof requireAuthenticatedUser>>

export async function requireProjectsPrincipal(): Promise<ProjectsPrincipal> {
  const principal = await requireAuthenticatedUser()

  if (!principal.primaryTenantId) {
    throw ProjectError.tenantRequired()
  }

  return principal
}

export async function assertProjectsCapability(
  principal: ProjectsPrincipal,
  capabilityKey: 'projects.read' | 'projects.create' | 'projects.update' | 'projects.delete'
): Promise<void> {
  if (!principal.primaryTenantId) {
    throw ProjectError.tenantRequired()
  }

  const supabase = await createSupabaseServerClient()

  // Use the canonical Postgres security function public.has_capability
  const { data: hasCap, error } = await supabase.rpc('has_capability', {
    p_user_id: principal.userId,
    p_tenant_id: principal.primaryTenantId,
    p_capability_key: capabilityKey
  })

  if (error || !hasCap) {
    throw ProjectError.forbidden(undefined, { capability: capabilityKey })
  }
}

export async function assertTeamMemberEligible(
  tenantId: string,
  teamId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient()

  const { data: member, error } = await supabase
    .from('team_members')
    .select('user_id, teams!inner(id, tenant_id)')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('teams.tenant_id', tenantId)
    .maybeSingle()

  if (error || !member) {
    throw ProjectError.teamMemberNotEligible(userId, teamId)
  }
}

export async function getTeamLeaderId(
  tenantId: string,
  teamId: string
): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  // Find team member with leader role or the team's created_by
  const { data: leaderMember } = await supabase
    .from('team_members')
    .select('user_id, roles(key)')
    .eq('team_id', teamId)
    .eq('roles.key', 'team_leader')
    .maybeSingle()

  if (leaderMember?.user_id) {
    return leaderMember.user_id
  }

  const { data: team } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', teamId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return team?.created_by ?? null
}

export async function assertProjectLimitEntitlement(
  tenantId: string,
  currentActiveProjectsCount: number
): Promise<void> {
  const supabase = await createSupabaseServerClient()

  // Check tenant entitlements or plan entitlements for projects.max_active
  const { data: rawEntitlement } = await supabase
    .from('tenant_entitlements')
    .select('is_enabled, limit_value')
    .eq('tenant_id', tenantId)
    .eq('entitlement_key', 'projects.max_active')
    .maybeSingle()

  const entitlementRow = rawEntitlement as { is_enabled: boolean; limit_value: number | string | null } | null

  if (!entitlementRow) {
    return
  }

  try {
    evaluateEntitlement({
      tenantId,
      entitlement: 'projects.max_active',
      subscriptionId: null,
      planId: null,
      planCode: 'current',
      planIsActive: true,
      entitlementRow,
      usage: currentActiveProjectsCount
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'EntitlementLimitExceededError') {
      const limit = Number(entitlementRow.limit_value) || 0
      throw ProjectError.entitlementLimitExceeded('projects.max_active', limit, currentActiveProjectsCount)
    }
    throw ProjectError.entitlementRequired('projects.max_active')
  }
}
