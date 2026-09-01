import { NextResponse } from 'next/server'
import { syncProjectCameActions } from '@/features/projects/service'
import { syncProjectCameActionsSchema } from '@/features/projects/schema'
import { readProjectJsonBody, toProjectErrorResponse } from '@/features/projects/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await readProjectJsonBody(request, syncProjectCameActionsSchema)
    const result = await syncProjectCameActions(id, body.cameActionIds)

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
