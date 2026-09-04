import { cache } from 'react'

import { cookies } from 'next/headers'

import {
  isCapabilityKey,
  isPlatformCapabilityKey,
  type CapabilityKey,
  type PlatformCapabilityKey
} from '@/features/access/capabilityManifest'
import {
  AccessError,
  AuthenticationRequiredError,
  CapabilityDeniedError,
  CommercialAccessRequiredError,
  CommercialAccessResolutionError,
  DatabaseConnectionError,
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  EntitlementResolutionError,
  ModuleAccessRequiredError,
  PlatformCapabilityDeniedError,
  PlatformMembershipRequiredError,
  TenantMembershipRequiredError,
  VidVerificationRequiredError
} from '@/features/access/errors'
import type {
  EffectiveAccessEntitlement,
  EffectiveAccessSnapshot,
  PlatformMembershipSummary,
  Principal,
  TenantMembershipSummary
} from '@/features/access/types'
import { asBillingClient, uncheckedBillingTable } from '@/features/billing/db-types'
import {
  consumePdfMonthlyUsage,
  consumeGrantPdfMonthlyUsage,
  findActiveSubscriptionForTenant,
  findPlanById,
  listAccessGrantEntitlementRows,
  listAccessGrants,
  listPlanEntitlementRows
} from '@/features/billing/repository'
import type { AccessGrantRow, AccessGrantEntitlementRow, PlanEntitlementRow } from '@/features/billing/db-types'
import { canonicalizeBillingEntitlementKey, findBillingEntitlementRow } from '@/lib/billing/entitlements'
import type { CommercialAccessSummary } from '@/lib/billing/types'
import { getSupabaseIdentity } from '@/lib/auth/principal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { GUEST_TRIAL_COOKIE_NAME, getGuestTrialStatus } from '@/features/billing/guest-trial-service'

import { evaluateCommercialAccess } from './commercial-access'
import { evaluateEntitlement, isSubscriptionUsable, type ResolvedEntitlement } from './entitlement-evaluator'

function normalizePostgrestError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const pg = error as { message?: string; details?: string; hint?: string; code?: string }

    return new DatabaseConnectionError(context, pg.message)
  }

  return new DatabaseConnectionError(context, String(error))
}

// Server-side resolver for the current request's principal (identity +
// tenant memberships + derived access state) and the guard functions built
// on top of it, per
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 11:
//   getCurrentPrincipal(), requireAuthenticatedUser(),
//   requireTenantMembership(tenantId), requireCapability(capability, context),
//   requireEntitlement(entitlement, context), requireCommercialAccess(context)
//
// These functions never use the admin/service-role client — they run under
// the requesting user's session so Postgres RLS still applies. Cross-tenant
// or platform-wide reads require an explicit capability check plus an
// admin-scoped query, audited with `source = 'admin'`.

// Resolves the current principal from the Supabase session cookie. Returns
// `null` when there is no registered, email-confirmed Supabase user. Wrapped
// in `cache()` so repeated calls within one render/request reuse the same
// lookups.
export const getCurrentPrincipal = cache(async (): Promise<Principal | null> => {
  const identity = await getSupabaseIdentity()

  if (!identity) {
    return null
  }

  // Keep this branch as a defense in depth if the identity resolver ever
  // changes its source or is mocked in a server-side test.
  if (identity.isAnonymous) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  const [profileResult, membershipsResult, platformMembershipResult] = await Promise.all([
    supabase.from('profiles').select('status, vid_status, primary_tenant_id').eq('id', identity.userId).maybeSingle(),
    supabase.from('memberships').select('id, tenant_id, role_id, status').eq('user_id', identity.userId),
    supabase.from('platform_memberships').select('id, role_id, status').eq('user_id', identity.userId).maybeSingle()
  ])

  const profileStatus = profileResult.data?.status ?? null
  const vidStatus = profileResult.data?.vid_status ?? null
  const primaryTenantId = profileResult.data?.primary_tenant_id ?? null
  const membershipRows = membershipsResult.data ?? []
  const platformMembershipRow = platformMembershipResult.data

  const roleIds = Array.from(new Set(membershipRows.map(row => row.role_id)))
  const roleKeyById = new Map<string, string>()

  if (roleIds.length > 0) {
    const { data: roles } = await supabase.from('roles').select('id, key').in('id', roleIds)

    for (const role of roles ?? []) {
      roleKeyById.set(role.id, role.key)
    }
  }

  const memberships: TenantMembershipSummary[] = membershipRows.map(row => ({
    membershipId: row.id,
    tenantId: row.tenant_id,
    roleId: row.role_id,
    roleKey: roleKeyById.get(row.role_id) ?? null,
    status: row.status
  }))

  let platformMembership: PlatformMembershipSummary | null = null

  if (platformMembershipRow) {
    const { data: platformRole } = await supabase
      .from('platform_roles')
      .select('id, key')
      .eq('id', platformMembershipRow.role_id)
      .maybeSingle()

    platformMembership = {
      membershipId: platformMembershipRow.id,
      roleId: platformMembershipRow.role_id,
      roleKey: platformRole?.key ?? null,
      status: platformMembershipRow.status
    }
  }

  const hasActiveMembership = memberships.some(membership => membership.status === 'active')
  const hasPendingMembership = memberships.some(membership => membership.status === 'pending')

  let authState: Principal['authState'] = 'registered'

  if (profileStatus === 'suspended') {
    authState = 'suspended'
  } else if (!hasActiveMembership && hasPendingMembership) {
    authState = 'invited'
  }

  return {
    userId: identity.userId,
    email: identity.email,
    isAnonymous: false,
    authState,
    profileStatus,
    vidStatus,
    primaryTenantId,
    memberships,
    platformMembership
  }
})

export function getDefaultTenantMembership(principal: Principal): TenantMembershipSummary | null {
  const activeMemberships = principal.memberships.filter(membership => membership.status === 'active')

  if (principal.primaryTenantId) {
    const primaryMembership = activeMemberships.find(membership => membership.tenantId === principal.primaryTenantId)

    if (primaryMembership) {
      return primaryMembership
    }
  }

  return activeMemberships[0] ?? null
}

async function requireActiveTenantMembership(
  principal: Principal,
  requestedTenantId?: string
): Promise<TenantMembershipSummary> {
  const membership = requestedTenantId
    ? principal.memberships.find(item => item.tenantId === requestedTenantId && item.status === 'active')
    : getDefaultTenantMembership(principal)

  if (!membership) {
    throw new TenantMembershipRequiredError(requestedTenantId ?? 'current')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', membership.tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw normalizePostgrestError(error, 'active tenant check')
  }

  if (!data) {
    throw new TenantMembershipRequiredError(membership.tenantId)
  }

  return membership
}

// Throws `AuthenticationRequiredError` when there is no registered,
// email-confirmed Supabase session.
export async function requireAuthenticatedUser(): Promise<Principal> {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    throw new AuthenticationRequiredError()
  }

  return principal
}

// Requires a permanent Supabase user whose application-level VID state is
// verified. Anonymous identities and pending/rejected profiles cannot perform
// operations that activate or consume commercial access.
export async function requireVidVerified(): Promise<Principal> {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous || principal.vidStatus !== 'verified') {
    throw new VidVerificationRequiredError()
  }

  return principal
}

// Throws `TenantMembershipRequiredError` unless the current principal has an
// active membership in an active tenant.
export async function requireTenantMembership(tenantId: string): Promise<TenantMembershipSummary> {
  const principal = await requireAuthenticatedUser()

  return requireActiveTenantMembership(principal, tenantId)
}

async function resolveCapability(principal: Principal, tenantId: string, capability: CapabilityKey): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('has_capability', {
    p_user_id: principal.userId,
    p_tenant_id: tenantId,
    p_capability_key: capability
  })

  if (error) {
    throw normalizePostgrestError(error, 'has_capability')
  }

  return data === true
}

// Delegates the deny-override > allow-override > role-capability > deny
// precedence (plan section 9.7) to the `has_capability` SQL function so the
// rule is defined exactly once, in the database.
export async function hasCapability(tenantId: string, capability: CapabilityKey): Promise<boolean> {
  const principal = await requireAuthenticatedUser()

  await requireActiveTenantMembership(principal, tenantId)

  return resolveCapability(principal, tenantId, capability)
}

// Returns the full set of effective capabilities for the current principal
// in `tenantId`, resolved server-side via the `get_effective_capabilities`
// SQL function. Useful for UI hints (menus, buttons); never treat the
// resulting set as authoritative on its own — protected operations must
// still call `requireCapability`.
export async function getEffectiveCapabilities(tenantId: string): Promise<ReadonlySet<CapabilityKey>> {
  const principal = await requireAuthenticatedUser()

  await requireActiveTenantMembership(principal, tenantId)

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('get_effective_capabilities', {
    p_user_id: principal.userId,
    p_tenant_id: tenantId
  })

  if (error) {
    throw normalizePostgrestError(error, 'get_effective_capabilities')
  }

  const capabilities = new Set<CapabilityKey>()

  for (const row of data ?? []) {
    if (isCapabilityKey(row.capability_key)) {
      capabilities.add(row.capability_key)
    }
  }

  return capabilities
}

// Requires an active tenant membership AND the given capability. Throws
// `TenantMembershipRequiredError` or `CapabilityDeniedError` as appropriate.
// This is the guard every protected Server Action/Route Handler should call
// before mutating or reading tenant-scoped data.
export async function requireCapability(tenantId: string, capability: CapabilityKey): Promise<TenantMembershipSummary> {
  const principal = await requireAuthenticatedUser()
  const membership = await requireActiveTenantMembership(principal, tenantId)
  const granted = await resolveCapability(principal, tenantId, capability)

  if (!granted) {
    throw new CapabilityDeniedError(tenantId, capability)
  }

  return membership
}

export interface EntitlementContext {
  readonly tenantId?: string
  readonly usage?: number
}

export interface CommercialAccessContext {
  readonly tenantId?: string
  readonly now?: Date
}

type EffectiveEntitlementRow = PlanEntitlementRow | AccessGrantEntitlementRow

interface EffectiveAccess {
  readonly source: 'subscription' | 'trial' | 'one_time'
  readonly summary: CommercialAccessSummary
  readonly subscriptionId: string | null
  readonly planId: string | null
  readonly planCode: string
  readonly planIsActive: boolean
  readonly entitlementRows: readonly EffectiveEntitlementRow[]
  readonly grant: AccessGrantRow | null
}

interface EffectiveAccessResolution {
  readonly summary: CommercialAccessSummary
  readonly access: EffectiveAccess | null
}

async function listActivePlatformModuleKeys(client: ReturnType<typeof asBillingClient>): Promise<ReadonlySet<string>> {
  const { data, error } = await uncheckedBillingTable(client, 'platform_modules')
    .select('module_key')
    .eq('is_active', true)

  if (error) {
    throw new EntitlementResolutionError()
  }

  return new Set(((data as Array<{ module_key: string }> | null) ?? []).map(row => row.module_key.trim().toLowerCase()))
}

function filterInactiveModuleEntitlements(
  rows: readonly EffectiveEntitlementRow[],
  activeModuleKeys: ReadonlySet<string>
): EffectiveEntitlementRow[] {
  return rows.filter(row => {
    const key = canonicalizeBillingEntitlementKey(row.entitlement_key)

    if (!key.startsWith('modules.')) {
      return true
    }

    return activeModuleKeys.has(key.slice('modules.'.length))
  })
}

async function resolveEffectiveAccess(
  client: ReturnType<typeof asBillingClient>,
  userId: string,
  tenantId: string,
  now: Date
): Promise<EffectiveAccessResolution> {
  const [subscription, grants, activeModuleKeys] = await Promise.all([
    findActiveSubscriptionForTenant(client, tenantId),
    listAccessGrants(client, userId, tenantId),
    listActivePlatformModuleKeys(client)
  ])

  const subscriptionPlan = subscription ? await findPlanById(client, subscription.plan_id) : null

  const rawSummary = evaluateCommercialAccess(
    {
      subscription,
      planIsActive: subscriptionPlan?.is_active === true,
      accessGrants: grants
    },
    now
  )

  if (subscription && subscriptionPlan?.is_active === true && isSubscriptionUsable(subscription, now)) {
    const entitlementRows = filterInactiveModuleEntitlements(
      await listPlanEntitlementRows(client, [subscriptionPlan.id], tenantId),
      activeModuleKeys
    )

    return {
      summary: rawSummary,
      access: {
        source: 'subscription',
        summary: rawSummary,
        subscriptionId: subscription.id,
        planId: subscriptionPlan.id,
        planCode: subscriptionPlan.code,
        planIsActive: true,
        entitlementRows,
        grant: null
      }
    }
  }

  for (const grant of grants) {
    const grantSummary = evaluateCommercialAccess(
      {
        subscription: null,
        planIsActive: true,
        accessGrant: grant
      },
      now
    )

    if (grantSummary.status !== 'active') {
      continue
    }

    const entitlementRows = filterInactiveModuleEntitlements(
      await listAccessGrantEntitlementRows(client, grant.id),
      activeModuleKeys
    )

    if (entitlementRows.length === 0) {
      continue
    }

    if (grant.mode === 'one_time') {
      if (!grant.source_plan_id) {
        continue
      }

      const plan = await findPlanById(client, grant.source_plan_id)

      if (!plan?.is_active) {
        continue
      }

      return {
        summary: grantSummary,
        access: {
          source: 'one_time',
          summary: grantSummary,
          subscriptionId: null,
          planId: plan.id,
          planCode: plan.code,
          planIsActive: true,
          entitlementRows,
          grant
        }
      }
    }

    return {
      summary: grantSummary,
      access: {
        source: 'trial',
        summary: grantSummary,
        subscriptionId: null,
        planId: null,
        planCode: 'trial',
        planIsActive: true,
        entitlementRows,
        grant
      }
    }
  }

  return { summary: rawSummary, access: null }
}

function normalizeCommercialKey(key: string, namespace: 'modules' | 'actions'): string {
  const prefix = `${namespace}.`

  return key.startsWith(prefix) ? key.slice(prefix.length) : key
}

function toEffectiveEntitlements(rows: readonly EffectiveEntitlementRow[]): readonly EffectiveAccessEntitlement[] {
  return rows.map(row => {
    const key = canonicalizeBillingEntitlementKey(row.entitlement_key)
    const limitValue = row.limit_value === null ? null : Number(row.limit_value)

    if (!key || (limitValue !== null && (!Number.isFinite(limitValue) || limitValue < 0))) {
      throw new EntitlementResolutionError()
    }

    return {
      key,
      limitValue,
      isEnabled: row.is_enabled
    }
  })
}

function buildEffectiveLimits(entitlements: readonly EffectiveAccessEntitlement[]): Readonly<Record<string, number>> {
  const limits: Record<string, number> = {}

  for (const entitlement of entitlements) {
    if (entitlement.key.startsWith('limits.') && entitlement.limitValue !== null && entitlement.isEnabled) {
      limits[entitlement.key.slice('limits.'.length)] = entitlement.limitValue
    }
  }

  return limits
}

export async function resolveGuestEffectiveAccessSnapshot(
  cookieValue?: string | null
): Promise<EffectiveAccessSnapshot> {
  const resolvedCookieValue =
    cookieValue === undefined ? ((await cookies()).get(GUEST_TRIAL_COOKIE_NAME)?.value ?? null) : cookieValue

  const status = await getGuestTrialStatus(resolvedCookieValue)

  if (!status) {
    throw new AuthenticationRequiredError()
  }

  return {
    principal: 'guest',
    status: status.status === 'active' ? 'active' : status.status === 'expired' ? 'expired' : 'missing',
    source: 'trial',
    tenantId: null,
    planId: null,
    planCode: null,
    subscriptionId: null,
    grantId: null,
    startsAt: status.startedAt,
    expiresAt: status.expiresAt,
    modules: status.modules,
    actions: status.actions,
    limits: status.limits,
    entitlements: status.entitlements,
    capabilities: [],
    platformCapabilities: []
  }
}

/**
 * Resolves the single access snapshot consumed by UI and server-side module
 * guards. Commercial access selects modules/actions, while the capability
 * resolver applies tenant role and member overrides.
 */
export async function resolveEffectiveAccessSnapshot(
  context: CommercialAccessContext = {}
): Promise<EffectiveAccessSnapshot> {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    return resolveGuestEffectiveAccessSnapshot()
  }

  const membership = await requireActiveTenantMembership(principal, context.tenantId)
  const client = asBillingClient(await createSupabaseServerClient())

  const resolution = await resolveEffectiveAccess(
    client,
    principal.userId,
    membership.tenantId,
    context.now ?? new Date()
  )

  const entitlements = resolution.access ? toEffectiveEntitlements(resolution.access.entitlementRows) : []
  const [capabilities, platformCapabilities] = await Promise.all([
    getEffectiveCapabilities(membership.tenantId),
    getPlatformCapabilities()
  ])

  return {
    principal: 'registered',
    status: resolution.summary.status,
    source: resolution.access?.source ?? resolution.summary.source,
    tenantId: membership.tenantId,
    planId: resolution.access?.planId ?? null,
    planCode: resolution.access?.planCode ?? null,
    subscriptionId: resolution.access?.subscriptionId ?? null,
    grantId: resolution.access?.grant?.id ?? null,
    startsAt: resolution.summary.startsAt,
    expiresAt: resolution.summary.expiresAt,
    modules: entitlements
      .filter(entitlement => entitlement.isEnabled && entitlement.key.startsWith('modules.'))
      .map(entitlement => normalizeCommercialKey(entitlement.key, 'modules')),
    actions: entitlements
      .filter(entitlement => entitlement.isEnabled && entitlement.key.startsWith('actions.'))
      .map(entitlement => normalizeCommercialKey(entitlement.key, 'actions')),
    limits: buildEffectiveLimits(entitlements),
    entitlements,
    capabilities: Array.from(capabilities).sort(),
    platformCapabilities: Array.from(platformCapabilities).sort()
  }
}

export async function requireModuleAccess(
  moduleKey: string,
  context: CommercialAccessContext = {}
): Promise<EffectiveAccessSnapshot> {
  const normalizedModuleKey = normalizeCommercialKey(moduleKey, 'modules')
  const snapshot = await resolveEffectiveAccessSnapshot(context)

  if (snapshot.status !== 'active' || !snapshot.modules.includes(normalizedModuleKey)) {
    throw new ModuleAccessRequiredError(normalizedModuleKey)
  }

  return snapshot
}

export async function requireActionEntitlement(
  actionKey: string,
  context: CommercialAccessContext = {}
): Promise<EffectiveAccessSnapshot> {
  const normalizedActionKey = normalizeCommercialKey(actionKey, 'actions')
  const snapshot = await resolveEffectiveAccessSnapshot(context)

  if (snapshot.status !== 'active' || !snapshot.actions.includes(normalizedActionKey)) {
    throw new ModuleAccessRequiredError(`actions.${normalizedActionKey}`)
  }

  if (
    snapshot.principal === 'registered' &&
    isCapabilityKey(normalizedActionKey) &&
    !snapshot.capabilities.includes(normalizedActionKey)
  ) {
    throw new CapabilityDeniedError(membershipTenantId(snapshot), normalizedActionKey)
  }

  return snapshot
}

function membershipTenantId(snapshot: EffectiveAccessSnapshot): string {
  if (!snapshot.tenantId) {
    throw new EntitlementResolutionError()
  }

  return snapshot.tenantId
}

// Resolves the commercial window independently from capabilities, entitlements
// and VID. The tenant is always selected from an active membership.
export async function requireCommercialAccess(context: CommercialAccessContext = {}): Promise<CommercialAccessSummary> {
  const principal = await requireAuthenticatedUser()
  const membership = await requireActiveTenantMembership(principal, context.tenantId)

  const now = context.now ?? new Date()

  try {
    const client = asBillingClient(await createSupabaseServerClient())
    const resolution = await resolveEffectiveAccess(client, principal.userId, membership.tenantId, now)

    if (!resolution.access) {
      if (resolution.summary.status === 'active') {
        throw new CommercialAccessResolutionError()
      }

      throw new CommercialAccessRequiredError(membership.tenantId, resolution.summary.status, resolution.summary.source)
    }

    return resolution.access.summary
  } catch (error) {
    if (error instanceof AccessError) {
      throw error
    }

    throw new CommercialAccessResolutionError()
  }
}

export async function requirePdfEntitlement(context: Pick<EntitlementContext, 'tenantId'> = {}): Promise<void> {
  await requireEntitlement('investigations.export_pdf', { tenantId: context.tenantId })
}

// Atomically reserves one calendar-month PDF export for the effective
// subscription, trial, or one-time grant.
export async function consumePdfMonthlyEntitlement(context: Pick<EntitlementContext, 'tenantId'> = {}): Promise<void> {
  const principal = await requireAuthenticatedUser()
  const membership = await requireActiveTenantMembership(principal, context.tenantId)

  const entitlement = 'investigations.export_pdf_monthly'

  try {
    const client = asBillingClient(await createSupabaseServerClient())
    const resolution = await resolveEffectiveAccess(client, principal.userId, membership.tenantId, new Date())

    if (!resolution.access) {
      if (resolution.summary.status === 'active') {
        throw new EntitlementResolutionError()
      }

      throw new EntitlementRequiredError(membership.tenantId, entitlement)
    }

    const usage =
      resolution.access.source === 'subscription'
        ? await consumePdfMonthlyUsage(client, membership.tenantId)
        : resolution.access.grant
          ? await consumeGrantPdfMonthlyUsage(client, membership.tenantId, resolution.access.grant.id)
          : null

    if (!usage) {
      throw new EntitlementResolutionError()
    }

    if (usage.limitValue === null) {
      throw new EntitlementRequiredError(membership.tenantId, entitlement)
    }

    if (!usage.allowed) {
      throw new EntitlementLimitExceededError(membership.tenantId, entitlement, usage.limitValue, usage.usageCount)
    }
  } catch (error) {
    if (error instanceof AccessError) {
      throw error
    }

    throw new EntitlementResolutionError()
  }
}

// Resolves the active subscription, plan and entitlement for the current
// user's active tenant membership. The database remains the source of truth;
// missing, disabled or expired access fails closed.
export async function requireEntitlement(
  entitlement: string,
  context: EntitlementContext = {}
): Promise<ResolvedEntitlement> {
  const principal = await requireAuthenticatedUser()
  const membership = await requireActiveTenantMembership(principal, context.tenantId)

  try {
    const client = asBillingClient(await createSupabaseServerClient())
    const resolution = await resolveEffectiveAccess(client, principal.userId, membership.tenantId, new Date())

    if (!resolution.access) {
      if (resolution.summary.status === 'active') {
        throw new EntitlementResolutionError()
      }

      throw new EntitlementRequiredError(membership.tenantId, entitlement.trim())
    }

    const entitlementRow = findBillingEntitlementRow(resolution.access.entitlementRows, entitlement)

    return evaluateEntitlement({
      tenantId: membership.tenantId,
      entitlement,
      subscriptionId: resolution.access.subscriptionId,
      planId: resolution.access.planId,
      planCode: resolution.access.planCode,
      planIsActive: resolution.access.planIsActive,
      entitlementRow,
      usage: context.usage
    })
  } catch (error) {
    if (error instanceof EntitlementRequiredError || error instanceof EntitlementResolutionError) {
      throw error
    }

    if (error instanceof AccessError) {
      throw error
    }

    throw new EntitlementResolutionError()
  }
}

export async function hasPlatformCapability(capability: PlatformCapabilityKey): Promise<boolean> {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous || principal.platformMembership?.status !== 'active') {
    return false
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('has_platform_capability', {
    p_user_id: principal.userId,
    p_capability_key: capability
  })

  if (error) {
    throw normalizePostgrestError(error, 'has_platform_capability')
  }

  return data === true
}

export async function getPlatformCapabilities(): Promise<ReadonlySet<PlatformCapabilityKey>> {
  const principal = await requireAuthenticatedUser()
  const capabilities = new Set<PlatformCapabilityKey>()

  if (principal.isAnonymous || principal.platformMembership?.status !== 'active') {
    return capabilities
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('get_platform_capabilities', {
    p_user_id: principal.userId
  })

  if (error) {
    throw normalizePostgrestError(error, 'get_platform_capabilities')
  }

  for (const row of data ?? []) {
    if (isPlatformCapabilityKey(row.capability_key)) {
      capabilities.add(row.capability_key)
    }
  }

  return capabilities
}

export async function requirePlatformCapability(capability: PlatformCapabilityKey): Promise<PlatformMembershipSummary> {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous || !principal.platformMembership || principal.platformMembership.status !== 'active') {
    throw new PlatformMembershipRequiredError()
  }

  const granted = await hasPlatformCapability(capability)

  if (!granted) {
    throw new PlatformCapabilityDeniedError(capability)
  }

  return principal.platformMembership
}
