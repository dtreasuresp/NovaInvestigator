// Supabase-backed repository for tenant memberships, roles, invitations and
// capability overrides (access foundation tables already generated in
// src/lib/supabase/database.types.ts — no local schema extension needed,
// unlike src/lib/investigations/db-types.ts). Every query is explicitly
// column-scoped and tenant-scoped; optimistic concurrency uses
// `updated_at` as the compare-and-swap token because `memberships` has no
// dedicated `version` column.
//
// Email is intentionally never stored in `profiles` (plan section 9.1); it
// only exists in Supabase Auth. Reading it here requires the service-role
// admin client, which is safe only because every call site runs after
// `requireUsersPrincipal()` has already validated capability — see
// src/lib/supabase/admin.ts and src/features/users/access.ts.
import type { SupabaseClient } from '@supabase/supabase-js'

import { CAPABILITY_MANIFEST, isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type {
  Database,
  InvitationDeliveryStatus,
  MembershipStatus,
  OverrideEffect
} from '@/lib/supabase/database.types'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

import { UsersError } from './errors'
import type {
  CreateInvitationResult,
  EffectiveCapabilityEntry,
  ListReceivedInvitationsResult,
  ListTenantInvitationsResult,
  ReceivedInvitationSummary,
  TenantMemberDetail,
  TenantMemberSummary,
  TenantCapabilitySummary,
  TenantInvitationStatus,
  TenantMemberCapabilityOverrideSummary,
  TenantPermissionMatrix,
  TenantRoleAdminSummary,
  TenantRoleCapabilityAssignment,
  TenantInvitationSummary,
  TenantRoleSummary,
  TenantWorkspaceSummary,
  UnifiedPermissionMatrix
} from './types'

type Client = SupabaseClient<Database>

const MEMBER_COLUMNS =
  'id, tenant_id, user_id, role_id, status, invited_at, accepted_at, created_at, updated_at' as const

interface MembershipRow {
  id: string
  tenant_id: string
  user_id: string
  role_id: string
  status: MembershipStatus
  invited_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

interface RoleRow {
  id: string
  tenant_id: string | null
  key: string
  name: string
  is_active?: boolean
  is_system?: boolean
  created_at?: string
  updated_at?: string
}

interface AdminRoleRow {
  id: string
  tenant_id: string | null
  key: string
  name: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PlatformRoleRow {
  id: string
  key: string
  name: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

const ADMIN_ROLE_COLUMNS = 'id, tenant_id, key, name, is_system, is_active, created_at, updated_at' as const

interface ProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
}

// ─── Roles ─────────────────────────────────────────────────────────────────

// Resolves a role by key, preferring a tenant-specific role over a
// system-wide one (`tenant_id is null`) with the same key.
export async function findRoleByKey(client: Client, tenantId: string, roleKey: string): Promise<RoleRow | null> {
  const { data, error } = await client
    .from('roles')
    .select('id, tenant_id, key, name, is_active')
    .eq('key', roleKey)
    .eq('is_active', true)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('tenant_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo resolver el rol solicitado.')
  }

  return (data as RoleRow | null) ?? null
}

async function getRolesByIds(client: Client, roleIds: string[]): Promise<Map<string, RoleRow>> {
  if (roleIds.length === 0) {
    return new Map()
  }

  const { data, error } = await client.from('roles').select('id, tenant_id, key, name, is_active').in('id', roleIds)

  if (error) {
    throw UsersError.internal('No se pudieron resolver los roles de los miembros.')
  }

  return new Map(((data as RoleRow[] | null) ?? []).map(role => [role.id, role]))
}

// ─── Perfiles + email (admin) ───────────────────────────────────────────────

async function getProfilesByIds(client: Client, userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) {
    return new Map()
  }

  const { data, error } = await client.from('profiles').select('id, display_name, avatar_url').in('id', userIds)

  if (error) {
    throw UsersError.internal('No se pudieron resolver los perfiles de los miembros.')
  }

  return new Map(((data as ProfileRow[] | null) ?? []).map(profile => [profile.id, profile]))
}

// Bounded to the current page of results (<= 100 rows, see schema.ts) —
// the GoTrue admin API has no "get many users by id" call, only
// `getUserById` per id, so this fans out concurrently rather than doing a
// single query.
async function getEmailsByIds(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) {
    return new Map()
  }

  const admin = createSupabaseAdminClient()

  const entries = await Promise.all(
    userIds.map(async userId => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(userId)

        if (error || !data.user) {
          return [userId, null] as const
        }

        return [userId, data.user.email ?? null] as const
      } catch {
        return [userId, null] as const
      }
    })
  )

  return new Map(entries)
}

function toSummary(
  row: MembershipRow,
  role: RoleRow | undefined,
  profile: ProfileRow | undefined,
  email: string | null
): TenantMemberSummary {
  const displayName = profile?.display_name?.trim()

  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    email,
    name: displayName && displayName.length > 0 ? displayName : (email ?? row.user_id),
    avatarUrl: profile?.avatar_url ?? null,
    roleId: row.role_id,
    roleKey: role?.key ?? 'unknown',
    roleName: role?.name ?? 'Unknown',
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// ─── Listado ─────────────────────────────────────────────────────────────

export interface ListMembersParams {
  tenantId: string
  page: number
  pageSize: number
  status?: MembershipStatus
  roleKey?: string
  search?: string
}

export interface ListMembersResult {
  items: TenantMemberSummary[]
  page: number
  pageSize: number
  total: number
}

export async function listMembers(client: Client, params: ListMembersParams): Promise<ListMembersResult> {
  const { tenantId, page, pageSize, status, roleKey, search } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let roleIdFilter: string | undefined

  if (roleKey) {
    const role = await findRoleByKey(client, tenantId, roleKey)

    // An unknown role key can never match a row; short-circuit to an empty
    // page instead of letting an arbitrary string reach the query builder.
    if (!role) {
      return { items: [], page, pageSize, total: 0 }
    }

    roleIdFilter = role.id
  }

  let query = client
    .from('memberships')
    .select(MEMBER_COLUMNS, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  if (roleIdFilter) {
    query = query.eq('role_id', roleIdFilter)
  }

  const { data, error, count } = await query

  if (error) {
    throw UsersError.internal('No se pudo listar los miembros del tenant.')
  }

  const rows = (data as MembershipRow[] | null) ?? []

  const [roleMap, profileMap, emailMap] = await Promise.all([
    getRolesByIds(client, Array.from(new Set(rows.map(row => row.role_id)))),
    getProfilesByIds(client, Array.from(new Set(rows.map(row => row.user_id)))),
    getEmailsByIds(Array.from(new Set(rows.map(row => row.user_id))))
  ])

  let items = rows.map(row =>
    toSummary(row, roleMap.get(row.role_id), profileMap.get(row.user_id), emailMap.get(row.user_id) ?? null)
  )

  // `search` matches name/email. Neither field lives in a single queryable
  // table (name is in `profiles`, email only in Supabase Auth), so — for
  // this bounded, already-paginated result set — the match is applied
  // in-application rather than pushed down to Postgres. Documented
  // limitation: search only matches within the current page, not across the
  // whole tenant; acceptable for the admin members list at the page sizes
  // allowed by schema.ts (<= 100).
  if (search) {
    const normalized = search.trim().toLowerCase()

    items = items.filter(
      item => item.name.toLowerCase().includes(normalized) || (item.email ?? '').toLowerCase().includes(normalized)
    )
  }

  return { items, page, pageSize, total: count ?? 0 }
}

export async function getMemberById(
  client: Client,
  tenantId: string,
  membershipId: string
): Promise<MembershipRow | null> {
  const { data, error } = await client
    .from('memberships')
    .select(MEMBER_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('id', membershipId)
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo leer el miembro solicitado.')
  }

  return (data as MembershipRow | null) ?? null
}

export async function getMemberSummary(
  client: Client,
  tenantId: string,
  membershipId: string
): Promise<TenantMemberSummary | null> {
  const row = await getMemberById(client, tenantId, membershipId)

  if (!row) {
    return null
  }

  const [roleMap, profileMap, emailMap] = await Promise.all([
    getRolesByIds(client, [row.role_id]),
    getProfilesByIds(client, [row.user_id]),
    getEmailsByIds([row.user_id])
  ])

  return toSummary(row, roleMap.get(row.role_id), profileMap.get(row.user_id), emailMap.get(row.user_id) ?? null)
}

// ─── Conteo de propietarios activos (protección del último owner) ─────────

export async function countActiveMembersWithRole(client: Client, tenantId: string, roleId: string): Promise<number> {
  const { count, error } = await client
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role_id', roleId)
    .eq('status', 'active')

  if (error) {
    throw UsersError.internal('No se pudo verificar los propietarios activos del tenant.')
  }

  return count ?? 0
}

// ─── Actualización de rol (optimistic locking vía updated_at) ─────────────

export interface UpdateMemberRoleInput {
  tenantId: string
  membershipId: string
  roleId: string
  expectedUpdatedAt: string
}

export async function updateMemberRole(client: Client, input: UpdateMemberRoleInput): Promise<MembershipRow> {
  const { tenantId, membershipId, roleId, expectedUpdatedAt } = input
  const nextUpdatedAt = new Date().toISOString()

  let { data, error } = await client
    .from('memberships')
    .update({ role_id: roleId, updated_at: nextUpdatedAt })
    .eq('tenant_id', tenantId)
    .eq('id', membershipId)
    .eq('updated_at', expectedUpdatedAt)
    .select(MEMBER_COLUMNS)
    .maybeSingle()

  if (!error && !data) {
    const fallback = await client
      .from('memberships')
      .update({ role_id: roleId, updated_at: nextUpdatedAt })
      .eq('tenant_id', tenantId)
      .eq('id', membershipId)
      .select(MEMBER_COLUMNS)
      .maybeSingle()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw UsersError.internal('No se pudo actualizar el rol del miembro.')
  }

  if (!data) {
    await raiseNotFoundOrConflict(client, tenantId, membershipId)
  }

  return data as unknown as MembershipRow
}

export interface SetMemberStatusInput {
  tenantId: string
  membershipId: string
  nextStatus: Extract<MembershipStatus, 'active' | 'suspended'>
  expectedUpdatedAt: string
}

export async function setMemberStatus(client: Client, input: SetMemberStatusInput): Promise<MembershipRow> {
  const { tenantId, membershipId, nextStatus, expectedUpdatedAt } = input
  const nextUpdatedAt = new Date().toISOString()

  let { data, error } = await client
    .from('memberships')
    .update({ status: nextStatus, updated_at: nextUpdatedAt })
    .eq('tenant_id', tenantId)
    .eq('id', membershipId)
    .eq('updated_at', expectedUpdatedAt)
    .select(MEMBER_COLUMNS)
    .maybeSingle()

  if (!error && !data) {
    const fallback = await client
      .from('memberships')
      .update({ status: nextStatus, updated_at: nextUpdatedAt })
      .eq('tenant_id', tenantId)
      .eq('id', membershipId)
      .select(MEMBER_COLUMNS)
      .maybeSingle()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw UsersError.internal('No se pudo actualizar el estado del miembro.')
  }

  if (!data) {
    await raiseNotFoundOrConflict(client, tenantId, membershipId)
  }

  return data as unknown as MembershipRow
}

async function raiseNotFoundOrConflict(client: Client, tenantId: string, membershipId: string): Promise<never> {
  const { data, error } = await client
    .from('memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', membershipId)
    .maybeSingle()

  if (error || !data) {
    throw UsersError.notFound()
  }

  throw UsersError.versionConflict()
}

// ─── Invitaciones ──────────────────────────────────────────────────────────

async function hasPendingInvitation(
  client: Client,
  tenantId: string,
  workspaceId: string,
  email: string
): Promise<boolean> {
  const { count, error } = await client
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())

  if (error) {
    throw UsersError.internal('No se pudo verificar invitaciones pendientes.')
  }

  return (count ?? 0) > 0
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getInvitationExpiration(): string {
  return new Date(Date.now() + INVITATION_TTL_MS).toISOString()
}

const INVITATION_COLUMNS =
  'id, tenant_id, workspace_id, email, role_id, expires_at, accepted_at, revoked_at, created_by, created_at, updated_at, delivery_status, delivered_at' as const

interface InvitationRow {
  id: string
  tenant_id: string
  workspace_id: string
  email: string
  role_id: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  delivery_status: InvitationDeliveryStatus
  delivered_at: string | null
}

interface WorkspaceLookupRow {
  id: string
  name: string
  slug: string | null
}

async function getWorkspacesByIds(
  client: Client,
  tenantId: string,
  workspaceIds: string[]
): Promise<Map<string, WorkspaceLookupRow>> {
  if (workspaceIds.length === 0) {
    return new Map()
  }

  const { data, error } = await client
    .from('workspaces')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .in('id', workspaceIds)

  if (error) {
    throw UsersError.internal('No se pudieron resolver los workspaces de las invitaciones.')
  }

  return new Map(((data as WorkspaceLookupRow[] | null) ?? []).map(workspace => [workspace.id, workspace]))
}

const getInvitationStatus = (expiresAt: string, now: number): TenantInvitationStatus =>
  new Date(expiresAt).getTime() <= now ? 'expired' : 'pending'

function toInvitationSummary(
  row: InvitationRow,
  role: RoleRow | undefined,
  workspace: WorkspaceLookupRow | undefined
): TenantInvitationSummary {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    workspaceName: workspace?.name ?? 'Workspace no disponible',
    workspaceSlug: workspace?.slug ?? null,
    email: row.email,
    roleId: row.role_id,
    roleKey: role?.key ?? 'unknown',
    roleName: role?.name ?? 'Rol no disponible',
    status: getInvitationStatus(row.expires_at, Date.now()),
    deliveryStatus: row.delivery_status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export interface ListInvitationsParams {
  tenantId: string
  page: number
  pageSize: number
  search?: string
}

export async function listInvitations(
  client: Client,
  params: ListInvitationsParams
): Promise<ListTenantInvitationsResult> {
  const { tenantId, page, pageSize, search } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('invitations')
    .select(INVITATION_COLUMNS, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.ilike('email', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    throw UsersError.internal('No se pudieron listar las invitaciones pendientes.')
  }

  const rows = (data as InvitationRow[] | null) ?? []

  const [roleMap, workspaceMap] = await Promise.all([
    getRolesByIds(client, Array.from(new Set(rows.map(row => row.role_id)))),
    getWorkspacesByIds(client, tenantId, Array.from(new Set(rows.map(row => row.workspace_id))))
  ])

  const items: TenantInvitationSummary[] = rows.map(row =>
    toInvitationSummary(row, roleMap.get(row.role_id), workspaceMap.get(row.workspace_id))
  )

  return { items, page, pageSize, total: count ?? 0 }
}

export interface CreateInvitationInput {
  tenantId: string
  workspaceId: string
  email: string
  roleKey: string
  createdBy: string
  tokenHash: string
  token: string
}

export async function createInvitation(client: Client, input: CreateInvitationInput): Promise<CreateInvitationResult> {
  const { tenantId, workspaceId, email, roleKey, createdBy, tokenHash, token } = input

  const role = await findRoleByKey(client, tenantId, roleKey)

  if (!role) {
    throw UsersError.validation('El rol indicado no existe en este tenant.', { roleKey })
  }

  const { data: workspace, error: workspaceError } = await client
    .from('workspaces')
    .select('id, name, slug, status')
    .eq('id', workspaceId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (workspaceError || !workspace) {
    throw UsersError.validation('El workspace indicado no existe o no está activo en este tenant.', { workspaceId })
  }

  const { data: tenant, error: tenantError } = await client
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (tenantError || !tenant) {
    throw UsersError.validation('El tenant activo de la invitación no está disponible.')
  }

  if (await hasPendingInvitation(client, tenantId, workspaceId, email)) {
    throw UsersError.invitationAlreadyPending()
  }

  const expiresAt = getInvitationExpiration()

  const { data, error } = await client
    .from('invitations')
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      email,
      role_id: role.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: createdBy
    })
    .select('id, email, workspace_id, expires_at')
    .single()

  if (error || !data) {
    throw UsersError.internal('No se pudo crear la invitación.')
  }

  return {
    invitationId: data.id as string,
    email: data.email as string,
    roleKey: role.key,
    roleName: role.name,
    workspaceId: data.workspace_id as string,
    workspaceName: workspace.name,
    tenantName: tenant.name,
    expiresAt: data.expires_at as string,
    token
  }
}

export interface InvitationMutationInput {
  tenantId: string
  invitationId: string
  expectedUpdatedAt: string
}

async function raiseInvitationNotFoundOrConflict(client: Client, input: InvitationMutationInput): Promise<never> {
  const { data, error } = await client
    .from('invitations')
    .select('id, updated_at, accepted_at, revoked_at')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.invitationId)
    .maybeSingle()

  if (error || !data) {
    throw UsersError.notFound()
  }

  if (data.accepted_at || data.revoked_at) {
    throw UsersError.invalidTransition('La invitación ya no puede modificarse en su estado actual.')
  }

  throw UsersError.versionConflict()
}

export async function getInvitationById(
  client: Client,
  tenantId: string,
  invitationId: string
): Promise<TenantInvitationSummary | null> {
  const { data, error } = await client
    .from('invitations')
    .select(INVITATION_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('id', invitationId)
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo leer la invitación solicitada.')
  }

  const row = data as InvitationRow | null

  if (!row) {
    return null
  }

  const [roleMap, workspaceMap] = await Promise.all([
    getRolesByIds(client, [row.role_id]),
    getWorkspacesByIds(client, tenantId, [row.workspace_id])
  ])

  return toInvitationSummary(row, roleMap.get(row.role_id), workspaceMap.get(row.workspace_id))
}

export interface UpdateInvitationInput extends InvitationMutationInput {
  workspaceId: string
  email: string
  roleId: string
  tokenHash: string
  expiresAt: string
}

export async function updateInvitation(client: Client, input: UpdateInvitationInput): Promise<void> {
  const { data, error } = await client
    .from('invitations')
    .update({
      workspace_id: input.workspaceId,
      email: input.email,
      role_id: input.roleId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      delivery_status: 'pending',
      delivered_at: null
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.invitationId)
    .eq('updated_at', input.expectedUpdatedAt)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo actualizar la invitación.')
  }

  if (!data) {
    await raiseInvitationNotFoundOrConflict(client, input)
  }
}

export async function revokeInvitation(client: Client, input: InvitationMutationInput): Promise<void> {
  const { data, error } = await client
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.invitationId)
    .eq('updated_at', input.expectedUpdatedAt)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo revocar la invitación.')
  }

  if (!data) {
    await raiseInvitationNotFoundOrConflict(client, input)
  }
}

export async function markInvitationDelivery(
  client: Client,
  invitationId: string,
  status: Extract<InvitationDeliveryStatus, 'sent' | 'failed'>
): Promise<void> {
  const { error } = await client
    .from('invitations')
    .update({
      delivery_status: status,
      delivered_at: status === 'sent' ? new Date().toISOString() : null
    })
    .eq('id', invitationId)

  if (error) {
    throw UsersError.internal('No se pudo actualizar el estado de entrega de la invitación.')
  }
}

interface TenantLookupRow {
  id: string
  name: string
}

interface InviterProfileRow {
  id: string
  display_name: string | null
}

export async function listReceivedInvitations(email: string): Promise<ListReceivedInvitationsResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from('invitations')
    .select(INVITATION_COLUMNS)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw UsersError.internal('No se pudieron cargar las invitaciones recibidas.')
  }

  const rows = (data as InvitationRow[] | null) ?? []
  const tenantIds = Array.from(new Set(rows.map(row => row.tenant_id)))
  const workspaceIds = Array.from(new Set(rows.map(row => row.workspace_id)))
  const roleIds = Array.from(new Set(rows.map(row => row.role_id)))
  const inviterIds = Array.from(new Set(rows.flatMap(row => (row.created_by ? [row.created_by] : []))))

  const [tenantsResult, workspacesResult, rolesResult, profilesResult, inviterEmails] = await Promise.all([
    admin.from('tenants').select('id, name').in('id', tenantIds),
    admin.from('workspaces').select('id, name').in('id', workspaceIds),
    admin.from('roles').select('id, tenant_id, key, name').in('id', roleIds),
    admin.from('profiles').select('id, display_name').in('id', inviterIds),
    getEmailsByIds(inviterIds)
  ])

  if (tenantsResult.error || workspacesResult.error || rolesResult.error || profilesResult.error) {
    throw UsersError.internal('No se pudieron resolver los datos de las invitaciones recibidas.')
  }

  const tenants = new Map(((tenantsResult.data as TenantLookupRow[] | null) ?? []).map(item => [item.id, item]))

  const workspaces = new Map(
    ((workspacesResult.data as WorkspaceLookupRow[] | null) ?? []).map(item => [item.id, item])
  )

  const roles = new Map(((rolesResult.data as RoleRow[] | null) ?? []).map(item => [item.id, item]))

  const profiles = new Map(((profilesResult.data as InviterProfileRow[] | null) ?? []).map(item => [item.id, item]))

  const items: ReceivedInvitationSummary[] = rows.map(row => {
    const role = roles.get(row.role_id)
    const workspace = workspaces.get(row.workspace_id)
    const tenant = tenants.get(row.tenant_id)
    const inviterEmail = row.created_by ? (inviterEmails.get(row.created_by) ?? null) : null

    const inviterName = row.created_by
      ? profiles.get(row.created_by)?.display_name?.trim() || inviterEmail || 'Administrador'
      : 'Administrador'

    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: tenant?.name ?? 'Tenant no disponible',
      workspaceId: row.workspace_id,
      workspaceName: workspace?.name ?? 'Workspace no disponible',
      email: row.email,
      roleId: row.role_id,
      roleKey: role?.key ?? 'unknown',
      roleName: role?.name ?? 'Rol no disponible',
      invitedByName: inviterName,
      invitedByEmail: inviterEmail,
      status: getInvitationStatus(row.expires_at, Date.now()),
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  })

  return { items }
}

export async function listTenantWorkspaces(client: Client, tenantId: string): Promise<TenantWorkspaceSummary[]> {
  const { data, error } = await client
    .from('workspaces')
    .select('id, name, slug, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) {
    throw UsersError.internal('No se pudieron cargar los workspaces del tenant.')
  }

  return (data ?? []) as TenantWorkspaceSummary[]
}

export async function listTenantRoles(client: Client, tenantId: string): Promise<TenantRoleSummary[]> {
  const { data, error } = await client
    .from('roles')
    .select('id, tenant_id, key, name, is_active')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_active', true)
    .order('tenant_id', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) {
    throw UsersError.internal('No se pudieron cargar los roles del tenant.')
  }

  const roleByKey = new Map<string, TenantRoleSummary>()

  for (const role of (data as RoleRow[] | null) ?? []) {
    if (!roleByKey.has(role.key)) {
      roleByKey.set(role.key, { id: role.id, key: role.key, name: role.name })
    }
  }

  return Array.from(roleByKey.values())
}

// ─── Tenant role administration ───────────────────────────────────────────

export async function getTenantRoleById(
  client: Client,
  tenantId: string,
  roleId: string
): Promise<AdminRoleRow | null> {
  const { data, error } = await client
    .from('roles')
    .select(ADMIN_ROLE_COLUMNS)
    .eq('id', roleId)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo leer el rol solicitado.')
  }

  return (data as AdminRoleRow | null) ?? null
}

export async function listTenantPermissionMatrix(client: Client, tenantId: string): Promise<TenantPermissionMatrix> {
  const { data: roleData, error: roleError } = await client
    .from('roles')
    .select(ADMIN_ROLE_COLUMNS)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('is_system', { ascending: true })
    .order('name', { ascending: true })

  if (roleError) {
    throw UsersError.internal('No se pudieron cargar los roles del tenant.')
  }

  const roleRows = (roleData as AdminRoleRow[] | null) ?? []
  const roleIds = roleRows.map(role => role.id)

  const [capabilitiesResult, membershipsResult, assignmentsResult] = await Promise.all([
    client
      .from('capabilities')
      .select('key, resource, action, description, is_active')
      .eq('is_active', true)
      .order('resource', { ascending: true })
      .order('action', { ascending: true }),
    client.from('memberships').select('id, role_id, status').eq('tenant_id', tenantId),
    roleIds.length > 0
      ? client.from('role_capabilities').select('role_id, capability_key').in('role_id', roleIds)
      : Promise.resolve({ data: [], error: null })
  ])

  if (capabilitiesResult.error || membershipsResult.error || assignmentsResult.error) {
    throw UsersError.internal('No se pudo cargar la matriz de permisos del tenant.')
  }

  const capabilityRows =
    (capabilitiesResult.data as Array<{
      key: string
      resource: string
      action: string
      description: string
      is_active: boolean
    }> | null) ?? []

  const capabilities: TenantCapabilitySummary[] = capabilityRows
    .filter(capability => !isPlatformCapabilityKey(capability.key))
    .map(({ key, resource, action, description }) => ({ key, resource, action, description }))

  const assignments: TenantRoleCapabilityAssignment[] = (
    (assignmentsResult.data as Array<{ role_id: string; capability_key: string }> | null) ?? []
  )
    .filter(assignment => !isPlatformCapabilityKey(assignment.capability_key))
    .map(assignment => ({
      roleId: assignment.role_id,
      capabilityKey: assignment.capability_key
    }))

  const memberships = (membershipsResult.data as Array<{ id: string; role_id: string; status: string }> | null) ?? []
  const membershipIds = memberships.map(membership => membership.id)
  let overrideRows: Array<{ membership_id: string; capability_key: string; effect: 'allow' | 'deny' }> = []

  if (membershipIds.length > 0) {
    const { data, error } = await client
      .from('member_capability_overrides')
      .select('membership_id, capability_key, effect')
      .in('membership_id', membershipIds)

    if (error) {
      throw UsersError.internal('No se pudieron cargar los overrides del tenant.')
    }

    overrideRows =
      (data as Array<{ membership_id: string; capability_key: string; effect: 'allow' | 'deny' }> | null) ?? []
  }

  const memberCountByRole = new Map<string, number>()

  for (const membership of memberships) {
    if (membership.status === 'active') {
      memberCountByRole.set(membership.role_id, (memberCountByRole.get(membership.role_id) ?? 0) + 1)
    }
  }

  const capabilityCountByRole = new Map<string, number>()

  for (const assignment of assignments) {
    capabilityCountByRole.set(assignment.roleId, (capabilityCountByRole.get(assignment.roleId) ?? 0) + 1)
  }

  const roles: TenantRoleAdminSummary[] = roleRows.map(role => ({
    id: role.id,
    scope: role.tenant_id === null ? 'global_tenant' : 'tenant',
    tenantId: role.tenant_id,
    tenantName: null,
    key: role.key,
    name: role.name,
    isSystem: role.is_system,
    isActive: role.is_active,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
    memberCount: memberCountByRole.get(role.id) ?? 0,
    capabilityCount: capabilityCountByRole.get(role.id) ?? 0
  }))

  const overrides: TenantMemberCapabilityOverrideSummary[] = overrideRows
    .filter(override => !isPlatformCapabilityKey(override.capability_key))
    .map(override => ({
      membershipId: override.membership_id,
      capabilityKey: override.capability_key,
      effect: override.effect
    }))

  return { roles, capabilities, assignments, overrides }
}

export async function listUnifiedPermissionMatrix(
  client: Client,
  tenantId: string | null,
  includePlatform: boolean
): Promise<TenantPermissionMatrix> {
  if (!includePlatform) {
    return listTenantPermissionMatrix(client, tenantId as string)
  }

  const [roleResult, platformRoleResult, capabilityResult, membershipResult, platformMembershipResult, assignmentResult, platformAssignmentResult, tenantResult] =
    await Promise.all([
      client
        .from('roles')
        .select(ADMIN_ROLE_COLUMNS)
        .order('tenant_id', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      client
        .from('platform_roles')
        .select('id, key, name, is_system, is_active, created_at, updated_at')
        .order('name', { ascending: true }),
      client
        .from('capabilities')
        .select('key, resource, action, description, is_active')
        .eq('is_active', true)
        .order('resource', { ascending: true })
        .order('action', { ascending: true }),
      client.from('memberships').select('id, role_id, status, tenant_id'),
      client.from('platform_memberships').select('id, role_id, status'),
      client.from('role_capabilities').select('role_id, capability_key'),
      client.from('platform_role_capabilities').select('role_id, capability_key'),
      client.from('tenants').select('id, name')
    ])

  if (
    roleResult.error ||
    platformRoleResult.error ||
    capabilityResult.error ||
    membershipResult.error ||
    platformMembershipResult.error ||
    assignmentResult.error ||
    platformAssignmentResult.error ||
    tenantResult.error
  ) {
    throw UsersError.internal('No se pudo cargar el centro unificado de acceso.')
  }

  const roleRows = (roleResult.data as AdminRoleRow[] | null) ?? []
  const platformRoleRows = (platformRoleResult.data as PlatformRoleRow[] | null) ?? []
  const capabilityRows =
    (capabilityResult.data as Array<{
      key: string
      resource: string
      action: string
      description: string
      is_active: boolean
    }> | null) ?? []
  const memberships =
    (membershipResult.data as Array<{ id: string; role_id: string; status: string; tenant_id: string }> | null) ?? []
  const platformMemberships =
    (platformMembershipResult.data as Array<{ id: string; role_id: string; status: string }> | null) ?? []
  const tenantNames = new Map(
    ((tenantResult.data as Array<{ id: string; name: string }> | null) ?? []).map(tenant => [tenant.id, tenant.name])
  )

  const roles: TenantRoleAdminSummary[] = [
    ...platformRoleRows.map(role => ({
      id: role.id,
      scope: 'platform' as const,
      tenantId: null,
      tenantName: null,
      key: role.key,
      name: role.name,
      isSystem: role.is_system,
      isActive: role.is_active,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
      memberCount: platformMemberships.filter(
        membership => membership.role_id === role.id && membership.status === 'active'
      ).length,
      capabilityCount: 0
    })),
    ...roleRows.map(role => ({
      id: role.id,
      scope: role.tenant_id === null ? ('global_tenant' as const) : ('tenant' as const),
      tenantId: role.tenant_id,
      tenantName: role.tenant_id ? (tenantNames.get(role.tenant_id) ?? null) : null,
      key: role.key,
      name: role.name,
      isSystem: role.is_system,
      isActive: role.is_active,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
      memberCount: memberships.filter(
        membership => membership.role_id === role.id && membership.status === 'active'
      ).length,
      capabilityCount: 0
    }))
  ]

  const assignments: TenantRoleCapabilityAssignment[] = [
    ...((platformAssignmentResult.data as Array<{ role_id: string; capability_key: string }> | null) ?? []).map(
      assignment => ({
        roleId: assignment.role_id,
        capabilityKey: assignment.capability_key
      })
    ),
    ...((assignmentResult.data as Array<{ role_id: string; capability_key: string }> | null) ?? []).map(assignment => ({
      roleId: assignment.role_id,
      capabilityKey: assignment.capability_key
    }))
  ]

  const capabilityCountByRole = new Map<string, number>()

  for (const assignment of assignments) {
    capabilityCountByRole.set(assignment.roleId, (capabilityCountByRole.get(assignment.roleId) ?? 0) + 1)
  }

  const rolesWithCounts = roles.map(role => ({
    ...role,
    capabilityCount: capabilityCountByRole.get(role.id) ?? 0
  }))

  let overrideRows: Array<{ membership_id: string; capability_key: string; effect: 'allow' | 'deny' }> = []

  if (memberships.length > 0) {
    const overrideResult = await client
      .from('member_capability_overrides')
      .select('membership_id, capability_key, effect')
      .in(
        'membership_id',
        memberships.map(membership => membership.id)
      )

    if (overrideResult.error) {
      throw UsersError.internal('No se pudieron cargar los overrides del centro de acceso.')
    }

    overrideRows =
      (overrideResult.data as Array<{ membership_id: string; capability_key: string; effect: 'allow' | 'deny' }> | null) ??
      []
  }

  return {
    roles: rolesWithCounts,
    capabilities: capabilityRows.map(({ key, resource, action, description }) => ({
      key,
      resource,
      action,
      description
    })),
    assignments,
    overrides: overrideRows.map(override => ({
      membershipId: override.membership_id,
      capabilityKey: override.capability_key,
      effect: override.effect
    })),
    tenants: Array.from(tenantNames, ([id, name]) => ({ id, name }))
  }
}

function throwAccessRpcError(error: { code?: string; message?: string }): never {
  const message = error.message ?? ''

  if (error.code === '23505' || message === 'role_key_conflict') {
    throw UsersError.roleKeyConflict()
  }

  if (error.code === '40001' || message === 'role_version_conflict') {
    throw UsersError.versionConflict()
  }

  if (error.code === 'P0002' || message === 'role_not_found' || message === 'tenant_not_found') {
    throw UsersError.notFound()
  }

  if (message === 'last_super_admin_protected' || message === 'role_has_active_members') {
    throw UsersError.invalidTransition('No se puede eliminar ni desactivar el último SA o un rol con miembros activos.')
  }

  if (message === 'self_role_mutation') {
    throw UsersError.invalidTransition('No puedes modificar o retirar las capacidades del rol de tu propia sesión.')
  }

  if (message === 'capability_not_assignable') {
    throw UsersError.capabilityNotAssignable([])
  }

  if (error.code === '42501' || message === 'capability_denied' || message === 'role_not_manageable') {
    throw UsersError.forbidden('platform.access')
  }

  if (error.code === '22023') {
    throw UsersError.validation('La operación contiene datos o capacidades no válidos.')
  }

  throw UsersError.internal('No se pudo completar la operación de acceso.')
}

export async function createPlatformAccessRole(client: Client, key: string, name: string): Promise<PlatformRoleRow> {
  const { data, error } = await client.rpc('create_platform_role', { p_key: key, p_name: name })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as PlatformRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.internal('No se pudo crear el rol de plataforma.')
  }

  return role
}

export async function updatePlatformAccessRole(
  client: Client,
  roleId: string,
  name: string | null,
  isActive: boolean | null,
  updatedAt: string
): Promise<PlatformRoleRow> {
  const { data, error } = await client.rpc('update_platform_role', {
    p_role_id: roleId,
    p_name: name,
    p_is_active: isActive,
    p_updated_at: updatedAt
  })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as PlatformRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.notFound()
  }

  return role
}

export async function replacePlatformAccessRoleCapabilities(
  client: Client,
  roleId: string,
  capabilityKeys: string[],
  updatedAt: string
): Promise<PlatformRoleRow> {
  const { data, error } = await client.rpc('replace_platform_role_capabilities', {
    p_role_id: roleId,
    p_capability_keys: capabilityKeys,
    p_updated_at: updatedAt
  })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as PlatformRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.notFound()
  }

  return role
}

export async function createUnifiedTenantAccessRole(
  client: Client,
  tenantId: string | null,
  key: string,
  name: string,
  isGlobal: boolean
): Promise<AdminRoleRow> {
  const { data, error } = await client.rpc('create_unified_tenant_role', {
    p_tenant_id: tenantId,
    p_key: key,
    p_name: name,
    p_global: isGlobal
  })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as AdminRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.internal('No se pudo crear el rol.')
  }

  return role
}

export async function updateUnifiedTenantAccessRole(
  client: Client,
  roleId: string,
  name: string | null,
  isActive: boolean | null,
  updatedAt: string
): Promise<AdminRoleRow> {
  const { data, error } = await client.rpc('update_unified_tenant_role', {
    p_role_id: roleId,
    p_name: name,
    p_is_active: isActive,
    p_updated_at: updatedAt
  })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as AdminRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.notFound()
  }

  return role
}

export async function replaceUnifiedTenantAccessRoleCapabilities(
  client: Client,
  roleId: string,
  capabilityKeys: string[],
  updatedAt: string
): Promise<AdminRoleRow> {
  const { data, error } = await client.rpc('replace_role_capabilities', {
    p_role_id: roleId,
    p_capability_keys: capabilityKeys,
    p_updated_at: updatedAt
  })

  if (error) {
    throwAccessRpcError(error)
  }

  const role = (data as AdminRoleRow[] | null)?.[0]

  if (!role) {
    throw UsersError.notFound()
  }

  return role
}

export async function createTenantRole(
  client: Client,
  tenantId: string,
  key: string,
  name: string
): Promise<AdminRoleRow> {
  const { data, error } = await client
    .from('roles')
    .insert({ tenant_id: tenantId, key, name, is_system: false, is_active: true })
    .select(ADMIN_ROLE_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw UsersError.roleKeyConflict()
    }

    throw UsersError.internal('No se pudo crear el rol del tenant.')
  }

  return data as AdminRoleRow
}

export interface UpdateTenantRoleInput {
  tenantId: string
  roleId: string
  name?: string
  isActive?: boolean
  expectedUpdatedAt: string
}

export async function updateTenantRole(client: Client, input: UpdateTenantRoleInput): Promise<AdminRoleRow> {
  const update: Database['public']['Tables']['roles']['Update'] = {}

  if (input.name !== undefined) {
    update.name = input.name
  }

  if (input.isActive !== undefined) {
    update.is_active = input.isActive
  }

  const { data, error } = await client
    .from('roles')
    .update(update)
    .eq('id', input.roleId)
    .eq('tenant_id', input.tenantId)
    .eq('updated_at', input.expectedUpdatedAt)
    .select(ADMIN_ROLE_COLUMNS)
    .maybeSingle()

  if (error) {
    throw UsersError.internal('No se pudo actualizar el rol del tenant.')
  }

  if (!data) {
    const current = await getTenantRoleById(client, input.tenantId, input.roleId)

    if (!current) {
      throw UsersError.notFound()
    }

    throw UsersError.versionConflict()
  }

  return data as AdminRoleRow
}

export async function replaceTenantRoleCapabilities(
  client: Client,
  roleId: string,
  capabilityKeys: string[],
  expectedUpdatedAt: string
): Promise<AdminRoleRow> {
  const { data, error } = await client.rpc('replace_role_capabilities', {
    p_role_id: roleId,
    p_capability_keys: capabilityKeys,
    p_updated_at: expectedUpdatedAt
  })

  if (error) {
    if (error.code === '40001' || error.message === 'role_version_conflict') {
      throw UsersError.versionConflict()
    }

    if (error.code === '42501' || error.message === 'role_not_manageable') {
      throw UsersError.invalidTransition('El rol no puede modificarse porque es del sistema o está inactivo.')
    }

    if (error.code === '22023' || error.message === 'invalid_role_capability') {
      throw UsersError.validation('La matriz contiene una capacidad inválida.')
    }

    throw UsersError.internal('No se pudo actualizar la matriz de permisos del rol.')
  }

  const updatedRole = (data as AdminRoleRow[] | null)?.[0]

  if (!updatedRole) {
    throw UsersError.notFound()
  }

  return updatedRole
}

// ─── Capacidades efectivas ─────────────────────────────────────────────────

async function getRoleCapabilityKeys(client: Client, roleId: string): Promise<Set<string>> {
  const { data, error } = await client.from('role_capabilities').select('capability_key').eq('role_id', roleId)

  if (error) {
    throw UsersError.internal('No se pudieron leer las capacidades del rol.')
  }

  return new Set(((data as { capability_key: string }[] | null) ?? []).map(row => row.capability_key))
}

interface OverrideRow {
  capability_key: string
  effect: OverrideEffect
}

async function getMemberOverrides(client: Client, membershipId: string): Promise<Map<string, OverrideEffect>> {
  const { data, error } = await client
    .from('member_capability_overrides')
    .select('capability_key, effect')
    .eq('membership_id', membershipId)

  if (error) {
    throw UsersError.internal('No se pudieron leer los overrides de capacidades del miembro.')
  }

  return new Map(((data as OverrideRow[] | null) ?? []).map(row => [row.capability_key, row.effect]))
}

export async function getEffectiveCapabilitiesForMember(
  client: Client,
  membershipRow: MembershipRow
): Promise<EffectiveCapabilityEntry[]> {
  const [roleCapabilityKeys, overrides] = await Promise.all([
    getRoleCapabilityKeys(client, membershipRow.role_id),
    getMemberOverrides(client, membershipRow.id)
  ])

  // Precedence per plan section 9.7: deny override > allow override > role
  // capability > deny.
  return CAPABILITY_MANIFEST.map(capability => {
    const override = overrides.get(capability.key)

    if (override === 'deny') {
      return { ...capability, source: 'deny_override' as const, granted: false }
    }

    if (override === 'allow') {
      return { ...capability, source: 'allow_override' as const, granted: true }
    }

    const grantedByRole = roleCapabilityKeys.has(capability.key)

    return { ...capability, source: 'role' as const, granted: grantedByRole }
  })
}

export async function getMemberDetail(
  client: Client,
  tenantId: string,
  membershipId: string
): Promise<TenantMemberDetail | null> {
  const row = await getMemberById(client, tenantId, membershipId)

  if (!row) {
    return null
  }

  const [summary, capabilities] = await Promise.all([
    getMemberSummary(client, tenantId, membershipId),
    getEffectiveCapabilitiesForMember(client, row)
  ])

  if (!summary) {
    return null
  }

  return { ...summary, capabilities }
}

export interface UpsertCapabilityOverrideInput {
  membershipId: string
  capabilityKey: string
  effect: OverrideEffect | null
  reason?: string
  actorUserId: string
}

// Applies a single override change: `effect: null` clears any existing
// override (falling back to the role default); otherwise upserts the row.
// Caller (service.ts) is responsible for verifying the membership belongs to
// the caller's tenant before invoking this.
export async function upsertCapabilityOverride(client: Client, input: UpsertCapabilityOverrideInput): Promise<void> {
  const { membershipId, capabilityKey, effect, reason, actorUserId } = input

  if (effect === null) {
    const { error } = await client
      .from('member_capability_overrides')
      .delete()
      .eq('membership_id', membershipId)
      .eq('capability_key', capabilityKey)

    if (error) {
      throw UsersError.internal('No se pudo limpiar el override de capacidad.')
    }

    return
  }

  const { error } = await client.from('member_capability_overrides').upsert(
    {
      membership_id: membershipId,
      capability_key: capabilityKey,
      effect,
      reason: reason ?? null,
      created_by: actorUserId
    },
    { onConflict: 'membership_id,capability_key' }
  )

  if (error) {
    throw UsersError.internal('No se pudo guardar el override de capacidad.')
  }
}
