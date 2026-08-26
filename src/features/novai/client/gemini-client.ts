import type { AiMessage } from '@/features/novai/schema'

export interface ToolCallStreamEvent {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

export interface ToolResultStreamEvent {
  toolCallId: string
  toolName: string
  result: unknown
  isError?: boolean
}

export interface ReasoningStreamEvent {
  textDelta: string
}

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
  onToolCall?: (event: ToolCallStreamEvent) => void
  onToolResult?: (event: ToolResultStreamEvent) => void
  onReasoning?: (event: ReasoningStreamEvent) => void
}

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-pro-latest'
]

export async function callGeminiStreaming({
  systemPrompt,
  messages,
  apiKey,
  model,
  callbacks
}: {
  systemPrompt: string
  messages: AiMessage[]
  apiKey: string
  model?: string
  callbacks: StreamCallbacks
}): Promise<string> {
  const modelsToTry = model ? [model, ...DEFAULT_GEMINI_MODELS.filter(m => m !== model)] : DEFAULT_GEMINI_MODELS

  // Format messages for Gemini API
  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  }

  let lastError: Error | null = null

  for (const currentModel of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?key=${apiKey}&alt=sse`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        const err = new Error(`Gemini API error (${response.status}) on model ${currentModel}: ${errorText || response.statusText}`)

        // If 404 (model not found), 400 (deprecated), 429 or 503 (high demand/rate limited), try next model
        if (response.status === 404 || response.status === 400 || response.status === 503 || response.status === 429) {
          console.warn(`Gemini model ${currentModel} returned ${response.status}, trying next model in list...`)
          lastError = err
          continue
        }

        throw err
      }

      if (!response.body) {
        throw new Error(`Gemini API response body is empty for model ${currentModel}.`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let hasStreamedAnyChunk = false

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
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text

              if (chunkText) {
                fullText += chunkText
                hasStreamedAnyChunk = true
                callbacks.onChunk(chunkText)
              }
            } catch {
              // Ignore JSON parse chunk errors for incomplete SSE lines
            }
          }
        }

        callbacks.onComplete(fullText)

        return fullText
      } catch (streamErr) {
        const error = streamErr instanceof Error ? streamErr : new Error(String(streamErr))

        if (hasStreamedAnyChunk) {
          callbacks.onError(error)
          throw error
        }

        lastError = error
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Error streaming with Gemini model ${currentModel}:`, err)
    }
  }

  const finalError = lastError || new Error('All Gemini candidate models failed.')
  
  throw finalError
}
