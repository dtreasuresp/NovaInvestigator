import {
  classifyIntent as heuristicClassifyIntent,
  detectExternalVerificationRequest,
  isCasualGreetingText,
  type IntentType,
  INTENT_REQUIREMENTS
} from './intent-requirements'
import { getNovaiModeDefinition } from './adapters/modes'
import { NOVAI_ALL_MODULAR_TOOLS } from './tools'
import { logger } from '@/lib/logger'

// =============================================================================
// NovAi Hybrid Intent Classifier — Fase 4
// Heurística (rápida, determinista) → LLM cheap solo cuando ambigüedad (confidence < 0.7)
// Cache LLM para evitar llamadas repetidas
// =============================================================================

export interface IntentClassificationResult {
  intent: IntentType
  confidence: number // 0-1
  method: 'heuristic' | 'llm'
  externalVerificationRequested: boolean
  reasoning?: string
  alternativeIntents?: Array<{ intent: IntentType; confidence: number }>
}

export interface ClassifierOptions {
  confidenceThreshold?: number // default 0.7
  enableLlmFallback?: boolean // default true
  locale?: string
}

// LLM Cache: Map<messageHash, {intent, confidence, timestamp, externalVerificationRequested}>
const llmCache = new Map<string, { intent: IntentType; confidence: number; externalVerificationRequested: boolean; timestamp: number }>()
const CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutos

// Hash simple para cache
function hashMessage(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Heurística con scoring de confidence
function heuristicClassifyWithConfidence(text: string): { intent: IntentType; confidence: number; externalVerificationRequested: boolean } {
  const lower = (text || '').toLowerCase().trim()
  const externalVerificationRequested = detectExternalVerificationRequest(text)

  if (!lower || isCasualGreetingText(lower)) {
    return { intent: 'GENERAL_CHAT', confidence: 0.95, externalVerificationRequested: false }
  }

  const hasVerify = /verifica|valid|comprueba|confianza|correcto|acertado|nivel de confianza|grado de confianza|respald/i.test(lower)
  const hasInvestigation = /investigaci[oó]n|expediente|matriz|efi|efe|dafo|qspm|came|grado de confianza|nivel de confianza/i.test(lower)
  const hasWeb = /web|internet|externa|fuente confiable|busca en|informaci[oó]n confiable|repetir.*(?:otra vez|ver si|encuentras)|noticias/i.test(lower)
  const hasFactor = /(?:^|\b)(?:d|f|o|a)[- ]?\d{1,2}\b/i.test(lower) || /factor/i.test(lower)
  const hasCalculate = /calcula|índice|tas|ponderaci[oó]n|calificaci[oó]n/i.test(lower)
  const hasCompare = /compara|contrasta|vs|versus|mejor.*estrategia|escenario/i.test(lower)
  const hasRecommend = /recomiend|sugier|prop[oó]n|qu[eé] har[ií]as/i.test(lower)
  const hasFactorKeyword = /factor/i.test(lower)

  const rules: Array<{ condition: boolean; intent: IntentType; baseConfidence: number; specificity: number }> = [
    { condition: externalVerificationRequested, intent: 'VERIFY_INVESTIGATION', baseConfidence: 0.95, specificity: 4 },
    { condition: hasVerify && hasInvestigation && hasWeb, intent: 'VERIFY_INVESTIGATION', baseConfidence: 0.92, specificity: 3 },
    { condition: hasVerify && hasInvestigation, intent: 'VERIFY_INVESTIGATION', baseConfidence: 0.88, specificity: 2 },
    { condition: hasWeb && (hasVerify || hasInvestigation), intent: 'SEARCH_WEB', baseConfidence: 0.85, specificity: 2 },
    { condition: hasVerify && hasFactor, intent: 'VERIFY_FACTOR', baseConfidence: 0.9, specificity: 2 },
    { condition: hasVerify, intent: 'VERIFY_DATA', baseConfidence: 0.75, specificity: 1 },
    { condition: hasCalculate, intent: 'CALCULATE_MATRIX', baseConfidence: 0.85, specificity: 1 },
    { condition: hasCompare, intent: 'COMPARE_SCENARIOS', baseConfidence: 0.8, specificity: 1 },
    { condition: hasRecommend, intent: 'RECOMMEND', baseConfidence: 0.75, specificity: 1 },
    { condition: hasFactorKeyword, intent: 'VERIFY_FACTOR', baseConfidence: 0.65, specificity: 1 },
  ]

  let bestMatch: { intent: IntentType; confidence: number; specificity: number } | null = null

  for (const rule of rules) {
    if (rule.condition) {
      const confidence = rule.baseConfidence * (1 + rule.specificity * 0.05)
      if (!bestMatch || confidence > bestMatch.confidence || (confidence === bestMatch.confidence && rule.specificity > bestMatch.specificity)) {
        bestMatch = { intent: rule.intent, confidence: Math.min(confidence, 0.98), specificity: rule.specificity }
      }
    }
  }

  if (bestMatch) {
    return { intent: bestMatch.intent, confidence: bestMatch.confidence, externalVerificationRequested }
  }

  return { intent: 'GENERAL_CHAT', confidence: 0.5, externalVerificationRequested }
}

async function callLlmForIntent(
  text: string,
  context: { mode?: string; app?: string; hasInvestigation?: boolean },
  locale: string = 'es'
): Promise<{ intent: IntentType; confidence: number; externalVerificationRequested: boolean } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return null
  }

  const prompt = buildIntentPrompt(text, context, locale)
  const isExternal = detectExternalVerificationRequest(text)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://novastore.app',
        'X-Title': 'NovaStore ERP Intent Classifier'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(4000)
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (parsed.intent && parsed.confidence !== undefined) {
      return {
        intent: parsed.intent as IntentType,
        confidence: Number(parsed.confidence),
        externalVerificationRequested: isExternal || Boolean(parsed.externalVerificationRequested)
      }
    }
    return null
  } catch {
    return null
  }
}

function buildIntentPrompt(text: string, context: { mode?: string; app?: string; hasInvestigation?: boolean }, locale: string): string {
  const modeDesc = context.mode ? `Modo actual: ${context.mode}. ` : ''
  const appDesc = context.app ? `App: ${context.app}. ` : ''
  const invDesc = context.hasInvestigation ? 'Hay investigación activa. ' : ''

  const intentsDesc = Object.entries(INTENT_REQUIREMENTS).map(([key, req]) => 
    `- ${key}: ${req.description} (tools: ${req.requiredTools.join(', ') || 'ninguna'})`
  ).join('\n')

  const lang = locale === 'en' 
    ? 'Respond in English.' 
    : locale === 'de' 
      ? 'Antworten Sie auf Deutsch.' 
      : locale === 'ko' 
        ? '한국어로 답변하세요.' 
        : locale === 'pt' 
          ? 'Responda em Português.' 
          : 'Responde en Español.'

  return `${lang}
${modeDesc}${appDesc}${invDesc}
Clasifica la intención del usuario en una de estas categorías:

${intentsDesc}

Reglas:
1. Saludos casuales → GENERAL_CHAT
2. Si menciona factor específico (D-01, F-02, etc.) → VERIFY_FACTOR
3. Si pide cálculo de matriz → CALCULATE_MATRIX
4. Si pide búsqueda web → SEARCH_WEB
5. Si compara estrategias → COMPARE_SCENARIOS
6. Si recomienda acción → RECOMMEND
6. Si verifica datos de investigación → VERIFY_INVESTIGATION / VERIFY_DATA

Devuelve SOLO JSON válido:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicación"
}`
}

// =============================================================================
// HybridIntentClassifier
// =============================================================================

export class HybridIntentClassifier {
  private static instance: HybridIntentClassifier | null = null
  private options: Required<ClassifierOptions>

  private constructor(options: ClassifierOptions = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold ?? 0.7,
      enableLlmFallback: options.enableLlmFallback ?? true,
      locale: options.locale ?? 'es'
    }
  }

  static getInstance(options?: ClassifierOptions): HybridIntentClassifier {
    if (!HybridIntentClassifier.instance) {
      HybridIntentClassifier.instance = new HybridIntentClassifier(options)
    }
    return HybridIntentClassifier.instance
  }

  /**
   * Clasifica la intención con confianza y método
   */
  async classify(text: string, context: { mode?: string; app?: string; hasInvestigation?: boolean } = {}): Promise<IntentClassificationResult> {
    const cacheKey = hashMessage(text + JSON.stringify(context))
    
    // 1. Verificar cache LLM
    const cached = llmCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.info('HybridIntentClassifier: cache hit', {
        action: 'novai.intent.cache_hit',
        details: { intent: cached.intent, confidence: cached.confidence }
      })
      return {
        intent: cached.intent,
        confidence: cached.confidence,
        method: 'llm',
        externalVerificationRequested: cached.externalVerificationRequested
      }
    }

    // 2. Heurística rápida (siempre se ejecuta)
    const heuristicResult = heuristicClassifyWithConfidence(text)
    
    // 3. Si confidence alta, retornar heurística
    if (heuristicResult.confidence >= this.options.confidenceThreshold) {
      logger.info('HybridIntentClassifier: heuristic high confidence', {
        action: 'novai.intent.heuristic',
        details: { intent: heuristicResult.intent, confidence: heuristicResult.confidence, threshold: this.options.confidenceThreshold }
      })
      return { ...heuristicResult, method: 'heuristic' }
    }

    // 4. Confidence baja → intentar LLM si habilitado
    if (this.options.enableLlmFallback) {
      logger.info('HybridIntentClassifier: low confidence, trying LLM', {
        action: 'novai.intent.llm_fallback',
        details: { heuristicIntent: heuristicResult.intent, heuristicConfidence: heuristicResult.confidence }
      })

      const llmResult = await callLlmForIntent(text, context, this.options.locale)
      
      if (llmResult) {
        // Guardar en cache
        llmCache.set(cacheKey, { 
          intent: llmResult.intent, 
          confidence: llmResult.confidence,
          externalVerificationRequested: llmResult.externalVerificationRequested,
          timestamp: Date.now() 
        })

        logger.info('HybridIntentClassifier: LLM result', {
          action: 'novai.intent.llm_success',
          details: { intent: llmResult.intent, confidence: llmResult.confidence, heuristicIntent: heuristicResult.intent }
        })

        return {
          intent: llmResult.intent,
          confidence: llmResult.confidence,
          method: 'llm',
          externalVerificationRequested: llmResult.externalVerificationRequested,
          reasoning: `LLM overrode heuristic (${heuristicResult.intent}@${heuristicResult.confidence.toFixed(2)} → ${llmResult.intent}@${llmResult.confidence.toFixed(2)})`
        }
      }
    }

    // 5. Fallback a heurística si LLM falla
    logger.warn('HybridIntentClassifier: LLM failed or disabled, using heuristic', {
      action: 'novai.intent.fallback_heuristic',
      details: { intent: heuristicResult.intent, confidence: heuristicResult.confidence }
    })

    return { ...heuristicResult, method: 'heuristic', reasoning: 'LLM unavailable, using heuristic fallback' }
  }

  /**
   * Limpia cache expirado
   */
  static clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of llmCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        llmCache.delete(key)
      }
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  static getCacheStats(): { size: number; entries: Array<{ intent: IntentType; confidence: number; age: number }> } {
    const now = Date.now()
    return {
      size: llmCache.size,
      entries: Array.from(llmCache.entries()).map(([key, val]) => ({
        intent: val.intent,
        confidence: val.confidence,
        age: now - val.timestamp
      }))
    }
  }
}

/**
 * Función de conveniencia: clasifica con el clasificador singleton
 */
export async function classifyIntentHybrid(
  text: string, 
  context?: { mode?: string; app?: string; hasInvestigation?: boolean },
  options?: ClassifierOptions
): Promise<IntentClassificationResult> {
  const classifier = HybridIntentClassifier.getInstance(options)
  return classifier.classify(text, context)
}