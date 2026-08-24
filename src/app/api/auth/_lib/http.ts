// Shared HTTP plumbing for every Route Handler under `src/app/api/auth`:
// structured error contract, safe JSON body parsing (with a size guard), and
// zod parsing helpers. Mirrors the pattern already established for the
// investigations feature (`src/lib/investigations/errors.ts`) so both
// features expose the same `{ error: { code, messageKey, details? } }` shape
// described in doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 15.6.
//
// Route Handlers must never leak raw Supabase/Postgres error messages to the
// client — every failure path should end up as one of these codes via
// `handleRouteError`.
import { NextResponse } from 'next/server'

import type * as z from 'zod'

import { AuthenticationRequiredError, PrimaryTenantMembershipRequiredError } from '@/features/access/errors'
import { logger } from '@/lib/logger'

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'AUTH_REQUIRED'
  | 'RECOVERY_SESSION_REQUIRED'
  | 'ALREADY_AUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_SUSPENDED'
  | 'EMAIL_IN_USE'
  | 'WEAK_PASSWORD'
  | 'SAME_PASSWORD'
  | 'ANONYMOUS_ONLY'
  | 'CONVERSION_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'ACCOUNT_SETUP_REQUIRED'
  | 'PRIMARY_TENANT_UNAVAILABLE'
  | 'AUTH_SERVICE_UNAVAILABLE'
  | 'MFA_REQUIRED'
  | 'MFA_VERIFICATION_FAILED'
  | 'MFA_CHALLENGE_EXPIRED'
  | 'MFA_FACTOR_NOT_FOUND'
  | 'MFA_ALREADY_ENROLLED'
  | 'MFA_ENROLL_LIMIT'
  | 'MFA_AAL2_REQUIRED'
  | 'USER_NOT_FOUND_OR_UNVERIFIED'
  | 'INTERNAL_ERROR'

const HTTP_STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  AUTH_REQUIRED: 401,
  RECOVERY_SESSION_REQUIRED: 401,
  ALREADY_AUTHENTICATED: 409,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_CONFIRMED: 403,
  ACCOUNT_SUSPENDED: 403,
  EMAIL_IN_USE: 409,
  WEAK_PASSWORD: 400,
  SAME_PASSWORD: 400,
  ANONYMOUS_ONLY: 409,
  CONVERSION_NOT_ALLOWED: 409,
  RATE_LIMITED: 429,
  ACCOUNT_SETUP_REQUIRED: 409,
  PRIMARY_TENANT_UNAVAILABLE: 403,
  AUTH_SERVICE_UNAVAILABLE: 503,
  MFA_REQUIRED: 401,
  MFA_VERIFICATION_FAILED: 400,
  MFA_CHALLENGE_EXPIRED: 400,
  MFA_FACTOR_NOT_FOUND: 404,
  MFA_ALREADY_ENROLLED: 409,
  MFA_ENROLL_LIMIT: 409,
  MFA_AAL2_REQUIRED: 403,
  USER_NOT_FOUND_OR_UNVERIFIED: 403,
  INTERNAL_ERROR: 500
}

export interface AuthErrorShape {
  error: {
    code: AuthErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

export class AuthError extends Error {
  readonly code: AuthErrorCode

  readonly httpStatus: number

  readonly messageKey: string

  readonly details?: Record<string, unknown>

  private constructor(code: AuthErrorCode, messageKey: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(): AuthErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }

  static validation(message: string, details?: Record<string, unknown>): AuthError {
    return new AuthError('VALIDATION_ERROR', 'auth.validationError', message, details)
  }

  static payloadTooLarge(): AuthError {
    return new AuthError(
      'PAYLOAD_TOO_LARGE',
      'auth.payloadTooLarge',
      'El cuerpo de la solicitud excede el tamaño máximo permitido.'
    )
  }

  static authRequired(): AuthError {
    return new AuthError('AUTH_REQUIRED', 'auth.authRequired', 'Se requiere una sesión activa para esta operación.')
  }

  static recoverySessionRequired(): AuthError {
    return new AuthError(
      'RECOVERY_SESSION_REQUIRED',
      'auth.recoverySessionRequired',
      'Se requiere una sesión de recuperación válida. Solicite un nuevo enlace de restablecimiento.'
    )
  }

  static alreadyAuthenticated(): AuthError {
    return new AuthError(
      'ALREADY_AUTHENTICATED',
      'auth.alreadyAuthenticated',
      'Ya existe una sesión de cuenta registrada activa.'
    )
  }

  static invalidCredentials(): AuthError {
    return new AuthError('INVALID_CREDENTIALS', 'auth.invalidCredentials', 'El email o la contraseña no son correctos.')
  }

  static emailNotConfirmed(): AuthError {
    return new AuthError(
      'EMAIL_NOT_CONFIRMED',
      'auth.emailNotConfirmed',
      'Debe confirmar su email antes de iniciar sesión.'
    )
  }

  static accountSuspended(): AuthError {
    return new AuthError('ACCOUNT_SUSPENDED', 'auth.accountSuspended', 'Esta cuenta está suspendida.')
  }

  static emailInUse(): AuthError {
    return new AuthError('EMAIL_IN_USE', 'auth.emailInUse', 'Ya existe una cuenta registrada con este email.')
  }

  static weakPassword(): AuthError {
    return new AuthError(
      'WEAK_PASSWORD',
      'auth.weakPassword',
      'La contraseña no cumple los requisitos mínimos de seguridad.'
    )
  }

  static samePassword(): AuthError {
    return new AuthError('SAME_PASSWORD', 'auth.samePassword', 'La nueva contraseña debe ser distinta de la actual.')
  }

  static anonymousOnly(): AuthError {
    return new AuthError(
      'ANONYMOUS_ONLY',
      'auth.anonymousOnly',
      'Esta operación solo está disponible para sesiones anónimas de prueba o compra única.'
    )
  }

  static conversionNotAllowed(reason: string): AuthError {
    return new AuthError(
      'CONVERSION_NOT_ALLOWED',
      'auth.conversionNotAllowed',
      'La política de acceso anónimo vigente no permite la conversión a cuenta registrada.',
      { reason }
    )
  }

  static rateLimited(): AuthError {
    return new AuthError(
      'RATE_LIMITED',
      'auth.rateLimited',
      'Se realizaron demasiados intentos. Vuelva a intentarlo en unos minutos.'
    )
  }

  static accountSetupRequired(): AuthError {
    return new AuthError(
      'ACCOUNT_SETUP_REQUIRED',
      'auth.accountSetupRequired',
      'La cuenta está confirmada, pero su configuración de acceso está incompleta. Solicite al administrador que la habilite.'
    )
  }

  static primaryTenantUnavailable(): AuthError {
    return new AuthError(
      'PRIMARY_TENANT_UNAVAILABLE',
      'auth.primaryTenantUnavailable',
      'La organización seleccionada no está disponible para esta cuenta.'
    )
  }

  static authServiceUnavailable(): AuthError {
    return new AuthError(
      'AUTH_SERVICE_UNAVAILABLE',
      'auth.authServiceUnavailable',
      'El servicio de autenticación no está disponible temporalmente. Inténtelo de nuevo más tarde.'
    )
  }

  static internal(message = 'No se pudo completar la operación.'): AuthError {
    return new AuthError('INTERNAL_ERROR', 'auth.internalError', message)
  }

  static mfaRequired(): AuthError {
    return new AuthError('MFA_REQUIRED', 'auth.mfaRequired', 'Se requiere verificación de segundo factor.')
  }

  static mfaVerificationFailed(): AuthError {
    return new AuthError(
      'MFA_VERIFICATION_FAILED',
      'auth.mfaVerificationFailed',
      'El código de verificación es incorrecto.'
    )
  }

  static mfaChallengeExpired(): AuthError {
    return new AuthError(
      'MFA_CHALLENGE_EXPIRED',
      'auth.mfaChallengeExpired',
      'El desafío de verificación expiró. Solicite uno nuevo.'
    )
  }

  static mfaFactorNotFound(): AuthError {
    return new AuthError(
      'MFA_FACTOR_NOT_FOUND',
      'auth.mfaFactorNotFound',
      'El factor de verificación no fue encontrado.'
    )
  }

  static mfaAlreadyEnrolled(): AuthError {
    return new AuthError(
      'MFA_ALREADY_ENROLLED',
      'auth.mfaAlreadyEnrolled',
      'Ya existe un factor TOTP verificado para esta cuenta.'
    )
  }

  static mfaEnrollLimit(): AuthError {
    return new AuthError('MFA_ENROLL_LIMIT', 'auth.mfaEnrollLimit', 'Se alcanzó el límite máximo de factores MFA.')
  }

  static mfaAal2Required(): AuthError {
    return new AuthError(
      'MFA_AAL2_REQUIRED',
      'auth.mfaAal2Required',
      'Debe completar la verificación MFA en esta sesión antes de administrar los códigos de recuperación.'
    )
  }

  static userNotFoundOrUnverified(): AuthError {
    return new AuthError(
      'USER_NOT_FOUND_OR_UNVERIFIED',
      'auth.userNotFoundOrUnverified',
      'No se encontró una cuenta activa y confirmada con este email. Debe registrarse o confirmar su correo previamente.'
    )
  }

  static isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError
  }
}

export function errorResponse(error: AuthError): NextResponse<AuthErrorShape> {
  return NextResponse.json(error.toResponseBody(), { status: error.httpStatus })
}

// Applies to the raw request body only. Auth payloads (credentials, names,
// emails) are always small; anything larger is almost certainly abuse.
export const MAX_AUTH_BODY_BYTES = 16 * 1024

// Reads and parses the request body defensively: rejects oversized payloads
// before calling `JSON.parse`, and never lets a malformed body throw an
// unstructured error past this boundary.
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()

  if (Buffer.byteLength(text, 'utf-8') > MAX_AUTH_BODY_BYTES) {
    throw AuthError.payloadTooLarge()
  }

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    throw AuthError.validation('El cuerpo de la solicitud no es JSON válido.')
  }
}

export function parseWithSchema<Schema extends z.ZodType>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw AuthError.validation('Los datos enviados no son válidos.', {
      issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
    })
  }

  return result.data
}

// Central catch-all for Route Handlers. Never forwards raw error messages,
// stack traces, or request payloads (which may contain passwords/tokens) to
// the client or to logs — only a generic, already-sanitized description.
export function handleRouteError(error: unknown): NextResponse<AuthErrorShape> {
  if (AuthError.isAuthError(error)) {
    return errorResponse(error)
  }

  if (error instanceof AuthenticationRequiredError) {
    return errorResponse(AuthError.authRequired())
  }

  if (error instanceof PrimaryTenantMembershipRequiredError) {
    return errorResponse(AuthError.primaryTenantUnavailable())
  }

  logger.error('Error no controlado en autenticación', {
    action: 'api.auth.unhandled_error',
    details: {
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }
  })

  return errorResponse(AuthError.internal())
}
