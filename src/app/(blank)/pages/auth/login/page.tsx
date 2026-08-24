import Login from '@/views/pages/auth/login'

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const query = await searchParams
  const invitationToken = query.returnTo === 'invite' && typeof query.token === 'string' ? query.token : undefined

  return <Login returnToBilling={query.returnTo === 'billing'} invitationToken={invitationToken} />
}

export default LoginPage
