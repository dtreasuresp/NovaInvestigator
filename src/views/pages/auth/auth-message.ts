const AUTH_MESSAGES: Record<string, string> = {
  'auth.alreadyAuthenticated': 'An account session is already active.',
  'auth.accountSetupRequired':
    'Your email is confirmed, but your account setup is incomplete. Contact an administrator to finish activating your access.',
  'auth.anonymousOnly': 'This operation is only available for an anonymous trial or one-time purchase session.',
  'auth.authRequired': 'Sign in to continue.',
  'auth.authServiceUnavailable': 'The authentication service is temporarily unavailable. Please try again later.',
  'auth.accountSuspended': 'This account is suspended. Contact an administrator for assistance.',
  'auth.confirmationEmailFailed': 'We could not send a confirmation email. Please try again.',
  'auth.confirmationEmailSent':
    'If this address belongs to an account awaiting confirmation, a new confirmation email has been sent.',
  'auth.confirmationLinkInvalid': 'This confirmation link is invalid or has expired. Request a new one below.',
  'auth.emailInUse': 'An account with this email already exists.',
  'auth.emailNotConfirmed': 'Confirm your email before signing in.',
  'auth.internalError':
    'We could not complete this request because of a temporary server problem. Please try again; if it persists, contact an administrator.',
  'auth.invalidCredentials': 'The email or password is incorrect.',
  'auth.loginFailed': 'We could not sign you in.',
  'auth.networkError': 'A network error occurred. Check your connection and try again.',
  'auth.conversionNotAllowed': 'This session cannot be converted into a registered account.',
  'auth.payloadTooLarge': 'The submitted data is too large. Check the form and try again.',
  'auth.passwordsDoNotMatch': 'The passwords do not match.',
  'auth.passwordReset': 'Your password was updated successfully.',
  'auth.passwordResetEmailSent': 'If the address exists, a password reset email has been sent.',
  'auth.passwordResetFailed': 'We could not reset your password. Request a new link and try again.',
  'auth.passwordResetRequestFailed': 'We could not request a password reset. Please try again.',
  'auth.rateLimited': 'Too many attempts. Please try again in a few minutes.',
  'auth.registrationFailed': 'We could not create your account.',
  'auth.recoverySessionRequired': 'Your recovery session is no longer valid. Request a new password reset link.',
  'auth.samePassword': 'The new password must be different from the current password.',
  'auth.validationError': 'The submitted data is invalid. Check the form and try again.',
  'auth.weakPassword': 'Choose a stronger password.',
  'auth.mfaRequired': 'Please enter the code from your authenticator app to continue.',
  'auth.mfaVerificationFailed': 'The verification code is incorrect. Check your authenticator and try again.',
  'auth.mfaChallengeExpired': 'The verification code has expired. Request a new code.',
  'auth.mfaFactorNotFound': 'The authentication factor was not found.',
  'auth.mfaAlreadyEnrolled': 'Two-factor authentication is already enabled for this account.',
  'auth.mfaEnrollLimit': 'You have reached the maximum number of authentication factors.',
  'auth.mfaAal2Required': 'Complete MFA verification in this session before managing recovery codes.',
  'auth.userNotFoundOrUnverified':
    'No active and verified account was found with this email. Please register first or confirm your email.',
  'auth.magicLinkSent': 'A sign-in link has been sent to your email address. Check your inbox to sign in.'
}

export function getAuthMessage(messageKey: string, fallback: string): string {
  return AUTH_MESSAGES[messageKey] ?? fallback
}
