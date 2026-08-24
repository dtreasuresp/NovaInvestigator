'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'

interface InvitationAcceptProps {
  token: string
  authenticated: boolean
}

type AcceptState = 'loading' | 'unauthenticated' | 'success' | 'error'

const InvitationAccept = ({ token, authenticated }: InvitationAcceptProps) => {
  const { t } = useI18n()
  const router = useRouter()

  const [state, setState] = useState<AcceptState>(
    token ? (authenticated ? 'loading' : 'unauthenticated') : 'error'
  )

  const [message, setMessage] = useState<string | null>(token ? null : 'El enlace de invitación no es válido.')

  useEffect(() => {
    if (!token || !authenticated) return

    let cancelled = false

    const accept = async () => {
      try {
        const response = await fetch('/api/auth/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        if (cancelled) return

        if (response.status === 401) {
          setState('unauthenticated')

          return
        }

        if (!response.ok) {
          setState('error')
          setMessage('La invitación no es válida, ha expirado o no corresponde a esta cuenta.')

          return
        }

        setState('success')
        router.replace('/')
        router.refresh()
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage('No se pudo procesar la invitación. Inténtalo de nuevo.')
        }
      }
    }

    void accept()

    return () => {
      cancelled = true
    }
  }, [authenticated, router, token])

  const loginPath = `/pages/auth/login?returnTo=invite&token=${encodeURIComponent(token)}`
  const registerPath = `/pages/auth/register?invitation=${encodeURIComponent(token)}`

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
            <CardTitle className='mb-2 text-2xl font-semibold'>{t('invitations.pendingTitle') || 'Invitación al Espacio de Trabajo'}</CardTitle>
            <CardDescription className='text-base'>
              {state === 'unauthenticated'
                ? 'Inicia sesión con el correo invitado para continuar.'
                : state === 'success'
                  ? 'Invitación aceptada.'
                  : 'Validando tu invitación...'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 px-6'>
          {state === 'loading' ? <p className='text-muted-foreground text-sm'>{t('common.loading')}</p> : null}
          {state === 'error' ? (
            <p className='text-destructive text-sm' role='alert'>
              {message}
            </p>
          ) : null}
          {state === 'unauthenticated' ? (
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button className='flex-1' render={<Link href={loginPath} />} nativeButton={false}>
                {t('auth.login')}
              </Button>
              <Button variant='outline' className='flex-1' render={<Link href={registerPath} />} nativeButton={false}>
                {t('auth.createAccount')}
              </Button>
            </div>
          ) : null}
          {state === 'error' ? (
            <Button variant='outline' render={<Link href='/' />} nativeButton={false}>
              {t('common.back')}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvitationAccept
