import type { NovaiMode, AiMessage } from '../schema'
import { getNovaiModeDefinition, type NovaiModeDefinition } from './modes'
import { requiredCapabilitiesForCategory, type RequiredCapabilities, type ProviderId } from '../capabilities'

export type ModelTier = 'FREE' | 'LOW_COST' | 'PREMIUM' | 'FALLBACK'

export interface ModelRouteDecision {
  mode: NovaiMode
  modeDefinition: NovaiModeDefinition
  tier: ModelTier
  category: 'fast' | 'reasoning' | 'coding' | 'balanced'
  requiredCapabilities: RequiredCapabilities
  recommendedOpenRouterModel: string
  preferredProvider: ProviderId
  rationale: string
}

export class NovaiModelRouter {
  /**
   * Clasifica la intención del usuario y determina el modo operativo más adecuado.
   */
  static classifyTaskIntent(messages: AiMessage[], contextApp?: 'investigator' | 'kanban' | 'general', explicitMode?: NovaiMode): NovaiMode {
    if (explicitMode) {
      return explicitMode
    }

    // Ventana deslizante: analiza los últimos 4 mensajes del usuario para mantener el hilo temático (Sticky Mode)
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-4)
      .map(m => m.content?.toLowerCase() || '')
      .join(' ')

    // 1. Detección de Código / Developer
    const devKeywords = ['código', 'codigo', 'function', 'typescript', 'react', 'sql', 'route', 'endpoint', 'bug', 'componente', 'api', 'schema', 'zod', 'error ts', 'console.log']

    if (devKeywords.some(kw => recentUserMessages.includes(kw))) {
      return 'DEVELOPER'
    }

    // 2. Detección de Arquitectura y Seguridad
    const archKeywords = ['arquitectura', 'seguridad', 'rbac', 'rebac', 'multi-tenant', 'stripe', 'webhook', 'rls', 'policy', 'entitlement', 'database schema']

    if (archKeywords.some(kw => recentUserMessages.includes(kw))) {
      return 'ARCHITECT'
    }

    // 3. Detección de Consultoría Estratégica (EFI/EFE/DAFO/QSPM/CAME)
    const consultantKeywords = ['dafo', 'foda', 'efi', 'efe', 'qspm', 'came', 'estrategia', 'cruce', 'ponderación', 'ponderacion', 'diagnóstico', 'diagnostico', 'fuerza 0', 'fuerza 3', 'cuadrante', 'd-0', 'f-0', 'o-0', 'a-0', 'amenaza', 'fortaleza', 'debilidad', 'oportunidad']

    if (consultantKeywords.some(kw => recentUserMessages.includes(kw)) || contextApp === 'investigator') {
      return 'CONSULTANT'
    }

    // 4. Detección de Análisis de Datos / Métricas
    const analystKeywords = ['kpi', 'métrica', 'metrica', 'porcentaje', 'tasa', 'gráfico', 'grafico', 'dashboard', 'estadística', 'estadistica', 'cobertura', 'ranking']

    if (analystKeywords.some(kw => recentUserMessages.includes(kw))) {
      return 'ANALYST'
    }

    // 5. Detección de Investigación y Evidencias
    const researcherKeywords = ['evidencia', 'fuente', 'pestel', 'porter', 'investigación', 'investigacion', 'benchmark', 'estudio de mercado', 'competidores']

    if (researcherKeywords.some(kw => recentUserMessages.includes(kw))) {
      return 'RESEARCHER'
    }

    // 6. Detección de Tareas y Kanban / Operador
    const operatorKeywords = ['kanban', 'tarea', 'asignar', 'columna', 'sprint', 'mover tarea', 'backlog', 'urgente', 'deadline']

    if (operatorKeywords.some(kw => recentUserMessages.includes(kw)) || contextApp === 'kanban') {
      return 'OPERATOR'
    }

    return 'CHAT'
  }

  /**
   * Resuelve el modelo óptimo, proveedor y tier para la ejecución de la tarea.
   */
  static routeTask({
    messages,
    contextApp = 'general',
    explicitMode,
    isPremium = false
  }: {
    messages: AiMessage[]
    contextApp?: 'investigator' | 'kanban' | 'general'
    explicitMode?: NovaiMode
    isPremium?: boolean
  }): ModelRouteDecision {
    const mode = this.classifyTaskIntent(messages, contextApp, explicitMode)
    const modeDef = getNovaiModeDefinition(mode)
    const category = modeDef.preferredModelCategory
    const requiredCapabilities = requiredCapabilitiesForCategory(category)
    const tier: ModelTier = isPremium ? 'PREMIUM' : 'FREE'

    let recommendedOpenRouterModel = 'openrouter/free'
    let preferredProvider: ModelRouteDecision['preferredProvider'] = process.env.OPENROUTER_API_KEY
      ? 'openrouter'
      : (process.env.GEMINI_API_KEY ? 'gemini' : 'opencode-zen')
    let rationale = `Modo ${mode} asignado.`

    switch (category) {
      case 'coding':
        // DEVELOPER — Mejor coding con tool calling
        recommendedOpenRouterModel = 'qwen/qwen-2.5-72b-instruct:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GEMINI_API_KEY ? 'gemini' : 'opencode-zen')
        rationale = 'Desarrollo técnico — Qwen 2.5 72B / Gemini 2.0 Flash con tool calling nativo.'
        break

      case 'reasoning':
        // CONSULTANT, ARCHITECT — Razonamiento profundo y auditoría
        recommendedOpenRouterModel = 'nvidia/nemotron-3-super-120b-a12b:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GEMINI_API_KEY ? 'gemini' : 'opencode-zen')
        rationale = 'Razonamiento estratégico — Nemotron 3 Super 120B / Gemini 2.0 Flash.'
        break

      case 'fast':
        // OPERATOR, CHAT — Ultra-rápido, alta fluidez
        recommendedOpenRouterModel = 'mistralai/mistral-small-24b-instruct-2501:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GEMINI_API_KEY ? 'gemini' : 'opencode-zen')
        rationale = 'Consulta general y navegación — Mistral Small 24B / Gemini 2.0 Flash.'
        break

      case 'balanced':
      default:
        // ANALYST, RESEARCHER — Equilibrado
        recommendedOpenRouterModel = 'deepseek/deepseek-chat:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GEMINI_API_KEY ? 'gemini' : 'opencode-zen')
        rationale = 'Tarea analítica y métricas — DeepSeek Chat / Qwen 2.5.'
        break
    }

    return {
      mode,
      modeDefinition: modeDef,
      tier,
      category,
      requiredCapabilities,
      recommendedOpenRouterModel,
      preferredProvider,
      rationale
    }
  }
}
