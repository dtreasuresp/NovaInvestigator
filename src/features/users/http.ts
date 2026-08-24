// Shared Route Handler plumbing for src/app/api/admin/users/**: request
// body/size guarding, query parsing, and structured-error responses. Mirrors
// src/lib/investigations/http.ts so every admin route enforces the same
// "validate payload size/schema" and "structured errors, never raw driver
// errors" rules from the task brief.
import { NextResponse } from 'next/server'
import type { ZodType, output } from 'zod'

import { AuthenticationRequiredError, CapabilityDeniedError, TenantMembershipRequiredError } from '@/features/access/errors'

import { UsersError } from './errors'

// Bounds the raw HTTP body (JSON string) before it is parsed. Admin user
// management payloads are small (emails, role keys, capability toggles), so
// this is intentionally much smaller than the investigations limit.
export const MAX_REQUEST_BODY_BYTES = 32 * 1024

// Generic over the schema itself (`S extends ZodType`) rather than its
// output (`ZodType<T>`) so schemas with `.default(...)` fields — where the
// *input* type has optional properties but the *output* type does not — are
// inferred from `output<S>` (the parsed/output type) instead of unifying
// against the ambiguous `Output` position of `ZodType<T>`, which resolved to
// the wrong (input-shaped) type for src/features/users/schema.ts's
// `listUsersQuerySchema`.
export async function readJsonBody<S extends ZodType>(request: Request, schema: S): Promise<output<S>> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_REQUEST_BODY_BYTES) {
    throw UsersError.validation('El cuerpo de la solicitud excede el tamaño máximo permitido.')
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw UsersError.validation('El cuerpo de la solicitud no es JSON válido.')
  }

  const parsed = schema.safeParse(json)

  if (!parsed.success) {
    throw UsersError.validation('El cuerpo de la solicitud no cumple el esquema esperado.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseQuery<S extends ZodType>(request: Request, schema: S): output<S> {
  const url = new URL(request.url)
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams))

  if (!parsed.success) {
    throw UsersError.validation('Los parámetros de consulta no son válidos.', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return parsed.data
}

export function parseRouteId<S extends ZodType<string>>(rawId: string, schema: S): output<S> {
  const parsed = schema.safeParse(rawId)

  if (!parsed.success) {
    throw UsersError.validation('El identificador del miembro no es válido.')
  }

  return parsed.data
}

// Converts any thrown value into a structured JSON response. Unknown errors
// and raw AccessError instances that escaped src/features/users/access.ts
// are collapsed into a generic 500/403 so Supabase/Postgres internals never
// reach the client (plan section 15.6).
export function toErrorResponse(error: unknown): NextResponse {
  if (UsersError.isUsersError(error)) {
    return NextResponse.json(error.toResponseBody(), { status: error.httpStatus })
  }

  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json(UsersError.unauthenticated().toResponseBody(), { status: 401 })
  }

  if (error instanceof TenantMembershipRequiredError) {
    return NextResponse.json(UsersError.tenantRequired().toResponseBody(), { status: 403 })
  }

  if (error instanceof CapabilityDeniedError) {
    return NextResponse.json(UsersError.forbidden(error.capability).toResponseBody(), { status: 403 })
  }

  return NextResponse.json(UsersError.internal().toResponseBody(), { status: 500 })
}
