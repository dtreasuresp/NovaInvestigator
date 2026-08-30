import { NextResponse } from 'next/server'
import { createProject, listProjects } from '@/features/projects/service'
import { createProjectSchema, projectFilterSchema } from '@/features/projects/schema'
import { readProjectJsonBody, toProjectErrorResponse } from '@/features/projects/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawFilters = {
      investigationId: searchParams.get('investigationId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      workspaceId: searchParams.get('workspaceId') || undefined,
      status: searchParams.get('status') || undefined
    }

    const filters = projectFilterSchema.parse(rawFilters)
    const projects = await listProjects(filters)

    return NextResponse.json({ ok: true, projects })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readProjectJsonBody(request, createProjectSchema)
    const project = await createProject(body)

    return NextResponse.json({ ok: true, project }, { status: 201 })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
