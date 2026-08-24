'use client'

// React Imports
import { useState } from 'react'

// Third-party Imports
import { EllipsisVerticalIcon, StarIcon, UsersIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfileData } from '../use-user-profile-data'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

const teamActions = ['Compartir', 'Sugerir cambios', 'Reportar']

function TeamsTab() {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading || !data) {
    return (
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className='flex flex-col justify-between'>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-10 rounded-full' />
                  <Skeleton className='h-4 w-32' />
                </div>
                <div className='flex items-center gap-1'>
                  <Skeleton className='size-8 rounded-full' />
                  <Skeleton className='size-8 rounded-full' />
                </div>
              </div>
              <Skeleton className='h-12 w-full rounded-md' />
              <div className='flex items-center justify-between'>
                <Skeleton className='h-6 w-20' />
                <Skeleton className='h-6 w-16' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const rawTeams = data.teams || []

  const teams = rawTeams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || 'Equipo de trabajo asignado dentro de la organización.',
    avatar: t.avatar || null,
    members: t.memberAvatars || [],
    extraCount: Math.max(0, (t.memberAvatars?.length || 0) - 3),
    tags: t.tags || [],
    isFavorite: t.isFavorite || false
  }))

  if (teams.length === 0) {
    return (
      <Card className='col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 border-dashed'>
        <div className='p-3 bg-muted rounded-full text-muted-foreground'>
          <UsersIcon className='size-8' />
        </div>
        <div className='space-y-1 max-w-md'>
          <h3 className='text-base font-medium'>{t('userSettings.noTeamsRegistered')}</h3>
          <p className='text-muted-foreground text-sm'>
            Aún no se han configurado equipos adicionales dentro de los espacios de trabajo de esta organización.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {teams.map(team => {
        const isFav = favorites[team.id] ?? team.isFavorite

        return (
          <Card key={team.id} className='flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md'>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-3'>
                  <Avatar size='default'>
                    {team.avatar ? <AvatarImage src={team.avatar} alt={team.name} /> : null}
                    <AvatarFallback className='text-xs font-medium bg-muted text-foreground'>
                      {team.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className='text-base font-medium'>{team.name}</span>
                </div>

                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => toggleFavorite(team.id)}
                    className={cn(
                      'text-muted-foreground size-8 rounded-full',
                      isFav && 'text-amber-500 hover:text-amber-600'
                    )}
                  >
                    <StarIcon className={cn('size-4', isFav && 'fill-current')} />
                    <span className='sr-only'>{t('userProfile.favorite')}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant='ghost' size='icon' className='text-muted-foreground size-8 rounded-full' />}
                    >
                      <EllipsisVerticalIcon className='size-4' />
                      <span className='sr-only'>{t('users.colActions')}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-32'>
                      <DropdownMenuGroup>
                        {teamActions.map((action, idx) => (
                          <DropdownMenuItem key={idx}>{action}</DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className='text-muted-foreground text-sm leading-relaxed'>
                {team.description}
              </p>

              <div className='flex items-center justify-between gap-2 pt-2'>
                <AvatarGroup>
                  {team.members.slice(0, 3).map((member, index) => (
                    <Avatar key={`${team.id}-mem-${index}`} className='ring-background ring-2' size='sm'>
                      {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} /> : null}
                      <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
                    </Avatar>
                  ))}
                  {team.extraCount ? <AvatarGroupCount>+{team.extraCount}</AvatarGroupCount> : null}
                </AvatarGroup>

                <div className='flex flex-wrap gap-1.5 justify-end'>
                  {team.tags.map((tag, idx) => (
                    <Badge key={idx} variant='outline' className='h-6 px-3 py-1 text-xs'>
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default TeamsTab
