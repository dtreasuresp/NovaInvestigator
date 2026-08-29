/**
 * Execution Ledger — Deterministic tool execution tracking (§6 §15 fix3)
 *
 * Distingue explícitamente:
 * EXPOSED → SELECTED → CALLED → STARTED → SUCCEEDED|FAILED|TIMED_OUT|SKIPPED
 *         → RESULT_AVAILABLE → EVIDENCE_PERSISTED
 *
 * Una tool no puede considerarse exitosa solo por estar en selectedTools.
 * Un fallo de persistencia NO equivale a NONE_FOUND.
 */

export type ToolExecutionStatus =
  | 'EXPOSED'
  | 'SELECTED'
  | 'CALLED'
  | 'STARTED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'SKIPPED'
  | 'RESULT_AVAILABLE'
  | 'EVIDENCE_PERSISTED'

export type EvidenceStatus =
  | 'NONE_FOUND' // búsqueda sin resultados
  | 'FOUND_NOT_PERSISTED' // resultados disponibles pero persistencia falló
  | 'PERSISTED' // resultados + persistencia OK
  | 'SEARCH_FAILED' // provider error/timeout
  | 'TOOL_NOT_EXECUTED' // tool nunca llamada

export interface ToolLedgerEntry {
  tool: string
  exposed: boolean
  selected: boolean
  called: boolean
  startedAt?: string
  endedAt?: string
  durationMs?: number
  succeeded?: boolean
  resultAvailable: boolean
  resultsCount?: number
  evidenceCount: number
  evidenceStatus: EvidenceStatus
  persistenceError?: string
  status: ToolExecutionStatus
  isError?: boolean
  errorMessage?: string
}

export interface ExecutionLedger {
  runId: string
  intent: string
  entries: Record<string, ToolLedgerEntry>
}

export function createLedger(runId: string, intent: string, exposedTools: string[], selectedTools: string[]): ExecutionLedger {
  const entries: Record<string, ToolLedgerEntry> = {}
  const exposedSet = new Set(exposedTools)
  const selectedSet = new Set(selectedTools)
  const allTools = new Set([...exposedTools, ...selectedTools])
  for (const t of allTools) {
    entries[t] = {
      tool: t,
      exposed: exposedSet.has(t),
      selected: selectedSet.has(t),
      called: false,
      resultAvailable: false,
      evidenceCount: 0,
      evidenceStatus: selectedSet.has(t) ? 'TOOL_NOT_EXECUTED' : 'TOOL_NOT_EXECUTED',
      status: selectedSet.has(t) ? 'SELECTED' : 'EXPOSED',
    }
  }
  return { runId, intent, entries }
}

export function markCalled(ledger: ExecutionLedger, tool: string): void {
  const e = ledger.entries[tool]
  if (!e) {
    ledger.entries[tool] = {
      tool,
      exposed: false,
      selected: true,
      called: true,
      resultAvailable: false,
      evidenceCount: 0,
      evidenceStatus: 'TOOL_NOT_EXECUTED',
      status: 'CALLED',
      startedAt: new Date().toISOString(),
    }
    return
  }
  e.called = true
  e.startedAt = new Date().toISOString()
  e.status = 'CALLED'
}

export function markResult(
  ledger: ExecutionLedger,
  tool: string,
  result: unknown,
  isError: boolean,
  durationMs?: number
): void {
  let e = ledger.entries[tool]
  if (!e) {
    e = {
      tool,
      exposed: false,
      selected: false,
      called: true,
      resultAvailable: false,
      evidenceCount: 0,
      evidenceStatus: 'TOOL_NOT_EXECUTED',
      status: 'CALLED',
    }
    ledger.entries[tool] = e
  }
  e.endedAt = new Date().toISOString()
  e.durationMs = durationMs
  e.isError = isError
  e.resultAvailable = !isError && result !== null && result !== undefined

  if (isError) {
    const msg = result !== null && typeof result === 'object' && 'error' in (result as Record<string, unknown>)
      ? String((result as Record<string, unknown>).error)
      : String(result)
    e.errorMessage = msg.slice(0, 500)
    e.status = 'FAILED'
    e.evidenceStatus = 'SEARCH_FAILED'
    return
  }

  // Interpretar resultado según tool
  if (tool === 'web_research' && result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    const status = String(r.status || '')
    const results = Array.isArray(r.results) ? r.results : []
    e.resultsCount = results.length
    e.evidenceCount = results.length
    if (status === 'EXTERNAL_EVIDENCE' && results.length > 0) {
      e.status = 'RESULT_AVAILABLE'
      // persistencia se marca después
      e.evidenceStatus = 'FOUND_NOT_PERSISTED' // optimista hasta confirmar persistencia
      e.succeeded = true
    } else if (status === 'EXTERNAL_EVIDENCE' && results.length === 0) {
      e.status = 'SUCCEEDED'
      e.evidenceStatus = 'NONE_FOUND'
      e.succeeded = true
    } else if (status === 'EXTERNAL_RESEARCH_TIMEOUT' || status === 'EXTERNAL_RESEARCH_ERROR' || status === 'EXTERNAL_RESEARCH_DISABLED') {
      e.status = status === 'EXTERNAL_RESEARCH_TIMEOUT' ? 'TIMED_OUT' : 'FAILED'
      e.evidenceStatus = 'SEARCH_FAILED'
      e.succeeded = false
    } else {
      e.status = results.length > 0 ? 'RESULT_AVAILABLE' : 'SUCCEEDED'
      e.evidenceStatus = results.length > 0 ? 'FOUND_NOT_PERSISTED' : 'NONE_FOUND'
      e.succeeded = true
    }
    return
  }

  if (tool === 'verify_claim' || tool === 'calculate_matrix' || tool === 'get_active_investigation' || tool === 'get_investigation_details') {
    e.evidenceCount = 1
    e.status = 'SUCCEEDED'
    e.evidenceStatus = 'PERSISTED' // no aplica persistencia externa, pero resultado disponible
    e.succeeded = true
    return
  }

  e.status = 'SUCCEEDED'
  e.evidenceStatus = 'PERSISTED'
  e.succeeded = true
}

export function markPersisted(ledger: ExecutionLedger, tool: string, success: boolean, error?: string): void {
  const e = ledger.entries[tool]
  if (!e) return
  if (success) {
    e.evidenceStatus = 'PERSISTED'
    e.status = 'EVIDENCE_PERSISTED'
  } else {
    e.evidenceStatus = e.resultsCount && e.resultsCount > 0 ? 'FOUND_NOT_PERSISTED' : 'SEARCH_FAILED'
    e.persistenceError = error?.slice(0, 500)
    // mantener RESULT_AVAILABLE si había resultados
    if (e.resultsCount && e.resultsCount > 0) e.status = 'RESULT_AVAILABLE'
  }
}

export function ledgerToSnapshot(ledger: ExecutionLedger): Record<string, unknown> {
  return {
    runId: ledger.runId,
    intent: ledger.intent,
    entries: Object.values(ledger.entries).map(e => ({
      tool: e.tool,
      status: e.status,
      evidenceStatus: e.evidenceStatus,
      called: e.called,
      succeeded: e.succeeded,
      resultAvailable: e.resultAvailable,
      resultsCount: e.resultsCount,
      evidenceCount: e.evidenceCount,
      persistenceError: e.persistenceError,
      durationMs: e.durationMs,
    })),
  }
}

export function hasSucceeded(ledger: ExecutionLedger, tool: string): boolean {
  const e = ledger.entries[tool]
  return Boolean(e?.succeeded && e.resultAvailable && !e.isError)
}
