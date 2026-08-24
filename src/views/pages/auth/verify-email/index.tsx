'use client'

import { useState } from 'react'

import Link from 'next/link'

import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/hooks/use-i18n'

import { getAuthMessage } from '../auth-message'

interface VerifyEmailProps {
  email?: string
  invitationToken?: string
  status?: 'invalid'
}

const VerifyEmail = ({ email: initialEmail = '', invitationToken, status }: VerifyEmailProps) => {
  const { t } = useI18n()
  const [email, setEmail] = useState(initialEmail)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [invalidLink, setInvalidLink] = useState(status === 'invalid')

  const loginPath = invitationToken
    ? `/pages/auth/login?returnTo=invite&token=${encodeURIComponent(invitationToken)}`
    : '/pages/auth/login'

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-md'>
        <CardHeader className='gap-6 px-6'>
          <Link href='/'>
            <Logo className='justify-center gap-3' />
          </Link>

          <div className='text-center'>
            <CardTitle className='mb-2 text-2xl font-semibold'>{t('auth.verifyEmail') || 'Verifica tu correo electrónico'}</CardTitle>
            <CardDescription className='text-base'>
              {email
                ? `Enviamos un enlace de confirmación a ${email}. Confírmalo antes de iniciar sesión.`
                : 'Ingresa tu dirección de correo y te enviaremos un enlace de confirmación.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <form
            method='POST'
            action='#'
            onSubmit={async event => {
              event.preventDefault()
              setMessage(null)
              setError(null)
              setInvalidLink(false)
              setPending(true)

              try {
                const response = await fetch('/api/auth/resend-confirmation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, invitationToken })
                })

                const payload = (await response.json()) as { error?: { messageKey?: string }; messageKey?: string }

                if (!response.ok) {
                  setError(payload.error?.messageKey ?? 'auth.confirmationEmailFailed')

                  return
                }

                setMessage(payload.messageKey ?? 'auth.confirmationEmailSent')
              } catch {
                setError('auth.networkError')
              } finally {
                setPending(false)
              }
            }}
          >
            <FieldGroup className='gap-4'>
              <Field className='gap-2'>
                <FieldLabel htmlFor='userEmail' className='leading-5'>
                  {t('auth.email')} *
                </FieldLabel>
                <Input
                  type='email'
                  id='userEmail'
                  name='email'
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete='email'
                  required
                />
              </Field>
              <Field>
                <Button className='w-full' type='submit' disabled={pending}>
                  {pending ? 'Enviando...' : 'Reenviar correo de confirmación'}
                </Button>
              </Field>
              {message ? (
                <p className='text-sm' role='status'>
                  {getAuthMessage(message, 'Correo de confirmación enviado correctamente.')}
                </p>
              ) : null}
              {error ? (
                <p className='text-destructive text-sm' role='alert'>
                  {getAuthMessage(error, 'No pudimos enviar el correo de confirmación.')}
                </p>
              ) : null}
              {invalidLink ? (
                <p className='text-destructive text-sm' role='alert'>
                  El enlace de confirmación es inválido o ha expirado. Por favor solicita uno nuevo.
                </p>
              ) : null}
            </FieldGroup>
          </form>

          <div className='mt-6 text-center text-sm'>
            <Link href={loginPath} className='underline underline-offset-4'>
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmail
