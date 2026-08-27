/**
 * Detección de capacidades por proveedor (spec §27/§29 PROMPT_NOVAI_PRO_V2).
 *
 * NO simular tool calling sin que el Harness lo sepa.
 * Degradación explícita: si un proveedor no soporta una capacidad requerida,
 * se salta al siguiente candidato en la cascada.
 */

export type ProviderId =
  | 'openrouter'
  | 'gemini'
  | 'opencode-zen'

export interface ProviderCapabilities {
  supportsTools: boolean
  supportsStreaming: boolean
  supportsReasoning: boolean
  supportsStructuredOutput: boolean
  supportsVision: boolean
}

export const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderCapabilities> = {
  openrouter: {
    supportsTools: true,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsStructuredOutput: false,
    supportsVision: false
  },
  'opencode-zen': {
    supportsTools: true,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsStructuredOutput: false,
    supportsVision: false
  },
  gemini: {
    supportsTools: true,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsStructuredOutput: true,
    supportsVision: true
  }
}

export type RequiredCapabilities = Partial<ProviderCapabilities>

/**
 * Verifica si un proveedor cumple con las capacidades requeridas.
 * Lanza si no hay proveedor compatible (degradación explícita controlada).
 */
export function checkCapabilities(
  provider: ProviderId,
  required: RequiredCapabilities
): { compatible: boolean; missing: string[] } {
  const caps = PROVIDER_CAPABILITIES[provider]

  if (!caps) return { compatible: false, missing: [`Proveedor desconocido: ${provider}`] }

  const missing: string[] = []

  for (const [cap, requiredValue] of Object.entries(required) as [keyof ProviderCapabilities, boolean][]) {
    if (requiredValue && !caps[cap]) {
      missing.push(cap)
    }
  }

  return { compatible: missing.length === 0, missing }
}

/**
 * Filtra la lista de candidatos ordenada por prioridad, manteniendo solo
 * los que cumplen las capacidades requeridas.
 * Registra cada salto como degradación explícita (auditable).
 */
export function filterCandidatesByCapabilities<
  T extends { provider: ProviderId; name: string }
>(
  candidates: T[],
  required: RequiredCapabilities,
  log?: (msg: string) => void
): T[] {
  const filtered: T[] = []

  for (const c of candidates) {
    const { compatible, missing } = checkCapabilities(c.provider, required)
    
    if (compatible) {
      filtered.push(c)
    } else {
      const msg = `↘️ Degradación explícita: ${c.name} (${c.provider}) no soporta ${missing.join(', ')} — se omite en cascada.`
      log?.(msg)
    }
  }

  return filtered
}

/**
 * Decide qué capacidades son requeridas según el modo/categoría de la tarea.
 * Este es el único punto donde el Domain (modo NovAi) se mapea a
 * capacidades genéricas del Harness.
 */
export function requiredCapabilitiesForCategory(
  category: 'fast' | 'reasoning' | 'coding' | 'balanced'
): RequiredCapabilities {
  const base: RequiredCapabilities = {
    supportsStreaming: true,
    supportsTools: true // Por defecto NovAi SIEMPRE usa tools
  }

  switch (category) {
    case 'reasoning':
      return { ...base, supportsReasoning: true }
    case 'coding':
      return { ...base } // tool calling nativo crítico
    case 'fast':
      return { ...base } // streaming + tools
    case 'balanced':
    default:
      return { ...base }
  }
}

/**
 * Capacidad real de un modelo específico (no solo proveedor).
 * En el futuro se puede poblar dinámicamente via /models endpoint.
 */
export interface ModelCapability {
  modelId: string
  provider: ProviderId
  capabilities: ProviderCapabilities
  contextWindow: number
  maxOutputTokens: number
}

export const KNOWN_MODEL_CAPABILITIES: ModelCapability[] = [
  // Gemini
  { modelId: 'gemini-2.0-flash', provider: 'gemini', capabilities: PROVIDER_CAPABILITIES.gemini, contextWindow: 1_000_000, maxOutputTokens: 8192 },
  { modelId: 'gemini-1.5-flash', provider: 'gemini', capabilities: PROVIDER_CAPABILITIES.gemini, contextWindow: 1_000_000, maxOutputTokens: 8192 },

  // OpenRouter models (free & high capability)
  { modelId: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 128_000, maxOutputTokens: 8192 },
  { modelId: 'deepseek/deepseek-r1:free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 64_000, maxOutputTokens: 8192 },
  { modelId: 'deepseek/deepseek-chat:free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 64_000, maxOutputTokens: 8192 },
  { modelId: 'qwen/qwen-2.5-72b-instruct:free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 32_768, maxOutputTokens: 8192 },
  { modelId: 'mistralai/mistral-small-24b-instruct-2501:free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 32_768, maxOutputTokens: 8192 },
  { modelId: 'openrouter/free', provider: 'openrouter', capabilities: PROVIDER_CAPABILITIES.openrouter, contextWindow: 128_000, maxOutputTokens: 8192 },

  // OpenCode Zen
  { modelId: 'big-pickle', provider: 'opencode-zen', capabilities: PROVIDER_CAPABILITIES['opencode-zen'], contextWindow: 128_000, maxOutputTokens: 8192 }
]

export function getModelCapability(modelId: string, provider: ProviderId): ModelCapability | undefined {
  return KNOWN_MODEL_CAPABILITIES.find(m => m.modelId === modelId && m.provider === provider)
}