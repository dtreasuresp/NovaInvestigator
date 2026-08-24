'use client'

// React Imports
import { useMemo, useState } from 'react'

// Third-party Imports
import { ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from 'lucide-react'

// Type Imports
import type { ProfileProjectDatatableProps, ProjectDatatable } from '@/types/pages/user-profile-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Hook Imports
import { usePagination } from '@/hooks/use-pagination'
import { useUserProfileData } from '../use-user-profile-data'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { cn } from '@/lib/utils'

const PAGE_SIZE = 5

const PROJECT_PROGRESS_COLORS = [
  '**:data-[slot=progress-indicator]:bg-chart-1',
  '**:data-[slot=progress-indicator]:bg-chart-2',
  '**:data-[slot=progress-indicator]:bg-chart-3',
  '**:data-[slot=progress-indicator]:bg-chart-5'
]

const PROJECT_LOGO_COLORS = [
  'bg-primary/10 text-primary',
  'bg-chart-1/10 text-chart-1',
  'bg-chart-2/10 text-chart-2',
  'bg-chart-3/10 text-chart-3'
]

const getProjectInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getProjectLogoColor = (id: string): string => {
  const hash = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return PROJECT_LOGO_COLORS[hash % PROJECT_LOGO_COLORS.length]
}

const getProjectProgressColor = (id: string): string => {
  const hash = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return PROJECT_PROGRESS_COLORS[hash % PROJECT_PROGRESS_COLORS.length]
}

function ProjectTeamAvatars({ project }: { project: ProjectDatatable }) {
  const visibleTeam = project.team.slice(0, 3)

  return (
    <AvatarGroup>
      {visibleTeam.map((member, index) => (
        <Avatar key={`${project.id}-team-${index}`} className='ring-background ring-2' size='sm'>
          {member.avatar ? <AvatarImage src={member.avatar} alt={member.initials} /> : null}
          <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
        </Avatar>
      ))}
      {project.teamExtraCount ? <AvatarGroupCount>+{project.teamExtraCount}</AvatarGroupCount> : null}
    </AvatarGroup>
  )
}

function ProfileProjectDatatable({ className }: ProfileProjectDatatableProps) {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()
  const rawProjects = data?.projects || []

  const projectDatatable: ProjectDatatable[] = useMemo(() => {
    return rawProjects.map(p => ({
      id: p.id,
      name: p.name,
      type: p.client,
      logo: p.logo,
      logoDark: p.logo,
      leader: 'Investigador Principal',
      team: (p.teamMembers || []).map(m => ({ avatar: m.avatar, initials: m.initials })),
      teamExtraCount: Math.max(0, (p.teamMembers?.length || 0) - 3),
      progress: p.progressPercent
    }))
  }, [rawProjects])

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return projectDatatable
    }

    return projectDatatable.filter(project => project.name.toLowerCase().includes(query))
  }, [projectDatatable, search])

  const totalProjects = filteredProjects.length
  const totalPages = Math.max(1, Math.ceil(totalProjects / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProjects = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE

    return filteredProjects.slice(start, start + PAGE_SIZE)
  }, [filteredProjects, safeCurrentPage])

  const showingFrom = totalProjects === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safeCurrentPage * PAGE_SIZE, totalProjects)

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safeCurrentPage,
    totalPages,
    paginationItemsToDisplay: 2
  })

  const allSelected = paginatedProjects.length > 0 && paginatedProjects.every(project => selectedIds.has(project.id))
  const someSelected = paginatedProjects.some(project => selectedIds.has(project.id)) && !allSelected

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => new Set([...prev, ...paginatedProjects.map(project => project.id)]))

      return
    }

    setSelectedIds(prev => {
      const next = new Set(prev)

      paginatedProjects.forEach(project => next.delete(project.id))

      return next
    })
  }

  const handleSelectRow = (projectId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) {
        next.add(projectId)
      } else {
        next.delete(projectId)
      }

      return next
    })
  }

  return (
    <Card className={cn('w-full py-0', className)}>
      <div className='w-full'>
        <div className='border-b'>
          <div className='flex min-h-17 flex-wrap items-center justify-between gap-3 px-6 py-3'>
            <span className='text-base font-medium'>{t('userProfile.projectsTableTitle')}</span>
            <div>
              <Label htmlFor='search-profile-projects' className='sr-only'>
                {t('common.search')}
              </Label>
              <Input
                id='search-profile-projects'
                value={search}
                onChange={event => handleSearchChange(event.target.value)}
                placeholder={t('common.search')}
                type='text'
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className='h-17 border-t'>
                <TableHead className='text-muted-foreground w-12.5 pl-4'>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={value => handleSelectAll(!!value)}
                    aria-label={t('datatables.selectAll')}
                  />
                </TableHead>
                <TableHead className='text-muted-foreground'>{t('userProfile.tabProjects')}</TableHead>
                <TableHead className='text-muted-foreground'>{t('roles.colRole')}</TableHead>
                <TableHead className='text-muted-foreground'>{t('userProfile.tabTeams')}</TableHead>
                <TableHead className='text-muted-foreground'>{t('roles.colStatus')}</TableHead>
                <TableHead className='text-muted-foreground w-12 px-4 text-right'>{t('users.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell className='w-12.5 pl-4'>
                      <Skeleton className='size-4 rounded' />
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-4'>
                        <Skeleton className='size-8 rounded-md' />
                        <div className='space-y-1.5'>
                          <Skeleton className='h-4 w-32' />
                          <Skeleton className='h-3 w-20' />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-28' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-6 w-20' />
                    </TableCell>
                    <TableCell className='w-40'>
                      <Skeleton className='h-3 w-32' />
                    </TableCell>
                    <TableCell className='px-4 text-right'>
                      <Skeleton className='size-8 rounded-md ml-auto' />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='text-center py-8 text-muted-foreground'>
                    No hay proyectos o investigaciones creadas aún en este espacio de trabajo.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className='w-12.5 pl-4'>
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={value => handleSelectRow(project.id, !!value)}
                        aria-label={t('datatables.selectRow')}
                      />
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-4'>
                        <Avatar className='size-8 rounded-md after:border-none'>
                          {project.logo ? (
                            <>
                              <AvatarImage
                                src={project.logo}
                                alt={project.name}
                                className='rounded-md object-cover dark:hidden'
                              />
                              <AvatarImage
                                src={project.logoDark}
                                alt={project.name}
                                className='hidden rounded-md object-cover dark:block'
                              />
                            </>
                          ) : null}
                          <AvatarFallback className={cn('rounded-md text-xs', getProjectLogoColor(project.id))}>
                            {getProjectInitials(project.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col gap-1'>
                          <span>{project.name}</span>
                          <span className='text-muted-foreground text-xs'>{project.type}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='text-muted-foreground'>{project.leader}</span>
                    </TableCell>
                    <TableCell>
                      <ProjectTeamAvatars project={project} />
                    </TableCell>
                    <TableCell className='w-40'>
                      <div className='flex items-center gap-3'>
                        <Progress
                          value={project.progress}
                          className={cn('w-40 *:data-[slot=progress-track]:h-1.5', getProjectProgressColor(project.id))}
                        />
                        <span className='text-muted-foreground'>{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className='px-4 text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant='ghost' size='icon' aria-label={t('common.actions')} />}
                        >
                          <EllipsisVerticalIcon />
                          <span className='sr-only'>{t('common.actions')}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuGroup>
                            <DropdownMenuItem>{t('userProfile.details')}</DropdownMenuItem>
                            <DropdownMenuItem>{t('userProfile.archive')}</DropdownMenuItem>
                            <DropdownMenuItem variant='destructive'>{t('common.delete')}</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalProjects > 0 && (
          <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
            <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
              {t('users.showing', { from: String(showingFrom), to: String(showingTo), total: String(totalProjects) })}
            </p>

            <div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      className='disabled:pointer-events-none disabled:opacity-50'
                      variant='ghost'
                      onClick={() => setCurrentPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage <= 1}
                      aria-label={t('users.prev')}
                    >
                      <ChevronLeftIcon aria-hidden='true' />
                      {t('users.prev')}
                    </Button>
                  </PaginationItem>

                  {showLeftEllipsis && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {pages.map(page => {
                    const isActive = page === safeCurrentPage

                    return (
                      <PaginationItem key={page}>
                        <Button
                          size='icon'
                          className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                          onClick={() => setCurrentPage(page)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    )
                  })}

                  {showRightEllipsis && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <Button
                      className='disabled:pointer-events-none disabled:opacity-50'
                      variant='ghost'
                      onClick={() => setCurrentPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage >= totalPages}
                      aria-label={t('users.next')}
                    >
                      {t('users.next')}
                      <ChevronRightIcon aria-hidden='true' />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ProfileProjectDatatable
