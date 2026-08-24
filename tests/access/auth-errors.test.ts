import assert from 'node:assert/strict'
import test from 'node:test'

import { mapRegistrationCompletionError } from '@/app/api/auth/_lib/registration'

test('maps missing registration setup to an actionable conflict', () => {
  const error = mapRegistrationCompletionError({
    message: 'pending_registration_not_found'
  })

  assert.equal(error.code, 'ACCOUNT_SETUP_REQUIRED')
  assert.equal(error.httpStatus, 409)
  assert.equal(error.messageKey, 'auth.accountSetupRequired')
})

test('maps missing bootstrap configuration to a retryable service error', () => {
  const error = mapRegistrationCompletionError({
    message: 'platform_trial_policy_not_configured'
  })

  assert.equal(error.code, 'AUTH_SERVICE_UNAVAILABLE')
  assert.equal(error.httpStatus, 503)
  assert.equal(error.messageKey, 'auth.authServiceUnavailable')
})
