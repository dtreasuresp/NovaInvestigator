import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildUnifiedReportData } from '../../src/lib/export/report-model'
import { renderDocxReport } from '../../src/lib/export/docx-renderer'
import { calculateAnalysis } from '../../src/utils/investigator/domain'
import type { InvestigationState } from '../../src/types/apps/investigator-types'
import type { ProjectDetail } from '../../src/features/projects'

describe('docx export pipeline', () => {
  const mockState: InvestigationState = {
    metadata: {
      id: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      label: 'INV-2026',
      organization: 'Acme Global Corp',
      unit: 'Estrategia',
      title: 'Diagnóstico Estratégico Acme 2026',
      author: 'Senior Strategy Analyst',
      evaluationDate: '2026-08-30',
      validation: 'Aprobado',
      status: 'validada',
      problem: 'Falta de agilidad operativa',
      objective: 'Optimizar la cadena de valor y digitalizar procesos',
      assumptions: 'Crecimiento de mercado del 5%',
      methodologicalVersion: '2.0.0',
      updatedAt: '2026-08-30T00:00:00Z',
      archivedAt: null
    },
    internal: [
      {
        id: 'F1',
        name: 'Patentes de software',
        type: 'F',
        group: 'internal',
        weight: 0.15,
        rating: 4,
        description: 'Propiedad intelectual sólida',
        evidence: 'Registro ante INAPI'
      },
      {
        id: 'D1',
        name: 'Infraestructura legacy',
        type: 'D',
        group: 'internal',
        weight: 0.1,
        rating: 2,
        description: 'Servidores antiguos',
        evidence: 'Auditoría TI'
      }
    ],
    external: [
      {
        id: 'O1',
        name: 'Apertura de nuevos mercados',
        type: 'O',
        group: 'external',
        weight: 0.2,
        rating: 4,
        description: 'Tratado de libre comercio',
        evidence: 'Diario Oficial'
      },
      {
        id: 'A1',
        name: 'Nuevos competidores',
        type: 'A',
        group: 'external',
        weight: 0.15,
        rating: 3,
        description: 'Startups emergentes',
        evidence: 'Reporte de industria'
      }
    ],
    cameCriteria: [
      { id: '1', name: 'Impacto', weight: 0.2 },
      { id: '2', name: 'Urgencia', weight: 0.2 },
      { id: '3', name: 'Severidad', weight: 0.2 },
      { id: '4', name: 'Alineación', weight: 0.2 },
      { id: '5', name: 'Factibilidad', weight: 0.2 }
    ],
    cameActions: [
      {
        id: 'C1',
        type: 'C',
        factorId: 'D1',
        factor: 'Infraestructura legacy',
        strategyId: 'S1',
        problem: 'Servidores desactualizados',
        objective: 'Migrar a la nube',
        action: 'Contratar servicio cloud y migrar aplicaciones',
        responsible: 'CTO',
        participants: 'Equipo DevOps',
        resources: ['AWS', 'Presupuesto TI'],
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        indicator: '% servidores migrados',
        baseline: '0%',
        target: '100%',
        frequency: 'Mensual',
        status: 'propuesta',
        criteria: { impact: 4, urgency: 5, severity: 4, alignment: 5, feasibility: 4 },
        justification: 'Reducción de costos de mantenimiento',
        observations: 'Prioridad máxima'
      }
    ],
    relationships: [],
    strategies: [],
    qspmScores: {},
    selectedStrategyId: null,
    selectionJustification: '',
    history: []
  }

  const mockAnalysis = calculateAnalysis(mockState)

  const mockProjects: ProjectDetail[] = [
    {
      id: 'proj-123',
      tenant_id: 'ten-123',
      workspace_id: 'ws-123',
      team_id: 'team-123',
      investigation_id: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      name: 'Plan de Modernización Cloud',
      description: 'Migración integral de infraestructura',
      objective: 'Lograr 99.9% uptime',
      priority: 'high',
      start_date: '2026-09-01',
      end_date: '2026-12-31',
      leader_user_id: 'user-leader-1',
      budget_total: 25000,
      budget_mode: 'total_first',
      status: 'active',
      idempotency_key: null,
      created_by: 'user-creator',
      created_at: '2026-08-30T00:00:00Z',
      updated_at: '2026-08-30T00:00:00Z',
      members: [
        {
          id: 'pm-1',
          tenant_id: 'ten-123',
          project_id: 'proj-123',
          user_id: 'user-leader-1',
          role: 'leader',
          created_at: '2026-08-30T00:00:00Z',
          profile: {
            displayName: 'Carlos Director',
            email: 'carlos@acme.com',
            avatarUrl: null
          }
        }
      ],
      cameActions: [
        {
          id: 'pca-1',
          tenant_id: 'ten-123',
          project_id: 'proj-123',
          investigation_id: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
          came_action_id: 'C1',
          action_type: 'C',
          budget_allocated: 15000,
          snapshot: {},
          created_at: '2026-08-30T00:00:00Z'
        }
      ],
      activities: [],
      tasks: [
        {
          id: 'task-1',
          title: 'Aprovisionamiento de VPC y Kubernetes',
          description: 'Configuración inicial de cluster',
          priority: 'high',
          dueDate: '2026-10-15',
          assigneeIds: ['user-leader-1'],
          cameActionId: 'C1',
          budgetAmount: 15000,
          columnId: 'col-1',
          status: 'En Progreso'
        }
      ],
      progressPercentage: 50
    }
  ]

  it('builds unified report data for summary report', () => {
    const data = buildUnifiedReportData(mockState, mockAnalysis, 'summary', [])

    assert.equal(data.reportType, 'summary')
    assert.equal(data.title, 'Diagnóstico Estratégico Acme 2026')
    assert.equal(data.organization, 'Acme Global Corp')
    assert.equal(data.factors.strengths.length, 1)
    assert.equal(data.factors.weaknesses.length, 1)
    assert.equal(data.factors.opportunities.length, 1)
    assert.equal(data.factors.threats.length, 1)
    assert.equal(data.cameActions.length, 1)
    assert.equal(data.projects.length, 0)
  })

  it('builds unified report data for full report with projects and budget summary', () => {
    const data = buildUnifiedReportData(mockState, mockAnalysis, 'full', mockProjects)

    assert.equal(data.reportType, 'full')
    assert.equal(data.projects.length, 1)
    assert.equal(data.projects[0].name, 'Plan de Modernización Cloud')
    assert.equal(data.projects[0].leaderName, 'Carlos Director')
    assert.equal(data.projects[0].tasks.length, 1)
    assert.equal(data.budgetSummary.totalBudget, 25000)
    assert.equal(data.budgetSummary.allocatedBudget, 15000)
    assert.equal(data.budgetSummary.executionRate, 60)
  })

  it('renders a valid DOCX binary buffer with correct Zip magic header', async () => {
    const data = buildUnifiedReportData(mockState, mockAnalysis, 'full', mockProjects)
    const buffer = await renderDocxReport(data)

    assert.ok(buffer instanceof Uint8Array)
    assert.ok(buffer.byteLength > 1000)

    // Verify DOCX / ZIP file magic header (PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04)
    assert.equal(buffer[0], 0x50)
    assert.equal(buffer[1], 0x4b)
    assert.equal(buffer[2], 0x03)
    assert.equal(buffer[3], 0x04)
  })
})
