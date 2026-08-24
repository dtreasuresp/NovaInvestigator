import type { NovaiMode, AiMessage } from '../schema'
import { getNovaiModeDefinition, type NovaiModeDefinition } from './modes'

export type ModelTier = 'FREE' | 'LOW_COST' | 'PREMIUM' | 'FALLBACK'

export interface ModelRouteDecision {
  mode: NovaiMode
  modeDefinition: NovaiModeDefinition
  tier: ModelTier
  category: 'fast' | 'reasoning' | 'coding' | 'balanced'
  recommendedOpenRouterModel: string
  preferredProvider: 'gemini' | 'groq' | 'cerebras' | 'openrouter' | 'github' | 'pollinations'
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
    const tier: ModelTier = isPremium ? 'PREMIUM' : 'FREE'

    let recommendedOpenRouterModel = 'openai/gpt-4o-mini'
    let preferredProvider: ModelRouteDecision['preferredProvider'] = 'groq'
    let rationale = `Modo ${mode} asignado.`

    switch (category) {
      case 'coding':
        // DEVELOPER — Mejor coding con tool calling
        recommendedOpenRouterModel = 'qwen/qwen-2.5-coder-32b-instruct:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GROQ_API_KEY ? 'groq' : 'gemini')
        rationale = 'Desarrollo técnico — Qwen 2.5 Coder 32B con tool calling nativo.'
        break

      case 'reasoning':
        // CONSULTANT, ARCHITECT — Razonamiento profundo y auditoría
        recommendedOpenRouterModel = 'nvidia/llama-3.1-nemotron-70b-instruct:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GROQ_API_KEY ? 'groq' : 'gemini')
        rationale = 'Razonamiento estratégico — Llama 3.1 Nemotron 70B / DeepSeek R1.'
        break

      case 'fast':
        // OPERATOR, CHAT — Ultra-rápido, alta fluidez
        recommendedOpenRouterModel = 'meta-llama/llama-3.3-70b-instruct:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GROQ_API_KEY ? 'groq' : 'gemini')
        rationale = 'Consulta general y navegación — Llama 3.3 70B / Gemma 2.'
        break

      case 'balanced':
      default:
        // ANALYST, RESEARCHER — Equilibrado
        recommendedOpenRouterModel = 'meta-llama/llama-3.3-70b-instruct:free'
        preferredProvider = process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GROQ_API_KEY ? 'groq' : 'gemini')
        rationale = 'Tarea analítica y métricas — Llama 3.3 70B / Mistral Small.'
        break
    }

    return {
      mode,
      modeDefinition: modeDef,
      tier,
      category,
      recommendedOpenRouterModel,
      preferredProvider,
      rationale
    }
  }
}
