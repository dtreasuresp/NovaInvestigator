'use client'

// Third-party Imports
import { InboxIcon } from 'lucide-react'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { Email } from '@/types/apps/mail-types'

// Component Imports
import { ScrollArea } from '@/components/ui/scroll-area'
import MailItem from './mail-item'

interface MailListProps {
  emails: Email[]
  selectedEmailId: string | null
  onEmailSelect: (email: Email) => void
}

const MailList = ({ emails, selectedEmailId, onEmailSelect }: MailListProps) => {
  const { t } = useI18n()

  if (emails.length === 0) {
    return (
      <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center'>
        <InboxIcon className='text-muted-foreground/40 size-9' />
        <p className='text-foreground text-sm font-medium'>{t('mail.noMessages') || 'No hay correos'}</p>
        <p className='text-xs'>{t('mail.folderEmpty') || 'Esta carpeta está vacía.'}</p>
      </div>
    )
  }

  return (
    <ScrollArea className='min-h-0 flex-1'>
      <div className='flex flex-col p-3 pt-0'>
        {emails.map(email => (
          <MailItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={() => onEmailSelect(email)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

export default MailList
