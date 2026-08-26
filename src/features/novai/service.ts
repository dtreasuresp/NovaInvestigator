import type { SupabaseClient } from '@supabase/supabase-js'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { resolveEffectiveAccessSnapshot } from '@/features/access/access-service'
import { authorize } from '@/features/access/authorization-engine'
import { BillingError } from '@/features/billing/errors'
import { enforceBillingRateLimit } from '@/features/billing/rate-limit'

import { canUseFreeText, checkAiEntitlements } from '@/features/novai/entitlements'
import { getDailyQuota, consumeDailyQuota } from '@/features/novai/rate-limit'
import { logger } from '@/lib/logger'
import { callGeminiStreaming, type StreamCallbacks } from '@/features/novai/client/gemini-client'
import { callGroqStreaming } from '@/features/novai/client/groq-client'
import { callCerebrasStreaming } from '@/features/novai/client/cerebras-client'
import { callPollinationsStreaming } from '@/features/novai/client/pollinations-client'
import { callGithubModelsStreaming } from '@/features/novai/client/github-models-client'
import { callOpenRouterStreaming } from '@/features/novai/client/openrouter-client'
import { callOpenCodeZenStreaming } from '@/features/novai/client/opencode-zen-client'

import { streamText, isStepCount, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

import { NovaiContextEngine } from './context-engine'
import { NovaiModelRouter } from './adapters/model-router'
import { NovaiMemoryEngine, type NovaiMemory } from './memory-engine'
import { NovaiTokenBudget } from './token-budget'
import { getMethodologicalPrompt } from './methodology-knowledge'
import { listInvestigationMetadata } from '@/lib/investigations/repository'
import type { NovaiContext, AiMessage, AiQuotaInfo } from './schema'

import { executeNovaiTool, getNovaiVercelTools, NOVAI_TOOL_DECLARATIONS, NOVAI_OPENAI_TOOLS, type OpenAiToolCall } from './tools'
import type { ToolDefinition, StreamingCompletionResult } from '@/features/novai/client/openrouter-client'
import type { InvestigationState, Factor, Strategy } from '@/types/apps/investigator-types'
import { quadrantFor } from '@/utils/investigator/domain'

export { executeNovaiTool, NOVAI_TOOL_DECLARATIONS, NOVAI_OPENAI_TOOLS }
export type { AiQuotaInfo }

export async function getAiQuotaInfo(principal: InvestigationsPrincipal): Promise<AiQuotaInfo> {
  try {
    const snapshot = await resolveEffectiveAccessSnapshot({ tenantId: principal.tenantId })
    const check = checkAiEntitlements(snapshot)

    const allowed = check.hasAiLimitEntitlement
    const canFreeText = allowed && canUseFreeText(snapshot)

    if (!allowed) {
      return {
        allowed: false,
        canUseFreeText: false,
        usageCount: 0,
        limitValue: 0,
        remaining: 0,
        dailyRemaining: 0,
        dailyLimitValue: 0,
        dailyConsumed: 0,
        monthly: { usageCount: 0, limitValue: 0, remaining: 0 },
        daily: { remaining: 0, limitValue: 0, consumed: 0 }
      }
    }

    const { data: usageRows, error } = await (principal.client as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
      'get_billing_entitlement_usage',
      {
        p_tenant_id: principal.tenantId,
        p_entitlement_key: 'limits.ai_queries_monthly'
      }
    )

    let usageCount = 0
    let limitValue: number | null = null
    let remaining: number | null = null

    if (!error && usageRows && Array.isArray(usageRows) && usageRows.length > 0) {
      const row = usageRows[0] as { usage_count: number; limit_value: number | null; remaining: number | null }

      usageCount = Number(row.usage_count) || 0
      limitValue = row.limit_value !== null ? Number(row.limit_value) : row.limit_value === null && check.hasAiLimitEntitlement ? null : 0
      remaining = row.remaining !== null ? Number(row.remaining) : row.remaining === null && check.hasAiLimitEntitlement ? null : 0

      if (!check.hasAiLimitEntitlement) {
        limitValue = 0
        remaining = 0
      }
    } else {
      const ent = snapshot.entitlements.find(e => e.key === 'limits.ai_queries_monthly' && e.isEnabled)

      if (ent) {
        if (ent.limitValue !== null && ent.limitValue !== undefined) {
          limitValue = Number(ent.limitValue)
          remaining = Math.max(0, limitValue - usageCount)
        } else {
          limitValue = null
          remaining = null
        }
      } else {
        limitValue = 0
        remaining = 0
      }
    }

    const daily = await getDailyQuota(principal.client as unknown as SupabaseClient, principal.tenantId)

    return {
      allowed,
      canUseFreeText: canFreeText,
      usageCount,
      limitValue,
      remaining,
      dailyRemaining: daily.remaining,
      dailyLimitValue: daily.limitValue,
      dailyConsumed: daily.consumed,
      monthly: { usageCount, limitValue, remaining },
      daily: { remaining: daily.remaining, limitValue: daily.limitValue, consumed: daily.consumed }
    }
  } catch (err) {
    logger.error('Failed to get AI quota info', { action: 'novai.quota.get', details: { error: String(err) } })

    return {
      allowed: false,
      canUseFreeText: false,
      usageCount: 0,
      limitValue: 0,
      remaining: 0,
      dailyRemaining: 0,
      dailyLimitValue: 0,
      dailyConsumed: 0,
      monthly: { usageCount: 0, limitValue: 0, remaining: 0 },
      daily: { remaining: 0, limitValue: 0, consumed: 0 }
    }
  }
}

export const getNovaiQuotaInfo = getAiQuotaInfo

export async function assertAiAllowed(principal: InvestigationsPrincipal, isFreeText: boolean): Promise<void> {
  const snapshot = await resolveEffectiveAccessSnapshot({ tenantId: principal.tenantId })
  const check = checkAiEntitlements(snapshot)

  if (!check.hasAiLimitEntitlement) {
    throw BillingError.forbidden('ai.chat')
  }

  if (!check.hasAiCapability && !check.hasAiModule) {
    throw BillingError.forbidden('ai.chat')
  }

  if (isFreeText && !canUseFreeText(snapshot)) {
    throw BillingError.forbidden('ai.free_chat')
  }

  const quota = await getAiQuotaInfo(principal)

  if (quota.limitValue !== null && quota.remaining !== null && quota.remaining <= 0) {
    throw BillingError.rateLimited()
  }

  const daily = await getDailyQuota(principal.client as unknown as SupabaseClient, principal.tenantId)

  if (daily.limitValue !== null && daily.remaining !== null && daily.remaining <= 0) {
    throw BillingError.rateLimited()
  }

  const decision = await authorize(
    {
      subject: { userId: principal.userId, tenantId: principal.tenantId },
      action: isFreeText ? 'ai.free_chat' : 'ai.chat',
      resource: { type: 'ai', tenantId: principal.tenantId },
      context: {
        snapshot,
        requireEntitlement: 'limits.ai_queries_monthly',
        requireDailyPolicy: 'limits.ai_queries_daily'
      }
    },
    {
      isActiveTenantMember: async () => true,
      hasCapability: async (_uid, _tid, cap) => snapshot.capabilities.includes(cap),
      getDailyRemaining: async () => ({ remaining: daily.remaining, limitValue: daily.limitValue })
    }
  )

  if (!decision.allowed) {
    if (decision.reason === 'ENTITLEMENT_REQUIRED' || decision.reason === 'ENTITLEMENT_LIMIT_EXCEEDED') {
      throw BillingError.forbidden(decision.entitlement ?? 'limits.ai_queries_monthly')
    }

    if (decision.reason === 'POLICY_DENIED') {
      throw BillingError.rateLimited()
    }

    if (decision.reason === 'AUTHORIZATION_DENIED') {
      throw BillingError.forbidden(decision.capability)
    }
  }

  await enforceBillingRateLimit('checkout_one_time', principal.tenantId)
}

export async function consumeAiQueryQuota(principal: InvestigationsPrincipal): Promise<void> {
  try {
    await (principal.client as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
      'consume_billing_entitlement_usage',
      {
        p_tenant_id: principal.tenantId,
        p_entitlement_key: 'limits.ai_queries_monthly'
      }
    )
  } catch (err) {
    logger.error('Error incrementing AI query entitlement usage', { action: 'novai.quota.consume_monthly', details: { error: String(err) } })
  }

  try {
    await consumeDailyQuota(principal.client as unknown as SupabaseClient, principal.tenantId)
  } catch (err) {
    logger.error('Error incrementing AI daily quota', { action: 'novai.quota.consume_daily', details: { error: String(err) } })
  }
}

interface TenantLiveOverview {
  investigations: {
    total: number
    byStatus: Record<string, number>
    recent: Array<{ id: string; title: string; status: string; updatedAt: string }>
  }
  kanban: {
    totalTasks: number
    columnsSummary: Record<string, number>
    urgentCount: number
  }
  teams: Array<{ id: string; name: string }>
}

export async function fetchTenantLiveOverview(principal: InvestigationsPrincipal): Promise<TenantLiveOverview> {
  const client = principal.client as unknown as SupabaseClient
  const tenantId = principal.tenantId

  try {
    // 1. Investigaciones del tenant bajo RLS
    const invResult = await listInvestigationMetadata(principal.client, {
      tenantId,
      page: 1,
      pageSize: 8,
      includeArchived: false
    })

    const byStatus: Record<string, number> = {}

    for (const it of invResult.items) {
      byStatus[it.status] = (byStatus[it.status] || 0) + 1
    }

    // 2. Tareas de Kanban
    const { data: cols } = await client
      .from('kanban_columns')
      .select('id, name, slug')
      .eq('tenant_id', tenantId)

    const { data: tasks } = await client
      .from('kanban_tasks')
      .select('id, column_id, priority')
      .eq('tenant_id', tenantId)

    const colCounts: Record<string, number> = {}

    for (const col of (cols || []) as Array<{ id: string; name: string; slug: string }>) {
      colCounts[col.name] = ((tasks || []) as Array<{ id: string; column_id: string; priority: string }>).filter(
        t => t.column_id === col.id
      ).length
    }

    const urgentTasks = ((tasks || []) as Array<{ id: string; column_id: string; priority: string }>).filter(
      t => t.priority === 'urgent' || t.priority === 'high'
    ).length

    // 3. Equipos
    const { data: teams } = await client
      .from('teams')
      .select('id, name')
      .eq('tenant_id', tenantId)

    return {
      investigations: {
        total: invResult.total,
        byStatus,
        recent: invResult.items.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          updatedAt: r.updated_at
        }))
      },
      kanban: {
        totalTasks: (tasks || []).length,
        columnsSummary: colCounts,
        urgentCount: urgentTasks
      },
      teams: (teams || []).map(t => ({ id: t.id, name: t.name }))
    }
  } catch (err) {
    logger.warn('Error hydrating live tenant overview for NovAi', {
      action: 'novai.overview.hydrate',
      details: { tenantId, errorMessage: err instanceof Error ? err.message : String(err) }
    })

    return {
      investigations: { total: 0, byStatus: {}, recent: [] },
      kanban: { totalTasks: 0, columnsSummary: {}, urgentCount: 0 },
      teams: []
    }
  }
}

export function resolveSystemPrompt(
  principal: InvestigationsPrincipal,
  context: NovaiContext,
  locale: string,
  overview?: TenantLiveOverview,
  memories?: NovaiMemory[]
): string {
  return NovaiContextEngine.buildSystemPrompt({
    principal,
    context,
    locale,
    overview,
    memories
  })
}

export async function assertNovaiAllowed(principal: InvestigationsPrincipal, isFreeText: boolean): Promise<void> {
  const snapshot = await resolveEffectiveAccessSnapshot({ tenantId: principal.tenantId })
  const check = checkAiEntitlements(snapshot)

  if (!check.hasAiLimitEntitlement) {
    throw BillingError.forbidden('ai.chat')
  }

  if (!check.hasAiModule && !check.hasAiCapability) {
    throw BillingError.forbidden('ai.chat')
  }

  if (isFreeText && !canUseFreeText(snapshot)) {
    throw BillingError.forbidden('ai.free_chat')
  }

  const quota = await getAiQuotaInfo(principal)

  if (quota.limitValue !== null && quota.remaining !== null && quota.remaining <= 0) {
    throw BillingError.rateLimited()
  }

  const daily = await getDailyQuota(principal.client as unknown as SupabaseClient, principal.tenantId)

  if (daily.limitValue !== null && daily.remaining !== null && daily.remaining <= 0) {
    throw BillingError.rateLimited()
  }

  const decision = await authorize(
    {
      subject: { userId: principal.userId, tenantId: principal.tenantId },
      action: isFreeText ? 'ai.free_chat' : 'ai.chat',
      resource: { type: 'ai', tenantId: principal.tenantId },
      context: {
        snapshot,
        requireEntitlement: 'limits.ai_queries_monthly',
        requireDailyPolicy: 'limits.ai_queries_daily'
      }
    },
    {
      isActiveTenantMember: async () => true,
      hasCapability: async (_uid, _tid, cap) => snapshot.capabilities.includes(cap as never),
      getDailyRemaining: async () => ({ remaining: daily.remaining, limitValue: daily.limitValue })
    }
  )

  if (!decision.allowed) {
    if (decision.reason === 'ENTITLEMENT_REQUIRED' || decision.reason === 'ENTITLEMENT_LIMIT_EXCEEDED') {
      throw BillingError.forbidden(decision.entitlement ?? 'limits.ai_queries_monthly')
    }

    if (decision.reason === 'POLICY_DENIED') {
      throw BillingError.rateLimited()
    }

    if (decision.reason === 'AUTHORIZATION_DENIED') {
      throw BillingError.forbidden(decision.capability)
    }
  }

  await enforceBillingRateLimit('checkout_one_time', principal.tenantId)
}

type ProviderRunner = (
  currentMessages: Array<AiMessage | { role: string; content: string | null; tool_call_id?: string; tool_calls?: OpenAiToolCall[] }>,
  tools: ToolDefinition[] | undefined,
  callbacks: StreamCallbacks
) => Promise<StreamingCompletionResult>

async function runWithToolCallingLoop({
  runner,
  initialMessages,
  tools,
  principal,
  callbacks
}: {
  runner: ProviderRunner
  initialMessages: AiMessage[]
  tools: ToolDefinition[]
  principal: InvestigationsPrincipal
  callbacks: StreamCallbacks
}): Promise<void> {
  const currentMessages: Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: OpenAiToolCall[] }> = [...initialMessages]

  const firstPassCallbacks: StreamCallbacks = {
    onChunk: (chunk: string) => {
      callbacks.onChunk(chunk)
    },
    onComplete: () => {
      // Manejado al evaluar si hubo tool calls
    },
    onError: (err: Error) => {
      callbacks.onError(err)
    }
  }

  const result = await runner(currentMessages, tools, firstPassCallbacks)

  logger.info('NovAi tool calls emitted', {
    action: 'novai.tools.emitted',
    details: {
      tenantId: principal.tenantId,
      count: result.toolCalls?.length || 0,
      names: result.toolCalls?.map(t => t.function.name) || [],
      hasToolCalls: !!(result.toolCalls && result.toolCalls.length > 0)
    }
  })

  if (result.toolCalls && result.toolCalls.length > 0) {
    logger.info('NovAi executing tools', {
      action: 'novai.tools.execute',
      details: {
        tenantId: principal.tenantId,
        count: result.toolCalls.length,
        names: result.toolCalls.map(t => t.function.name)
      }
    })

    currentMessages.push({
      role: 'assistant',
      content: result.text || null,
      tool_calls: result.toolCalls
    })

    for (const tc of result.toolCalls) {
      let args: Record<string, unknown> = {}

      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        args = {}
      }

      const execResult = await executeNovaiTool(tc.function.name, args, principal)

      currentMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(execResult.data !== undefined ? execResult.data : { error: execResult.error })
      })
    }

    // Segunda pasada: síntesis en lenguaje natural streameando al usuario
    await runner(currentMessages, undefined, callbacks)

    return
  }

  // Respuesta directa completada
  await callbacks.onComplete(result.text)
}

/**
 * Ejecutor nativo de streaming y Tool Calling Loop gobernado con Vercel AI SDK Core.
 */
async function streamWithVercelAiSdk({
  model,
  systemPrompt,
  messages,
  principal,
  callbacks
}: {
  model: any
  systemPrompt: string
  messages: Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: any }>
  principal: InvestigationsPrincipal
  callbacks: StreamCallbacks
}): Promise<boolean> {
  try {
    const coreMessages: ModelMessage[] = messages
      .filter(m => m.content && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => {
        const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user'
        return { role, content: m.content || '' } as ModelMessage
      })

    const vercelTools = getNovaiVercelTools(principal)

    const result = streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      tools: vercelTools,
      maxOutputTokens: 8192,
      stopWhen: isStepCount(5),
      onError: (errPayload) => {
        const raw = (errPayload as { error?: unknown })?.error ?? errPayload
        const message = raw instanceof Error ? raw.message : typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
        logger.warn('Vercel AI SDK stream error', {
          action: 'novai.vercel_ai.stream_error',
          details: { tenantId: principal.tenantId, errorMessage: message }
        })
      }
    })

    let hasText = false
    let accumulatedText = ''

    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        const delta = (part as any).text ?? (part as any).textDelta ?? ''
        if (delta) {
          hasText = true
          accumulatedText += delta
          callbacks.onChunk(delta)
        }
      } else if (part.type === 'reasoning-delta') {
        const delta = (part as any).text ?? (part as any).textDelta ?? ''
        if (delta && callbacks.onReasoning) {
          callbacks.onReasoning({ textDelta: delta })
        }
      } else if (part.type === 'tool-call') {
        if (callbacks.onToolCall) {
          callbacks.onToolCall({
            toolCallId: (part as any).toolCallId || `tc-${Date.now()}`,
            toolName: (part as any).toolName,
            args: (part as any).input ?? (part as any).args ?? {}
          })
        }
      } else if (part.type === 'tool-result') {
        if (callbacks.onToolResult) {
          callbacks.onToolResult({
            toolCallId: (part as any).toolCallId || '',
            toolName: (part as any).toolName,
            result: (part as any).output ?? (part as any).result,
            isError: (part as any).isError
          })
        }
      }
    }

    const fullText = accumulatedText || (await result.text)
    if (hasText || fullText) {
      await callbacks.onComplete(fullText)
      return true
    }

    return false
  } catch (err) {
    const raw = (err as { error?: unknown })?.error ?? err
    const message = raw instanceof Error ? raw.message : typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
    logger.warn('Vercel AI SDK execution exception', {
      action: 'novai.vercel_ai.exception',
      details: { tenantId: principal.tenantId, errorMessage: message }
    })
    return false
  }
}

export async function streamNovaiChat({
  principal,
  context,
  messages,
  isFreeText = true,
  locale = 'es',
  callbacks
}: {
  principal: InvestigationsPrincipal
  context: NovaiContext
  messages: AiMessage[]
  isFreeText?: boolean
  locale?: string
  callbacks: StreamCallbacks
}): Promise<void> {
  await assertNovaiAllowed(principal, isFreeText)

  // Hidratación automática en vivo de los datos del tenant y memorias bajo RLS y ReBAC
  const [overview, memories] = await Promise.all([
    fetchTenantLiveOverview(principal),
    NovaiMemoryEngine.getActiveMemories(principal.client as unknown as SupabaseClient, {
      tenantId: principal.tenantId,
      userId: principal.userId
    })
  ]);

  const systemPrompt = resolveSystemPrompt(principal, context, locale, overview, memories)
  const groqApiKey = process.env.GROQ_API_KEY
  const geminiApiKey = process.env.GEMINI_API_KEY
  const cerebrasApiKey = process.env.CEREBRAS_API_KEY

  const wrappedCallbacks: StreamCallbacks = {
    onChunk: callbacks.onChunk,
    onToolCall: callbacks.onToolCall,
    onToolResult: callbacks.onToolResult,
    onReasoning: callbacks.onReasoning,
    onComplete: async (fullText: string) => {
      await consumeAiQueryQuota(principal)
      callbacks.onComplete(fullText)
    },
    onError: callbacks.onError
  }

  const githubToken = process.env.GITHUB_TOKEN

  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  const openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  const OPENROUTER_FREE_FALLBACKS_NOVAI = (process.env.OPENROUTER_FREE_MODELS ||
    'nvidia/llama-3.1-nemotron-70b-instruct:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen-2.5-coder-32b-instruct:free,mistralai/mistral-small-24b-instruct-2501:free,openai/gpt-4o-mini'
  )
    .split(',')
    .map(s => s.trim())

  const routeDecision = NovaiModelRouter.routeTask({
    messages,
    contextApp: context.app,
    explicitMode: context.mode,
    isPremium: isFreeText
  })

  // Helper: seleccionar modelo Groq según categoría
  const getGroqModelForCategory = (category: string): string => {
    switch (category) {
      case 'reasoning':
        return 'openai/gpt-oss-120b' // Mejor razonamiento + tools
      case 'coding':
        return 'qwen/qwen3-32b' // Coding + razonamiento
      case 'fast':
        return 'llama-3.1-8b-instant' // Ultra-rápido, 14,400 RPD
      case 'balanced':
      default:
        return 'llama-3.3-70b-versatile' // Flagship equilibrado
    }
  }

  const groqModel = getGroqModelForCategory(routeDecision.category)

  // Presupuesto y ventana deslizante inteligente de tokens
  const budgetResult = NovaiTokenBudget.trimConversationHistory({
    messages,
    systemPrompt,
    modelName: groqModel
  })

  const effectiveMessages = budgetResult.trimmedMessages

  if (budgetResult.wasTrimmed) {
    logger.info('NovAi conversation history trimmed for token budget', {
      action: 'novai.token_budget.trim',
      details: {
        tenantId: principal.tenantId,
        originalCount: messages.length,
        trimmedCount: effectiveMessages.length,
        omittedCount: budgetResult.omittedCount,
        estimatedTokens: budgetResult.totalEstimatedTokens
      }
    })
  }

  // 1. GROQ con Vercel AI SDK — Modelos con tool calling nativo, ultra-rápidos (primario)
  if (groqApiKey) {
    try {
      const groqProvider = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey
      })

      const ok = await streamWithVercelAiSdk({
        model: groqProvider(groqModel),
        systemPrompt,
        messages: effectiveMessages,
        principal,
        callbacks: wrappedCallbacks
      })

      if (ok) return
    } catch (groqError) {
      logger.warn('Groq Vercel AI SDK stream failed, trying fallback runner', { action: 'novai.chat.groq_ai_sdk', details: { tenantId: principal.tenantId, model: groqModel, errorMessage: groqError instanceof Error ? groqError.message : String(groqError) } })
    }
  }

  // 2. OPENROUTER con Vercel AI SDK — Modelos con tool calling (secundario)
  if (openrouterApiKey) {
    const modelsToTryNovai = [
      routeDecision.recommendedOpenRouterModel,
      openrouterModel,
      ...OPENROUTER_FREE_FALLBACKS_NOVAI.filter(m => m !== routeDecision.recommendedOpenRouterModel && m !== openrouterModel)
    ]

    const openrouterProvider = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
      headers: {
        'HTTP-Referer': 'https://novastore.app',
        'X-Title': 'NovaStore ERP'
      }
    })

    for (const m of modelsToTryNovai) {
      try {
        const ok = await streamWithVercelAiSdk({
          model: openrouterProvider(m),
          systemPrompt,
          messages: effectiveMessages,
          principal,
          callbacks: wrappedCallbacks
        })

        if (ok) return
      } catch (openrouterError) {
        logger.warn('OpenRouter Vercel AI SDK stream failed', {
          action: 'novai.chat.openrouter_ai_sdk',
          details: {
            tenantId: principal.tenantId,
            model: m,
            errorMessage: openrouterError instanceof Error ? openrouterError.message : String(openrouterError)
          }
        })
        continue
      }
    }
  }

  // 3. OPENCODE ZEN (rotación de keys) con Vercel AI SDK
  const zenKeys = (process.env.OPENCODE_ZEN_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
  const zenModel = process.env.OPENCODE_ZEN_MODEL || 'big-pickle'
  const zenBaseUrl = process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1'

  if (zenKeys.length) {
    for (const zenKey of zenKeys) {
      try {
        const zenProvider = createOpenAI({
          baseURL: zenBaseUrl,
          apiKey: zenKey
        })

        const ok = await streamWithVercelAiSdk({
          model: zenProvider(zenModel),
          systemPrompt,
          messages: effectiveMessages,
          principal,
          callbacks: wrappedCallbacks
        })

        if (ok) return
      } catch (zenError) {
        logger.warn('OpenCode Zen Vercel AI SDK stream failed (novai)', { action: 'novai.chat.zen_ai_sdk', details: { tenantId: principal.tenantId, errorMessage: zenError instanceof Error ? zenError.message : String(zenError) } })
      }
    }
  }

  // 4. GITHUB MODELS con Vercel AI SDK
  if (githubToken) {
    try {
      const githubProvider = createOpenAI({
        baseURL: 'https://models.inference.ai.azure.com',
        apiKey: githubToken
      })

      const ok = await streamWithVercelAiSdk({
        model: githubProvider('gpt-4o-mini'),
        systemPrompt,
        messages: effectiveMessages,
        principal,
        callbacks: wrappedCallbacks
      })

      if (ok) return
    } catch (githubError) {
      logger.warn('GitHub Models Vercel AI SDK stream failed', { action: 'novai.chat.github_ai_sdk', details: { tenantId: principal.tenantId, errorMessage: githubError instanceof Error ? githubError.message : String(githubError) } })
    }
  }

  // 5. GEMINI con Vercel AI SDK (@ai-sdk/google)
  if (geminiApiKey) {
    try {
      const googleProvider = createGoogleGenerativeAI({
        apiKey: geminiApiKey
      })

      const ok = await streamWithVercelAiSdk({
        model: googleProvider('gemini-1.5-flash'),
        systemPrompt,
        messages: effectiveMessages,
        principal,
        callbacks: wrappedCallbacks
      })

      if (ok) return
    } catch (geminiError) {
      logger.warn('Gemini Vercel AI SDK stream failed', { action: 'novai.chat.gemini_ai_sdk', details: { tenantId: principal.tenantId, errorMessage: geminiError instanceof Error ? geminiError.message : String(geminiError) } })
    }
  }

  // 6. POLLINATIONS — Text-only fallback
  try {
    await callPollinationsStreaming({
      systemPrompt,
      messages: effectiveMessages,
      callbacks: wrappedCallbacks
    })
  } catch (pollinationsError) {
    logger.warn('Pollinations stream failed', { action: 'novai.chat.pollinations', details: { tenantId: principal.tenantId, errorMessage: pollinationsError instanceof Error ? pollinationsError.message : String(pollinationsError) } })
  }

  // 7. CEREBRAS — Text-only fallback
  if (cerebrasApiKey) {
    try {
      await callCerebrasStreaming({
        systemPrompt,
        messages: effectiveMessages,
        apiKey: cerebrasApiKey,
        callbacks: wrappedCallbacks
      })

      return
    } catch (cerebrasError) {
      logger.warn('Cerebras stream failed', { action: 'novai.chat.cerebras', details: { tenantId: principal.tenantId, errorMessage: cerebrasError instanceof Error ? cerebrasError.message : String(cerebrasError) } })
    }
  }

  const fallback =
    locale === 'en'
      ? `**NovAi (offline)** — No AI keys configured. I can still help with NovaStore navigation and methodology. Ask about Investigator, Kanban or billing.`
      : `**NovAi (offline)** — Sin claves IA configuradas. Puedo ayudarte con navegación y metodología de NovaStore. Pregunta sobre Investigador, Kanban o facturación.`

  wrappedCallbacks.onChunk(fallback)
  await wrappedCallbacks.onComplete(fallback)
}

// =============================================================================
// Helper para extracción segura de JSON
// =============================================================================
function extractJsonFromText(raw: string): unknown {
  let cleaned = raw.trim()
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)

  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  return JSON.parse(cleaned)
}

function consolidateEvidence(internalEvidence?: string, externalEvidence?: string): string {
  const parts = [
    ...(internalEvidence || '').split(';'),
    ...(externalEvidence || '').split(';')
  ]
    .map(p => p.trim())
    .filter(Boolean)

  const unique = Array.from(new Set(parts))

  return unique.join('; ')
}

export async function generateNovaiRawText({
  principal,
  systemPrompt,
  userPrompt
}: {
  principal: InvestigationsPrincipal
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  const messages: AiMessage[] = [{ role: 'user', content: userPrompt }]
  let accumulatedText = ''

  const callbacks: StreamCallbacks = {
    onChunk: (chunk: string) => {
      accumulatedText += chunk
    },
    onComplete: async () => { },
    onError: (err: Error) => {
      logger.warn('NovAi raw generation chunk error', {
        action: 'novai.raw.error',
        details: { errorMessage: err.message }
      })
    }
  }

  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  const openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  const OPENROUTER_FREE_FALLBACKS_NOVAI = (process.env.OPENROUTER_FREE_MODELS ||
    'nvidia/nemotron-3-super-120b-a12b:free,meta-llama/llama-4-maverick:free,qwen/qwen3-coder:free,z-ai/glm-4.5-air:free'
  )
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (openrouterApiKey) {
    const modelsToTry = [openrouterModel, ...OPENROUTER_FREE_FALLBACKS_NOVAI.filter(m => m !== openrouterModel)]

    for (const m of modelsToTry) {
      accumulatedText = ''

      try {
        await callOpenRouterStreaming({
          systemPrompt,
          messages,
          apiKey: openrouterApiKey,
          model: m,
          callbacks
        })

        if (accumulatedText.trim()) return accumulatedText
      } catch {
        continue
      }
    }
  }

  const zenKeys = (process.env.OPENCODE_ZEN_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
  const zenModel = process.env.OPENCODE_ZEN_MODEL || 'big-pickle'
  const zenBaseUrl = process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1'

  if (zenKeys.length) {
    for (const zenKey of zenKeys) {
      accumulatedText = ''

      try {
        await callOpenCodeZenStreaming({
          systemPrompt,
          messages,
          apiKey: zenKey,
          model: zenModel,
          baseUrl: zenBaseUrl,
          callbacks
        })

        if (accumulatedText.trim()) return accumulatedText
      } catch {
        continue
      }
    }
  }

  const githubToken = process.env.GITHUB_TOKEN

  if (githubToken) {
    accumulatedText = ''

    try {
      await callGithubModelsStreaming({
        systemPrompt,
        messages,
        apiKey: githubToken,
        callbacks
      })

      if (accumulatedText.trim()) return accumulatedText
    } catch {
      // fallback
    }
  }

  const groqApiKey = process.env.GROQ_API_KEY

  if (groqApiKey) {
    accumulatedText = ''

    try {
      await callGroqStreaming({
        systemPrompt,
        messages,
        apiKey: groqApiKey,
        callbacks
      })

      if (accumulatedText.trim()) return accumulatedText
    } catch {
      // fallback
    }
  }

  const cerebrasApiKey = process.env.CEREBRAS_API_KEY

  if (cerebrasApiKey) {
    accumulatedText = ''

    try {
      await callCerebrasStreaming({
        systemPrompt,
        messages,
        apiKey: cerebrasApiKey,
        callbacks
      })

      if (accumulatedText.trim()) return accumulatedText
    } catch {
      // fallback
    }
  }

  try {
    accumulatedText = ''

    await callPollinationsStreaming({
      systemPrompt,
      messages,
      callbacks
    })

    if (accumulatedText.trim()) return accumulatedText
  } catch {
    // fallback
  }

  const geminiApiKey = process.env.GEMINI_API_KEY

  if (process.env.AI_PROVIDER === 'gemini' && geminiApiKey) {
    accumulatedText = ''

    try {
      await callGeminiStreaming({
        systemPrompt,
        messages,
        apiKey: geminiApiKey,
        callbacks
      })

      if (accumulatedText.trim()) return accumulatedText
    } catch {
      // fallback
    }
  }

  throw new Error('No fue posible obtener respuesta de los proveedores de IA disponibles.')
}

// =============================================================================
// Propuesta Inteligente de Cruces DAFO
// =============================================================================
export async function generateDafoProposal({
  principal,
  state,
  locale = 'es'
}: {
  principal: InvestigationsPrincipal
  state: InvestigationState
  locale?: string
}) {
  await assertNovaiAllowed(principal, true)

  const internal = state.internal || []
  const external = state.external || []

  if (internal.length === 0 || external.length === 0) {
    throw new Error('Se requieren al menos un factor interno (EFI) y un factor externo (EFE) para generar cruces DAFO.')
  }

  const defaultEvaluator = state.metadata?.updatedByName || state.metadata?.author || 'Comité Evaluador'
  const factorMap = new Map([...internal, ...external].map(f => [f.id, f]))

  const systemPrompt = `Eres el Consultor Metodológico Senior y Auditor Estratégico de NovaStore ERP.
Tu tarea es evaluar la relación de impacto estratégico causa-efecto entre Factores Internos (Fortalezas/Debilidades) y Factores Externos (Oportunidades/Amenazas) para la matriz DAFO.

${getMethodologicalPrompt()}

DIRECTIVA DE DISCRIMINACIÓN METODOLÓGICA Y AUDITORÍA CRÍTICA:
- Fuerza 0 = Sin relación directa o impacto irrelevante (requiere justificación explícita 'sin_relacion_justificada').
- Fuerza 1 = Relación débil o indirecta.
- Fuerza 2 = Relación moderada y relevante.
- Fuerza 3 = Relación fuerte, directa y crítica.
- Fuerza null = Pendiente de evaluación / Requiere evidencia adicional ('requiere_evidencia').
- En el cuadrante DA (Debilidad x Amenaza): Si una debilidad interna expone o agrava la vulnerabilidad frente a una amenaza externa en el mismo dominio (ej. desgaste o desvinculación de personal vs competencia laboral en crecimiento), la fuerza NO debe ser 0; debe evaluarse en 2 (Media) o 3 (Alta).
- En el cuadrante FO (Fortaleza x Oportunidad): Apalanca fortalezas distintivas (calif 4) para capturar oportunidades clave.
- NO asignes Fuerza 3 a todo. Aplica rigor analítico: los cruces 3 deben ser selectivos y estratégicos.
- Redacta una justificación concisa (1-2 frases) para cada cruce con fuerza > 0.
- Para cruces donde la conexión es plausible pero falta evidencia documental en el expediente: devuelve strength: null, evaluation: "requiere_evidencia", justification: "Plausible estratégicamente pero requiere validación documental".
- Devuelve OBLIGATORIAMENTE un JSON válido sin texto adicional ni introducciones.`

  const userPrompt = `Analiza los siguientes factores del expediente:

ORGANIZACIÓN: ${state.metadata?.organization || 'No especificada'}
OBJETIVO: ${state.metadata?.objective || 'No especificado'}

FACTORES INTERNOS (EFI):
${internal.map((f: Factor) => `- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight}, Calif: ${f.rating})${f.evidence ? ` | Evidencia: ${f.evidence}` : ''}`).join('\n')}

FACTORES EXTERNOS (EFE):
${external.map((f: Factor) => `- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight}, Calif: ${f.rating})${f.evidence ? ` | Evidencia: ${f.evidence}` : ''}`).join('\n')}

INSTRUCCIÓN DE SALIDA:
Devuelve un JSON estrictamente con esta estructura:
{
  "relationships": [
    {
      "internalId": "F1",
      "externalId": "O1",
      "quadrant": "FO",
      "strength": 2,
      "justification": "Explicación concisa..."
    }
  ],
  "summary": "Breve síntesis del vector dominante sugerido..."
}
Evalúa todos los cruces posibles (${internal.length} internos × ${external.length} externos = ${internal.length * external.length} cruces).`

  const rawText = await generateNovaiRawText({ principal, systemPrompt, userPrompt })

  const parsed = extractJsonFromText(rawText) as {
    relationships?: Array<{
      internalId: string
      externalId: string
      quadrant?: 'FO' | 'DO' | 'FA' | 'DA'
      strength?: number
      justification?: string
    }>
    summary?: string
  }

  const rawRelations = parsed.relationships || []
  const relationshipsMap = new Map<string, { strength: number | null; justification: string }>()

  rawRelations.forEach(r => {
    if (r.internalId && r.externalId) {
      relationshipsMap.set(`${r.internalId}:${r.externalId}`, {
        strength: typeof r.strength === 'number' && r.strength >= 0 && r.strength <= 3 ? r.strength : null,
        justification: String(r.justification || '')
      })
    }
  })

  // Reconciliación determinista: asegura que TODOS los pares posibles existan con su evidencia consolidada
  const formattedRelationships = internal.flatMap((intF: Factor) =>
    external.map((extF: Factor) => {
      const pairKey = `${intF.id}:${extF.id}`
      const aiData = relationshipsMap.get(pairKey)
      const quadrant = (quadrantFor(intF, extF) || 'FO') as 'FO' | 'DO' | 'FA' | 'DA'
      const evidence = consolidateEvidence(intF.evidence, extF.evidence)

      return {
        internalId: intF.id,
        externalId: extF.id,
        quadrant,
        strength: aiData ? aiData.strength : null,
        justification: aiData ? aiData.justification : '',
        evidence,
        evaluator: defaultEvaluator
      }
    })
  )

  await consumeAiQueryQuota(principal)

  return {
    relationships: formattedRelationships,
    summary: parsed.summary || 'Propuesta de cruces generada con rigor metodológico por NovAi.'
  }
}

// =============================================================================
// Propuesta Inteligente de Calificaciones QSPM y Alternativas Estratégicas
// =============================================================================
export async function generateQspmProposal({
  principal,
  state,
  proposeStrategiesIfEmpty = true,
  locale = 'es'
}: {
  principal: InvestigationsPrincipal
  state: InvestigationState
  proposeStrategiesIfEmpty?: boolean
  locale?: string
}) {
  await assertNovaiAllowed(principal, true)

  const allFactors = [...(state.internal || []), ...(state.external || [])]

  if (allFactors.length === 0) {
    throw new Error('Se requieren factores EFI y EFE ponderados para evaluar la matriz QSPM.')
  }

  let strategies = state.strategies || []
  let proposedStrategies: Array<{ id: string; name: string; quadrant: 'FO' | 'DO' | 'FA' | 'DA'; description: string }> = []

  const systemPrompt = `Eres el Consultor Estratégico Senior de NovaStore ERP.
  Tu tarea es evaluar la Matriz Cuantitativa de Planificación Estratégica (QSPM) siguiendo la metodología de Fred David.

  ESCALA DE ATRACTIVO (AS - Attractiveness Score):
  - 1 = No es atractivo (la estrategia no responde bien a este factor).
  - 2 = Algo atractivo.
  - 3 = Razonablemente atractivo.
  - 4 = Altamente atractivo (la estrategia capitaliza al máximo la fortaleza/oportunidad o neutraliza decisivamente la debilidad/amenaza).
  - null / 0 = No aplicable (el factor no influye en la decisión de esta alternativa).

  Devuelve OBLIGATORIAMENTE un JSON válido sin texto adicional.`

  // Si no hay estrategias y está habilitado proponerlas
  if (strategies.length === 0 && proposeStrategiesIfEmpty) {
    const stratPrompt = `El expediente no tiene alternativas estratégicas formuladas aún.
  Propón entre 2 y 4 Alternativas Estratégicas realistas para la organización: "${state.metadata?.organization || 'General'}", objetivo: "${state.metadata?.objective || 'Crecimiento y sostenibilidad'}".
  Factores Clave:
${allFactors.slice(0, 10).map(f => `- [${f.type}] ${f.id}: ${f.name}`).join('\n')}

Devuelve un JSON con:
{
  "proposedStrategies": [
    {
      "id": "EST-01",
      "name": "Título de la estrategia",
      "quadrant": "FO",
      "description": "Descripción de la iniciativa..."
    }
  ]
}`

    const rawStratText = await generateNovaiRawText({ principal, systemPrompt, userPrompt: stratPrompt })

    try {
      const parsedStrat = extractJsonFromText(rawStratText) as { proposedStrategies?: typeof proposedStrategies }

      if (parsedStrat.proposedStrategies && parsedStrat.proposedStrategies.length > 0) {
        proposedStrategies = parsedStrat.proposedStrategies
        strategies = proposedStrategies.map(s => ({
          id: s.id,
          name: s.name,
          quadrant: s.quadrant,
          orientation: '',
          description: s.description,
          relatedFactors: [],
          observations: ''
        }))
      }
    } catch (e) {
      logger.warn('Failed to parse proposed strategies', { action: 'qspm.propose.strategies', details: { error: String(e) } })
    }
  }

  if (strategies.length === 0) {
    throw new Error('No hay estrategias registradas para evaluar en la matriz QSPM.')
  }

  const scorePrompt = `Evalúa las calificaciones de atractivo (AS 1 a 4) para las siguientes alternativas estratégicas frente a cada factor ponderado:

ESTRATEGIAS A EVALUAR:
${strategies.map((s: Strategy) => `- [${s.id}] ${s.name} (Cuadrante: ${s.quadrant}): ${s.description}`).join('\n')}

FACTORES CRÍTICOS:
${allFactors.map((f: Factor) => `- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight})`).join('\n')}

INSTRUCCIÓN DE SALIDA:
Devuelve un JSON con el mapa de puntuaciones AS:
{
  "qspmScores": {
    "EST-01": {
      "F1": 4,
      "D1": 2,
      "O1": 3,
      "A1": null
    }
  },
  "rationale": "Breve justificación del ranking resultante..."
}
`

  const rawScoreText = await generateNovaiRawText({ principal, systemPrompt, userPrompt: scorePrompt })

  const parsedScores = extractJsonFromText(rawScoreText) as {
    qspmScores?: Record<string, Record<string, number | null>>
    rationale?: string
  }

  const qspmScores: Record<string, Record<string, number | null>> = {}

  strategies.forEach((s: Strategy) => {
    qspmScores[s.id] = {}
    const stratScores = parsedScores.qspmScores?.[s.id] || {}

    allFactors.forEach((f: Factor) => {
      const score = stratScores[f.id]
      const num = Number(score)

      if (Number.isInteger(num) && num >= 1 && num <= 4) {
        qspmScores[s.id][f.id] = num
      } else {
        qspmScores[s.id][f.id] = null
      }
    })
  })

  await consumeAiQueryQuota(principal)

  return {
    qspmScores,
    proposedStrategies: proposedStrategies.length > 0 ? proposedStrategies : undefined,
    rationale: parsedScores.rationale || 'Evaluación QSPM completada con metodología Fred David.'
  }
}

export async function streamAiConsultation({
  principal,
  state,
  messages,
  isFreeText = true,
  locale = 'es',
  inventory,
  callbacks
}: {
  principal: InvestigationsPrincipal
  state?: InvestigationState | null
  messages: AiMessage[]
  isFreeText?: boolean
  locale?: string
  inventory?: { total: number; byStatus?: Record<string, number>; recent?: { id: string; title: string; status: string }[] }
  callbacks: StreamCallbacks
}): Promise<void> {
  return streamNovaiChat({
    principal,
    context: {
      app: 'investigator',
      state,
      inventory
    },
    messages,
    isFreeText,
    locale: (['es', 'en', 'de', 'ko', 'pt'].includes(locale) ? locale : 'es') as 'es' | 'en' | 'de' | 'ko' | 'pt',
    callbacks
  })
}

export async function streamAiReport({
  principal,
  format = 'academic',
  locale = 'es',
  state,
  callbacks
}: {
  principal: InvestigationsPrincipal
  format?: 'academic' | 'executive' | 'thesis'
  locale?: string
  state?: InvestigationState | null
  callbacks: StreamCallbacks
}): Promise<void> {
  const org = state?.metadata?.organization || 'la organización'

  const reportPromptMap: Record<string, string> = {
    es: `Genera un dictamen estratégico integral y fundamentación metodológica (${format}) para ${org}, estructurado en: 1. Diagnóstico Integral (resumen ejecutivo de índices globales EFI y EFE, sin repetir el volcado de factores individuales crudos), 2. Posicionamiento Matricial y Vector Dominante (tabla de 4 cuadrantes con índices y justificación del vector dominante), 3. Fundamentación Cuantitativa QSPM (con fórmulas LaTeX normalizadas y cálculo del TAS comparativo), 4. Despliegue Operativo CAME (tabla con acciones, responsables e indicadores de desempeño propuestos), 5. Auditoría del Expediente y Dictamen Final (evaluación de consistencia, advertencias metodológicas y cierre formal). Completa íntegramente las 5 secciones hasta su conclusión.`,
    en: `Generate a comprehensive strategic report and methodological foundation (${format}) for ${org}, structured in: 1. Comprehensive Diagnosis (executive summary of global EFI and EFE scores without raw factor dumping), 2. Matrix Positioning & Dominant Vector (4-quadrant table and dominant vector justification), 3. Quantitative Foundation QSPM (with normalized LaTeX formulas and comparative TAS calculation), 4. Operational Deployment CAME (table with actions, owners, and KPIs), 5. File Audit & Final Executive Ruling. Complete all 5 sections thoroughly to conclusion.`,
    de: `Erstelle ein umfassendes strategisches Gutachten (${format}) für ${org} mit 5 Abschnitten inklusive QSPM-Formeln und CAME-Plan.`,
    ko: `${org}에 대한 종합 전략 진단 및 방법론적 총괄 보고서 (${format})를 5개 항목(진단, DAFO 매트릭스, QSPM 수식, CAME 실행계획, 최종 감사)으로 완성해 주세요.`,
    pt: `Gere um parecer estratégico abrangente e fundamentação metodológica (${format}) para ${org}, estruturado em 5 seções completas (Diagnóstico, Matriz DAFO, QSPM com fórmulas LaTeX, CAME com KPIs e Auditoria Final).`
  }

  const userPrompt = reportPromptMap[locale] || reportPromptMap.es

  return streamNovaiChat({
    principal,
    context: {
      app: 'investigator',
      mode: 'CONSULTANT',
      state
    },
    messages: [
      { role: 'user', content: userPrompt }
    ],
    isFreeText: true,
    locale: (['es', 'en', 'de', 'ko', 'pt'].includes(locale) ? locale : 'es') as 'es' | 'en' | 'de' | 'ko' | 'pt',
    callbacks
  })
}

