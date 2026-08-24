import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { novaiChatRequestSchema } from '@/features/novai/schema'
import { streamNovaiChat } from '@/features/novai/service'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = novaiChatRequestSchema.parse(body)

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
        await streamNovaiChat({
          principal,
          context: parsed.context,
          messages: parsed.messages,
          isFreeText: parsed.isFreeText,
          locale: parsed.locale,
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
