// Resolves the "investigations principal" (who is calling, and which tenant
// their writes are scoped to) for every Route Handler in
// src/app/api/investigations. Delegates identity, membership and capability
// checks to the existing access foundation
// (`src/features/access/access-service.ts`: `requireAuthenticatedUser`,
// `requireCapability`) instead of re-implementing them, per the task's
// preference for reusing existing guard names.
//
// Tenant is always derived server-side from an active membership — never
// accepted from the request body or query string — per
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 17.1
// ("Tenant derivado de membresía, nunca del body").
//
// Anonymous Supabase identities (trial and one-time guests) are rejected
// before any tenant lookup: sections 10.3/17.3 of the plan are explicit that
// anonymous users must have zero rows in `investigations` and no server
// write access at all.
import {
  consumePdfMonthlyEntitlement,
  getDefaultTenantMembership,
  requireCommercialAccess,
  requireAuthenticatedUser,
  requireCapability,
  requireEntitlement,
  requireModuleAccess,
  requirePdfEntitlement
} from '@/features/access/access-service'
import {
  AccessError,
  AuthenticationRequiredError,
  CommercialAccessRequiredError,
  CommercialAccessResolutionError,
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  EntitlementResolutionError,
  ModuleAccessRequiredError,
  TenantMembershipRequiredError
} from '@/features/access/errors'
import type { ResolvedEntitlement } from '@/features/access/entitlement-evaluator'
import { BillingError } from '@/features/billing/errors'
import { enforceBillingRateLimit } from '@/features/billing/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { InvestigationError } from './errors'
import type { InvestigationsCapability } from './capabilities'
import { asInvestigationsClient, type InvestigationsSupabaseClient } from './db-types'

export interface InvestigationsPrincipal {
  readonly userId: string
  readonly tenantId: string
  readonly client: InvestigationsSupabaseClient
}

// Resolves the authenticated, registered principal for a request. Throws a
// structured `InvestigationError` (never a raw Supabase/Postgres error or an
// `AccessError`) when the caller is unauthenticated, anonymous, or has no
// active membership.
export async function requireInvestigationsPrincipal(): Promise<InvestigationsPrincipal> {
  let principal: Awaited<ReturnType<typeof requireAuthenticatedUser>>

  try {
    principal = await requireAuthenticatedUser()
  } catch (error) {
    if (error instanceof AccessError) {
      throw InvestigationError.unauthenticated()
    }

    throw error
  }

  // Anonymous trial/one-time users are a real Supabase Auth identity but must
  // never gain a tenant or a persisted investigation row.
  if (principal.isAnonymous) {
    throw InvestigationError.anonymousWriteDenied()
  }

  const activeMembership = getDefaultTenantMembership(principal)

  if (!activeMembership) {
    throw InvestigationError.tenantRequired()
  }

  const client = asInvestigationsClient(await createSupabaseServerClient())

  return { userId: principal.userId, tenantId: activeMembership.tenantId, client }
}

// Verifies a capability via the shared `requireCapability` guard (which
// itself re-checks tenant membership and calls the `has_capability` SQL
// function). Wrapped so every failure surfaces as a structured
// `InvestigationError` rather than an `AccessError`.
export async function assertInvestigationsCapability(
  principal: InvestigationsPrincipal,
  capability: InvestigationsCapability
): Promise<void> {
  try {
    await requireCapability(principal.tenantId, capability)
  } catch (error) {
    if (error instanceof AccessError) {
      throw InvestigationError.forbidden(capability)
    }

    throw InvestigationError.internal('No se pudo verificar la capacidad requerida.')
  }
}

export async function assertInvestigationsCommercialAccess(principal: InvestigationsPrincipal): Promise<void> {
  try {
    await requireCommercialAccess({ tenantId: principal.tenantId })
    await requireModuleAccess('investigator', { tenantId: principal.tenantId })
  } catch (error) {
    if (error instanceof CommercialAccessRequiredError) {
      throw InvestigationError.commercialAccessRequired(error.status, error.source)
    }

    if (error instanceof CommercialAccessResolutionError) {
      throw InvestigationError.commercialAccessResolution()
    }

    if (error instanceof ModuleAccessRequiredError) {
      throw InvestigationError.moduleAccessRequired(error.moduleKey)
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw InvestigationError.tenantRequired()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw InvestigationError.unauthenticated()
    }

    if (error instanceof AccessError) {
      throw InvestigationError.internal('No se pudo verificar el acceso comercial.')
    }

    throw InvestigationError.commercialAccessResolution()
  }
}

export async function assertInvestigationsPdfEntitlement(principal: InvestigationsPrincipal): Promise<void> {
  try {
    await requirePdfEntitlement({ tenantId: principal.tenantId })
  } catch (error) {
    if (error instanceof EntitlementRequiredError) {
      throw InvestigationError.entitlementRequired(error.entitlement)
    }

    if (error instanceof EntitlementResolutionError) {
      throw InvestigationError.entitlementResolution()
    }

    if (error instanceof CommercialAccessRequiredError) {
      throw InvestigationError.commercialAccessRequired(error.status, error.source)
    }

    if (error instanceof CommercialAccessResolutionError) {
      throw InvestigationError.commercialAccessResolution()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw InvestigationError.unauthenticated()
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw InvestigationError.tenantRequired()
    }

    if (error instanceof AccessError) {
      throw InvestigationError.internal('No se pudo verificar el entitlement PDF requerido.')
    }

    throw InvestigationError.entitlementResolution()
  }
}

export async function assertInvestigationsPdfMonthlyEntitlement(
  principal: InvestigationsPrincipal
): Promise<void> {
  try {
    await consumePdfMonthlyEntitlement({ tenantId: principal.tenantId })
  } catch (error) {
    if (error instanceof EntitlementRequiredError) {
      throw InvestigationError.entitlementRequired(error.entitlement)
    }

    if (error instanceof EntitlementLimitExceededError) {
      throw InvestigationError.entitlementLimitExceeded(error.entitlement, error.limit, error.usage)
    }

    if (error instanceof EntitlementResolutionError) {
      throw InvestigationError.entitlementResolution()
    }

    if (error instanceof CommercialAccessRequiredError) {
      throw InvestigationError.commercialAccessRequired(error.status, error.source)
    }

    if (error instanceof CommercialAccessResolutionError) {
      throw InvestigationError.commercialAccessResolution()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw InvestigationError.unauthenticated()
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw InvestigationError.tenantRequired()
    }

    if (error instanceof AccessError) {
      throw InvestigationError.internal('No se pudo verificar el límite mensual de PDF.')
    }

    throw InvestigationError.entitlementResolution()
  }
}

export async function assertInvestigationsPdfRateLimit(principal: InvestigationsPrincipal): Promise<void> {
  try {
    // Scope the expensive renderer by tenant so multiple members cannot bypass
    // the protection by distributing requests across user identifiers.
    await enforceBillingRateLimit('pdf_export', principal.tenantId)
  } catch (error) {
    if (BillingError.isBillingError(error) && error.code === 'RATE_LIMITED') {
      throw InvestigationError.rateLimited()
    }

    throw InvestigationError.internal('No se pudo comprobar el límite de exportaciones PDF.')
  }
}

export async function assertInvestigationsEntitlement(
  principal: InvestigationsPrincipal,
  entitlement: string,
  usage?: number
): Promise<ResolvedEntitlement> {
  try {
    return await requireEntitlement(entitlement, {
      tenantId: principal.tenantId,
      usage
    })
  } catch (error) {
    if (error instanceof EntitlementRequiredError) {
      throw InvestigationError.entitlementRequired(error.entitlement)
    }

    if (error instanceof EntitlementLimitExceededError) {
      throw InvestigationError.entitlementLimitExceeded(error.entitlement, error.limit, error.usage)
    }

    if (error instanceof EntitlementResolutionError) {
      throw InvestigationError.entitlementResolution()
    }

    if (error instanceof AuthenticationRequiredError) {
      throw InvestigationError.unauthenticated()
    }

    if (error instanceof TenantMembershipRequiredError) {
      throw InvestigationError.tenantRequired()
    }

    if (error instanceof AccessError) {
      throw InvestigationError.internal('No se pudo verificar el entitlement requerido.')
    }

    throw InvestigationError.internal('No se pudo verificar el entitlement requerido.')
  }
}
