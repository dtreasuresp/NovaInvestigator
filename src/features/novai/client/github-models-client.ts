import type { AiMessage } from '@/features/novai/schema'
import type { StreamCallbacks } from './gemini-client'
import type { OpenAiToolCall } from '@/features/novai/tools'
import type { ToolDefinition, StreamingCompletionResult } from './openrouter-client'

// GitHub Models — $0 con cuenta GitHub, sin tarjeta, no entrena
// Docs: https://docs.github.com/en/github-models
// Endpoint: https://models.github.ai/inference/chat/completions
// Modelos free: openai/gpt-4o-mini, openai/gpt-4o, meta/Llama-3.3-70B-Instruct, deepseek/DeepSeek-R1, etc.
// Rate: 10-15 RPM / 50-150 RPD por modelo — ideal para piloto $0
// Requiere GitHub PAT con permiso models:read (o token classic con repo read)
// Default: openai/gpt-4o-mini — mejor latencia/costo para NovaStore

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions'
const DEFAULT_GITHUB_MODEL = 'openai/gpt-4o-mini'
const FETCH_TIMEOUT_MS = 30000

export async function callGithubModelsStreaming({
  systemPrompt,
  messages,
  apiKey,
  model = DEFAULT_GITHUB_MODEL,
  tools,
  callbacks,
}: {
  systemPrompt: string
  messages: Array<AiMessage | { role: string; content: string | null; tool_call_id?: string; tool_calls?: OpenAiToolCall[] }>
  apiKey: string
  model?: string
  tools?: ToolDefinition[]
  callbacks: StreamCallbacks
}): Promise<StreamingCompletionResult> {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => {
      const msg: Record<string, unknown> = { role: m.role, content: m.content }
      if ('tool_call_id' in m && m.tool_call_id) msg.tool_call_id = m.tool_call_id
      if ('tool_calls' in m && m.tool_calls) msg.tool_calls = m.tool_calls
      return msg
    }),
  ]

  const body: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    stream: true,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`GitHub Models timeout after ${FETCH_TIMEOUT_MS}ms on model ${model}`)
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`GitHub Models error (${response.status}) on model ${model}: ${errorText || response.statusText}`)
  }

  if (!response.body) {
    throw new Error(`GitHub Models response body is empty for model ${model}.`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''
  const toolCallsMap = new Map<number, OpenAiToolCall>()

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
          const delta = parsed.choices?.[0]?.delta

          const chunkText: string | undefined = delta?.content
          if (chunkText) {
            fullText += chunkText
            callbacks.onChunk(chunkText)
          }

          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              let existing = toolCallsMap.get(idx)
              if (!existing) {
                existing = {
                  id: tc.id || `call_${Date.now()}_${idx}`,
                  type: 'function',
                  function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                }
                toolCallsMap.set(idx, existing)
              } else {
                if (tc.id) existing.id = tc.id
                if (tc.function?.name) existing.function.name += tc.function.name
                if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
              }
            }
          }
        } catch {
          // ignore incomplete chunk
        }
      }
    }

    const toolCalls = Array.from(toolCallsMap.values()).filter(tc => tc.function.name.length > 0)

    if (toolCalls.length === 0) {
      callbacks.onComplete(fullText)
    }

    return {
      text: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    callbacks.onError(error)
    throw error
  }
}
