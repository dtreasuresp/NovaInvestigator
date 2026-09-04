import {
  requireAuthenticatedUser,
  requireCapability
} from '@/features/access'
import type { CapabilityKey } from '@/features/access/capabilityManifest'
import {
  AuthenticationRequiredError,
  CapabilityDeniedError,
  TenantMembershipRequiredError
} from '@/features/access/errors'

import { StrategyError } from './errors'

export type StrategyPrincipal = Awaited<ReturnType<typeof requireAuthenticatedUser>>

export type StrategyCapability =
  | 'strategy.objectives.read'
  | 'strategy.objectives.create'
  | 'strategy.objectives.update'
  | 'strategy.objectives.archive'
  | 'strategy.okr_cycles.read'
  | 'strategy.okr_cycles.create'
  | 'strategy.okr_cycles.update'
  | 'strategy.okr_cycles.close'
  | 'strategy.okr_cycles.archive'
  | 'strategy.okr_cycle_objectives.manage'

export async function requireStrategyPrincipal(): Promise<StrategyPrincipal> {
  try {
    const principal = await requireAuthenticatedUser()

    if (!principal.primaryTenantId) {
      throw StrategyError.tenantRequired()
    }

    return principal
  } catch (error) {
    if (StrategyError.isStrategyError(error)) {
      throw error
    }

    if (error instanceof AuthenticationRequiredError) {
      throw StrategyError.unauthenticated()
    }

    throw StrategyError.internal()
  }
}

export async function assertStrategyCapability(
  tenantId: string,
  capability: StrategyCapability
): Promise<void> {
  try {
    await requireCapability(tenantId, capability as CapabilityKey)
  } catch (error) {
    if (error instanceof CapabilityDeniedError) {
      throw StrategyError.forbidden(capability)
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw StrategyError.tenantRequired()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw StrategyError.unauthenticated()
    }

    throw StrategyError.internal()
  }
}
