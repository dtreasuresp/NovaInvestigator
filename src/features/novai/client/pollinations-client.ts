import type { AiMessage } from '@/features/novai/schema'
import type { StreamCallbacks } from './gemini-client'

// Pollinations.ai — $0, sin key, sin signup, sin tarjeta, OpenAI-compatible
// Docs: https://github.com/pollinations/pollinations/blob/master/APIDOCS.md
// Endpoint OpenAI-compatible: https://text.pollinations.ai/openai
// Modelos: openai, openai-large, openai-reasoning, mistral, etc. — usamos "openai" por default (estable)

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai'
const DEFAULT_POLLINATIONS_MODEL = 'openai'
const FETCH_TIMEOUT_MS = 25000

export async function callPollinationsStreaming({
  systemPrompt,
  messages,
  model = DEFAULT_POLLINATIONS_MODEL,
  callbacks,
}: {
  systemPrompt: string
  messages: AiMessage[]
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
    response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Pollinations API timeout after ${FETCH_TIMEOUT_MS}ms on model ${model}`)
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Pollinations API error (${response.status}) on model ${model}: ${errorText || response.statusText}`)
  }

  if (!response.body) {
    throw new Error(`Pollinations API response body is empty for model ${model}.`)
  }

  // Pollinations soporta streaming SSE igual que OpenAI. Si devuelve JSON no-stream, lo manejamos.
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = json.choices?.[0]?.message?.content || ''
    if (text) callbacks.onChunk(text)
    callbacks.onComplete(text)
    return text
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
          const chunkText: string | undefined = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content
          if (chunkText) {
            fullText += chunkText
            callbacks.onChunk(chunkText)
          }
        } catch {
          // ignore incomplete chunk
        }
      }
    }

    // Si no llegó nada por SSE pero el buffer tiene JSON completo
    if (!fullText && buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer)
        const chunkText = parsed.choices?.[0]?.message?.content
        if (chunkText) {
          fullText = chunkText
          callbacks.onChunk(chunkText)
        }
      } catch {
        // ignore
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
