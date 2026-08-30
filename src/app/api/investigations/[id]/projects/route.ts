import { NextResponse } from 'next/server'
import { listInvestigationProjects } from '@/features/projects/service'
import { toProjectErrorResponse } from '@/features/projects/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const projects = await listInvestigationProjects(id)

    return NextResponse.json({ ok: true, projects })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
