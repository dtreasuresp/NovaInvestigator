'use client'

// Third-party Imports
import { EllipsisVerticalIcon, FolderKanbanIcon, MessageSquareIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar'
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
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfileData } from '../use-user-profile-data'
import { useI18n } from '@/hooks/use-i18n'

const projectActions = ['Compartir', 'Sugerir cambios', 'Reportar']

function ProjectsTab() {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className='flex flex-col justify-between'>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-10 rounded-full' />
                  <div className='space-y-1.5'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                </div>
                <Skeleton className='size-8 rounded-full' />
              </div>
              <Skeleton className='h-12 w-full rounded-md' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-3 w-full rounded-full' />
              <div className='flex items-center justify-between'>
                <Skeleton className='h-6 w-20' />
                <Skeleton className='h-4 w-12' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const rawProjects = data.projects || []

  const projects = rawProjects.map(p => ({
    id: p.id,
    name: p.name,
    client: p.client,
    budget: p.budget,
    startDate: p.startDate,
    deadline: p.deadline,
    description: p.description,
    allHours: p.allHours,
    daysLeft: p.daysLeft,
    tasksCount: p.tasksCount,
    totalTasks: p.totalTasks,
    progressPercent: p.progressPercent,
    teamMembers: p.teamMembers || [],
    commentsCount: p.commentsCount
  }))

  if (projects.length === 0) {
    return (
      <Card className='col-span-full py-16 flex flex-col items-center justify-center text-center gap-3 border-dashed'>
        <div className='p-3 bg-muted rounded-full text-muted-foreground'>
          <FolderKanbanIcon className='size-8' />
        </div>
        <div className='space-y-1 max-w-md'>
          <h3 className='text-base font-medium'>{t('userSettings.noProjectsRegistered')}</h3>
          <p className='text-muted-foreground text-sm'>
            Aún no se han creado investigaciones estratégicas o proyectos operativos en este espacio de trabajo.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {projects.map(project => (
        <Card
          key={project.id}
          className='flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md'
        >
          <CardContent className='flex flex-col gap-4'>
            {/* Header: Brand Icon, Name, Client, 3-dots */}
            <div className='flex items-start justify-between gap-2'>
              <div className='flex items-center gap-3'>
                <Avatar size='default'>
                  <AvatarFallback className='text-xs font-medium bg-muted text-foreground'>
                    {project.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <span className='text-base font-medium'>{project.name}</span>
                  <span className='text-muted-foreground text-xs'>{project.client}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant='ghost' size='icon' className='text-muted-foreground size-8 rounded-full' />}
                >
                  <EllipsisVerticalIcon className='size-4' />
                  <span className='sr-only'>{t('users.colActions')}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-32'>
                  <DropdownMenuGroup>
                    {projectActions.map((action, idx) => (
                      <DropdownMenuItem key={idx}>{action}</DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Metrics Box: Budget & Dates */}
            <div className='flex items-center justify-between gap-2 rounded-md bg-muted/40 p-3'>
              <div className='flex flex-col'>
                <span className='text-sm font-medium'>{project.budget}</span>
                <span className='text-muted-foreground text-xs'>{t('userProfile.assessmentBudget')}</span>
              </div>
              <div className='flex flex-col text-right'>
                <span className='text-xs text-muted-foreground'>Inicio: {project.startDate}</span>
                <span className='text-xs text-muted-foreground'>Límite: {project.deadline}</span>
              </div>
            </div>

            {/* Description */}
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {project.description}
            </p>

            {/* Hours & Days Left */}
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground text-xs'>Horas estimadas: {project.allHours}</span>
              <Badge variant='outline' className='h-6 px-3 py-1 text-xs'>
                {project.daysLeft}
              </Badge>
            </div>

            {/* Tasks Progress Bar */}
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>Tareas: {project.tasksCount}/{project.totalTasks}</span>
                <span>{project.progressPercent}% Completado</span>
              </div>
              <Progress
                value={project.progressPercent}
                className='*:data-[slot=progress-track]:h-1.5'
              />
            </div>

            {/* Footer: Member Avatars & Comments */}
            <div className='flex items-center justify-between gap-2 pt-2 border-t'>
              <div className='flex items-center gap-2'>
                <AvatarGroup>
                  {project.teamMembers.slice(0, 3).map((member, index) => (
                    <Avatar key={`${project.id}-team-${index}`} className='ring-background ring-2' size='sm'>
                      {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} /> : null}
                      <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
                <span className='text-muted-foreground text-xs'>
                  {project.teamMembers.length > 0 ? `${project.teamMembers.length} miembros` : 'Equipo asignado'}
                </span>
              </div>

              <div className='flex items-center gap-1 text-muted-foreground text-xs'>
                <MessageSquareIcon className='size-3.5' />
                <span>{project.commentsCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ProjectsTab
