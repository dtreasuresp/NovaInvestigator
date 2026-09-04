import type { CapabilityKey, PlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type { CommercialAccessSource, CommercialAccessStatus } from '@/lib/billing/types'

// Base class for every access-control failure raised by
// `src/features/access/access-service.ts`. Route Handlers and Server
// Actions should catch this type to map it to a stable HTTP status/error
// contract (see plan section 15.6) instead of leaking internal messages.
export abstract class AccessError extends Error {
  abstract readonly code: string
}

export class AuthenticationRequiredError extends AccessError {
  readonly code = 'authentication_required'

  constructor() {
    super('This operation requires an authenticated Supabase session.')
    this.name = 'AuthenticationRequiredError'
  }
}

export class VidVerificationRequiredError extends AccessError {
  readonly code = 'vid_verification_required'

  constructor() {
    super('This operation requires a verified VID profile.')
    this.name = 'VidVerificationRequiredError'
  }
}

export class TenantMembershipRequiredError extends AccessError {
  readonly code = 'tenant_membership_required'

  readonly tenantId: string

  constructor(tenantId: string) {
    super(`No active membership found for tenant "${tenantId}".`)
    this.name = 'TenantMembershipRequiredError'
    this.tenantId = tenantId
  }
}

export class PrimaryTenantMembershipRequiredError extends AccessError {
  readonly code = 'primary_tenant_membership_required'

  readonly tenantId: string

  constructor(tenantId: string) {
    super(`The selected primary tenant "${tenantId}" is not an active membership.`)
    this.name = 'PrimaryTenantMembershipRequiredError'
    this.tenantId = tenantId
  }
}

export class CapabilityDeniedError extends AccessError {
  readonly code = 'capability_denied'

  readonly tenantId: string

  readonly capability: CapabilityKey

  constructor(tenantId: string, capability: CapabilityKey) {
    super(`Capability "${capability}" is not granted for tenant "${tenantId}".`)
    this.name = 'CapabilityDeniedError'
    this.tenantId = tenantId
    this.capability = capability
  }
}

export class ModuleAccessRequiredError extends AccessError {
  readonly code = 'module_access_required' as const

  constructor(readonly moduleKey: string) {
    super(`Commercial module access is required: ${moduleKey}.`)
  }
}

export class EntitlementRequiredError extends AccessError {
  readonly code = 'entitlement_required'

  readonly tenantId: string

  readonly entitlement: string

  constructor(tenantId: string, entitlement: string) {
    super(`Entitlement "${entitlement}" is not active for tenant "${tenantId}".`)
    this.name = 'EntitlementRequiredError'
    this.tenantId = tenantId
    this.entitlement = entitlement
  }
}

export class EntitlementLimitExceededError extends AccessError {
  readonly code = 'entitlement_limit_exceeded'

  readonly tenantId: string

  readonly entitlement: string

  readonly limit: number

  readonly usage: number

  constructor(tenantId: string, entitlement: string, limit: number, usage: number) {
    super(`Entitlement "${entitlement}" has reached its limit for tenant "${tenantId}".`)
    this.name = 'EntitlementLimitExceededError'
    this.tenantId = tenantId
    this.entitlement = entitlement
    this.limit = limit
    this.usage = usage
  }
}

export class EntitlementResolutionError extends AccessError {
  readonly code = 'entitlement_resolution_failed'

  constructor() {
    super('The required entitlement could not be resolved safely.')
    this.name = 'EntitlementResolutionError'
  }
}

export class CommercialAccessRequiredError extends AccessError {
  readonly code = 'commercial_access_required'

  readonly tenantId: string

  readonly status: Exclude<CommercialAccessStatus, 'active'>

  readonly source: CommercialAccessSource | null

  constructor(
    tenantId: string,
    status: Exclude<CommercialAccessStatus, 'active'>,
    source: CommercialAccessSource | null
  ) {
    super(`Commercial access is ${status} for tenant "${tenantId}".`)
    this.name = 'CommercialAccessRequiredError'
    this.tenantId = tenantId
    this.status = status
    this.source = source
  }
}

export class CommercialAccessResolutionError extends AccessError {
  readonly code = 'commercial_access_resolution_failed'

  constructor() {
    super('Commercial access could not be resolved safely.')
    this.name = 'CommercialAccessResolutionError'
  }
}

export class PlatformMembershipRequiredError extends AccessError {
  readonly code = 'platform_membership_required'

  constructor() {
    super('This operation requires an active platform membership.')
    this.name = 'PlatformMembershipRequiredError'
  }
}

export class PlatformCapabilityDeniedError extends AccessError {
  readonly code = 'platform_capability_denied'

  readonly capability: PlatformCapabilityKey

  constructor(capability: PlatformCapabilityKey) {
    super(`Platform capability "${capability}" is not granted.`)
    this.name = 'PlatformCapabilityDeniedError'
    this.capability = capability
  }
}

export class DatabaseConnectionError extends AccessError {
  readonly code = 'database_connection_failed'

  constructor(context: string, originalMessage?: string) {
    super(`Database or network connection failed while resolving ${context}${originalMessage ? `: ${originalMessage}` : ''}.`)
    this.name = 'DatabaseConnectionError'
  }
}
