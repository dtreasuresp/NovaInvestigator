'use client'

// React Imports
import { useState } from 'react'

// Third-party Imports
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon
} from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'

import { useMfaStatus } from '@/hooks/use-mfa'
import { getAuthMessage } from '@/views/pages/auth/auth-message'
import { useI18n } from '@/hooks/use-i18n'

interface EnrollData {
  factorId: string
  secret: string
  uri?: string
  qrCode: string
}

interface RecoveryCodesData {
  generationId: string
  codes: string[]
}

const TwoFactor = () => {
  const { t } = useI18n()
  const { status, loading, error: statusError, refresh } = useMfaStatus()

  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCodesData | null>(null)
  const [recoveryPending, setRecoveryPending] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [recoveryCopied, setRecoveryCopied] = useState(false)

  const isEnrolled = (status?.factors.length ?? 0) > 0

  // Start Enrollment process
  const handleStartEnroll = async () => {
    setActionError(null)
    setPending(true)

    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendlyName: 'Authenticator App' })
      })

      const payload = (await response.json()) as {
        ok?: boolean
        factor?: { id: string; secret: string; qrCode: string }
        error?: { messageKey?: string }
      }

      if (!response.ok || !payload.factor) {
        setActionError(payload.error?.messageKey ?? 'Unable to start MFA enrollment.')

        return
      }

      setEnrollData({
        factorId: payload.factor.id,
        secret: payload.factor.secret,
        qrCode: payload.factor.qrCode
      })

      setEnrolling(true)
    } catch {
      setActionError('Network error starting enrollment.')
    } finally {
      setPending(false)
    }
  }

  // Confirm Enrollment with 6-digit code
  const handleConfirmEnroll = async () => {
    if (!enrollData || verificationCode.length !== 6) return

    setActionError(null)
    setPending(true)

    try {
      const response = await fetch('/api/auth/mfa/enroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: enrollData.factorId,
          code: verificationCode
        })
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { messageKey?: string } }

      if (!response.ok) {
        const errorMsg = payload.error?.messageKey ?? 'The verification code is incorrect.'

        setActionError(errorMsg)
        toast.error(getAuthMessage(errorMsg, 'The verification code is incorrect.'))
        setVerificationCode('')

        return
      }

      setEnrolling(false)
      setEnrollData(null)
      setVerificationCode('')
      toast.success('Two-factor authentication enabled.')
      await refresh()
    } catch {
      setActionError('Network error confirming verification.')
      toast.error('Network error confirming verification.')
    } finally {
      setPending(false)
    }
  }

  // Disable / Unenroll MFA
  const handleDisableMfa = async () => {
    const factorId = status?.factors[0]?.id

    if (!factorId) return

    setActionError(null)
    setPending(true)

    try {
      const response = await fetch('/api/auth/mfa/unenroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId })
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { messageKey?: string } }

      if (!response.ok) {
        const errorMsg = payload.error?.messageKey ?? 'Unable to disable two-factor authentication.'

        setActionError(errorMsg)
        toast.error(getAuthMessage(errorMsg, 'Unable to disable two-factor authentication.'))

        return
      }

      setRecoveryCodes(null)
      setRecoveryCopied(false)
      setRecoveryError(null)
      toast.success('Two-factor authentication disabled.')
      await refresh()
    } catch {
      setActionError('Network error disabling two-factor authentication.')
      toast.error('Network error disabling two-factor authentication.')
    } finally {
      setPending(false)
    }
  }

  const handleGenerateRecoveryCodes = async () => {
    setRecoveryError(null)
    setRecoveryCopied(false)
    setRecoveryPending(true)

    try {
      const response = await fetch('/api/auth/mfa/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true })
      })

      const payload = (await response.json()) as {
        ok?: boolean
        recovery?: { generationId?: string; codes?: string[] }
        error?: { messageKey?: string }
      }

      const generationId = payload.recovery?.generationId
      const codes = payload.recovery?.codes

      if (
        !response.ok ||
        typeof generationId !== 'string' ||
        !Array.isArray(codes) ||
        codes.length === 0 ||
        !codes.every(code => typeof code === 'string')
      ) {
        const errorMsg = getAuthMessage(payload.error?.messageKey ?? '', 'Unable to generate recovery codes. Please try again.')

        setRecoveryError(errorMsg)
        toast.error(errorMsg)

        return
      }

      setRecoveryCodes({ generationId, codes })
      toast.success('Recovery codes generated.')
    } catch {
      setRecoveryError('Network error generating recovery codes.')
      toast.error('Network error generating recovery codes.')
    } finally {
      setRecoveryPending(false)
    }
  }

  const handleCopyRecoveryCodes = async () => {
    if (!recoveryCodes) return

    setRecoveryError(null)

    try {
      await navigator.clipboard.writeText(recoveryCodes.codes.join('\n'))
      setRecoveryCopied(true)
      toast.success('Recovery codes copied to clipboard.')
    } catch {
      setRecoveryError('Could not copy recovery codes. Select and copy them manually.')
      toast.error('Could not copy recovery codes. Select and copy them manually.')
    }
  }

  const handleCopySecret = async () => {
    if (!enrollData?.secret) return

    await navigator.clipboard.writeText(enrollData.secret)
    setCopied(true)
    toast.success('Secret key copied to clipboard.')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.twoFactorTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.twoFactorDesc')}</p>
        </div>
        <div className='flex items-center justify-center p-8 lg:col-span-2'>
          <Loader2Icon className='text-muted-foreground size-6 animate-spin' />
        </div>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
      {/* Title Column */}
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{t('userSettings.twoFactorTitle')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('userSettings.twoFactorDesc')}
        </p>
      </div>

      {/* Content Column */}
      <div className='space-y-6 lg:col-span-2'>
        {statusError ? (
          <Alert variant='destructive'>
            <AlertTriangleIcon className='size-4' />
            <AlertTitle>{t('common.error')}</AlertTitle>
            <AlertDescription>{t('userSettings.twoFactorLoadError') || 'No se pudo cargar el estado de autenticación de dos factores. Por favor, recarga la página.'}</AlertDescription>
          </Alert>
        ) : null}

        {actionError ? (
          <Alert variant='destructive'>
            <AlertTriangleIcon className='size-4' />
            <AlertTitle>{t('common.error')}</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {/* State 1: Enrolling in progress */}
        {enrolling && enrollData ? (
          <Card>
            <CardHeader>
              <CardTitle className='text-lg font-semibold'>{t('userSettings.twoFactorTitle')}</CardTitle>
              <CardDescription>
                Escanea el código QR con tu aplicación de autenticación (Google Authenticator, 1Password, Authy) e introduce el código de 6 dígitos.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* QR Code */}
              <div className='bg-background flex flex-col items-center justify-center gap-4 rounded-lg border p-4'>
                <img src={enrollData.qrCode} alt='QR' className='size-48 rounded-md' />
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <KeyRoundIcon className='size-4' />
                  <span className='text-foreground font-mono font-medium select-all'>{enrollData.secret}</span>
                  <Button type='button' variant='ghost' size='icon' className='size-7' onClick={handleCopySecret}>
                    {copied ? <CheckIcon className='size-4 text-green-600' /> : <CopyIcon className='size-4' />}
                  </Button>
                </div>
              </div>

              {/* Code Verification Input */}
              <div className='space-y-2'>
                <Label htmlFor='enrollCode'>{t('auth.password')}</Label>
                <div className='flex justify-center'>
                  <InputOTP id='enrollCode' maxLength={6} value={verificationCode} onChange={setVerificationCode}>
                    <InputOTPGroup className='gap-2'>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className='flex justify-end gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setEnrolling(false)
                    setEnrollData(null)
                    setVerificationCode('')
                  }}
                  disabled={pending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type='button' onClick={handleConfirmEnroll} disabled={pending || verificationCode.length !== 6}>
                  {pending ? '...' : t('common.confirm')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isEnrolled ? (

          /* State 2: Enrolled / Active */
          <Card>
            <CardHeader className='flex flex-row items-center gap-4 space-y-0'>
              <div className='flex size-10 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400'>
                <ShieldCheckIcon className='size-6' />
              </div>
              <div>
                <CardTitle className='text-base font-semibold'>{t('userSettings.twoFactorTitle')}</CardTitle>
                <CardDescription>{t('userSettings.twoFactorDesc')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='bg-muted/30 text-muted-foreground space-y-1 rounded-lg border p-4 text-sm'>
                <p className='text-foreground font-medium'>{t('userSettings.activeFactors') || 'Factores de verificación activos:'}</p>
                {status?.factors.map(f => (
                  <div key={f.id} className='flex items-center justify-between text-xs'>
                    <span>{f.friendlyName || t('userSettings.authenticatorApp') || 'App Autenticadora'}</span>
                    <span suppressHydrationWarning>{t('common.addedOn') || 'Agregado'} {new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>

              <Card className='border-amber-500/30'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                    <KeyRoundIcon className='size-4' />
                    {t('userSettings.twoFactorTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('userSettings.twoFactorDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <Alert>
                    <ShieldAlertIcon className='size-4' />
                    <AlertTitle>{t('userSettings.twoFactorTitle')}</AlertTitle>
                    <AlertDescription>
                      Cada código solo puede utilizarse una vez. Al generar nuevos códigos se invalidarán los anteriores.
                    </AlertDescription>
                  </Alert>

                  {status?.currentLevel !== 'aal2' ? (
                    <Alert>
                      <ShieldAlertIcon className='size-4' />
                      <AlertTitle>{t('common.status')}</AlertTitle>
                      <AlertDescription>
                        Completa la verificación MFA en esta sesión antes de generar o sustituir códigos de recuperación.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {recoveryError ? (
                    <Alert variant='destructive'>
                      <AlertTriangleIcon className='size-4' />
                      <AlertTitle>{t('common.error')}</AlertTitle>
                      <AlertDescription>{recoveryError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {recoveryCodes ? (
                    <div className='space-y-3' role='status' aria-live='polite'>
                      <div className='bg-background grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-2'>
                        {recoveryCodes.codes.map(code => (
                          <code
                            key={code}
                            className='bg-muted/30 rounded border px-3 py-2 text-center font-mono text-sm'
                          >
                            {code}
                          </code>
                        ))}
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <p className='text-muted-foreground text-xs'>
                          Keep this page open until you have stored all ten codes.
                        </p>
                        <Button type='button' variant='outline' onClick={handleCopyRecoveryCodes}>
                          {recoveryCopied ? (
                            <>
                              <CheckIcon className='mr-2 size-4 text-green-600' />
                              Copied
                            </>
                          ) : (
                            <>
                              <CopyIcon className='mr-2 size-4' />
                              Copy all codes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className='flex justify-end'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleGenerateRecoveryCodes}
                      disabled={pending || recoveryPending || status?.currentLevel !== 'aal2'}
                    >
                      {recoveryPending ? (
                        <>
                          <Loader2Icon className='mr-2 size-4 animate-spin' />
                          Generating…
                        </>
                      ) : recoveryCodes ? (
                        'Regenerate recovery codes'
                      ) : (
                        'Generate recovery codes'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className='flex justify-end'>
                <Button type='button' variant='destructive' onClick={handleDisableMfa} disabled={pending}>
                  {pending ? 'Disabling…' : 'Disable Two Factor Authentication'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (

          /* State 3: Not Enrolled */
          <Card>
            <CardHeader className='flex flex-row items-center gap-4 space-y-0'>
              <div className='flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                <ShieldAlertIcon className='size-6' />
              </div>
              <div>
                <CardTitle className='text-base font-semibold'>
                  You have not enabled Two Factor Authentication
                </CardTitle>
                <CardDescription>
                  Two-factor authentication adds an additional layer of security to your account by requiring more than
                  just a password to log in.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button type='button' onClick={handleStartEnroll} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2Icon className='mr-2 size-4 animate-spin' /> Starting…
                  </>
                ) : (
                  'Enable Two Factor Authentication'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TwoFactor
