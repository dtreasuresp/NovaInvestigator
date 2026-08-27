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
import type { NovaiEvent, NovaiEventHandler } from './events'
import { resolveSystemPrompt, fetchTenantLiveOverview, assertNovaiAllowed, consumeAiQueryQuota } from './service'
import { classifyIntent, getRequiredToolsForIntent } from './intent-requirements'
import { validateResponse } from './response-validator'
import { NovaiInstrumentation } from './instrumentation'

export interface AgentRuntimeOptions {
  principal: InvestigationsPrincipal
  context: NovaiContext
  messages: AiMessage[]
  isFreeText?: boolean
  locale?: string
  conversationId?: string | null
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
    conversationId = null,
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
    // FIX Fase 1: runId UUID v4 (corrige FK violation anterior run-* string)
    const runId = NovaiInstrumentation.generateRunId()
    const vercelTools = NovaiToolGateway.buildGovernedVercelTools(principal, { runId })

    // Instrumentación Fase 1: snapshots de contexto recibido vs seleccionado
    const lastUserContent = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    const heuristicIntent = classifyIntent(lastUserContent)
    const receivedSnapshot = NovaiInstrumentation.buildReceivedSnapshot({ context, messages, locale })
    // Estimación de tokens de definiciones de tools (heurística)
    const toolDefsTokensEstimated = NovaiTokenBudget.estimateTokens(Object.keys(vercelTools).join(',')) * 10
    const systemTokensEstimated = NovaiTokenBudget.estimateTokens(systemPrompt)
    const availableForMessages = Math.max(
      100,
      NovaiTokenBudget.getModelBudget('gemini-3.6-flash').maxTotalTokens -
        systemTokensEstimated -
        NovaiTokenBudget.getModelBudget('gemini-3.6-flash').reservedOutputTokens
    )
    const selectedSnapshotBase = {
      systemPrompt,
      overview,
      memoriesCount: memories.length,
      memoryKeys: memories.map(m => m.key),
      methodologyInjected: systemPrompt.includes('Marco Metodológico'),
      auditFindingsCount: systemPrompt.includes('ALERTAS DE AUDITORÍA') ? 1 : 0,
      budgetResult: {
        totalEstimatedTokens: budgetResult.totalEstimatedTokens,
        wasTrimmed: budgetResult.wasTrimmed,
        omittedCount: budgetResult.omittedCount
      },
      availableForMessages,
      modelRoute: {
        mode: routeDecision.mode,
        category: routeDecision.category,
        recommendedModel: routeDecision.recommendedOpenRouterModel,
        preferredProvider: routeDecision.preferredProvider,
        rationale: routeDecision.rationale
      },
      toolsExposed: Object.keys(vercelTools)
    }
    // Trace base para instrumentación incremental
    const runTraceBase: Record<string, unknown> = {
      runId,
      receivedSnapshot,
      selectedSnapshotBase,
      heuristicIntent,
      toolDefsTokensEstimated,
      systemTokensEstimated
    }
    void logger.info('NovAi run instrumentation init', {
      action: 'novai.instrumentation.init',
      details: runTraceBase
    } as unknown as Record<string, unknown>)

    // Emitir snapshot temprano para diagnóstico SSE (no bloquea)
    await onEvent({
      type: 'context-snapshot' as unknown as NovaiEvent['type'],
      runId,
      received: receivedSnapshot,
      selected: {
        systemPromptTokensEstimated: systemTokensEstimated,
        toolDefinitionsTokensEstimated: toolDefsTokensEstimated,
        toolsExposed: Object.keys(vercelTools),
        modelRoute: selectedSnapshotBase.modelRoute,
        budgetResult: selectedSnapshotBase.budgetResult,
        memoriesInjected: memories.length
      },
      timestamp: new Date().toISOString()
    } as unknown as NovaiEvent)

    await onEvent({
      type: 'instrumentation' as unknown as NovaiEvent['type'],
      runId,
      intent: heuristicIntent,
      received: receivedSnapshot,
      selected: selectedSnapshotBase,
      timestamp: new Date().toISOString()
    } as unknown as NovaiEvent)

    // Insert temprano del run para FK compliance de audit events (best-effort, no bloquea si falla por columnas nuevas)
    try {
      const earlyClient = principal.client as unknown as SupabaseClient
      const earlyPayload: Record<string, unknown> = {
        id: runId,
        tenant_id: principal.tenantId,
        user_id: principal.userId,
        conversation_id: conversationId || null,
        mode: routeDecision.mode || 'CHAT',
        model: routeDecision.recommendedOpenRouterModel || 'unknown',
        task_category: routeDecision.category || 'general',
        input_tokens: systemTokensEstimated + toolDefsTokensEstimated,
        output_tokens: 0,
        duration_ms: 0,
        status: 'completed', // se actualizará al final con métricas reales; este insert temprano evita FK violation
        context_snapshot: { received: receivedSnapshot, selected: { toolsExposed: Object.keys(vercelTools), systemTokensEstimated } },
        intent: heuristicIntent
      } as Record<string, unknown>
      const { error: earlyErr } = await earlyClient.from('novai_agent_runs').insert(earlyPayload as never)
      if (earlyErr) {
        const m = String(earlyErr.message || '')
        if (m.includes('context_snapshot') || m.includes('intent') || m.includes('column')) {
          // Fallback sin columnas nuevas
          const fallbackEarly: Record<string, unknown> = {
            id: runId,
            tenant_id: principal.tenantId,
            user_id: principal.userId,
            conversation_id: conversationId || null,
            mode: routeDecision.mode || 'CHAT',
            model: routeDecision.recommendedOpenRouterModel || 'unknown',
            task_category: routeDecision.category || 'general',
            input_tokens: systemTokensEstimated,
            output_tokens: 0,
            duration_ms: 0,
            status: 'completed'
          }
          await earlyClient.from('novai_agent_runs').insert(fallbackEarly as never)
        }
      }
    } catch {
      // best-effort: auditoría no debe romper respuesta
    }

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
    let accumulatedReasoning = ''
    const collectedEvents: NovaiEvent[] = []
    const emitEvent = async (ev: NovaiEvent) => {
      collectedEvents.push(ev)
      await onEvent(ev)
    }

    // Métricas de observabilidad reales (no estimadas)
    let firstTokenAt: number | null = null
    let providerUsed: string | null = null
    let modelUsed: string | null = null
    let actualUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cachedInputTokens?: number; reasoningTokens?: number } | null = null
    let candidateModelName: string | null = null

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
        let candidateHasReasoning = false
        candidateModelName = candidate.name

        for await (const part of streamResult.fullStream) {
          const pType = (part as { type: string }).type
          if (pType === 'text-delta') {
            const delta = (part as any).text ?? (part as any).textDelta ?? ''

            if (delta) {
              if (firstTokenAt === null) firstTokenAt = Date.now()
              candidateHasText = true
              accumulatedText += delta
              await emitEvent({ type: 'text-delta', delta })
            }
          } else if (pType === 'reasoning' || pType === 'reasoning-delta' || pType === 'reasoning_delta') {
            const delta = (part as any).text ?? (part as any).textDelta ?? (part as any).delta ?? ''
            if (delta) {
              if (firstTokenAt === null) firstTokenAt = Date.now()
              candidateHasReasoning = true
              accumulatedReasoning += delta
              await emitEvent({ type: 'reasoning-delta' as unknown as NovaiEvent['type'], delta } as unknown as NovaiEvent)
            }
          } else if (pType === 'reasoning-start' || pType === 'reasoning-end') {
            // no-op, solo para trazabilidad
            continue
          } else if (pType === 'tool-call') {
            const toolName = (part as any).toolName
            const toolMeta = NOVAI_ALL_MODULAR_TOOLS[toolName]?.metadata
            const toolInput = (part as any).input ?? (part as any).args ?? {}

            await emitEvent({
              type: 'tool-call',
              id: (part as any).toolCallId || `tc-${Date.now()}`,
              tool: toolName,
              label: toolMeta?.label || toolName,
              input: toolInput,
              timestamp: new Date().toISOString()
            })

            // Emitir traza semántica amigable (Agent Trace)
            await emitEvent({
              type: 'trace',
              category: toolMeta?.category === 'investigations' ? 'investigation' : 'audit',
              title: toolMeta?.label || `Ejecutando ${toolName}`,
              description: `Consultando datos bajo aislamiento tenant seguro.`,
              status: 'running'
            })
          } else if (pType === 'tool-result') {
            const toolName = (part as any).toolName
            const toolMeta = NOVAI_ALL_MODULAR_TOOLS[toolName]?.metadata
            const output = (part as any).output ?? (part as any).result
            const isError = (part as any).isError

            await emitEvent({
              type: 'tool-result',
              id: (part as any).toolCallId || '',
              tool: toolName,
              label: toolMeta?.label || toolName,
              result: output,
              isError
            })

            await emitEvent({
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
                await emitEvent(structuredEvent as NovaiEvent)
              }
            }
          } else if (pType === 'source' || pType === 'file' || pType === 'data') {
            // AI SDK Sources (si el provider las emite) — mapear a SourceEvent
            const url = (part as any).url || (part as any).source?.url
            const title = (part as any).title || (part as any).source?.title || 'Fuente'
            if (url) {
              await emitEvent({
                type: 'source',
                sourceType: 'external',
                name: String(title),
                url: String(url),
                retrievedAt: new Date().toISOString()
              })
            }
          }
        }

        // Capturar usage real si el provider lo reporta (Vercel AI SDK: streamResult.usage / totalUsage)
        try {
          const rawUsage: unknown =
            (await (streamResult as unknown as { usage?: Promise<unknown> }).usage) ??
            (await (streamResult as unknown as { totalUsage?: Promise<unknown> }).totalUsage) ??
            (streamResult as unknown as { usage?: unknown }).usage ??
            null
          if (rawUsage && typeof rawUsage === 'object') {
            const u = rawUsage as Record<string, unknown>
            actualUsage = {
              promptTokens: typeof u.promptTokens === 'number' ? u.promptTokens : typeof u.inputTokens === 'number' ? (u.inputTokens as number) : undefined,
              completionTokens: typeof u.completionTokens === 'number' ? u.completionTokens : typeof u.outputTokens === 'number' ? (u.outputTokens as number) : undefined,
              totalTokens: typeof u.totalTokens === 'number' ? u.totalTokens : undefined,
              cachedInputTokens: typeof (u as { cachedInputTokens?: unknown }).cachedInputTokens === 'number' ? (u as { cachedInputTokens: number }).cachedInputTokens : undefined,
              reasoningTokens: typeof (u as { reasoningTokens?: unknown }).reasoningTokens === 'number' ? (u as { reasoningTokens: number }).reasoningTokens : undefined
            }
            // Normalizar total si no está
            if (!actualUsage.totalTokens && (actualUsage.promptTokens || actualUsage.completionTokens)) {
              actualUsage.totalTokens = (actualUsage.promptTokens || 0) + (actualUsage.completionTokens || 0)
            }
          }
        } catch {
          // usage no disponible en este provider — se usa estimación
        }

        const full = accumulatedText || (await streamResult.text)

        if (candidateHasText || candidateHasReasoning || full) {
          accumulatedText = full || accumulatedText
          providerUsed = candidate.provider
          modelUsed = candidate.name
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
            if ((part as { type: string }).type === 'text-delta') {
              const delta = (part as any).text ?? (part as any).textDelta ?? ''

              if (delta) {
                if (firstTokenAt === null) firstTokenAt = Date.now()
                accumulatedText += delta
                await emitEvent({ type: 'text-delta', delta })
              }
            } else if ((part as { type: string }).type === 'reasoning' || (part as { type: string }).type === 'reasoning-delta') {
              const delta = (part as any).text ?? (part as any).textDelta ?? (part as any).delta ?? ''
              if (delta) {
                accumulatedReasoning += delta
                await emitEvent({ type: 'reasoning-delta' as unknown as NovaiEvent['type'], delta } as unknown as NovaiEvent)
              }
            }
          }

          try {
            const emergencyUsage: unknown =
              (await (emergencyStream as unknown as { usage?: Promise<unknown> }).usage) ??
              (emergencyStream as unknown as { usage?: unknown }).usage ??
              null
            if (emergencyUsage && typeof emergencyUsage === 'object') {
              const u = emergencyUsage as Record<string, unknown>
              actualUsage = {
                promptTokens: typeof u.promptTokens === 'number' ? u.promptTokens : undefined,
                completionTokens: typeof u.completionTokens === 'number' ? u.completionTokens : undefined,
                totalTokens: typeof u.totalTokens === 'number' ? u.totalTokens : undefined
              }
            }
          } catch {}

          if (accumulatedText.length > 0) {
            providerUsed = candidate.provider
            modelUsed = candidate.name
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
      await emitEvent({ type: 'text-delta', delta: fallbackText })
    }

    // === Epistemic Firewall: Response Validator (§35 §37 §47) ===
    // El LLM genera interpretación; el runtime valida evidencia verificable.
    try {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
      const intent = classifyIntent(lastUserMsg)
      const requiredTools = getRequiredToolsForIntent(intent)
      const validation = validateResponse({
        userMessage: lastUserMsg,
        assistantText: accumulatedText,
        events: collectedEvents,
        intentType: intent,
        requiredTools
      })

      if (validation.findings.length > 0) {
        logger.warn('ResponseValidator findings', {
          action: 'novai.validator.findings',
          details: {
            tenantId: principal.tenantId,
            intent,
            requiredTools,
            actionTaken: validation.action,
            findings: validation.findings.map(f => ({ rule: f.ruleId, severity: f.severity, msg: f.message.slice(0, 120) }))
          }
        })

        // Emitir auditorías epistémicas como trazas para observabilidad
        for (const f of validation.findings) {
          await emitEvent({
            type: 'warning',
            code: f.ruleId,
            message: f.message,
            severity: f.severity === 'CRITICAL' ? 'high' : f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'medium' : 'low'
          })
        }
      }

      if (validation.action !== 'PASS' && validation.degradedPrefix) {
        const prefix = validation.degradedPrefix
        accumulatedText = prefix + accumulatedText
        // No emit extra text-delta here; message-complete will carry fullText with prefix.
        // Warning events already emitted above provide trazabilidad operacional.
      }
    } catch (valErr) {
      logger.warn('ResponseValidator error (fail-open)', {
        action: 'novai.validator.error',
        details: { error: valErr instanceof Error ? valErr.message : String(valErr) }
      })
    }

    // Descontar cuota si se generó respuesta
    if (success) {
      await consumeAiQueryQuota(principal)
    }

    // === Métricas finales y observabilidad (Fase 1) ===
    const durationMs = Date.now() - startTime
    const ttftMs = firstTokenAt !== null ? firstTokenAt - startTime : null
    const modelBudget = NovaiTokenBudget.getModelBudget(candidateModelName || routeDecision.recommendedOpenRouterModel)
    const estimatedInputTokens = systemTokensEstimated + NovaiTokenBudget.estimateMessagesTokens(effectiveMessages) + toolDefsTokensEstimated
    const estimatedOutputTokens = NovaiTokenBudget.estimateTokens(accumulatedText)
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens
    const actualInputTokens = actualUsage?.promptTokens ?? null
    const actualOutputTokens = actualUsage?.completionTokens ?? null
    const actualTotalTokens = actualUsage?.totalTokens ?? (actualInputTokens !== null && actualOutputTokens !== null ? actualInputTokens + actualOutputTokens : null)
    const contextUtilizationEstimated = modelBudget.maxTotalTokens > 0 ? estimatedTotalTokens / modelBudget.maxTotalTokens : 0
    const contextUtilizationActual = actualTotalTokens !== null && modelBudget.maxTotalTokens > 0 ? actualTotalTokens / modelBudget.maxTotalTokens : null

    // Construir trace completo para persistencia
    const toolCallsCount = collectedEvents.filter(e => e.type === 'tool-call').length
    const evidenceCount = collectedEvents.filter(e => e.type === 'evidence').length
    const calculationCount = collectedEvents.filter(e => e.type === 'calculation').length
    const sourceCount = collectedEvents.filter(e => e.type === 'source').length
    const auditCount = collectedEvents.filter(e => e.type === 'audit').length

    // Detección de pérdida/contaminación/confusión de contexto
    if (receivedSnapshot.hasState && selectedSnapshotBase.systemPrompt.length < 500) {
      logger.warn('Context loss: investigation state received but systemPrompt suspiciously short', {
        action: 'novai.instrumentation.context_loss',
        details: { runId, received: receivedSnapshot, selectedChars: selectedSnapshotBase.systemPrompt.length }
      } as unknown as Record<string, unknown>)
    }
    if (!receivedSnapshot.hasState && selectedSnapshotBase.systemPrompt.includes('DATOS DEL EXPEDIENTE')) {
      logger.warn('Context contamination: no state received but expediente data injected', {
        action: 'novai.instrumentation.context_contamination',
        details: { runId, app: receivedSnapshot.app }
      } as unknown as Record<string, unknown>)
    }

    // Persistir run de forma best-effort (no bloquea respuesta)
    const supabaseClient = principal.client as unknown as SupabaseClient
    const conversationIdForTrace = conversationId || null

    const trace = {
      runId,
      correlationId: runId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      conversationId: conversationIdForTrace,
      app: context.app,
      mode: routeDecision.mode,
      startTime: new Date(startTime).toISOString(),
      durationMs,
      received: receivedSnapshot,
      selected: {
        systemPromptChars: selectedSnapshotBase.systemPrompt.length,
        systemPromptTokensEstimated: systemTokensEstimated,
        systemPromptPreview: selectedSnapshotBase.systemPrompt.slice(0, 500),
        overviewInvestigations: (overview as { investigations?: { total?: number } })?.investigations?.total ?? 0,
        memoriesInjected: memories.length,
        memoryKeys: memories.map(m => m.key),
        methodologyInjected: selectedSnapshotBase.methodologyInjected,
        auditFindingsInjected: selectedSnapshotBase.auditFindingsCount,
        budgetResult: selectedSnapshotBase.budgetResult,
        modelRoute: selectedSnapshotBase.modelRoute,
        toolsExposed: Object.keys(vercelTools),
        toolsExposedCount: Object.keys(vercelTools).length,
        toolDefinitionsTokensEstimated: toolDefsTokensEstimated
      },
      intentHeuristic: heuristicIntent,
      toolTraces: collectedEvents
        .filter(e => e.type === 'tool-call' || e.type === 'tool-result')
        .map(e => {
          if (e.type === 'tool-call') {
            return { tool: (e as { tool: string }).tool, input: (e as { input: Record<string, unknown> }).input, timestamp: (e as { timestamp?: string }).timestamp || new Date().toISOString() }
          }
          return { tool: (e as { tool: string }).tool, input: {}, timestamp: new Date().toISOString(), isError: (e as { isError?: boolean }).isError }
        }),
      evidence: {
        evidences: evidenceCount,
        calculations: calculationCount,
        audits: auditCount,
        sources: sourceCount,
        evidenceIds: collectedEvents.filter(e => e.type === 'evidence').map(e => (e as { evidenceId: string }).evidenceId),
        sourceUrls: collectedEvents.filter(e => e.type === 'source').map(e => (e as { url?: string }).url || '').filter(Boolean) as string[]
      },
      decision: {
        validationAction: ((): string | undefined => {
          try {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
            const intent = classifyIntent(lastUserMsg)
            const requiredTools = getRequiredToolsForIntent(intent)
            const v = validateResponse({ userMessage: lastUserMsg, assistantText: accumulatedText, events: collectedEvents, intentType: intent, requiredTools })
            return v.action
          } catch {
            return undefined
          }
        })(),
        validationFindings: collectedEvents.filter(e => e.type === 'warning').length,
        finalTextPreview: accumulatedText.slice(0, 400),
        finalTextLength: accumulatedText.length,
        wasFallback: !success || accumulatedText.includes('NovAi (offline)')
      },
      metrics: {
        inputTokensEstimated: estimatedInputTokens,
        inputTokensActual: actualInputTokens,
        outputTokensEstimated: estimatedOutputTokens,
        outputTokensActual: actualOutputTokens,
        totalTokensEstimated: estimatedTotalTokens,
        totalTokensActual: actualTotalTokens,
        contextUtilizationEstimated,
        contextUtilizationActual,
        latencyMs: durationMs,
        ttftMs,
        provider: providerUsed,
        model: modelUsed || candidateModelName
      },
      status: success ? ('completed' as const) : ('failed' as const)
    }

    // Persistir async
    void NovaiInstrumentation.persistRunAsync(supabaseClient, trace as unknown as Parameters<typeof NovaiInstrumentation.persistRunAsync>[1])

    // Emitir evento final de instrumentación para observabilidad SSE
    await emitEvent({
      type: 'instrumentation' as unknown as NovaiEvent['type'],
      runId,
      metrics: trace.metrics,
      received: receivedSnapshot,
      evidence: trace.evidence,
      timestamp: new Date().toISOString()
    } as unknown as NovaiEvent)

    await emitEvent({
      type: 'message-complete',
      fullText: accumulatedText,
      durationMs,
      usage: {
        promptTokens: actualInputTokens ?? estimatedInputTokens,
        completionTokens: actualOutputTokens ?? estimatedOutputTokens,
        totalTokens: actualTotalTokens ?? estimatedTotalTokens,
        cachedTokens: actualUsage?.cachedInputTokens,
        reasoningTokens: actualUsage?.reasoningTokens,
        isEstimated: actualTotalTokens === null
      }
    })
  }
}