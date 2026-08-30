import { NextResponse } from 'next/server'
import { getProject, updateProject } from '@/features/projects/service'
import { updateProjectSchema } from '@/features/projects/schema'
import { readProjectJsonBody, toProjectErrorResponse } from '@/features/projects/http'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const project = await getProject(id)

    return NextResponse.json({ ok: true, project })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await readProjectJsonBody(request, updateProjectSchema)
    const updated = await updateProject(id, body)

    return NextResponse.json({ ok: true, project: updated })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
