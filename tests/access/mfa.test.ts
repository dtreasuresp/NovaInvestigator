import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

import { AuthError } from '../../src/app/api/auth/_lib/http'
import { mapSupabaseAuthError } from '../../src/app/api/auth/_lib/supabase-auth-errors'

describe('mfa error mappings and responses', () => {
  it('creates correct AuthError shapes for MFA required', () => {
    const err = AuthError.mfaRequired()

    assert.equal(err.code, 'MFA_REQUIRED')
    assert.equal(err.httpStatus, 401)
    assert.equal(err.messageKey, 'auth.mfaRequired')
    assert.deepEqual(err.toResponseBody(), {
      error: {
        code: 'MFA_REQUIRED',
        messageKey: 'auth.mfaRequired'
      }
    })
  })

  it('creates correct AuthError shapes for MFA verification failed', () => {
    const err = AuthError.mfaVerificationFailed()

    assert.equal(err.code, 'MFA_VERIFICATION_FAILED')
    assert.equal(err.httpStatus, 400)
    assert.equal(err.messageKey, 'auth.mfaVerificationFailed')
  })

  it('creates correct AuthError shapes for MFA factor not found', () => {
    const err = AuthError.mfaFactorNotFound()

    assert.equal(err.code, 'MFA_FACTOR_NOT_FOUND')
    assert.equal(err.httpStatus, 404)
    assert.equal(err.messageKey, 'auth.mfaFactorNotFound')
  })

  it('creates correct AuthError shapes for MFA already enrolled', () => {
    const err = AuthError.mfaAlreadyEnrolled()

    assert.equal(err.code, 'MFA_ALREADY_ENROLLED')
    assert.equal(err.httpStatus, 409)
    assert.equal(err.messageKey, 'auth.mfaAlreadyEnrolled')
  })

  it('requires AAL2 before managing recovery codes', () => {
    const err = AuthError.mfaAal2Required()

    assert.equal(err.code, 'MFA_AAL2_REQUIRED')
    assert.equal(err.httpStatus, 403)
    assert.equal(err.messageKey, 'auth.mfaAal2Required')
  })

  it('maps Supabase mfa_verification_required to AuthError', () => {
    const sbError = { code: 'mfa_verification_required', message: 'MFA required' } as SupabaseAuthError
    const mapped = mapSupabaseAuthError(sbError)

    assert.equal(mapped.code, 'MFA_REQUIRED')
    assert.equal(mapped.httpStatus, 401)
  })

  it('maps Supabase mfa_verification_failed to AuthError', () => {
    const sbError = { code: 'mfa_verification_failed', message: 'Invalid code' } as SupabaseAuthError
    const mapped = mapSupabaseAuthError(sbError)

    assert.equal(mapped.code, 'MFA_VERIFICATION_FAILED')
    assert.equal(mapped.httpStatus, 400)
  })

  it('maps Supabase mfa_verified_factor_exists to AuthError', () => {
    const sbError = { code: 'mfa_verified_factor_exists', message: 'Factor exists' } as SupabaseAuthError
    const mapped = mapSupabaseAuthError(sbError)

    assert.equal(mapped.code, 'MFA_ALREADY_ENROLLED')
    assert.equal(mapped.httpStatus, 409)
  })
})
