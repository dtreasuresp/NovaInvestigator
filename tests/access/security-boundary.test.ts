import assert from 'node:assert/strict'
import test from 'node:test'

import { isRegisteredConfirmedUser } from '@/lib/auth/identity-policy'

test('registered users with confirmed email are accepted by the auth boundary', () => {
  assert.equal(
    isRegisteredConfirmedUser({
      is_anonymous: false,
      email_confirmed_at: '2026-08-10T00:00:00.000Z'
    }),
    true
  )
})

test('anonymous users are rejected even when Supabase reports a confirmation timestamp', () => {
  assert.equal(
    isRegisteredConfirmedUser({
      is_anonymous: true,
      email_confirmed_at: '2026-08-10T00:00:00.000Z'
    }),
    false
  )
})

test('registered users without confirmed email are rejected', () => {
  assert.equal(
    isRegisteredConfirmedUser({
      is_anonymous: false,
      email_confirmed_at: null
    }),
    false
  )
})
