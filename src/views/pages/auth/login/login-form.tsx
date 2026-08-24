'use client'

// Rect Import
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Third-party Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Components Import
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import { getAuthMessage } from '../auth-message'
import { useI18n } from '@/hooks/use-i18n'

interface LoginFormProps {
  returnToBilling?: boolean
  invitationToken?: string
  isMagicLink?: boolean
}

const LoginForm = ({ returnToBilling = false, invitationToken, isMagicLink = false }: LoginFormProps) => {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [guestTrialPending, setGuestTrialPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [guestTrialError, setGuestTrialError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const router = useRouter()

  // Security: Clean any sensitive credentials accidentally present in the URL query string
  useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('password=')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('password')
      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
    }
  })

  const nextPath = invitationToken
    ? `/pages/auth/invitations/accept?token=${encodeURIComponent(invitationToken)}`
    : returnToBilling
      ? '/pages/pricing?onboarding=1'
      : '/dashboard/investigations'

  const startGuestTrial = async () => {
    setGuestTrialError(null)
    setGuestTrialPending(true)

    try {
      const response = await fetch('/api/guest-trial/start', {
        method: 'POST',
        headers: { Accept: 'application/json' }
      })

      const payload = (await response.json()) as {
        guestTrial?: { status?: string }
        error?: { messageKey?: string }
      }

      if (!response.ok || payload.guestTrial?.status !== 'active') {
        setGuestTrialError(payload.error?.messageKey ?? 'billing.trialUnavailable')

        return
      }

      router.replace('/dashboard/investigations')
      router.refresh()
    } catch {
      setGuestTrialError('billing.trialUnavailable')
    } finally {
      setGuestTrialPending(false)
    }
  }

  return (
    <form
      method='POST'
      action='#'
      onSubmit={async event => {
        event.preventDefault()
        setError(null)
        setSuccess(null)
        setPending(true)

        const formData = new FormData(event.currentTarget)
        const email = String(formData.get('email') ?? '')

        setSubmittedEmail(email)

        if (isMagicLink) {
          try {
            const response = await fetch('/api/auth/magic-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            })

            const payload = (await response.json()) as {
              ok?: boolean
              messageKey?: string
              error?: { messageKey?: string }
            }

            if (!response.ok) {
              setError(payload.error?.messageKey ?? 'auth.loginFailed')

              return
            }

            setSuccess(payload.messageKey ?? 'auth.magicLinkSent')
          } catch {
            setError('auth.networkError')
          } finally {
            setPending(false)
          }

          return
        }

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: formData.get('password')
            })
          })

          const payload = (await response.json()) as {
            ok?: boolean
            mfaRequired?: boolean
            error?: { messageKey?: string }
          }

          if (!response.ok) {
            setError(payload.error?.messageKey ?? 'auth.loginFailed')

            return
          }

          // MFA required → redirect to two-steps verification screen
          if (payload.mfaRequired) {
            router.replace('/pages/auth/two-steps')

            return
          }

          router.replace(nextPath)
          router.refresh()
        } catch {
          setError('auth.networkError')
        } finally {
          setPending(false)
        }
      }}
    >
      <FieldGroup className='gap-4'>
        {/* Email */}
        <Field className='gap-2'>
          <FieldLabel htmlFor='userEmail' className='leading-5'>
            {t('auth.email')} *
          </FieldLabel>
          <Input type='email' id='userEmail' name='email' placeholder={t('auth.emailPlaceholder')} required />
        </Field>
        {/* Password (Hidden in Magic Link mode) */}
        {!isMagicLink ? (
          <>
            <Field className='w-full gap-2'>
              <FieldLabel htmlFor='password' className='leading-5'>
                {t('auth.password')} *
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id='password'
                  name='password'
                  type={isVisible ? 'text' : 'password'}
                  placeholder='••••••••••••••••'
                  required
                />
                <InputGroupAddon align='inline-end' className='pr-1.5'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsVisible(prevState => !prevState)}
                    className='text-muted-foreground rounded-l-none hover:bg-transparent'
                  >
                    {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                    <span className='sr-only'>{isVisible ? 'Ocultar contraseña' : 'Ver contraseña'}</span>
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            {/* Remember Me and Forgot Password */}
            <div className='flex items-center justify-between gap-y-2'>
              <Field orientation='horizontal' className='flex items-center gap-2'>
                <Checkbox id='rememberMe' />
                <FieldLabel htmlFor='rememberMe' className='text-muted-foreground'>
                  {' '}
                  {t('auth.rememberMe')}
                </FieldLabel>
              </Field>
              <Link href='/pages/auth/forgot-password' className='text-base text-nowrap hover:underline'>
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </>
        ) : null}
        <Field>
          <Button className='w-full' type='submit' disabled={pending}>
            {pending
              ? isMagicLink
                ? 'Enviando enlace...'
                : 'Iniciando sesión...'
              : isMagicLink
                ? 'Enviar Magic Link'
                : t('auth.signIn')}
          </Button>
        </Field>
        {success ? (
          <div className='rounded-md bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400' role='status'>
            <p className='text-sm font-medium'>{getAuthMessage(success, 'Magic Link enviado con éxito.')}</p>
          </div>
        ) : null}
        {error ? (
          <div className='space-y-2' role='alert'>
            <p className='text-destructive text-sm'>{getAuthMessage(error, 'No se pudo completar la solicitud.')}</p>
            {error === 'auth.emailNotConfirmed' || error === 'auth.userNotFoundOrUnverified' ? (
              <div className='flex flex-wrap items-center gap-3 text-sm'>
                <Link
                  href={
                    submittedEmail
                      ? `/pages/auth/verify-email?email=${encodeURIComponent(submittedEmail)}${
                          invitationToken ? `&invitation=${encodeURIComponent(invitationToken)}` : ''
                        }`
                      : '/pages/auth/verify-email'
                  }
                  className='underline underline-offset-4'
                >
                  Reenviar correo de confirmación
                </Link>
                <span className='text-muted-foreground'>•</span>
                <Link href='/pages/auth/register' className='underline underline-offset-4'>
                  {t('auth.createAccount')}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className='space-y-2'>
          <Button
            className='w-full'
            type='button'
            variant='outline'
            disabled={pending || guestTrialPending}
            onClick={() => void startGuestTrial()}
          >
            {guestTrialPending ? 'Iniciando prueba...' : t('auth.guestTrial') || 'Probar como invitado'}
          </Button>
          <p className='text-muted-foreground text-center text-xs'>
            Prueba la plataforma sin necesidad de registrar una cuenta.
          </p>
          {guestTrialError ? (
            <p className='text-destructive text-center text-sm' role='alert'>
              {guestTrialError}
            </p>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
