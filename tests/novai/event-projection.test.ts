import test from 'node:test'
import assert from 'node:assert/strict'

import { projectToolResultToEvents } from '../../src/features/novai/event-projection'

/**
 * Fixtures con las formas REALES de salida de las tools modulares,
 * verificadas contra src/features/novai/tools/** durante la Fase B.
 */

const GET_FACTOR_EVIDENCE_RESULT = {
  investigationId: 'inv-1',
  factor: {
    id: 'f-d3',
    code: 'D-03',
    name: 'Rotación de personal alta',
    type: 'D',
    typeName: 'Debilidad',
    category: 'internal',
    weight: 0.2,
    rating: 3,
    score: 0.6,
    description: 'Elevada rotación en el área operativa.',
    evidence: '[Informe interno RRHH 2025] Rotación anual del 28% vs 15% del sector.',
    hasEvidence: true
  },
  traceability: { totalCrossings: 0, relationships: [], totalStrategies: 0, strategies: [], totalCameActions: 0, cameActions: [] }
}

test('NovAi Event Projection (Fase B PROMPT_NOVAI_PRO_V2 §24)', async t => {

  await t.test('get_factor_evidence proyecta un EvidenceEvent trazable', () => {
    const events = projectToolResultToEvents('get_factor_evidence', GET_FACTOR_EVIDENCE_RESULT)

    assert.equal(events.length, 1)
    const ev = events[0] as any

    assert.equal(ev.type, 'evidence')
    assert.equal(ev.factorId, 'D-03')
    assert.equal(ev.factorType, 'D')
    assert.match(ev.title, /D-03/)
    assert.match(ev.snippet, /Rotación anual del 28%/)
    assert.equal(ev.investigationId, 'inv-1')
  })

  await t.test('search_evidence proyecta un EvidenceEvent por resultado', () => {
    const result = {
      investigationId: 'inv-1',
      query: 'rotación',
      totalMatches: 2,
      results: [
        { category: 'factor', code: 'D-03', title: 'Rotación de personal alta', matchedField: 'evidence', snippet: '…rotación anual…', relevanceScore: 0.95, evidenceText: 'x' },
        { category: 'came_action', code: 'CAME-C', title: 'Plan de retención', matchedField: 'action', snippet: '…retención…', relevanceScore: 0.75, evidenceText: 'y' }
      ]
    }

    const events = projectToolResultToEvents('search_evidence', result)

    assert.equal(events.length, 2)
    assert.ok(events.every(e => e.type === 'evidence'))
    const first = events[0] as any

    assert.equal(first.factorType, 'D')
    assert.equal(first.confidence, 0.95)
  })

  await t.test('calculate_matrix EFI proyecta CalculationCard determinista y DAFO no inventa totales', () => {
    const efiResult = {
      investigationId: 'inv-1',
      investigationTitle: 'FCBC',
      matrixType: 'EFI',
      calculation: {
        totalIndex: 2.74,
        interpretation: 'Posición interna fuerte',
        weightsSum: 1,
        factors: [
          { id: 'F-01', name: 'Talento consolidado', type: 'F', weight: 0.3, rating: 4, score: 1.2 },
          { id: 'D-03', name: 'Rotación alta', type: 'D', weight: 0.2, rating: 3, score: 0.6 }
        ]
      }
    }

    const efiEvents = projectToolResultToEvents('calculate_matrix', efiResult) as any[]

    assert.equal(efiEvents.length, 1)
    assert.equal(efiEvents[0].type, 'calculation')
    assert.equal(efiEvents[0].matrixType, 'efi')
    assert.equal(efiEvents[0].total, 2.74)
    assert.equal(efiEvents[0].items.length, 2)
    assert.equal(efiEvents[0].items[0].weightedScore, 1.2)

    const dafoResult = { matrixType: 'DAFO', calculation: { dominantQuadrant: 'FA', quadrantSummaries: {} } }

    assert.deepEqual(projectToolResultToEvents('calculate_matrix', dafoResult), [])
  })

  await t.test('validate_methodology proyecta auditoría + índices verificados', () => {
    const result = {
      investigationId: 'inv-1',
      stageEvaluated: 'ALL',
      status: 'WARNINGS',
      methodologyScore: 85,
      errorsCount: 0,
      warningsCount: 3,
      errors: [],
      warnings: ['EFI: sumatoria 0.98'],
      recommendations: ['QSPM: evaluar matriz cuantitativa'],
      calculatedIndices: { efiTotal: 2.74, efeTotal: 2.41, dominantQuadrant: 'FA' }
    }

    const events = projectToolResultToEvents('validate_methodology', result) as any[]

    assert.equal(events.length, 3)

    assert.equal(events[0].type, 'audit')
    assert.equal(events[0].status, 'WARNING')
    assert.equal(events[0].severity, 'medium')
    assert.match(events[0].message, /85\/100/)
    assert.equal(events[0].recommendation, 'QSPM: evaluar matriz cuantitativa')

    assert.equal(events[1].matrixType, 'efi')
    assert.equal(events[1].total, 2.74)
    assert.equal(events[2].matrixType, 'efe')
    assert.equal(events[2].total, 2.41)

    // Con errores críticos -> INVALID
    const invalid = projectToolResultToEvents('validate_methodology', { ...result, status: 'ERRORS', errorsCount: 2 }) as any[]

    assert.equal(invalid[0].status, 'INVALID')
    assert.equal(invalid[0].severity, 'high')
  })

  await t.test('find_contradictions proyecta hallazgos como auditoría WARNING/critical', () => {
    const result = {
      investigationId: 'inv-1',
      contradictions: [
        { contradictionId: 'contr-1', type: 'MATRIX_CONTRADICTION', severity: 'high', category: 'dafo', title: 'Cero sospechoso D-03 × A-02', explanation: 'Fuerza 0 en factores críticos.', recommendation: 'Revisar fuerza.' },
        { contradictionId: 'contr-2', type: 'FACTOR_EVIDENCE_CONTRADICTION', severity: 'medium', category: 'evidencia', title: 'Evidencia genérica', explanation: 'Sin fuente verificable.', recommendation: 'Citar informe.' }
      ]
    }

    const events = projectToolResultToEvents('find_contradictions', result) as any[]

    assert.equal(events.length, 2)
    assert.ok(events.every(e => e.type === 'audit' && e.status === 'WARNING'))
    assert.equal(events[0].severity, 'critical')
    assert.equal(events[1].severity, 'medium')
  })

  await t.test('audit_factor proyecta auditoría + cálculo peso×calificación', () => {
    const result = {
      investigationId: 'inv-1',
      factor: { code: 'D-03', name: 'Rotación alta', type: 'D', category: 'internal', weight: 0.2, rating: 5, calculatedScore: 1.0, evidence: 'Encuesta' },
      audit: {
        isMethodologicallyValid: false,
        evidenceQuality: 'low',
        criticalErrorsCount: 1,
        warningsCount: 0,
        findings: [{ severity: 'critical', message: 'Calificación fuera de rango para debilidad', suggestedFix: 'Usar escala 1-2 para debilidades.' }]
      }
    }

    const events = projectToolResultToEvents('audit_factor', result) as any[]

    assert.equal(events.length, 2)

    assert.equal(events[0].type, 'audit')
    assert.equal(events[0].status, 'INVALID')
    assert.equal(events[0].target, 'D-03')
    assert.equal(events[0].recommendation, 'Usar escala 1-2 para debilidades.')

    assert.equal(events[1].type, 'calculation')
    assert.equal(events[1].formula, '0.2 × 5 = 1')
  })

  await t.test('audit_relationship: cruce probado -> VALID; cero sospechoso -> WARNING alto con código canónico', () => {
    const baseInternal = { code: 'D-03', name: 'Rotación alta', type: 'D', weight: 0.2, rating: 3, evidence: 'Informe RRHH' }
    const baseExternal = { code: 'A-02', name: 'Mercado laboral exigente', type: 'A', weight: 0.15, rating: 4, evidence: 'Estudio sectorial' }

    const proven = {
      investigationId: 'inv-1',
      crossing: 'D-03 × A-02',
      quadrant: 'DA',
      internalFactor: baseInternal,
      externalFactor: baseExternal,
      audit: { isSuspiciousZero: false, evidenceConnectionStatus: 'proven', confidence: 0.9, findings: [], recommendation: '' }
    }

    const provenEvents = projectToolResultToEvents('audit_relationship', proven) as any[]
    const provenAudit = provenEvents.find(e => e.type === 'audit') as any

    assert.equal(provenEvents.filter(e => e.type === 'evidence').length, 2)
    assert.equal(provenAudit.status, 'VALID')
    assert.equal(provenAudit.target, 'D-03 × A-02')

    const suspicious = {
      ...proven,
      audit: { isSuspiciousZero: true, evidenceConnectionStatus: 'plausible_unproven', confidence: 0.4, findings: [], recommendation: 'Justificar el cero.' }
    }

    const suspiciousEvents = projectToolResultToEvents('audit_relationship', suspicious) as any[]
    const suspiciousAudit = suspiciousEvents.find(e => e.type === 'audit') as any

    assert.equal(suspiciousAudit.status, 'WARNING')
    assert.equal(suspiciousAudit.severity, 'high')
    assert.equal(suspiciousAudit.code, 'DAFO_SUSPICIOUS_ZERO_CROSSING')
    assert.match(suspiciousAudit.message, /Cero sospechoso/)

    const unjustified = {
      ...proven,
      audit: { isSuspiciousZero: false, evidenceConnectionStatus: 'unjustified', confidence: 0.1, findings: [], recommendation: '' }
    }

    const unjustifiedEvents = projectToolResultToEvents('audit_relationship', unjustified) as any[]

    assert.equal((unjustifiedEvents.find(e => e.type === 'audit') as any).status, 'INVALID')
  })

  await t.test('get_investigation_documents proyecta SourceEvents internos/externos', () => {
    const result = {
      investigationId: 'inv-1',
      documents: [
        { sourceName: 'Expediente Documental Interno', referencesCount: 4, linkedFactors: ['D-03', 'A-02'], sampleExcerpts: ['Informe RRHH 2025'] },
        { sourceName: 'Fuente Externa Web', referencesCount: 1, linkedFactors: ['A-01'], sampleExcerpts: ['https://example.com/study'] }
      ]
    }

    const events = projectToolResultToEvents('get_investigation_documents', result) as any[]

    assert.equal(events.length, 2)
    assert.ok(events.every(e => e.type === 'source'))
    assert.equal(events[0].sourceType, 'internal')
    assert.equal(events[0].factorCount, 2)
    assert.equal(events[1].sourceType, 'external')
  })

  await t.test('tool desconocida, resultado vacío o basura devuelve [] sin lanzar', () => {
    assert.deepEqual(projectToolResultToEvents('list_kanban_tasks', { anything: true }), [])
    assert.deepEqual(projectToolResultToEvents('get_factor_evidence', null), [])
    assert.deepEqual(projectToolResultToEvents('get_factor_evidence', 'no-soy-un-objeto'), [])
    assert.deepEqual(projectToolResultToEvents('get_factor_evidence', undefined), [])

    // Objetos malformados no rompen la proyección (best-effort)
    assert.deepEqual(projectToolResultToEvents('get_factor_evidence', { factor: 42 }), [])
    assert.deepEqual(projectToolResultToEvents('calculate_matrix', { calculation: 'x' }), [])
  })
})
