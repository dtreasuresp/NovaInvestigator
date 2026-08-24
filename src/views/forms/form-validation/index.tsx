'use client'

// Component Imports
import RegistrationForm from './registration-demo-form'
import ValidationModesDemo from './validation-demos'
import { useI18n } from '@/hooks/use-i18n'

const FormValidation = () => {
  const { t } = useI18n()

  return (
    <div className='flex flex-col gap-8'>
      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>{t('auth.register') || 'Formulario de Registro'}</h2>
        <RegistrationForm />
      </div>
      <ValidationModesDemo />
    </div>
  )
}

export default FormValidation
