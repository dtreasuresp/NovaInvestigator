import test from 'node:test'
import assert from 'node:assert/strict'

import { executeListInvestigations } from '../../src/features/novai/tools/investigations/list-investigations'
import { executeGetActiveInvestigation } from '../../src/features/novai/tools/investigations/get-active-investigation'
import { executeGetFactorEvidence } from '../../src/features/novai/tools/investigations/get-factor-evidence'
import { executeAuditRelationship } from '../../src/features/novai/tools/methodology/audit-relationship'
import { executeFindContradictions } from '../../src/features/novai/tools/methodology/find-contradictions'
import { executeCompareStrategies } from '../../src/features/novai/tools/strategy/compare-strategies'
import { executeValidateMethodology } from '../../src/features/novai/tools/methodology/validate-methodology'
import type { InvestigationState } from '../../src/types/apps/investigator-types'

const canonicalState: InvestigationState = {
  metadata: {
    id: 'inv-fcbc-canonical',
    label: 'FCBC-PRO',
    organization: 'FCBC Logistics Corp',
    unit: 'Operaciones',
    title: 'Auditoría Estratégica FCBC 2026',
    author: 'Principal Analyst',
    evaluationDate: '2026-08-25',
    validation: 'validada',
    status: 'en análisis',
    problem: 'Pérdida de competitividad en el corredor bioceánico.',
    objective: 'Mitigar amenazas de competidores globales y capitalizar apertura portuaria.',
    assumptions: 'Crecimiento de demanda regional.',
    methodologicalVersion: '2.0',
    updatedAt: '2026-08-26T00:00:00Z',
    archivedAt: null
  },
  internal: [
    {
      id: 'f-1',
      name: 'Flota pesada moderna',
      type: 'F',
      group: 'internal',
      weight: 0.5,
      rating: 4,
      description: 'Unidades de transporte euro 6 con telemetría avanzada.',
      evidence: 'Informe Técnico de Activos Vehiculares Q2-2026.'
    },
    {
      id: 'd-1',
      name: 'Fuga de conductores especializados',
      type: 'D',
      group: 'internal',
      weight: 0.5,
      rating: 1,
      description: 'D-01: Rotación elevada de personal clave hacia empresas transnacionales.',
      evidence: 'Reporte de RRHH Q2-2026: rotación anualizada del 42% en conductores de carga pesada.'
    }
  ],
  external: [
    {
      id: 'o-1',
      name: 'Apertura del nuevo megapuerto',
      type: 'O',
      group: 'external',
      weight: 0.5,
      rating: 4,
      description: 'Oportunidad logística con reducción de tiempos de tránsito.',
      evidence: 'Boletín de Autoridad Portuaria 2026.'
    },
    {
      id: 'a-1',
      name: 'Operador logístico multinacional con tarifas subsidiadas',
      type: 'A',
      group: 'external',
      weight: 0.5,
      rating: 1,
      description: 'A-01: Entrada de competidor agresivo captando clientes de gran volumen.',
      evidence: 'Análisis de Inteligencia de Mercado Q2-2026.'
    }
  ],
  relationships: [
    {
      id: 'rel-da-1',
      internalId: 'd-1',
      externalId: 'a-1',
      quadrant: 'DA',
      strength: 3,
      status: 'fuerte',
      justification: 'La fuga de conductores debilita críticamente la capacidad de retener cuentas frente al competidor.',
      evidence: 'El 65% de los conductores que renunciaron fueron contratados directamente por el operador multinacional.',
      evaluator: 'Chief Strategy Officer',
      date: '2026-08-25'
    },
    {
      id: 'rel-fo-1',
      internalId: 'f-1',
      externalId: 'o-1',
      quadrant: 'FO',
      strength: 3,
      status: 'fuerte',
      justification: 'La flota moderna permite habilitar despachos directos en el megapuerto.',
      evidence: 'Contratos preliminares de transporte portuario.',
      evaluator: 'Chief Strategy Officer',
      date: '2026-08-25'
    }
  ],
  strategies: [
    {
      id: 'strat-1',
      name: 'Estrategia FO-01: Alianza Portuaria Express',
      quadrant: 'FO',
      description: 'Despliegue de flota moderna exclusiva en el megapuerto.',
      orientation: 'Ofensiva',
      relatedFactors: ['f-1', 'o-1'],
      observations: 'Acuerdo marco con operadora portuaria.'
    },
    {
      id: 'strat-2',
      name: 'Estrategia DA-01: Plan de Retención y Fidelización Salarial',
      quadrant: 'DA',
      description: 'Plan de incentivos y blindaje de talento para frenar migración hacia el competidor.',
      orientation: 'Defensiva',
      relatedFactors: ['d-1', 'a-1'],
      observations: 'Propuesta de escala salarial indexada.'
    }
  ],
  qspmScores: {},
  selectedStrategyId: 'strat-1',
  selectionJustification: 'Prioridad en captura de mercado',
  cameCriteria: [],
  cameActions: [
    {
      id: 'came-1',
      action: 'Explotar flota en ruta portuaria con tarifa preferencial',
      type: 'E',
      factorId: 'o-1',
      factor: 'Apertura del nuevo megapuerto',
      strategyId: 'strat-1',
      problem: '',
      objective: '',
      responsible: '',
      participants: '',
      resources: [],
      startDate: '',
      endDate: '',
      indicator: '',
      baseline: '',
      target: '',
      frequency: '',
      status: 'propuesta',
      criteria: { impact: 5, urgency: 4, severity: 3, alignment: 5, feasibility: 4 },
      justification: 'Clave para el corredor',
      observations: ''
    },
    {
      id: 'came-2',
      action: 'Corregir rotación con bono de permanencia y seguro médico familiar',
      type: 'C',
      factorId: 'd-1',
      factor: 'Fuga de conductores especializados',
      strategyId: 'strat-2',
      problem: '',
      objective: '',
      responsible: '',
      participants: '',
      resources: [],
      startDate: '',
      endDate: '',
      indicator: '',
      baseline: '',
      target: '',
      frequency: '',
      status: 'propuesta',
      criteria: { impact: 5, urgency: 5, severity: 4, alignment: 5, feasibility: 4 },
      justification: 'Retención de conductores',
      observations: ''
    }
  ],
  history: []
}

const mockRow = {
  id: 'inv-fcbc-canonical',
  tenant_id: 'tnt-test-123',
  owner_id: 'usr-analyst-1',
  title: 'Auditoría Estratégica FCBC 2026',
  status: 'en análisis',
  version: 3,
  state: canonicalState,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-25T10:00:00Z',
  archived_at: null,
  schema_version: '2.0',
  is_locked: false,
  access_level: 'full'
}

function createChainableQuery() {
  const resultObj = { data: [mockRow], error: null, count: 1 }
  const singleResult = { data: mockRow, error: null }

  const builder: any = {
    eq: () => builder,
    is: () => builder,
    in: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
    select: () => builder,
    single: async () => singleResult,
    maybeSingle: async () => singleResult,
    then: (resolve: any, reject?: any) => Promise.resolve(resultObj).then(resolve, reject)
  }

  return builder
}

const mockClient = {
  from: () => createChainableQuery()
}

const mockPrincipal = {
  userId: 'usr-analyst-1',
  tenantId: 'tnt-test-123',
  client: mockClient as any
}

test('NovAi Master Spec v2.0 — Scenario Tests (Section 48)', async (t) => {
  await t.test('Scenario A: "¿Qué investigaciones tengo?" (list_investigations)', async () => {
    const result = await executeListInvestigations({ limit: 10 }, mockPrincipal)
    assert.strictEqual(result.success, true)
    const data = (result.data || result.result) as any
    assert.strictEqual(data.totalAccessible >= 1, true)
    assert.strictEqual(data.investigations[0].title, 'Auditoría Estratégica FCBC 2026')
    assert.strictEqual(data.investigations[0].status, 'en análisis')
  })

  await t.test('Scenario B: "¿Cuál es la investigación activa?" (get_active_investigation)', async () => {
    const result = await executeGetActiveInvestigation({ investigation_id: 'inv-fcbc-canonical' }, mockPrincipal)
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.hasActiveInvestigation, true)
    assert.strictEqual(data.investigationId, 'inv-fcbc-canonical')
    assert.strictEqual(data.counts.strengths, 1)
    assert.strictEqual(data.counts.weaknesses, 1)
    assert.strictEqual(data.counts.totalRelationships, 2)
  })

  await t.test('Scenario C: "¿De dónde sale D-03?" (get_factor_evidence)', async () => {
    const result = await executeGetFactorEvidence(
      { investigation_id: 'inv-fcbc-canonical', factor_code: 'D-01' },
      mockPrincipal
    )
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.factor.type, 'D')
    assert.strictEqual(data.factor.name, 'Fuga de conductores especializados')
    assert.match(data.factor.evidence, /rotación anualizada del 42%/)
    assert.strictEqual(data.traceability.relationships.length, 1)
    assert.strictEqual(data.traceability.cameActions.length, 1)
  })

  await t.test('Scenario D: "¿Está bien justificada D-03 × A-02?" (audit_relationship)', async () => {
    const result = await executeAuditRelationship(
      {
        investigation_id: 'inv-fcbc-canonical',
        internal_factor_code: 'D-01',
        external_factor_code: 'A-01'
      },
      mockPrincipal
    )
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.crossing, 'D-01 × A-01')
    assert.strictEqual(data.quadrant, 'DA')
    assert.strictEqual(data.matrixState.strength, 3)
    assert.strictEqual(data.audit.isSuspiciousZero, false)
    assert.strictEqual(data.audit.evidenceConnectionStatus, 'proven')
  })

  await t.test('Scenario E: "¿Hay contradicciones?" (find_contradictions)', async () => {
    const result = await executeFindContradictions(
      { investigation_id: 'inv-fcbc-canonical' },
      mockPrincipal
    )
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.hasCriticalContradictions, false)
    assert.strictEqual(Array.isArray(data.contradictions), true)
  })

  await t.test('Scenario F: "¿Por qué la estrategia A es mejor que B?" (compare_strategies)', async () => {
    const result = await executeCompareStrategies(
      { investigation_id: 'inv-fcbc-canonical', strategy_ids: ['strat-1', 'strat-2'] },
      mockPrincipal
    )
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.totalCompared, 2)
    assert.strictEqual(data.comparisons[0].name, 'Estrategia FO-01: Alianza Portuaria Express')
    assert.strictEqual(data.comparisons[1].name, 'Estrategia DA-01: Plan de Retención y Fidelización Salarial')
    assert.strictEqual(data.comparisons[0].quadrant, 'FO')
    assert.strictEqual(data.comparisons[1].quadrant, 'DA')
  })

  await t.test('Scenario G: "¿Esta EFI es metodológicamente correcta?" (validate_methodology)', async () => {
    const result = await executeValidateMethodology(
      { investigation_id: 'inv-fcbc-canonical', stage: 'EFI' },
      mockPrincipal
    )
    assert.strictEqual(result.success, true)
    const data = (result.result || result.data) as any
    assert.strictEqual(data.status, 'VALID')
    assert.strictEqual(data.methodologyScore, 100)
    assert.strictEqual(data.errors.length, 0)
  })
})
