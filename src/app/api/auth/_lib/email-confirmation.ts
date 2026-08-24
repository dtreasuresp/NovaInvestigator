import { getApplicationUrl } from '@/lib/billing/config'

export function buildEmailConfirmationRedirect(invitationToken?: string): string {
  const redirect = new URL('/api/auth/callback', getApplicationUrl())

  const nextPath = invitationToken
    ? `/pages/auth/invitations/accept?token=${encodeURIComponent(invitationToken)}`
    : '/pages/pricing?onboarding=1'

  redirect.searchParams.set('next', nextPath)

  return redirect.toString()
}
