import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { NovaiTokenBudget } from './token-budget'
import type { AiMessage } from './schema'

// =============================================================================
// NovAi Compaction Engine — Fase 6
// Compaction semántica real (no solo sliding window). Preserva objetivo,
// hechos, decisiones, evidencia y trabajo pendiente en resumen estructurado.
// Trigger: 80% context o >=40 mensajes. Usa LLM cheap (mistral-small) si hay
// API key, si no fallback heurístico determinista para tests/offline.
// =============================================================================

export interface StructuredSummary {
  objective: string
  facts: string[]
  decisions: string[]
  constraints: string[]
  activeInvestigationId: string | null
  evidence: string[]
  conclusions: string[]
  preferences: string[]
  openQuestions: string[]
  pendingWork: string[]
  references: string[]
  generatedAt: string
  omittedCount: number
  version: number
}

export interface CompactionResult {
  summary: StructuredSummary
  compressedMessages: AiMessage[]
  wasCompacted: boolean
  omittedCount: number
  summaryText: string
}

export interface CompactionOptions {
  messages: AiMessage[]
  systemPrompt: string
  modelName?: string
  maxTotalTokens?: number
  reservedOutputTokens?: number
  conversationId?: string | null
  principal?: { tenantId: string; client: SupabaseClient; userId: string }
}

export class NovaiCompactionEngine {
  static readonly COMPACTION_THRESHOLD_UTIL = 0.8
  static readonly COMPACTION_THRESHOLD_MSGS = 40
  static readonly KEEP_RECENT = 10
  static readonly KEEP_ANCHOR = true

  static shouldCompact(options: {
    messages: AiMessage[]
    systemPromptTokens: number
    maxTotalTokens: number
    reservedOutputTokens: number
  }): boolean {
    const { messages, systemPromptTokens, maxTotalTokens, reservedOutputTokens } = options
    const availableForMessages = Math.max(100, maxTotalTokens - systemPromptTokens - reservedOutputTokens)
    const messagesTokens = NovaiTokenBudget.estimateMessagesTokens(messages)
    const utiliz = (systemPromptTokens + messagesTokens) / maxTotalTokens
    if (utiliz >= this.COMPACTION_THRESHOLD_UTIL) return true
    if (messages.length >= this.COMPACTION_THRESHOLD_MSGS) return true
    return false
  }

  static async compact(options: CompactionOptions): Promise<CompactionResult> {
    const { messages, systemPrompt, modelName = 'mistralai/mistral-small-24b-instruct-2501:free', conversationId, principal } = options
    const systemTokens = NovaiTokenBudget.estimateTokens(systemPrompt)
    const budget = NovaiTokenBudget.getModelBudget(modelName)
    const maxTotalTokens = options.maxTotalTokens ?? budget.maxTotalTokens
    const reservedOutputTokens = options.reservedOutputTokens ?? budget.reservedOutputTokens

    const should = this.shouldCompact({ messages, systemPromptTokens: systemTokens, maxTotalTokens, reservedOutputTokens })

    if (!should || messages.length <= this.KEEP_RECENT + 2) {
      return {
        summary: this.emptySummary(0),
        compressedMessages: messages,
        wasCompacted: false,
        omittedCount: 0,
        summaryText: ''
      }
    }

    const anchor = messages[0]
    const recent = messages.slice(-this.KEEP_RECENT)
    const omittedCount = Math.max(0, messages.length - (1 + recent.length))
    const omittedSlice = messages.slice(1, -this.KEEP_RECENT)

    const summary = await this.buildStructuredSummary(anchor, omittedSlice, recent, options)

    const summaryText = this.renderSummaryText(summary)

    const compressionNotice: AiMessage = {
      role: 'system',
      content: `[Resumen de contexto comprimido — ${omittedCount} mensajes previos resumidos para conservar ventana.]\n${summaryText}`
    }

    const compressedMessages: AiMessage[] = [anchor, compressionNotice, ...recent]

    // Persistir summary en metadata si hay principal + conversationId
    if (principal && conversationId) {
      await this.persistSummary(principal.client as unknown as SupabaseClient, conversationId, principal.tenantId, summary, omittedCount)
    }

    logger.info('Compaction completed', {
      action: 'novai.compaction.completed',
      details: { omittedCount, keptRecent: recent.length, summaryVersion: summary.version }
    })

    return {
      summary,
      compressedMessages,
      wasCompacted: true,
      omittedCount,
      summaryText
    }
  }

  private static emptySummary(omittedCount: number): StructuredSummary {
    return {
      objective: '',
      facts: [],
      decisions: [],
      constraints: [],
      activeInvestigationId: null,
      evidence: [],
      conclusions: [],
      preferences: [],
      openQuestions: [],
      pendingWork: [],
      references: [],
      generatedAt: new Date().toISOString(),
      omittedCount,
      version: 0
    }
  }

  private static async buildStructuredSummary(
    anchor: AiMessage,
    omitted: AiMessage[],
    recent: AiMessage[],
    _options: CompactionOptions
  ): Promise<StructuredSummary> {
    const objective = String(anchor.content || '').slice(0, 280)

    const facts = omitted
      .filter(m => m.role === 'assistant' && m.content)
      .map(m => String(m.content).slice(0, 120))
      .filter(Boolean)
      .slice(0, 5)

    const decisions = omitted
      .filter(m => /decid|acord|se elige|ganadora/i.test(String(m.content || '')))
      .map(m => String(m.content).slice(0, 120))
      .slice(0, 3)

    const evidence = omitted
      .filter(m => (m as unknown as { tool_calls?: unknown }).tool_calls || /factor|evidencia|fuente/i.test(String(m.content || '')))
      .map(m => String(m.content).slice(0, 120))
      .slice(0, 5)

    const pendingWork = recent
      .filter(m => /pendiente|por hacer|falta|todo/i.test(String(m.content || '')))
      .map(m => String(m.content).slice(0, 120))
      .slice(0, 3)

    // Intentar LLM cheap si hay OPENROUTER_API_KEY, si no heurístico
    const llmSummary = await this.tryLlmSummary(objective, omitted, recent).catch(() => null)
    if (llmSummary) return llmSummary

    const investigationMatch = [...omitted, ...recent]
      .map(m => String(m.content || '').match(/inv-[a-z0-9-]+/i)?.[0])
      .find(Boolean) || null

    return {
      objective,
      facts: facts.length ? facts : ['Contexto previo sin hechos estructurados extraídos'],
      decisions,
      constraints: [],
      activeInvestigationId: investigationMatch,
      evidence,
      conclusions: [],
      preferences: [],
      openQuestions: [],
      pendingWork,
      references: [],
      generatedAt: new Date().toISOString(),
      omittedCount: omitted.length,
      version: 1
    }
  }

  private static async tryLlmSummary(
    objective: string,
    omitted: AiMessage[],
    recent: AiMessage[]
  ): Promise<StructuredSummary | null> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return null

    const omittedText = omitted.map(m => `${m.role}: ${String(m.content || '').slice(0, 200)}`).join('\n').slice(0, 3500)
    const recentText = recent.map(m => `${m.role}: ${String(m.content || '').slice(0, 200)}`).join('\n').slice(0, 1500)

    const sys = `Eres un compresor semántico de conversaciones. Genera un resumen estructurado JSON con claves: objective, facts[], decisions[], constraints[], activeInvestigationId, evidence[], conclusions[], preferences[], openQuestions[], pendingWork[], references[]. Sé conciso y preserva IDs (D-03, inv-xxx). Responde solo JSON.`

    const user = `Objetivo original: ${objective}\n\nMensajes previos a comprimir (${omitted.length}):\n${omittedText}\n\nMensajes recientes a conservar:\n${recentText}`

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://novaresearch.app',
          'X-Title': 'NovaResearch Compaction'
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-small-24b-instruct-2501:free',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: user }
          ],
          temperature: 0.2,
          max_tokens: 700
        }),
        signal: AbortSignal.timeout(7000)
      })

      if (!res.ok) return null
      const json: unknown = await res.json()
      const content = (json as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content
      if (!content) return null
      const cleaned = String(content).replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned) as Partial<StructuredSummary>
      return {
        objective: String(parsed.objective || objective).slice(0, 300),
        facts: (parsed.facts || []).map(String).slice(0, 6),
        decisions: (parsed.decisions || []).map(String).slice(0, 5),
        constraints: (parsed.constraints || []).map(String).slice(0, 5),
        activeInvestigationId: parsed.activeInvestigationId ? String(parsed.activeInvestigationId) : null,
        evidence: (parsed.evidence || []).map(String).slice(0, 6),
        conclusions: (parsed.conclusions || []).map(String).slice(0, 5),
        preferences: (parsed.preferences || []).map(String).slice(0, 3),
        openQuestions: (parsed.openQuestions || []).map(String).slice(0, 5),
        pendingWork: (parsed.pendingWork || []).map(String).slice(0, 5),
        references: (parsed.references || []).map(String).slice(0, 5),
        generatedAt: new Date().toISOString(),
        omittedCount: omitted.length,
        version: 1
      }
    } catch {
      return null
    }
  }

  private static renderSummaryText(s: StructuredSummary): string {
    const lines: string[] = []
    if (s.objective) lines.push(`Objetivo: ${s.objective}`)
    if (s.facts.length) lines.push(`Hechos: ${s.facts.join(' | ')}`)
    if (s.decisions.length) lines.push(`Decisiones: ${s.decisions.join(' | ')}`)
    if (s.activeInvestigationId) lines.push(`Investigación activa: ${s.activeInvestigationId}`)
    if (s.evidence.length) lines.push(`Evidencia: ${s.evidence.join(' | ')}`)
    if (s.pendingWork.length) lines.push(`Pendiente: ${s.pendingWork.join(' | ')}`)
    if (s.openQuestions.length) lines.push(`Preguntas abiertas: ${s.openQuestions.join(' | ')}`)
    return lines.join('\n')
  }

  private static async persistSummary(
    client: SupabaseClient,
    conversationId: string,
    tenantId: string,
    summary: StructuredSummary,
    omittedCount: number
  ): Promise<void> {
    try {
      const { data: existing } = await client
        .from('novai_conversations')
        .select('metadata, compaction_version')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single()

      const prevVersion = Number((existing as { compaction_version?: number } | null)?.compaction_version ?? 0)
      const prevMetadata = ((existing as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>

      await client
        .from('novai_conversations')
        .update({
          summary: summary as unknown as never,
          compaction_version: prevVersion + 1,
          token_snapshot: { omittedCount, generatedAt: summary.generatedAt } as unknown as never,
          metadata: { ...prevMetadata, compaction: summary, compactionAt: summary.generatedAt } as unknown as never
        } as never)
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
    } catch (err) {
      logger.warn('Compaction persist failed (non-blocking)', {
        action: 'novai.compaction.persist',
        details: { error: err instanceof Error ? err.message : String(err) }
      })
    }
  }
}
