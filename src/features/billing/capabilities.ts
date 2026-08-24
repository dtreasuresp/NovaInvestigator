// Billing-scoped capability keys, re-exported with a narrower type from the
// canonical manifest at `src/features/access/capabilityManifest.ts` (the
// single source of truth per plan section 16: "No se crearán manifiestos de
// permisos paralelos."), exactly like
// `src/lib/investigations/capabilities.ts`. The `satisfies` constraint below
// means this file cannot drift from the manifest without a compile error.
import type { CapabilityKey } from '@/features/access/capabilityManifest'

export const BILLING_CAPABILITIES = {
  plansRead: 'billing.plans.read',
  checkoutCreate: 'billing.checkout.create',
  purchaseManage: 'billing.purchase.manage',
  subscriptionRead: 'billing.subscription.read',
  subscriptionManage: 'billing.subscription.manage',
  invoicesRead: 'billing.invoices.read',
  invoicesDownload: 'billing.invoices.download',
  trialStart: 'billing.trial.start',
  entitlementsRead: 'billing.entitlements.read'
} satisfies Record<string, CapabilityKey>

export type BillingCapability = (typeof BILLING_CAPABILITIES)[keyof typeof BILLING_CAPABILITIES]
