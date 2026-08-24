import { redirect } from 'next/navigation'

import { getCurrentPrincipal } from '@/features/access/access-service'
import PendingInvitations from '@/views/apps/users/invitations'

const InvitationsPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    redirect('/pages/auth/login')
  }

  return <PendingInvitations />
}

export default InvitationsPage
