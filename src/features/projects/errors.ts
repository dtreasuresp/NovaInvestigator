export type ProjectErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TENANT_REQUIRED'
  | 'FORBIDDEN'
  | 'TEAM_MEMBER_NOT_ELIGIBLE'
  | 'LEADER_NOT_ELIGIBLE'
  | 'BUDGET_LIMIT_EXCEEDED'
  | 'ENTITLEMENT_REQUIRED'
  | 'ENTITLEMENT_LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export interface ProjectErrorShape {
  error: {
    code: ProjectErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<ProjectErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  TENANT_REQUIRED: 403,
  FORBIDDEN: 403,
  TEAM_MEMBER_NOT_ELIGIBLE: 422,
  LEADER_NOT_ELIGIBLE: 422,
  BUDGET_LIMIT_EXCEEDED: 422,
  ENTITLEMENT_REQUIRED: 403,
  ENTITLEMENT_LIMIT_EXCEEDED: 409,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
}

export class ProjectError extends Error {
  readonly code: ProjectErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(
    code: ProjectErrorCode,
    messageKey: string,
    details?: Record<string, unknown>
  ) {
    super(messageKey)
    this.name = 'ProjectError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code] ?? 500
    this.messageKey = messageKey
    this.details = details
  }

  static validation(messageKey = 'projects.errors.validation', details?: Record<string, unknown>): ProjectError {
    return new ProjectError('VALIDATION_ERROR', messageKey, details)
  }

  static unauthenticated(messageKey = 'projects.errors.unauthenticated'): ProjectError {
    return new ProjectError('UNAUTHENTICATED', messageKey)
  }

  static tenantRequired(messageKey = 'projects.errors.tenantRequired'): ProjectError {
    return new ProjectError('TENANT_REQUIRED', messageKey)
  }

  static forbidden(messageKey = 'projects.errors.forbidden', details?: Record<string, unknown>): ProjectError {
    return new ProjectError('FORBIDDEN', messageKey, details)
  }

  static teamMemberNotEligible(userId: string, teamId: string): ProjectError {
    return new ProjectError('TEAM_MEMBER_NOT_ELIGIBLE', 'projects.errors.teamMemberNotEligible', {
      userId,
      teamId
    })
  }

  static leaderNotEligible(userId: string, teamId: string): ProjectError {
    return new ProjectError('LEADER_NOT_ELIGIBLE', 'projects.errors.leaderNotEligible', {
      userId,
      teamId
    })
  }

  static budgetLimitExceeded(budgetTotal: number, allocatedTotal: number): ProjectError {
    return new ProjectError('BUDGET_LIMIT_EXCEEDED', 'projects.errors.budgetLimitExceeded', {
      budgetTotal,
      allocatedTotal
    })
  }

  static entitlementRequired(entitlementKey: string): ProjectError {
    return new ProjectError('ENTITLEMENT_REQUIRED', 'projects.errors.entitlementRequired', {
      entitlementKey
    })
  }

  static entitlementLimitExceeded(entitlementKey: string, limit: number, current: number): ProjectError {
    return new ProjectError('ENTITLEMENT_LIMIT_EXCEEDED', 'projects.errors.entitlementLimitExceeded', {
      entitlementKey,
      limit,
      current
    })
  }

  static notFound(messageKey = 'projects.errors.notFound'): ProjectError {
    return new ProjectError('NOT_FOUND', messageKey)
  }

  static conflict(messageKey = 'projects.errors.conflict'): ProjectError {
    return new ProjectError('CONFLICT', messageKey)
  }

  static internal(details?: Record<string, unknown>): ProjectError {
    return new ProjectError('INTERNAL_ERROR', 'projects.errors.internal', details)
  }

  static isProjectError(error: unknown): error is ProjectError {
    return error instanceof ProjectError
  }

  toResponseShape(): ProjectErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }
}
