'use client'

// Next Imports
import Link from 'next/link'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Component Import
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import RegisterForm from '@/views/pages/auth/register/register-form'

// SVG Import
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

interface RegisterProps {
  invitationToken?: string
}

const Register = ({ invitationToken }: RegisterProps) => {
  const { t } = useI18n()
  const isInvitation = Boolean(invitationToken)

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <Link href='/'>
            <Logo className='gap-3' />
          </Link>

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>
              {isInvitation ? 'Join your workspace' : 'Sign Up to Shadcn studio'}
            </CardTitle>
            <CardDescription className='text-base'>
              {isInvitation ? 'Create your account to accept this invitation.' : 'Ship Faster and Focus on Growth.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          {/* Register Form */}
          <div className='space-y-4'>
            <RegisterForm invitationToken={invitationToken} />

            <p className='text-muted-foreground text-center'>
              Already have an account?{' '}
              <Link
                href={
                  invitationToken
                    ? `/pages/auth/login?returnTo=invite&token=${encodeURIComponent(invitationToken)}`
                    : '/pages/auth/login'
                }
                className='text-card-foreground hover:underline'
              >
                Sign in instead
              </Link>
            </p>

            <div className='flex items-center gap-4'>
              <Separator className='flex-1' />
              <p className='text-base'>{t('common.or')}</p>
              <Separator className='flex-1' />
            </div>

            <Button variant='ghost' className='w-full' render={<Link href='#' />} nativeButton={false}>
              Sign in with google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register
