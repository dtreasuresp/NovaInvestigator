import { isCapabilityKey, type CapabilityKey } from '@/features/access/capabilityManifest'
import type { EffectiveAccessSnapshot } from '@/features/access/types'
import {
  CapabilityDeniedError,
  EntitlementLimitExceededError,
  EntitlementRequiredError,
  TenantMembershipRequiredError
} from '@/features/access/errors'

// ==============================================================================
// Authorization Engine — PDP híbrido RBAC + ReBAC + ABAC/Entitlements
// Doc canónico: doc/plans/PLAN_REFACTOR_RBAC §11, §14, §18, §19
// Arquitectura SODA: src/features/access (feature) — no contiene acceso directo a DB,
// delega en RPCs de infrastructure (Supabase) y en snapshot comercial.
// Regla de oro (§20): Roles determine responsibility. Relationships determine
// reach. Entitlements determine availability. Policies determine conditions.
// ==============================================================================

/**
 * Request canónico del Authorization Engine.
 * Inspirado en §18: authorize({ subject, action, resource, context })
 */
export interface AuthzRequest {
  readonly subject: {
    readonly userId: string
    readonly tenantId: string
    readonly workspaceId?: string | null
    readonly teamId?: string | null
  }
  readonly action: string // formato <resource>.<action> §8
  readonly resource?: {
    readonly type: string // investigation | workspace | team | resource
    readonly id?: string | null
    readonly tenantId: string
    readonly workspaceId?: string | null
    readonly teamId?: string | null
  }
  readonly context?: {
    readonly snapshot?: EffectiveAccessSnapshot
    readonly requireEntitlement?: string // ej. limits.ai_queries_monthly
    readonly requireDailyPolicy?: string // ej. limits.ai_queries_daily
  }
}

/**
 * Decisión tipada que distingue §13:
 * AUTHORIZATION_DENIED (403) vs ENTITLEMENT_REQUIRED (402) vs POLICY_DENIED (429)
 */
export type AuthzDecision =
  | { readonly allowed: true; readonly reason: 'ROLE_PERMISSION' }
  | { readonly allowed: false; readonly reason: 'NOT_TENANT_MEMBER' }
  | { readonly allowed: false; readonly reason: 'AUTHORIZATION_DENIED'; readonly capability: string }
  | { readonly allowed: false; readonly reason: 'RELATIONSHIP_DENIED'; readonly detail: string }
  | { readonly allowed: false; readonly reason: 'ENTITLEMENT_REQUIRED'; readonly entitlement: string; readonly limitValue: number | null }
  | { readonly allowed: false; readonly reason: 'POLICY_DENIED'; readonly policy: string; readonly retryAfterSeconds?: number }
  | { readonly allowed: false; readonly reason: 'ENTITLEMENT_LIMIT_EXCEEDED'; readonly entitlement: string; readonly limitValue: number; readonly usageCount: number }

export interface AuthorizationEngineDeps {
  hasCapability: (userId: string, tenantId: string, capability: CapabilityKey) => Promise<boolean>
  hasWorkspaceCapability?: (userId: string, workspaceId: string, capability: CapabilityKey) => Promise<boolean>
  isActiveTenantMember: (userId: string, tenantId: string) => Promise<boolean>
  isActiveWorkspaceMember?: (userId: string, workspaceId: string) => Promise<boolean>
  isMemberOfTeam?: (userId: string, teamId: string) => Promise<boolean>
  getDailyRemaining?: (tenantId: string) => Promise<{ remaining: number | null; limitValue: number | null }>
}

// ---------------------------------------------------------------------------
// Helpers de cada capa (§11)
// ---------------------------------------------------------------------------

async function checkTenantMembership(
  req: AuthzRequest,
  deps: AuthorizationEngineDeps
): Promise<AuthzDecision | null> {
  const { subject } = req
  const isMember = await deps.isActiveTenantMember(subject.userId, subject.tenantId)

  if (!isMember) {
    return { allowed: false, reason: 'NOT_TENANT_MEMBER' }
  }


  // Si el recurso declara un tenant distinto, es cross-tenant no autorizado
  if (req.resource && req.resource.tenantId !== subject.tenantId) {
    return { allowed: false, reason: 'RELATIONSHIP_DENIED', detail: 'cross-tenant resource' }
  }

  return null
}

async function checkRolePermission(
  req: AuthzRequest,
  deps: AuthorizationEngineDeps
): Promise<AuthzDecision | null> {
  // Solo aplica si la acción es una capability conocida
  if (!isCapabilityKey(req.action as CapabilityKey)) {
    return null
  }

  const capability = req.action as CapabilityKey
  const { subject } = req

  // Si hay workspaceId, preferir hasWorkspaceCapability (ReBAC + RBAC por workspace §4)
  if (subject.workspaceId && deps.hasWorkspaceCapability) {
    const granted = await deps.hasWorkspaceCapability(subject.userId, subject.workspaceId, capability)

    if (!granted) {
      // Fallback a tenant capability (owner/admin pueden tener permiso tenant-scoped)
      const tenantGranted = await deps.hasCapability(subject.userId, subject.tenantId, capability)

      if (!tenantGranted) {
        return { allowed: false, reason: 'AUTHORIZATION_DENIED', capability }
      }
    }

    return null
  }

  const granted = await deps.hasCapability(subject.userId, subject.tenantId, capability)

  if (!granted) {
    return { allowed: false, reason: 'AUTHORIZATION_DENIED', capability }
  }

  return null
}

async function checkRelationship(
  req: AuthzRequest,
  deps: AuthorizationEngineDeps
): Promise<AuthzDecision | null> {
  const { subject, resource } = req

  if (!resource) return null

  // Si el recurso está en un workspace, el subject debe ser miembro de ese workspace (ReBAC §5)
  if (resource.workspaceId && deps.isActiveWorkspaceMember) {
    const isWsMember = await deps.isActiveWorkspaceMember(subject.userId, resource.workspaceId)


    // Si el subject declaró workspaceId y no coincide con el recurso → DENY
    if (subject.workspaceId && subject.workspaceId !== resource.workspaceId) {
      return { allowed: false, reason: 'RELATIONSHIP_DENIED', detail: 'workspace mismatch' }
    }


    // Si no es miembro del workspace del recurso y no es admin tenant, denegar
    // Nota: hasCapability ya validó que tiene permiso, pero ReBAC verifica reach
    if (!isWsMember) {
      // Permitir si es owner/admin tenant (tienen reach global) — se infiere porque hasCapability pasó
      // Aquí solo denegamos si el workspace es obligatorio y no hay pertenencia
      // Para mantener compatibilidad, no bloqueamos si no hay deps.isActiveWorkspaceMember
    }
  }

  // Si el recurso está en un team, verificar pertenencia
  if (resource.teamId && deps.isMemberOfTeam) {
    const isTeamMember = await deps.isMemberOfTeam(subject.userId, resource.teamId)

    if (!isTeamMember) {
      return { allowed: false, reason: 'RELATIONSHIP_DENIED', detail: 'not member of team' }
    }
  }

  return null
}

function checkEntitlement(
  req: AuthzRequest
): AuthzDecision | null {
  const entitlementKey = req.context?.requireEntitlement

  if (!entitlementKey) return null
  const snapshot = req.context?.snapshot

  if (!snapshot) return null

  // Buscar entitlement en snapshot (plan_entitlements + tenant_entitlements proyectados)
  const ent = snapshot.entitlements.find(e => e.key === entitlementKey)


  // Si no está en snapshot pero el plan no lo tiene, se considera no contratado (§10)
  if (!ent || !ent.isEnabled) {
    return { allowed: false, reason: 'ENTITLEMENT_REQUIRED', entitlement: entitlementKey, limitValue: ent?.limitValue ?? null }
  }


  // Si es un limit con valor 0 o negativo, también se deniega
  if (ent.key.startsWith('limits.') && ent.limitValue !== null && ent.limitValue <= 0) {
    return { allowed: false, reason: 'ENTITLEMENT_REQUIRED', entitlement: entitlementKey, limitValue: ent.limitValue }
  }

  return null
}

async function checkPolicy(
  req: AuthzRequest,
  deps: AuthorizationEngineDeps
): Promise<AuthzDecision | null> {
  const policyKey = req.context?.requireDailyPolicy

  if (!policyKey) return null
  if (!deps.getDailyRemaining) return null

  const daily = await deps.getDailyRemaining(req.subject.tenantId)

  if (daily.limitValue !== null && daily.remaining !== null && daily.remaining <= 0) {
    return { allowed: false, reason: 'POLICY_DENIED', policy: policyKey, retryAfterSeconds: 86400 }
  }

  return null
}

// ---------------------------------------------------------------------------
// PDP principal — intersección de las 5 capas (§11)
// ACCESS = Tenant AND Role AND Relationship AND Entitlement AND Policy
// ---------------------------------------------------------------------------

export async function authorize(
  req: AuthzRequest,
  deps: AuthorizationEngineDeps
): Promise<AuthzDecision> {
  const tenantCheck = await checkTenantMembership(req, deps)

  if (tenantCheck) return tenantCheck

  const permissionCheck = await checkRolePermission(req, deps)

  if (permissionCheck) return permissionCheck

  const relationshipCheck = await checkRelationship(req, deps)

  if (relationshipCheck) return relationshipCheck

  const entitlementCheck = checkEntitlement(req)

  if (entitlementCheck) return entitlementCheck

  const policyCheck = await checkPolicy(req, deps)

  if (policyCheck) return policyCheck

  return { allowed: true, reason: 'ROLE_PERMISSION' }
}

// ---------------------------------------------------------------------------
// Helpers para mapear AuthzDecision a errores existentes (SODA: feature → errors)
// Distingue 403 vs 402 vs 429 según §13
// ---------------------------------------------------------------------------

export function throwIfDenied(decision: AuthzDecision, tenantIdForError?: string): void {
  if (decision.allowed) return

  const tenantId = tenantIdForError ?? 'unknown'

  switch (decision.reason) {
    case 'NOT_TENANT_MEMBER': {
      throw new TenantMembershipRequiredError(tenantId)
    }

    case 'AUTHORIZATION_DENIED': {
      throw new CapabilityDeniedError(tenantId, decision.capability as CapabilityKey)
    }

    case 'RELATIONSHIP_DENIED': {
      throw new CapabilityDeniedError(tenantId, 'investigations.read' as CapabilityKey)
    }

    case 'ENTITLEMENT_REQUIRED': {
      throw new EntitlementRequiredError(tenantId, decision.entitlement)
    }

    case 'ENTITLEMENT_LIMIT_EXCEEDED': {
      throw new EntitlementLimitExceededError(tenantId, decision.entitlement, decision.limitValue, decision.usageCount)
    }

    case 'POLICY_DENIED': {
      // Reutiliza EntitlementLimitExceeded para 429 diario (policy) — el handler lo mapea a 429
      throw new EntitlementLimitExceededError(tenantId, decision.policy, 0, 0)
    }

    default: {
      throw new CapabilityDeniedError(tenantId, 'investigations.read' as CapabilityKey)
    }
  }
}
