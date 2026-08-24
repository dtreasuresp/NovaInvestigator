// Shared Route Handler plumbing for src/app/api/investigations/**: request
// body/size guarding, query parsing, and structured-error responses. Kept in
// one place so every route handler enforces the same "validate payload
// size/schema" and "structured errors, never raw driver errors" rules from
// the task brief.
import { NextResponse } from 'next/server'
import type { ZodType, ZodTypeDef } from 'zod'

import { logger } from '@/lib/logger'

import { InvestigationError } from './errors'

// Bounds the raw HTTP body (JSON string) before it is parsed. This is
// intentionally larger than `MAX_STATE_PAYLOAD_BYTES` in schema.ts to leave
// room for the request envelope (title, version, idempotencyKey, ...).
export const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024

// `Input` is left as `any` (third generic) rather than defaulted to `Output`
// because several schemas here apply `.default(...)`/`.transform(...)`,
// whose pre-parse input type legitimately differs from the parsed output
// type — callers only care about the validated `Output` shape.
export async function readJsonBody<Output>(
  request: Request,
  schema: ZodType<Output, ZodTypeDef, any>,
  beforeValidation?: (json: unknown) => void
): Promise<Output> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_REQUEST_BODY_BYTES) {
    throw InvestigationError.payloadTooLarge(MAX_REQUEST_BODY_BYTES)
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw InvestigationError.validation('El cuerpo de la solicitud no es JSON válido.')
  }

  beforeValidation?.(json)

  const parsed = schema.safeParse(json)

  if (!parsed.success) {
    throw InvestigationError.validation('El cuerpo de la solicitud no cumple el esquema esperado.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseQuery<Output>(
  request: Request,
  schema: ZodType<Output, ZodTypeDef, any>
): Output {
  const url = new URL(request.url)
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams))

  if (!parsed.success) {
    throw InvestigationError.validation('Los parámetros de consulta no son válidos.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseRouteId(rawId: string, schema: ZodType<string, ZodTypeDef, string>): string {
  const parsed = schema.safeParse(rawId)

  if (!parsed.success) {
    throw InvestigationError.validation('El identificador de la investigación no es válido.')
  }

  return parsed.data
}

// Converts any thrown value into a structured JSON response. Unknown errors
// are intentionally collapsed into a generic 500 so Supabase/Postgres
// internals never reach the client (plan section 15.6).
export function toErrorResponse(error: unknown): NextResponse {
  if (InvestigationError.isInvestigationError(error)) {
    if (error.httpStatus >= 500) {
      logger.error('Investigation API internal error', {
        action: 'investigations.http.error',
        details: {
          errorName: error.name,
          errorMessage: error.message,
          ...error.details
        }
      })
    }

    return NextResponse.json(error.toResponseBody(), { status: error.httpStatus })
  }

  logger.error('Investigation API unexpected error', {
    action: 'investigations.http.unexpected',
    details: {
      errorMessage: error instanceof Error ? error.message : String(error)
    }
  })

  return NextResponse.json(InvestigationError.internal().toResponseBody(), { status: 500 })
}
