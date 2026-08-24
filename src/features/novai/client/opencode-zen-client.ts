import type { AiMessage } from '@/features/novai/schema'
import type { StreamCallbacks } from './gemini-client'
import type { OpenAiToolCall } from '@/features/novai/tools'
import type { ToolDefinition, StreamingCompletionResult } from './openrouter-client'

// OpenCode Zen — directo, OpenAI-compatible
// Key: OPENCODE_ZEN_API_KEY (sk-...), endpoint configurable via OPENCODE_ZEN_BASE_URL
// Defaults probados: https://api.opencode.ai, https://opencode.ai, https://zen.opencode.ai
// Si el endpoint base es https://api.opencode.ai -> chat URL = https://api.opencode.ai/v1/chat/completions

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/v1'
const FETCH_TIMEOUT_MS = 30000

function resolveBaseUrl(): string {
  const envUrl = process.env.OPENCODE_ZEN_BASE_URL?.trim()
  if (envUrl) return envUrl.replace(/\/+$/, '')
  return DEFAULT_BASE_URL
}

export async function callOpenCodeZenStreaming({
  systemPrompt,
  messages,
  apiKey,
  model,
  baseUrl,
  tools,
  callbacks,
}: {
  systemPrompt: string
  messages: Array<AiMessage | { role: string; content: string | null; tool_call_id?: string; tool_calls?: OpenAiToolCall[] }>
  apiKey: string
  model?: string
  baseUrl?: string
  tools?: ToolDefinition[]
  callbacks: StreamCallbacks
}): Promise<StreamingCompletionResult> {
  const effectiveBase = (baseUrl || resolveBaseUrl()).replace(/\/+$/, '')
  const url = effectiveBase.endsWith('/chat/completions') ? effectiveBase : `${effectiveBase}/chat/completions`
  // Si no se pasa model y hay OPENCODE_ZEN_MODEL en env, usarlo; si no, dejar que el servidor decida (no enviar model)
  const effectiveModel = model || process.env.OPENCODE_ZEN_MODEL?.trim() || undefined

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
    messages: formattedMessages,
    temperature: 0.7,
    stream: true,
  }
  if (effectiveModel) body.model = effectiveModel
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
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
      throw new Error(`OpenCode Zen timeout after ${FETCH_TIMEOUT_MS}ms at ${url}`)
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenCode Zen error (${response.status}) at ${url}: ${errorText || response.statusText}`)
  }

  if (!response.body) {
    throw new Error(`OpenCode Zen response body is empty at ${url}.`)
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
