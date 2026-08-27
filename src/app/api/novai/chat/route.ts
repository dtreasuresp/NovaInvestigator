import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { novaiChatRequestSchema } from '@/features/novai/schema'
import { NovaiAgentRuntime } from '@/features/novai/agent-runtime'
import { NovaiConversationsRepository } from '@/features/novai/conversations-repository'
import { toErrorResponse } from '@/lib/investigations/http'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NovaiEvent } from '@/features/novai/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = novaiChatRequestSchema.parse(body)

    if (parsed.conversationId) {
      const lastUserMsg = parsed.messages[parsed.messages.length - 1]

      if (lastUserMsg && lastUserMsg.role === 'user') {
        try {
          await NovaiConversationsRepository.appendMessage(
            principal.client as unknown as SupabaseClient,
            {
              conversationId: parsed.conversationId,
              tenantId: principal.tenantId,
              userId: principal.userId,
              role: 'user',
              content: lastUserMsg.content,
              mode: parsed.context.mode || 'CHAT'
            }
          )
        } catch {
          // Logged inside repository
        }
      }
    }

    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    let isClosed = false

    const safeWrite = async (text: string) => {
      if (isClosed) return
      try {
        await writer.write(encoder.encode(text))
      } catch {
        isClosed = true
      }
    }

    const safeClose = async () => {
      if (isClosed) return
      isClosed = true
      try {
        await writer.close()
      } catch {
        // ignore already closed
      }
    }

    void (async () => {
      try {
        await NovaiAgentRuntime.executeStreaming({
          principal,
          context: parsed.context,
          messages: parsed.messages,
          isFreeText: parsed.isFreeText,
          locale: parsed.locale,
          onEvent: async (event: NovaiEvent) => {
            const payload = JSON.stringify(event)
            await safeWrite(`data: ${payload}\n\n`)

            if (event.type === 'message-complete') {
              if (parsed.conversationId) {
                try {
                  await NovaiConversationsRepository.appendMessage(
                    principal.client as unknown as SupabaseClient,
                    {
                      conversationId: parsed.conversationId,
                      tenantId: principal.tenantId,
                      userId: principal.userId,
                      role: 'assistant',
                      content: event.fullText,
                      mode: parsed.context.mode || 'CHAT'
                    }
                  )
                } catch {
                  // Logged inside repository
                }
              }

              await safeClose()
            }
          }
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const errorEvent: NovaiEvent = { type: 'error', error: errorMsg }
        await safeWrite(`data: ${JSON.stringify(errorEvent)}\n\n`)
        await safeClose()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
