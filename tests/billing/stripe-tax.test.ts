import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import type Stripe from 'stripe'

import { getStripeTaxConfig } from '../../src/lib/billing/config'
import { getStripeInvoiceTaxAmountMinor, getStripeInvoiceTaxId } from '../../src/lib/billing/server'
import { buildCheckoutTaxParams } from '../../src/lib/billing/stripe'

const originalTaxEnabled = process.env.STRIPE_TAX_ENABLED
const originalAllowedCountries = process.env.ALLOWED_TAX_COUNTRIES

afterEach(() => {
  if (originalTaxEnabled === undefined) delete process.env.STRIPE_TAX_ENABLED
  else process.env.STRIPE_TAX_ENABLED = originalTaxEnabled

  if (originalAllowedCountries === undefined) delete process.env.ALLOWED_TAX_COUNTRIES
  else process.env.ALLOWED_TAX_COUNTRIES = originalAllowedCountries
})

describe('Stripe Tax configuration and Checkout payload', () => {
  it('collects tax IDs, a billing address, and updates existing customers', () => {
    process.env.STRIPE_TAX_ENABLED = 'true'
    process.env.ALLOWED_TAX_COUNTRIES = 'cl, us, CL'

    assert.deepEqual(getStripeTaxConfig(), { enabled: true, allowedCountries: ['CL', 'US'] })
    assert.deepEqual(buildCheckoutTaxParams(true), {
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_update: { address: 'auto' },
      shipping_address_collection: { allowed_countries: ['CL', 'US'] },
      tax_id_collection: { enabled: true }
    })
  })

  it('allows an explicit tax opt-out without sending tax collection fields', () => {
    process.env.STRIPE_TAX_ENABLED = 'false'
    delete process.env.ALLOWED_TAX_COUNTRIES

    assert.deepEqual(buildCheckoutTaxParams(false), {
      automatic_tax: { enabled: false },
      billing_address_collection: undefined,
      customer_update: undefined,
      shipping_address_collection: undefined,
      tax_id_collection: { enabled: false }
    })
  })

  it('rejects malformed country configuration', () => {
    process.env.ALLOWED_TAX_COUNTRIES = 'CL,Chile'

    assert.throws(() => getStripeTaxConfig(), /ISO 3166-1/)
  })
})

describe('Stripe invoice tax parsing', () => {
  it('sums total taxes and extracts the first customer tax ID', () => {
    const invoice = {
      total_taxes: [{ amount: 190 }, { amount: 60 }],
      customer_tax_ids: [{ value: 'cl_tin_123' }]
    } as unknown as Stripe.Invoice

    assert.equal(getStripeInvoiceTaxAmountMinor(invoice), 250)
    assert.equal(getStripeInvoiceTaxId(invoice), 'cl_tin_123')
  })

  it('returns safe zero/null values when Stripe has no tax data', () => {
    const invoice = { total_taxes: null, customer_tax_ids: null } as unknown as Stripe.Invoice

    assert.equal(getStripeInvoiceTaxAmountMinor(invoice), 0)
    assert.equal(getStripeInvoiceTaxId(invoice), null)
  })
})

describe('Stripe Tax persistence contract', () => {
  it('keeps tax fields in the forward migration, repository projection, and invoice webhook', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    const migration = read('supabase/migrations/2026-08-12T14-00-00_stripe_tax_invoice_fields.sql')
    const repository = read('src/features/billing/repository.ts')
    const service = read('src/features/billing/service.ts')

    assert.match(migration, /add column if not exists tax_amount_minor integer/)
    assert.match(migration, /add column if not exists tax_id text/)
    assert.match(repository, /tax_amount_minor/)
    assert.match(repository, /tax_id/)
    assert.match(service, /getStripeInvoiceTaxAmountMinor\(invoice\)/)
    assert.match(service, /getStripeInvoiceTaxId\(invoice\)/)
  })
})
