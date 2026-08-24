// Structured errors for platform-only APIs. Raw access/database errors never
// cross this boundary.
export type PlatformErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'INTERNAL_ERROR'

export interface PlatformErrorShape {
  error: {
    code: PlatformErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<PlatformErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500
}

export class PlatformError extends Error {
  readonly code: PlatformErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(
    code: PlatformErrorCode,
    messageKey: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PlatformError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(): PlatformErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }

  static validation(message: string, details?: Record<string, unknown>): PlatformError {
    return new PlatformError('VALIDATION_ERROR', 'platform.validationError', message, details)
  }

  static unauthenticated(): PlatformError {
    return new PlatformError(
      'UNAUTHENTICATED',
      'platform.unauthenticated',
      'Se requiere una sesión activa para esta operación.'
    )
  }

  static forbidden(capability: string): PlatformError {
    return new PlatformError(
      'FORBIDDEN',
      'platform.forbidden',
      'La cuenta no tiene la capacidad requerida para esta operación.',
      { capability }
    )
  }

  static internal(): PlatformError {
    return new PlatformError('INTERNAL_ERROR', 'platform.internalError', 'No se pudo completar la operación.')
  }

  static isPlatformError(error: unknown): error is PlatformError {
    return error instanceof PlatformError
  }
}
