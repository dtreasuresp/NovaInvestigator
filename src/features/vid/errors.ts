export type VidErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROFILE_UNAVAILABLE'
  | 'ALREADY_VERIFIED'
  | 'INTERNAL_ERROR'

export interface VidErrorShape {
  error: {
    code: VidErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<VidErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROFILE_UNAVAILABLE: 409,
  ALREADY_VERIFIED: 409,
  INTERNAL_ERROR: 500
}

export class VidError extends Error {
  readonly code: VidErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(
    code: VidErrorCode,
    messageKey: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'VidError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(correlationId?: string): VidErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        details: {
          ...(this.details ?? {}),
          ...(correlationId ? { correlationId } : {})
        }
      }
    }
  }

  static validation(message = 'La solicitud no es válida.', details?: Record<string, unknown>): VidError {
    return new VidError('VALIDATION_ERROR', 'vid.validationError', message, details)
  }

  static unauthenticated(): VidError {
    return new VidError('UNAUTHENTICATED', 'vid.unauthenticated', 'Se requiere una sesión activa para esta operación.')
  }

  static forbidden(): VidError {
    return new VidError('FORBIDDEN', 'vid.forbidden', 'La cuenta no tiene permiso para esta operación.')
  }

  static notFound(): VidError {
    return new VidError('NOT_FOUND', 'vid.notFound', 'La solicitud VID no existe o ya no está disponible.')
  }

  static conflict(message = 'La solicitud VID cambió en otra sesión. Recarga los datos antes de reintentar.'): VidError {
    return new VidError('CONFLICT', 'vid.conflict', message)
  }

  static rateLimited(): VidError {
    return new VidError('RATE_LIMITED', 'vid.rateLimited', 'Has alcanzado el límite temporal de solicitudes VID.')
  }

  static profileUnavailable(): VidError {
    return new VidError(
      'PROFILE_UNAVAILABLE',
      'vid.profileUnavailable',
      'El perfil no está disponible para iniciar una revisión VID.'
    )
  }

  static alreadyVerified(): VidError {
    return new VidError('ALREADY_VERIFIED', 'vid.alreadyVerified', 'La cuenta ya tiene la verificación VID aprobada.')
  }

  static internal(): VidError {
    return new VidError('INTERNAL_ERROR', 'vid.internalError', 'No se pudo completar la operación VID.')
  }

  static isVidError(error: unknown): error is VidError {
    return error instanceof VidError
  }
}
