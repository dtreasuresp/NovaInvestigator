'use client'

// React imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Third-party Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useI18n } from '@/hooks/use-i18n'

const ResetPasswordForm = () => {
  const { t } = useI18n()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  return (
    <form
      method='POST'
      action='#'
      onSubmit={async event => {
        event.preventDefault()
        setError(null)
        setMessage(null)
        setPending(true)

        const formData = new FormData(event.currentTarget)

        if (formData.get('password') !== formData.get('confirmPassword')) {
          setError('auth.passwordsDoNotMatch')
          setPending(false)

          return
        }

        try {
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: formData.get('password') })
          })

          const payload = (await response.json()) as { error?: { messageKey?: string }; messageKey?: string }

          if (!response.ok) {
            setError(payload.error?.messageKey ?? 'auth.passwordResetFailed')

            return
          }

          setMessage(payload.messageKey ?? 'auth.passwordReset')
          router.replace('/pages/auth/login')
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : 'auth.networkError')
        } finally {
          setPending(false)
        }
      }}
    >
      <FieldGroup className='gap-4'>
        {/* Email */}
        <Field>
          <FieldLabel className='leading-5' htmlFor='userEmail'>
            {t('auth.email')} *
          </FieldLabel>
          <Input type='email' id='userEmail' name='email' placeholder={t('auth.emailPlaceholder')} required />
        </Field>

        {/* Password */}
        <Field>
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
        <Field>
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
                type='button'
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

        <Field>
          <Button className='w-full' type='submit' disabled={pending}>
            {t('auth.resetPassword') || 'Establecer nueva contraseña'}
          </Button>
        </Field>
        {message ? (
          <p className='text-sm' role='status'>
            {message}
          </p>
        ) : null}
        {error ? (
          <p className='text-destructive text-sm' role='alert'>
            {error}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  )
}

export default ResetPasswordForm
