// Append-only audit trail writes for sensitive user-management and
// account-security changes (role changes, disable/enable, capability
// overrides, MFA recovery codes), per
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md sections 9.10
// and 17.1 ("operaciones administrativas cross-tenant requieren ... auditoría
// con source = 'admin'").
//
// Uses the service-role client rather than the caller's RLS-scoped session
// client. This is an explicit, narrow exception to "never use service_role
// from request-bound code": `audit_logs` is meant to be append-only and is
// expected to be locked down by RLS to definer functions/service role, and
// every call site here runs strictly after `requireUsersPrincipal()` has
// already validated authentication, tenant membership and capability — the
// same "already validated the request" precondition documented in
// src/lib/supabase/admin.ts. Never logs secrets/tokens/PII; only stores
// already-non-sensitive identifiers and diffs.
// react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AuditSource, Json } from '@/lib/supabase/database.types'
import { logger } from '@/lib/logger'

export interface AuditEntryInput {
  tenantId: string | null
  workspaceId?: string | null
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  source?: AuditSource
  before?: Json | null
  after?: Json | null
  metadata?: Json | null
}

export async function recordAuditEntry(input: AuditEntryInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()

    const { error } = await admin.from('audit_logs').insert({
      tenant_id: input.tenantId,
      workspace_id: input.workspaceId ?? null,
      actor_user_id: input.actorUserId,
      source: input.source ?? 'admin',
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      metadata: input.metadata ?? null
    })

    if (error) {
      logger.error('No se pudo registrar la auditoría de usuarios', {
        action: 'users.audit.insert',
        details: {
          tenantId: input.tenantId,
          requestedAction: input.action,
          entityType: input.entityType,
          errorType: error.name ?? 'supabase_error'
        }
      })
    }
  } catch (error) {
    // Auditing must never fail the primary mutation, but a missing
    // SUPABASE_SERVICE_ROLE_KEY (local/dev without full Supabase config)
    // should not crash the request either.
    logger.error('No se pudo inicializar el cliente de auditoría de usuarios', {
      action: 'users.audit.client',
      details: {
        tenantId: input.tenantId,
        requestedAction: input.action,
        errorType: error instanceof Error ? error.name : typeof error
      }
    })
  }
}
