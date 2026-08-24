import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Utils Imports
import { createBlankState, createDemoState } from '../../../src/utils/investigator/demo'
import {
  calculateAnalysis,
  generateDraftCameActions,
  normalizeFactorWeights,
  validateInvestigation
} from '../../../src/utils/investigator/domain'
import { createReportModel } from '../../../src/utils/investigator/workspace'
import { toBeCloseTo } from '../../helpers/assertions'

// Golden baseline: doc/golden-demo-baseline.json (referencia de la raíz).

const EXPECTED_INDEXES = {
  FO: 0.3598534798534797,
  FA: 0.34639455782312917,
  DO: 0.7518737672583824,
  DA: 0.35340659340659325
}

describe('investigator demo (golden)', () => {
  it('produce counts y totales EFI/EFE iguales al baseline', () => {
    const state = createDemoState()
    const analysis = calculateAnalysis(state)

    assert.equal(state.internal.length, 10)
    assert.equal(state.external.length, 10)
    assert.equal(state.relationships.length, 100)
    toBeCloseTo(analysis.efi.total, 2.15, 4)
    toBeCloseTo(analysis.efe.total, 2.45, 4)
    toBeCloseTo(analysis.efi.weightTotal, 1, 4)
    toBeCloseTo(analysis.efe.weightTotal, 1, 4)
  })

  it('reproduce índices de cuadrantes y DAFO del baseline', () => {
    const demo = createDemoState()
    const analysis = calculateAnalysis(demo)

    assert.equal(analysis.relations.evaluatedCount, 100)
    toBeCloseTo(analysis.relations.summary.FO.index, EXPECTED_INDEXES.FO, 4)
    toBeCloseTo(analysis.relations.summary.FA.index, EXPECTED_INDEXES.FA, 4)
    toBeCloseTo(analysis.relations.summary.DO.index, EXPECTED_INDEXES.DO, 4)
    toBeCloseTo(analysis.relations.summary.DA.index, EXPECTED_INDEXES.DA, 4)
    toBeCloseTo(analysis.dafo.FO, 1.89, 4)
    toBeCloseTo(analysis.dafo.FA, 0.6825, 4)
    toBeCloseTo(analysis.dafo.DO, 1.98, 4)
    toBeCloseTo(analysis.dafo.DA, 0.715, 4)
    assert.strictEqual(analysis.relations.dominant, 'DO')
    assert.strictEqual(analysis.relations.second, 'FO')
    assert.strictEqual(analysis.relations.coverage, 1)
    assert.strictEqual(analysis.relations.confidence, 'alta')
  })

  it('valida con cero errores y las advertencias esperadas', () => {
    const demo = createDemoState()
    const validation = validateInvestigation(demo)

    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.errors, 0)
    assert.strictEqual(validation.warnings, 20)
  })

  it('QSPM selecciona la alternativa esperada y CAME genera 20 acciones', () => {
    const demo = createDemoState()
    const analysis = calculateAnalysis(demo)

    assert.equal(analysis.qspm.results.length, 6)
    assert.strictEqual(analysis.qspm.winner, 'EST-FO-01')
    assert.strictEqual(demo.selectedStrategyId, 'EST-FO-01')
    assert.equal(analysis.came.actions.length, 20)
    assert.strictEqual(analysis.came.valid, true)
  })

  it('genera el modelo de reporte sin error', () => {
    const demo = createDemoState()
    const analysis = calculateAnalysis(demo)
    const model = createReportModel(demo, analysis)

    assert.strictEqual(model.selectedStrategy?.id, 'EST-FO-01')
    toBeCloseTo(model.chartData.efi_score, 2.15, 4)
    toBeCloseTo(model.chartData.efe_score, 2.45, 4)
    toBeCloseTo(model.chartData.dafo.DO, 1.98, 4)
  })

  it('normaliza pesos de factores a exactamente 1.00 proporcionalmente', () => {
    const rawFactors = [
      { id: 'F-01', name: 'F1', type: 'F' as const, group: 'internal' as const, weight: 2, rating: 4, description: '', evidence: '' },
      { id: 'F-02', name: 'F2', type: 'F' as const, group: 'internal' as const, weight: 3, rating: 3, description: '', evidence: '' },
      { id: 'D-01', name: 'D1', type: 'D' as const, group: 'internal' as const, weight: 5, rating: 2, description: '', evidence: '' }
    ]

    const normalized = normalizeFactorWeights(rawFactors)
    const total = normalized.reduce((s, f) => s + f.weight, 0)

    toBeCloseTo(total, 1.0, 4)
    assert.strictEqual(normalized[0].weight, 0.2)
    assert.strictEqual(normalized[1].weight, 0.3)
    assert.strictEqual(normalized[2].weight, 0.5)
  })

  it('calcula subtotales internos y externos en la matriz QSPM', () => {
    const demo = createDemoState()
    const analysis = calculateAnalysis(demo)
    const topResult = analysis.qspm.results[0]

    assert.ok(topResult.internalTas != null && topResult.internalTas > 0)
    assert.ok(topResult.externalTas != null && topResult.externalTas > 0)
    toBeCloseTo(topResult.totalTas, (topResult.internalTas || 0) + (topResult.externalTas || 0), 4)
  })

  it('genera borrador CAME trazable a partir de los factores del estado', () => {
    const demo = createDemoState()
    const draft = generateDraftCameActions(demo)

    assert.equal(draft.length, demo.internal.length + demo.external.length)
    assert.ok(draft.every(action => action.id.startsWith('ACC-') && action.factor && action.action))
  })

  it('crea un estado en blanco real con 0 factores y 0 relaciones', () => {
    const blank = createBlankState('INV-TEST-01')

    assert.strictEqual(blank.metadata.id, 'INV-TEST-01')
    assert.strictEqual(blank.metadata.status, 'nueva')
    assert.strictEqual(blank.internal.length, 0)
    assert.strictEqual(blank.external.length, 0)
    assert.strictEqual(blank.relationships.length, 0)
    assert.strictEqual(blank.strategies.length, 0)
    assert.strictEqual(blank.cameActions.length, 0)
  })

  it('soporta cantidades dinámicas y asimétricas de factores (ej. 2 F, 1 D, 3 O, 2 A)', () => {
    const internal = [
      { id: 'F-01', name: 'Calidad del servicio', type: 'F' as const, group: 'internal' as const, weight: 0.3, rating: 4, description: '', evidence: 'Encuesta' },
      { id: 'F-02', name: 'Personal capacitado', type: 'F' as const, group: 'internal' as const, weight: 0.3, rating: 4, description: '', evidence: 'Auditoría' },
      { id: 'D-01', name: 'Sistemas obsoletos', type: 'D' as const, group: 'internal' as const, weight: 0.4, rating: 2, description: '', evidence: 'Revisión' }
    ]
    const external = [
      { id: 'O-01', name: 'Crecimiento de mercado', type: 'O' as const, group: 'external' as const, weight: 0.4, rating: 3, description: '', evidence: 'Informe' },
      { id: 'O-02', name: 'Nuevas tecnologías', type: 'O' as const, group: 'external' as const, weight: 0.3, rating: 3, description: '', evidence: 'Noticias' },
      { id: 'A-01', name: 'Competencia agresiva', type: 'A' as const, group: 'external' as const, weight: 0.3, rating: 2, description: '', evidence: 'Mercado' }
    ]

    const customState = {
      ...createBlankState('INV-CUSTOM-01'),
      internal,
      external,
      strategies: [
        { id: 'EST-01', name: 'Estrategia Digital', quadrant: 'FO' as const, orientation: 'ofensiva' as const, description: 'Expandir', relatedFactors: ['F-01', 'O-01'], observations: '' }
      ]
    }

    const analysis = calculateAnalysis(customState)

    toBeCloseTo(analysis.efi.total, 0.3 * 4 + 0.3 * 4 + 0.4 * 2, 4) // 1.2 + 1.2 + 0.8 = 3.2
    toBeCloseTo(analysis.efe.total, 0.4 * 3 + 0.3 * 3 + 0.3 * 2, 4) // 1.2 + 0.9 + 0.6 = 2.7
    assert.equal(analysis.relations.summary.FO.available, 4) // 2 F * 2 O
    assert.equal(analysis.relations.summary.DO.available, 2) // 1 D * 2 O
    assert.equal(analysis.relations.summary.FA.available, 2) // 2 F * 1 A
    assert.equal(analysis.relations.summary.DA.available, 1) // 1 D * 1 A
  })
})

