import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireInvestigationsPrincipal } from '@/lib/investigations/access'
import { toErrorResponse } from '@/lib/investigations/http'
import { NovaiConversationsRepository } from '@/features/novai/conversations-repository'
import { novaiModeSchema } from '@/features/novai/schema'

import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  mode: novaiModeSchema.optional(),
  appContext: z.string().default('general'),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export async function GET() {
  try {
    const principal = await requireInvestigationsPrincipal()
    const conversations = await NovaiConversationsRepository.listConversations(
      principal.client as unknown as SupabaseClient,
      {
        tenantId: principal.tenantId,
        userId: principal.userId
      }
    )

    return NextResponse.json({ conversations })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()
    const body = await request.json().catch(() => ({}))
    const parsed = createConversationSchema.parse(body)

    const conversation = await NovaiConversationsRepository.createConversation(
      principal.client as unknown as SupabaseClient,
      {
        tenantId: principal.tenantId,
        userId: principal.userId,
        title: parsed.title,
        mode: parsed.mode,
        appContext: parsed.appContext,
        metadata: parsed.metadata
      }
    )

    if (!conversation) {
      return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 })
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
