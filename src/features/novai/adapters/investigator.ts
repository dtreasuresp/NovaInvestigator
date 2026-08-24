import type { InvestigationState } from '@/types/apps/investigator-types'

import { buildInvestigationSystemPrompt } from '@/features/novai/context-builder'

// Adapter Investigador → NovAi (mantiene vínculo actual)
export function buildInvestigatorContextPrompt(
  state: InvestigationState,
  locale: string = 'es',
  inventory?: { total: number, byStatus?: Record<string, number>, recent?: { id: string, title: string, status: string }[] }
): string {
  return buildInvestigationSystemPrompt(state, locale, inventory)
}

// Helper para validar estado mínimo (defensa, no confía solo en cliente)
export function isValidInvestigationState(state: unknown): state is InvestigationState {
  if (!state || typeof state !== 'object') return false

  const s = state as Record<string, unknown>

  return Array.isArray(s.internal) && Array.isArray(s.external)
}
