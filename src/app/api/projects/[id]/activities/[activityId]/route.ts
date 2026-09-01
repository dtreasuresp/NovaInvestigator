import { NextRequest, NextResponse } from 'next/server'
import { updateProjectActivitySchema } from '@/features/projects/schema'
import * as service from '@/features/projects/service'
import { toProjectErrorResponse } from '@/features/projects/http'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const { id, activityId } = await props.params
    const activity = await service.getProjectActivity(id, activityId)
    return NextResponse.json({ ok: true, activity })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const { id, activityId } = await props.params
    const body = await request.json()
    const parsed = updateProjectActivitySchema.safeParse(body)

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

    const activity = await service.updateProjectActivity(id, activityId, parsed.data)
    return NextResponse.json({ ok: true, activity })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string; activityId: string }> }
) {
  try {
    const { id, activityId } = await props.params
    await service.deleteProjectActivity(id, activityId)
    return NextResponse.json({ ok: true, message: 'Actividad eliminada exitosamente' })
  } catch (error) {
    return toProjectErrorResponse(error)
  }
}
