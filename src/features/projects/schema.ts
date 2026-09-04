import { z } from 'zod'

export const projectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const projectBudgetModeSchema = z.enum(['action_based', 'total_first'])
export const projectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
export const projectActivityStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
export const projectMemberRoleSchema = z.enum(['leader', 'member'])
export const cameActionTypeSchema = z.enum(['C', 'A', 'M', 'E'])
export const planningModeSchema = z.enum(['quick', 'detailed'])

export const projectCameActionInputSchema = z.object({
  cameActionId: z.string().min(1).max(64),
  actionType: cameActionTypeSchema,
  title: z.string().min(1).max(2000),
  budgetAllocated: z.number().nonnegative().default(0),
  snapshot: z.record(z.string(), z.unknown()).default({})
})

export const projectTaskInputSchema = z.object({
  title: z.string().trim().min(1, 'El título de la tarea es obligatorio').max(1000),
  description: z.string().trim().max(4000).optional().default(''),
  priority: projectPrioritySchema.default('medium'),
  columnId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  assigneeIds: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  budgetAmount: z.number().nonnegative().default(0)
})

export const projectActivityInputSchema = z.object({
  id: z.string().optional().nullable(),
  cameActionId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  title: z.string().trim().min(1, 'El título de la actividad es obligatorio').max(1000),
  description: z.string().trim().max(4000).optional().default(''),
  ownerUserId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  priority: projectPrioritySchema.default('medium'),
  startDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  endDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  budget: z.number().nonnegative().default(0),
  status: projectActivityStatusSchema.default('pending'),
  // Backward compatibility fields for quick start or single-task mode
  columnId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  assigneeIds: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  budgetAmount: z.number().nonnegative().default(0),
  // Granular Kanban tasks
  tasks: z.array(projectTaskInputSchema).default([])
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'La fecha de finalización de la actividad debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  }
)

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
  strategicObjectiveId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  leaderUserId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  budgetMode: projectBudgetModeSchema.default('action_based'),
  budgetTotal: z.number().nonnegative().default(0),
  planningMode: planningModeSchema.default('quick'),
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
      const sumActivities = data.activities.reduce((acc, act) => {
        const actBudget = act.budget || act.budgetAmount || 0
        const tasksBudget = act.tasks?.reduce((tAcc, t) => tAcc + (t.budgetAmount || 0), 0) || 0
        return acc + Math.max(actBudget, tasksBudget)
      }, 0)
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
  name: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(4000).optional(),
  objective: z.string().trim().max(4000).optional(),
  priority: projectPrioritySchema.optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  workspaceId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  strategicObjectiveId: z.string().uuid().optional().nullable(),
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

export const createProjectActivitySchema = z.object({
  cameActionId: z.string().optional().nullable(),
  title: z.string().trim().min(1, 'El título es obligatorio').max(1000),
  description: z.string().trim().max(4000).optional().default(''),
  ownerUserId: z.string().uuid().optional().nullable(),
  priority: projectPrioritySchema.default('medium'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().nonnegative().default(0),
  status: projectActivityStatusSchema.default('pending')
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  }
)

export const updateProjectActivitySchema = z.object({
  cameActionId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(1000).optional(),
  description: z.string().trim().max(4000).optional(),
  ownerUserId: z.string().uuid().optional().nullable(),
  priority: projectPrioritySchema.optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().nonnegative().optional(),
  status: projectActivityStatusSchema.optional(),
  position: z.number().int().nonnegative().optional()
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate']
  }
)

export const projectFilterSchema = z.object({
  investigationId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  strategicObjectiveId: z.string().uuid().optional(),
  status: projectStatusSchema.optional()
})

export const syncProjectCameActionsSchema = z.object({
  cameActionIds: z.array(z.string().min(1)).min(1, 'Debe seleccionar al menos una acción CAME para sincronizar')
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateProjectActivityInput = z.infer<typeof createProjectActivitySchema>
export type UpdateProjectActivityInput = z.infer<typeof updateProjectActivitySchema>
export type SyncProjectCameActionsInput = z.infer<typeof syncProjectCameActionsSchema>
export type ProjectCameActionInput = z.infer<typeof projectCameActionInputSchema>
export type ProjectActivityInput = z.infer<typeof projectActivityInputSchema>
export type ProjectTaskInput = z.infer<typeof projectTaskInputSchema>
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>
