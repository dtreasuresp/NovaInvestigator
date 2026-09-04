'use client'

// Third-party Imports
import { EllipsisVerticalIcon, UserIcon, UserRoundCheckIcon } from 'lucide-react'
import Link from 'next/link'

// Components Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useUserProfileData } from '../use-user-profile-data'
import { useI18n } from '@/hooks/use-i18n'

type ConnectionsProps = {
  className?: string
}

const connectionActions = ['Compartir', 'Sugerir cambios', 'Reportar']

function Connections({ className }: ConnectionsProps) {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <Card className={cn(className)}>
        <CardHeader className='flex items-center justify-between'>
          <Skeleton className='h-5 w-28' />
          <Skeleton className='size-6 rounded-full' />
        </CardHeader>
        <CardContent className='flex flex-1 flex-col gap-4'>
          {[1, 2, 3].map(i => (
            <div key={i} className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-10 rounded-full' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-28' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </div>
              <Skeleton className='size-8 rounded-md' />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const rawConnections = data.connections || []

  const connections = rawConnections.slice(0, 5).map(c => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatar: c.avatar || undefined,
    totalConnections: `${c.stats.connections} Connections`,
    isConnected: c.isConnected
  }))

  return (
    <Card className={cn(className)}>
      <CardHeader className='flex items-center justify-between'>
        <span className='text-lg font-medium'>{t('userProfile.tabConnections')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full' />}
          >
            <EllipsisVerticalIcon />
            <span className='sr-only'>{t('common.actions')}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32'>
            <DropdownMenuGroup>
              {connectionActions.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col justify-between gap-4'>
        {connections.length === 0 ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            No hay otras conexiones en esta organización.
          </div>
        ) : (
          connections.map(connection => (
            <div key={connection.id} className='flex items-center justify-between gap-2'>
              <div className='flex items-center justify-between gap-4'>
                <Avatar size='lg'>
                  {connection.avatar ? <AvatarImage src={connection.avatar} alt={connection.name} /> : null}
                  <AvatarFallback>{connection.initials}</AvatarFallback>
                </Avatar>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-base font-medium'>{connection.name}</span>
                  <span className='text-muted-foreground text-sm'>{connection.totalConnections}</span>
                </div>
              </div>
              <Button size='icon' variant={connection.isConnected ? 'default' : 'outline'}>
                {connection.isConnected ? <UserRoundCheckIcon /> : <UserIcon />}
              </Button>
            </div>
          ))
        )}
      </CardContent>
      {connections.length > 0 && (
        <CardContent>
          <Button variant='outline' render={<Link href='/pages/user-profile?view=connections' />} nativeButton={false} className='w-full'>
            View All Connections
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

export default Connections
