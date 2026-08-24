import { createHash } from 'node:crypto'

import Stripe from 'stripe'

import { getApplicationUrl, getStripeSecretKey, getStripeTaxConfig, getStripeWebhookSecret } from './config'

let stripeClient: Stripe | null = null

const createIntegrationIdentifier = (flow: 'one_time' | 'subscription', clientReferenceId: string): string => {
  const digest = createHash('sha256').update(`${flow}:${clientReferenceId}`).digest()
  const suffix = Array.from(digest.subarray(0, 8), byte => String.fromCharCode(97 + (byte % 26))).join('')

  return `nova_investigator_${flow}_${suffix}`
}

export const getStripe = (): Stripe => {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      apiVersion: '2026-07-29.dahlia',
      maxNetworkRetries: 2,
      timeout: 10_000
    })
  }

  return stripeClient
}

export const buildCheckoutTaxParams = (
  hasCustomer: boolean
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'automatic_tax' | 'billing_address_collection' | 'customer_update' | 'shipping_address_collection' | 'tax_id_collection'
> => {
  const taxConfig = getStripeTaxConfig()

  return {
    automatic_tax: { enabled: taxConfig.enabled },
    billing_address_collection: taxConfig.enabled ? 'required' : undefined,
    customer_update: taxConfig.enabled && hasCustomer ? { address: 'auto' } : undefined,
    shipping_address_collection:
      taxConfig.enabled && taxConfig.allowedCountries.length > 0
        ? { allowed_countries: taxConfig.allowedCountries }
        : undefined,
    tax_id_collection: { enabled: taxConfig.enabled }
  }
}

export const createOneTimeCheckoutSession = async ({
  priceId,
  clientReferenceId,
  metadata,
  customerEmail
}: {
  priceId: string
  clientReferenceId: string
  metadata: Record<string, string>
  customerEmail?: string
}): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe()
  const applicationUrl = getApplicationUrl()

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      integration_identifier: createIntegrationIdentifier('one_time', clientReferenceId),
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clientReferenceId,
      customer_email: customerEmail,
      metadata,
      ...buildCheckoutTaxParams(false),
      success_url: `${applicationUrl}/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${applicationUrl}/pages/pricing?checkout=cancelled`
    },
    { idempotencyKey: `one-time:${clientReferenceId}` }
  )
}

export const createSubscriptionCheckoutSession = async ({
  priceId,
  clientReferenceId,
  metadata,
  customerId,
  customerEmail
}: {
  priceId: string
  clientReferenceId: string
  metadata: Record<string, string>
  customerId?: string
  customerEmail?: string
}): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe()
  const applicationUrl = getApplicationUrl()

  return stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      integration_identifier: createIntegrationIdentifier('subscription', clientReferenceId),
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clientReferenceId,
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      metadata,
      ...buildCheckoutTaxParams(Boolean(customerId)),
      subscription_data: { metadata },
      success_url: `${applicationUrl}/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${applicationUrl}/pages/pricing?checkout=cancelled`
    },
    { idempotencyKey: `subscription:${clientReferenceId}:${priceId}` }
  )
}

export const createCustomerPortalSession = async (customerId: string): Promise<Stripe.BillingPortal.Session> => {
  const stripe = getStripe()
  const applicationUrl = getApplicationUrl()

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${applicationUrl}/pages/user-settings?setting=billing`
  })
}

export const constructStripeWebhookEvent = (payload: string, signature: string): Stripe.Event =>
  getStripe().webhooks.constructEvent(payload, signature, getStripeWebhookSecret())
