import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { logger } from '@/lib/logger'
import type { AiMessage, NovaiContext } from '@/features/novai/schema'
import type { NovaiEvent } from './events'
import { NovaiTokenBudget } from './token-budget'

// =============================================================================
// NovAi Instrumentation — Fase 1
// Observabilidad trazable: contexto recibido → seleccionado → herramientas → evidencia → decisión
// Diseño: no rompe streaming, best-effort persistencia, nunca filtra secrets/PII sin sanitizar
// =============================================================================

export interface ContextReceivedSnapshot {
  app: NovaiContext['app']
  mode?: string
  locale: string
  investigationId?: string | null
  hasState: boolean
  stateSummary?: {
    internalCount: number
    externalCount: number
    relationshipsCount: number
    strategiesCount: number
  } | null
  messagesReceived: number
  lastUserMessagePreview: string // truncated 120 chars
  timestamp: string
}

export interface ContextSelectedSnapshot {
  systemPromptChars: number
  systemPromptTokensEstimated: number
  systemPromptPreview: string // first 500 chars only for debug, no PII dump
  overviewInvestigations: number
  memoriesInjected: number
  memoryKeys: string[]
  methodologyInjected: boolean
  auditFindingsInjected: number
  budgetResult: {
    totalEstimatedTokens: number
    wasTrimmed: boolean
    omittedCount: number
    availableForMessages: number
  }
  modelRoute: {
    mode: string
    category: string
    recommendedModel: string
    preferredProvider: string
    rationale: string
  }
  toolsExposed: string[]
  toolsExposedCount: number
  toolDefinitionsTokensEstimated: number
}

export interface ToolInvocationTrace {
  tool: string
  input: Record<string, unknown>
  timestamp: string
  isError?: boolean
  resultPreview?: string // first 300 chars JSON truncated
  durationMs?: number
}

export interface EvidenceTrace {
  evidences: number
  calculations: number
  audits: number
  sources: number
  evidenceIds: string[]
  sourceUrls: string[]
}

export interface DecisionTrace {
  validationAction?: string
  validationFindings: number
  finalTextPreview: string // first 400 chars
  finalTextLength: number
  wasFallback: boolean
  fallbackReason?: string
}

export interface NovaiRunTrace {
  runId: string // UUID v4
  correlationId: string
  tenantId: string
  userId: string
  conversationId?: string | null
  app: string
  mode?: string
  startTime: string
  durationMs?: number
  received: ContextReceivedSnapshot
  selected: ContextSelectedSnapshot
  intentHeuristic?: string
  toolTraces: ToolInvocationTrace[]
  evidence: EvidenceTrace
  decision: DecisionTrace
  metrics: {
    inputTokensEstimated: number
    inputTokensActual?: number | null
    outputTokensEstimated: number
    outputTokensActual?: number | null
    totalTokensEstimated: number
    totalTokensActual?: number | null
    contextUtilizationEstimated: number // 0-1
    contextUtilizationActual?: number | null
    latencyMs?: number
    ttftMs?: number
    provider?: string
    model?: string
  }
  status: 'running' | 'completed' | 'failed' | 'aborted'
  error?: string
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function sanitizePreview(str: string): string {
  // Evitar PII masiva: no loguear emails, tokens, etc — solo preview truncado
  return truncate(str.replace(/\s+/g, ' ').trim(), 500)
}

export class NovaiInstrumentation {
  static generateRunId(): string {
    try {
      return randomUUID()
    } catch {
      // Fallback determinista si crypto no disponible en edge (no debería ocurrir en Node runtime)
      return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    }
  }

  static buildReceivedSnapshot(options: {
    context: NovaiContext
    messages: AiMessage[]
    locale: string
  }): ContextReceivedSnapshot {
    const lastUser = [...options.messages].reverse().find(m => m.role === 'user')
    const state = (options.context as { state?: unknown }).state as Record<string, unknown> | undefined
    const hasState = Boolean(state && typeof state === 'object' && Array.isArray((state as { internal?: unknown }).internal))
    let stateSummary: ContextReceivedSnapshot['stateSummary'] = null
    if (hasState && state) {
      const s = state as { internal?: unknown[]; external?: unknown[]; relationships?: unknown[]; strategies?: unknown[] }
      stateSummary = {
        internalCount: Array.isArray(s.internal) ? s.internal.length : 0,
        externalCount: Array.isArray(s.external) ? s.external.length : 0,
        relationshipsCount: Array.isArray(s.relationships) ? s.relationships.length : 0,
        strategiesCount: Array.isArray(s.strategies) ? s.strategies.length : 0
      }
    }
    const invId = (options.context as { investigationId?: string }).investigationId || null
    return {
      app: options.context.app,
      mode: options.context.mode,
      locale: options.locale,
      investigationId: invId,
      hasState,
      stateSummary,
      messagesReceived: options.messages.length,
      lastUserMessagePreview: truncate(lastUser?.content || '', 120),
      timestamp: new Date().toISOString()
    }
  }

  static buildSelectedSnapshot(options: {
    systemPrompt: string
    overview?: { investigations: { total: number } } | null
    memoriesCount: number
    memoryKeys: string[]
    methodologyInjected: boolean
    auditFindingsCount: number
    budgetResult: { totalEstimatedTokens: number; wasTrimmed: boolean; omittedCount: number }
    availableForMessages: number
    modelRoute: { mode: string; category: string; recommendedModel: string; preferredProvider: string; rationale: string }
    toolsExposed: string[]
  }): ContextSelectedSnapshot {
    const toolDefsStr = options.toolsExposed.join(',')
    return {
      systemPromptChars: options.systemPrompt.length,
      systemPromptTokensEstimated: NovaiTokenBudget.estimateTokens(options.systemPrompt),
      systemPromptPreview: sanitizePreview(options.systemPrompt),
      overviewInvestigations: options.overview?.investigations.total ?? 0,
      memoriesInjected: options.memoriesCount,
      memoryKeys: options.memoryKeys,
      methodologyInjected: options.methodologyInjected,
      auditFindingsInjected: options.auditFindingsCount,
      budgetResult: {
        totalEstimatedTokens: options.budgetResult.totalEstimatedTokens,
        wasTrimmed: options.budgetResult.wasTrimmed,
        omittedCount: options.budgetResult.omittedCount,
        availableForMessages: options.availableForMessages
      },
      modelRoute: options.modelRoute,
      toolsExposed: options.toolsExposed,
      toolsExposedCount: options.toolsExposed.length,
      toolDefinitionsTokensEstimated: NovaiTokenBudget.estimateTokens(toolDefsStr) * 10 // heuristic avg per tool
    }
  }

  static logRunStart(trace: NovaiRunTrace): void {
    logger.info('NovAi run started', {
      action: 'novai.instrumentation.run_start',
      details: {
        runId: trace.runId,
        tenantId: trace.tenantId,
        userId: trace.userId,
        app: trace.app,
        mode: trace.mode,
        received: trace.received,
        selected: {
          systemTokens: trace.selected.systemPromptTokensEstimated,
          toolsExposed: trace.selected.toolsExposedCount,
          wasTrimmed: trace.selected.budgetResult.wasTrimmed,
          memories: trace.selected.memoriesInjected
        }
      }
    } as unknown as Record<string, unknown>)
  }

  static logRunComplete(trace: NovaiRunTrace): void {
    logger.info('NovAi run completed', {
      action: 'novai.instrumentation.run_complete',
      details: {
        runId: trace.runId,
        tenantId: trace.tenantId,
        durationMs: trace.durationMs,
        toolsExecuted: trace.toolTraces.length,
        toolNames: trace.toolTraces.map(t => t.tool),
        evidence: trace.evidence,
        decision: {
          validationAction: trace.decision.validationAction,
          findings: trace.decision.validationFindings,
          textLength: trace.decision.finalTextLength,
          wasFallback: trace.decision.wasFallback
        },
        metrics: trace.metrics,
        status: trace.status
      }
    } as unknown as Record<string, unknown>)
  }

  static logContextLoss(trace: NovaiRunTrace, reason: string, details: Record<string, unknown>): void {
    logger.warn(`NovAi context diagnosis: ${reason}`, {
      action: 'novai.instrumentation.context_diagnosis',
      details: {
        runId: trace.runId,
        tenantId: trace.tenantId,
        reason,
        ...details
      }
    } as unknown as Record<string, unknown>)
  }

  /**
   * Persiste el run en novai_agent_runs de forma best-effort (no rompe respuesta).
   * Requiere migración que añada columnas snapshot si aún no existen.
   */
  static async persistRunAsync(
    client: SupabaseClient,
    trace: NovaiRunTrace
  ): Promise<void> {
    // Fire-and-forget sin bloquear streaming
    Promise.resolve().then(async () => {
      try {
        // Attempt insert with snapshot — si columnas no existen aún, fallback a insert mínimo
        const payload: Record<string, unknown> = {
          id: trace.runId,
          tenant_id: trace.tenantId,
          user_id: trace.userId,
          conversation_id: trace.conversationId || null,
          mode: trace.mode || trace.app || 'CHAT',
          model: trace.metrics.model || trace.selected.modelRoute.recommendedModel || 'unknown',
          task_category: trace.selected.modelRoute.category || 'general',
          input_tokens: trace.metrics.inputTokensActual ?? trace.metrics.inputTokensEstimated ?? 0,
          output_tokens: trace.metrics.outputTokensActual ?? trace.metrics.outputTokensEstimated ?? 0,
          duration_ms: trace.durationMs ?? trace.metrics.latencyMs ?? 0,
          status: trace.status === 'completed' ? 'completed' : trace.status === 'failed' ? 'failed' : trace.status === 'aborted' ? 'aborted' : 'completed',
          error_message: trace.error || null
        }

        // Columnas nuevas (si existen tras migración 2026-08-28): snapshot, intent, evidence_count
        // Intentamos incluirlas; si falla por column does not exist, reintentamos sin ellas.
        const extendedPayload: Record<string, unknown> = {
          ...payload,
          context_snapshot: {
            received: trace.received,
            selected: {
              systemPromptTokens: trace.selected.systemPromptTokensEstimated,
              systemPreview: trace.selected.systemPromptPreview,
              methodologyInjected: trace.selected.methodologyInjected,
              memories: trace.selected.memoryKeys,
              toolsExposed: trace.selected.toolsExposed,
              budget: trace.selected.budgetResult
            },
            intent: trace.intentHeuristic,
            toolTraces: trace.toolTraces,
            evidence: trace.evidence,
            decision: trace.decision,
            metrics: trace.metrics
          },
          intent: trace.intentHeuristic || null,
          evidence_count: trace.evidence.evidences + trace.evidence.calculations + trace.evidence.audits + trace.evidence.sources
        }

        // Idempotente: early insert ya creó la fila → hacemos upsert (o update si duplicate)
        let { error } = await client.from('novai_agent_runs').upsert(extendedPayload as never, { onConflict: 'id' } as unknown as never)

        // Fallback si upsert no soportado o columnas nuevas no existen
        if (error) {
          const msg = String(error.message || '')
          if (msg.includes('context_snapshot') || msg.includes('intent') || msg.includes('evidence_count') || msg.includes('column')) {
            const retry = await client.from('novai_agent_runs').upsert(payload as never, { onConflict: 'id' } as unknown as never)
            if (retry.error) {
              // Último fallback: update directo si ya existe
              const upd = await client
                .from('novai_agent_runs')
                .update({
                  input_tokens: payload.input_tokens as number,
                  output_tokens: payload.output_tokens as number,
                  duration_ms: payload.duration_ms as number,
                  status: payload.status as string
                } as never)
                .eq('id', trace.runId as string)
              if (upd.error) {
                logger.warn('Failed to persist novai_agent_runs (fallback also failed)', {
                  action: 'novai.instrumentation.persist_run',
                  details: { runId: trace.runId, error: retry.error.message }
                } as unknown as Record<string, unknown>)
              }
            }
          } else if (msg.toLowerCase().includes('duplicate') || msg.includes('23505')) {
            // Duplicate key → update
            await client
              .from('novai_agent_runs')
              .update({
                input_tokens: payload.input_tokens as number,
                output_tokens: payload.output_tokens as number,
                duration_ms: payload.duration_ms as number,
                status: payload.status as string
              } as never)
              .eq('id', trace.runId as string)
          } else {
            logger.warn('Failed to persist novai_agent_runs', {
              action: 'novai.instrumentation.persist_run',
              details: { runId: trace.runId, error: error.message }
            } as unknown as Record<string, unknown>)
          }
        }
      } catch (err) {
        logger.warn('Exception persisting novai_agent_runs', {
          action: 'novai.instrumentation.persist_run',
          details: { runId: trace.runId, error: err instanceof Error ? err.message : String(err) }
        } as unknown as Record<string, unknown>)
      }
    })
  }

  /**
   * Construye evento de diagnóstico para SSE (opcional, útil para benchmark / debug UI)
   */
  static toInstrumentationEvent(trace: NovaiRunTrace): NovaiEvent & { type: 'instrumentation' } {
    return {
      type: 'instrumentation' as unknown as NovaiEvent['type'],
      runId: trace.runId,
      received: trace.received,
      selected: trace.selected,
      intent: trace.intentHeuristic,
      toolCount: trace.toolTraces.length,
      evidence: trace.evidence,
      metrics: trace.metrics
    } as unknown as NovaiEvent & { type: 'instrumentation' }
  }
}
