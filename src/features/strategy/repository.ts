import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  OkrCycleInsert,
  OkrCycleObjectiveInsert,
  OkrCycleObjectiveRow,
  OkrCycleObjectiveUpdate,
  OkrCycleRow,
  OkrCycleUpdate,
  StrategicObjectiveInsert,
  StrategicObjectiveRow,
  StrategicObjectiveUpdate,
  StrategySupabaseClient
} from './db-types'
import type {
  CreateOkrCycleInput,
  CreateOkrCycleObjectiveInput,
  CreateStrategicObjectiveInput,
  OkrCycleFilterInput,
  OkrCycleObjectiveFilterInput,
  StrategicObjectiveFilterInput,
  UpdateOkrCycleInput,
  UpdateOkrCycleObjectiveInput,
  UpdateStrategicObjectiveInput
} from './schema'
import { StrategyError } from './errors'
import type { Json } from '@/lib/supabase/database.types'
import { logger } from '@/lib/logger'

function asJsonObject(value: Record<string, unknown>): Json {
  return value as Json
}

function reportRepositoryError(operation: string, error: { message?: string } | null): never {
  logger.error(`Strategy repository operation failed: ${operation}`, {
    details: { message: error?.message ?? 'unknown database error' }
  })
  throw StrategyError.internal()
}

function getClient(): Promise<StrategySupabaseClient> {
  return createSupabaseServerClient()
}

export async function listStrategicObjectivesByTenant(
  tenantId: string,
  filters?: StrategicObjectiveFilterInput
): Promise<StrategicObjectiveRow[]> {
  const supabase = await getClient()
  let query = supabase
    .from('strategic_objectives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.workspaceId) query = query.eq('workspace_id', filters.workspaceId)
  if (filters?.teamId) query = query.eq('team_id', filters.teamId)
  if (filters?.ownerUserId) query = query.eq('owner_user_id', filters.ownerUserId)

  const { data, error } = await query
  if (error) return reportRepositoryError('listStrategicObjectives', error)

  return data ?? []
}

export async function getStrategicObjectiveById(
  tenantId: string,
  objectiveId: string
): Promise<StrategicObjectiveRow | null> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('strategic_objectives')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', objectiveId)
    .maybeSingle()

  if (error) return reportRepositoryError('getStrategicObjectiveById', error)
  return data
}

export async function createStrategicObjective(
  tenantId: string,
  userId: string,
  input: CreateStrategicObjectiveInput
): Promise<StrategicObjectiveRow> {
  const supabase = await getClient()
  const insert: StrategicObjectiveInsert = {
    tenant_id: tenantId,
    workspace_id: input.workspaceId ?? null,
    team_id: input.teamId ?? null,
    title: input.title,
    description: input.description,
    status: input.status,
    owner_user_id: input.ownerUserId ?? null,
    source_investigation_id: input.sourceInvestigationId ?? null,
    source_came_action_id: input.sourceCameActionId ?? null,
    source_snapshot: asJsonObject(input.sourceSnapshot),
    created_by: userId,
    updated_by: userId
  }

  const { data, error } = await supabase
    .from('strategic_objectives')
    .insert(insert)
    .select('*')
    .single()

  if (error || !data) return reportRepositoryError('createStrategicObjective', error)
  return data
}

export async function updateStrategicObjective(
  tenantId: string,
  objectiveId: string,
  userId: string,
  input: UpdateStrategicObjectiveInput
): Promise<StrategicObjectiveRow | null> {
  const supabase = await getClient()
  const { expectedVersion, ...patch } = input
  const update: StrategicObjectiveUpdate = {
    ...(patch.title === undefined ? {} : { title: patch.title }),
    ...(patch.description === undefined ? {} : { description: patch.description }),
    ...(patch.status === undefined ? {} : { status: patch.status }),
    ...(patch.workspaceId === undefined ? {} : { workspace_id: patch.workspaceId ?? null }),
    ...(patch.teamId === undefined ? {} : { team_id: patch.teamId ?? null }),
    ...(patch.ownerUserId === undefined ? {} : { owner_user_id: patch.ownerUserId ?? null }),
    ...(patch.sourceInvestigationId === undefined
      ? {}
      : { source_investigation_id: patch.sourceInvestigationId ?? null }),
    ...(patch.sourceCameActionId === undefined
      ? {}
      : { source_came_action_id: patch.sourceCameActionId ?? null }),
    ...(patch.sourceSnapshot === undefined ? {} : { source_snapshot: asJsonObject(patch.sourceSnapshot) }),
    updated_by: userId,
    version: expectedVersion + 1
  }

  const { data, error } = await supabase
    .from('strategic_objectives')
    .update(update)
    .eq('tenant_id', tenantId)
    .eq('id', objectiveId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle()

  if (error) return reportRepositoryError('updateStrategicObjective', error)
  return data
}

export async function listOkrCyclesByTenant(
  tenantId: string,
  filters?: OkrCycleFilterInput
): Promise<OkrCycleRow[]> {
  const supabase = await getClient()
  let query = supabase
    .from('okr_cycles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.periodType) query = query.eq('period_type', filters.periodType)
  if (filters?.workspaceId) query = query.eq('workspace_id', filters.workspaceId)
  if (filters?.teamId) query = query.eq('team_id', filters.teamId)
  if (filters?.ownerUserId) query = query.eq('owner_user_id', filters.ownerUserId)

  const { data, error } = await query
  if (error) return reportRepositoryError('listOkrCycles', error)
  return data ?? []
}

export async function getOkrCycleById(tenantId: string, cycleId: string): Promise<OkrCycleRow | null> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('okr_cycles')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', cycleId)
    .maybeSingle()

  if (error) return reportRepositoryError('getOkrCycleById', error)
  return data
}

export async function createOkrCycle(
  tenantId: string,
  userId: string,
  input: CreateOkrCycleInput
): Promise<OkrCycleRow> {
  const supabase = await getClient()
  const insert: OkrCycleInsert = {
    tenant_id: tenantId,
    workspace_id: input.workspaceId ?? null,
    team_id: input.teamId ?? null,
    name: input.name,
    description: input.description,
    period_type: input.periodType,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
    owner_user_id: input.ownerUserId ?? null,
    created_by: userId,
    updated_by: userId
  }

  const { data, error } = await supabase
    .from('okr_cycles')
    .insert(insert)
    .select('*')
    .single()

  if (error || !data) return reportRepositoryError('createOkrCycle', error)
  return data
}

export async function updateOkrCycle(
  tenantId: string,
  cycleId: string,
  userId: string,
  input: UpdateOkrCycleInput
): Promise<OkrCycleRow | null> {
  const supabase = await getClient()
  const { expectedVersion, ...patch } = input
  const update: OkrCycleUpdate = {
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(patch.description === undefined ? {} : { description: patch.description }),
    ...(patch.periodType === undefined ? {} : { period_type: patch.periodType }),
    ...(patch.startDate === undefined ? {} : { start_date: patch.startDate }),
    ...(patch.endDate === undefined ? {} : { end_date: patch.endDate }),
    ...(patch.status === undefined ? {} : { status: patch.status }),
    ...(patch.workspaceId === undefined ? {} : { workspace_id: patch.workspaceId ?? null }),
    ...(patch.teamId === undefined ? {} : { team_id: patch.teamId ?? null }),
    ...(patch.ownerUserId === undefined ? {} : { owner_user_id: patch.ownerUserId ?? null }),
    updated_by: userId,
    version: expectedVersion + 1
  }

  const { data, error } = await supabase
    .from('okr_cycles')
    .update(update)
    .eq('tenant_id', tenantId)
    .eq('id', cycleId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle()

  if (error) return reportRepositoryError('updateOkrCycle', error)
  return data
}

export async function listOkrCycleObjectivesByTenant(
  tenantId: string,
  filters?: OkrCycleObjectiveFilterInput
): Promise<OkrCycleObjectiveRow[]> {
  const supabase = await getClient()
  let query = supabase
    .from('okr_cycle_objectives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filters?.cycleId) query = query.eq('cycle_id', filters.cycleId)
  if (filters?.strategicObjectiveId) {
    query = query.eq('strategic_objective_id', filters.strategicObjectiveId)
  }
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) return reportRepositoryError('listOkrCycleObjectives', error)
  return data ?? []
}

export async function getOkrCycleObjectiveById(
  tenantId: string,
  cycleObjectiveId: string
): Promise<OkrCycleObjectiveRow | null> {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('okr_cycle_objectives')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', cycleObjectiveId)
    .maybeSingle()

  if (error) return reportRepositoryError('getOkrCycleObjectiveById', error)
  return data
}

export async function createOkrCycleObjective(
  tenantId: string,
  userId: string,
  input: CreateOkrCycleObjectiveInput
): Promise<OkrCycleObjectiveRow> {
  const supabase = await getClient()
  const insert: OkrCycleObjectiveInsert = {
    tenant_id: tenantId,
    cycle_id: input.cycleId,
    strategic_objective_id: input.strategicObjectiveId,
    owner_user_id: input.ownerUserId ?? null,
    commitment: input.commitment,
    weight: input.weight,
    status: input.status,
    progress: input.progress,
    created_by: userId,
    updated_by: userId
  }

  const { data, error } = await supabase
    .from('okr_cycle_objectives')
    .insert(insert)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw StrategyError.duplicate('strategy.errors.cycleObjectiveDuplicate')
    return reportRepositoryError('createOkrCycleObjective', error)
  }

  if (!data) return reportRepositoryError('createOkrCycleObjective', null)
  return data
}

export async function updateOkrCycleObjective(
  tenantId: string,
  cycleObjectiveId: string,
  userId: string,
  input: UpdateOkrCycleObjectiveInput
): Promise<OkrCycleObjectiveRow | null> {
  const supabase = await getClient()
  const { expectedVersion, ...patch } = input
  const update: OkrCycleObjectiveUpdate = {
    ...(patch.ownerUserId === undefined ? {} : { owner_user_id: patch.ownerUserId ?? null }),
    ...(patch.commitment === undefined ? {} : { commitment: patch.commitment }),
    ...(patch.weight === undefined ? {} : { weight: patch.weight }),
    ...(patch.status === undefined ? {} : { status: patch.status }),
    ...(patch.progress === undefined ? {} : { progress: patch.progress }),
    updated_by: userId,
    version: expectedVersion + 1
  }

  const { data, error } = await supabase
    .from('okr_cycle_objectives')
    .update(update)
    .eq('tenant_id', tenantId)
    .eq('id', cycleObjectiveId)
    .eq('version', expectedVersion)
    .select('*')
    .maybeSingle()

  if (error) return reportRepositoryError('updateOkrCycleObjective', error)
  return data
}
