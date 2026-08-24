import { NextResponse } from 'next/server'
import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { streamAiConsultation } from '@/features/novai/service'
import { aiChatRequestSchema } from '@/features/novai/schema'
import { toErrorResponse } from '@/lib/investigations/http'
import type { InvestigationState } from '@/types/apps/investigator-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = aiChatRequestSchema.parse(body)
    const state = body.state as InvestigationState
    const inventory = body.inventory as { total: number, byStatus?: Record<string, number>, recent?: { id: string, title: string, status: string }[] } | undefined

    if (!state || !Array.isArray(state.internal) || !Array.isArray(state.external)) {
      return NextResponse.json({ error: 'Estado de investigación inválido.' }, { status: 400 })
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

    // Execute in background and stream chunks via SSE
    void (async () => {
      try {
        await streamAiConsultation({
          principal,
          state,
          messages: parsed.messages,
          isFreeText: parsed.isFreeText,
          locale: parsed.locale,
          inventory,
          callbacks: {
            onChunk: (chunk: string) => {
              const payload = JSON.stringify({ chunk })
              void safeWrite(`data: ${payload}\n\n`)
            },
            onComplete: (fullText: string) => {
              const payload = JSON.stringify({ done: true, fullText })
              void safeWrite(`data: ${payload}\n\n`).then(() => safeClose())
            },
            onError: (err: Error) => {
              const payload = JSON.stringify({ error: err.message })
              void safeWrite(`data: ${payload}\n\n`).then(() => safeClose())
            }
          }
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const payload = JSON.stringify({ error: errorMsg })
        void safeWrite(`data: ${payload}\n\n`).then(() => safeClose())
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
