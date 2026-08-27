import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiContext } from './schema'
import { classifyIntent, getRequiredToolsForIntent, type IntentType } from './intent-requirements'
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
}

export interface ToolSelectionResult {
  selectedTools: string[]
  excludedTools: string[]
  intent: string
  mode: string
  reason: string
  requiredTools: string[]
  optionalTools: string[]
  toolCount: number
  tokenSavings: number // tokens ahorrados vs 22 tools
}

/**
 * Mapa de herramientas por categoría para selección contextual
 */
const TOOLS_BY_CATEGORY = {
  // Base: siempre disponibles si modo lo permite
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

// Mapeo intent → categorías de herramientas recomendadas
const INTENT_TOOL_CATEGORIES: Record<string, ToolCategory[]> = {
  VERIFY_DATA: ['base', 'investigation'],
  VERIFY_INVESTIGATION: ['base', 'investigation', 'methodology'],
  VERIFY_FACTOR: ['base', 'investigation', 'methodology'],
  CALCULATE_MATRIX: ['base', 'investigation', 'methodology'],
  SEARCH_WEB: ['base', 'web'],
  COMPARE_SCENARIOS: ['base', 'investigation', 'methodology', 'strategy'],
  RECOMMEND: ['base', 'investigation', 'methodology', 'strategy'],
  GENERAL_CHAT: ['base']
}

// Mapeo modo → categorías permitidas (restringe lo que el modo autoriza)
const MODE_ALLOWED_CATEGORIES: Record<string, ToolCategory[]> = {
  CHAT: ['base'],
  CONSULTANT: ['base', 'investigation', 'methodology', 'strategy', 'web'],
  ANALYST: ['base', 'investigation', 'methodology'],
  RESEARCHER: ['base', 'investigation', 'web'],
  DEVELOPER: ['base'],
  ARCHITECT: ['base'],
  OPERATOR: ['base']
}

// Herramientas de riesgo medium/high que requieren permisos especiales
const HIGH_RISK_TOOLS = ['record_strategic_memory'] as const
type HighRiskTool = typeof HIGH_RISK_TOOLS[number]

/**
 * Verifica si el usuario tiene permiso para una herramienta de alto riesgo
 */
function canUseHighRiskTool(_principal: InvestigationsPrincipal, tool: HighRiskTool): boolean {
  if (tool === 'record_strategic_memory') {
    // Permitido si tiene capacidad de memory/strategic o es owner
    // En Fase 3 simplificamos: permitir si modo CONSULTANT/RESEARCHER/ANALYST
    return true // Fase 3: permitir por ahora; Fase 4 hará RBAC granular
  }
  return true
}

/**
 * Filtra herramientas por permisos del tenant/usuario
 */
function filterByPermissions(
  tools: string[],
  _principal: InvestigationsPrincipal,
  mode: string
): string[] {
  return tools.filter(tool => {
    const toolMeta = NOVAI_ALL_MODULAR_TOOLS[tool]?.metadata
    if (!toolMeta) return true // herramienta desconocida → permitir por seguridad
    
    // High risk tools requieren permiso explícito
    if (HIGH_RISK_TOOLS.includes(tool as HighRiskTool)) {
      return canUseHighRiskTool({} as InvestigationsPrincipal, tool as HighRiskTool)
    }
    
    return true
  })
}

/**
 * Obtiene herramientas base del modo actual
 */
function getModeBaseTools(mode: string): string[] {
  const modeDef = getNovaiModeDefinition(mode)
  return modeDef?.allowedTools ?? []
}

/**
 * NovAi Tool Selector — Selección dinámica de herramientas
 */
export class NovaiToolSelector {
  /**
   * Selecciona herramientas dinámicamente según intent, modo, contexto y permisos
   */
  static selectTools(options: ToolSelectionContext): ToolSelectionResult {
    const { principal, context, messages, explicitIntent } = options
    const mode = context.mode || 'CHAT'
    
    // 1. Clasificar intent (usar explícito o inferir del último mensaje del usuario)
    const lastUserMsgForIntent = [...messages].reverse().find(m => m.role === 'user' && m.content)?.content || ''
    const intent = (explicitIntent as IntentType) || classifyIntent(lastUserMsgForIntent)
    
    // 2. Herramientas requeridas por intent (nunca se excluyen)
    const requiredTools = getRequiredToolsForIntent(intent as IntentType)
    
    // 3. Herramientas base del modo (lo que el modo permite)
    const modeTools = getModeBaseTools(mode)
    
    // 4. Categorías permitidas por modo
    const allowedCategories = MODE_ALLOWED_CATEGORIES[mode] ?? ['base']
    
    // 5. Categorías recomendadas por intent
    const intentCategories = INTENT_TOOL_CATEGORIES[intent] ?? ['base']
    
    // 6. Intersección: categorías que son permitidas por modo Y recomendadas por intent
    const effectiveCategories = intentCategories.filter(c => allowedCategories.includes(c))
    
    // 7. Herramientas de esas categorías
    let candidateTools = new Set<string>()
    for (const cat of effectiveCategories) {
      for (const tool of TOOLS_BY_CATEGORY[cat]) {
        candidateTools.add(tool)
      }
    }
    
    // 8. Añadir siempre herramientas requeridas (incluso si fuera de categorías)
    for (const tool of requiredTools) {
      candidateTools.add(tool)
    }
    
    // 9. Intersección con herramientas permitidas por el modo (modo es autoridad final)
    // Pero mantener requiredTools aunque modo no las liste (epistemic requirement)
    const modeToolSet = new Set(modeTools)
    let finalTools = Array.from(candidateTools).filter(tool => 
      modeToolSet.has(tool) || requiredTools.includes(tool)
    )
    
    // 10. Filtrar por permisos/RLS
    finalTools = filterByPermissions(finalTools, {} as InvestigationsPrincipal, mode)
    
    // 11. Si no hay herramientas en modo casual (GENERAL_CHAT sin investigación), retornar vacío
    const lastUserMsgForCasual = [...messages].reverse().find(m => m.role === 'user' && m.content)?.content || ''
    const isCasual = classifyIntent(lastUserMsgForCasual) === 'GENERAL_CHAT' && 
      /^(hola|hi|hey|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|qué\s+tal|how\s+are\s+you|thanks|gracias)[\s!.,?]*$/i.test(lastUserMsgForCasual.trim())
    
    if (isCasual && intent === 'GENERAL_CHAT') {
      finalTools = []
    }
    
    // 12. Contexto de investigación: si hay investigation_id o state, asegurar herramientas de investigación
    const contextApp = context.app
    const hasInvestigationId = contextApp === 'investigator' && (context as { investigationId?: string }).investigationId
    const hasInvestigationState = contextApp === 'investigator' && (context as { state?: unknown }).state
    
    const hasInvestigationContext = hasInvestigationId || hasInvestigationState ||
      (contextApp === 'general' && context.mode === 'CONSULTANT')
    
    if (hasInvestigationContext && !finalTools.some(t => (TOOLS_BY_CATEGORY.investigation as readonly string[]).includes(t))) {
      for (const tool of TOOLS_BY_CATEGORY.investigation) {
        if (!finalTools.includes(tool)) finalTools.push(tool)
      }
    }
    
    // 13. Ordenar: requiredTools primero, luego por categoría lógica
    const categoryOrder: ToolCategory[] = ['base', 'investigation', 'methodology', 'strategy', 'memory', 'web']
    finalTools.sort((a, b) => {
      const aReq = requiredTools.includes(a)
      const bReq = requiredTools.includes(b)
      if (aReq && !bReq) return -1
      if (!aReq && bReq) return 1
      
      // Ordenar por categoría
      const aCat = this.getToolCategory(a)
      const bCat = this.getToolCategory(b)
      const aIdx = aCat !== 'unknown' ? categoryOrder.indexOf(aCat) : 99
      const bIdx = bCat !== 'unknown' ? categoryOrder.indexOf(bCat) : 99
      if (aIdx !== bIdx) return aIdx - bIdx
      
      return a.localeCompare(b)
    })
    
    // 14. Calcular token savings (estimación: ~130 tokens por tool definition)
    const allToolsCount = Object.keys(NOVAI_ALL_MODULAR_TOOLS).length
    const tokenSavings = (allToolsCount - finalTools.length) * 130
    
    const optionalTools = finalTools.filter(t => !requiredTools.includes(t))
    const excludedTools = Object.keys(NOVAI_ALL_MODULAR_TOOLS).filter(t => !finalTools.includes(t))
    
    return {
      selectedTools: finalTools,
      excludedTools,
      intent: intent,
      mode,
      reason: `intent=${intent}, mode=${mode}, categories=${effectiveCategories.join(',')}`,
      requiredTools,
      optionalTools,
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
    explicitIntent?: string
  ): Record<string, any> {
    const selection = NovaiToolSelector.selectTools({
      principal,
      context,
      messages,
      explicitIntent
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
  explicitIntent?: string
): Record<string, any> {
  return NovaiToolSelector.getSelectedVercelTools(principal, context, messages, explicitIntent)
}