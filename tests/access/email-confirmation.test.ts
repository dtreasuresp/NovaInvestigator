import assert from 'node:assert/strict'
import test from 'node:test'

import { buildEmailConfirmationRedirect } from '@/app/api/auth/_lib/email-confirmation'

test('email confirmation redirect preserves the invitation token', () => {
  const previousApplicationUrl = process.env.NEXT_PUBLIC_APP_URL

  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:4101'

  try {
    const redirect = new URL(buildEmailConfirmationRedirect('invite/token'))

    assert.equal(redirect.origin, 'http://localhost:4101')
    assert.equal(redirect.pathname, '/api/auth/callback')
    assert.equal(redirect.searchParams.get('next'), '/pages/auth/invitations/accept?token=invite%2Ftoken')
  } finally {
    if (previousApplicationUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousApplicationUrl
    }
  }
})

test('direct registrations return the billing onboarding path', () => {
  const previousApplicationUrl = process.env.NEXT_PUBLIC_APP_URL

  process.env.NEXT_PUBLIC_APP_URL = 'https://novastore.example'

  try {
    const redirect = new URL(buildEmailConfirmationRedirect())

    assert.equal(redirect.searchParams.get('next'), '/pages/pricing?onboarding=1')
  } finally {
    if (previousApplicationUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousApplicationUrl
    }
  }
})
