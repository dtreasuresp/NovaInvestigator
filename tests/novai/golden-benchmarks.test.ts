import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiToolSelector } from '../../src/features/novai/tool-selector'
import { NovaiContextManager } from '../../src/features/novai/context-manager'
import { classifyIntent, detectExternalVerificationRequest, getIntentContract } from '../../src/features/novai/intent-requirements'
import { validateResponse, detectUnbackedExternalClaims, hasSuccessfulToolResult } from '../../src/features/novai/response-validator'
import type { InvestigationsPrincipal } from '../../src/lib/investigations/access'
import type { NovaiContext } from '../../src/features/novai/schema'
import type { NovaiEvent } from '../../src/features/novai/events'

const MOCK_PRINCIPAL: InvestigationsPrincipal = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  client: null as any,
  ...({
    role: 'admin',
    permissions: ['investigations:read', 'investigations:audit', 'investigations:calculate', 'investigations:evidence:search', 'investigations:evidence:verify'],
    isSuperAdmin: false
  } as any)
}

const READONLY_PRINCIPAL: InvestigationsPrincipal = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000003',
  client: null as any,
  ...({
    role: 'member',
    permissions: ['investigations:read'],
    isSuperAdmin: false
  } as any)
}

test('NovAi V2 — Golden Test Suite & Benchmarks (A-E)', async t => {
  await t.test('Benchmark A (Greeting): "Hola" → 0 tools, minimal context, token savings > 80%', () => {
    const query = 'Hola, buenos días'
    const intent = classifyIntent(query)
    assert.equal(intent, 'GENERAL_CHAT')

    const sel = NovaiToolSelector.selectTools({
      principal: MOCK_PRINCIPAL,
      context: { app: 'investigator', mode: 'CHAT' } as NovaiContext,
      messages: [{ role: 'user', content: query }]
    })

    assert.equal(sel.selectedTools.length, 0, 'Casual greeting must not expose heavy domain tools')
    assert.ok(sel.tokenSavings > 80, `Expected > 80% token savings, got ${sel.tokenSavings}%`)

    const prompt = NovaiContextManager.buildSystemPrompt({
      principal: MOCK_PRINCIPAL,
      context: { app: 'investigator', mode: 'CHAT' },
      locale: 'es',
      messages: [{ role: 'user', content: query }]
    })

    assert.equal(prompt.includes('REGLAS MATEMÁTICAS INMUTABLES'), false, 'Greeting prompt must be minimal without methodology slices')
  })

  await t.test('Benchmark B (Prompt Maestro Golden Query): External verification repeat request', () => {
    const userQuery = 'Perfecto. Entonces, puedes repetir otra vez a ver si encuentras información que respalde el grado de confianza de la investigación?'
    
    // 1. Detección heurística de solicitud externa
    const isExternal = detectExternalVerificationRequest(userQuery)
    assert.equal(isExternal, true, 'Must detect user intent to verify confidence with external info')

    const intent = classifyIntent(userQuery)
    assert.equal(intent, 'VERIFY_INVESTIGATION', 'Must classify as VERIFY_INVESTIGATION')

    // 2. Contrato de intent
    const contract = getIntentContract(intent, { externalVerificationRequested: true })
    assert.equal(contract.externalVerificationRequested, true)
    assert.ok(contract.requiredTools.includes('web_research'), 'Must mandate web_research in requiredTools')
    assert.ok(contract.requiredTools.includes('verify_claim'), 'Must mandate verify_claim in requiredTools')

    // 3. Selección de herramientas
    const sel = NovaiToolSelector.selectTools({
      principal: MOCK_PRINCIPAL,
      context: { app: 'investigator', mode: 'RESEARCHER' } as NovaiContext,
      messages: [{ role: 'user', content: userQuery }],
      explicitIntent: intent
    })

    assert.ok(sel.selectedTools.includes('web_research'), 'web_research must be selected')
    assert.ok(sel.selectedTools.includes('calculate_matrix'), 'calculate_matrix must be selected')

    // 4. Detección de afirmaciones alucinadas sin respaldo externo
    const alucinatedAssistantText = 'He buscado en fuentes externas y la evidencia web refuerza y confirma que el grado de confianza de 0.82 es correcto.'
    const unbackedFindings = detectUnbackedExternalClaims(alucinatedAssistantText, [])
    assert.ok(unbackedFindings.length > 0, 'Must flag unbacked external confirmation claims')

    // 5. Epistemic firewall validation: REJECT / INSUFFICIENT_EVIDENCE
    const eventsWithFailedWeb: NovaiEvent[] = [
      { type: 'tool-call', id: 'tc-1', tool: 'get_active_investigation', input: {} } as NovaiEvent,
      { type: 'tool-result', id: 'tc-1', tool: 'get_active_investigation', result: { id: 'inv-1', title: 'Plan Expansión' } } as NovaiEvent,
      { type: 'tool-call', id: 'tc-2', tool: 'web_research', input: { query: 'evidencia externa confianza' } } as NovaiEvent,
      { type: 'tool-result', id: 'tc-2', tool: 'web_research', result: { status: 'EXTERNAL_RESEARCH_DISABLED', results: [] } } as NovaiEvent
    ]

    const valResult = validateResponse({
      userMessage: userQuery,
      assistantText: alucinatedAssistantText,
      events: eventsWithFailedWeb,
      intentType: intent,
      requiredTools: contract.requiredTools
    })

    assert.ok(valResult.action === 'REJECT' || valResult.action === 'INSUFFICIENT_EVIDENCE', 'Must reject alucinated external corroboration')
    assert.ok(valResult.findings.some(f => f.ruleId === 'R11' || f.ruleId === 'R12' || f.ruleId === 'R13'), 'Must trigger epistemic firewall rule')
  })

  await t.test('Benchmark C (Factor Calibration & Calculation): D-02 factor check without calculation', () => {
    const query = 'Verifica si el factor D-02 está bien respaldado por evidencia y evalúa su ponderación'
    const intent = classifyIntent(query)
    assert.equal(intent, 'VERIFY_FACTOR')

    const sel = NovaiToolSelector.selectTools({
      principal: MOCK_PRINCIPAL,
      context: { app: 'investigator', mode: 'CONSULTANT' } as NovaiContext,
      messages: [{ role: 'user', content: query }]
    })

    assert.ok(sel.selectedTools.includes('get_factor_evidence') || sel.selectedTools.includes('audit_factor'))

    // Intentar responder con total inventado sin CalculationEvent
    const invalidText = 'D-02 tiene fuerza 3 frente a A-02 con impacto TAS total = 7.45 calculado.'
    const valResult = validateResponse({
      userMessage: query,
      assistantText: invalidText,
      events: [],
      intentType: intent,
      requiredTools: ['get_active_investigation', 'get_factor_evidence', 'audit_factor']
    })

    assert.notEqual(valResult.action, 'PASS', 'Must not pass uncalculated factor arithmetic')
  })

  await t.test('Benchmark D (Multi-Tenant & RBAC Security): Tool Selector filters by capabilities', () => {
    const query = 'Audita la investigación y recalcula la matriz EFI'
    const intent = classifyIntent(query)

    const selReadonly = NovaiToolSelector.selectTools({
      principal: READONLY_PRINCIPAL,
      context: { app: 'investigator', mode: 'CONSULTANT' } as NovaiContext,
      messages: [{ role: 'user', content: query }],
      explicitIntent: intent
    })

    // El principal solo tiene 'investigations:read', no tiene 'investigations:calculate' ni 'investigations:audit'
    assert.equal(selReadonly.selectedTools.includes('calculate_matrix'), false, 'calculate_matrix requires investigations:calculate capability')
    assert.equal(selReadonly.selectedTools.includes('audit_relationship'), false, 'audit_relationship requires investigations:audit capability')
    assert.ok(selReadonly.selectedTools.includes('get_active_investigation'), 'Read tool should remain allowed')
  })

  await t.test('Benchmark E (UI Trace Lifecycle & Success Confirmation): hasSuccessfulToolResult and Trace IDs', () => {
    const events: NovaiEvent[] = [
      { type: 'tool-call', id: 'tool-web_research', tool: 'web_research', input: { query: 'market data' } } as NovaiEvent,
      { type: 'tool-result', id: 'tool-web_research', tool: 'web_research', result: { status: 'EXTERNAL_EVIDENCE', results: [{ title: 'Doc', url: 'https://ex.com' }] } } as NovaiEvent
    ]

    assert.equal(hasSuccessfulToolResult(events, 'web_research'), true, 'web_research with valid results must be recognized as successful')

    const failedEvents: NovaiEvent[] = [
      { type: 'tool-call', id: 'tool-web_research', tool: 'web_research', input: { query: 'market data' } } as NovaiEvent,
      { type: 'tool-result', id: 'tool-web_research', tool: 'web_research', isError: true, result: { error: 'timeout' } } as NovaiEvent
    ]

    assert.equal(hasSuccessfulToolResult(failedEvents, 'web_research'), false, 'isError must not be counted as successful')
  })
})
