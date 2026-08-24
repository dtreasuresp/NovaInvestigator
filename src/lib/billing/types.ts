import type { AccessGrantStatus } from '@/lib/supabase/database.types'

export type AccessMode =
  | 'anonymous_trial'
  | 'anonymous_one_time'
  | 'registered_trial'
  | 'registered_one_time'
  | 'registered_subscription'
  | 'registered_manual'

export type AccountStatus = 'anonymous' | 'invited' | 'active' | 'suspended'

export type SubscriptionStatus = 'incomplete' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export type BillingInterval = 'free' | 'one_time' | 'month' | 'year'

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export type GuestGrantMode = 'trial' | 'one_time'

export type GuestGrantStatus = 'pending' | 'active' | 'consumed' | 'expired' | 'converted' | 'revoked'

export type CommercialAccessStatus = 'active' | 'expired' | 'missing'

export type CommercialAccessSource = 'trial' | 'one_time' | 'subscription'

export interface CommercialAccessSummary {
  status: CommercialAccessStatus
  source: CommercialAccessSource | null
  startsAt: string | null
  expiresAt: string | null
}

export interface PlatformModuleSummary {
  moduleKey: string
  name: string
  description: string | null
  routePrefix: string | null
  isActive: boolean
  displayOrder: number
}

export interface BillingPlan {
  id: string
  code: string
  name: string
  description: string | null
  currency: string
  interval: BillingInterval
  durationSeconds?: number | null
  amountMinor: number
  providerPriceId: string | null
  isActive: boolean
  isPublic?: boolean
  contactSales?: boolean
  features: string[]
  limits: Record<string, number | null>
}

export interface SubscriptionSummary {
  id: string
  planCode: string
  status: SubscriptionStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface BillingInvoice {
  id: string
  number: string | null
  status: InvoiceStatus
  amountMinor: number
  taxAmountMinor: number | null
  currency: string
  issuedAt: string | null
  paidAt: string | null
  hostedInvoiceUrl: string | null
}

export interface GuestAccessSummary {
  mode: GuestGrantMode
  status: GuestGrantStatus
  startsAt: string
  expiresAt: string | null
  remainingUses: number
  allowPdf: boolean
  allowCheckout: boolean
  allowConversion: boolean
}

export interface TrialAccessSummary {
  grantId: string
  tenantId: string
  mode: 'trial'
  status: AccessGrantStatus
  startsAt: string
  expiresAt: string | null
  remainingUses: number
  allowPdf: boolean
  allowCheckout: boolean
}

export interface RegisteredAccessGrantSummary {
  grantId: string
  tenantId: string
  mode: 'trial' | 'one_time'
  status: AccessGrantStatus
  startsAt: string
  expiresAt: string | null
  remainingUses: number
}

export interface BillingSummary {
  accessMode: AccessMode
  accountStatus: AccountStatus
  commercialAccess: CommercialAccessSummary
  tenantId: string | null
  plan: BillingPlan | null
  subscription: SubscriptionSummary | null
  accessGrant: RegisteredAccessGrantSummary | null
  guestAccess: GuestAccessSummary | null
  invoices: BillingInvoice[]
}

export interface CheckoutResponse {
  checkoutUrl: string
  checkoutSessionId: string
}

export interface PurchaseAddressSummary {
  firstName: string | null
  lastName: string | null
  mobile: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type CheckoutAuthorizationSource = 'owner' | 'approved_member' | 'all_active_member'

export interface CheckoutAuthorization {
  source: CheckoutAuthorizationSource
  policy: string
  isOwner: boolean
  workspaceId: string
  workspaceName: string | null
}

export interface CheckoutProfile {
  userId: string
  email: string | null
  displayName: string | null
  firstName: string | null
  lastName: string | null
  mobile: string | null
  country: string | null
  avatarUrl: string | null
}

export interface CheckoutPlanBrief {
  code: string
  name: string
  interval: BillingInterval
}

export interface CheckoutContext {
  profile: CheckoutProfile
  plans: BillingPlan[]
  currentPlan: CheckoutPlanBrief | null
  subscription: SubscriptionSummary | null
  authorization: CheckoutAuthorization | null
  purchaseAddress: PurchaseAddressSummary | null
}

export interface PortalResponse {
  portalUrl: string
}

export interface ApiErrorShape {
  error: {
    code: string
    messageKey: string
    details?: Record<string, unknown>
  }
}
