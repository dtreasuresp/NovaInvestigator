import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { toErrorResponse } from '@/lib/investigations/http'
import { NovaiConversationsRepository } from '@/features/novai/conversations-repository'
import { novaiModeSchema } from '@/features/novai/schema'

import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const appendMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1),
  mode: novaiModeSchema.optional(),
  model: z.string().optional(),
  toolCalls: z.unknown().optional(),
  tokenCount: z.number().int().min(0).optional()
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const { id } = await context.params
    const body = await request.json()
    const parsed = appendMessageSchema.parse(body)

    const message = await NovaiConversationsRepository.appendMessage(
      principal.client as unknown as SupabaseClient,
      {
        conversationId: id,
        tenantId: principal.tenantId,
        userId: principal.userId,
        role: parsed.role,
        content: parsed.content,
        mode: parsed.mode,
        model: parsed.model,
        toolCalls: parsed.toolCalls,
        tokenCount: parsed.tokenCount
      }
    )

    if (!message) {
      return NextResponse.json({ error: 'No se pudo guardar el mensaje' }, { status: 500 })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
