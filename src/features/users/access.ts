// Resolves the "users principal" (who is calling, which tenant their reads
// and writes are scoped to, and whether they hold the required capability)
// for every Route Handler in src/app/api/admin/users. Bridges the shared
// access foundation (src/features/access/access-service.ts) — the single
// source of truth for principal/membership/capability resolution — into the
// UsersError contract so the rest of this feature only deals with one error
// type.
//
// Tenant is always derived from the caller's own ACTIVE membership rows,
// never from the request body or query string
// (doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section
// 17.1). A caller may belong to more than one tenant; in that case an
// explicit `tenantId` may be supplied, but it is only honored when it
// matches one of the caller's own active memberships — it is never trusted
// blindly.
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getCurrentPrincipal,
  getDefaultTenantMembership,
  getPlatformCapabilities,
  requireCapability,
  requireCommercialAccess
} from '@/features/access/access-service'
import type { CapabilityKey, PlatformCapabilityKey } from '@/features/access/capabilityManifest'
import {
  AuthenticationRequiredError,
  CapabilityDeniedError,
  CommercialAccessRequiredError,
  CommercialAccessResolutionError,
  TenantMembershipRequiredError
} from '@/features/access/errors'
import type { Database } from '@/lib/supabase/database.types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { UsersError } from './errors'

export interface UsersPrincipal {
  readonly userId: string
  readonly tenantId: string
  readonly membershipId: string
  readonly roleId: string
  readonly client: SupabaseClient<Database>
}

export interface PlatformUsersPrincipal {
  readonly userId: string
  readonly platformRoleId: string
  readonly client: SupabaseClient<Database>
}

export async function requireUsersPrincipal(
  capability: CapabilityKey,
  requestedTenantId?: string
): Promise<UsersPrincipal> {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    throw UsersError.unauthenticated()
  }

  // Anonymous trial/one-time Supabase identities never hold a tenant
  // membership; reject before even looking at membership rows.
  if (principal.isAnonymous) {
    throw UsersError.unauthenticated()
  }

  const activeMemberships = principal.memberships.filter(membership => membership.status === 'active')

  if (activeMemberships.length === 0) {
    throw UsersError.tenantRequired()
  }

  const tenantId = requestedTenantId
    ? activeMemberships.find(membership => membership.tenantId === requestedTenantId)?.tenantId
    : getDefaultTenantMembership(principal)?.tenantId

  if (!tenantId) {
    // The caller asked for a tenant they do not actively belong to. Treat
    // this the same as "no tenant" rather than leaking which tenants exist.
    throw UsersError.tenantRequired()
  }

  const activeMembership = activeMemberships.find(membership => membership.tenantId === tenantId)

  if (!activeMembership) {
    throw UsersError.tenantRequired()
  }

  try {
    await requireCommercialAccess({ tenantId })
  } catch (error) {
    if (error instanceof CommercialAccessRequiredError) {
      throw UsersError.commercialAccessRequired(error.status, error.source)
    }

    if (error instanceof CommercialAccessResolutionError) {
      throw UsersError.commercialAccessResolution()
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw UsersError.tenantRequired()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw UsersError.unauthenticated()
    }

    throw UsersError.internal('No se pudo verificar el acceso comercial.')
  }

  try {
    await requireCapability(tenantId, capability)
  } catch (error) {
    if (error instanceof CapabilityDeniedError) {
      throw UsersError.forbidden(capability)
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw UsersError.tenantRequired()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw UsersError.unauthenticated()
    }

    throw UsersError.internal('No se pudo verificar la capacidad requerida.')
  }

  const client = await createSupabaseServerClient()

  return {
    userId: principal.userId,
    tenantId,
    membershipId: activeMembership.membershipId,
    roleId: activeMembership.roleId,
    client
  }
}

export async function requirePlatformUsersPrincipal(
  capability: PlatformCapabilityKey
): Promise<PlatformUsersPrincipal> {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    throw UsersError.unauthenticated()
  }

  if (!principal.platformMembership || principal.platformMembership.status !== 'active') {
    throw UsersError.forbidden(capability)
  }

  const platformCapabilities = await getPlatformCapabilities()

  if (!platformCapabilities.has(capability)) {
    throw UsersError.forbidden(capability)
  }

  const client = await createSupabaseServerClient()

  return {
    userId: principal.userId,
    platformRoleId: principal.platformMembership.roleId,
    client
  }
}
