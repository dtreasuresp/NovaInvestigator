// Application service for tenant-scoped user management: wires access
// control (tenant + capability), payload validation and the repository
// together, and maps DB rows to the camelCase DTOs returned by the Route
// Handlers under src/app/api/admin/users/**. This is the only module those
// route handlers should import from — repository/access stay internal
// implementation details.
//
// Capability mapping: the task brief that motivated this slice referred to
// `users.manage` and `users.capabilities.manage`, but the actual capability
// catalog (src/features/access/capabilityManifest.ts, matched 1:1 with the
// DB seed per its own header comment) defines `users.update`, `users.disable`
// and `access.manage`/`access.read` instead. This service uses the manifest's
// real keys — the single source of truth — rather than inventing new ones.
import crypto from 'node:crypto'

import type { Json } from '@/lib/supabase/database.types'
import { getApplicationUrl } from '@/lib/billing/config'
import { ResendDeliveryError } from '@/lib/email/resend'
import {
  getCurrentPrincipal,
  getEffectiveCapabilities,
  getPlatformCapabilities
} from '@/features/access/access-service'
import { isCapabilityKey, isPlatformCapabilityKey, SYSTEM_ROLE_KEYS } from '@/features/access/capabilityManifest'
import type { CapabilityKey } from '@/features/access/capabilityManifest'

import { requirePlatformUsersPrincipal, requireUsersPrincipal } from './access'
import { UsersError } from './errors'
import {
  countActiveMembersWithRole,
  createTenantRole,
  createPlatformAccessRole,
  createUnifiedTenantAccessRole,
  createInvitation,
  findRoleByKey,
  getInvitationById,
  getInvitationExpiration,
  getMemberById,
  getMemberDetail,
  getMemberSummary,
  getTenantRoleById,
  listReceivedInvitations,
  listInvitations,
  listMembers,
  listTenantRoles,
  listTenantPermissionMatrix,
  listUnifiedPermissionMatrix,
  listTenantWorkspaces,
  markInvitationDelivery,
  revokeInvitation,
  replaceTenantRoleCapabilities,
  replacePlatformAccessRoleCapabilities,
  replaceUnifiedTenantAccessRoleCapabilities,
  setMemberStatus,
  updateInvitation,
  updateMemberRole,
  updateTenantRole,
  updatePlatformAccessRole,
  updateUnifiedTenantAccessRole,
  upsertCapabilityOverride
} from './repository'
import { sendInvitationEmail } from './invitation-email'
import type {
  DisableEnableRequest,
  InviteUserRequest,
  InvitationMutationRequest,
  ListInvitationsQuery,
  ListUsersQuery,
  PatchCapabilitiesRequest,
  PatchInvitationRequest,
  PatchUserRequest,
  CreateRoleRequest,
  CreateUnifiedRoleRequest,
  PatchRoleRequest,
  PatchUnifiedRoleRequest,
  ReplaceUnifiedRolePermissionsRequest,
  ReplaceRolePermissionsRequest
} from './schema'
import type {
  CreateInvitationResult,
  ListReceivedInvitationsResult,
  ListTenantInvitationsResult,
  ListTenantMembersResult,
  TenantMemberDetail,
  TenantMemberSummary,
  TenantPermissionMatrix,
  TenantRoleAdminSummary,
  TenantInvitationSummary,
  TenantRoleSummary,
  TenantWorkspaceSummary,
  UnifiedPermissionMatrix
} from './types'
import { recordAuditEntry } from './audit'

const CAPABILITIES = {
  read: 'users.read',
  invite: 'users.invite',
  update: 'users.update',
  disable: 'users.disable',
  accessRead: 'access.read',
  accessManage: 'access.manage'
} as const

const OWNER_ROLE_KEY = 'owner'

export async function listTenantMembers(query: ListUsersQuery): Promise<ListTenantMembersResult> {
  const principal = await requireUsersPrincipal(CAPABILITIES.read)

  return listMembers(principal.client, {
    tenantId: principal.tenantId,
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    roleKey: query.role,
    search: query.search
  })
}

export async function listTenantInvitations(query: ListInvitationsQuery): Promise<ListTenantInvitationsResult> {
  const principal = await requireUsersPrincipal(CAPABILITIES.read)

  return listInvitations(principal.client, {
    tenantId: principal.tenantId,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search
  })
}

export async function getTenantInvitation(invitationId: string): Promise<TenantInvitationSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.read)
  const invitation = await getInvitationById(principal.client, principal.tenantId, invitationId)

  if (!invitation) {
    throw UsersError.notFound()
  }

  return invitation
}

export async function getTenantMember(membershipId: string): Promise<TenantMemberSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.read)
  const member = await getMemberSummary(principal.client, principal.tenantId, membershipId)

  if (!member) {
    throw UsersError.notFound()
  }

  return member
}

export async function inviteTenantMember(input: InviteUserRequest): Promise<CreateInvitationResult> {
  const principal = await requireUsersPrincipal(CAPABILITIES.invite)

  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  const created = await createInvitation(principal.client, {
    tenantId: principal.tenantId,
    workspaceId: input.workspaceId,
    email: input.email.toLowerCase(),
    roleKey: input.roleKey,
    createdBy: principal.userId,
    tokenHash,
    token: rawToken
  })

  await recordAuditEntry({
    tenantId: principal.tenantId,
    workspaceId: created.workspaceId,
    actorUserId: principal.userId,
    action: 'users.invitation.created',
    entityType: 'invitation',
    entityId: created.invitationId,
    after: {
      email: created.email,
      roleKey: created.roleKey,
      workspaceId: created.workspaceId,
      expiresAt: created.expiresAt
    }
  })

  const result = {
    ...created,
    acceptanceUrl: `${getApplicationUrl()}/pages/auth/invitations/accept?token=${encodeURIComponent(created.token)}`
  }

  const inviterName = await getInviterName(principal.client, principal.userId)

  await deliverInvitation(principal.client, result, inviterName)

  return result
}

async function deliverInvitation(
  client: Awaited<ReturnType<typeof requireUsersPrincipal>>['client'],
  invitation: CreateInvitationResult,
  inviterName: string
): Promise<void> {
  try {
    await sendInvitationEmail({
      token: invitation.token,
      email: invitation.email,
      tenantName: invitation.tenantName,
      workspaceName: invitation.workspaceName,
      roleName: invitation.roleName,
      inviterName
    })
  } catch (error) {
    if (!(error instanceof ResendDeliveryError)) {
      throw error
    }

    await markInvitationDelivery(client, invitation.invitationId, 'failed')
    throw UsersError.invitationDeliveryFailed()
  }

  await markInvitationDelivery(client, invitation.invitationId, 'sent')
}

async function getTenantName(
  client: Awaited<ReturnType<typeof requireUsersPrincipal>>['client'],
  tenantId: string
): Promise<string> {
  const { data, error } = await client.from('tenants').select('name').eq('id', tenantId).maybeSingle()

  if (error || !data) {
    throw UsersError.internal('No se pudo resolver el nombre del tenant de la invitación.')
  }

  return data.name
}

async function getInviterName(
  client: Awaited<ReturnType<typeof requireUsersPrincipal>>['client'],
  userId: string
): Promise<string> {
  const { data, error } = await client.from('profiles').select('display_name').eq('id', userId).maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo resolver el nombre de quien envía la invitación.')
  }

  const displayName = data?.display_name?.trim()

  return displayName || 'Administrador'
}

export async function listReceivedTenantInvitations(): Promise<ListReceivedInvitationsResult> {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous || !principal.email) {
    throw UsersError.unauthenticated()
  }

  if (principal.profileStatus === 'suspended' || principal.profileStatus === 'deleted') {
    throw UsersError.forbidden('account.active')
  }

  return listReceivedInvitations(principal.email)
}

async function rotateAndDeliverInvitation(
  invitationId: string,
  input: PatchInvitationRequest | null,
  action: 'users.invitation.updated' | 'users.invitation.resent',
  expectedUpdatedAt?: string
): Promise<TenantInvitationSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.invite)
  const before = await getInvitationById(principal.client, principal.tenantId, invitationId)

  if (!before) {
    throw UsersError.notFound()
  }

  const workspaceId = input?.workspaceId ?? before.workspaceId
  const email = input?.email.toLowerCase() ?? before.email.toLowerCase()
  const roleKey = input?.roleKey ?? before.roleKey
  const role = await findRoleByKey(principal.client, principal.tenantId, roleKey)

  if (!role) {
    throw UsersError.validation('El rol indicado no existe en este tenant.', { roleKey })
  }

  const workspaces = await listTenantWorkspaces(principal.client, principal.tenantId)
  const workspace = workspaces.find(item => item.id === workspaceId)

  if (!workspace) {
    throw UsersError.validation('El workspace indicado no existe o no está activo en este tenant.', { workspaceId })
  }

  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = getInvitationExpiration()

  await updateInvitation(principal.client, {
    tenantId: principal.tenantId,
    invitationId,
    expectedUpdatedAt: input?.updatedAt ?? expectedUpdatedAt ?? before.updatedAt,
    workspaceId,
    email,
    roleId: role.id,
    tokenHash,
    expiresAt
  })

  await recordAuditEntry({
    tenantId: principal.tenantId,
    workspaceId,
    actorUserId: principal.userId,
    action,
    entityType: 'invitation',
    entityId: invitationId,
    before: {
      email: before.email,
      roleKey: before.roleKey,
      workspaceId: before.workspaceId,
      expiresAt: before.expiresAt
    },
    after: {
      email,
      roleKey: role.key,
      workspaceId,
      expiresAt
    }
  })

  const tenantName = await getTenantName(principal.client, principal.tenantId)

  const deliveryResult: CreateInvitationResult = {
    invitationId,
    email,
    roleKey: role.key,
    roleName: role.name,
    tenantName,
    workspaceId,
    workspaceName: workspace.name,
    expiresAt,
    token
  }

  const inviterName = await getInviterName(principal.client, principal.userId)

  await deliverInvitation(principal.client, deliveryResult, inviterName)

  const after = await getInvitationById(principal.client, principal.tenantId, invitationId)

  if (!after) {
    throw UsersError.notFound()
  }

  return after
}

export async function updateTenantInvitation(
  invitationId: string,
  input: PatchInvitationRequest
): Promise<TenantInvitationSummary> {
  return rotateAndDeliverInvitation(invitationId, input, 'users.invitation.updated')
}

export async function resendTenantInvitation(
  invitationId: string,
  input: InvitationMutationRequest
): Promise<TenantInvitationSummary> {
  return rotateAndDeliverInvitation(invitationId, null, 'users.invitation.resent', input.updatedAt)
}

export async function revokeTenantInvitation(invitationId: string, input: InvitationMutationRequest): Promise<void> {
  const principal = await requireUsersPrincipal(CAPABILITIES.invite)
  const before = await getInvitationById(principal.client, principal.tenantId, invitationId)

  if (!before) {
    throw UsersError.notFound()
  }

  await revokeInvitation(principal.client, {
    tenantId: principal.tenantId,
    invitationId,
    expectedUpdatedAt: input.updatedAt
  })

  await recordAuditEntry({
    tenantId: principal.tenantId,
    workspaceId: before.workspaceId,
    actorUserId: principal.userId,
    action: 'users.invitation.revoked',
    entityType: 'invitation',
    entityId: invitationId,
    before: {
      email: before.email,
      roleKey: before.roleKey,
      workspaceId: before.workspaceId
    },
    after: { revoked: true }
  })
}

export async function listTenantInviteWorkspaces(): Promise<TenantWorkspaceSummary[]> {
  const principal = await requireUsersPrincipal(CAPABILITIES.invite)

  return listTenantWorkspaces(principal.client, principal.tenantId)
}

export async function listTenantInviteRoles(): Promise<TenantRoleSummary[]> {
  const principal = await requireUsersPrincipal(CAPABILITIES.invite)

  return listTenantRoles(principal.client, principal.tenantId)
}

export async function listTenantAccessRoles(): Promise<TenantRoleAdminSummary[]> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessRead)
  const matrix = await listTenantPermissionMatrix(principal.client, principal.tenantId)

  return matrix.roles
}

export async function listTenantPermissionMatrixForAdmin(): Promise<TenantPermissionMatrix> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessRead)

  return listTenantPermissionMatrix(principal.client, principal.tenantId)
}

const PLATFORM_ACCESS_CAPABILITIES = {
  rolesRead: 'platform.access.roles.read',
  rolesManage: 'platform.access.roles.manage',
  capabilitiesRead: 'platform.access.capabilities.read',
  capabilitiesManage: 'platform.access.capabilities.manage',
  tenantRolesManage: 'platform.access.tenant_roles.manage'
} as const

function requireUnifiedMatrixRead(platformCapabilities: ReadonlySet<string>): void {
  if (!platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.rolesRead)) {
    throw UsersError.forbidden(PLATFORM_ACCESS_CAPABILITIES.rolesRead)
  }

  if (!platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesRead)) {
    throw UsersError.forbidden(PLATFORM_ACCESS_CAPABILITIES.capabilitiesRead)
  }
}

function withUnifiedManagementCapabilities(
  matrix: TenantPermissionMatrix,
  platformCapabilities: ReadonlySet<string>,
  tenantCanManageRoles: boolean
): UnifiedPermissionMatrix {
  const canManagePlatformRoles = platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.rolesManage)

  const canManageTenantRoles =
    tenantCanManageRoles || platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

  const canManageGlobalRoles = platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

  return {
    ...matrix,
    canManageRoles: canManagePlatformRoles || canManageTenantRoles,
    canManageCapabilities: platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage),
    canManagePlatformRoles,
    canManageGlobalRoles,
    canManageTenantRoles
  }
}

async function loadUnifiedMatrixForPlatformAdmin(): Promise<{
  matrix: UnifiedPermissionMatrix
  client: Awaited<ReturnType<typeof requirePlatformUsersPrincipal>>['client']
  userId: string
  platformRoleId: string
  platformCapabilities: ReadonlySet<string>
}> {
  const platformCapabilities = await getPlatformCapabilities()
  const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.rolesRead)

  if (!platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesRead)) {
    throw UsersError.forbidden(PLATFORM_ACCESS_CAPABILITIES.capabilitiesRead)
  }

  const matrix = await listUnifiedPermissionMatrix(principal.client, null, true)

  return {
    matrix: withUnifiedManagementCapabilities(matrix, platformCapabilities, false),
    client: principal.client,
    userId: principal.userId,
    platformRoleId: principal.platformRoleId,
    platformCapabilities
  }
}

function findUnifiedRole(matrix: TenantPermissionMatrix, roleId: string, scope: CreateUnifiedRoleRequest['scope']) {
  const role = matrix.roles.find(candidate => candidate.id === roleId && candidate.scope === scope)

  if (!role) {
    throw UsersError.notFound()
  }

  return role
}

async function validateUnifiedRoleCapabilities(
  matrix: TenantPermissionMatrix,
  scope: CreateUnifiedRoleRequest['scope'],
  capabilityKeys: string[],
  assignableCapabilities: ReadonlySet<string>
): Promise<CapabilityKey[]> {
  const normalizedKeys = Array.from(new Set(capabilityKeys))
  const available = new Set(matrix.capabilities.map(capability => capability.key))

  const invalidKeys = normalizedKeys.filter(key => {
    if (!available.has(key) || !isCapabilityKey(key)) {
      return true
    }

    return scope === 'platform' ? !isPlatformCapabilityKey(key) : isPlatformCapabilityKey(key)
  })

  if (invalidKeys.length > 0) {
    throw UsersError.validation('La matriz contiene capacidades no administrables.', { capabilities: invalidKeys })
  }

  const unassignableKeys = normalizedKeys.filter(key => !assignableCapabilities.has(key))

  if (unassignableKeys.length > 0) {
    throw UsersError.capabilityNotAssignable(unassignableKeys)
  }

  return normalizedKeys.filter(isCapabilityKey)
}

export async function listUnifiedPermissionMatrixForAdmin(): Promise<UnifiedPermissionMatrix> {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    throw UsersError.unauthenticated()
  }

  const platformCapabilities = await getPlatformCapabilities()

  const canReadPlatform =
    platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.rolesRead) &&
    platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesRead)

  if (canReadPlatform) {
    const platformPrincipal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.rolesRead)
    const matrix = await listUnifiedPermissionMatrix(platformPrincipal.client, null, true)

    return withUnifiedManagementCapabilities(matrix, platformCapabilities, false)
  }

  const tenantPrincipal = await requireUsersPrincipal(CAPABILITIES.accessRead)
  const matrix = await listUnifiedPermissionMatrix(tenantPrincipal.client, tenantPrincipal.tenantId, false)
  const tenantCapabilities = await getEffectiveCapabilities(tenantPrincipal.tenantId)

  return withUnifiedManagementCapabilities(
    matrix,
    platformCapabilities,
    tenantCapabilities.has(CAPABILITIES.accessManage)
  )
}

export async function createUnifiedAccessRole(input: CreateUnifiedRoleRequest): Promise<UnifiedPermissionMatrix> {
  let roleId: string
  let actorUserId: string
  let auditTenantId: string | null = null

  if (input.scope === 'platform') {
    const platformCapabilities = await getPlatformCapabilities()

    requireUnifiedMatrixRead(platformCapabilities)
    const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.rolesManage)
    const role = await createPlatformAccessRole(principal.client, input.key, input.name)

    roleId = role.id
    actorUserId = principal.userId
  } else if (input.scope === 'global_tenant') {
    const platformCapabilities = await getPlatformCapabilities()

    requireUnifiedMatrixRead(platformCapabilities)
    const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)
    const role = await createUnifiedTenantAccessRole(principal.client, null, input.key, input.name, true)

    roleId = role.id
    actorUserId = principal.userId
  } else {
    const platformCapabilities = await getPlatformCapabilities()

    if (platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)) {
      requireUnifiedMatrixRead(platformCapabilities)
      const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

      const role = await createUnifiedTenantAccessRole(
        principal.client,
        input.tenantId ?? null,
        input.key,
        input.name,
        false
      )

      roleId = role.id
      actorUserId = principal.userId
      auditTenantId = input.tenantId ?? null
    } else {
      const principal = await requireUsersPrincipal(CAPABILITIES.accessManage, input.tenantId ?? undefined)
      const role = await createTenantRole(principal.client, principal.tenantId, input.key, input.name)

      roleId = role.id
      actorUserId = principal.userId
      auditTenantId = principal.tenantId
    }
  }

  await recordAuditEntry({
    tenantId: auditTenantId,
    actorUserId,
    action: 'access.role.created',
    entityType: 'role',
    entityId: roleId,
    after: {
      scope: input.scope,
      tenantId: input.tenantId ?? null,
      key: input.key,
      name: input.name
    }
  })

  return listUnifiedPermissionMatrixForAdmin()
}

export async function updateUnifiedAccessRole(
  roleId: string,
  input: PatchUnifiedRoleRequest
): Promise<UnifiedPermissionMatrix> {
  const platformCapabilities = await getPlatformCapabilities()

  const requiresPlatformMatrixRead =
    input.scope === 'platform'
      ? platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.rolesManage)
      : platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

  if (requiresPlatformMatrixRead) {
    requireUnifiedMatrixRead(platformCapabilities)
  }

  const matrix = await listUnifiedPermissionMatrixForAdmin()
  const before = findUnifiedRole(matrix, roleId, input.scope)
  let actorUserId: string
  let auditTenantId = before.tenantId

  if (input.scope === 'platform') {
    const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.rolesManage)

    if (principal.platformRoleId === roleId) {
      throw UsersError.invalidTransition('No puedes modificar el rol de tu propia sesión.')
    }

    await updatePlatformAccessRole(
      principal.client,
      roleId,
      input.name ?? null,
      input.isActive ?? null,
      input.updatedAt
    )
    actorUserId = principal.userId
    auditTenantId = null
  } else {
    const platformManagesTenantRoles = platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

    if (input.scope === 'global_tenant' && !platformManagesTenantRoles) {
      throw UsersError.forbidden(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)
    }

    if (platformManagesTenantRoles) {
      const principal = await requirePlatformUsersPrincipal(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

      await updateUnifiedTenantAccessRole(
        principal.client,
        roleId,
        input.name ?? null,
        input.isActive ?? null,
        input.updatedAt
      )
      actorUserId = principal.userId
    } else {
      const principal = await requireUsersPrincipal(CAPABILITIES.accessManage, before.tenantId ?? undefined)

      if (before.scope !== 'tenant' || before.tenantId !== principal.tenantId) {
        throw UsersError.notFound()
      }

      if (principal.roleId === roleId) {
        throw UsersError.invalidTransition('No puedes modificar el rol de tu propia sesión.')
      }

      await updateTenantRole(principal.client, {
        tenantId: principal.tenantId,
        roleId,
        name: input.name,
        isActive: input.isActive,
        expectedUpdatedAt: input.updatedAt
      })
      actorUserId = principal.userId
      auditTenantId = principal.tenantId
    }
  }

  await recordAuditEntry({
    tenantId: auditTenantId,
    actorUserId,
    action: 'access.role.updated',
    entityType: 'role',
    entityId: roleId,
    before: { name: before.name, isActive: before.isActive, scope: before.scope },
    after: { name: input.name ?? before.name, isActive: input.isActive ?? before.isActive, scope: before.scope }
  })

  return listUnifiedPermissionMatrixForAdmin()
}

export async function disableUnifiedAccessRole(
  roleId: string,
  input: DisableEnableRequest
): Promise<TenantRoleAdminSummary> {
  const matrix = await listUnifiedPermissionMatrixForAdmin()
  const role = matrix.roles.find(candidate => candidate.id === roleId)

  if (!role) {
    throw UsersError.notFound()
  }

  const nextMatrix = await updateUnifiedAccessRole(roleId, {
    scope: role.scope,
    isActive: false,
    updatedAt: input.updatedAt
  })

  const updatedRole = nextMatrix.roles.find(candidate => candidate.id === roleId && candidate.scope === role.scope)

  if (!updatedRole) {
    throw UsersError.notFound()
  }

  return updatedRole
}

export async function replaceUnifiedAccessRolePermissions(
  roleId: string,
  input: ReplaceUnifiedRolePermissionsRequest
): Promise<UnifiedPermissionMatrix> {
  const platformCapabilities = await getPlatformCapabilities()

  const requiresPlatformMatrixRead =
    input.scope === 'platform'
      ? platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage)
      : platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage) ||
        platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

  if (requiresPlatformMatrixRead) {
    requireUnifiedMatrixRead(platformCapabilities)
  }

  const matrix = await listUnifiedPermissionMatrixForAdmin()
  const before = findUnifiedRole(matrix, roleId, input.scope)
  let actorUserId: string
  let auditTenantId = before.tenantId
  let assignableCapabilities: ReadonlySet<string>

  if (input.scope === 'platform') {
    const platformContext = await loadUnifiedMatrixForPlatformAdmin()

    if (platformContext.platformRoleId === roleId) {
      throw UsersError.invalidTransition('No puedes modificar las capacidades del rol de tu propia sesión.')
    }

    assignableCapabilities = platformContext.platformCapabilities
    await validateUnifiedRoleCapabilities(matrix, input.scope, input.capabilityKeys, assignableCapabilities)
    await replacePlatformAccessRoleCapabilities(platformContext.client, roleId, input.capabilityKeys, input.updatedAt)
    actorUserId = platformContext.userId
    auditTenantId = null
  } else {
    const platformManagesTenantCapabilities =
      platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage) ||
      platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)

    if (input.scope === 'global_tenant' && !platformManagesTenantCapabilities) {
      throw UsersError.forbidden(PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage)
    }

    if (platformManagesTenantCapabilities) {
      const managementCapability = platformCapabilities.has(PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage)
        ? PLATFORM_ACCESS_CAPABILITIES.capabilitiesManage
        : PLATFORM_ACCESS_CAPABILITIES.tenantRolesManage

      const principal = await requirePlatformUsersPrincipal(managementCapability)

      assignableCapabilities = new Set(matrix.capabilities.map(capability => capability.key))

      const capabilityKeys = await validateUnifiedRoleCapabilities(
        matrix,
        input.scope,
        input.capabilityKeys,
        assignableCapabilities
      )

      await replaceUnifiedTenantAccessRoleCapabilities(principal.client, roleId, capabilityKeys, input.updatedAt)
      actorUserId = principal.userId
    } else {
      const principal = await requireUsersPrincipal(CAPABILITIES.accessManage, before.tenantId ?? undefined)

      if (before.scope !== 'tenant' || before.tenantId !== principal.tenantId) {
        throw UsersError.notFound()
      }

      if (principal.roleId === roleId) {
        throw UsersError.invalidTransition('No puedes modificar las capacidades del rol de tu propia sesión.')
      }

      assignableCapabilities = await getEffectiveCapabilities(principal.tenantId)

      const capabilityKeys = await validateUnifiedRoleCapabilities(
        matrix,
        input.scope,
        input.capabilityKeys,
        assignableCapabilities
      )

      await replaceTenantRoleCapabilities(principal.client, roleId, capabilityKeys, input.updatedAt)
      actorUserId = principal.userId
      auditTenantId = principal.tenantId
    }
  }

  await recordAuditEntry({
    tenantId: auditTenantId,
    actorUserId,
    action: 'access.role.permissions.updated',
    entityType: 'role',
    entityId: roleId,
    before: {
      scope: before.scope,
      capabilityKeys: matrix.assignments
        .filter(assignment => assignment.roleId === roleId)
        .map(assignment => assignment.capabilityKey)
    },
    after: { scope: before.scope, capabilityKeys: input.capabilityKeys }
  })

  return listUnifiedPermissionMatrixForAdmin()
}

export async function createTenantAccessRole(input: CreateRoleRequest): Promise<TenantRoleAdminSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessManage)
  const systemRoleKeys = new Set<string>(SYSTEM_ROLE_KEYS)

  if (systemRoleKeys.has(input.key)) {
    throw UsersError.validation('Las claves de los roles del sistema están reservadas.')
  }

  const role = await createTenantRole(principal.client, principal.tenantId, input.key, input.name)

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action: 'access.role.created',
    entityType: 'role',
    entityId: role.id,
    after: { key: role.key, name: role.name, isActive: role.is_active }
  })

  return {
    id: role.id,
    scope: 'tenant',
    tenantId: role.tenant_id,
    tenantName: null,
    key: role.key,
    name: role.name,
    isSystem: role.is_system,
    isActive: role.is_active,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
    memberCount: 0,
    capabilityCount: 0
  }
}

export async function updateTenantAccessRole(roleId: string, input: PatchRoleRequest): Promise<TenantRoleAdminSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessManage)
  const before = await getTenantRoleById(principal.client, principal.tenantId, roleId)

  if (!before) {
    throw UsersError.notFound()
  }

  if (before.is_system || before.tenant_id !== principal.tenantId) {
    throw UsersError.invalidTransition('Los roles del sistema no pueden modificarse desde un tenant.')
  }

  if (input.isActive === false && before.is_active) {
    const assignedMembers = await countActiveMembersWithRole(principal.client, principal.tenantId, roleId)

    if (assignedMembers > 0) {
      throw UsersError.invalidTransition('No se puede desactivar un rol que tiene miembros activos asignados.')
    }

    if (principal.roleId === roleId) {
      throw UsersError.invalidTransition('No puedes desactivar el rol de tu propia sesión.')
    }
  }

  const after = await updateTenantRole(principal.client, {
    tenantId: principal.tenantId,
    roleId,
    name: input.name,
    isActive: input.isActive,
    expectedUpdatedAt: input.updatedAt
  })

  const matrix = await listTenantPermissionMatrix(principal.client, principal.tenantId)
  const summary = matrix.roles.find(role => role.id === after.id)

  if (!summary) {
    throw UsersError.notFound()
  }

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action: 'access.role.updated',
    entityType: 'role',
    entityId: roleId,
    before: { name: before.name, isActive: before.is_active },
    after: { name: after.name, isActive: after.is_active }
  })

  return summary
}

async function validateAssignableRoleCapabilities(
  principal: Awaited<ReturnType<typeof requireUsersPrincipal>>,
  capabilityKeys: string[]
): Promise<CapabilityKey[]> {
  const matrix = await listTenantPermissionMatrix(principal.client, principal.tenantId)
  const available = new Set(matrix.capabilities.map(capability => capability.key))
  const normalizedKeys = Array.from(new Set(capabilityKeys))

  const invalidKeys = normalizedKeys.filter(
    key => !available.has(key) || !isCapabilityKey(key) || isPlatformCapabilityKey(key)
  )

  if (invalidKeys.length > 0) {
    throw UsersError.validation('La matriz contiene capacidades no administrables.', { capabilities: invalidKeys })
  }

  const effectiveCapabilities = await getEffectiveCapabilities(principal.tenantId)
  const typedKeys = normalizedKeys.filter(isCapabilityKey)
  const unassignableKeys = typedKeys.filter(key => !effectiveCapabilities.has(key))

  if (unassignableKeys.length > 0) {
    throw UsersError.capabilityNotAssignable(unassignableKeys)
  }

  return typedKeys
}

export async function replaceTenantAccessRolePermissions(
  roleId: string,
  input: ReplaceRolePermissionsRequest
): Promise<TenantPermissionMatrix> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessManage)
  const before = await getTenantRoleById(principal.client, principal.tenantId, roleId)

  if (!before) {
    throw UsersError.notFound()
  }

  if (before.is_system || before.tenant_id !== principal.tenantId || !before.is_active) {
    throw UsersError.invalidTransition('Solo se pueden editar permisos de roles personalizados activos.')
  }

  const capabilityKeys = await validateAssignableRoleCapabilities(principal, input.capabilityKeys)

  if (principal.roleId === roleId && !capabilityKeys.includes(CAPABILITIES.accessManage)) {
    throw UsersError.invalidTransition('No puedes retirar access.manage del rol de tu propia sesión.')
  }

  const matrixBefore = await listTenantPermissionMatrix(principal.client, principal.tenantId)

  const previousCapabilities = matrixBefore.assignments
    .filter(assignment => assignment.roleId === roleId)
    .map(assignment => assignment.capabilityKey)

  await replaceTenantRoleCapabilities(principal.client, roleId, capabilityKeys, input.updatedAt)

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action: 'access.role.permissions.updated',
    entityType: 'role',
    entityId: roleId,
    before: { capabilityKeys: previousCapabilities },
    after: { capabilityKeys }
  })

  return listTenantPermissionMatrix(principal.client, principal.tenantId)
}

async function assertNotLastOwner(
  client: Awaited<ReturnType<typeof requireUsersPrincipal>>['client'],
  tenantId: string,
  membershipId: string
): Promise<void> {
  const current = await getMemberById(client, tenantId, membershipId)

  if (!current || current.status !== 'active') {
    return
  }

  const ownerRole = await findRoleByKey(client, tenantId, OWNER_ROLE_KEY)

  if (!ownerRole || current.role_id !== ownerRole.id) {
    return
  }

  const activeOwners = await countActiveMembersWithRole(client, tenantId, ownerRole.id)

  if (activeOwners <= 1) {
    throw UsersError.lastOwnerProtected()
  }
}

export async function updateTenantMemberRole(
  membershipId: string,
  input: PatchUserRequest
): Promise<TenantMemberSummary> {
  const principal = await requireUsersPrincipal(CAPABILITIES.update)

  const before = await getMemberSummary(principal.client, principal.tenantId, membershipId)

  if (!before) {
    throw UsersError.notFound()
  }

  const role = await findRoleByKey(principal.client, principal.tenantId, input.roleKey)

  if (!role) {
    throw UsersError.validation('El rol indicado no existe en este tenant.', { roleKey: input.roleKey })
  }

  if (role.id !== before.roleId) {
    await assertNotLastOwner(principal.client, principal.tenantId, membershipId)
  }

  await updateMemberRole(principal.client, {
    tenantId: principal.tenantId,
    membershipId,
    roleId: role.id,
    expectedUpdatedAt: input.updatedAt
  })

  const after = await getMemberSummary(principal.client, principal.tenantId, membershipId)

  if (!after) {
    throw UsersError.notFound()
  }

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action: 'users.role.updated',
    entityType: 'membership',
    entityId: membershipId,
    before: { roleKey: before.roleKey },
    after: { roleKey: after.roleKey }
  })

  return after
}

async function transitionMemberStatus(
  membershipId: string,
  input: DisableEnableRequest,
  nextStatus: 'active' | 'suspended',
  capability: (typeof CAPABILITIES)['disable'],
  action: string
): Promise<TenantMemberSummary> {
  const principal = await requireUsersPrincipal(capability)

  const before = await getMemberById(principal.client, principal.tenantId, membershipId)

  if (!before) {
    throw UsersError.notFound()
  }

  if (before.status === nextStatus) {
    throw UsersError.invalidTransition(`El miembro ya se encuentra en estado "${nextStatus}".`)
  }

  if (before.status !== 'active' && before.status !== 'suspended') {
    throw UsersError.invalidTransition('Solo se puede habilitar o deshabilitar una membresía activa o suspendida.')
  }

  if (nextStatus === 'suspended') {
    await assertNotLastOwner(principal.client, principal.tenantId, membershipId)
  }

  await setMemberStatus(principal.client, {
    tenantId: principal.tenantId,
    membershipId,
    nextStatus,
    expectedUpdatedAt: input.updatedAt
  })

  const after = await getMemberSummary(principal.client, principal.tenantId, membershipId)

  if (!after) {
    throw UsersError.notFound()
  }

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action,
    entityType: 'membership',
    entityId: membershipId,
    before: { status: before.status },
    after: { status: after.status },
    metadata: input.reason ? { reason: input.reason } : null
  })

  return after
}

export async function disableTenantMember(
  membershipId: string,
  input: DisableEnableRequest
): Promise<TenantMemberSummary> {
  return transitionMemberStatus(membershipId, input, 'suspended', CAPABILITIES.disable, 'users.member.disabled')
}

export async function enableTenantMember(
  membershipId: string,
  input: DisableEnableRequest
): Promise<TenantMemberSummary> {
  return transitionMemberStatus(membershipId, input, 'active', CAPABILITIES.disable, 'users.member.enabled')
}

export async function getTenantMemberCapabilities(membershipId: string): Promise<TenantMemberDetail> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessRead)
  const detail = await getMemberDetail(principal.client, principal.tenantId, membershipId)

  if (!detail) {
    throw UsersError.notFound()
  }

  return detail
}

export async function patchTenantMemberCapabilities(
  membershipId: string,
  input: PatchCapabilitiesRequest
): Promise<TenantMemberDetail> {
  const principal = await requireUsersPrincipal(CAPABILITIES.accessManage)

  const existing = await getMemberById(principal.client, principal.tenantId, membershipId)

  if (!existing) {
    throw UsersError.notFound()
  }

  const before = await getMemberDetail(principal.client, principal.tenantId, membershipId)

  for (const override of input.overrides) {
    await upsertCapabilityOverride(principal.client, {
      membershipId,
      capabilityKey: override.capabilityKey,
      effect: override.effect,
      reason: override.reason,
      actorUserId: principal.userId
    })
  }

  const after = await getMemberDetail(principal.client, principal.tenantId, membershipId)

  if (!after) {
    throw UsersError.notFound()
  }

  await recordAuditEntry({
    tenantId: principal.tenantId,
    actorUserId: principal.userId,
    action: 'users.capabilities.overridden',
    entityType: 'membership',
    entityId: membershipId,

    // EffectiveCapabilityEntry is a concrete interface without an index
    // signature, so it does not structurally satisfy `Json` on its own —
    // bridge through `unknown`, mirroring the same pattern used for
    // `InvestigationState` in src/lib/investigations/service.ts. The overrides
    // being audited are already validated, non-sensitive metadata (capability
    // keys/effects), never secrets or PII.
    before: before
      ? ({ capabilities: before.capabilities.filter(entry => entry.source !== 'role') } as unknown as Json)
      : null,
    after: { capabilities: after.capabilities.filter(entry => entry.source !== 'role') } as unknown as Json,
    metadata: { overrides: input.overrides.map(o => ({ capabilityKey: o.capabilityKey, effect: o.effect })) }
  })

  return after
}
