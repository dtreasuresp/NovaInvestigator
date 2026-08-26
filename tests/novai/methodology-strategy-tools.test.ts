import test from 'node:test'
import assert from 'node:assert/strict'

import { executeAuditFactor } from '../../src/features/novai/tools/methodology/audit-factor'
import { executeAuditRelationship } from '../../src/features/novai/tools/methodology/audit-relationship'
import { executeFindContradictions } from '../../src/features/novai/tools/methodology/find-contradictions'
import { executeValidateMethodology } from '../../src/features/novai/tools/methodology/validate-methodology'
import { executeCalculateMatrix } from '../../src/features/novai/tools/methodology/calculate-matrix'
import { executeTraceStrategy } from '../../src/features/novai/tools/strategy/trace-strategy'
import { executeCompareStrategies } from '../../src/features/novai/tools/strategy/compare-strategies'
import { executeChallengeAnalysis } from '../../src/features/novai/tools/strategy/challenge-analysis'
import type { InvestigationState } from '../../src/types/apps/investigator-types'

const mockState: InvestigationState = {
  metadata: {
    id: 'inv-fcbc-full',
    label: 'FCBC-2026',
    organization: 'FCBC Corp',
    unit: 'Logística',
    title: 'Diagnóstico Estratégico Integral FCBC 2026',
    author: 'Chief Analyst',
    evaluationDate: '2026-08-20',
    validation: 'validada',
    status: 'en análisis',
    problem: 'Pérdida de cuota en el corredor logístico bioceánico.',
    objective: 'Establecer plan estratégico de mitigación y expansión.',
    assumptions: 'Estabilidad macroeconómica en la región.',
    methodologicalVersion: '2.0',
    updatedAt: '2026-08-25T10:00:00Z',
    archivedAt: null
  },
  internal: [
    {
      id: 'f-1',
      name: 'Flota de transporte moderna',
      type: 'F',
      group: 'internal',
      weight: 0.5,
      rating: 4,
      description: 'El 85% de las unidades cuenta con menos de 3 años de antigüedad.',
      evidence: 'Auditoría vehicular Q2-2026.'
    },
    {
      id: 'd-1',
      name: 'Rotación alta de personal técnico',
      type: 'D',
      group: 'internal',
      weight: 0.5,
      rating: 1,
      description: 'Fuga de conductores y mecánicos calificados.',
      evidence: 'Reporte de RRHH Q2-2026: tasa del 38%.'
    }
  ],
  external: [
    {
      id: 'o-1',
      name: 'Apertura de nueva ruta portuaria interoceánica',
      type: 'O',
      group: 'external',
      weight: 0.5,
      rating: 4,
      description: 'Inauguración del megapuerto con reducción de 12 días.',
      evidence: 'Boletín Oficial Portuario Junio 2026.'
    },
    {
      id: 'a-1',
      name: 'Entrada agresiva de operador logístico multinacional',
      type: 'A',
      group: 'external',
      weight: 0.5,
      rating: 1,
      description: 'Competidor con tarifas subvencionadas.',
      evidence: 'Estudio de Mercado Sectorial Q2-2026.'
    }
  ],
  relationships: [
    {
      id: 'rel-1',
      internalId: 'd-1',
      externalId: 'a-1',
      quadrant: 'DA',
      strength: 3,
      status: 'fuerte',
      justification: 'La fuga de personal agrava directamente la vulnerabilidad frente al competidor agresivo.',
      evidence: 'Entrevistas de salida de RRHH indican que el 60% se marchó al competidor multinacional.',
      evaluator: 'Analista Senior',
      date: '2026-08-21'
    },
    {
      id: 'rel-2',
      internalId: 'f-1',
      externalId: 'o-1',
      quadrant: 'FO',
      strength: 3,
      status: 'fuerte',
      justification: 'La flota moderna permite operar de inmediato en la nueva ruta.',
      evidence: 'Capacidad operativa lista para despachos.',
      evaluator: 'Analista Senior',
      date: '2026-08-21'
    }
  ],
  strategies: [
    {
      id: 'strat-1',
      name: 'Plan de Retención y Fidelización de Talento Crítico',
      quadrant: 'DA',
      orientation: 'Defensiva',
      description: 'Ajuste salarial competitivo y bonos por permanencia.',
      relatedFactors: ['d-1', 'a-1'],
      observations: 'Prioridad máxima en Q3.'
    },
    {
      id: 'strat-2',
      name: 'Expansión de Rutas al Megapuerto',
      quadrant: 'FO',
      orientation: 'Ofensiva',
      description: 'Apertura de contratos logísticos con exportadores.',
      relatedFactors: ['f-1', 'o-1'],
      observations: 'Oportunidad de crecimiento.'
    }
  ],
  qspmScores: {
    'strat-1': { 'd-1': 4, 'a-1': 4 },
    'strat-2': { 'f-1': 4, 'o-1': 3 }
  },
  selectedStrategyId: 'strat-1',
  selectionJustification: 'Ataca la mayor vulnerabilidad operativa.',
  cameCriteria: [],
  cameActions: [
    {
      id: 'came-1',
      type: 'C',
      factorId: 'd-1',
      factor: 'Rotación alta de personal técnico',
      strategyId: 'strat-1',
      problem: 'Salarios 15% por debajo del mercado regional',
      objective: 'Reducir la rotación voluntaria a menos del 10%',
      action: 'Implementar nueva escala salarial y seguro de salud integral',
      responsible: 'Directora de RRHH',
      participants: 'Finanzas, Operaciones',
      resources: ['Presupuesto compensaciones $50k'],
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      indicator: 'Índice de rotación trimestral',
      baseline: '38%',
      target: '10%',
      frequency: 'Mensual',
      status: 'propuesta',
      criteria: { impact: 5, urgency: 5, severity: 4, alignment: 5, feasibility: 4 },
      justification: 'Indispensable para asegurar operaciones en el corredor.',
      observations: ''
    }
  ],
  history: []
}

const mockRow = {
  id: 'inv-fcbc-full',
  tenant_id: 'tnt-test-123',
  owner_id: 'usr-analyst-1',
  title: 'Diagnóstico Estratégico Integral FCBC 2026',
  status: 'en análisis',
  version: 4,
  state: mockState,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-25T10:00:00Z'
}

const mockClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockRow, error: null }),
          order: () => ({
            range: async () => ({ data: [mockRow], error: null, count: 1 })
          })
        }),
        is: () => ({
          order: () => ({
            range: async () => ({ data: [mockRow], error: null, count: 1 })
          })
        })
      })
    })
  })
}

const mockPrincipal = {
  userId: 'usr-analyst-1',
  tenantId: 'tnt-test-123',
  client: mockClient as any
}

test('NovAi Domain Tools: Methodology & Strategy Facades', async t => {
  await t.test('audit_factor: validates scale calibration, weight and evidence quality', async () => {
    const res = await executeAuditFactor(
      { investigation_id: 'inv-fcbc-full', factor_code: 'D-01' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.factor.code, 'D-01')
    assert.equal(data.factor.rating, 1) // Debilidad Mayor
    assert.equal(data.audit.isMethodologicallyValid, true)
    assert.ok(data.factor.calculatedScore > 0)
  })

  await t.test('audit_relationship: evaluates D-01 × A-01 crossing with causal rationale and evidence', async () => {
    const res = await executeAuditRelationship(
      {
        investigation_id: 'inv-fcbc-full',
        internal_factor_code: 'D-01',
        external_factor_code: 'A-01'
      },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.crossing, 'D-01 × A-01')
    assert.equal(data.quadrant, 'DA')
    assert.equal(data.matrixState.strength, 3)
    assert.equal(data.audit.evidenceConnectionStatus, 'proven')
    assert.equal(data.audit.isSuspiciousZero, false)
  })

  await t.test('find_contradictions: identifies zero contradictions when matrix is mathematically sound', async () => {
    const res = await executeFindContradictions(
      { investigation_id: 'inv-fcbc-full' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.hasCriticalContradictions, false)
    assert.equal(data.summary.criticalCount, 0)
    assert.equal(data.summary.efiValidWeightSum, true)
    assert.equal(data.summary.efeValidWeightSum, true)
  })

  await t.test('validate_methodology: validates full state with academic rigor', async () => {
    const res = await executeValidateMethodology(
      { investigation_id: 'inv-fcbc-full', stage: 'ALL' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.status, 'VALID')
    assert.ok(data.methodologyScore >= 90)
    assert.equal(data.errorsCount, 0)
  })

  await t.test('calculate_matrix: returns exact indices matching domain engine', async () => {
    const res = await executeCalculateMatrix(
      { investigation_id: 'inv-fcbc-full', matrix_type: 'ALL' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.calculation.efi.total, 2.5) // (0.5*4 + 0.5*1 = 2.5)
    assert.equal(data.calculation.efe.total, 2.5) // (0.5*4 + 0.5*1 = 2.5)
  })

  await t.test('trace_strategy: constructs complete lineage graph from Strategy to Source', async () => {
    const res = await executeTraceStrategy(
      { investigation_id: 'inv-fcbc-full', strategy_id: 'strat-1' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.strategyId, 'strat-1')
    assert.equal(data.lineage.root.quadrant, 'DA')
    assert.ok(data.lineage.underlyingFactors.length >= 2)
    assert.ok(data.lineage.cameActions.length >= 1)
  })

  await t.test('compare_strategies: evaluates and ranks multicriteria alternatives', async () => {
    const res = await executeCompareStrategies(
      { investigation_id: 'inv-fcbc-full' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.equal(data.totalCompared, 2)
    assert.equal(data.comparisons[0].quadrant, 'DA')
    assert.equal(data.comparisons[1].quadrant, 'FO')
  })

  await t.test('challenge_analysis: executes red-team audit questioning blindspots and biases', async () => {
    const res = await executeChallengeAnalysis(
      { investigation_id: 'inv-fcbc-full' },
      mockPrincipal
    )

    assert.equal(res.success, true)
    const data = res.result as any
    assert.ok(data.challenges !== undefined)
    assert.ok(data.antiSycophancyNote.includes('Red-Team'))
  })
})
