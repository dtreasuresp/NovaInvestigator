import test from 'node:test'
import assert from 'node:assert/strict'

import { executeGetActiveInvestigation } from '../../src/features/novai/tools/investigations/get-active-investigation'
import { executeGetInvestigationDocuments } from '../../src/features/novai/tools/investigations/get-investigation-documents'
import { executeSearchEvidence } from '../../src/features/novai/tools/investigations/search-evidence'
import { executeGetFactorEvidence } from '../../src/features/novai/tools/investigations/get-factor-evidence'
import { executeVerifyClaim } from '../../src/features/novai/tools/investigations/verify-claim'
import type { InvestigationState } from '../../src/types/apps/investigator-types'

const mockState: InvestigationState = {
  metadata: {
    id: 'inv-fcbc-1',
    label: 'FCBC-2026',
    organization: 'FCBC Corp',
    unit: 'Logística',
    title: 'Diagnóstico Estratégico FCBC 2026',
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
      description: 'El 85% de las unidades cuenta con menos de 3 años de antigüedad y GPS.',
      evidence: 'Auditoría vehicular Q2-2026 (Informe Log-204).'
    },
    {
      id: 'd-1',
      name: 'Rotación alta de personal técnico especializado',
      type: 'D',
      group: 'internal',
      weight: 0.5,
      rating: 1,
      description: 'Fuga de conductores y mecánicos calificados hacia competidores regionales.',
      evidence: 'Reporte de RRHH Q2-2026: tasa de rotación anualizada del 38%.'
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
      description: 'Inauguración del megapuerto con reducción de 12 días en flete.',
      evidence: 'Boletín Oficial Portuario Junio 2026.'
    },
    {
      id: 'a-1',
      name: 'Entrada agresiva de operador logístico multinacional',
      type: 'A',
      group: 'external',
      weight: 0.5,
      rating: 1,
      description: 'Competidor con tarifas subvencionadas y captación activa de conductores.',
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
    }
  ],
  qspmScores: {},
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
  id: 'inv-fcbc-1',
  tenant_id: 'tnt-test-123',
  owner_id: 'usr-analyst-1',
  title: 'Diagnóstico Estratégico FCBC 2026',
  status: 'en análisis',
  version: 3,
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

test('NovAi Domain Tools: Investigation & Evidence Taxonomy', async t => {
  await t.test('get_active_investigation: retrieves active investigation metadata and counts', async () => {
    const result = await executeGetActiveInvestigation({ investigation_id: 'inv-fcbc-1' }, mockPrincipal)

    assert.equal(result.success, true)
    assert.equal(result.toolName, 'get_active_investigation')
    const data = result.result as any
    assert.equal(data.hasActiveInvestigation, true)
    assert.equal(data.investigationId, 'inv-fcbc-1')
    assert.equal(data.title, 'Diagnóstico Estratégico FCBC 2026')
    assert.equal(data.counts.weaknesses, 1)
    assert.equal(data.counts.strengths, 1)
    assert.equal(data.counts.opportunities, 1)
    assert.equal(data.counts.threats, 1)
    assert.equal(data.counts.totalStrategies, 1)
  })

  await t.test('get_investigation_documents: groups and summarizes documentary sources', async () => {
    const result = await executeGetInvestigationDocuments({ investigation_id: 'inv-fcbc-1' }, mockPrincipal)

    assert.equal(result.success, true)
    const data = result.result as any
    assert.equal(data.investigationTitle, 'Diagnóstico Estratégico FCBC 2026')
    assert.ok(data.totalDocumentSources > 0)
    assert.ok(Array.isArray(data.documents))
  })

  await t.test('search_evidence: matches keywords across factors, evidence and crossings', async () => {
    const searchRotacion = await executeSearchEvidence(
      { investigation_id: 'inv-fcbc-1', query: 'rotación', factor_type: 'ALL' },
      mockPrincipal
    )

    assert.equal(searchRotacion.success, true)
    const data = searchRotacion.result as any
    assert.ok(data.totalMatches >= 1)
    const firstMatch = data.results[0]
    assert.match(firstMatch.snippet.toLowerCase(), /rotación/)
  })

  await t.test('get_factor_evidence: resolves factor by code (D-01, F-01) with full traceability', async () => {
    // 1. Consultar Debilidad D-01
    const factorD1 = await executeGetFactorEvidence(
      { investigation_id: 'inv-fcbc-1', factor_code: 'D-01' },
      mockPrincipal
    )

    assert.equal(factorD1.success, true)
    const dataD1 = factorD1.result as any
    assert.equal(dataD1.factor.code, 'D-01')
    assert.equal(dataD1.factor.type, 'D')
    assert.match(dataD1.factor.evidence, /Reporte de RRHH Q2-2026/)
    assert.equal(dataD1.traceability.totalCrossings, 1)
    assert.equal(dataD1.traceability.totalStrategies, 1)
    assert.equal(dataD1.traceability.totalCameActions, 1)

    // 2. Consultar Fortaleza F-01
    const factorF1 = await executeGetFactorEvidence(
      { investigation_id: 'inv-fcbc-1', factor_code: 'F-01' },
      mockPrincipal
    )
    assert.equal(factorF1.success, true)
    const dataF1 = factorF1.result as any
    assert.equal(dataF1.factor.code, 'F-01')
    assert.match(dataF1.factor.evidence, /Auditoría vehicular/)
  })

  await t.test('verify_claim: audits claims and classifies them epistémicamente (FACT / EVIDENCE / UNSUPPORTED)', async () => {
    // 1. Afirmación respaldada con evidencia documental
    const verified = await executeVerifyClaim(
      {
        investigation_id: 'inv-fcbc-1',
        claim: 'La empresa tiene una tasa de rotación anualizada del 38% en personal técnico'
      },
      mockPrincipal
    )

    assert.equal(verified.success, true)
    const verifiedData = verified.result as any
    assert.equal(verifiedData.isSupported, true)
    assert.ok(verifiedData.epistemicStatus === 'FACT' || verifiedData.epistemicStatus === 'EVIDENCE')
    assert.ok(verifiedData.confidenceScore >= 0.5)

    // 2. Afirmación sin sustento (alucinación / no corroborada)
    const unverified = await executeVerifyClaim(
      {
        investigation_id: 'inv-fcbc-1',
        claim: 'La empresa tiene una deuda financiera bancaria con el Banco Santander de 50 millones'
      },
      mockPrincipal
    )

    assert.equal(unverified.success, true)
    const unverifiedData = unverified.result as any
    assert.equal(unverifiedData.isSupported, false)
    assert.equal(unverifiedData.epistemicStatus, 'UNSUPPORTED')
  })
})
