import 'server-only'

import { requireAuthenticatedUser, requirePlatformCapability } from '@/features/access/access-service'
import {
  asBillingClient,
  uncheckedBillingTable,
  type BillingInvoiceRow,
  type BillingSupabaseClient,
  type BillingWebhookEventRow
} from '@/features/billing/db-types'
import { logger } from '@/lib/logger'

// react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database, Json, LegalRetentionArchiveSource } from '@/lib/supabase/database.types'

export interface RetentionRunResult {
  success: boolean
  timestamp: string
  pendingRegistrationsDeleted: number
  vidRequestsRedacted: number
  legalRecordsArchived: number
  auditLogsRetentionStatus: string
  invoicesRetentionStatus: string
  paymentEvidenceRetentionStatus: string
  vidRetentionStatus: string
}

type ArchiveCandidate = {
  sourceTable: LegalRetentionArchiveSource
  sourceId: string
  tenantId: string | null
  sourceSnapshot: Json
  retentionUntil: string
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

const ARCHIVE_BATCH_LIMIT = 1000

const toArchiveCandidate = (
  sourceTable: LegalRetentionArchiveSource,
  row: { id: string; retention_until: string; tenant_id?: string | null }
): ArchiveCandidate => ({
  sourceTable,
  sourceId: row.id,
  tenantId: row.tenant_id ?? null,
  sourceSnapshot: JSON.parse(JSON.stringify(row)) as Json,
  retentionUntil: row.retention_until
})

const writeArchiveManifest = async (adminClient: AdminClient, candidates: ArchiveCandidate[]): Promise<number> => {
  if (candidates.length === 0) {
    return 0
  }

  const values: Database['public']['Tables']['legal_retention_archives']['Insert'][] = candidates.map(candidate => ({
    source_table: candidate.sourceTable,
    source_id: candidate.sourceId,
    tenant_id: candidate.tenantId,
    source_snapshot: candidate.sourceSnapshot,
    retention_until: candidate.retentionUntil
  }))

  const { data, error } = await adminClient
    .from('legal_retention_archives')
    .upsert(values, { onConflict: 'source_table,source_id', ignoreDuplicates: true })
    .select('id')

  if (error) {
    throw error
  }

  return data?.length ?? 0
}

const getExpiredBillingRows = async <Row extends { id: string; retention_until: string }>(
  billingAdminClient: BillingSupabaseClient,
  table: string,
  nowStr: string
): Promise<Row[]> => {
  const { data, error } = await uncheckedBillingTable(billingAdminClient, table)
    .select('*')
    .lte('retention_until', nowStr)
    .limit(ARCHIVE_BATCH_LIMIT)

  if (error) {
    throw error
  }

  return (data ?? []) as Row[]
}

export async function executePlatformRetentionRun(): Promise<RetentionRunResult> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.auth.registrations.manage')
  const adminClient = createSupabaseAdminClient()
  const billingAdminClient = asBillingClient(adminClient)
  const nowStr = new Date().toISOString()

  const { data: cleanupRows, error: cleanupError } = await adminClient.rpc('cleanup_pending_registrations', {})

  if (cleanupError) {
    throw cleanupError
  }

  const pendingCount = Number(cleanupRows?.[0]?.deleted_count ?? 0)

  const { data: expiredVidRows, error: vidSelectionError } = await adminClient
    .from('vid_requests')
    .select('id')
    .lt('retention_until', nowStr)
    .is('redacted_at', null)
    .limit(ARCHIVE_BATCH_LIMIT)

  if (vidSelectionError) {
    throw vidSelectionError
  }

  const expiredVidIds = (expiredVidRows ?? []).map(row => row.id)
  let vidRedactedCount = 0

  if (expiredVidIds.length > 0) {
    const { data: redactedRows, error: vidRedactionError } = await adminClient
      .from('vid_requests')
      .update({
        provider_reference: null,
        decision_reason: null,
        reviewer_user_id: null,
        metadata: {
          retention_policy: 'redacted_after_expiry',
          redacted_at: nowStr
        },
        redacted_at: nowStr,
        updated_at: nowStr
      })
      .in('id', expiredVidIds)
      .lt('retention_until', nowStr)
      .is('redacted_at', null)
      .select('id')

    if (vidRedactionError) {
      throw vidRedactionError
    }

    vidRedactedCount = redactedRows?.length ?? 0
  }

  const { data: expiredAuditRows, error: auditSelectionError } = await adminClient
    .from('audit_logs')
    .select('*')
    .lte('retention_until', nowStr)
    .limit(ARCHIVE_BATCH_LIMIT)

  if (auditSelectionError) {
    throw auditSelectionError
  }

  const { data: expiredAccessGrantRows, error: accessGrantSelectionError } = await adminClient
    .from('access_grants')
    .select('*')
    .not('provider_payment_id', 'is', null)
    .lte('retention_until', nowStr)
    .limit(ARCHIVE_BATCH_LIMIT)

  if (accessGrantSelectionError) {
    throw accessGrantSelectionError
  }

  const expiredInvoiceRows = await getExpiredBillingRows<Pick<BillingInvoiceRow, 'id' | 'tenant_id' | 'retention_until'>>(
    billingAdminClient,
    'billing_invoices',
    nowStr
  )

  const expiredWebhookRows = await getExpiredBillingRows<Pick<BillingWebhookEventRow, 'id' | 'retention_until'>>(
    billingAdminClient,
    'billing_webhook_events',
    nowStr
  )

  const { data: expiredVidArchiveRows, error: vidArchiveSelectionError } = await adminClient
    .from('vid_requests')
    .select('*')
    .lte('retention_until', nowStr)
    .not('redacted_at', 'is', null)
    .limit(ARCHIVE_BATCH_LIMIT)

  if (vidArchiveSelectionError) {
    throw vidArchiveSelectionError
  }

  const archiveCandidates: ArchiveCandidate[] = [
    ...(expiredAuditRows ?? []).map(row => toArchiveCandidate('audit_logs', row)),
    ...(expiredInvoiceRows ?? []).map(row => toArchiveCandidate('billing_invoices', row)),
    ...(expiredWebhookRows ?? []).map(row => toArchiveCandidate('billing_webhook_events', row)),
    ...(expiredAccessGrantRows ?? []).map(row => toArchiveCandidate('access_grants', row)),
    ...(expiredVidArchiveRows ?? []).map(row => toArchiveCandidate('vid_requests', row))
  ]

  const legalRecordsArchived = await writeArchiveManifest(adminClient, archiveCandidates)

  const { error: auditError } = await adminClient.from('audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'system',
    action: 'platform.retention.cleanup_executed',
    entity_type: 'retention_job',
    entity_id: null,
    metadata: {
      timestamp: nowStr,
      pendingRegistrationsDeleted: pendingCount,
      vidRequestsRedacted: vidRedactedCount,
      legalRecordsArchived,
      legalRetentionYearsMin: 7,
      paymentEvidenceTables: ['access_grants', 'billing_webhook_events']
    }
  })

  if (auditError) {
    throw auditError
  }

  logger.info('La ejecución de retención legal finalizó', {
    action: 'retention-service',
    details: {
      pendingRegistrationsDeleted: pendingCount,
      vidRequestsRedacted: vidRedactedCount,
      legalRetentionYearsMin: 7
    }
  })

  return {
    success: true,
    timestamp: nowStr,
    pendingRegistrationsDeleted: pendingCount,
    vidRequestsRedacted: vidRedactedCount,
    legalRecordsArchived,
    auditLogsRetentionStatus:
      'Minimum 7-year legal retention is database-enforced; audit logs remain append-only and deletion-protected. Expired rows are represented in an immutable archive manifest.',
    invoicesRetentionStatus:
      'Minimum 7-year legal retention is database-enforced; invoices remain append-only and deletion-protected. Expired rows are represented in an immutable archive manifest.',
    paymentEvidenceRetentionStatus:
      'Minimum 7-year legal retention is database-enforced for paid grants and sanitized webhook evidence; deadlines cannot be shortened and expired rows are represented in an immutable archive manifest.',
    vidRetentionStatus:
      'Expired VID metadata is redacted in place and represented in an immutable archive manifest; the request row cannot be deleted before its legal deadline.'
  }
}
