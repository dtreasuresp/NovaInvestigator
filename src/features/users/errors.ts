// Structured error contract for the tenant-scoped user management API
// (src/app/api/admin/users/**), matching the response shape documented in
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 15.6.
// Route handlers must never leak raw Supabase/Postgres error messages, auth
// tokens, or PII to the client or to logs — every failure path ends up as
// one of these codes.
export type UsersErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TENANT_REQUIRED'
  | 'COMMERCIAL_ACCESS_REQUIRED'
  | 'COMMERCIAL_ACCESS_RESOLUTION_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'ROLE_KEY_CONFLICT'
  | 'CAPABILITY_NOT_ASSIGNABLE'
  | 'INVITATION_ALREADY_PENDING'
  | 'INVITATION_DELIVERY_FAILED'
  | 'LAST_OWNER_PROTECTED'
  | 'INVALID_TRANSITION'
  | 'INTERNAL_ERROR'

export interface UsersErrorShape {
  error: {
    code: UsersErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<UsersErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  TENANT_REQUIRED: 403,
  COMMERCIAL_ACCESS_REQUIRED: 403,
  COMMERCIAL_ACCESS_RESOLUTION_FAILED: 503,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  ROLE_KEY_CONFLICT: 409,
  CAPABILITY_NOT_ASSIGNABLE: 403,
  INVITATION_ALREADY_PENDING: 409,
  INVITATION_DELIVERY_FAILED: 503,
  LAST_OWNER_PROTECTED: 409,
  INVALID_TRANSITION: 409,
  INTERNAL_ERROR: 500
}

export class UsersError extends Error {
  readonly code: UsersErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(code: UsersErrorCode, messageKey: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'UsersError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(): UsersErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }

  static validation(message: string, details?: Record<string, unknown>): UsersError {
    return new UsersError('VALIDATION_ERROR', 'users.validationError', message, details)
  }

  static unauthenticated(): UsersError {
    return new UsersError('UNAUTHENTICATED', 'users.unauthenticated', 'Se requiere una sesión activa para esta operación.')
  }

  static tenantRequired(): UsersError {
    return new UsersError(
      'TENANT_REQUIRED',
      'users.tenantRequired',
      'No se encontró una membresía activa que permita derivar el tenant.'
    )
  }

  static commercialAccessRequired(status: 'expired' | 'missing', source: string | null): UsersError {
    return new UsersError(
      'COMMERCIAL_ACCESS_REQUIRED',
      'billing.commercialAccessRequired',
      'El acceso comercial no está vigente para esta operación.',
      { status, source }
    )
  }

  static commercialAccessResolution(): UsersError {
    return new UsersError(
      'COMMERCIAL_ACCESS_RESOLUTION_FAILED',
      'billing.commercialAccessResolutionFailed',
      'No se pudo comprobar el acceso comercial. Inténtelo de nuevo.'
    )
  }

  static forbidden(capability: string): UsersError {
    return new UsersError(
      'FORBIDDEN',
      'users.forbidden',
      'La cuenta no tiene la capacidad requerida para esta operación.',
      { capability }
    )
  }

  static notFound(): UsersError {
    return new UsersError('NOT_FOUND', 'users.notFound', 'El miembro no existe o no es accesible desde este tenant.')
  }

  static versionConflict(): UsersError {
    return new UsersError(
      'VERSION_CONFLICT',
      'users.versionConflict',
      'El miembro fue modificado por otra sesión. Recargue los datos más recientes antes de reintentar.'
    )
  }

  static roleKeyConflict(): UsersError {
    return new UsersError(
      'ROLE_KEY_CONFLICT',
      'users.roleKeyConflict',
      'Ya existe un rol con esa clave en este tenant.'
    )
  }

  static capabilityNotAssignable(capabilities: string[]): UsersError {
    return new UsersError(
      'CAPABILITY_NOT_ASSIGNABLE',
      'users.capabilityNotAssignable',
      'La cuenta no puede conceder una o más capacidades que no posee.',
      { capabilities }
    )
  }

  static invitationAlreadyPending(): UsersError {
    return new UsersError(
      'INVITATION_ALREADY_PENDING',
      'users.invitationAlreadyPending',
      'Ya existe una invitación pendiente para este correo en el tenant.'
    )
  }

  static invitationDeliveryFailed(): UsersError {
    return new UsersError(
      'INVITATION_DELIVERY_FAILED',
      'users.invitationDeliveryFailed',
      'La invitación se guardó, pero no se pudo enviar el correo. Revisa la configuración de Resend y reintenta el envío.'
    )
  }

  static lastOwnerProtected(): UsersError {
    return new UsersError(
      'LAST_OWNER_PROTECTED',
      'users.lastOwnerProtected',
      'No se puede suspender ni reasignar el rol del último propietario activo del tenant.'
    )
  }

  static invalidTransition(message: string): UsersError {
    return new UsersError('INVALID_TRANSITION', 'users.invalidTransition', message)
  }

  static internal(message = 'No se pudo completar la operación.'): UsersError {
    return new UsersError('INTERNAL_ERROR', 'users.internalError', message)
  }

  static isUsersError(error: unknown): error is UsersError {
    return error instanceof UsersError
  }
}
