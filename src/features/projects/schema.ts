import { z } from 'zod'

export const projectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const projectBudgetModeSchema = z.enum(['action_based', 'total_first'])
export const projectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
export const projectMemberRoleSchema = z.enum(['leader', 'member'])
export const cameActionTypeSchema = z.enum(['C', 'A', 'M', 'E'])

export const projectCameActionInputSchema = z.object({
  cameActionId: z.string().min(1).max(64),
  actionType: cameActionTypeSchema,
  title: z.string().min(1).max(2000),
  budgetAllocated: z.number().nonnegative().default(0),
  snapshot: z.record(z.string(), z.unknown()).default({})
})

export const projectActivityInputSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  description: z.string().trim().max(4000).optional().default(''),
  priority: projectPrioritySchema.default('medium'),
  columnId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  assigneeIds: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  cameActionId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  budgetAmount: z.number().nonnegative().default(0)
})

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del proyecto es obligatorio').max(300),
  description: z.string().trim().max(4000).default(''),
  objective: z.string().trim().max(4000).default(''),
  priority: projectPrioritySchema.default('medium'),
  startDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  endDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  investigationId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  workspaceId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  teamId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  leaderUserId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  budgetMode: projectBudgetModeSchema.default('action_based'),
  budgetTotal: z.number().nonnegative().default(0),
  cameActions: z.array(projectCameActionInputSchema).default([]),
  activities: z.array(projectActivityInputSchema).default([]),
  idempotencyKey: z.string().trim().max(128).optional().nullable().or(z.literal('').transform(() => null))
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'La fecha de finalización debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  }
).refine(
  data => {
    if (data.budgetMode === 'total_first' && data.budgetTotal > 0) {
      const sumActivities = data.activities.reduce((acc, act) => acc + (act.budgetAmount || 0), 0)
      const sumActions = data.cameActions.reduce((acc, act) => acc + (act.budgetAllocated || 0), 0)
      const allocated = Math.max(sumActivities, sumActions)
      return allocated <= data.budgetTotal
    }
    return true
  },
  {
    message: 'La suma de los presupuestos asignados no puede exceder el presupuesto total del proyecto',
    path: ['budgetTotal']
  }
)

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  objective: z.string().trim().max(4000).optional(),
  priority: projectPrioritySchema.optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  leaderUserId: z.string().uuid().optional().nullable(),
  budgetTotal: z.number().nonnegative().optional(),
  budgetMode: projectBudgetModeSchema.optional(),
  status: projectStatusSchema.optional()
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'La fecha de finalización debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  }
)

export const projectFilterSchema = z.object({
  investigationId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  status: projectStatusSchema.optional()
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectCameActionInput = z.infer<typeof projectCameActionInputSchema>
export type ProjectActivityInput = z.infer<typeof projectActivityInputSchema>
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>
