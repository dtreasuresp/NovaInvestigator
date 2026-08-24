// Structured error contract for the Billing & Plans API
// (src/app/api/billing/**, src/app/api/webhooks/stripe), matching the shape
// documented in doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 15.6 and mirroring InvestigationError/UsersError/AuthError. Route
// handlers must never leak raw Stripe/Supabase/Postgres error messages,
// secrets, or payloads to the client or to logs — every failure path ends up
// as one of these codes.
export type BillingErrorCode =
  | 'VALIDATION_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'REGISTERED_ACCOUNT_REQUIRED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ANONYMOUS_ONLY'
  | 'TENANT_REQUIRED'
  | 'FORBIDDEN'
  | 'TRIAL_NOT_CONFIGURED'
  | 'TRIAL_ALREADY_USED'
  | 'TRIAL_UNAVAILABLE'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_CONFIGURED'
  | 'PLATFORM_MODULE_NOT_FOUND'
  | 'PLATFORM_MODULE_UPDATE_FAILED'
  | 'TRIAL_ENTITLEMENT_NOT_FOUND'
  | 'TRIAL_ENTITLEMENT_UPDATE_FAILED'
  | 'TENANT_NOT_FOUND'
  | 'ENTITLEMENT_NOT_FOUND'
  | 'ENTITLEMENT_UPDATE_FAILED'
  | 'SUBSCRIPTION_ALREADY_ACTIVE'
  | 'SUBSCRIPTION_CHECKOUT_IN_PROGRESS'
  | 'GUEST_ACCESS_NOT_FOUND'
  | 'CUSTOMER_NOT_FOUND'
  | 'INVOICE_NOT_FOUND'
  | 'INVOICES_LIST_FAILED'
  | 'CHECKOUT_FAILED'
  | 'RATE_LIMITED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_PROCESSING_FAILED'
  | 'INTERNAL_ERROR'

export interface BillingErrorShape {
  error: {
    code: BillingErrorCode
    messageKey: string
    details?: Record<string, unknown>
  }
}

const HTTP_STATUS_BY_CODE: Record<BillingErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNAUTHENTICATED: 401,
  REGISTERED_ACCOUNT_REQUIRED: 401,
  EMAIL_NOT_CONFIRMED: 403,
  ANONYMOUS_ONLY: 409,
  TENANT_REQUIRED: 403,
  FORBIDDEN: 403,
  TRIAL_NOT_CONFIGURED: 409,
  TRIAL_ALREADY_USED: 409,
  TRIAL_UNAVAILABLE: 409,
  PLAN_NOT_FOUND: 404,
  PLAN_NOT_CONFIGURED: 409,
  PLATFORM_MODULE_NOT_FOUND: 404,
  PLATFORM_MODULE_UPDATE_FAILED: 500,
  TRIAL_ENTITLEMENT_NOT_FOUND: 404,
  TRIAL_ENTITLEMENT_UPDATE_FAILED: 500,
  TENANT_NOT_FOUND: 404,
  ENTITLEMENT_NOT_FOUND: 404,
  ENTITLEMENT_UPDATE_FAILED: 500,
  SUBSCRIPTION_ALREADY_ACTIVE: 409,
  SUBSCRIPTION_CHECKOUT_IN_PROGRESS: 409,
  GUEST_ACCESS_NOT_FOUND: 404,
  CUSTOMER_NOT_FOUND: 404,
  INVOICE_NOT_FOUND: 404,
  INVOICES_LIST_FAILED: 500,
  CHECKOUT_FAILED: 502,
  RATE_LIMITED: 429,
  WEBHOOK_SIGNATURE_INVALID: 400,
  WEBHOOK_PROCESSING_FAILED: 500,
  INTERNAL_ERROR: 500
}

export class BillingError extends Error {
  readonly code: BillingErrorCode
  readonly httpStatus: number
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  private constructor(code: BillingErrorCode, messageKey: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'BillingError'
    this.code = code
    this.httpStatus = HTTP_STATUS_BY_CODE[code]
    this.messageKey = messageKey
    this.details = details
  }

  toResponseBody(): BillingErrorShape {
    return {
      error: {
        code: this.code,
        messageKey: this.messageKey,
        ...(this.details ? { details: this.details } : {})
      }
    }
  }

  static validation(message: string, details?: Record<string, unknown>): BillingError {
    return new BillingError('VALIDATION_ERROR', 'billing.validationError', message, details)
  }

  static payloadTooLarge(): BillingError {
    return new BillingError(
      'PAYLOAD_TOO_LARGE',
      'billing.payloadTooLarge',
      'El cuerpo de la solicitud excede el tamaño máximo permitido.'
    )
  }

  static unauthenticated(): BillingError {
    return new BillingError(
      'UNAUTHENTICATED',
      'billing.unauthenticated',
      'Se requiere una sesión activa para esta operación.'
    )
  }

  static registeredAccountRequired(): BillingError {
    return new BillingError(
      'REGISTERED_ACCOUNT_REQUIRED',
      'billing.registeredAccountRequired',
      'Inicie sesión con una cuenta registrada para continuar.'
    )
  }

  static emailNotConfirmed(): BillingError {
    return new BillingError(
      'EMAIL_NOT_CONFIRMED',
      'billing.emailNotConfirmed',
      'Debe confirmar su email antes de contratar o iniciar el acceso de prueba.'
    )
  }

  static anonymousOnly(): BillingError {
    return new BillingError(
      'ANONYMOUS_ONLY',
      'billing.anonymousOnly',
      'Esta operación solo está disponible para una sesión anónima de prueba heredada.'
    )
  }

  static tenantRequired(): BillingError {
    return new BillingError(
      'TENANT_REQUIRED',
      'billing.tenantRequired',
      'No se encontró una membresía activa que permita derivar el tenant.'
    )
  }

  static forbidden(capability: string): BillingError {
    return new BillingError(
      'FORBIDDEN',
      'billing.forbidden',
      'La cuenta no tiene la capacidad requerida para esta operación.',
      { capability }
    )
  }

  static trialNotConfigured(): BillingError {
    return new BillingError(
      'TRIAL_NOT_CONFIGURED',
      'billing.trialNotConfigured',
      'El acceso de prueba todavía no está configurado para este tenant.'
    )
  }

  static trialUnavailable(): BillingError {
    return new BillingError(
      'TRIAL_UNAVAILABLE',
      'billing.trialUnavailable',
      'El acceso de prueba ya fue utilizado o no está disponible.'
    )
  }

  static trialAlreadyUsed(): BillingError {
    return new BillingError(
      'TRIAL_ALREADY_USED',
      'billing.trialAlreadyUsed',
      'El acceso de prueba de este workspace ya fue utilizado.'
    )
  }

  static planNotFound(): BillingError {
    return new BillingError('PLAN_NOT_FOUND', 'billing.planNotFound', 'El plan solicitado no existe o no está activo.')
  }

  static planNotConfigured(): BillingError {
    return new BillingError(
      'PLAN_NOT_CONFIGURED',
      'billing.planNotConfigured',
      'El plan solicitado no tiene un precio de Stripe configurado.'
    )
  }

  static platformModuleNotFound(): BillingError {
    return new BillingError(
      'PLATFORM_MODULE_NOT_FOUND',
      'billing.platformModule.notFound',
      'El módulo de plataforma no existe o no está disponible.'
    )
  }

  static platformModuleUpdateFailed(): BillingError {
    return new BillingError(
      'PLATFORM_MODULE_UPDATE_FAILED',
      'billing.platformModule.updateFailed',
      'No se pudo actualizar el catálogo de módulos de la plataforma.'
    )
  }

  static trialEntitlementNotFound(): BillingError {
    return new BillingError(
      'TRIAL_ENTITLEMENT_NOT_FOUND',
      'billing.trialEntitlement.notFound',
      'El entitlement no existe en la política de prueba global.'
    )
  }

  static trialEntitlementUpdateFailed(): BillingError {
    return new BillingError(
      'TRIAL_ENTITLEMENT_UPDATE_FAILED',
      'billing.trialEntitlement.updateFailed',
      'No se pudo actualizar el entitlement de la política de prueba.'
    )
  }

  static tenantNotFound(): BillingError {
    return new BillingError(
      'TENANT_NOT_FOUND',
      'billing.entitlement.tenantNotFound',
      'El tenant solicitado no existe o no está activo.'
    )
  }

  static entitlementNotFound(): BillingError {
    return new BillingError(
      'ENTITLEMENT_NOT_FOUND',
      'billing.entitlement.notFound',
      'El entitlement solicitado no existe en el plan indicado.'
    )
  }

  static entitlementUpdateFailed(): BillingError {
    return new BillingError(
      'ENTITLEMENT_UPDATE_FAILED',
      'billing.entitlement.updateFailed',
      'No se pudo actualizar el override del entitlement.'
    )
  }

  static subscriptionAlreadyActive(): BillingError {
    return new BillingError(
      'SUBSCRIPTION_ALREADY_ACTIVE',
      'billing.subscriptionAlreadyActive',
      'El tenant ya tiene una suscripción activa o un período vigente.'
    )
  }

  static subscriptionCheckoutInProgress(): BillingError {
    return new BillingError(
      'SUBSCRIPTION_CHECKOUT_IN_PROGRESS',
      'billing.subscriptionCheckoutInProgress',
      'Ya existe un Checkout de suscripción en curso para este tenant.'
    )
  }

  static guestAccessNotFound(): BillingError {
    return new BillingError(
      'GUEST_ACCESS_NOT_FOUND',
      'billing.guestAccessNotFound',
      'No existe una solicitud de acceso anónimo pendiente. Inicie el acceso anónimo antes de pagar.'
    )
  }

  static customerNotFound(): BillingError {
    return new BillingError(
      'CUSTOMER_NOT_FOUND',
      'billing.customerNotFound',
      'El tenant no tiene un cliente de facturación configurado todavía.'
    )
  }

  static invoiceNotFound(): BillingError {
    return new BillingError('INVOICE_NOT_FOUND', 'billing.invoiceNotFound', 'La factura no existe o no es accesible.')
  }

  static invoicesListFailed(): BillingError {
    return new BillingError(
      'INVOICES_LIST_FAILED',
      'billing.invoices.listFailed',
      'No se pudieron listar las facturas administrativas.'
    )
  }

  static checkoutFailed(): BillingError {
    return new BillingError(
      'CHECKOUT_FAILED',
      'billing.checkoutFailed',
      'No se pudo crear la sesión de Stripe Checkout.'
    )
  }

  static rateLimited(): BillingError {
    return new BillingError(
      'RATE_LIMITED',
      'billing.rateLimited',
      'Se realizaron demasiados intentos. Vuelva a intentarlo en unos minutos.'
    )
  }

  static webhookSignatureInvalid(): BillingError {
    return new BillingError(
      'WEBHOOK_SIGNATURE_INVALID',
      'billing.webhookSignatureInvalid',
      'La firma del webhook de Stripe no es válida.'
    )
  }

  static webhookProcessingFailed(eventType: string): BillingError {
    return new BillingError(
      'WEBHOOK_PROCESSING_FAILED',
      'billing.webhookProcessingFailed',
      'No se pudo procesar el evento de webhook.',
      { eventType }
    )
  }

  static internal(message = 'No se pudo completar la operación.'): BillingError {
    return new BillingError('INTERNAL_ERROR', 'billing.internalError', message)
  }

  static isBillingError(error: unknown): error is BillingError {
    return error instanceof BillingError
  }
}
