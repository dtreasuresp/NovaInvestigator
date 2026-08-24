'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Component Import
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/hooks/use-i18n'

const ForgotPasswordForm = () => {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <form
      method='POST'
      action='#'
      onSubmit={async event => {
        event.preventDefault()
        setMessage(null)
        setError(null)
        setPending(true)

        const formData = new FormData(event.currentTarget)

        try {
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.get('email') })
          })

          const payload = (await response.json()) as { error?: { messageKey?: string }; messageKey?: string }

          if (!response.ok) {
            setError(payload.error?.messageKey ?? 'auth.passwordResetRequestFailed')

            return
          }

          setMessage(payload.messageKey ?? 'auth.passwordResetEmailSent')
          router.refresh()
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
        <Field>
          <Button className='w-full' type='submit' disabled={pending}>
            {t('auth.sendResetLink')}
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

export default ForgotPasswordForm
