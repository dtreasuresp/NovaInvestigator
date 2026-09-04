import { NextResponse } from 'next/server'
import type { output, ZodType } from 'zod'

import { StrategyError, type StrategyErrorShape } from './errors'

export const MAX_REQUEST_BODY_BYTES = 32 * 1024

export async function readJsonBody<S extends ZodType>(
  request: Request,
  schema: S
): Promise<output<S>> {
  const raw = await request.text()

  if (Buffer.byteLength(raw, 'utf-8') > MAX_REQUEST_BODY_BYTES) {
    throw StrategyError.validation('strategy.errors.payloadTooLarge')
  }

  let json: unknown

  try {
    json = raw.length ? JSON.parse(raw) : {}
  } catch {
    throw StrategyError.validation('strategy.errors.invalidJson')
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw StrategyError.validation('strategy.errors.validation', {
      issues: parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    })
  }

  return parsed.data
}

export function parseQuery<S extends ZodType>(
  request: Request,
  schema: S
): output<S> {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))

  if (!parsed.success) {
    throw StrategyError.validation('strategy.errors.invalidQuery', {
      issues: parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    })
  }

  return parsed.data
}

export function parseRouteId<S extends ZodType<string>>(
  rawId: string,
  schema: S
): output<S> {
  const parsed = schema.safeParse(rawId)

  if (!parsed.success) {
    throw StrategyError.validation('strategy.errors.invalidId')
  }

  return parsed.data
}

export function toErrorResponse(error: unknown): NextResponse<StrategyErrorShape> {
  if (StrategyError.isStrategyError(error)) {
    return NextResponse.json(error.toResponseShape(), { status: error.httpStatus })
  }

  return NextResponse.json(StrategyError.internal().toResponseShape(), { status: 500 })
}
