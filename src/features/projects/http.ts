import { NextResponse } from 'next/server'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'
import { ProjectError } from './errors'
import { AccessError } from '@/features/access/errors'

export function toProjectErrorResponse(error: unknown): NextResponse {
  if (ProjectError.isProjectError(error)) {
    return NextResponse.json(error.toResponseShape(), { status: error.httpStatus })
  }

  if (error instanceof AccessError) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', messageKey: error.message } },
      { status: 403 }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          messageKey: 'projects.errors.validation',
          details: { issues: error.issues }
        }
      },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        messageKey: 'projects.errors.internal',
        details: error instanceof Error ? { message: error.message } : undefined
      }
    },
    { status: 500 }
  )
}

export async function readProjectJsonBody<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  try {
    const raw = await request.json()
    return schema.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw ProjectError.validation('projects.errors.invalidJson')
    }
    throw error
  }
}
