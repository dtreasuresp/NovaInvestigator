'use client'

// Third-party Imports
import { EllipsisVerticalIcon } from 'lucide-react'
import Link from 'next/link'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

type TeamsProps = {
  className?: string
}

const teamActions = ['Compartir', 'Sugerir cambios', 'Reportar']

function Teams({ className }: TeamsProps) {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <Card className={cn(className)}>
        <CardHeader className='flex items-center justify-between'>
          <Skeleton className='h-5 w-24' />
          <Skeleton className='size-6 rounded-full' />
        </CardHeader>
        <CardContent className='flex flex-1 flex-col gap-4'>
          {[1, 2, 3].map(i => (
            <div key={i} className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <Skeleton className='size-10 rounded-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-28' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </div>
              <Skeleton className='h-6 w-16 rounded-full' />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const rawTeams = data.teams || []

  const teams = rawTeams.map(t => ({
    id: t.id,
    teams: t.name,
    initials: t.initials,
    avatar: t.avatar || undefined,
    totalMembers: `${t.totalMembers}`,
    teamBadge: {
      label: t.tags[0]?.label || 'General'
    }
  }))

  return (
    <Card className={cn(className)}>
      <CardHeader className='flex items-center justify-between'>
        <span className='text-lg font-medium'>{t('userProfile.tabTeams')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='icon' className='text-muted-foreground size-6 rounded-full' />}
          >
            <EllipsisVerticalIcon />
            <span className='sr-only'>{t('common.actions')}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32'>
            <DropdownMenuGroup>
              {teamActions.map((item, index) => (
                <DropdownMenuItem key={index}>{item}</DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col justify-between gap-4'>
        {teams.length === 0 ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            No hay equipos registrados en este espacio de trabajo.
          </div>
        ) : (
          teams.map(team => (
            <div key={team.id} className='flex items-center justify-between gap-2'>
              <div className='flex items-center justify-between gap-4'>
                <Avatar size='lg'>
                  {team.avatar ? <AvatarImage src={team.avatar} alt={team.teams} /> : null}
                  <AvatarFallback>{team.initials}</AvatarFallback>
                </Avatar>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-base font-medium'>{team.teams}</span>
                  <span className='text-muted-foreground text-sm'>{team.totalMembers}</span>
                </div>
              </div>
              <Badge variant='outline' className='h-6 px-2 py-1'>
                {team.teamBadge.label}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
      {teams.length > 0 && (
        <CardContent>
          <Button variant='outline' render={<Link href='/pages/user-profile?view=teams' />} nativeButton={false} className='w-full'>
            View All Teams
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

export default Teams
