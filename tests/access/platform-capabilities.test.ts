import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_ROLE_CAPABILITIES, isPlatformCapabilityKey } from '@/features/access/capabilityManifest'

test('tenant role presets do not include platform capabilities', () => {
  for (const capabilities of Object.values(DEFAULT_ROLE_CAPABILITIES)) {
    assert.equal(
      capabilities.some(capability => capability.startsWith('platform.')),
      false
    )
    assert.equal(capabilities.includes('billing.plans.manage'), false)
  }
})

test('platform capability validation keeps platform and tenant scopes separate', () => {
  assert.equal(isPlatformCapabilityKey('platform.tenants.create'), true)
  assert.equal(isPlatformCapabilityKey('billing.plans.manage'), true)
  assert.equal(isPlatformCapabilityKey('investigations.read'), false)
})
