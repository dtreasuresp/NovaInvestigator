'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Components Import
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import LoginForm from '@/views/pages/auth/login/login-form'

// SVG Import
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

interface LoginProps {
  returnToBilling?: boolean
  invitationToken?: string
}

const Login = ({ returnToBilling = false, invitationToken }: LoginProps) => {
  const { t } = useI18n()
  const [isMagicLink, setIsMagicLink] = useState(false)

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
              {isMagicLink ? 'Sign in with Magic Link in NovaStore' : 'Sign in to NovaStore'}
            </CardTitle>
            <CardDescription className='text-base'>
              {isMagicLink
                ? 'We will send a sign-in link to your verified email address.'
                : 'The smart way to manage your future.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <p className='text-muted-foreground mb-6 text-base'>
            {isMagicLink ? 'Prefer password? ' : 'Login with '}
            <button
              type='button'
              onClick={() => setIsMagicLink(!isMagicLink)}
              className='text-card-foreground font-medium hover:underline focus:outline-none'
            >
              {isMagicLink ? 'Password' : 'Magic Link'}
            </button>
          </p>

          {/* Login Form */}
          <div className='space-y-4'>
            <LoginForm
              returnToBilling={returnToBilling}
              invitationToken={invitationToken}
              isMagicLink={isMagicLink}
            />

            <p className='text-muted-foreground text-center text-base'>
              New on our platform?{' '}
              <Link href='/pages/auth/register' className='text-card-foreground hover:underline'>
                Create an account
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

export default Login
