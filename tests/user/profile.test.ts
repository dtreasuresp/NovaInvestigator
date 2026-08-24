import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { AuthError } from '../../src/app/api/auth/_lib/http'

describe('user profile and password security rules', () => {
  it('rejects unauthenticated requests to profile endpoints', () => {
    const err = AuthError.authRequired()

    assert.equal(err.code, 'AUTH_REQUIRED')
    assert.equal(err.httpStatus, 401)
  })

  it('rejects invalid password credentials during authenticated password change', () => {
    const err = AuthError.invalidCredentials()

    assert.equal(err.code, 'INVALID_CREDENTIALS')
    assert.equal(err.httpStatus, 401)
  })

  it('formats payload size limit error correctly', () => {
    const err = AuthError.payloadTooLarge()

    assert.equal(err.code, 'PAYLOAD_TOO_LARGE')
    assert.equal(err.httpStatus, 413)
  })
})
