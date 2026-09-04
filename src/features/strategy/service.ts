import { logger } from '@/lib/logger'

import {
  assertStrategyCapability,
  requireStrategyPrincipal,
  type StrategyCapability
} from './access'
import * as repository from './repository'
import { StrategyError } from './errors'
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
import type {
  OkrCycleObjectiveRow,
  OkrCycleRow,
  StrategicObjectiveRow
} from './db-types'

const OBJECTIVE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active', 'cancelled', 'archived'],
  active: ['at_risk', 'achieved', 'cancelled', 'archived'],
  at_risk: ['active', 'achieved', 'cancelled', 'archived'],
  achieved: ['archived'],
  cancelled: ['archived'],
  archived: []
}

const CYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: []
}

const COMMITMENT_TRANSITIONS: Record<string, readonly string[]> = {
  not_started: ['on_track', 'at_risk', 'off_track', 'achieved', 'dropped'],
  on_track: ['at_risk', 'off_track', 'achieved', 'dropped'],
  at_risk: ['on_track', 'off_track', 'achieved', 'dropped'],
  off_track: ['on_track', 'at_risk', 'achieved', 'dropped'],
  achieved: [],
  dropped: []
}

function assertTransition(
  transitions: Record<string, readonly string[]>,
  current: string,
  next: string,
  messageKey: string
): void {
  if (current === next || transitions[current]?.includes(next)) return
  throw StrategyError.invalidTransition(messageKey)
}

function capabilityForObjectiveUpdate(input: UpdateStrategicObjectiveInput): StrategyCapability {
  return input.status === 'archived'
    ? 'strategy.objectives.archive'
    : 'strategy.objectives.update'
}

function capabilityForCycleUpdate(
  existingStatus: string,
  input: UpdateOkrCycleInput
): StrategyCapability {
  if (input.status === 'closed' && existingStatus !== 'closed') return 'strategy.okr_cycles.close'
  if (input.status === 'archived' && existingStatus !== 'archived') return 'strategy.okr_cycles.archive'
  return 'strategy.okr_cycles.update'
}

async function resolveUpdatedObjective(
  tenantId: string,
  objectiveId: string,
  expectedVersion: number,
  updated: StrategicObjectiveRow | null
): Promise<StrategicObjectiveRow> {
  if (updated) return updated

  const current = await repository.getStrategicObjectiveById(tenantId, objectiveId)
  if (!current) throw StrategyError.notFound()
  throw StrategyError.versionConflict(expectedVersion)
}

async function resolveUpdatedCycle(
  tenantId: string,
  cycleId: string,
  expectedVersion: number,
  updated: OkrCycleRow | null
): Promise<OkrCycleRow> {
  if (updated) return updated

  const current = await repository.getOkrCycleById(tenantId, cycleId)
  if (!current) throw StrategyError.notFound()
  throw StrategyError.versionConflict(expectedVersion)
}

async function resolveUpdatedCycleObjective(
  tenantId: string,
  cycleObjectiveId: string,
  expectedVersion: number,
  updated: OkrCycleObjectiveRow | null
): Promise<OkrCycleObjectiveRow> {
  if (updated) return updated

  const current = await repository.getOkrCycleObjectiveById(tenantId, cycleObjectiveId)
  if (!current) throw StrategyError.notFound()
  throw StrategyError.versionConflict(expectedVersion)
}

async function requireCycleMutable(
  tenantId: string,
  cycleId: string,
  allowArchived = false
): Promise<OkrCycleRow> {
  const cycle = await repository.getOkrCycleById(tenantId, cycleId)
  if (!cycle) throw StrategyError.notFound('strategy.errors.cycleNotFound')

  if (cycle.status === 'closed' || (cycle.status === 'archived' && !allowArchived)) {
    throw StrategyError.invalidTransition('strategy.errors.closedCycleImmutable')
  }

  return cycle
}

export async function listStrategicObjectives(
  filters?: StrategicObjectiveFilterInput
): Promise<StrategicObjectiveRow[]> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.objectives.read')

  return repository.listStrategicObjectivesByTenant(tenantId, filters)
}

export async function getStrategicObjective(objectiveId: string): Promise<StrategicObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.objectives.read')

  const objective = await repository.getStrategicObjectiveById(tenantId, objectiveId)
  if (!objective) throw StrategyError.notFound()
  return objective
}

export async function createStrategicObjective(
  input: CreateStrategicObjectiveInput
): Promise<StrategicObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.objectives.create')

  const objective = await repository.createStrategicObjective(tenantId, principal.userId, input)

  logger.info('Strategic objective created', {
    action: 'strategy.objectives.create',
    details: {
      tenantId,
      userId: principal.userId,
      objectiveId: objective.id,
      status: objective.status
    }
  })

  return objective
}

export async function updateStrategicObjective(
  objectiveId: string,
  input: UpdateStrategicObjectiveInput
): Promise<StrategicObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  const existing = await repository.getStrategicObjectiveById(tenantId, objectiveId)
  if (!existing) throw StrategyError.notFound()

  await assertStrategyCapability(tenantId, capabilityForObjectiveUpdate(input))

  if (input.status) {
    assertTransition(
      OBJECTIVE_TRANSITIONS,
      existing.status,
      input.status,
      'strategy.errors.invalidObjectiveTransition'
    )
  }

  const updated = await repository.updateStrategicObjective(
    tenantId,
    objectiveId,
    principal.userId,
    input
  )
  const result = await resolveUpdatedObjective(tenantId, objectiveId, input.expectedVersion, updated)

  logger.info('Strategic objective updated', {
    action: 'strategy.objectives.update',
    details: {
      tenantId,
      userId: principal.userId,
      objectiveId,
      version: result.version
    }
  })

  return result
}

export async function archiveStrategicObjective(
  objectiveId: string,
  expectedVersion: number
): Promise<StrategicObjectiveRow> {
  return updateStrategicObjective(objectiveId, {
    expectedVersion,
    status: 'archived'
  })
}

export async function listOkrCycles(filters?: OkrCycleFilterInput): Promise<OkrCycleRow[]> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycles.read')

  return repository.listOkrCyclesByTenant(tenantId, filters)
}

export async function getOkrCycle(cycleId: string): Promise<OkrCycleRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycles.read')

  const cycle = await repository.getOkrCycleById(tenantId, cycleId)
  if (!cycle) throw StrategyError.notFound('strategy.errors.cycleNotFound')
  return cycle
}

export async function createOkrCycle(input: CreateOkrCycleInput): Promise<OkrCycleRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycles.create')

  const cycle = await repository.createOkrCycle(tenantId, principal.userId, input)

  logger.info('OKR cycle created', {
    action: 'strategy.okr_cycles.create',
    details: {
      tenantId,
      userId: principal.userId,
      cycleId: cycle.id,
      status: cycle.status,
      periodType: cycle.period_type
    }
  })

  return cycle
}

export async function updateOkrCycle(
  cycleId: string,
  input: UpdateOkrCycleInput
): Promise<OkrCycleRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  const existing = await repository.getOkrCycleById(tenantId, cycleId)
  if (!existing) throw StrategyError.notFound('strategy.errors.cycleNotFound')

  await assertStrategyCapability(tenantId, capabilityForCycleUpdate(existing.status, input))

  if (input.status) {
    assertTransition(
      CYCLE_TRANSITIONS,
      existing.status,
      input.status,
      'strategy.errors.invalidCycleTransition'
    )
  }

  if (
    (existing.status === 'active' || existing.status === 'closed') &&
    (input.periodType !== undefined || input.startDate !== undefined || input.endDate !== undefined)
  ) {
    throw StrategyError.invalidTransition('strategy.errors.activeCycleDatesImmutable')
  }

  if (existing.status === 'closed' && input.status !== 'archived') {
    throw StrategyError.invalidTransition('strategy.errors.closedCycleImmutable')
  }

  const updated = await repository.updateOkrCycle(tenantId, cycleId, principal.userId, input)
  const result = await resolveUpdatedCycle(tenantId, cycleId, input.expectedVersion, updated)

  logger.info('OKR cycle updated', {
    action: 'strategy.okr_cycles.update',
    details: {
      tenantId,
      userId: principal.userId,
      cycleId,
      status: result.status,
      version: result.version
    }
  })

  return result
}

export async function closeOkrCycle(
  cycleId: string,
  expectedVersion: number
): Promise<OkrCycleRow> {
  return updateOkrCycle(cycleId, {
    expectedVersion,
    status: 'closed'
  })
}

export async function archiveOkrCycle(
  cycleId: string,
  expectedVersion: number
): Promise<OkrCycleRow> {
  return updateOkrCycle(cycleId, {
    expectedVersion,
    status: 'archived'
  })
}

export async function listOkrCycleObjectives(
  filters?: OkrCycleObjectiveFilterInput
): Promise<OkrCycleObjectiveRow[]> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycle_objectives.manage')

  return repository.listOkrCycleObjectivesByTenant(tenantId, filters)
}

export async function getOkrCycleObjective(
  cycleObjectiveId: string
): Promise<OkrCycleObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycle_objectives.manage')

  const cycleObjective = await repository.getOkrCycleObjectiveById(tenantId, cycleObjectiveId)
  if (!cycleObjective) throw StrategyError.notFound('strategy.errors.cycleObjectiveNotFound')
  return cycleObjective
}

export async function createOkrCycleObjective(
  input: CreateOkrCycleObjectiveInput
): Promise<OkrCycleObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycle_objectives.manage')
  await requireCycleMutable(tenantId, input.cycleId)

  const objective = await repository.getStrategicObjectiveById(
    tenantId,
    input.strategicObjectiveId
  )
  if (!objective) throw StrategyError.notFound('strategy.errors.notFound')

  const cycleObjective = await repository.createOkrCycleObjective(
    tenantId,
    principal.userId,
    input
  )

  logger.info('Strategic objective linked to OKR cycle', {
    action: 'strategy.okr_cycle_objectives.create',
    details: {
      tenantId,
      userId: principal.userId,
      cycleId: input.cycleId,
      strategicObjectiveId: input.strategicObjectiveId,
      cycleObjectiveId: cycleObjective.id
    }
  })

  return cycleObjective
}

export async function updateOkrCycleObjective(
  cycleObjectiveId: string,
  input: UpdateOkrCycleObjectiveInput
): Promise<OkrCycleObjectiveRow> {
  const principal = await requireStrategyPrincipal()
  const tenantId = principal.primaryTenantId!
  await assertStrategyCapability(tenantId, 'strategy.okr_cycle_objectives.manage')

  const existing = await repository.getOkrCycleObjectiveById(tenantId, cycleObjectiveId)
  if (!existing) throw StrategyError.notFound('strategy.errors.cycleObjectiveNotFound')
  await requireCycleMutable(tenantId, existing.cycle_id)

  if (input.status) {
    assertTransition(
      COMMITMENT_TRANSITIONS,
      existing.status,
      input.status,
      'strategy.errors.invalidCommitmentTransition'
    )
  }

  const updated = await repository.updateOkrCycleObjective(
    tenantId,
    cycleObjectiveId,
    principal.userId,
    input
  )
  const result = await resolveUpdatedCycleObjective(
    tenantId,
    cycleObjectiveId,
    input.expectedVersion,
    updated
  )

  logger.info('OKR cycle objective updated', {
    action: 'strategy.okr_cycle_objectives.update',
    details: {
      tenantId,
      userId: principal.userId,
      cycleObjectiveId,
      status: result.status,
      version: result.version
    }
  })

  return result
}
