'use client'

// Third-party Imports
import { CheckSquareIcon, LayoutGridIcon } from 'lucide-react'

// Type Imports
import type { AppUser, UserStatus } from '@/types/apps/user-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'

// Config Imports
import { getInitialsFromName } from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

const STATUS_DOT_STYLES: Record<UserStatus, string> = {
  Active: 'bg-green-500',
  Pending: 'bg-amber-500',
  Suspended: 'bg-destructive',
  Inactive: 'bg-muted-foreground'
}

const formatCompactNumber = (value: number | undefined): string => {
  if (value === undefined) {
    return '—'
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}k`
  }

  return String(value)
}

export interface UserViewLeftPanelProps {
  user: AppUser
  onEdit: () => void
}

export function UserViewLeftPanel({ user, onEdit }: UserViewLeftPanelProps) {
  const { t } = useI18n()

  const detailRows = [
    { label: t('userSettings.username') || 'Usuario', value: user.username ?? '—' },
    { label: t('auth.email') || 'Correo', value: user.email },
    { label: t('common.status') || 'Estado', value: user.status, isStatus: true },
    { label: t('userSettings.role') || 'Rol', value: user.role },
    { label: t('userSettings.taxId') || 'Identificación Fiscal', value: user.taxId ?? '—' },
    { label: t('forms.phone') || 'Contacto', value: user.contact ?? '—' },
    { label: t('userSettings.language') || 'Idioma', value: user.language ?? '—' },
    { label: t('forms.country') || 'País', value: user.country ?? '—' }
  ] as const

  return (
    <Card className='overflow-y-auto lg:sticky lg:top-20 lg:h-[calc(100dvh-7.5rem)]'>
      <CardContent className='space-y-6 pt-6'>
        <div className='flex flex-col items-center text-center'>
          <Avatar className='size-24'>
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
            <AvatarFallback className='text-2xl'>{getInitialsFromName(user.name)}</AvatarFallback>
          </Avatar>
          <h2 className='mt-4 line-clamp-4 text-xl font-semibold'>{user.name}</h2>
          <Badge variant='secondary' className='mt-2'>
            {user.role}
          </Badge>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className='bg-muted/40 flex flex-col items-center rounded-lg border p-4 text-center'>
            <CheckSquareIcon className='text-primary mb-2 size-5' />
            <span className='text-lg font-semibold'>{formatCompactNumber(user.tasksDone)}</span>
            <span className='text-muted-foreground text-xs'>{t('userProfile.completedTasks') || 'Tareas Completadas'}</span>
          </div>
          <div className='bg-muted/40 flex flex-col items-center rounded-lg border p-4 text-center'>
            <LayoutGridIcon className='text-primary mb-2 size-5' />
            <span className='text-lg font-semibold'>{formatCompactNumber(user.projectsDone)}</span>
            <span className='text-muted-foreground text-xs'>{t('userProfile.doneProjects') || 'Proyectos Realizados'}</span>
          </div>
        </div>

        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>{t('userProfile.details') || 'Detalles'}</h3>
          <Separator />
          {detailRows.map(row => (
            <div key={row.label} className='flex items-center justify-between gap-4 text-sm'>
              <span className='text-muted-foreground'>{row.label}</span>
              {'isStatus' in row && row.isStatus ? (
                <span className='flex items-center gap-2 font-medium'>
                  <span className={cn('size-2 rounded-full', STATUS_DOT_STYLES[user.status])} />
                  {row.value}
                </span>
              ) : (
                <span className='truncate text-right font-medium'>{row.value}</span>
              )}
            </div>
          ))}
        </div>

        <div className='flex gap-2 max-sm:flex-col'>
          <Button className='sm:flex-1' onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <Button
            variant='outline'
            className='text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-1'
          >
            {t('users.deactivate') || 'Suspender'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
