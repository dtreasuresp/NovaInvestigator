// Shared Route Handler plumbing for src/app/api/billing/**: request
// body/size guarding, query parsing, and structured-error responses. Mirrors
// src/features/users/http.ts and src/lib/investigations/http.ts so every
// billing route enforces the same "validate payload size/schema" and
// "structured errors, never raw driver errors" rules from the task brief.
import { NextResponse } from 'next/server'
import type { ZodType, output } from 'zod'

import {
  AuthenticationRequiredError,
  CapabilityDeniedError,
  TenantMembershipRequiredError
} from '@/features/access/errors'

import { BillingError } from './errors'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Correlation ID — mirrors src/features/vid/http.ts so every billing response
// carries an x-correlation-id that the client can use for support tickets and
// that the central logger can attach to every log entry in the same request.
// ---------------------------------------------------------------------------

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

// Billing request bodies are small (a plan code and an optional idempotency
// key); anything larger is almost certainly abuse.
export const MAX_REQUEST_BODY_BYTES = 16 * 1024

export async function readJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_REQUEST_BODY_BYTES) {
    throw BillingError.payloadTooLarge()
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw BillingError.validation('El cuerpo de la solicitud no es JSON válido.')
  }

  const parsed = schema.safeParse(json)

  if (!parsed.success) {
    throw BillingError.validation('El cuerpo de la solicitud no cumple el esquema esperado.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseRouteId(rawId: string, schema: ZodType<string>): string {
  const parsed = schema.safeParse(rawId)

  if (!parsed.success) {
    throw BillingError.validation('El identificador no es válido.')
  }

  return parsed.data
}

export function parseQuery<S extends ZodType>(request: Request, schema: S): output<S> {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))

  if (!parsed.success) {
    throw BillingError.validation('Los parámetros de consulta no son válidos.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

// Converts any thrown value into a structured JSON response. Unknown errors
// and raw AccessError instances that escaped src/features/billing/access.ts
// are collapsed into a generic 500/401/403 so Supabase/Postgres/Stripe
// internals never reach the client (plan section 15.6).
//
// When `correlationId` is provided, the response carries an x-correlation-id
// header so the caller can trace the error back to a specific request.
export function toErrorResponse(error: unknown, correlationId?: string): NextResponse {
  const map = (res: NextResponse) => (correlationId ? withCorrelationId(res, correlationId) : res)

  if (BillingError.isBillingError(error)) {
    return map(NextResponse.json(error.toResponseBody(), { status: error.httpStatus }))
  }

  if (error instanceof AuthenticationRequiredError) {
    return map(NextResponse.json(BillingError.unauthenticated().toResponseBody(), { status: 401 }))
  }

  if (error instanceof TenantMembershipRequiredError) {
    return map(NextResponse.json(BillingError.tenantRequired().toResponseBody(), { status: 403 }))
  }

  if (error instanceof CapabilityDeniedError) {
    return map(NextResponse.json(BillingError.forbidden(error.capability).toResponseBody(), { status: 403 }))
  }

  logger.error('Error no controlado en billing', {
    action: 'api/billing',
    correlationId,
    details: {
      error: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  })

  return map(NextResponse.json(BillingError.internal().toResponseBody(), { status: 500 }))
}
