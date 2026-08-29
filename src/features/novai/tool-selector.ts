import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiContext } from './schema'
import {
  classifyIntent,
  getIntentContract,
  detectExternalVerificationRequest,
  isCasualGreetingText,
  type IntentType,
  type IntentContract
} from './intent-requirements'
import { getNovaiModeDefinition } from './adapters/modes'
import { NOVAI_ALL_MODULAR_TOOLS, type ToolMetadata } from './tools'

// =============================================================================
// NovAi Tool Selector — Fase 3
// Exposición dinámica de herramientas según intent, modo, permisos y contexto.
// Objetivo: Hola → 0 tools; Investigación → 4-6 tools; Estrategia → 7-10 tools.
// =============================================================================

export interface ToolSelectionContext {
  principal: InvestigationsPrincipal
  context: NovaiContext
  messages: Array<{ role: string; content: string | null }>
  locale?: string
  explicitIntent?: string // override para testing
  externalVerificationRequested?: boolean
}

export interface ToolSelectionResult {
  selectedTools: string[]
  excludedTools: string[]
  intent: string
  mode: string
  reason: string
  requiredTools: string[]
  optionalTools: string[]
  forbiddenTools: string[]
  toolCount: number
  tokenSavings: number // tokens ahorrados vs 22 tools
}

/**
 * Mapa de herramientas por categoría para selección contextual
 */
const TOOLS_BY_CATEGORY = {
  // Base / Metadata del tenant (solo cuando se solicita información general o del espacio)
  base: [
    'list_investigations',
    'get_investigations_stats',
    'get_tenant_billing_and_quota_info',
    'list_kanban_tasks',
    'get_kanban_board_summary',
    'list_workspace_members_and_teams'
  ],
  // Investigación activa - necesita expediente
  investigation: [
    'get_active_investigation',
    'get_investigation_details',
    'get_investigation_documents',
    'search_evidence',
    'get_factor_evidence',
    'verify_claim'
  ],
  // Metodología y auditoría
  methodology: [
    'audit_factor',
    'audit_relationship',
    'find_contradictions',
    'validate_methodology',
    'calculate_matrix'
  ],
  // Estrategia y red-team
  strategy: [
    'trace_strategy',
    'compare_strategies',
    'challenge_analysis'
  ],
  // Memoria estratégica (medium risk)
  memory: [
    'record_strategic_memory'
  ],
  // Investigación web externa (EXTERNAL_EVIDENCE)
  web: [
    'web_research',
    'web_extract'
  ]
} as const

type ToolCategory = keyof typeof TOOLS_BY_CATEGORY

// Mapeo modo → categorías permitidas (restringe lo que el modo autoriza)
const MODE_ALLOWED_CATEGORIES: Record<string, ToolCategory[]> = {
  CHAT: ['base'],
  CONSULTANT: ['base', 'investigation', 'methodology', 'strategy', 'web', 'memory'],
  ANALYST: ['base', 'investigation', 'methodology', 'web'],
  RESEARCHER: ['base', 'investigation', 'web'],
  DEVELOPER: ['base'],
  ARCHITECT: ['base', 'investigation', 'methodology', 'strategy'],
  OPERATOR: ['base']
}

// Herramientas de riesgo medium/high que requieren permisos especiales
const HIGH_RISK_TOOLS = ['record_strategic_memory'] as const
type HighRiskTool = typeof HIGH_RISK_TOOLS[number]

/**
 * Verifica si el usuario tiene permiso para una herramienta de alto riesgo según principal real
 */
function canUseHighRiskTool(principal: InvestigationsPrincipal, tool: HighRiskTool): boolean {
  if (tool === 'record_strategic_memory') {
    // Si principal tiene tenantId y userId válidos, y no es guest sin permisos
    if (!principal || !principal.tenantId || !principal.userId) return false
    return true
  }
  return true
}

const TOOL_CAPABILITY_REQUIREMENTS: Record<string, string[]> = {
  calculate_matrix: ['investigations:calculate', 'investigations:update', 'investigations:admin'],
  audit_relationship: ['investigations:audit', 'investigations:admin'],
  find_contradictions: ['investigations:audit', 'investigations:admin'],
  record_strategic_memory: ['memory:write', 'investigations:update', 'investigations:admin']
}

function hasPrincipalCapability(principal: InvestigationsPrincipal, requiredCaps: string[]): boolean {
  const p = principal as unknown as { isSuperAdmin?: boolean; role?: string; permissions?: string[] }
  if (p.isSuperAdmin || p.role === 'admin' || p.role === 'owner') return true
  if (Array.isArray(p.permissions) && p.permissions.length > 0) {
    return p.permissions.some(cap => requiredCaps.includes(cap) || cap === 'investigations:*' || cap === '*:*')
  }
  return true
}

/**
 * Filtra herramientas por permisos del tenant/usuario
 */
function filterByPermissions(
  tools: string[],
  principal: InvestigationsPrincipal,
  _mode: string
): string[] {
  if (!principal || !principal.tenantId) return []

  return tools.filter(tool => {
    const toolMeta = NOVAI_ALL_MODULAR_TOOLS[tool]?.metadata
    if (!toolMeta) return false

    if (HIGH_RISK_TOOLS.includes(tool as HighRiskTool)) {
      if (!canUseHighRiskTool(principal, tool as HighRiskTool)) return false
    }

    const requiredCaps = TOOL_CAPABILITY_REQUIREMENTS[tool]
    if (requiredCaps && !hasPrincipalCapability(principal, requiredCaps)) {
      return false
    }

    return true
  })
}

/**
 * NovAi Tool Selector — Selección dinámica de herramientas
 */
export class NovaiToolSelector {
  /**
   * Selecciona herramientas dinámicamente según intent, modo, contexto y permisos
   */
  static selectTools(options: ToolSelectionContext): ToolSelectionResult {
    const { principal, context, messages, explicitIntent, externalVerificationRequested } = options
    const mode = context.mode || 'CHAT'

    // 1. Clasificar intent
    const lastUserMsgForIntent = [...messages].reverse().find(m => m.role === 'user' && m.content)?.content || ''
    const isCasual = isCasualGreetingText(lastUserMsgForIntent)
    const isExternal = externalVerificationRequested ?? detectExternalVerificationRequest(lastUserMsgForIntent)
    const intent: IntentType = isCasual
      ? 'GENERAL_CHAT'
      : ((explicitIntent as IntentType) || classifyIntent(lastUserMsgForIntent))

    // 2. Obtener contrato canónico para el intent
    const contract = getIntentContract(intent, { externalVerificationRequested: isExternal })

    // Fix3: template greeting — si el mensaje es "Hola... + pregunta de verificación", no tratar como GENERAL_CHAT
    const greetingPrefixRe = /^(hola[,\s!]*|buenos\s+d[íi]as[,\s!]*|buenas\s+tardes[,\s!]*|buenas\s+noches[,\s!]*|hey[,\s!]*|hi[,\s!]*)+/i
    const lowerMsg = lastUserMsgForIntent.trim().toLowerCase()
    const strippedMsg = lowerMsg.replace(greetingPrefixRe, '').trim()
    const effectiveIsCasual = isCasual && strippedMsg.length < 20
    // 3. Si es saludo casual o GENERAL_CHAT puro: estrictamente 0 herramientas
    if (effectiveIsCasual || intent === 'GENERAL_CHAT') {
      const allToolsCount = Object.keys(NOVAI_ALL_MODULAR_TOOLS).length
      return {
        selectedTools: [],
        excludedTools: Object.keys(NOVAI_ALL_MODULAR_TOOLS),
        intent: 'GENERAL_CHAT',
        mode,
        reason: 'Casual greeting or general chat without factual requirement -> 0 tools',
        requiredTools: [],
        optionalTools: [],
        forbiddenTools: ['*'],
        toolCount: 0,
        tokenSavings: allToolsCount * 130
      }
    }

    // Fix3: Degradar VERIFY_INVESTIGATION si no hay investigationId/state en modo CHAT
    // No exigir verify_claim/calculate_matrix que requieren investigation_id válido
    const hasInvestigationContext = Boolean(
      (context as { investigationId?: string }).investigationId ||
      (context as { state?: unknown }).state ||
      (context.app === 'investigator' && context.state)
    )
    let effectiveContract = contract
    let effectiveIntent = intent
    if (intent === 'VERIFY_INVESTIGATION' && mode === 'CHAT' && !hasInvestigationContext) {
      // Degradar a VERIFY_DATA-like pero permitiendo web_research: buscar contexto primero
      effectiveIntent = 'VERIFY_INVESTIGATION'
      effectiveContract = getIntentContract('VERIFY_INVESTIGATION', { externalVerificationRequested: isExternal })
      // Filtrar requiredTools que necesitan investigation_id si no hay contexto
      const filteredRequired = effectiveContract.requiredTools.filter(t => {
        if ((t === 'verify_claim' || t === 'calculate_matrix' || t === 'get_investigation_details') && !hasInvestigationContext) return false
        return true
      })
      effectiveContract = { ...effectiveContract, requiredTools: filteredRequired.length > 0 ? filteredRequired : ['get_active_investigation', 'web_research'] }
    }

    // 4. Determinar herramientas candidatas a partir del contrato de intent (effectiveContract si degradado)
    let candidateTools = new Set<string>()

    // Siempre incluir requiredTools del effectiveContract
    for (const tool of effectiveContract.requiredTools) {
      candidateTools.add(tool)
    }

    // Incluir allowedTools permitidas por el modo
    const allowedCategories = MODE_ALLOWED_CATEGORIES[mode] ?? ['base']
    for (const tool of effectiveContract.allowedTools) {
      const toolCategory = this.getToolCategory(tool)
      if (toolCategory !== 'unknown' && allowedCategories.includes(toolCategory)) {
        candidateTools.add(tool)
      }
    }

    // 5. Excluir herramientas prohibidas por el contrato
    const forbiddenSet = new Set(effectiveContract.forbiddenTools)
    let finalTools = Array.from(candidateTools).filter(tool => {
      if (effectiveContract.requiredTools.includes(tool)) return true
      if (forbiddenSet.has('*') || forbiddenSet.has(tool)) return false
      return true
    })

    // 6. Filtrar por permisos reales con el principal autenticado
    finalTools = filterByPermissions(finalTools, principal, mode)

    // 7. Ordenar: requiredTools primero, luego orden lógico
    const categoryOrder: ToolCategory[] = ['investigation', 'methodology', 'strategy', 'web', 'memory', 'base']
    finalTools.sort((a, b) => {
      const aReq = effectiveContract.requiredTools.includes(a)
      const bReq = effectiveContract.requiredTools.includes(b)
      if (aReq && !bReq) return -1
      if (!aReq && bReq) return 1

      const aCat = this.getToolCategory(a)
      const bCat = this.getToolCategory(b)
      const aIdx = aCat !== 'unknown' ? categoryOrder.indexOf(aCat) : 99
      const bIdx = bCat !== 'unknown' ? categoryOrder.indexOf(bCat) : 99
      if (aIdx !== bIdx) return aIdx - bIdx

      return a.localeCompare(b)
    })

    const allToolsCount = Object.keys(NOVAI_ALL_MODULAR_TOOLS).length
    const tokenSavings = (allToolsCount - finalTools.length) * 130
    const optionalTools = finalTools.filter(t => !effectiveContract.requiredTools.includes(t))
    const excludedTools = Object.keys(NOVAI_ALL_MODULAR_TOOLS).filter(t => !finalTools.includes(t))

    return {
      selectedTools: finalTools,
      excludedTools,
      intent: effectiveIntent,
      mode,
      reason: `intent=${effectiveIntent}, mode=${mode}, external=${isExternal}${effectiveIntent !== intent ? ` (degraded from ${intent} due to missing investigation context)` : ''}`,
      requiredTools: effectiveContract.requiredTools,
      optionalTools,
      forbiddenTools: effectiveContract.forbiddenTools,
      toolCount: finalTools.length,
      tokenSavings
    }
  }

  /**
   * Obtiene la categoría de una herramienta
   */
  static getToolCategory(tool: string): ToolCategory | 'unknown' {
    for (const cat of ['base', 'investigation', 'methodology', 'strategy', 'memory', 'web'] as ToolCategory[]) {
      const tools = TOOLS_BY_CATEGORY[cat] as readonly string[]
      if (tools.includes(tool)) return cat
    }
    return 'unknown'
  }

  /**
   * Obtiene herramientas disponibles para un modo (para debugging/UI)
   */
  static getModeTools(mode: string): string[] {
    const categories = MODE_ALLOWED_CATEGORIES[mode] ?? ['base']
    const tools = new Set<string>()
    for (const cat of categories) {
      const catTools = TOOLS_BY_CATEGORY[cat as ToolCategory]
      if (catTools) {
        for (const tool of catTools) {
          tools.add(tool)
        }
      }
    }
    return Array.from(tools)
  }

  /**
   * Obtiene todas las herramientas disponibles con metadatos
   */
  static getAllToolsMeta(): Array<{ name: string; metadata: ToolMetadata }> {
    return Object.entries(NOVAI_ALL_MODULAR_TOOLS).map(([name, tool]) => ({
      name,
      metadata: tool.metadata
    }))
  }

  /**
   * Helper estático para obtener vercelTools filtrados
   */
  static getSelectedVercelTools(
    principal: InvestigationsPrincipal,
    context: NovaiContext,
    messages: Array<{ role: string; content: string | null }>,
    explicitIntent?: string,
    externalVerificationRequested?: boolean
  ): Record<string, any> {
    const selection = NovaiToolSelector.selectTools({
      principal,
      context,
      messages,
      explicitIntent,
      externalVerificationRequested
    })

    const vercelTools: Record<string, any> = {}
    for (const toolName of selection.selectedTools) {
      const tool = NOVAI_ALL_MODULAR_TOOLS[toolName]
      if (tool) {
        if (typeof tool.toVercelTool === 'function') {
          vercelTools[toolName] = tool.toVercelTool(principal)
        } else if (typeof tool.toVercelAiTool === 'function') {
          vercelTools[toolName] = tool.toVercelAiTool(principal)
        }
      }
    }
    return vercelTools
  }
}

/**
 * Helper para obtener herramientas filtradas para Vercel AI SDK
 * Usa el selector y luego adapta a vercelTools
 */
export function getSelectedVercelTools(
  principal: InvestigationsPrincipal,
  context: NovaiContext,
  messages: Array<{ role: string; content: string | null }>,
  explicitIntent?: string,
  externalVerificationRequested?: boolean
): Record<string, any> {
  return NovaiToolSelector.getSelectedVercelTools(principal, context, messages, explicitIntent, externalVerificationRequested)
}
