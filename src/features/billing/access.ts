// Resolves billing principals ("actors") for src/app/api/billing/** and
// bridges the shared access foundation
// (`src/features/access/access-service.ts`) into the `BillingError`
// contract, exactly like `src/lib/investigations/access.ts` and
// `src/features/users/access.ts` already do for their own features.
//
// The public billing boundary only permits registered tenant members. The
// anonymous shape remains as a compatibility type while legacy guest tables
// are retired, but no request can resolve to it.
// Tenant is always derived from the caller's own active membership, never
// from the request body (plan section 17.1).
//
// Legacy guest tables are not reachable through this boundary. Registered
// actors keep the caller's own session-scoped client so Postgres RLS still
// applies to tenant-scoped billing tables.
import {
  getCurrentPrincipal,
  getDefaultTenantMembership,
  requireCapability,
  requireTenantMembership
} from '@/features/access/access-service'
import type { CapabilityKey } from '@/features/access/capabilityManifest'
import {
  AuthenticationRequiredError,
  CapabilityDeniedError,
  TenantMembershipRequiredError
} from '@/features/access/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { asBillingClient, type BillingSupabaseClient } from './db-types'
import { BillingError } from './errors'
import { authorizeBillingCheckout } from './repository'

export interface AnonymousBillingActor {
  readonly kind: 'anonymous'
  readonly anonymousUserId: string
  readonly client: BillingSupabaseClient
}

export interface RegisteredBillingActor {
  readonly kind: 'registered'
  readonly userId: string
  readonly tenantId: string
  readonly email: string | null
  readonly client: BillingSupabaseClient
}

export interface RegisteredBillingCheckoutActor extends RegisteredBillingActor {
  readonly workspaceId: string
  readonly purchasePolicy: string
  readonly authorizationSource: string
}

export type BillingActor = AnonymousBillingActor | RegisteredBillingActor

// Resolves the registered tenant member calling billing without requiring a
// capability. Legacy endpoints that used to serve anonymous guests now fail
// closed before any billing table is queried.
export async function requireBillingActor(): Promise<BillingActor> {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    throw BillingError.unauthenticated()
  }

  const activeMembership = getDefaultTenantMembership(principal)

  if (!activeMembership) {
    throw BillingError.tenantRequired()
  }

  const tenantMembership = await requireTenantMembership(activeMembership.tenantId)
  const client = asBillingClient(await createSupabaseServerClient())

  return {
    kind: 'registered',
    userId: principal.userId,
    tenantId: tenantMembership.tenantId,
    email: principal.email,
    client
  }
}

// Kept as a compatibility guard while legacy guest endpoints are removed.
// The shared billing boundary rejects anonymous identities before this check.
export async function requireAnonymousBillingActor(): Promise<AnonymousBillingActor> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'anonymous') {
    throw BillingError.anonymousOnly()
  }

  return actor
}

// Verifies a capability via the shared `requireCapability` guard, mapping
// every access-foundation error onto the `BillingError` contract so the
// rest of this feature only deals with one error type.
export async function assertBillingCapability(tenantId: string, capability: CapabilityKey): Promise<void> {
  try {
    await requireCapability(tenantId, capability)
  } catch (error) {
    if (error instanceof CapabilityDeniedError) {
      throw BillingError.forbidden(capability)
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw BillingError.tenantRequired()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw BillingError.unauthenticated()
    }

    throw BillingError.internal('No se pudo verificar la capacidad requerida.')
  }
}

// Requires an active tenant membership and the given capability. VID is an
// independent security workflow and is not a commercial access requirement.
// Used by protected registered operations such as subscription checkout,
// customer portal, and invoice retrieval.
export async function requireRegisteredBillingActor(capability: CapabilityKey): Promise<RegisteredBillingActor> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'registered') {
    throw BillingError.registeredAccountRequired()
  }

  await assertBillingCapability(actor.tenantId, capability)

  return actor
}

export async function requireRegisteredBillingCheckoutActor(
  workspaceId?: string
): Promise<RegisteredBillingCheckoutActor> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'registered') {
    throw BillingError.registeredAccountRequired()
  }

  const authorization = await authorizeBillingCheckout(actor.client, actor.userId, actor.tenantId, workspaceId)

  if (!authorization) {
    throw BillingError.forbidden('billing.checkout.create')
  }

  return {
    ...actor,
    workspaceId: authorization.workspace_id,
    purchasePolicy: authorization.policy,
    authorizationSource: authorization.authorization_source
  }
}
