// Zod schemas validating everything that crosses the investigations API
// boundary: the `InvestigationState` domain payload (kept in sync with
// src/types/apps/investigator-types.ts), request bodies, and list-query
// params. Explicit schemas double as the "explicit select fields" and
// "validate payload size/schema" requirements from the task brief — nothing
// reaches the repository/service layer without passing through here first.
import * as z from 'zod'

import { SCHEMA_VERSION } from '@/utils/investigator/workspace'

import { InvestigationError } from './errors'

// ─── Límites de tamaño ───────────────────────────────────────────────────────

// Applies to the serialized `state` payload only (not the whole HTTP body,
// which is bounded separately in `http.ts`). Set to 2 MB to safely support
// rich investigations with extensive factor matrices and CAME action plans.
export const MAX_STATE_PAYLOAD_BYTES = 2 * 1024 * 1024

export const MAX_TITLE_LENGTH = 300

// ─── Fragmentos de dominio ───────────────────────────────────────────────────

const factorTypeSchema = z.enum(['F', 'D', 'O', 'A'])
const factorGroupSchema = z.enum(['internal', 'external'])
const quadrantSchema = z.enum(['FO', 'DO', 'FA', 'DA'])
const cameTypeSchema = z.enum(['C', 'A', 'M', 'E'])
const cameActionStatusSchema = z.enum(['propuesta', 'en curso', 'completada', 'pausada'])

const shortText = (max: number) => z.string().max(max)
const idSchema = z.string().min(1).max(64)

const factorSchema = z.object({
  id: idSchema,
  name: shortText(500),
  type: factorTypeSchema,
  group: factorGroupSchema,
  weight: z.number().finite(),
  rating: z.number().finite(),
  description: shortText(4000),
  evidence: shortText(4000)
})

const relationshipSchema = z.object({
  id: idSchema,
  internalId: shortText(64),
  externalId: shortText(64),
  quadrant: quadrantSchema.nullable(),
  strength: z.number().finite().nullable(),
  status: shortText(64),
  justification: shortText(4000),
  evidence: shortText(4000),
  evaluator: shortText(200),
  date: shortText(64)
})

const strategySchema = z.object({
  id: idSchema,
  name: shortText(500),
  quadrant: quadrantSchema,
  orientation: shortText(200),
  description: shortText(4000),
  relatedFactors: z.array(shortText(64)).max(200),
  observations: shortText(4000)
})

const cameCriterionSchema = z.object({
  id: idSchema,
  name: shortText(200),
  weight: z.number().finite()
})

const cameCriteriaValuesSchema = z.object({
  impact: z.number().finite(),
  urgency: z.number().finite(),
  severity: z.number().finite(),
  alignment: z.number().finite(),
  feasibility: z.number().finite()
})

const cameActionSchema = z.object({
  id: idSchema,
  type: cameTypeSchema,
  factorId: shortText(64),
  factor: shortText(500),
  strategyId: shortText(64),
  problem: shortText(4000),
  objective: shortText(4000),
  action: shortText(4000),
  responsible: shortText(200),
  participants: shortText(1000),
  resources: z.array(shortText(200)).max(100),
  startDate: shortText(64),
  endDate: shortText(64),
  indicator: shortText(1000),
  baseline: shortText(1000),
  target: shortText(1000),
  frequency: shortText(200),
  status: cameActionStatusSchema,
  criteria: cameCriteriaValuesSchema,
  justification: shortText(4000),
  observations: shortText(4000)
})

export const investigationCollaboratorSchema = z.object({
  userId: z.string().uuid(),
  displayName: shortText(200),
  avatarUrl: shortText(1000).nullable().optional(),
  email: shortText(200).nullable().optional(),
  role: z.enum(['editor', 'viewer']),
  addedAt: shortText(64)
})

export type InvestigationCollaboratorPayload = z.infer<typeof investigationCollaboratorSchema>

const metadataSchema = z.object({
  id: idSchema,
  label: shortText(200),
  organization: shortText(500),
  unit: shortText(500),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  author: shortText(200),
  evaluationDate: shortText(64),
  validation: shortText(64),
  status: shortText(64),
  problem: shortText(4000),
  objective: shortText(4000),
  assumptions: shortText(4000),
  methodologicalVersion: shortText(64),
  updatedAt: shortText(64),
  archivedAt: shortText(64).nullable(),
  isLocked: z.boolean().optional(),
  accessLevel: z.enum(['private', 'team_read', 'team_write']).optional(),
  collaborators: z.array(investigationCollaboratorSchema).max(100).optional()
})

const qspmScoresSchema = z.record(z.string(), z.record(z.string(), z.number().finite().nullable()))

const historyChangeDetailSchema = z.object({
  area: z.enum(['metadata', 'internal', 'external', 'relationships', 'strategies', 'came', 'qspm']),
  action: z.enum(['create', 'update', 'delete', 'reorder']),
  summary: shortText(500),
  entityId: shortText(64).optional()
})

const historyEntrySchema = z.object({
  id: idSchema,
  version: z.number().int().nonnegative(),
  timestamp: shortText(64),
  reason: shortText(500),
  authorName: shortText(200).optional().nullable(),
  changes: z.array(historyChangeDetailSchema).max(100).optional(),
  snapshot: z.record(z.string(), z.unknown()).optional().nullable()
})

export const investigationStateSchema = z.object({
  metadata: metadataSchema,
  internal: z.array(factorSchema).max(500),
  external: z.array(factorSchema).max(500),
  relationships: z.array(relationshipSchema).max(2000),
  strategies: z.array(strategySchema).max(200),
  qspmScores: qspmScoresSchema,
  selectedStrategyId: shortText(64).nullable(),
  selectionJustification: shortText(4000),
  cameCriteria: z.array(cameCriterionSchema).max(50),
  cameActions: z.array(cameActionSchema).max(500),
  history: z.array(historyEntrySchema).max(50)
})

export type InvestigationStatePayload = z.infer<typeof investigationStateSchema>

export const exportPdfRequestSchema = z.object({
  state: investigationStateSchema
})

export type ExportPdfRequest = z.infer<typeof exportPdfRequestSchema>

// Rejects the payload before it is even handed to zod field-by-field
// validation, so an attacker cannot force expensive parsing of huge bodies.
export function assertStatePayloadSize(state: unknown): void {
  const size = Buffer.byteLength(JSON.stringify(state ?? {}), 'utf-8')

  if (size > MAX_STATE_PAYLOAD_BYTES) {
    throw InvestigationError.payloadTooLarge(MAX_STATE_PAYLOAD_BYTES)
  }
}

// ─── Esquemas de request ─────────────────────────────────────────────────────

export const idParamSchema = z.string().uuid()

export const createInvestigationRequestSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  state: investigationStateSchema,
  schemaVersion: z.number().int().positive().default(SCHEMA_VERSION),
  idempotencyKey: z.string().min(1).max(128).optional(),
  source: z.enum(['user', 'migration']).default('user')
})

export type CreateInvestigationRequest = z.infer<typeof createInvestigationRequestSchema>

export const patchInvestigationRequestSchema = z
  .object({
    version: z.number().int().positive(),
    title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
    state: investigationStateSchema.optional(),
    isLocked: z.boolean().optional(),
    accessLevel: z.enum(['private', 'team_read', 'team_write']).optional(),
    collaborators: z.array(investigationCollaboratorSchema).max(100).optional()
  })
  .refine(
    payload =>
      payload.title !== undefined ||
      payload.state !== undefined ||
      payload.isLocked !== undefined ||
      payload.accessLevel !== undefined ||
      payload.collaborators !== undefined,
    {
      message: 'El PATCH debe incluir "title", "state", "isLocked", "accessLevel" y/o "collaborators".'
    }
  )

export type PatchInvestigationRequest = z.infer<typeof patchInvestigationRequestSchema>

export const versionOnlyRequestSchema = z.object({
  version: z.number().int().positive()
})

export type VersionOnlyRequest = z.infer<typeof versionOnlyRequestSchema>

export const listInvestigationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().max(64).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform(value => value === 'true')
})

export type ListInvestigationsQuery = z.infer<typeof listInvestigationsQuerySchema>
