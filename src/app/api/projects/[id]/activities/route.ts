import { NextRequest, NextResponse } from 'next/server'
import { createProjectActivitySchema } from '@/features/projects/schema'
import * as service from '@/features/projects/service'
import { toProjectErrorResponse } from '@/features/projects/http'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const activities = await service.listProjectActivities(id)
    return NextResponse.json({ ok: true, activities })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const body = await request.json()
    const parsed = createProjectActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            messageKey: 'projects.errors.validation',
            details: { issues: parsed.error.issues }
          }
        },
        { status: 400 }
      )
    }

    const activity = await service.createProjectActivity(id, parsed.data)
    return NextResponse.json({ ok: true, activity }, { status: 201 })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
