import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiContext } from './schema'
import type { TenantOverviewSummary } from './context-engine'
import { getCorePrompt, getMethodologySlice, detectMethodologyTopic } from './methodology-knowledge'
import { classifyIntent } from './intent-requirements'
import { buildInvestigatorContextPrompt, isValidInvestigationState } from './adapters/investigator'
import { buildGeneralSystemPrompt } from './adapters/general'
import { buildKanbanSystemPrompt, type KanbanContextPayload } from './adapters/kanban'
import { getNovaiModeDefinition } from './adapters/modes'
import { NovaiMemoryEngine, type NovaiMemory } from './memory-engine'
import { auditInvestigationConsistency, buildAuditContextPrompt } from './evidence-engine'
import { logger } from '@/lib/logger'

// =============================================================================
// NovAi Context Manager — Fase 2
// Context ON DEMAND: solo inyectar lo necesario.
// Heurística pura en Fase 2; interfaz preparada para híbrido LLM cheap en Fase 4.
// Objetivo: Hola → <350tk system (vs 2174 actual). D-03×A-02 → slice filtrado.
// =============================================================================

export interface ContextManagerBuildOptions {
  principal: InvestigationsPrincipal
  context: NovaiContext
  locale?: string
  overview?: TenantOverviewSummary
  memories?: NovaiMemory[]
  messages?: Array<{ role: string; content: string | null }>
}

const GREETING_RE = /^(hola|hi|hey|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|qué\s+tal|how\s+are\s+you|thanks|gracias)[\s!.,?]*$/i

function isCasualGreeting(text: string): boolean {
  const t = (text || '').trim().toLowerCase()
  if (!t) return false
  if (t.length > 40) return false
  return GREETING_RE.test(t) || (t.split(/\s+/).length <= 3 && /hola|hi|hey|gracias|thanks/.test(t))
}

function extractFactorCodes(text: string): string[] {
  const lower = (text || '').toLowerCase()
  const re = /\b([fdoa])[- ]?(\d{1,2})\b/gi
  const codes: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(lower)) !== null) {
    const code = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`
    if (!codes.includes(code)) codes.push(code)
  }
  return codes
}

function scoreMemoryRelevance(query: string, memory: NovaiMemory): number {
  if (!query) return 0
  const q = query.toLowerCase()
  const qWords = q.split(/\W+/).filter(w => w.length > 2)
  if (qWords.length === 0) return 0
  const haystack = `${memory.key} ${memory.content} ${memory.category}`.toLowerCase()
  let score = 0
  for (const w of qWords) {
    if (haystack.includes(w)) score += 1
  }
  // Bonus si el key exacto aparece
  if (q.includes(memory.key.toLowerCase())) score += 2
  return score
}

function buildFilteredInvestigationHint(
  state: InvestigationState,
  relevantCodes: string[],
  locale: string = 'es'
): string {
  if (relevantCodes.length === 0) {
    // Minimal hint — no dump completo, solo metadatos + conteos + instrucción tool
    const total = state.internal.length + state.external.length
    const title = state.metadata.title || 'Investigación'
    const org = state.metadata.organization || ''
    return `Investigación activa: "${title}" ${org ? `(${org})` : ''} — ${state.internal.length} factores internos (EFI), ${state.external.length} externos (EFE), ${total} totales. Para detalles de factores, cruces o cálculos, usa get_investigation_details con investigation_id.`
  }

  // Filtrar factores relevantes
  const relevantInternal = state.internal.filter(f => relevantCodes.includes(f.id))
  const relevantExternal = state.external.filter(f => relevantCodes.includes(f.id))
  const relevantIds = new Set([...relevantInternal.map(f => f.id), ...relevantExternal.map(f => f.id)])

  // Si no se encontró ninguno por código, fallback a minimal hint
  if (relevantIds.size === 0) {
    const title = state.metadata.title || 'Investigación'
    return `Investigación activa: "${title}" — consulta factores específicos con get_investigation_details. Códigos detectados en query sin match: ${relevantCodes.join(', ')}.`
  }

  const lines: string[] = []
  lines.push(`Contexto relevante para consulta [${relevantCodes.join(', ')}]:`)
  for (const f of [...relevantInternal, ...relevantExternal]) {
    lines.push(`- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight}, Calif: ${f.rating})${f.evidence ? ` | Evidencia: ${String(f.evidence).slice(0, 120)}` : ''}`)
  }
  // Cruces relevantes que involucran esos factores
  const relevantRelations = state.relationships.filter(r => relevantIds.has(r.internalId) || relevantIds.has(r.externalId))
  if (relevantRelations.length > 0) {
    lines.push(`Cruces relevantes:`)
    for (const r of relevantRelations.slice(0, 6)) {
      lines.push(`- ${r.internalId} × ${r.externalId} (${r.quadrant || '?'}): fuerza ${r.strength ?? '—'} ${r.justification ? `| ${String(r.justification).slice(0, 80)}` : ''}`)
    }
  }
  return lines.join('\n')
}

export class NovaiContextManager {
  /**
   * Ensambla el System Prompt bajo demanda.
   * Diferencia 11 capas conceptualmente pero solo inyecta las necesarias.
   */
  static buildSystemPrompt(options: ContextManagerBuildOptions): string {
    const { context, locale = 'es', overview, memories = [], messages, principal } = options

    // Último mensaje del usuario para clasificación
    const lastUserContent = (() => {
      if (messages && messages.length > 0) {
        const last = [...messages].reverse().find(m => m.role === 'user' && m.content)
        return String(last?.content || '').trim()
      }
      // Fallback: si no hay messages, intentar heurística por context.hint
      const hint = (context as { hint?: string }).hint
      return hint ? String(hint).slice(0, 120) : ''
    })()

    const intent = classifyIntent(lastUserContent)
    const isCasual = intent === 'GENERAL_CHAT' && isCasualGreeting(lastUserContent)
    const modeDef = getNovaiModeDefinition(context.mode)

    // 1. Core identity — siempre minimal
    const coreBlock = getCorePrompt(locale)

    // 2. Mode — minimal para casual, completo para otros
    const modeBlock = isCasual
      ? `Modo: ${modeDef.title} (respuesta breve y cordial).`
      : `\nModo de Análisis Activo: ${modeDef.title}\n${modeDef.systemInstruction}\n`

    // 3. Methodology ON DEMAND
    const methodologyTopic = isCasual ? null : detectMethodologyTopic(lastUserContent)
    // Para CALCULATE_MATRIX o VERIFY_* sin topic explícito, inyectar slice según intent
    let methodologyBlock = ''
    if (!isCasual) {
      if (methodologyTopic) {
        methodologyBlock = getMethodologySlice(methodologyTopic)
      } else if (intent === 'CALCULATE_MATRIX') {
        // Si pide cálculo sin especificar, dar pista general compacta en vez de todo el manual
        methodologyBlock = `Metodología: EFI/EFE ponderación suma 1.00, umbral 2.50; DAFO fuerza 0-3; QSPM TAS=Peso×AS.`
      } else if (intent === 'VERIFY_FACTOR' || intent === 'VERIFY_INVESTIGATION') {
        // No inyectar metodología completa, solo directiva de verificación ya está en tool directive
        methodologyBlock = ''
      }
      // GENERAL_CHAT no casual pero sin topic metodológico → no inyectar metodología
    }

    // 4. Memory retrieval ON DEMAND (relevance scoring)
    let memoryBlock = ''
    if (!isCasual && memories.length > 0) {
      let scoredObjects = memories
        .map(m => ({ m, score: scoreMemoryRelevance(lastUserContent, m) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

      // Si query menciona investigación o metodología, incluir strategic memories aunque score 0 pero solo top 1
      if (scoredObjects.length === 0 && (intent === 'VERIFY_INVESTIGATION' || intent === 'CALCULATE_MATRIX')) {
        const strategic = memories.filter(m => m.scope === 'strategic').slice(0, 1)
        for (const mem of strategic) {
          scoredObjects.push({ m: mem, score: 1 })
        }
      }

      if (scoredObjects.length > 0) {
        const topMems = scoredObjects.map(x => x.m).slice(0, 3)
        memoryBlock = NovaiMemoryEngine.formatMemoriesForPrompt(topMems as NovaiMemory[])
      } else {
        // Evitar inyectar 15 memorias irrelevantes: si no hay match, no inyectar
        memoryBlock = ''
        logger.info('ContextManager: no relevant memories for query', {
          action: 'novai.context.memory_filtered',
          details: { intent, queryPreview: lastUserContent.slice(0, 80), totalMemories: memories.length, injected: 0 }
        } as unknown as Record<string, unknown>)
      }
    } else if (isCasual) {
      memoryBlock = ''
    } else {
      // Fallback legacy: si no hay messages para scoring, mantener comportamiento previo pero limitado a 5
      memoryBlock = memories.length > 0 ? NovaiMemoryEngine.formatMemoriesForPrompt(memories.slice(0, 3)) : ''
    }

    // 5. Overview / Kanban — solo si no es casual y app requiere contexto global
    let overviewBlock = ''
    if (!isCasual && overview) {
      // Para CASUAL ya descartado; para LOOKUP y RESEARCH sí, para INVESTIGATOR con state, overview es redundante
      const isInvestigatorWithState =
        context.app === 'investigator' && isValidInvestigationState((context as { state?: unknown }).state)
      if (!isInvestigatorWithState) {
        const inv = overview.investigations
        const kan = overview.kanban
        overviewBlock = `Resumen del espacio: ${inv.total} investigaciones, ${kan.totalTasks} tareas Kanban (${kan.urgentCount} urgentes), equipos: ${overview.teams.map(t => t.name).join(', ') || '—'}.`
      }
    }

    // 6. Investigation context ON DEMAND
    let investigationBlock = ''
    let auditBlock = ''
    if (context.app === 'investigator') {
      const state = (context as { state?: unknown }).state
      if (isValidInvestigationState(state)) {
        const typedState = state as InvestigationState
        if (isCasual) {
          // Hola en investigator: NO dump, solo nota minimal para no contaminar
          investigationBlock = ''
          auditBlock = ''
        } else {
          const codes = extractFactorCodes(lastUserContent)
          // Si intent es VERIFY_FACTOR / CALCULATE / COMPARE con códigos, filtrar; si es GENERAL_CHAT sin códigos, solo hint minimal
          if (intent === 'GENERAL_CHAT' && codes.length === 0) {
            investigationBlock = buildFilteredInvestigationHint(typedState, [], locale)
            auditBlock = ''
          } else {
            // Para análisis estratégico, usar hint filtrado (evita full dump de 7k chars)
            // Si el mensaje es muy genérico (ej. "analiza la relación D-03×A-02"), filtrado reduce a 2 factores
            if (codes.length > 0) {
              investigationBlock = buildFilteredInvestigationHint(typedState, codes, locale)
            } else {
              // Sin códigos pero intent estratégico → hint con conteos, no full dump
              // Full dump solo si context explícitamente pide dump o intent es RECOMMEND con necesidad de todo el expediente
              // Para Fase 2, evitamos full dump siempre; el modelo debe usar tools para detalles
              investigationBlock = buildFilteredInvestigationHint(typedState, [], locale)
            }
            // Audit solo si hay hint con factores relevantes y no es casual
            if (codes.length > 0) {
              try {
                const audit = auditInvestigationConsistency(typedState)
                // Solo inyectar auditoría si hay findings relevantes y no es casual
                if (audit.findings.length > 0 && codes.length > 0) {
                  auditBlock = buildAuditContextPrompt(audit)
                }
              } catch {
                auditBlock = ''
              }
            }
          }
        }
      } else {
        // Investigator sin state válido → general prompt con overview si existe
        investigationBlock = ''
      }
    }

    // 7. Ensamblaje final — orden: Core → Mode → Overview/Investigation → Audit → Methodology → Memory
    // Para CASUAL: solo Core + Mode minimal
    if (isCasual) {
      return `${coreBlock}\n\n${modeBlock}`.trim()
    }

    // Para kanban — kanbanPrompt ya contiene identidad, no duplicar coreBlock
    if (context.app === 'kanban') {
      const payload = context as unknown as KanbanContextPayload
      if (payload && (payload.boardName || payload.columns?.length || payload.tasks?.length)) {
        const kanbanPrompt = buildKanbanSystemPrompt(payload, locale)
        return `${kanbanPrompt}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`.trim()
      }
      // Kanban sin payload pero con overview
      const kanbanPrompt = overview
        ? buildKanbanSystemPrompt(
            {
              boardName: 'Tablero Principal',
              columns: Object.entries(overview.kanban.columnsSummary || {}).map(([title, taskCount], idx) => ({
                id: `col-${idx}`,
                title,
                taskCount
              })),
              stats: {
                totalTasks: overview.kanban.totalTasks || 0,
                doneTasks: overview.kanban.columnsSummary?.['Hecho'] || 0,
                pendingTasks: overview.kanban.totalTasks
              }
            } as KanbanContextPayload,
            locale
          )
        : ''
      // kanbanPrompt ya trae identidad; no prepend coreBlock para evitar duplicación
      const overviewSection = overviewBlock ? `\n\n${overviewBlock}` : ''
      const kanbanSection = kanbanPrompt ? `${kanbanPrompt}${overviewSection}` : overviewBlock
      return `${kanbanSection}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`.trim()
    }

    // Para investigator con bloque ya construido
    if (context.app === 'investigator' && investigationBlock) {
      const toolDirective = !isCasual
        ? `\n• Para datos específicos del expediente (factores, cruces, cálculos) usa get_investigation_details con investigation_id. No inventes valores.`
        : ''
      // Si hay investigationBlock, usarlo como base pero sin re-inyectar full dump via buildInvestigatorContextPrompt
      // Para compatibilidad, si investigationBlock es hint minimal, no añadir audit completo
      const auditSection = auditBlock ? `\n\n${auditBlock}` : ''
      const invSection = `${investigationBlock}${toolDirective}${auditSection}`
      return `${coreBlock}\n\n${invSection}\n\n${overviewBlock}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`.trim()
    }

    // General / investigator sin state
    if (context.app === 'investigator') {
      // Sin state válido: general + overview
      const generalPrompt = buildGeneralSystemPrompt(locale, overviewBlock)
      // Pero generalPrompt ya incluye core identity; prefere core + general minimal
      // Evitar duplicar core: si generalPrompt empieza con "Eres NovAi", usar solo general
      return `${generalPrompt}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`.trim()
    }

    // General
    const generalPrompt = buildGeneralSystemPrompt(locale, overviewBlock)
    // generalPrompt ya contiene core identity; para no duplicar, usarlo tal cual + mode/memory/methodology
    // Pero para ON DEMAND, si overviewBlock está vacío y generalPrompt contiene hint vacío, generalPrompt es core-like
    // Unificar: si isCasual ya retornó, aquí no es casual → usar generalPrompt + extras
    return `${generalPrompt}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`.trim()
  }

  /**
   * Helper para diagnóstico: qué slices se inyectaron.
   */
  static getInjectedSlices(options: ContextManagerBuildOptions): {
    hasCore: boolean
    hasMode: boolean
    hasMethodology: boolean
    methodologyTopic: string | null
    hasMemory: boolean
    memoryCount: number
    hasOverview: boolean
    hasInvestigation: boolean
    hasAudit: boolean
    isCasual: boolean
    intent: string
  } {
    const lastContent =
      options.messages && options.messages.length > 0
        ? String([...options.messages].reverse().find(m => m.role === 'user')?.content || '')
        : ''
    const intent = classifyIntent(lastContent)
    const isCasual = intent === 'GENERAL_CHAT' && isCasualGreeting(lastContent)
    const topic = isCasual ? null : detectMethodologyTopic(lastContent)
    const prompt = this.buildSystemPrompt(options)
    return {
      hasCore: prompt.includes('NovAi'),
      hasMode: prompt.includes('Modo'),
      hasMethodology: Boolean(topic && prompt.includes(topic.toUpperCase())) || prompt.includes('EFI') || prompt.includes('QSPM'),
      methodologyTopic: topic,
      hasMemory: prompt.includes('MEMORIA') || prompt.includes('Memoria'),
      memoryCount: (prompt.match(/\[.*?\]/g) || []).length,
      hasOverview: prompt.includes('Resumen del espacio') || prompt.includes('Resumen Global'),
      hasInvestigation: prompt.includes('Investigación activa') || prompt.includes('DATOS DEL EXPEDIENTE'),
      hasAudit: prompt.includes('AUDITORÍA') || prompt.includes('ALERTAS'),
      isCasual,
      intent
    }
  }
}
