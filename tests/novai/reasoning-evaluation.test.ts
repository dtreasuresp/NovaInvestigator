import test from 'node:test'
import assert from 'node:assert/strict'

import {
  auditDafoCrossing,
  getMethodologicalPrompt,
  STRATEGIC_METHODOLOGY_AXIOMS
} from '../../src/features/novai/methodology-knowledge'
import {
  auditInvestigationConsistency,
  buildAuditContextPrompt
} from '../../src/features/novai/evidence-engine'
import { NovaiContextEngine } from '../../src/features/novai/context-engine'
import type { InvestigationState, Factor, Relationship } from '../../src/types/apps/investigator-types'

test('NovAi Cognitive Engine - Strategic Methodology Axioms & Anti-Sycophancy', async t => {
  await t.test('DAFO DA Crossing: Detects suspicious zero in critical talent attrition vs competition threat', () => {
    const internalFactor = {
      id: 'D-03',
      name: 'Los trabajadores con >10 años muestran desgaste y podrían desvincularse',
      type: 'D' as const,
      rating: 1,
      weight: 0.15
    }

    const externalFactor = {
      id: 'A-02',
      name: 'Crecimiento de la competencia en el mercado laboral',
      type: 'A' as const,
      rating: 1,
      weight: 0.12
    }

    // Evaluated at 0 (Sycophancy test case)
    const auditZero = auditDafoCrossing(internalFactor, externalFactor, 0)
    assert.equal(auditZero.isSuspiciousZero, true)
    assert.equal(auditZero.suggestedMinScore >= 2, true)
    assert.match(auditZero.auditRationale, /Inconsistencia crítica detectada/)

    // Evaluated at 2 or 3 (Correct strategic evaluation)
    const auditProper = auditDafoCrossing(internalFactor, externalFactor, 2)
    assert.equal(auditProper.isSuspiciousZero, false)
  })

  await t.test('DAFO FO Crossing: Detects suspicious zero when core strength (rating 4) faces high-weight opportunity', () => {
    const internalFactor = {
      id: 'F-01',
      name: 'Patente tecnológica exclusiva y liderazgo en I+D',
      type: 'F' as const,
      rating: 4,
      weight: 0.20
    }

    const externalFactor = {
      id: 'O-01',
      name: 'Expansión de la demanda en mercados internacionales',
      type: 'O' as const,
      rating: 4,
      weight: 0.25
    }

    const auditZero = auditDafoCrossing(internalFactor, externalFactor, 0)
    assert.equal(auditZero.isSuspiciousZero, true)
    assert.equal(auditZero.suggestedMinScore >= 2, true)
  })

  await t.test('Evidence Engine: Audits full investigation state and catches mathematical & logical contradictions', () => {
    const mockInternal: Factor[] = [
      {
        id: 'D-03',
        name: 'Los trabajadores con >10 años muestran desgaste y podrían desvincularse',
        type: 'D',
        group: 'internal',
        rating: 1,
        weight: 0.40,
        description: 'Desgaste acumulado',
        evidence: 'Encuesta de clima 2026'
      },
      {
        id: 'F-01',
        name: 'Solidez financiera',
        type: 'F',
        group: 'internal',
        rating: 4,
        weight: 0.40,
        description: 'Liquidez alta',
        evidence: 'Audit contable'
      }
      // Total weight = 0.80 != 1.00 (invalid sum)
    ]

    const mockExternal: Factor[] = [
      {
        id: 'A-02',
        name: 'Crecimiento de la competencia en el mercado laboral',
        type: 'A',
        group: 'external',
        rating: 1,
        weight: 1.00,
        description: 'Nuevos competidores agresivos',
        evidence: 'Reporte sectorial'
      }
    ]

    const mockRelationships: Relationship[] = [
      {
        id: 'rel-1',
        internalId: 'D-03',
        externalId: 'A-02',
        quadrant: 'DA',
        strength: 0,
        status: 'evaluado',
        justification: 'Sin impacto relevante',
        evidence: '',
        evaluator: 'User Test',
        date: new Date().toISOString()
      }
    ]

    const mockState = {
      internal: mockInternal,
      external: mockExternal,
      relationships: mockRelationships,
      strategies: [],
      qspmScores: {},
      selectedStrategyId: null,
      selectionJustification: '',
      cameCriteria: [],
      cameActions: [],
      history: [],
      metadata: {
        id: 'inv-1',
        label: 'INV-1',
        title: 'Diagnóstico de Prueba',
        organization: 'Empresa Test',
        unit: 'Sede Central',
        author: 'Tester',
        evaluationDate: '2026-08-23',
        validation: 'borrador',
        status: 'borrador',
        problem: 'Prueba',
        objective: 'Test',
        assumptions: 'Ninguno',
        methodologicalVersion: '1.0',
        updatedAt: new Date().toISOString(),
        archivedAt: null
      }
    } as unknown as InvestigationState

    const audit = auditInvestigationConsistency(mockState)
    assert.equal(audit.hasCriticalContradictions, true)

    const weightFinding = audit.findings.find(f => f.code === 'EFI_WEIGHT_SUM_INVALID')
    assert.ok(weightFinding)
    assert.match(weightFinding.message, /0.800/)

    const suspiciousFinding = audit.findings.find(f => f.code === 'DAFO_SUSPICIOUS_ZERO_CROSSING')
    assert.ok(suspiciousFinding)

    const promptText = buildAuditContextPrompt(audit)
    assert.match(promptText, /ALERTAS DE AUDITORÍA Y CONTRADICCIONES/)
    assert.match(promptText, /Cruces con posible subestimación/)
  })

  await t.test('Context Engine: Injects canonical methodology, anti-sycophancy directives and live audit into system prompt', () => {
    const mockPrincipal = {
      userId: 'usr-123',
      tenantId: 'tnt-abc',
      client: {} as any
    }

    const mockState = {
      internal: [
        { id: 'F-01', name: 'Marca reconocida', type: 'F', group: 'internal', rating: 4, weight: 1.00, description: '', evidence: '' }
      ],
      external: [
        { id: 'O-01', name: 'Apertura de nuevos canales', type: 'O', group: 'external', rating: 3, weight: 1.00, description: '', evidence: '' }
      ],
      relationships: [
        {
          id: 'rel-fo-1',
          internalId: 'F-01',
          externalId: 'O-01',
          quadrant: 'FO',
          strength: 2,
          status: 'evaluado',
          justification: 'Apalancamiento de marca',
          evidence: '',
          evaluator: 'Tester',
          date: new Date().toISOString()
        }
      ],
      strategies: [],
      qspmScores: {},
      selectedStrategyId: null,
      selectionJustification: '',
      cameCriteria: [],
      cameActions: [],
      history: [],
      metadata: {
        id: 'inv-alpha',
        label: 'INV-A',
        title: 'Expediente Alpha',
        organization: 'Alpha Corp',
        unit: '',
        author: '',
        evaluationDate: '',
        validation: '',
        status: '',
        problem: '',
        objective: '',
        assumptions: '',
        methodologicalVersion: '1.0',
        updatedAt: new Date().toISOString(),
        archivedAt: null
      }
    } as unknown as InvestigationState

    const prompt = NovaiContextEngine.buildSystemPrompt({
      principal: mockPrincipal,
      context: {
        app: 'investigator',
        state: mockState
      },
      locale: 'es'
    })

    // Validate presence of methodology knowledge & audit
    assert.match(prompt, /Marco Metodológico de Diagnóstico Estratégico/)
    assert.match(prompt, /Enfoque de Asesoría y Principios Profesionales/)
    assert.match(prompt, /AUDITORÍA DETERMINISTA DE COHERENCIA DEL EXPEDIENTE/)
    assert.match(prompt, /Matriz de Evaluación de Factores Internos \(EFI\)/)
    assert.match(prompt, /Matriz de Evaluación de Factores Externos \(EFE\)/)
    assert.match(prompt, /Matriz de Impacto Cruzado DAFO/)
  })
})
