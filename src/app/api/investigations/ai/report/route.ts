import { NextResponse } from 'next/server'

import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { streamAiReport } from '@/features/novai/service'
import { aiReportRequestSchema } from '@/features/novai/schema'
import { toErrorResponse } from '@/lib/investigations/http'
import type { InvestigationState } from '@/types/apps/investigator-types'
import { upsertInvestigationAiReport } from '@/lib/investigations/ai-reports'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json()
    const parsed = aiReportRequestSchema.parse(body)
    const state = body.state as InvestigationState

    if (!state || !Array.isArray(state.internal) || !Array.isArray(state.external)) {
      return NextResponse.json({ error: 'Estado de investigación inválido.' }, { status: 400 })
    }

    const investigationId: string | undefined =
      (typeof body.investigationId === 'string' && body.investigationId.trim() ? body.investigationId.trim() : undefined) ??
      (typeof state.metadata?.id === 'string' && state.metadata.id.trim() ? state.metadata.id.trim() : undefined)

    const isPersistableId = Boolean(investigationId && UUID_RE.test(investigationId))

    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    void (async () => {
      try {
        await streamAiReport({
          principal,
          state,
          format: parsed.format,
          locale: parsed.locale,
          callbacks: {
            onChunk: (chunk: string) => {
              const payload = JSON.stringify({ chunk })

              writer.write(encoder.encode(`data: ${payload}\n\n`))
            },
            onComplete: async (fullText: string) => {
              // Persist última versión en BD (best-effort, no bloquea el stream)
              if (isPersistableId && investigationId && fullText && fullText.trim().length > 0) {
                try {
                  await upsertInvestigationAiReport(principal.client, {
                    tenantId: principal.tenantId,
                    investigationId,
                    reportText: fullText,
                    locale: parsed.locale,
                    format: parsed.format,
                    model: null,
                    generatedBy: principal.userId
                  })
                } catch (persistErr) {
                  logger.warn('No se pudo persistir el dictamen IA (best-effort)', {
                    action: 'investigations.ai_report.persist',
                    details: {
                      tenantId: principal.tenantId,
                      investigationId,
                      errorMessage: persistErr instanceof Error ? persistErr.message : String(persistErr)
                    }
                  })
                }
              }

              const payload = JSON.stringify({ done: true, fullText })

              writer.write(encoder.encode(`data: ${payload}\n\n`))
              writer.close()
            },
            onError: (err: Error) => {
              const payload = JSON.stringify({ error: err.message })

              writer.write(encoder.encode(`data: ${payload}\n\n`))
              writer.close()
            }
          }
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const payload = JSON.stringify({ error: errorMsg })

        writer.write(encoder.encode(`data: ${payload}\n\n`))
        writer.close()
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
