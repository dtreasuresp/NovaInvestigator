import { NextResponse } from 'next/server'
import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { novaiChatRequestSchema, type AiMessage } from '@/features/novai/schema'
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
    const supabase = principal.client as unknown as SupabaseClient

    let activeConversationId = parsed.conversationId
    let canonicalMessages: AiMessage[] = []

    const lastUserMsg = parsed.messages[parsed.messages.length - 1]

    if (activeConversationId) {
      // 1. Validar propiedad y existencia de la conversación en PostgreSQL
      const existingConv = await NovaiConversationsRepository.getConversation(supabase, {
        conversationId: activeConversationId,
        tenantId: principal.tenantId,
        userId: principal.userId
      })

      if (!existingConv) {
        return NextResponse.json({ error: 'Conversación no encontrada o sin acceso' }, { status: 404 })
      }

      // 2. Persistir mensaje de usuario entrante
      if (lastUserMsg && lastUserMsg.role === 'user') {
        await NovaiConversationsRepository.appendMessage(supabase, {
          conversationId: activeConversationId,
          tenantId: principal.tenantId,
          userId: principal.userId,
          role: 'user',
          content: lastUserMsg.content,
          mode: parsed.context.mode || 'CHAT'
        })
      }

      // 3. Reconstruir historial CANÓNICO desde DB (ignora historial histórico no verificado del cliente)
      canonicalMessages = await NovaiConversationsRepository.loadCanonicalAiMessages(supabase, {
        conversationId: activeConversationId,
        tenantId: principal.tenantId,
        userId: principal.userId
      })
    } else {
      // Si no viene conversationId, crear conversación canónica en DB
      const newConv = await NovaiConversationsRepository.createConversation(supabase, {
        tenantId: principal.tenantId,
        userId: principal.userId,
        title: lastUserMsg?.content ? lastUserMsg.content.slice(0, 35) : 'Nueva conversación',
        appContext: parsed.context.app,
        mode: parsed.context.mode || 'CHAT'
      })

      if (newConv) {
        activeConversationId = newConv.id

        if (lastUserMsg && lastUserMsg.role === 'user') {
          await NovaiConversationsRepository.appendMessage(supabase, {
            conversationId: activeConversationId,
            tenantId: principal.tenantId,
            userId: principal.userId,
            role: 'user',
            content: lastUserMsg.content,
            mode: parsed.context.mode || 'CHAT'
          })
        }

        canonicalMessages = await NovaiConversationsRepository.loadCanonicalAiMessages(supabase, {
          conversationId: activeConversationId,
          tenantId: principal.tenantId,
          userId: principal.userId
        })
      }
    }

    // Fallback de seguridad si canonicalMessages quedó vacío
    if (canonicalMessages.length === 0) {
      canonicalMessages = parsed.messages
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
          messages: canonicalMessages,
          isFreeText: parsed.isFreeText,
          locale: parsed.locale,
          onEvent: async (event: NovaiEvent) => {
            const payload = JSON.stringify(event)
            await safeWrite(`data: ${payload}\n\n`)

            if (event.type === 'message-complete') {
              if (activeConversationId && event.fullText && event.fullText.trim().length > 0) {
                try {
                  await NovaiConversationsRepository.appendMessage(supabase, {
                    conversationId: activeConversationId,
                    tenantId: principal.tenantId,
                    userId: principal.userId,
                    role: 'assistant',
                    content: event.fullText,
                    mode: parsed.context.mode || 'CHAT'
                  })
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
        Connection: 'keep-alive',
        ...(activeConversationId ? { 'X-Conversation-Id': activeConversationId } : {})
      }
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
