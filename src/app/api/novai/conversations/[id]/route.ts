import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { toErrorResponse } from '@/lib/investigations/http'
import { NovaiConversationsRepository } from '@/features/novai/conversations-repository'
import { novaiModeSchema } from '@/features/novai/schema'

import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  mode: novaiModeSchema.optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const { id } = await context.params

    const result = await NovaiConversationsRepository.getConversationWithMessages(
      principal.client as unknown as SupabaseClient,
      {
        conversationId: id,
        tenantId: principal.tenantId,
        userId: principal.userId
      }
    )

    if (!result) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const parsed = updateConversationSchema.parse(body)

    const updated = await NovaiConversationsRepository.updateConversation(
      principal.client as unknown as SupabaseClient,
      {
        conversationId: id,
        tenantId: principal.tenantId,
        userId: principal.userId,
        updates: parsed
      }
    )

    if (!updated) {
      return NextResponse.json({ error: 'No se pudo actualizar la conversación' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const { id } = await context.params

    const deleted = await NovaiConversationsRepository.deleteConversation(
      principal.client as unknown as SupabaseClient,
      {
        conversationId: id,
        tenantId: principal.tenantId,
        userId: principal.userId
      }
    )

    if (!deleted) {
      return NextResponse.json({ error: 'No se pudo eliminar la conversación' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
