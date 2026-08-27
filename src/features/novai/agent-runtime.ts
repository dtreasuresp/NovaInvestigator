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
import { NOVAI_ALL_MODULAR_TOOLS } from './tools/index'
import { NovaiToolGateway } from './tool-gateway'
import { projectToolResultToEvents } from './event-projection'
import {
  PROVIDER_CAPABILITIES,
  filterCandidatesByCapabilities,
  requiredCapabilitiesForCategory,
  type ProviderId
} from './capabilities'
import type { NovaiEventHandler } from './events'
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

    const geminiApiKey = process.env.GEMINI_API_KEY
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    const zenKeys = (process.env.OPENCODE_ZEN_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean)

    // 3. Control y presupuesto de tokens
    const budgetResult = NovaiTokenBudget.trimConversationHistory({
      messages,
      systemPrompt,
      modelName: 'gemini-3.6-flash'
    })

    const effectiveMessages = budgetResult.trimmedMessages

    // 4. Transformar mensajes a formato Vercel AI SDK Core
    const coreMessages: ModelMessage[] = effectiveMessages
      .filter(m => m.content && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => {
        const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user'

        return { role, content: m.content || '' } as ModelMessage
      })

    // Enforcement point del Harness (spec §38/§39): toda tool pasa por el Gateway,
    // que aplica checkPolicy y registra auditoría en novai_audit_events.
    const runId = `run-${Date.now()}`
    const vercelTools = NovaiToolGateway.buildGovernedVercelTools(principal, { runId })

    // Capacidad requerida por el modo/categoría (spec §27/§29)
    const requiredCaps = requiredCapabilitiesForCategory(routeDecision.category)

    // Lista ordenada de proveedores oficiales: OpenRouter (prioritario) -> Gemini -> OpenCode Zen
    const providerCandidates: Array<{
      name: string
      modelInstance: any
      provider: ProviderId
    }> = []

    if (openrouterApiKey) {
      const openrouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openrouterApiKey,
        headers: { 'HTTP-Referer': 'https://novastore.app', 'X-Title': 'NovaStore ERP' }
      })

      const orModel = routeDecision.recommendedOpenRouterModel || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free'

      providerCandidates.push({ name: `OpenRouter (${orModel})`, modelInstance: openrouter(orModel), provider: 'openrouter' })

      const freeCandidates = [
        'nvidia/nemotron-3-super-120b-a12b:free',
        'deepseek/deepseek-r1:free',
        'deepseek/deepseek-chat:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'mistralai/mistral-small-24b-instruct-2501:free',
        'openrouter/free'
      ]

      for (const modelSlug of freeCandidates) {
        if (modelSlug !== orModel) {
          providerCandidates.push({
            name: `OpenRouter (${modelSlug})`,
            modelInstance: openrouter(modelSlug),
            provider: 'openrouter'
          })
        }
      }
    }

    if (geminiApiKey) {
      const google = createGoogleGenerativeAI({ apiKey: geminiApiKey })
      const customGeminiModel = process.env.GEMINI_MODEL

      if (customGeminiModel) {
        providerCandidates.push({ name: `Gemini (${customGeminiModel})`, modelInstance: google(customGeminiModel), provider: 'gemini' })
      }

      providerCandidates.push({ name: 'Gemini (gemini-2.0-flash)', modelInstance: google('gemini-2.0-flash'), provider: 'gemini' })
      providerCandidates.push({ name: 'Gemini (gemini-1.5-flash)', modelInstance: google('gemini-1.5-flash'), provider: 'gemini' })
    }

    if (zenKeys.length > 0) {
      const zenBaseUrl = process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1'
      const zenModel = process.env.OPENCODE_ZEN_MODEL || 'big-pickle'
      const zen = createOpenAI({ baseURL: zenBaseUrl, apiKey: zenKeys[0] })

      providerCandidates.push({ name: `OpenCode Zen (${zenModel})`, modelInstance: zen(zenModel), provider: 'opencode-zen' })
    }

    // Degradación explícita por capacidades (spec §27/§29): no simular tools
    // en proveedores que no las soporten. Se registra cada salto.
    const filteredCandidates = filterCandidatesByCapabilities(
      providerCandidates,
      requiredCaps,
      (msg) => logger.warn(msg, { action: 'novai.runtime.capability_fallback' })
    )

    if (filteredCandidates.length === 0) {
      logger.error('No provider compatible with required capabilities', {
        action: 'novai.runtime.no_compatible_provider',
        details: { requiredCaps, originalCount: providerCandidates.length }
      })
    }

    let success = false
    let accumulatedText = ''

    for (const candidate of filteredCandidates) {
      try {
        const streamResult = streamText({
          model: candidate.modelInstance,
          system: systemPrompt,
          messages: coreMessages,
          tools: vercelTools,
          maxOutputTokens: 8192,
          maxRetries: 1,
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

            // Proyección a eventos estructurados de dominio (spec §24/§31-36):
            // evidencia, auditorías y cálculos deterministas que la UI
            // renderiza con las tarjetas NovaiEvidenceCard / NovaiAuditCard /
            // NovaiCalculationCard / NovaiSourceCard.
            if (!isError) {
              for (const structuredEvent of projectToolResultToEvents(toolName, output)) {
                await onEvent(structuredEvent)
              }
            }
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

    // Fallback de emergencia sin tools para intentar completar la respuesta si la invocación con tools falló
    if (!success && providerCandidates.length > 0) {
      for (const candidate of providerCandidates) {
        try {
          logger.warn(`Attempting emergency text-only stream on ${candidate.name}`, {
            action: 'novai.runtime.emergency_text_fallback',
            details: { provider: candidate.name }
          })

          const emergencyStream = streamText({
            model: candidate.modelInstance,
            system: systemPrompt,
            messages: coreMessages,
            maxOutputTokens: 4096,
            maxRetries: 0
          })

          for await (const part of emergencyStream.fullStream) {
            if (part.type === 'text-delta') {
              const delta = (part as any).text ?? (part as any).textDelta ?? ''

              if (delta) {
                accumulatedText += delta
                await onEvent({ type: 'text-delta', delta })
              }
            }
          }

          if (accumulatedText.length > 0) {
            success = true
            break
          }
        } catch {
          continue
        }
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