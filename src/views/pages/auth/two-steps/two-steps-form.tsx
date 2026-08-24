'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

import { getAuthMessage } from '../auth-message'

const TwoStepsV1Form = () => {
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleVerify = async () => {
    if (code.length !== 6) return

    setError(null)
    setPending(true)

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { messageKey?: string } }

      if (!response.ok) {
        setError(payload.error?.messageKey ?? 'auth.mfaVerificationFailed')
        setCode('')

        return
      }

      // MFA verified → redirect to home
      router.replace('/')
      router.refresh()
    } catch {
      setError('auth.networkError')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      method='POST'
      action='#'
      onSubmit={e => {
        e.preventDefault()
        handleVerify()
      }}
    >
      <FieldGroup className='gap-4'>
        <Field className='gap-4'>
          <FieldLabel htmlFor='mfaCode' className='text-base'>
            Verification Code*
          </FieldLabel>

          <InputOTP
            id='mfaCode'
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={value => {
              setCode(value)

              // Auto-submit when 6 digits entered — caller must still
              // trigger handleVerify; onComplete is purely a convenience.
            }}
          >
            <InputOTPGroup className='w-full justify-center gap-4 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border'>
              <InputOTPSlot index={0} className='input-size-lg' />
              <InputOTPSlot index={1} className='input-size-lg' />
              <InputOTPSlot index={2} className='input-size-lg' />
              <InputOTPSlot index={3} className='input-size-lg' />
              <InputOTPSlot index={4} className='input-size-lg' />
              <InputOTPSlot index={5} className='input-size-lg' />
            </InputOTPGroup>
          </InputOTP>
        </Field>

        {error ? (
          <div role='alert'>
            <p className='text-destructive text-sm'>{getAuthMessage(error, 'The verification code is incorrect. Check your authenticator and try again.')}</p>
          </div>
        ) : null}

        <Field>
          <Button size='lg' className='w-full' type='submit' disabled={pending || code.length !== 6}>
            {pending ? 'Verifying…' : 'Verify'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default TwoStepsV1Form
