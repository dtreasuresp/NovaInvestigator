export {
  CAPABILITY_KEYS,
  CAPABILITY_MANIFEST,
  DEFAULT_ROLE_CAPABILITIES,
  SYSTEM_ROLE_KEYS,
  isCapabilityKey,
  isPlatformCapabilityKey
} from '@/features/access/capabilityManifest'
export type {
  CapabilityDefinition,
  CapabilityKey,
  PlatformCapabilityKey,
  SystemRoleKey
} from '@/features/access/capabilityManifest'

export {
  getCurrentPrincipal,
  getEffectiveCapabilities,
  resolveEffectiveAccessSnapshot,
  resolveGuestEffectiveAccessSnapshot,
  hasCapability,
  hasPlatformCapability,
  getPlatformCapabilities,
  consumePdfMonthlyEntitlement,
  requireCommercialAccess,
  requireAuthenticatedUser,
  requireCapability,
  requireActionEntitlement,
  requireEntitlement,
  requireModuleAccess,
  requirePdfEntitlement,
  requireVidVerified,
  requirePlatformCapability,
  requireTenantMembership
} from '@/features/access/access-service'
export { listPrimaryTenantOptions, setPrimaryTenant } from '@/features/access/primary-tenant'

export {
  AccessError,
  AuthenticationRequiredError,
  CapabilityDeniedError,
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  EntitlementResolutionError,
  ModuleAccessRequiredError,
  CommercialAccessRequiredError,
  CommercialAccessResolutionError,
  PlatformCapabilityDeniedError,
  PlatformMembershipRequiredError,
  PrimaryTenantMembershipRequiredError,
  TenantMembershipRequiredError,
  VidVerificationRequiredError
} from '@/features/access/errors'

export type {
  PlatformMembershipSummary,
  Principal,
  PrincipalAuthState,
  PrimaryTenantOption,
  PrimaryTenantSelection,
  TenantMembershipSummary,
  EffectiveAccessEntitlement,
  EffectiveAccessSnapshot,
  EffectiveAccessSource,
  EffectiveAccessStatus
} from '@/features/access/types'
export type { EntitlementContext } from '@/features/access/access-service'
export type { CommercialAccessContext } from '@/features/access/access-service'
export { evaluateCommercialAccess } from '@/features/access/commercial-access'
export type { CommercialAccessEvaluationInput } from '@/features/access/commercial-access'
export type { ResolvedEntitlement, SubscriptionSnapshot } from '@/features/access/entitlement-evaluator'
