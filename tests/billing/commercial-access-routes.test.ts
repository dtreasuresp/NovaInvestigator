import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isCommercialAccessExemptRoute, shouldBlockCommercialAccess } from '../../src/lib/billing/commercial-access-routes'

describe('commercial access route policy', () => {
  it('blocks protected operational routes', () => {
    assert.equal(shouldBlockCommercialAccess('/apps/investigator'), true)
    assert.equal(shouldBlockCommercialAccess('/pages/user-settings', new URLSearchParams('setting=general')), true)
  })

  it('keeps billing, checkout, auth, and pricing routes available', () => {
    assert.equal(isCommercialAccessExemptRoute('/billing/checkout/success'), true)
    assert.equal(isCommercialAccessExemptRoute('/billing'), true)
    assert.equal(isCommercialAccessExemptRoute('/pages/auth/login'), true)
    assert.equal(isCommercialAccessExemptRoute('/pages/pricing'), true)
    assert.equal(
      shouldBlockCommercialAccess('/pages/user-settings', new URLSearchParams('setting=billing')),
      false
    )
  })

  it('does not block public non-operational pages', () => {
    assert.equal(shouldBlockCommercialAccess('/pages/misc/error-page'), false)
  })
})
