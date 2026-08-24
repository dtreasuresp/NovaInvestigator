import { NextResponse } from 'next/server'
import type { ZodType, output } from 'zod'

import {
  AuthenticationRequiredError,
  PlatformCapabilityDeniedError,
  PlatformMembershipRequiredError
} from '@/features/access/errors'

import { PlatformError, type PlatformErrorShape } from './errors'

export const MAX_PLATFORM_BODY_BYTES = 16 * 1024

export async function readJsonBody<S extends ZodType>(request: Request, schema: S): Promise<output<S>> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_PLATFORM_BODY_BYTES) {
    throw PlatformError.validation('El cuerpo de la solicitud excede el tamaño máximo permitido.')
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw PlatformError.validation('El cuerpo de la solicitud no es JSON válido.')
  }

  const parsed = schema.safeParse(json)

  if (!parsed.success) {
    throw PlatformError.validation('El cuerpo de la solicitud no cumple el esquema esperado.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function toErrorResponse(error: unknown): NextResponse<PlatformErrorShape> {
  if (PlatformError.isPlatformError(error)) {
    return NextResponse.json(error.toResponseBody(), { status: error.httpStatus })
  }

  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json(PlatformError.unauthenticated().toResponseBody(), { status: 401 })
  }

  if (error instanceof PlatformMembershipRequiredError || error instanceof PlatformCapabilityDeniedError) {
    const capability = error instanceof PlatformCapabilityDeniedError ? error.capability : 'platform'

    return NextResponse.json(PlatformError.forbidden(capability).toResponseBody(), { status: 403 })
  }

  return NextResponse.json(PlatformError.internal().toResponseBody(), { status: 500 })
}
