import type { SupabaseClient } from '@supabase/supabase-js'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { resolveEffectiveAccessSnapshot } from '@/features/access/access-service'
import { authorize } from '@/features/access/authorization-engine'
import { BillingError } from '@/features/billing/errors'
import { enforceBillingRateLimit } from '@/features/billing/rate-limit'
import { canUseFreeText, checkAiEntitlements } from '@/features/novai/entitlements'
import { getDailyQuota, consumeDailyQuota } from '@/features/novai/rate-limit'
import { logger } from '@/lib/logger'
import { type StreamCallbacks } from '@/features/novai/client/gemini-client'

import { NovaiContextEngine } from './context-engine'
import { NovaiModelRouter } from './adapters/model-router'
import { NovaiMemoryEngine, type NovaiMemory } from './memory-engine'
import { NovaiTokenBudget } from './token-budget'
import { getMethodologicalPrompt } from './methodology-knowledge'
import { listInvestigationMetadata } from '@/lib/investigations/repository'
import type { NovaiContext, AiMessage, AiQuotaInfo } from './schema'
import { NovaiAgentRuntime } from './agent-runtime'

import { executeNovaiTool, getNovaiVercelTools, NOVAI_TOOL_DECLARATIONS, NOVAI_OPENAI_TOOLS, type OpenAiToolCall } from './tools'
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
  memories?: NovaiMemory[],
  messages?: AiMessage[]
): string {
  return NovaiContextEngine.buildSystemPrompt({
    principal,
    context,
    locale,
    overview,
    memories,
    messages
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

/**
 * Ejecutor canónico de streaming NovAi (Fase D · Pipeline Convergence).
 * Delega en NovaiAgentRuntime para garantizar ejecución unificada,
 * Tool Gateway enforcement, auditoría estructurada y degradación por capabilities.
 */
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
  await NovaiAgentRuntime.executeStreaming({
    principal,
    context,
    messages,
    isFreeText,
    locale,
    onEvent: async (event) => {
      if (event.type === 'text-delta') {
        callbacks.onChunk(event.delta)
      } else if (event.type === 'tool-call') {
        callbacks.onToolCall?.({
          toolCallId: event.id,
          toolName: event.tool,
          args: event.input
        })
      } else if (event.type === 'tool-result') {
        callbacks.onToolResult?.({
          toolCallId: event.id,
          toolName: event.tool,
          result: event.result,
          isError: event.isError
        })
      } else if (event.type === 'message-complete') {
        await callbacks.onComplete(event.fullText)
      } else if (event.type === 'error') {
        callbacks.onError(new Error(event.error))
      }
    }
  })
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

  await NovaiAgentRuntime.executeStreaming({
    principal,
    context: { app: 'general', hint: systemPrompt },
    messages,
    isFreeText: true,
    locale: 'es',
    onEvent: async (event) => {
      if (event.type === 'text-delta') {
        accumulatedText += event.delta
      } else if (event.type === 'message-complete') {
        if (event.fullText) {
          accumulatedText = event.fullText
        }
      }
    }
  })

  if (!accumulatedText.trim()) {
    throw new Error('No fue posible obtener respuesta de los proveedores de IA disponibles.')
  }

  return accumulatedText
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

  const systemPrompt = `Eres el Consultor Metodológico Senior y Auditor Estratégico integrado en NovaResearch.
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

  const systemPrompt = `Eres el Consultor Estratégico Senior integrado en NovaResearch.
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

