'use client'

// React Import
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Third-party Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Component Import
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import { getAuthMessage } from '../auth-message'
import { useI18n } from '@/hooks/use-i18n'

interface RegisterFormProps {
  invitationToken?: string
}

const RegisterForm = ({ invitationToken }: RegisterFormProps) => {
  const { t } = useI18n()
  const isInvitation = Boolean(invitationToken)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <form
      method='POST'
      action='#'
      onSubmit={async event => {
        event.preventDefault()
        setError(null)
        setPending(true)

        const formData = new FormData(event.currentTarget)

        if (formData.get('password') !== formData.get('confirmPassword')) {
          setError('auth.passwordsDoNotMatch')
          setPending(false)

          return
        }

        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.get('name'),
              companyName: isInvitation ? undefined : formData.get('companyName'),
              email: formData.get('email'),
              password: formData.get('password'),
              invitationToken
            })
          })

          const payload = (await response.json()) as {
            error?: { messageKey?: string }
            emailConfirmationRequired?: boolean
          }

          if (!response.ok) {
            setError(payload.error?.messageKey ?? 'auth.registrationFailed')

            return
          }

          const invitationAcceptancePath = `/pages/auth/invitations/accept?token=${encodeURIComponent(invitationToken ?? '')}`
          const billingOnboardingPath = '/pages/pricing?onboarding=1'

          const confirmationParams = new URLSearchParams({
            email: String(formData.get('email') ?? '')
          })

          if (invitationToken) {
            confirmationParams.set('invitation', invitationToken)
          }

          const nextPath = payload.emailConfirmationRequired
            ? `/pages/auth/verify-email?${confirmationParams.toString()}`
            : isInvitation
              ? invitationAcceptancePath
              : billingOnboardingPath

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
        {!isInvitation ? (
          <Field className='gap-2'>
            <FieldLabel className='leading-5' htmlFor='companyName'>
              {t('forms.company')} *
            </FieldLabel>
            <Input type='text' id='companyName' name='companyName' placeholder={t('forms.companyPlaceholder')} required />
          </Field>
        ) : null}
        {/* Username */}
        <Field className='gap-2'>
          <FieldLabel className='leading-5' htmlFor='name'>
            {t('forms.name')} *
          </FieldLabel>
          <Input type='text' id='name' name='name' placeholder={t('forms.namePlaceholder')} required />
        </Field>
        {/* Email */}
        <Field className='gap-2'>
          <FieldLabel className='leading-5' htmlFor='userEmail'>
            {t('auth.email')} *
          </FieldLabel>
          <Input type='email' id='userEmail' name='email' placeholder={t('auth.emailPlaceholder')} required />
        </Field>
        {/* Password */}
        <Field className='w-full gap-2'>
          <FieldLabel className='leading-5' htmlFor='password'>
            {t('auth.password')} *
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='password'
              name='password'
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              required
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsPasswordVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {/* Confirm Password */}
        <Field className='w-full gap-2'>
          <FieldLabel className='leading-5' htmlFor='confirmPassword'>
            {t('auth.confirmPassword') || 'Confirmar Contraseña'} *
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='confirmPassword'
              name='confirmPassword'
              type={isConfirmPasswordVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              required
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setIsConfirmPasswordVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isConfirmPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {/* Privacy policy */}
        <Field orientation='horizontal' className='flex items-center gap-2'>
          <Checkbox id='privacyPolicy' />
          <FieldLabel htmlFor='privacyPolicy'>
            <span className='text-muted-foreground'>{t('auth.agreeTo') || 'Acepto la'}</span> <Link href='#'>{t('auth.termsAndPrivacy') || 'política de privacidad y términos'}</Link>
          </FieldLabel>
        </Field>
        <Field>
          <Button className='w-full' type='submit' disabled={pending}>
            {isInvitation ? (t('invitations.acceptAndJoin') || 'Crear cuenta y unirse al espacio') : t('auth.signUp')}
          </Button>
        </Field>
        {error ? (
          <p className='text-destructive text-sm' role='alert'>
            {getAuthMessage(error, 'No se pudo crear tu cuenta.')}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  )
}

export default RegisterForm
