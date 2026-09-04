import { z } from 'zod'

export const strategicObjectiveStatusSchema = z.enum([
  'draft',
  'active',
  'at_risk',
  'achieved',
  'cancelled',
  'archived'
])

export const okrPeriodTypeSchema = z.enum(['quarterly', 'annual', 'custom'])
export const okrCycleStatusSchema = z.enum(['draft', 'active', 'closed', 'archived'])
export const okrCycleObjectiveStatusSchema = z.enum([
  'not_started',
  'on_track',
  'at_risk',
  'off_track',
  'achieved',
  'dropped'
])

const uuidSchema = z.string().uuid()
const optionalUuidSchema = uuidSchema.nullable().optional()
const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
  .refine(value => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'La fecha no es válida')

const dateRangeRefinement = <T extends { startDate?: string; endDate?: string }>(value: T) =>
  !value.startDate || !value.endDate || value.endDate >= value.startDate

export const createStrategicObjectiveSchema = z.object({
  title: z.string().trim().min(1, 'El título del objetivo es obligatorio').max(300),
  description: z.string().trim().max(4000).default(''),
  status: strategicObjectiveStatusSchema.default('draft'),
  workspaceId: optionalUuidSchema,
  teamId: optionalUuidSchema,
  ownerUserId: optionalUuidSchema,
  sourceInvestigationId: optionalUuidSchema,
  sourceCameActionId: z.string().trim().max(255).nullable().optional(),
  sourceSnapshot: z.record(z.string(), z.unknown()).default({})
})

export const updateStrategicObjectiveSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(4000).optional(),
    status: strategicObjectiveStatusSchema.optional(),
    workspaceId: optionalUuidSchema,
    teamId: optionalUuidSchema,
    ownerUserId: optionalUuidSchema,
    sourceInvestigationId: optionalUuidSchema,
    sourceCameActionId: z.string().trim().max(255).nullable().optional(),
    sourceSnapshot: z.record(z.string(), z.unknown()).optional()
  })
  .refine(
    value => Object.keys(value).some(key => key !== 'expectedVersion'),
    'Debe indicar al menos un campo para actualizar'
  )

export const createOkrCycleSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre del ciclo es obligatorio').max(300),
    description: z.string().trim().max(4000).default(''),
    periodType: okrPeriodTypeSchema.default('quarterly'),
    startDate: businessDateSchema,
    endDate: businessDateSchema,
    status: okrCycleStatusSchema.default('draft'),
    workspaceId: optionalUuidSchema,
    teamId: optionalUuidSchema,
    ownerUserId: optionalUuidSchema
  })
  .refine(dateRangeRefinement, {
    message: 'La fecha de finalización debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  })

export const updateOkrCycleSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    name: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(4000).optional(),
    periodType: okrPeriodTypeSchema.optional(),
    startDate: businessDateSchema.optional(),
    endDate: businessDateSchema.optional(),
    status: okrCycleStatusSchema.optional(),
    workspaceId: optionalUuidSchema,
    teamId: optionalUuidSchema,
    ownerUserId: optionalUuidSchema
  })
  .refine(dateRangeRefinement, {
    message: 'La fecha de finalización debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  })
  .refine(
    value => Object.keys(value).some(key => key !== 'expectedVersion'),
    'Debe indicar al menos un campo para actualizar'
  )

export const createOkrCycleObjectiveSchema = z.object({
  cycleId: uuidSchema,
  strategicObjectiveId: uuidSchema,
  ownerUserId: optionalUuidSchema,
  commitment: z.string().trim().max(4000).default(''),
  weight: z.number().positive().max(100000).default(1),
  status: okrCycleObjectiveStatusSchema.default('not_started'),
  progress: z.number().min(0).max(100).default(0)
})

export const updateOkrCycleObjectiveSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    ownerUserId: optionalUuidSchema,
    commitment: z.string().trim().max(4000).optional(),
    weight: z.number().positive().max(100000).optional(),
    status: okrCycleObjectiveStatusSchema.optional(),
    progress: z.number().min(0).max(100).optional()
  })
  .refine(
    value => Object.keys(value).some(key => key !== 'expectedVersion'),
    'Debe indicar al menos un campo para actualizar'
  )

export const strategicObjectiveIdSchema = uuidSchema
export const okrCycleIdSchema = uuidSchema
export const okrCycleObjectiveIdSchema = uuidSchema

export const strategicObjectiveFilterSchema = z.object({
  status: strategicObjectiveStatusSchema.optional(),
  workspaceId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  ownerUserId: uuidSchema.optional()
})

export const okrCycleFilterSchema = z.object({
  status: okrCycleStatusSchema.optional(),
  periodType: okrPeriodTypeSchema.optional(),
  workspaceId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  ownerUserId: uuidSchema.optional()
})

export const okrCycleObjectiveFilterSchema = z.object({
  cycleId: uuidSchema.optional(),
  strategicObjectiveId: uuidSchema.optional(),
  status: okrCycleObjectiveStatusSchema.optional()
})

export type CreateStrategicObjectiveInput = z.infer<typeof createStrategicObjectiveSchema>
export type UpdateStrategicObjectiveInput = z.infer<typeof updateStrategicObjectiveSchema>
export type CreateOkrCycleInput = z.infer<typeof createOkrCycleSchema>
export type UpdateOkrCycleInput = z.infer<typeof updateOkrCycleSchema>
export type CreateOkrCycleObjectiveInput = z.infer<typeof createOkrCycleObjectiveSchema>
export type UpdateOkrCycleObjectiveInput = z.infer<typeof updateOkrCycleObjectiveSchema>
export type StrategicObjectiveFilterInput = z.infer<typeof strategicObjectiveFilterSchema>
export type OkrCycleFilterInput = z.infer<typeof okrCycleFilterSchema>
export type OkrCycleObjectiveFilterInput = z.infer<typeof okrCycleObjectiveFilterSchema>
