import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { novaiReportRequestSchema, type AiMessage } from '@/features/novai/schema'
import { streamNovaiChat } from '@/features/novai/service'
import { toErrorResponse } from '@/lib/investigations/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = novaiReportRequestSchema.parse(body)

    // Reuse chat streaming for report generation via NovAi context
    const locale = parsed.locale

    const reportPromptMap: Record<string, string> = {
      es: `Genera un dictamen NovAi (${parsed.format}) en Español formal para ${parsed.context.app}.`,
      en: `Generate a NovAi report (${parsed.format}) strictly in English for ${parsed.context.app}.`,
      de: `Erstellen Sie einen NovAi-Bericht (${parsed.format}) auf Deutsch für ${parsed.context.app}.`,
      ko: `NovAi 보고서(${parsed.format})를 한국어로 작성하십시오.`,
      pt: `Gere um parecer NovAi (${parsed.format}) em Português para ${parsed.context.app}.`
    }

    const prompt = reportPromptMap[locale] ?? reportPromptMap.es
    const messages: AiMessage[] = [{ role: 'user', content: prompt }]

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
          messages,
          isFreeText: false,
          locale,
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
