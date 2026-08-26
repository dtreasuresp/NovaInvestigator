import { streamText, type ModelMessage, isStepCount } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { AiMessage, NovaiContext } from '@/features/novai/schema'
import { logger } from '@/lib/logger'
import { NovaiMemoryEngine } from './memory-engine'
import { NovaiModelRouter } from './adapters/model-router'
import { NovaiTokenBudget } from './token-budget'
import { getNovaiVercelTools, NOVAI_ALL_MODULAR_TOOLS } from './tools/index'
import type { NovaiEvent, NovaiEventHandler } from './events'
import { resolveSystemPrompt, fetchTenantLiveOverview, assertNovaiAllowed, consumeAiQueryQuota } from './service'

export interface AgentRuntimeOptions {
  principal: InvestigationsPrincipal
  context: NovaiContext
  messages: AiMessage[]
  isFreeText?: boolean
  locale?: string
  onEvent: NovaiEventHandler
}

/**
 * NovAi Agent Runtime — Orquestador centralizado y normalizador multi-proveedor.
 */
export class NovaiAgentRuntime {
  /**
   * Ejecuta el ciclo completo del Agent Harness, normalizando todos los eventos
   * al protocolo canónico `NovaiEvent`.
   */
  static async executeStreaming({
    principal,
    context,
    messages,
    isFreeText = true,
    locale = 'es',
    onEvent
  }: AgentRuntimeOptions): Promise<void> {
    const startTime = Date.now()

    await assertNovaiAllowed(principal, isFreeText)

    await onEvent({
      type: 'step-start',
      stepId: `step-${Date.now()}`,
      name: 'agent-orchestration',
      timestamp: new Date().toISOString()
    })

    // 1. Hidratación en vivo bajo RLS / ReBAC
    const [overview, memories] = await Promise.all([
      fetchTenantLiveOverview(principal),
      NovaiMemoryEngine.getActiveMemories(principal.client as unknown as SupabaseClient, {
        tenantId: principal.tenantId,
        userId: principal.userId
      })
    ])

    const systemPrompt = resolveSystemPrompt(principal, context, locale, overview, memories)

    // 2. Enrutamiento inteligente de modelo
    const routeDecision = NovaiModelRouter.routeTask({
      messages,
      contextApp: context.app,
      explicitMode: context.mode,
      isPremium: isFreeText
    })

    const groqApiKey = process.env.GROQ_API_KEY
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY
    const githubToken = process.env.GITHUB_TOKEN
    const zenKeys = (process.env.OPENCODE_ZEN_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)
    const cerebrasApiKey = process.env.CEREBRAS_API_KEY

    // Helper: selección de modelo
    const getGroqModelForCategory = (category: string): string => {
      switch (category) {
        case 'reasoning':
          return 'openai/gpt-oss-120b'
        case 'coding':
          return 'qwen/qwen3-32b'
        case 'fast':
          return 'llama-3.1-8b-instant'
        case 'balanced':
        default:
          return 'llama-3.3-70b-versatile'
      }
    }

    const groqModel = getGroqModelForCategory(routeDecision.category)

    // 3. Control y presupuesto de tokens
    const budgetResult = NovaiTokenBudget.trimConversationHistory({
      messages,
      systemPrompt,
      modelName: groqModel
    })

    const effectiveMessages = budgetResult.trimmedMessages

    // 4. Transformar mensajes a formato Vercel AI SDK Core
    const coreMessages: ModelMessage[] = effectiveMessages
      .filter(m => m.content && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => {
        const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user'
        return { role, content: m.content || '' } as ModelMessage
      })

    const vercelTools = getNovaiVercelTools(principal)

    // Lista ordenada de proveedores para ejecución resiliente
    const providerCandidates: Array<{
      name: string
      modelInstance: any
    }> = []

    if (groqApiKey) {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey
      })
      providerCandidates.push({ name: `Groq (${groqModel})`, modelInstance: groq(groqModel) })
    }

    if (openrouterApiKey) {
      const openrouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openrouterApiKey,
        headers: { 'HTTP-Referer': 'https://novastore.app', 'X-Title': 'NovaStore ERP' }
      })
      const orModel = routeDecision.recommendedOpenRouterModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
      providerCandidates.push({ name: `OpenRouter (${orModel})`, modelInstance: openrouter(orModel) })
    }

    if (zenKeys.length > 0) {
      const zenBaseUrl = process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1'
      const zenModel = process.env.OPENCODE_ZEN_MODEL || 'big-pickle'
      const zen = createOpenAI({ baseURL: zenBaseUrl, apiKey: zenKeys[0] })
      providerCandidates.push({ name: `OpenCode Zen (${zenModel})`, modelInstance: zen(zenModel) })
    }

    if (githubToken) {
      const github = createOpenAI({ baseURL: 'https://models.inference.ai.azure.com', apiKey: githubToken })
      providerCandidates.push({ name: 'GitHub Models (gpt-4o-mini)', modelInstance: github('gpt-4o-mini') })
    }

    if (geminiApiKey) {
      const google = createGoogleGenerativeAI({ apiKey: geminiApiKey })
      providerCandidates.push({ name: 'Gemini (gemini-1.5-flash)', modelInstance: google('gemini-1.5-flash') })
    }

    // Fallback Pollinations (OpenAI compatible, $0 sin key)
    const pollinations = createOpenAI({
      baseURL: 'https://text.pollinations.ai/openai',
      apiKey: 'pollinations-free'
    })
    providerCandidates.push({ name: 'Pollinations (openai)', modelInstance: pollinations('openai') })

    let success = false
    let accumulatedText = ''

    for (const candidate of providerCandidates) {
      try {
        const streamResult = streamText({
          model: candidate.modelInstance,
          system: systemPrompt,
          messages: coreMessages,
          tools: vercelTools,
          maxOutputTokens: 8192,
          stopWhen: isStepCount(5),
          onError: (errPayload) => {
            const raw = (errPayload as { error?: unknown })?.error ?? errPayload
            const msg = raw instanceof Error ? raw.message : typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
            logger.warn('Agent Runtime provider stream error', {
              action: 'novai.runtime.stream_error',
              details: { provider: candidate.name, errorMessage: msg }
            })
          }
        })

        let candidateHasText = false

        for await (const part of streamResult.fullStream) {
          if (part.type === 'text-delta') {
            const delta = (part as any).text ?? (part as any).textDelta ?? ''
            if (delta) {
              candidateHasText = true
              accumulatedText += delta
              await onEvent({ type: 'text-delta', delta })
            }
          } else if (part.type === 'tool-call') {
            const toolName = (part as any).toolName
            const toolMeta = NOVAI_ALL_MODULAR_TOOLS[toolName]?.metadata
            const toolInput = (part as any).input ?? (part as any).args ?? {}

            await onEvent({
              type: 'tool-call',
              id: (part as any).toolCallId || `tc-${Date.now()}`,
              tool: toolName,
              label: toolMeta?.label || toolName,
              input: toolInput,
              timestamp: new Date().toISOString()
            })

            // Emitir traza semántica amigable (Agent Trace)
            await onEvent({
              type: 'trace',
              category: toolMeta?.category === 'investigations' ? 'investigation' : 'audit',
              title: toolMeta?.label || `Ejecutando ${toolName}`,
              description: `Consultando datos bajo aislamiento tenant seguro.`,
              status: 'running'
            })
          } else if (part.type === 'tool-result') {
            const toolName = (part as any).toolName
            const toolMeta = NOVAI_ALL_MODULAR_TOOLS[toolName]?.metadata
            const output = (part as any).output ?? (part as any).result
            const isError = (part as any).isError

            await onEvent({
              type: 'tool-result',
              id: (part as any).toolCallId || '',
              tool: toolName,
              label: toolMeta?.label || toolName,
              result: output,
              isError
            })

            await onEvent({
              type: 'trace',
              category: 'validation',
              title: `${toolMeta?.label || toolName} completado`,
              description: isError ? 'Error en la ejecución de la herramienta' : 'Datos validados correctamente.',
              status: isError ? 'error' : 'completed'
            })
          }
        }

        const full = accumulatedText || (await streamResult.text)
        if (candidateHasText || full) {
          accumulatedText = full
          success = true
          break
        }
      } catch (provErr) {
        const errorMsg = provErr instanceof Error ? provErr.message : String(provErr)
        logger.warn(`Provider ${candidate.name} failed in Agent Runtime, trying next`, {
          action: 'novai.runtime.provider_fallback',
          details: { provider: candidate.name, error: errorMsg }
        })
        continue
      }
    }

    if (!success) {
      // Fallback estático
      const fallbackText = locale === 'en'
        ? '**NovAi (offline)** — Could not connect to AI providers. Please check system status.'
        : '**NovAi (offline)** — No se pudo conectar con los proveedores de IA. Verifica el estado del sistema.'

      accumulatedText = fallbackText
      await onEvent({ type: 'text-delta', delta: fallbackText })
    }

    // Descontar cuota si se generó respuesta
    if (success) {
      await consumeAiQueryQuota(principal)
    }

    await onEvent({
      type: 'message-complete',
      fullText: accumulatedText,
      durationMs: Date.now() - startTime
    })
  }
}
