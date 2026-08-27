import test from 'node:test'
import assert from 'node:assert/strict'

import { validateResponse, containsHallucinatedScore } from '../../src/features/novai/response-validator'
import { classifyIntent, INTENT_REQUIREMENTS } from '../../src/features/novai/intent-requirements'
import type { NovaiEvent } from '../../src/features/novai/events'

// Helper to build tool events
function toolCall(tool: string, id = `tc-${tool}`): NovaiEvent {
  return { type: 'tool-call', id, tool, input: {}, timestamp: new Date().toISOString() } as NovaiEvent
}
function toolResult(tool: string, result: unknown, id = `tc-${tool}`): NovaiEvent {
  return { type: 'tool-result', id, tool, result, isError: false } as NovaiEvent
}
function sourceEvent(): NovaiEvent {
  return { type: 'source', sourceType: 'external', name: 'Tavily Source', url: 'https://example.com', retrievedAt: new Date().toISOString() } as NovaiEvent
}
function calculationEvent(): NovaiEvent {
  return { type: 'calculation', matrixType: 'qspm', total: 6.82, summary: 'QSPM TAS', formula: 'TAS = weight*AS' } as NovaiEvent
}
function evidenceEvent(): NovaiEvent {
  return { type: 'evidence', evidenceId: 'ev-1', title: 'Evidencia', snippet: 'snip', source: 'internal' } as NovaiEvent
}

test('Forensic Epistemic Firewall — Golden test 0.68-0.74', async t => {
  await t.test('GOLDEN: texto con 0.68-0.74 sin CalculationEvent → REJECT/DEGRADE', () => {
    const hallucinatedText = `
      Fuentes oficiales cubanas + medios especializados (0.68-0.74 puntaje de credibilidad)
      Nivel general de confiabilidad: ALTO (0.85/1.0)
      (0.90 × 0.35) + (1.00 × 0.30) + (0.60 × 0.20) + (0.85 × 0.15) = 0.8625
    `
    assert.equal(containsHallucinatedScore(hallucinatedText), true)

    const events: NovaiEvent[] = [] // sin tool calls ni calculations
    const result = validateResponse({
      userMessage: 'verifica si el nivel de confianza de la investigación actual es correcta, busca información confiable en la web',
      assistantText: hallucinatedText,
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['get_active_investigation', 'calculate_matrix', 'web_research']
    })

    // Debe detectar múltiples hallazgos críticos
    assert.ok(result.findings.length >= 2, `expected findings, got ${result.findings.length}`)
    const hasR7 = result.findings.some(f => f.ruleId === 'R7')
    const hasR6 = result.findings.some(f => f.ruleId === 'R6')
    assert.ok(hasR7 || hasR6, 'debe detectar R7 score sin metodología o R6 cálculo sin CalculationEvent')
    assert.ok(result.action === 'REJECT' || result.action === 'INSUFFICIENT_EVIDENCE' || result.action === 'DEGRADE_TO_INFERENCE')
    assert.ok(result.degradedPrefix !== undefined)
  })

  await t.test('GOLDEN: mismo texto CON CalculationEvent y SourceEvent → PASS o DEGRADE leve', () => {
    const text = 'Fuentes externas con relevance 0.81 verificadas, ver tarjetas. Cálculo QSPM TAS 6.82.'
    const events: NovaiEvent[] = [
      toolCall('web_research'),
      toolResult('web_research', { status: 'EXTERNAL_EVIDENCE', results: [{ title: 'x', url: 'https://ex.com' }] }),
      sourceEvent(),
      toolCall('calculate_matrix'),
      toolResult('calculate_matrix', { calculation: { qspm: { winner: 'EST-01' } } }),
      calculationEvent()
    ]
    const result = validateResponse({
      userMessage: 'calcula QSPM y busca web',
      assistantText: text,
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['web_research', 'calculate_matrix']
    })
    // Con evidencia, no debe bloquear por score hallucinated porque texto no contiene 0.68-0.74
    assert.equal(result.action, 'PASS')
  })

  await t.test('Test A: pregunta web sin web_research disponible → INSUFFICIENT_EVIDENCE', () => {
    const result = validateResponse({
      userMessage: 'busca en la web información confiable sobre reforma salarial',
      assistantText: 'Según fuentes oficiales, la reforma es de 3210 CUP (sin tool).',
      events: [],
      intentType: 'SEARCH_WEB',
      requiredTools: ['web_research']
    })
    assert.equal(result.action, 'INSUFFICIENT_EVIDENCE')
    assert.ok(result.findings.some(f => f.ruleId === 'R12' || f.message.includes('web_research')))
  })

  await t.test('Test B: credibilidad sin metodología → no score sin CalculationEvent', () => {
    const result = validateResponse({
      userMessage: 'evalúa credibilidad de fuentes',
      assistantText: 'Credibilidad: 0.73 (alta)',
      events: [toolCall('web_research'), toolResult('web_research', { status: 'EXTERNAL_EVIDENCE', results: [{}] }), sourceEvent()],
      intentType: 'SEARCH_WEB',
      requiredTools: ['web_research']
    })
    // Aunque hay web_research, no hay CalculationEvent para justificar 0.73 como credibilidad
    const hasR7 = result.findings.some(f => f.ruleId === 'R7')
    assert.ok(hasR7, 'debe detectar score sin metodología')
  })

  await t.test('Test D: tool devuelve cero resultados pero LLM afirma validación → INSUFFICIENT', () => {
    const events: NovaiEvent[] = [
      toolCall('web_research'),
      toolResult('web_research', { status: 'EXTERNAL_EVIDENCE', results: [] }) // cero
      // sin SourceEvent porque 0 resultados
    ]
    const result = validateResponse({
      userMessage: 'busca web y valida D-01',
      assistantText: 'Fuentes externas confirman que D-01 es válido.',
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['web_research']
    })
    assert.ok(result.action === 'INSUFFICIENT_EVIDENCE' || result.findings.some(f => f.message.includes('zero') || f.ruleId === 'R11'))
  })

  await t.test('Test F: ¿de dónde salió 0.85? sin CalculationEvent → REJECT/INSUFFICIENT', () => {
    const result = validateResponse({
      userMessage: '¿de dónde salió ese 0.85?',
      assistantText: 'El nivel de confianza es 0.85/1.0 según cálculo previo.',
      events: [],
      intentType: 'VERIFY_DATA',
      requiredTools: ['calculate_matrix']
    })
    assert.ok(result.action !== 'PASS')
  })

  await t.test('Test J: LLM intenta confidence=0.87 sin CalculationEvent → detectado', () => {
    const result = validateResponse({
      userMessage: 'verifica factor',
      assistantText: 'Confianza del investigador: 0.87 (alta credibilidad)',
      events: [],
      intentType: 'VERIFY_FACTOR',
      requiredTools: ['get_factor_evidence']
    })
    // Debe detectar score sin metodología
    assert.ok(result.findings.length > 0)
  })

  await t.test('Test H: verifica investigación requiere get_active_investigation', () => {
    const intent = classifyIntent('verifica si el nivel de confianza de la investigación actual es correcto, busca información confiable en la web')
    assert.equal(intent, 'VERIFY_INVESTIGATION')
    const req = INTENT_REQUIREMENTS[intent]
    assert.ok(req.requiredTools.includes('get_active_investigation'))
    assert.ok(req.requiredTools.includes('calculate_matrix'))
  })

  await t.test('Test I: CONSULTANT sin tool necesaria → validator detecta missing', () => {
    const result = validateResponse({
      userMessage: 'verifica investigación actual con web',
      assistantText: 'He consultado el expediente y la reforma salarial confirma D-01.',
      events: [toolCall('get_investigation_details'), toolResult('get_investigation_details', { internal: [] })], // falta web_research y calculate_matrix
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['get_active_investigation', 'calculate_matrix', 'web_research']
    })
    assert.equal(result.action, 'INSUFFICIENT_EVIDENCE')
  })

  await t.test('Retrospective justification: explica 0.68 con dimensiones sin CalculationEvent → REJECT', () => {
    const text = 'Me baso en dimensiones: Autoridad 0.35, Timeliness 0.30, Objetividad 0.20, Transparencia 0.15. (0.90 × 0.35) + ... = 0.8625'
    const result = validateResponse({
      userMessage: '¿cómo evaluaste 0.68-0.74?',
      assistantText: text,
      events: [], // no calculation
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['calculate_matrix']
    })
    const hasR8 = result.findings.some(f => f.ruleId === 'R8')
    const hasR6 = result.findings.some(f => f.ruleId === 'R6')
    assert.ok(hasR8 || hasR6, 'debe detectar justificación retrospectiva')
  })

  await t.test('PASS: respuesta bien formada con tool + evidence + no hallucination', () => {
    const result = validateResponse({
      userMessage: 'hola, ¿qué investigaciones tengo?',
      assistantText: 'Tienes 3 investigaciones activas. Usa list_investigations para verlas.',
      events: [toolCall('list_investigations'), toolResult('list_investigations', { total: 3 })],
      intentType: 'GENERAL_CHAT',
      requiredTools: []
    })
    // Chat general sin scores ni fuentes afirmadas → PASS
    // Pero si afirma haber consultado expediente sin tool, sería fallo; aquí no lo afirma
    assert.ok(result.action === 'PASS' || result.findings.length === 0)
  })

  await t.test('Test K: Tavily relevance score ≠ credibility score (R9 rejection)', () => {
    const text = 'Según la búsqueda en Tavily, el score de credibilidad es 0.82.'
    const result = validateResponse({
      userMessage: 'busca en web y dime la credibilidad',
      assistantText: text,
      events: [
        toolCall('web_research'),
        toolResult('web_research', {
          status: 'EXTERNAL_EVIDENCE',
          results: [{ title: 'Doc', url: 'https://example.com', relevanceScore: 0.82 }]
        }),
        sourceEvent()
      ],
      intentType: 'SEARCH_WEB',
      requiredTools: ['web_research']
    })

    const hasR9 = result.findings.some(f => f.ruleId === 'R9')
    assert.ok(hasR9, 'debe detectar R9_RELEVANCE_AS_CREDIBILITY cuando el texto equipara score de Tavily con credibilidad')
    assert.equal(result.action, 'REJECT')
  })
})
