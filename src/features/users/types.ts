// Domain DTOs for the tenant-scoped user management slice. These are the
// shapes returned by src/features/users/service.ts and consumed by
// src/app/api/admin/users/** route handlers and, on the client, by
// src/hooks/use-user-app.ts. Kept separate from src/types/apps/user-types.ts
// (the template's `AppUser` view-model), which still backs the unrelated,
// still-fake profile view under src/views/apps/users/view/*.
import type { MembershipStatus } from '@/lib/supabase/database.types'

// System role keys as seeded by the access foundation
// (src/features/access/capabilityManifest.ts SYSTEM_ROLE_KEYS). Tenants may
// also define custom, non-system roles (roles.tenant_id = tenant), which is
// why `roleKey`/`roleName` below are plain strings rather than this literal
// union — the union is only used to offer the system presets in the UI.
export const SYSTEM_MEMBER_ROLE_KEYS = ['owner', 'admin', 'analyst', 'viewer'] as const

export type SystemMemberRoleKey = (typeof SYSTEM_MEMBER_ROLE_KEYS)[number]

// Membership id — the canonical identifier used by this API. Distinct from
// the Supabase Auth user id (`userId`) because a membership is what is
// actually tenant-scoped; a single auth user may hold memberships in
// several tenants.
export interface TenantMemberSummary {
  id: string
  userId: string
  tenantId: string
  email: string | null
  name: string
  avatarUrl: string | null
  roleId: string
  roleKey: string
  roleName: string
  status: MembershipStatus
  invitedAt: string | null
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EffectiveCapabilityEntry {
  key: string
  resource: string
  action: string
  description: string
  source: 'role' | 'allow_override' | 'deny_override'
  granted: boolean
}

export interface TenantMemberDetail extends TenantMemberSummary {
  capabilities: EffectiveCapabilityEntry[]
}

export interface ListTenantMembersResult {
  items: TenantMemberSummary[]
  page: number
  pageSize: number
  total: number
}

export interface CreateInvitationResult {
  invitationId: string
  email: string
  roleKey: string
  roleName: string
  tenantName: string
  workspaceId: string
  workspaceName: string
  expiresAt: string
  acceptanceUrl?: string

  // Returned once, to the admin who created the invitation, so it can be
  // shared with the invitee out-of-band. Never persisted in plaintext and
  // never written to logs.
  token: string
}

export type TenantInvitationStatus = 'pending' | 'expired'
export type InvitationDeliveryStatus = 'pending' | 'sent' | 'failed'

export interface TenantInvitationSummary {
  id: string
  tenantId: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string | null
  email: string
  roleId: string
  roleKey: string
  roleName: string
  status: TenantInvitationStatus
  deliveryStatus: InvitationDeliveryStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface ListTenantInvitationsResult {
  items: TenantInvitationSummary[]
  page: number
  pageSize: number
  total: number
}

export interface ReceivedInvitationSummary {
  id: string
  tenantId: string
  tenantName: string
  workspaceId: string
  workspaceName: string
  email: string
  roleId: string
  roleKey: string
  roleName: string
  invitedByName: string
  invitedByEmail: string | null
  status: TenantInvitationStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface ListReceivedInvitationsResult {
  items: ReceivedInvitationSummary[]
}

export interface TenantWorkspaceSummary {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'archived'
}

export interface TenantRoleSummary {
  id: string
  key: string
  name: string
}

export type AccessRoleScope = 'platform' | 'global_tenant' | 'tenant'

export interface TenantRoleAdminSummary extends TenantRoleSummary {
  scope: AccessRoleScope
  tenantId: string | null
  tenantName: string | null
  isSystem: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  memberCount: number
  capabilityCount: number
}

export interface TenantCapabilitySummary {
  key: string
  resource: string
  action: string
  description: string
}

export interface TenantRoleCapabilityAssignment {
  roleId: string
  capabilityKey: string
}

export interface TenantMemberCapabilityOverrideSummary {
  membershipId: string
  capabilityKey: string
  effect: 'allow' | 'deny'
}

export interface AccessTenantSummary {
  id: string
  name: string
}

export interface TenantPermissionMatrix {
  roles: TenantRoleAdminSummary[]
  capabilities: TenantCapabilitySummary[]
  assignments: TenantRoleCapabilityAssignment[]
  overrides: TenantMemberCapabilityOverrideSummary[]
  tenants?: AccessTenantSummary[]
}

export interface UnifiedPermissionMatrix extends TenantPermissionMatrix {
  canManageRoles: boolean
  canManageCapabilities: boolean
  canManagePlatformRoles: boolean
  canManageGlobalRoles: boolean
  canManageTenantRoles: boolean
}
