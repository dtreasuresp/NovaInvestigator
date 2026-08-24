import type { CapabilityKey, PlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type {
  MembershipStatus,
  PlatformMembershipStatus,
  ProfileStatus,
  VidStatus
} from '@/lib/supabase/database.types'

// Identity states from
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 6.1.
// Unlike `AuthState` in `src/lib/auth/principal.ts`, this includes `invited`
// because it depends on membership data, not just Supabase Auth.
export type PrincipalAuthState = 'anonymous' | 'invited' | 'registered' | 'suspended'

export interface TenantMembershipSummary {
  membershipId: string
  tenantId: string
  roleId: string
  roleKey: string | null
  status: MembershipStatus
}

export interface PrimaryTenantOption {
  id: string
  name: string
  slug: string
}

export interface PrimaryTenantSelection {
  primaryTenantId: string | null
  items: readonly PrimaryTenantOption[]
}

export interface PlatformMembershipSummary {
  membershipId: string
  roleId: string
  roleKey: string | null
  status: PlatformMembershipStatus
}

export interface Principal {
  userId: string
  email: string | null
  isAnonymous: boolean
  authState: PrincipalAuthState
  profileStatus: ProfileStatus | null
  vidStatus: VidStatus | null
  primaryTenantId: string | null
  memberships: readonly TenantMembershipSummary[]
  platformMembership: PlatformMembershipSummary | null
}

export type EffectiveAccessStatus = 'active' | 'expired' | 'missing'

export type EffectiveAccessSource = 'subscription' | 'trial' | 'one_time' | null

export interface EffectiveAccessEntitlement {
  readonly key: string
  readonly limitValue: number | null
  readonly isEnabled: boolean
}

export interface EffectiveAccessSnapshot {
  readonly principal: 'registered' | 'guest'
  readonly status: EffectiveAccessStatus
  readonly source: EffectiveAccessSource
  readonly tenantId: string | null
  readonly planId: string | null
  readonly planCode: string | null
  readonly subscriptionId: string | null
  readonly grantId: string | null
  readonly startsAt: string | null
  readonly expiresAt: string | null
  readonly modules: readonly string[]
  readonly actions: readonly string[]
  readonly limits: Readonly<Record<string, number>>
  readonly entitlements: readonly EffectiveAccessEntitlement[]
  readonly capabilities: readonly CapabilityKey[]
  readonly platformCapabilities: readonly PlatformCapabilityKey[]
}

export type { CapabilityKey, PlatformCapabilityKey }
