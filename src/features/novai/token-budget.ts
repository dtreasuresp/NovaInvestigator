import type { AiMessage } from '@/features/novai/schema'

export interface ContextBudgetOptions {
  modelName?: string
  maxTotalTokens?: number
  reservedOutputTokens?: number
}

export interface TrimResult<T> {
  trimmedMessages: T[]
  totalEstimatedTokens: number
  wasTrimmed: boolean
  omittedCount: number
}

export class NovaiTokenBudget {
  /**
   * Estimador heurístico de tokens seguro y rápido para textos en español/inglés,
   * JSON estructurado y código fuente (~3.2 caracteres por token o ~1.35 tokens por palabra).
   */
  static estimateTokens(text: string | null | undefined): number {
    if (!text || text.length === 0) return 0

    const charBased = Math.ceil(text.length / 3.2)
    const wordBased = Math.ceil(text.trim().split(/\s+/).length * 1.35)

    return Math.max(charBased, wordBased)
  }

  /**
   * Estima los tokens totales de un array de mensajes (incluyendo tool_calls y metadata).
   */
  static estimateMessagesTokens(
    messages: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string }>
  ): number {
    let total = 0

    for (const m of messages) {
      // 4 tokens overhead por mensaje (delimitadores de rol y formato del LLM)
      total += 4
      total += this.estimateTokens(m.content)

      if (m.tool_calls) {
        total += this.estimateTokens(JSON.stringify(m.tool_calls))
      }

      if (m.tool_call_id) {
        total += this.estimateTokens(m.tool_call_id)
      }
    }

    return total
  }

  /**
   * Retorna el presupuesto seguro de contexto según el modelo seleccionado.
   * Reserva suficiente margen para el prompt de salida y respuesta fluida.
   */
  static getModelBudget(modelName?: string): { maxTotalTokens: number; reservedOutputTokens: number } {
    const model = (modelName || '').toLowerCase()

    // Modelos con 128k de contexto (Groq Llama 3.3, Llama 3.1, GPT-4o-mini, etc.)
    if (model.includes('llama-3.3') || model.includes('llama-3.1') || model.includes('gpt-4o') || model.includes('qwen-2.5')) {
      return {
        maxTotalTokens: 32768, // Presupuesto de trabajo ágil con latencia óptima
        reservedOutputTokens: 2048
      }
    }

    // Modelos con 32k-64k de contexto (Mistral Small, etc.)
    if (model.includes('mistral') || model.includes('qwen')) {
      return {
        maxTotalTokens: 16384,
        reservedOutputTokens: 2048
      }
    }

    // Fallback conservador para modelos gratuitos o desconocidos
    return {
      maxTotalTokens: 12288,
      reservedOutputTokens: 2048
    }
  }

  /**
   * Recorta inteligentemente el historial de conversación aplicando ventana deslizante:
   * 1. Preserva SIEMPRE el System Prompt.
   * 2. Preserva el primer mensaje del usuario (el ancla / objetivo original de la conversación).
   * 3. Preserva los N mensajes más recientes (del final hacia atrás).
   * 4. Mantiene la integridad de pares tool_calls <-> tool result (no corta en medio de llamadas a tools).
   * 5. Si se omiten mensajes, inserta una nota sintética informando al modelo.
   */
  static trimConversationHistory<
    T extends { role: string; content: string | null; tool_call_id?: string; tool_calls?: any }
  >(options: {
    messages: T[]
    systemPrompt: string
    maxTotalTokens?: number
    reservedOutputTokens?: number
    modelName?: string
  }): TrimResult<T> {
    const { messages, systemPrompt, modelName } = options
    const defaultBudget = this.getModelBudget(modelName)
    const maxTotalTokens = options.maxTotalTokens ?? defaultBudget.maxTotalTokens
    const reservedOutputTokens = options.reservedOutputTokens ?? defaultBudget.reservedOutputTokens

    const systemPromptTokens = this.estimateTokens(systemPrompt)
    const availableForMessages = Math.max(100, maxTotalTokens - systemPromptTokens - reservedOutputTokens)

    const initialMessagesTokens = this.estimateMessagesTokens(messages)

    // Si todo cabe dentro del presupuesto, no es necesario recortar
    if (initialMessagesTokens <= availableForMessages || messages.length <= 2) {
      return {
        trimmedMessages: messages,
        totalEstimatedTokens: systemPromptTokens + initialMessagesTokens,
        wasTrimmed: false,
        omittedCount: 0
      }
    }

    // Estrategia de recorte: Ancla inicial + Ventana Deslizante posterior
    const anchorMessage = messages[0] // Primer mensaje (tema inicial)
    const anchorTokens = this.estimateMessagesTokens([anchorMessage])

    let budgetLeft = availableForMessages - anchorTokens
    const recentMessages: T[] = []

    // Recorremos desde el mensaje más reciente hacia atrás
    let i = messages.length - 1
    const stopIndex = 1 // No incluir el anchor de nuevo

    while (i >= stopIndex) {
      const current = messages[i]

      // Si es un mensaje de resultado de tool ('tool'), debemos incluir también la llamada de assistant que lo originó
      if (current.role === 'tool' && i > stopIndex && messages[i - 1]?.tool_calls) {
        const assistantCallMsg = messages[i - 1]
        const groupTokens = this.estimateMessagesTokens([current, assistantCallMsg])

        if (budgetLeft - groupTokens >= 0) {
          recentMessages.unshift(current)
          recentMessages.unshift(assistantCallMsg)
          budgetLeft -= groupTokens
          i -= 2
          continue
        } else {
          // No cabe el bloque completo de tool
          break
        }
      }

      const msgTokens = this.estimateMessagesTokens([current])

      if (budgetLeft - msgTokens >= 0) {
        recentMessages.unshift(current)
        budgetLeft -= msgTokens
        i--
      } else {
        break
      }
    }

    const omittedCount = messages.length - (1 + recentMessages.length)

    if (omittedCount <= 0) {
      return {
        trimmedMessages: messages,
        totalEstimatedTokens: systemPromptTokens + this.estimateMessagesTokens(messages),
        wasTrimmed: false,
        omittedCount: 0
      }
    }

    // Insertar marcador de contexto comprimido
    const compressionNotice: any = {
      role: 'system',
      content: `[Nota de memoria contextual: Se han comprimido ${omittedCount} mensajes anteriores de esta sesión para maximizar la velocidad y retención de contexto del expediente activo.]`
    }

    const trimmedMessages: T[] = [anchorMessage, compressionNotice, ...recentMessages]
    const finalTokens = systemPromptTokens + this.estimateMessagesTokens(trimmedMessages)

    return {
      trimmedMessages,
      totalEstimatedTokens: finalTokens,
      wasTrimmed: true,
      omittedCount
    }
  }
}
