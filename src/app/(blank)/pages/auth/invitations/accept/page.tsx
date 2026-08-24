import InvitationAccept from '@/views/pages/auth/invitations/accept'
import { getCurrentPrincipal } from '@/features/access/access-service'

interface InvitationAcceptPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const InvitationAcceptPage = async ({ searchParams }: InvitationAcceptPageProps) => {
  const query = await searchParams
  const token = typeof query.token === 'string' ? query.token : ''
  const principal = await getCurrentPrincipal()

  return <InvitationAccept token={token} authenticated={Boolean(principal && !principal.isAnonymous)} />
}

export default InvitationAcceptPage
