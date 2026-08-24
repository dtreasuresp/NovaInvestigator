import { NextResponse } from 'next/server'
import type { ZodType, output } from 'zod'

import {
  AuthenticationRequiredError,
  PlatformCapabilityDeniedError,
  PlatformMembershipRequiredError
} from '@/features/access/errors'

import { VidError, type VidErrorShape } from './errors'

export const MAX_VID_BODY_BYTES = 16 * 1024

export async function readJsonBody<S extends ZodType>(request: Request, schema: S): Promise<output<S>> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_VID_BODY_BYTES) {
    throw VidError.validation('El cuerpo de la solicitud VID excede el tamaño permitido.')
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw VidError.validation('El cuerpo de la solicitud no es JSON válido.')
  }

  const parsed = schema.safeParse(json)

  if (!parsed.success) {
    throw VidError.validation('El cuerpo de la solicitud no cumple el esquema esperado.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseQuery<S extends ZodType>(request: Request, schema: S): output<S> {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))

  if (!parsed.success) {
    throw VidError.validation('Los parámetros de consulta no son válidos.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseRouteId(rawId: string, schema: ZodType<string>): string {
  const parsed = schema.safeParse(rawId)

  if (!parsed.success) {
    throw VidError.validation('El identificador de la solicitud VID no es válido.')
  }

  return parsed.data
}

export function getCorrelationId(request: Request): string {
  const incoming = request.headers.get('x-correlation-id')?.trim()

  if (incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming)) {
    return incoming
  }

  return crypto.randomUUID()
}

export function withCorrelationId<T>(response: NextResponse<T>, correlationId: string): NextResponse<T> {
  response.headers.set('x-correlation-id', correlationId)

  return response
}

function mapPostgresError(error: unknown): VidError | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const candidate = error as { code?: string; message?: string }
  const message = candidate.message ?? ''

  if (candidate.code === '23505' || message.includes('vid_submission_pending')) {
    return VidError.conflict('Ya existe una solicitud VID abierta para esta cuenta.')
  }

  if (candidate.code === '40001' || message.includes('vid_version_conflict')) {
    return VidError.conflict()
  }

  if (message.includes('vid_request_not_found')) {
    return VidError.notFound()
  }

  if (message.includes('vid_already_verified')) {
    return VidError.alreadyVerified()
  }

  if (message.includes('vid_profile_unavailable')) {
    return VidError.profileUnavailable()
  }

  if (message.includes('vid_invalid_transition')) {
    return VidError.conflict('La solicitud VID no puede pasar a ese estado.')
  }

  if (
    candidate.code === '22023' ||
    message.includes('vid_verification_method_invalid') ||
    message.includes('vid_provider_reference_invalid') ||
    message.includes('vid_review_input_invalid') ||
    message.includes('vid_review_action_invalid') ||
    message.includes('vid_review_reason_required') ||
    message.includes('vid_review_reason_invalid')
  ) {
    return VidError.validation()
  }

  if (message.includes('vid_review_forbidden')) {
    return VidError.forbidden()
  }

  return null
}

export function toErrorResponse(error: unknown, correlationId: string): NextResponse<VidErrorShape> {
  const responseError =
    VidError.isVidError(error)
      ? error
      : error instanceof AuthenticationRequiredError
        ? VidError.unauthenticated()
        : error instanceof PlatformMembershipRequiredError || error instanceof PlatformCapabilityDeniedError
          ? VidError.forbidden()
          : mapPostgresError(error) ?? VidError.internal()

  return withCorrelationId(
    NextResponse.json<VidErrorShape>(responseError.toResponseBody(correlationId), { status: responseError.httpStatus }),
    correlationId
  )
}
