// Maps Supabase Auth error codes (from `@supabase/auth-js`, re-exported by
// `@supabase/supabase-js`) to the structured `AuthError` contract used by
// every Route Handler in this feature. This is the single place allowed to
// inspect `error.code`/`error.message` from a Supabase Auth call — nothing
// downstream should branch on Supabase-specific strings, and raw Supabase
// messages must never reach the client (plan section 15.6).
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

import { logger } from '@/lib/logger'

import { AuthError } from './http'

// Codes recognized here come from `@supabase/auth-js`'s `ErrorCode` union.
// See node_modules/.pnpm/@supabase+auth-js@*/node_modules/@supabase/auth-js/dist/module/lib/error-codes.d.ts
export function mapSupabaseAuthError(error: SupabaseAuthError): AuthError {
  const code = error.code?.toLowerCase()
  const message = error.message?.toLowerCase() ?? ''

  if (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    code === 'bad_jwt' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('invalid grant')
  ) {
    return AuthError.invalidCredentials()
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return AuthError.emailNotConfirmed()
  }

  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return AuthError.emailInUse()
    case 'weak_password':
      return AuthError.weakPassword()
    case 'same_password':
      return AuthError.samePassword()
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return AuthError.rateLimited()
    case 'user_not_found':
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
      return AuthError.authRequired()
    case 'mfa_verification_required':
    case 'insufficient_aal':
      return AuthError.mfaRequired()
    case 'mfa_verification_failed':
    case 'mfa_verification_rejected':
      return AuthError.mfaVerificationFailed()
    case 'mfa_challenge_expired':
      return AuthError.mfaChallengeExpired()
    case 'mfa_factor_not_found':
      return AuthError.mfaFactorNotFound()
    case 'mfa_verified_factor_exists':
      return AuthError.mfaAlreadyEnrolled()
    case 'too_many_enrolled_mfa_factors':
      return AuthError.mfaEnrollLimit()
    case 'mfa_totp_enroll_not_enabled':
    case 'mfa_totp_verify_not_enabled':
      return AuthError.authServiceUnavailable()
    default:
      logger.warn('Código de error de Supabase Auth no reconocido en catálogo', {
        action: 'auth.supabase.unmapped_error',
        details: {
          supabaseCode: error.code,
          supabaseMessage: error.message,
          supabaseStatus: error.status
        }
      })

      return AuthError.internal()
  }
}
