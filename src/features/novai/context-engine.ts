import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiContext, AiMessage } from './schema'
import { NovaiContextManager } from './context-manager'
import { logger } from '@/lib/logger'

import type { NovaiMemory } from './memory-engine'

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
  messages?: AiMessage[] // Fase 2: necesario para intent classification ON DEMAND
}

/**
 * NovAi Context Engine:
 * Fase 2 — delega en NovaiContextManager para Context ON DEMAND.
 * Mantiene la interfaz pública estable; internamente ya no inyecta todo incondicionalmente.
 */
export class NovaiContextEngine {
  /**
   * Ensambla el System Prompt gobernado (Fase 2: solo slices necesarios).
   * @deprecated Internamente delega en NovaiContextManager. Usar NovaiContextManager directamente para diagnóstico.
   */
  static buildSystemPrompt(options: NovaiContextBuildOptions): string {
    try {
      return NovaiContextManager.buildSystemPrompt(options as unknown as Parameters<typeof NovaiContextManager.buildSystemPrompt>[0])
    } catch (err) {
      logger.warn('ContextManager failed, fallback to legacy build (fail-open)', {
        action: 'novai.context.fallback',
        details: { error: err instanceof Error ? err.message : String(err) }
      })
      // Fallback minimal legacy: core + mode only to avoid mega prompt on error
      const locale = options.locale || 'es'
      const mode = options.context.mode || 'CHAT'
      return `Eres NovAi, asistente integrado en NovaResearch. Modo ${mode}. Locale ${locale}.`
    }
  }
}
