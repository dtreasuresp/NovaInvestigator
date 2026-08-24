// Application service for investigations: wires access control (tenant +
// capability), payload validation, and the repository together, and maps
// DB rows to the camelCase DTOs returned by the Route Handlers. This is the
// only module route handlers under src/app/api/investigations should import
// from — repository/access/db-types stay internal implementation details.
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { Json } from '@/lib/supabase/database.types'

import {
  assertInvestigationsCapability,
  assertInvestigationsCommercialAccess,
  assertInvestigationsEntitlement,
  assertInvestigationsPdfEntitlement,
  assertInvestigationsPdfRateLimit,
  requireInvestigationsPrincipal
} from './access'
import { INVESTIGATIONS_CAPABILITIES } from './capabilities'
import type { InvestigationsCapability } from './capabilities'
import { InvestigationError } from './errors'
import {
  applyVersionedUpdate,
  countActiveInvestigations,
  createInvestigationRow,
  findInvestigationByIdempotencyKey,
  getInvestigationById,
  listInvestigationMetadata,
  touchInvestigationAccess,
  type InvestigationMetadataRow
} from './repository'
import { assertStatePayloadSize } from './schema'
import type {
  CreateInvestigationRequest,
  InvestigationStatePayload,
  ListInvestigationsQuery,
  PatchInvestigationRequest,
  VersionOnlyRequest
} from './schema'
import type { InvestigationRow, InvestigationsSupabaseClient } from './db-types'
import { recordAuditEntry } from '@/features/users/audit'

// Validated state payloads come from JSON.parse + zod, so they are always
// JSON-safe data; this is the single, explicit boundary where that shape is
// treated as the `Json` column type the repository/DB expects.
const toJsonState = (state: InvestigationStatePayload): Json => state as unknown as Json

const DEFAULT_STATUS = 'borrador'
const DEFAULT_TITLE = 'Investigación sin título'

export interface InvestigationMetadataDto {
  id: string
  title: string
  status: string
  archivedAt: string | null
  schemaVersion: number
  version: number
  createdAt: string
  updatedAt: string
  updatedBy: string | null
  ownerId: string
  lastOpenedAt: string | null
  lastOpenedBy: string | null
  isLocked: boolean
  accessLevel: 'private' | 'team_read' | 'team_write'
  createdByName?: string | null
  updatedByName?: string | null
  lastOpenedByName?: string | null
}

export interface InvestigationRecordDto extends InvestigationMetadataDto {
  state: InvestigationState
}

export interface ListInvestigationsResultDto {
  items: InvestigationMetadataDto[]
  page: number
  pageSize: number
  total: number
}

const toMetadataDto = (
  row: InvestigationMetadataRow,
  profilesMap?: Map<string, string>
): InvestigationMetadataDto => ({
  id: row.id,
  title: row.title,
  status: row.status,
  archivedAt: row.archived_at,
  schemaVersion: row.schema_version,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  ownerId: row.owner_id,
  lastOpenedAt: row.last_opened_at,
  lastOpenedBy: row.last_opened_by,
  isLocked: row.is_locked ?? false,
  accessLevel: row.access_level ?? 'team_write',
  createdByName: (row.owner_id && profilesMap?.get(row.owner_id)) || null,
  updatedByName: (row.updated_by && profilesMap?.get(row.updated_by)) || null,
  lastOpenedByName: (row.last_opened_by && profilesMap?.get(row.last_opened_by)) || null
})

const toRecordDto = (
  row: InvestigationRow,
  profilesMap?: Map<string, string>
): InvestigationRecordDto => ({
  ...toMetadataDto(row, profilesMap),

  // The column is validated on the way in via `investigationStateSchema`; it
  // is trusted as `InvestigationState` on the way out rather than
  // re-validated on every read.
  state: row.state as unknown as InvestigationState
})

async function fetchProfilesMap(
  client: InvestigationsSupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const validIds = [...new Set(userIds.filter(Boolean))]

  if (validIds.length === 0) return map

  try {
    const { data } = await client.from('profiles').select('id, display_name').in('id', validIds)

    if (data) {
      data.forEach((p: { id: string; display_name: string | null }) => {
        if (p.id && p.display_name) {
          map.set(p.id, p.display_name)
        }
      })
    }
  } catch {
    // Non-blocking fallback
  }

  return map
}

export async function listInvestigations(query: ListInvestigationsQuery): Promise<ListInvestigationsResultDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.read)

  const result = await listInvestigationMetadata(principal.client, {
    tenantId: principal.tenantId,
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    includeArchived: query.includeArchived
  })

  const userIds: string[] = []
  result.items.forEach(item => {
    if (item.owner_id) userIds.push(item.owner_id)
    if (item.updated_by) userIds.push(item.updated_by)
    if (item.last_opened_by) userIds.push(item.last_opened_by)
  })

  const profilesMap = await fetchProfilesMap(principal.client, userIds)

  return { ...result, items: result.items.map(item => toMetadataDto(item, profilesMap)) }
}

export interface GetInvestigationOptions {
  touch?: boolean
}

export async function getInvestigation(
  id: string,
  options: GetInvestigationOptions = {}
): Promise<InvestigationRecordDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.read)

  const row = await getInvestigationById(principal.client, principal.tenantId, id)

  if (!row) {
    throw InvestigationError.notFound()
  }

  const isOwner = row.owner_id === principal.userId
  const rowState = row.state as unknown as InvestigationState | undefined
  const collaborators = rowState?.metadata?.collaborators || []
  const isCollaborator = collaborators.some(c => c.userId === principal.userId)

  if (row.access_level === 'private' && !isOwner && !isCollaborator) {
    throw InvestigationError.forbidden(
      'Esta investigación es privada y solo está disponible para el autor y colaboradores invitados.'
    )
  }

  // Record access asynchronously ONLY if explicitly requested (e.g. user opens this investigation)
  if (options.touch) {
    void touchInvestigationAccess(principal.client, principal.tenantId, id, principal.userId)
  }

  const userIds = [row.owner_id, row.updated_by, row.last_opened_by, principal.userId].filter(Boolean) as string[]
  const profilesMap = await fetchProfilesMap(principal.client, userIds)

  return toRecordDto(row, profilesMap)
}

export interface InvestigationExportDto {
  readonly id: string
  readonly status: 'prepared'
  readonly generationUrl: string
  readonly allowedAt: string
}

// Pure DTO builder, kept separate from the DB-dependent flow so it can be
// unit-tested without a Supabase client (repo test convention: pure-function
// tests, no mocking).
export function buildInvestigationExportDto(id: string, allowedAt: Date): InvestigationExportDto {
  return {
    id,
    status: 'prepared',
    generationUrl: '/api/generar-pdf',
    allowedAt: allowedAt.toISOString()
  }
}

// Prepares a PDF export request (plan section 14.2). Validates the full
// access chain — principal, commercial access, `investigations.export`
// capability, PDF entitlement by modality, per-tenant rate limit, and
// titularidad (the investigation must belong to the caller's tenant) — and
// returns a prepared DTO with the URL of the single renderer. The renderer
// at `/api/generar-pdf` is the ONLY place that generates the PDF and the
// ONLY place that consumes the monthly entitlement; this function never
// consumes quota nor performs the rendering.
export async function prepareInvestigationExport(id: string): Promise<InvestigationExportDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.export)
  await assertInvestigationsPdfEntitlement(principal)
  await assertInvestigationsPdfRateLimit(principal)

  const row = await getInvestigationById(principal.client, principal.tenantId, id)

  if (!row) {
    throw InvestigationError.notFound()
  }

  return buildInvestigationExportDto(row.id, new Date())
}

export async function createInvestigation(input: CreateInvestigationRequest): Promise<InvestigationRecordDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.create)
  await assertInvestigationsEntitlement(principal, 'investigations.create')

  if (input.idempotencyKey) {
    const existing = await findInvestigationByIdempotencyKey(
      principal.client,
      principal.tenantId,
      input.idempotencyKey
    )

    if (existing) {
      return toRecordDto(existing)
    }
  }

  assertStatePayloadSize(input.state)

  const title = input.title?.trim() || input.state.metadata?.title?.trim() || DEFAULT_TITLE
  const status = input.state.metadata?.status || DEFAULT_STATUS
  const activeInvestigationCount = await countActiveInvestigations(principal.client, principal.tenantId)

  await assertInvestigationsEntitlement(principal, 'investigations.max_active', activeInvestigationCount)

  const result = await createInvestigationRow(principal.client, {
    tenantId: principal.tenantId,
    ownerId: principal.userId,
    title,
    status,
    state: toJsonState(input.state),
    schemaVersion: input.schemaVersion,
    idempotencyKey: input.idempotencyKey
  })

  if (input.source === 'migration' && result.created) {
    await recordAuditEntry({
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      source: 'migration',
      action: 'investigations.migrated',
      entityType: 'investigation',
      entityId: result.row.id,
      metadata: {
        idempotencyKey: input.idempotencyKey ?? null
      }
    })
  }

  return toRecordDto(result.row)
}

export async function patchInvestigation(
  id: string,
  input: PatchInvestigationRequest
): Promise<InvestigationRecordDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.update)

  if (input.state) {
    assertStatePayloadSize(input.state)
  }

  const existing = await getInvestigationById(principal.client, principal.tenantId, id)

  if (!existing) {
    throw InvestigationError.notFound()
  }

  const isOwner = existing.owner_id === principal.userId
  const existingState = existing.state as unknown as InvestigationState | undefined
  const existingCollaborators = existingState?.metadata?.collaborators || []
  const isCollaboratorEditor = existingCollaborators.some(
    c => c.userId === principal.userId && c.role === 'editor'
  )

  if ((existing.is_locked || existing.access_level === 'team_read') && !isOwner && !isCollaboratorEditor) {
    throw InvestigationError.locked(
      'Esta investigación está protegida por su autor y se encuentra en modo solo lectura para el equipo.'
    )
  }

  if (
    (input.isLocked !== undefined || input.accessLevel !== undefined || input.collaborators !== undefined) &&
    !isOwner
  ) {
    throw InvestigationError.locked(
      'Solo el autor de la investigación puede modificar los permisos de protección, acceso o colaboradores.'
    )
  }

  const nextCollaborators =
    input.collaborators !== undefined
      ? input.collaborators
      : input.state?.metadata?.collaborators !== undefined
        ? input.state.metadata.collaborators
        : existingCollaborators

  const nextState = input.state
    ? {
        ...input.state,
        metadata: {
          ...(input.state.metadata || {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.isLocked !== undefined ? { isLocked: input.isLocked } : {}),
          ...(input.accessLevel !== undefined ? { accessLevel: input.accessLevel } : {}),
          collaborators: nextCollaborators
        }
      }
    : (input.isLocked !== undefined ||
        input.accessLevel !== undefined ||
        input.collaborators !== undefined ||
        input.title !== undefined) &&
      existing.state
      ? {
          ...(existing.state as unknown as InvestigationState),
          metadata: {
            ...((existing.state as unknown as InvestigationState).metadata || {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.isLocked !== undefined ? { isLocked: input.isLocked } : {}),
            ...(input.accessLevel !== undefined ? { accessLevel: input.accessLevel } : {}),
            collaborators: nextCollaborators
          }
        }
      : undefined

  const row = await applyVersionedUpdate(principal.client, {
    tenantId: principal.tenantId,
    id,
    expectedVersion: input.version,
    changedBy: principal.userId,
    reason: 'actualización',
    patch: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.isLocked !== undefined ? { is_locked: input.isLocked } : {}),
      ...(input.accessLevel !== undefined ? { access_level: input.accessLevel } : {}),
      ...(nextState
        ? {
            state: toJsonState(nextState as unknown as InvestigationStatePayload),
            ...(nextState.metadata?.status ? { status: nextState.metadata.status } : {})
          }
        : {})
    }
  })

  const userIds = [row.owner_id, row.updated_by, row.last_opened_by, principal.userId].filter(Boolean) as string[]
  const profilesMap = await fetchProfilesMap(principal.client, userIds)

  return toRecordDto(row, profilesMap)
}

async function transitionInvestigation(
  id: string,
  input: VersionOnlyRequest,
  capability: InvestigationsCapability,
  reason: string,
  patch: { status?: string; archived_at?: string | null }
): Promise<InvestigationRecordDto> {
  const principal = await requireInvestigationsPrincipal()

  await assertInvestigationsCommercialAccess(principal)
  await assertInvestigationsCapability(principal, capability)

  const row = await applyVersionedUpdate(principal.client, {
    tenantId: principal.tenantId,
    id,
    expectedVersion: input.version,
    changedBy: principal.userId,
    reason,
    patch
  })

  return toRecordDto(row)
}

export async function archiveInvestigation(id: string, input: VersionOnlyRequest): Promise<InvestigationRecordDto> {
  return transitionInvestigation(id, input, INVESTIGATIONS_CAPABILITIES.archive, 'archivado', {
    archived_at: new Date().toISOString()
  })
}

export async function restoreInvestigation(id: string, input: VersionOnlyRequest): Promise<InvestigationRecordDto> {
  return transitionInvestigation(id, input, INVESTIGATIONS_CAPABILITIES.restore, 'restaurado', {
    archived_at: null
  })
}

export async function closeInvestigation(id: string, input: VersionOnlyRequest): Promise<InvestigationRecordDto> {
  return transitionInvestigation(id, input, INVESTIGATIONS_CAPABILITIES.close, 'cierre', {
    status: 'cerrada'
  })
}
