// Supabase-backed repository for the `investigations` / `investigation_revisions`
// tables (doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// sections 9.17-9.18 and 14.1). Every query is explicitly column-scoped (no
// `select('*')`) and every write is tenant-scoped. Optimistic concurrency is
// enforced at the SQL level: mutating queries always include
// `eq('version', expectedVersion)` so a stale write can never silently
// clobber another session's change — the caller distinguishes "not found"
// from "version conflict" by re-reading the row after a no-op update.
import type { Json } from '@/lib/supabase/database.types'
import { logger } from '@/lib/logger'

import { InvestigationError } from './errors'
import type { InvestigationRow, InvestigationsSupabaseClient } from './db-types'

// Metadata-only projection used by the paginated list endpoint. Deliberately
// excludes `state`, which can be large and is only needed by the single-item
// GET.
// Metadata-only projection used by the paginated list endpoint. Deliberately
// excludes `state`, which can be large and is only needed by the single-item
// GET.
const METADATA_COLUMNS =
  'id, tenant_id, owner_id, title, status, archived_at, schema_version, version, created_at, updated_at, updated_by, last_opened_at, last_opened_by, is_locked, access_level' as const

const FULL_COLUMNS = `${METADATA_COLUMNS}, state, idempotency_key` as const

export type InvestigationMetadataRow = Omit<InvestigationRow, 'state' | 'idempotency_key'>

export interface ListInvestigationsParams {
  tenantId: string
  page: number
  pageSize: number
  status?: string
  includeArchived: boolean
}

export interface ListInvestigationsResult {
  items: InvestigationMetadataRow[]
  page: number
  pageSize: number
  total: number
}

export async function countActiveInvestigations(
  client: InvestigationsSupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await client
    .from('investigations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('archived_at', null)

  if (error) {
    throw InvestigationError.internal('No se pudo comprobar el uso de investigaciones del tenant.')
  }

  return count ?? 0
}

export async function listInvestigationMetadata(
  client: InvestigationsSupabaseClient,
  params: ListInvestigationsParams
): Promise<ListInvestigationsResult> {
  const { tenantId, page, pageSize, status, includeArchived } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('investigations')
    .select(METADATA_COLUMNS, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error('No se pudo listar las investigaciones desde Supabase', {
      action: 'investigations.repository.list',
      details: {
        errorMessage: error.message,
        errorCode: error.code,
        tenantId
      }
    })
    throw InvestigationError.internal('No se pudo listar las investigaciones.')
  }

  return { items: (data ?? []) as InvestigationMetadataRow[], page, pageSize, total: count ?? 0 }
}

export async function getInvestigationById(
  client: InvestigationsSupabaseClient,
  tenantId: string,
  id: string
): Promise<InvestigationRow | null> {
  const { data, error } = await client
    .from('investigations')
    .select(FULL_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw InvestigationError.internal('No se pudo leer la investigación.')
  }

  return (data as InvestigationRow | null) ?? null
}

export async function touchInvestigationAccess(
  client: InvestigationsSupabaseClient,
  tenantId: string,
  id: string,
  userId: string
): Promise<void> {
  try {
    const { error: rpcError } = await client.rpc('touch_investigation_access', {
      p_investigation_id: id,
      p_tenant_id: tenantId,
      p_user_id: userId
    })

    if (!rpcError) return

    // Fallback to direct update if rpc is not available
    const { error } = await client
      .from('investigations')
      .update({
        last_opened_at: new Date().toISOString(),
        last_opened_by: userId
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) {
      logger.warn('No se pudo registrar el acceso a la investigación', {
        action: 'investigations.touch_access',
        details: { id, tenantId, userId, errorMessage: error.message }
      })
    }
  } catch (err) {
    logger.warn('Error inesperado al registrar el acceso a la investigación', {
      action: 'investigations.touch_access',
      details: { id, tenantId, userId, errorMessage: err instanceof Error ? err.message : String(err) }
    })
  }
}

export interface CreateInvestigationInput {
  tenantId: string
  ownerId: string
  title: string
  status: string
  state: Json
  schemaVersion: number
  idempotencyKey?: string
}

export interface CreateInvestigationResult {
  row: InvestigationRow
  created: boolean
}

export async function findInvestigationByIdempotencyKey(
  client: InvestigationsSupabaseClient,
  tenantId: string,
  idempotencyKey: string
): Promise<InvestigationRow | null> {
  const { data, error } = await client
    .from('investigations')
    .select(FULL_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (error) {
    throw InvestigationError.internal('No se pudo comprobar la idempotencia de la investigación.')
  }

  return (data as InvestigationRow | null) ?? null
}

export async function createInvestigationRow(
  client: InvestigationsSupabaseClient,
  input: CreateInvestigationInput
): Promise<CreateInvestigationResult> {
  if (input.idempotencyKey) {
    const existing = await findInvestigationByIdempotencyKey(client, input.tenantId, input.idempotencyKey)

    if (existing) {
      return { row: existing, created: false }
    }
  }

  const { data, error } = await client
    .from('investigations')
    .insert({
      tenant_id: input.tenantId,
      owner_id: input.ownerId,
      title: input.title,
      status: input.status,
      archived_at: null,
      idempotency_key: input.idempotencyKey ?? null,
      state: input.state,
      schema_version: input.schemaVersion,
      version: 1,
      updated_by: input.ownerId,
      last_opened_at: new Date().toISOString(),
      last_opened_by: input.ownerId,
      is_locked: false,
      access_level: 'team_write'
    })
    .select(FULL_COLUMNS)
    .single()

  if (error || !data) {
    if (input.idempotencyKey && error?.code === '23505') {
      const existing = await findInvestigationByIdempotencyKey(client, input.tenantId, input.idempotencyKey)

      if (existing) {
        return { row: existing, created: false }
      }
    }

    throw InvestigationError.internal('No se pudo crear la investigación.')
  }

  const row = data as InvestigationRow

  await insertRevisionBestEffort(client, row, 'creación', input.ownerId)

  return { row, created: true }
}

export interface VersionedUpdateInput {
  tenantId: string
  id: string
  expectedVersion: number
  changedBy: string
  reason: string
  patch: {
    title?: string
    status?: string
    archived_at?: string | null
    state?: Json
    is_locked?: boolean
    access_level?: 'private' | 'team_read' | 'team_write'
  }
}

// Applies a conditional update guarded by `version`, bumping the version and
// `updated_at`/`updated_by` atomically. Throws `notFound` or
// `versionConflict` (never overwrites silently) when the condition does not
// match any row.
export async function applyVersionedUpdate(
  client: InvestigationsSupabaseClient,
  input: VersionedUpdateInput
): Promise<InvestigationRow> {
  const { tenantId, id, expectedVersion, patch, changedBy, reason } = input

  const { data, error } = await client
    .from('investigations')
    .update({
      ...patch,
      version: expectedVersion + 1,
      updated_by: changedBy

      // `updated_at` is expected to be refreshed by a database trigger/default,
      // consistent with the other tenant-scoped tables in this schema. If no
      // such trigger exists yet, reconcile by adding `updated_at: new Date().toISOString()` here.
    })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select(FULL_COLUMNS)
    .maybeSingle()

  if (error) {
    throw InvestigationError.internal('No se pudo actualizar la investigación.')
  }

  if (!data) {
    await raiseNotFoundOrConflict(client, tenantId, id)
  }

  const row = data as InvestigationRow

  await insertRevisionBestEffort(client, row, reason, changedBy)

  return row
}

// Distinguishes "the id does not exist for this tenant" (404) from "the id
// exists but someone else already changed the version" (409) after a
// conditional update matched zero rows.
async function raiseNotFoundOrConflict(
  client: InvestigationsSupabaseClient,
  tenantId: string,
  id: string
): Promise<never> {
  const { data, error } = await client
    .from('investigations')
    .select('version')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    throw InvestigationError.notFound()
  }

  throw InvestigationError.versionConflict(data.version)
}

// Revisions are an append-only audit trail (plan section 9.18). A failure to
// write one must not fail the primary mutation, but it must also never log
// the investigation `state` itself.
async function insertRevisionBestEffort(
  client: InvestigationsSupabaseClient,
  row: InvestigationRow,
  reason: string,
  changedBy: string
): Promise<void> {
  const { error } = await client.from('investigation_revisions').insert({
    investigation_id: row.id,
    tenant_id: row.tenant_id,
    version: row.version,
    state: row.state,
    reason,
    changed_by: changedBy
  })

  if (error) {
    logger.error('No se pudo registrar la revisión de la investigación', {
      action: 'investigations.revision.insert',
      details: {
        investigationId: row.id,
        version: row.version,
        errorType: error.name ?? 'supabase_error'
      }
    })
  }
}
