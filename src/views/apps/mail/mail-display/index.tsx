'use client'

// Type Imports
import type { Email } from '@/types/apps/mail-types'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Component Imports
import { MailDisplayContent } from './mail-display-content'

export interface MailDisplayProps {
  email: Email | null
}

export const MailDisplay = ({ email }: MailDisplayProps) => {
  const { t } = useI18n()

  if (!email) {
    return (
      <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-10 text-center'>
        <p className='text-foreground text-sm font-medium'>{t('mail.noMessageSelected') || 'Ningún mensaje seleccionado'}</p>
        <p className='text-xs'>{t('mail.selectMessagePrompt') || 'Selecciona un correo de la lista para ver su contenido.'}</p>
      </div>
    )
  }

  return <MailDisplayContent key={email.id} email={email} />
}

export default MailDisplay
