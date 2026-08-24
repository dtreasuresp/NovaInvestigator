'use client'

// Next Imports
import Link from 'next/link'

// Component Imports
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import TwoStepsForm from '@/views/pages/auth/two-steps/two-steps-form'
import { useI18n } from '@/hooks/use-i18n'

// SVG Imports
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

const TwoSteps = () => {
  const { t } = useI18n()

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 overflow-clip py-6 sm:max-w-md'>
        <CardHeader className='px-6'>
          <Link href='/'>
            <Logo className='gap-3' />
          </Link>
        </CardHeader>

        <CardContent className='space-y-6 px-6'>
          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>{t('auth.twoStepVerification') || 'Verificación en Dos Pasos'}</CardTitle>
            <CardDescription className='text-base'>
              Por favor confirma el acceso a tu cuenta introduciendo el código proporcionado por tu aplicación autenticadora.
            </CardDescription>
          </div>

          {/* TwoSteps Form */}
          <TwoStepsForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default TwoSteps
