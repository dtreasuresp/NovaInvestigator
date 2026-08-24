// Zod schemas validating everything that crosses the Billing & Plans API
// boundary. Nothing reaches the repository/service layer without passing
// through here first, mirroring src/lib/investigations/schema.ts.
import * as z from 'zod'

const idempotencyKeySchema = z.string().trim().min(1).max(128).optional()

export const billingPurchasePolicySchema = z.enum(['owner_only', 'approved_members', 'all_active_members'])

export const billingPurchasePolicyRequestSchema = z.object({
  policy: billingPurchasePolicySchema
})

export const billingPurchaseDelegationRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid()
})

export const billingWorkspaceIdQuerySchema = z.object({
  workspaceId: z.string().uuid()
})

export const billingPurchaseDelegationIdSchema = z.string().uuid()

export type BillingPurchasePolicy = z.infer<typeof billingPurchasePolicySchema>
export type BillingPurchasePolicyRequest = z.infer<typeof billingPurchasePolicyRequestSchema>
export type BillingPurchaseDelegationRequest = z.infer<typeof billingPurchaseDelegationRequestSchema>

export const checkoutOneTimeRequestSchema = z.object({
  planCode: z.string().trim().min(1).max(64),
  idempotencyKey: idempotencyKeySchema
})

export type CheckoutOneTimeRequest = z.infer<typeof checkoutOneTimeRequestSchema>

export const checkoutSubscriptionRequestSchema = z.object({
  planCode: z.string().trim().min(1).max(64),
  workspaceId: z.string().uuid().optional(),
  idempotencyKey: idempotencyKeySchema
})

export type CheckoutSubscriptionRequest = z.infer<typeof checkoutSubscriptionRequestSchema>

export const billingPurchaseAddressRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  mobile: z.string().trim().max(50).optional(),
  line1: z.string().trim().max(255).optional(),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(40).optional(),
  country: z.string().trim().length(2).optional()
})

export type BillingPurchaseAddressRequest = z.infer<typeof billingPurchaseAddressRequestSchema>

export const invoiceIdParamSchema = z.string().uuid()

export const adminBillingTenantQuerySchema = z.object({
  tenantId: z.string().uuid()
})

export const adminBillingInvoicesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100)
})

export const adminBillingPlanIdParamSchema = z.string().uuid()

export const adminBillingEntitlementRequestSchema = z.object({
  entitlementKey: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  limitValue: z.number().int().min(0).nullable(),
  isEnabled: z.boolean()
})

export const adminPlatformModuleKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z][a-z0-9._-]+$/)

export const adminPlatformModuleCreateSchema = z.object({
  moduleKey: adminPlatformModuleKeySchema,
  name: z.string().trim().min(1).max(128),
  description: z.string().trim().max(1000).nullable().optional(),
  routePrefix: z
    .string()
    .trim()
    .min(2)
    .max(256)
    .regex(/^\/[^\s]*$/),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(100000).optional()
})

export const adminPlatformModuleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  routePrefix: z
    .string()
    .trim()
    .min(2)
    .max(256)
    .regex(/^\/[^\s]*$/)
    .optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(100000).optional()
})

export const adminTrialPolicyUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  durationSeconds: z
    .number()
    .int()
    .min(60)
    .max(365 * 86400)
    .optional(),
  startsOn: z.enum(['first_access', 'first_action']).optional(),
  maxSessions: z.number().int().min(1).max(100000).optional(),
  allowGuest: z.boolean().optional(),
  allowPdf: z.boolean().optional(),
  allowCheckout: z.boolean().optional()
})

export const adminTrialPolicyEntitlementSchema = z.object({
  entitlementKey: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .regex(/^(modules|actions|limits)\.[a-z0-9._-]+$/),
  limitValue: z.number().int().min(0).nullable(),
  isEnabled: z.boolean()
})

export type AdminBillingTenantQuery = z.infer<typeof adminBillingTenantQuerySchema>
export type AdminBillingInvoicesQuery = z.infer<typeof adminBillingInvoicesQuerySchema>
export type AdminBillingEntitlementRequest = z.infer<typeof adminBillingEntitlementRequestSchema>
export type AdminPlatformModuleCreateRequest = z.infer<typeof adminPlatformModuleCreateSchema>
export type AdminPlatformModuleUpdateRequest = z.infer<typeof adminPlatformModuleUpdateSchema>
export type AdminTrialPolicyUpdateRequest = z.infer<typeof adminTrialPolicyUpdateSchema>
export type AdminTrialPolicyEntitlementRequest = z.infer<typeof adminTrialPolicyEntitlementSchema>
