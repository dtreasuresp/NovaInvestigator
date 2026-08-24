import VerifyEmail from '@/views/pages/auth/verify-email'

interface VerifyEmailPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const VerifyEmailPage = async ({ searchParams }: VerifyEmailPageProps) => {
  const query = await searchParams
  const email = typeof query.email === 'string' ? query.email : undefined
  const invitationToken = typeof query.invitation === 'string' ? query.invitation : undefined
  const status = query.status === 'invalid' ? 'invalid' : undefined

  return <VerifyEmail email={email} invitationToken={invitationToken} status={status} />
}

export default VerifyEmailPage
