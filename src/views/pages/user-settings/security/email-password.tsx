'use client'

// React Imports
import { useMemo, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Third-party Imports
import { CheckIcon, EyeIcon, EyeOffIcon, MailIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getAuthMessage } from '@/views/pages/auth/auth-message'
import { useI18n } from '@/hooks/use-i18n'

const requirements = [
  { regex: /.{12,}/, text: 'At least 12 characters' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  {
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/,
    text: 'At least 1 special character'
  }
]

const EmailPass = () => {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { t } = useI18n()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [pending, setPending] = useState(false)
  const [forgotPending, setForgotPending] = useState(false)
  const [editingEnabled, setEditingEnabled] = useState(false)

  const toggleVisibility = () => setIsVisible(prevState => !prevState)

  const strength = useMemo(
    () =>
      requirements.map(req => ({
        met: req.regex.test(newPassword),
        text: req.text
      })),
    [newPassword]
  )

  const strengthScore = useMemo(() => strength.filter(req => req.met).length, [strength])

  const getColor = (score: number) => {
    if (score === 0) return 'bg-border'
    if (score <= 2) return 'bg-destructive'
    if (score <= 4) return 'bg-amber-500'

    return 'bg-green-600 dark:bg-green-400'
  }

  const getText = (score: number) => {
    if (score === 0) return 'Enter a password'
    if (score <= 2) return 'Weak password'
    if (score <= 4) return 'Medium password'

    return 'Strong password'
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingEnabled) return

    if (strengthScore < requirements.length) {
      toast.error('La nueva contraseña no cumple con los requisitos de seguridad.')

      return
    }

    setPending(true)

    try {
      const response = await fetch('/api/user/password/request-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { message?: string; code?: string } }

      if (!response.ok) {
        toast.error(
          payload.error?.message ??
            getAuthMessage(payload.error?.code ?? 'auth.invalidCredentials', 'No se pudo procesar la solicitud de cambio de contraseña.')
        )

        return
      }

      toast.success(
        'Hemos enviado un correo de verificación a tu dirección registrada. Por favor, confirma el enlace para finalizar el cambio de contraseña.'
      )
      setCurrentPassword('')
      setNewPassword('')
      setEditingEnabled(false)
    } catch {
      toast.error(getAuthMessage('auth.networkError', 'Error de red al procesar la solicitud.'))
    } finally {
      setPending(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!user?.email) {
      toast.error('No se pudo identificar el correo electrónico del usuario.')

      return
    }

    setForgotPending(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })

      const payload = (await response.json()) as { ok?: boolean; message?: string; error?: { message?: string } }

      if (!response.ok) {
        toast.error(payload.error?.message ?? 'No se pudo enviar el correo de restablecimiento.')

        return
      }

      toast.success('Correo de recuperación enviado con éxito. Revisa tu bandeja de entrada.')
    } catch {
      toast.error(getAuthMessage('auth.networkError', 'Network error.'))
    } finally {
      setForgotPending(false)
    }
  }

  return (
    <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
      {/* Vertical Tabs List */}
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{t('userSettings.emailPasswordTitle')}</h3>
        <p className='text-muted-foreground text-sm'>{t('userSettings.emailPasswordDesc')}</p>
      </div>

      {/* Content */}
      <div className='lg:col-span-2 space-y-6'>
        <form onSubmit={handleChangePassword} className='mx-auto space-y-6'>
          {/* Authenticated Email */}
          <div className='w-full space-y-2'>
            <Label htmlFor='email' className='gap-1'>
              Email<span className='text-destructive'>*</span>
            </Label>
            <InputGroup>
              <InputGroupInput
                id='email'
                type='email'
                value={user?.email ?? ''}
                readOnly
                disabled
                className='bg-muted/50 font-medium'
              />
              <InputGroupAddon align='inline-end' className='pr-2.75'>
                <MailIcon className='size-4 text-muted-foreground' />
                <span className='sr-only'>{t('auth.email')}</span>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* Enable Password Editing Toggle */}
          {!editingEnabled ? (
            <div className='rounded-lg border bg-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div className='space-y-1'>
                <p className='text-sm font-medium'>{t('userSettings.changePassword')}</p>
                <p className='text-xs text-muted-foreground'>
                  {t('userSettings.accountManagementDesc')}
                </p>
              </div>
              <Button type='button' variant='outline' size='sm' onClick={() => setEditingEnabled(true)}>
                {t('common.edit')}
              </Button>
            </div>
          ) : null}

          {/* Current Password */}
          <div className='w-full space-y-2'>
            <Label htmlFor='current-password' className='gap-1'>
              {t('userSettings.currentPassword')}<span className='text-destructive'>*</span>
            </Label>
            <InputGroup>
              <InputGroupInput
                id='current-password'
                type={isVisible ? 'text' : 'password'}
                placeholder={t('userSettings.currentPassword')}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                disabled={!editingEnabled || pending}
                required
              />
              <InputGroupAddon align='inline-end' className='pr-1.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={toggleVisibility}
                  disabled={!editingEnabled}
                  className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
                >
                  {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                  <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* New Password */}
          <div className='w-full space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='new-password' className='gap-1'>
                {t('userSettings.newPassword')}<span className='text-destructive'>*</span>
              </Label>
              {/* Forgot password link below new password field */}
              <button
                type='button'
                onClick={handleForgotPassword}
                disabled={forgotPending}
                className='text-xs text-primary hover:underline font-medium focus:outline-none'
              >
                {forgotPending ? '...' : t('auth.forgotPassword')}
              </button>
            </div>
            <InputGroup className='mb-3'>
              <InputGroupInput
                id='new-password'
                type={isVisible ? 'text' : 'password'}
                placeholder={t('userSettings.newPassword')}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={!editingEnabled || pending}
                required
              />
              <InputGroupAddon align='inline-end' className='pr-1.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={toggleVisibility}
                  disabled={!editingEnabled}
                  className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
                >
                  {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                  <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
                </Button>
              </InputGroupAddon>
            </InputGroup>

            <div className='mb-4 flex h-1 w-full gap-1'>
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-full flex-1 rounded-full transition-all duration-500 ease-out',
                    index < strengthScore ? getColor(strengthScore) : 'bg-border'
                  )}
                />
              ))}
            </div>

            <p className='text-foreground text-sm font-medium'>{getText(strengthScore)}. Must contain:</p>

            <ul className='mb-4 space-y-1.5'>
              {strength.map((req, index) => (
                <li key={index} className='flex items-center gap-2'>
                  {req.met ? (
                    <CheckIcon className='size-4 text-green-600 dark:text-green-400' />
                  ) : (
                    <XIcon className='text-muted-foreground size-4' />
                  )}
                  <span
                    className={cn('text-xs', req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}
                  >
                    {req.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className='mt-6 flex justify-end gap-3'>
            <Button
              type='submit'
              disabled={!editingEnabled || pending || !currentPassword || !newPassword}
              className='max-sm:w-full'
            >
              {pending ? 'Enviando verificación…' : 'Enviar correo de verificación para cambio de contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailPass
