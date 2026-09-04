import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createProjectSchema,
  updateProjectSchema,
  projectFilterSchema,
  syncProjectCameActionsSchema,
  createProjectActivitySchema,
  updateProjectActivitySchema,
  projectActivityInputSchema
} from '../../src/features/projects/schema'
import { ProjectError } from '../../src/features/projects/errors'

describe('projects domain - schema validation', () => {
  it('validates a minimal valid standalone project', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Transformación Digital 2026'
    })

    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.name, 'Transformación Digital 2026')
      assert.equal(parsed.data.priority, 'medium')
      assert.equal(parsed.data.budgetMode, 'action_based')
      assert.equal(parsed.data.budgetTotal, 0)
      assert.equal(parsed.data.cameActions.length, 0)
      assert.equal(parsed.data.activities.length, 0)
    }
  })

  it('validates a derived project with CAME actions and activities', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Plan Estratégico Derivado',
      investigationId: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      teamId: '2f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      strategicObjectiveId: '4f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      priority: 'high',
      budgetMode: 'action_based',
      cameActions: [
        {
          cameActionId: 'C1',
          actionType: 'C',
          title: 'Corregir obsolescencia de servidores',
          budgetAllocated: 5000,
          snapshot: { impact: 4, urgency: 5 }
        }
      ],
      activities: [
        {
          title: 'Migración a la nube',
          priority: 'high',
          budgetAmount: 5000,
          cameActionId: 'C1',
          assigneeIds: ['3f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5']
        }
      ]
    })

    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.investigationId, '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5')
      assert.equal(parsed.data.cameActions.length, 1)
      assert.equal(parsed.data.activities.length, 1)
      assert.equal(parsed.data.activities[0].cameActionId, 'C1')
      assert.equal(parsed.data.strategicObjectiveId, '4f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5')
    }
  })

  it('fails when endDate is strictly before startDate', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Proyecto Temporal',
      startDate: '2026-09-01',
      endDate: '2026-08-01'
    })

    assert.equal(parsed.success, false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.includes('endDate'))
      assert.ok(issue)
    }
  })

  it('allows valid total_first mode when activities sum does not exceed total budget', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Proyecto con Presupuesto Fijo',
      budgetMode: 'total_first',
      budgetTotal: 10000,
      activities: [
        {
          title: 'Fase 1',
          priority: 'medium',
          budgetAmount: 4000,
          assigneeIds: []
        },
        {
          title: 'Fase 2',
          priority: 'medium',
          budgetAmount: 6000,
          assigneeIds: []
        }
      ]
    })

    assert.equal(parsed.success, true)
  })

  it('fails total_first mode when activities sum strictly exceeds total budget', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Proyecto Excedido',
      budgetMode: 'total_first',
      budgetTotal: 10000,
      activities: [
        {
          title: 'Fase 1',
          priority: 'medium',
          budgetAmount: 6000,
          assigneeIds: []
        },
        {
          title: 'Fase 2',
          priority: 'medium',
          budgetAmount: 5000,
          assigneeIds: []
        }
      ]
    })

    assert.equal(parsed.success, false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.includes('budgetTotal'))
      assert.ok(issue)
    }
  })

  it('fails validation when budgetTotal is exceeded in total_first mode', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Presupuesto Inválido',
      budgetMode: 'total_first',
      budgetTotal: 50000,
      cameActions: [
        {
          cameActionId: 'ACC-D-01',
          actionType: 'C',
          title: 'Acción cara',
          budgetAllocated: 60000
        }
      ],
      activities: []
    })

    assert.equal(parsed.success, false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.includes('budgetTotal'))
      assert.ok(issue)
    }
  })

  it('fails validation when endDate is before startDate', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Fechas Inválidas',
      startDate: '2026-12-31',
      endDate: '2026-01-01'
    })

    assert.equal(parsed.success, false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.includes('endDate'))
      assert.ok(issue)
    }
  })

  it('validates updateProjectSchema partial payloads', () => {
    const parsed = updateProjectSchema.safeParse({
      name: 'Nuevo Nombre de Proyecto',
      priority: 'urgent',
      status: 'active',
      strategicObjectiveId: '4f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5'
    })

    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.name, 'Nuevo Nombre de Proyecto')
      assert.equal(parsed.data.priority, 'urgent')
      assert.equal(parsed.data.status, 'active')
      assert.equal(parsed.data.strategicObjectiveId, '4f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5')
    }
  })

  it('validates syncProjectCameActionsSchema correctly', () => {
    const valid = syncProjectCameActionsSchema.safeParse({
      cameActionIds: ['ACC-F-01', 'ACC-D-02']
    })
    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.cameActionIds.length, 2)
    }

    const empty = syncProjectCameActionsSchema.safeParse({
      cameActionIds: []
    })
    assert.equal(empty.success, false)
  })

  it('validates projectFilterSchema parameters', () => {
    const valid = projectFilterSchema.safeParse({
      investigationId: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      strategicObjectiveId: '4f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      status: 'active'
    })
    assert.equal(valid.success, true)

    const invalid = projectFilterSchema.safeParse({
      investigationId: 'not-a-uuid'
    })
    assert.equal(invalid.success, false)
  })

  it('validates createProjectActivitySchema successfully', () => {
    const valid = createProjectActivitySchema.safeParse({
      title: 'Desarrollar módulo de sincronización CAME',
      description: 'Implementación del adapter y endpoints',
      priority: 'high',
      cameActionId: 'ACC-D-01',
      budget: 150000,
      startDate: '2026-09-01',
      endDate: '2026-09-30'
    })

    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.title, 'Desarrollar módulo de sincronización CAME')
      assert.equal(valid.data.priority, 'high')
      assert.equal(valid.data.budget, 150000)
    }
  })

  it('validates projectActivityInputSchema with subtasks successfully', () => {
    const valid = projectActivityInputSchema.safeParse({
      title: 'Desarrollar módulo de sincronización CAME',
      description: 'Implementación del adapter y endpoints',
      priority: 'high',
      cameActionId: 'ACC-D-01',
      budget: 150000,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      tasks: [
        {
          title: 'Diseñar esquema de base de datos',
          priority: 'high',
          budgetAmount: 50000
        },
        {
          title: 'Implementar route handler',
          priority: 'medium',
          budgetAmount: 100000
        }
      ]
    })

    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.tasks?.length, 2)
    }
  })

  it('validates updateProjectActivitySchema patch successfully', () => {
    const valid = updateProjectActivitySchema.safeParse({
      status: 'in_progress',
      budget: 200000,
      priority: 'urgent'
    })

    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.status, 'in_progress')
      assert.equal(valid.data.budget, 200000)
    }
  })

  it('validates project creation with detailed activities and subtasks', () => {
    const valid = createProjectSchema.safeParse({
      name: 'Plan FCBC Transformación Digital',
      planningMode: 'detailed',
      activities: [
        {
          title: 'Capacitación en competencias digitales',
          cameActionId: 'ACC-D-04',
          tasks: [
            { title: 'Elaborar contenido didáctico' },
            { title: 'Ejecutar talleres presenciales' }
          ]
        }
      ]
    })

    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.planningMode, 'detailed')
      assert.equal(valid.data.activities.length, 1)
      assert.equal(valid.data.activities[0].tasks?.length, 2)
    }
  })
})

describe('projects domain - ProjectError mapping', () => {
  it('maps notFound to 404', () => {
    const err = ProjectError.notFound()
    assert.equal(err.httpStatus, 404)
    assert.equal(err.code, 'NOT_FOUND')
  })

  it('maps teamMemberNotEligible to 422 with details', () => {
    const err = ProjectError.teamMemberNotEligible('user-1', 'team-1')
    assert.equal(err.httpStatus, 422)
    assert.equal(err.code, 'TEAM_MEMBER_NOT_ELIGIBLE')
    assert.equal(err.details?.userId, 'user-1')
    assert.equal(err.details?.teamId, 'team-1')
  })

  it('maps budgetLimitExceeded to 422 with details', () => {
    const err = ProjectError.budgetLimitExceeded(10000, 12000)
    assert.equal(err.httpStatus, 422)
    assert.equal(err.code, 'BUDGET_LIMIT_EXCEEDED')
    assert.equal(err.details?.budgetTotal, 10000)
    assert.equal(err.details?.allocatedTotal, 12000)
  })

  it('maps entitlementLimitExceeded to 409', () => {
    const err = ProjectError.entitlementLimitExceeded('projects.max_active', 5, 5)
    assert.equal(err.httpStatus, 409)
    assert.equal(err.code, 'ENTITLEMENT_LIMIT_EXCEEDED')
    assert.equal(err.details?.entitlementKey, 'projects.max_active')
    assert.equal(err.details?.limit, 5)
    assert.equal(err.details?.current, 5)
  })

  it('serializes to standard response shape', () => {
    const err = ProjectError.forbidden('projects.errors.forbidden', { capability: 'projects.create' })
    const shape = err.toResponseShape()

    assert.deepEqual(shape, {
      error: {
        code: 'FORBIDDEN',
        messageKey: 'projects.errors.forbidden',
        details: { capability: 'projects.create' }
      }
    })
  })
})
