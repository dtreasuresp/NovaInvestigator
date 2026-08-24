import Register from '@/views/pages/auth/register'

interface RegisterPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const RegisterPage = async ({ searchParams }: RegisterPageProps) => {
  const query = await searchParams
  const invitationToken = typeof query.invitation === 'string' ? query.invitation : undefined

  return <Register invitationToken={invitationToken} />
}

export default RegisterPage
