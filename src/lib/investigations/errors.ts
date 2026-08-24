// Structured error contract for the investigations API, matching the shape
// documented in doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 15.6. Route handlers must never leak raw Supabase/Postgres error
// messages to the client; every failure path should end up as one of these
// codes.

export type InvestigationErrorCode =
  | 'VALIDATION_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'ANONYMOUS_WRITE_DENIED'
  | 'TENANT_REQUIRED'
  | 'COMMERCIAL_ACCESS_REQUIRED'
  | 'MODULE_ACCESS_REQUIRED'
  | 'COMMERCIAL_ACCESS_RESOLUTION_FAILED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'ENTITLEMENT_REQUIRED'
  | 'ENTITLEMENT_LIMIT_EXCEEDED'
  | 'ENTITLEMENT_RESOLUTION_FAILED'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'INTERNAL_ERROR'

export interface InvestigationErrorShape {
  error: {
    code: InvestigationErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<InvestigationErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNAUTHENTICATED: 401,
  ANONYMOUS_WRITE_DENIED: 403,
  TENANT_REQUIRED: 403,
  COMMERCIAL_ACCESS_REQUIRED: 403,
  MODULE_ACCESS_REQUIRED: 403,
  COMMERCIAL_ACCESS_RESOLUTION_FAILED: 503,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  ENTITLEMENT_REQUIRED: 403,
  ENTITLEMENT_LIMIT_EXCEEDED: 409,
  ENTITLEMENT_RESOLUTION_FAILED: 503,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INTERNAL_ERROR: 500
}

export class InvestigationError extends Error {
  readonly code: InvestigationErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(
    code: InvestigationErrorCode,
    messageKey: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'InvestigationError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(): InvestigationErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }

  static validation(message: string, details?: Record<string, unknown>): InvestigationError {
    return new InvestigationError('VALIDATION_ERROR', 'investigations.validationError', message, details)
  }

  static payloadTooLarge(maxBytes: number): InvestigationError {
    return new InvestigationError(
      'PAYLOAD_TOO_LARGE',
      'investigations.payloadTooLarge',
      'El payload de la investigación excede el tamaño máximo permitido.',
      { maxBytes }
    )
  }

  static unauthenticated(): InvestigationError {
    return new InvestigationError(
      'UNAUTHENTICATED',
      'investigations.unauthenticated',
      'Se requiere una sesión activa para esta operación.'
    )
  }

  static anonymousWriteDenied(): InvestigationError {
    return new InvestigationError(
      'ANONYMOUS_WRITE_DENIED',
      'investigations.anonymousWriteDenied',
      'Los usuarios anónimos de prueba o de compra única no pueden persistir investigaciones. El trabajo permanece en memoria.'
    )
  }

  static tenantRequired(): InvestigationError {
    return new InvestigationError(
      'TENANT_REQUIRED',
      'investigations.tenantRequired',
      'No se encontró una membresía activa que permita derivar el tenant.'
    )
  }

  static commercialAccessRequired(status: 'expired' | 'missing', source: string | null): InvestigationError {
    return new InvestigationError(
      'COMMERCIAL_ACCESS_REQUIRED',
      'billing.commercialAccessRequired',
      'El acceso comercial no está vigente para esta operación.',
      { status, source }
    )
  }

  static commercialAccessResolution(): InvestigationError {
    return new InvestigationError(
      'COMMERCIAL_ACCESS_RESOLUTION_FAILED',
      'billing.commercialAccessResolutionFailed',
      'No se pudo comprobar el acceso comercial. Inténtelo de nuevo.'
    )
  }

  static moduleAccessRequired(moduleKey: string): InvestigationError {
    return new InvestigationError(
      'MODULE_ACCESS_REQUIRED',
      'billing.moduleAccessRequired',
      'El módulo requerido no está incluido en el acceso comercial vigente.',
      { module: moduleKey }
    )
  }

  static forbidden(capability: string): InvestigationError {
    return new InvestigationError(
      'FORBIDDEN',
      'investigations.forbidden',
      'La cuenta no tiene la capacidad requerida para esta operación.',
      { capability }
    )
  }

  static locked(
    message = 'Esta investigación está protegida por su autor y se encuentra en modo solo lectura.'
  ): InvestigationError {
    return new InvestigationError('FORBIDDEN', 'investigations.locked', message)
  }

  static rateLimited(): InvestigationError {
    return new InvestigationError(
      'RATE_LIMITED',
      'investigations.rateLimited',
      'Se alcanzó el límite temporal de exportaciones PDF. Vuelva a intentarlo en unos minutos.'
    )
  }

  static entitlementRequired(entitlement: string): InvestigationError {
    return new InvestigationError(
      'ENTITLEMENT_REQUIRED',
      'investigations.entitlementRequired',
      'El tenant no tiene habilitado el entitlement requerido para esta operación.',
      { entitlement }
    )
  }

  static entitlementLimitExceeded(entitlement: string, limit: number, usage: number): InvestigationError {
    return new InvestigationError(
      'ENTITLEMENT_LIMIT_EXCEEDED',
      'investigations.entitlementLimitExceeded',
      'Se alcanzó el límite permitido por el plan para esta operación.',
      { entitlement, limit, usage }
    )
  }

  static entitlementResolution(): InvestigationError {
    return new InvestigationError(
      'ENTITLEMENT_RESOLUTION_FAILED',
      'investigations.entitlementResolutionFailed',
      'No se pudo comprobar el acceso del plan. Inténtelo de nuevo.'
    )
  }

  static notFound(): InvestigationError {
    return new InvestigationError(
      'NOT_FOUND',
      'investigations.notFound',
      'La investigación no existe o no es accesible.'
    )
  }

  static versionConflict(currentVersion: number): InvestigationError {
    return new InvestigationError(
      'VERSION_CONFLICT',
      'investigations.versionConflict',
      'La investigación fue modificada por otra sesión. Recargue la versión más reciente antes de reintentar.',
      { currentVersion }
    )
  }

  static internal(message = 'No se pudo completar la operación.'): InvestigationError {
    return new InvestigationError('INTERNAL_ERROR', 'investigations.internalError', message)
  }

  static isInvestigationError(error: unknown): error is InvestigationError {
    return error instanceof InvestigationError
  }
}
