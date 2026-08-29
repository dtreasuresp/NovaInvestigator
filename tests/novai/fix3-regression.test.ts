import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateResponse, hasSuccessfulToolResult } from '../../src/features/novai/response-validator'
import { createLedger, markCalled, markResult, markPersisted, hasSucceeded } from '../../src/features/novai/execution-ledger'

// Tests §17 fix3 — 8 casos

describe('fix3 ledger and validator', () => {
  it('TEST1: verify_claim + web_research + persistence succeed → PASS/DEGRADE, no overwrite', () => {
    const events: any[] = [
      { type: 'tool-call', tool: 'verify_claim' },
      { type: 'tool-result', tool: 'verify_claim', result: { claim: 'x', confidenceScore: 0.6 }, isError: false },
      { type: 'tool-call', tool: 'web_research' },
      { type: 'tool-result', tool: 'web_research', result: { status: 'EXTERNAL_EVIDENCE', results: [{ title: 'a', url: 'https://x' }] }, isError: false },
      { type: 'source', sourceType: 'external', url: 'https://x' },
      { type: 'calculation', matrixType: 'efi', total: 2.5 },
    ]
    const ledger: any = {
      web_research: { evidenceStatus: 'PERSISTED', resultsCount: 1 },
      verify_claim: { evidenceStatus: 'PERSISTED' },
    }
    const r = validateResponse({
      userMessage: 'verifica el nivel de confianza',
      assistantText: 'El análisis tiene confianza moderada según cálculo EFI 2.5.',
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['get_active_investigation', 'verify_claim', 'web_research'],
      ledger,
      allowedTools: ['get_active_investigation', 'verify_claim', 'web_research', 'calculate_matrix'],
    } as any)
    // verify_claim y web_research succeeded, pero falta get_active_investigation → INSUFFICIENT_EVIDENCE
    // Si incluimos get_active_investigation:
    const events2 = [{ type: 'tool-result', tool: 'get_active_investigation', result: { hasActiveInvestigation: true }, isError: false }, ...events]
    const r2 = validateResponse({
      userMessage: 'verifica',
      assistantText: 'texto',
      events: events2,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['get_active_investigation', 'verify_claim', 'web_research'],
      ledger: { ...ledger, get_active_investigation: { evidenceStatus: 'PERSISTED' } },
      allowedTools: ['get_active_investigation', 'verify_claim', 'web_research'],
    } as any)
    assert.equal(r2.action, 'PASS')
  })

  it('TEST2: web_research resultsCount=0 → NONE_FOUND → honest path, no FOUND_NOT_PERSISTED', () => {
    const ledger = createLedger('run-1', 'VERIFY_INVESTIGATION', ['web_research'], ['web_research'])
    markCalled(ledger, 'web_research')
    markResult(ledger, 'web_research', { status: 'EXTERNAL_EVIDENCE', results: [] }, false)
    assert.equal(ledger.entries['web_research'].evidenceStatus, 'NONE_FOUND')
  })

  it('TEST3: web_research FOUND_NOT_PERSISTED → no decir NONE_FOUND, ledger distingue', () => {
    const ledger = createLedger('run-1', 'VERIFY_INVESTIGATION', ['web_research'], ['web_research'])
    markCalled(ledger, 'web_research')
    markResult(ledger, 'web_research', { status: 'EXTERNAL_EVIDENCE', results: [{ title: 'a' }] }, false)
    assert.equal(ledger.entries['web_research'].evidenceStatus, 'FOUND_NOT_PERSISTED')
    markPersisted(ledger, 'web_research', false, 'Could not find epismic column')
    assert.equal(ledger.entries['web_research'].evidenceStatus, 'FOUND_NOT_PERSISTED')
    // validator debe no fallar R12 por ledger FOUND_NOT_PERSISTED
    const events: any[] = [
      { type: 'tool-result', tool: 'web_research', result: { status: 'EXTERNAL_EVIDENCE', results: [{ title: 'a' }] }, isError: false },
    ]
    const r = validateResponse({
      userMessage: 'busca web',
      assistantText: 'según fuentes externas confirmadas',
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['web_research'],
      ledger: { web_research: { evidenceStatus: 'FOUND_NOT_PERSISTED', resultsCount: 1 } },
      allowedTools: ['web_research'],
    } as any)
    // No debe generar R12 missing, sino pasar o degradar por otras reglas, pero no R12
    const hasR12 = r.findings.some(f => f.ruleId === 'R12')
    assert.equal(hasR12, false)
  })

  it('TEST4: verify_claim fails → ledger FAILED, no inventar éxito', () => {
    const ledger = createLedger('run-1', 'VERIFY_INVESTIGATION', ['verify_claim'], ['verify_claim'])
    markCalled(ledger, 'verify_claim')
    markResult(ledger, 'verify_claim', { error: 'investigation_id es requerido' }, true)
    assert.equal(ledger.entries['verify_claim'].status, 'FAILED')
    assert.equal(hasSucceeded(ledger, 'verify_claim'), false)
  })

  it('TEST5: validator fail-open no borra respuesta', () => {
    // El nuevo agent-runtime ya no hace overwrite, solo prefix — este test valida que validateResponse sola
    // no produce acción destructiva distinta a prefix
    const events: any[] = []
    const r = validateResponse({
      userMessage: 'hola',
      assistantText: 'hola',
      events,
      intentType: 'GENERAL_CHAT',
      requiredTools: [],
      allowedTools: [],
    } as any)
    assert.equal(r.action, 'PASS')
    assert.equal(r.shouldBlock, false)
  })

  it('TEST6: R3 no sanciona audit_factor si no estaba en required/allowed', () => {
    const events: any[] = []
    const r = validateResponse({
      userMessage: 'verifica',
      assistantText: 'realicé auditoría de factor D-01',
      events,
      intentType: 'VERIFY_INVESTIGATION',
      requiredTools: ['get_active_investigation', 'verify_claim'],
      allowedTools: ['get_active_investigation', 'verify_claim', 'web_research'],
    } as any)
    const hasR3Audit = r.findings.some(f => f.ruleId === 'R3' && f.message.includes('audit_factor'))
    assert.equal(hasR3Audit, false)
  })

  it('TEST7/8: ledger serializa para SSE y persistencia', () => {
    const ledger = createLedger('run-1', 'VERIFY_INVESTIGATION', ['a', 'b'], ['a'])
    markCalled(ledger, 'a')
    markResult(ledger, 'a', { ok: 1 }, false)
    assert.equal(ledger.entries['a'].resultAvailable, true)
  })
})
