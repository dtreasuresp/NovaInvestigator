'use client'

// Third-party Imports
import { EllipsisVerticalIcon, MailIcon, UserCheckIcon, UserPlus2Icon, UserRoundCheckIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfileData } from '../use-user-profile-data'
import { useI18n } from '@/hooks/use-i18n'

const connectionCardActions = ['Compartir', 'Sugerir cambios', 'Reportar']

function ConnectionsCard() {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card
            key={i}
            className='relative flex flex-col items-center justify-center p-6 gap-4'
          >
            <Skeleton className='size-24 rounded-full' />
            <div className='space-y-2 text-center w-full flex flex-col items-center'>
              <Skeleton className='h-5 w-32' />
              <Skeleton className='h-4 w-24' />
            </div>
            <div className='flex gap-2 justify-center'>
              <Skeleton className='h-6 w-16' />
              <Skeleton className='h-6 w-16' />
            </div>
            <Skeleton className='h-12 w-full rounded-md' />
            <div className='flex gap-3 justify-center w-full'>
              <Skeleton className='h-8 w-24 rounded-md' />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const rawConnections = data.connections || []

  const connectionCards = rawConnections.map(c => ({
    id: c.id,
    name: c.name,
    role: c.role,
    avatar: c.avatar || undefined,
    initials: c.initials,
    tags: Array.isArray(c.tags) ? c.tags.map(t => (typeof t === 'string' ? { label: t } : t)) : [],
    stats: c.stats || {
      projects: '0',
      tasks: '0',
      connections: '0'
    },
    isConnected: c.isConnected,
    email: c.email
  }))

  if (connectionCards.length === 0) {
    return (
      <Card className='col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 border-dashed'>
        <div className='p-3 bg-muted rounded-full text-muted-foreground'>
          <UserCheckIcon className='size-8' />
        </div>
        <div className='space-y-1 max-w-md'>
          <h3 className='text-base font-medium'>{t('userProfile.tabConnections')}</h3>
          <p className='text-muted-foreground text-sm'>
            Actualmente no hay otros colegas o miembros registrados en esta organización.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {connectionCards.map(connection => (
        <Card
          key={connection.id}
          className='relative flex flex-col items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-md'
        >
          <div className='absolute top-4 right-4 z-10'>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant='ghost' size='icon' className='text-muted-foreground size-8 rounded-full' />}
              >
                <EllipsisVerticalIcon className='size-4' />
                <span className='sr-only'>{t('users.colActions')}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuGroup>
                  {connectionCardActions.map(action => (
                    <DropdownMenuItem key={action}>{action}</DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent>
            <Avatar className='size-25'>
              {connection.avatar ? <AvatarImage src={connection.avatar} alt={connection.name} /> : null}
              <AvatarFallback>{connection.initials}</AvatarFallback>
            </Avatar>
          </CardContent>

          <CardContent className='text-center'>
            <h3 className='text-xl font-medium'>{connection.name}</h3>
            <p className='text-muted-foreground text-base'>{connection.role}</p>
          </CardContent>

          <CardContent className='flex flex-wrap items-center justify-center gap-2'>
            {connection.tags.map(tag => (
              <Badge key={`${connection.id}-${tag.label}`} variant='outline' className='h-6 px-3 py-1'>
                {tag.label}
              </Badge>
            ))}
          </CardContent>

          <CardContent className='flex w-full items-center justify-evenly gap-4'>
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.projects}</p>
              <p className='text-muted-foreground text-base'>{t('userProfile.tabProjects')}</p>
            </div>
            <Separator orientation='vertical' />
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.tasks}</p>
              <p className='text-muted-foreground text-base'>{t('pricingPage.featKanbanTasksMax')}</p>
            </div>
            <Separator orientation='vertical' />
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.connections}</p>
              <p className='text-muted-foreground text-base'>{t('userProfile.tabConnections')}</p>
            </div>
          </CardContent>

          <CardContent className='flex items-center gap-4'>
            <Button variant={connection.isConnected ? 'default' : 'outline'}>
              {connection.isConnected ? <UserRoundCheckIcon /> : <UserPlus2Icon />}
              {connection.isConnected ? t('userProfile.tabConnections') : 'Conectar'}
            </Button>
            {connection.email ? (
              <Button variant='outline' size='icon' render={<a href={`mailto:${connection.email}`} />}>
                <MailIcon />
              </Button>
            ) : (
              <Button variant='outline' size='icon'>
                <MailIcon />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ConnectionsCard
