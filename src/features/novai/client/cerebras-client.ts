import type { AiMessage } from '@/features/novai/schema'
import type { StreamCallbacks } from './gemini-client'

// Cerebras Cloud — OpenAI-compatible, $0 1M tokens/día, sin tarjeta, no entrena
// Docs: https://inference-docs.cerebras.ai
// Modelos free frecuentes: llama3.1-8b, llama3.3-70b, gpt-oss-120b, qwen3-32b
// Default elegido: llama-3.3-70b — mejor balance español/calidad para NovaStore

const DEFAULT_CEREBRAS_MODEL = 'llama-3.3-70b'
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions'
const FETCH_TIMEOUT_MS = 15000 // timeout por request completo (stream incluido arranca en <2s)

export async function callCerebrasStreaming({
  systemPrompt,
  messages,
  apiKey,
  model = DEFAULT_CEREBRAS_MODEL,
  callbacks,
}: {
  systemPrompt: string
  messages: AiMessage[]
  apiKey: string
  model?: string
  callbacks: StreamCallbacks
}): Promise<string> {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ]

  const body = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    stream: true,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Cerebras API timeout after ${FETCH_TIMEOUT_MS}ms on model ${model}`)
    }

    throw err
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')

    throw new Error(`Cerebras API error (${response.status}) on model ${model}: ${errorText || response.statusText}`)
  }

  if (!response.body) {
    throw new Error(`Cerebras API response body is empty for model ${model}.`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6)

        if (jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const chunkText: string | undefined = parsed.choices?.[0]?.delta?.content

          if (chunkText) {
            fullText += chunkText
            callbacks.onChunk(chunkText)
          }
        } catch {
          // Ignore parse errors on incomplete chunk boundaries
        }
      }
    }

    callbacks.onComplete(fullText)

    return fullText
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    
    callbacks.onError(error)
    throw error
  }
}
