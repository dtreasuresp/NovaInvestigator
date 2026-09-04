export type StrategyErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TENANT_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'INVALID_TRANSITION'
  | 'SCOPE_INVALID'
  | 'DUPLICATE'
  | 'INTERNAL_ERROR'

export interface StrategyErrorShape {
  error: {
    code: StrategyErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<StrategyErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  TENANT_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 409,
  SCOPE_INVALID: 422,
  DUPLICATE: 409,
  INTERNAL_ERROR: 500
}

export class StrategyError extends Error {
  readonly code: StrategyErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(code: StrategyErrorCode, messageKey: string, details?: Record<string, unknown>) {
    super(messageKey)
    this.name = 'StrategyError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  static validation(messageKey = 'strategy.errors.validation', details?: Record<string, unknown>): StrategyError {
    return new StrategyError('VALIDATION_ERROR', messageKey, details)
  }

  static unauthenticated(messageKey = 'strategy.errors.unauthenticated'): StrategyError {
    return new StrategyError('UNAUTHENTICATED', messageKey)
  }

  static tenantRequired(messageKey = 'strategy.errors.tenantRequired'): StrategyError {
    return new StrategyError('TENANT_REQUIRED', messageKey)
  }

  static forbidden(capability?: string): StrategyError {
    return new StrategyError(
      'FORBIDDEN',
      'strategy.errors.forbidden',
      capability ? { capability } : undefined
    )
  }

  static notFound(messageKey = 'strategy.errors.notFound'): StrategyError {
    return new StrategyError('NOT_FOUND', messageKey)
  }

  static versionConflict(expectedVersion?: number): StrategyError {
    return new StrategyError(
      'VERSION_CONFLICT',
      'strategy.errors.versionConflict',
      expectedVersion === undefined ? undefined : { expectedVersion }
    )
  }

  static invalidTransition(messageKey = 'strategy.errors.invalidTransition'): StrategyError {
    return new StrategyError('INVALID_TRANSITION', messageKey)
  }

  static scopeInvalid(messageKey = 'strategy.errors.scopeInvalid', details?: Record<string, unknown>): StrategyError {
    return new StrategyError('SCOPE_INVALID', messageKey, details)
  }

  static duplicate(messageKey = 'strategy.errors.duplicate'): StrategyError {
    return new StrategyError('DUPLICATE', messageKey)
  }

  static internal(): StrategyError {
    return new StrategyError('INTERNAL_ERROR', 'strategy.errors.internal')
  }

  static isStrategyError(error: unknown): error is StrategyError {
    return error instanceof StrategyError
  }

  toResponseShape(): StrategyErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }
}
