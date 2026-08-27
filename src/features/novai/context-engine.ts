import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiContext } from './schema'
import { getMethodologicalPrompt } from './methodology-knowledge'
import { auditInvestigationConsistency, buildAuditContextPrompt } from './evidence-engine'
import { buildInvestigatorContextPrompt, isValidInvestigationState } from './adapters/investigator'
import { buildGeneralSystemPrompt } from './adapters/general'
import { buildKanbanSystemPrompt, type KanbanContextPayload } from './adapters/kanban'

import { getNovaiModeDefinition } from './adapters/modes'
import { NovaiMemoryEngine, type NovaiMemory } from './memory-engine'

export interface TenantOverviewSummary {
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

export interface NovaiContextBuildOptions {
  principal: InvestigationsPrincipal
  context: NovaiContext
  locale?: string
  overview?: TenantOverviewSummary
  memories?: NovaiMemory[]
}

/**
 * NovAi Context Engine:
 * Capa centralizada encargada de ensamblar y gobernar el contexto semántico,
 * metodológico, de seguridad y de auditoría para cada invocación del LLM.
 */
export class NovaiContextEngine {
  /**
   * Ensambla el System Prompt gobernado y blindado contra sycophancy y alucinaciones.
   */
  static buildSystemPrompt(options: NovaiContextBuildOptions): string {
    const { context, locale = 'es', overview, memories = [] } = options
    const methodologyBlock = getMethodologicalPrompt()
    const modeDef = getNovaiModeDefinition(context.mode)
    const modeBlock = `\nModo de Análisis Activo: ${modeDef.title}\n${modeDef.systemInstruction}\n`
    const memoryBlock = NovaiMemoryEngine.formatMemoriesForPrompt(memories)

    const invOverview = overview?.investigations
    const kanbanOverview = overview?.kanban

    const overviewHint = overview
      ? `
  Resumen Global del Espacio de Trabajo:
  - Investigaciones estratégicas registradas: ${invOverview?.total ?? 0}
  - Tareas en tableros Kanban: ${kanbanOverview?.totalTasks ?? 0} (Urgentes/Altas: ${kanbanOverview?.urgentCount ?? 0})
  - Equipos de trabajo: ${overview.teams.map(t => t.name).join(', ') || 'Espacio General'}
  (Nota: Cada investigación es un expediente independiente. Para consultar factores, matrices o notas de una investigación específica, invoca la herramienta get_investigation_details o list_investigations).
  `
      : ''


    switch (context.app) {
      case 'investigator': {
        const state = (context as { state?: unknown }).state
        const inventory = (context as { inventory?: { total: number; byStatus?: Record<string, number>; recent?: { id: string; title: string; status: string }[] } }).inventory || invOverview

        if (isValidInvestigationState(state)) {
          const typedState = state as InvestigationState
          const basePrompt = buildInvestigatorContextPrompt(typedState, locale, inventory)
          const auditSummary = auditInvestigationConsistency(typedState)
          const auditPrompt = buildAuditContextPrompt(auditSummary)

          const toolUseDirective = `
  • USO DE HERRAMIENTAS Y VERACIDAD DE DATOS — PRINCIPIO VERIFIABLE > TRAZABLE > INTERPRETABLE > GENERATIVE (§5):
  1. Para preguntas sobre cruces DAFO, factores, ponderaciones o evidencias, consulta el expediente con get_investigation_details.
  2. Para preguntas que pidan verificar datos, nivel de confianza, valores de investigación o que mencionen "web/fuentes confiables/externas", encadena OBLIGATORIAMENTE: get_active_investigation → get_investigation_details → calculate_matrix(ALL/QSPM) → web_research (si pide web) → verify_claim. Si no tienes ToolResultEvent para un cálculo/fuente, responde INSUFFICIENT_EVIDENCE, no inventes 0.xx.
  3. REGLA DE ORO (§50): Si no puedes demostrar de dónde salió un dato (sin ToolResultEvent/SourceEvent/CalculationEvent), no puedes presentarlo como dato calculado/verificado. Degrada a INFERENCE o declara INSUFFICIENT_EVIDENCE.
  4. PROHIBICIÓN RETROSPECTIVA (§15): Nunca fabriques dimensiones/pesos/fórmulas a posteriori para justificar un score previo (ej. 0.68-0.74, 0.8625). Si te preguntan de dónde salió un número y no existe CalculationEvent, di: "Ese valor no fue calculado de forma verificable con metodología registrada".
  5. Presenta la evidencia de forma fluida y natural (ej. "En el expediente, el Factor D-03 cuenta con peso 0.10, calificación 2 y la evidencia documentada señala que...").
  6. NUNCA uses la frase técnica "Según get_investigation_details:" ni expongas nombres de funciones o comandos técnicos ante el usuario.
  7. SCORE TAVILY = relevance ranking, NO credibilidad. No conviertas search score en puntaje de credibilidad sin metodología versionada. Si te piden credibilidad cuantitativa, explica cualitativamente o declara INSUFFICIENT_EVIDENCE.`

          return `${basePrompt}\n\n${auditPrompt}\n\n${toolUseDirective}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`
        }

        return `${buildGeneralSystemPrompt(locale, overviewHint)}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`
      }

      case 'kanban': {
        const payload = context as unknown as KanbanContextPayload

        if (payload && (payload.boardName || payload.columns?.length || payload.tasks?.length)) {
          return `${buildKanbanSystemPrompt(payload, locale)}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`
        }

        const kanbanPayload: KanbanContextPayload = {
          boardName: 'Tablero Principal de Proyectos',
          columns: Object.entries(kanbanOverview?.columnsSummary || {}).map(([title, taskCount], idx) => ({
            id: `col-${idx}`,
            title,
            taskCount
          })),
          stats: {
            totalTasks: kanbanOverview?.totalTasks || 0,
            doneTasks: kanbanOverview?.columnsSummary?.['Hecho'] || kanbanOverview?.columnsSummary?.['Done'] || 0,
            pendingTasks: (kanbanOverview?.totalTasks || 0) - (kanbanOverview?.columnsSummary?.['Hecho'] || kanbanOverview?.columnsSummary?.['Done'] || 0)
          }
        }

        return `${buildKanbanSystemPrompt(kanbanPayload, locale)}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`
      }

      case 'general':

      default: {
        return `${buildGeneralSystemPrompt(locale, overviewHint)}\n\n${modeBlock}\n\n${memoryBlock}\n\n${methodologyBlock}`
      }
    }
  }
}
