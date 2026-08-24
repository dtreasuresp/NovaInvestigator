'use client'

// React Imports
import { useMemo, useState } from 'react'

// Type Imports
import type { AppUser } from '@/types/apps/user-types'

// Component Imports
import { Card, CardContent } from '@/components/ui/card'
import { ActivityTimeline } from '@/views/apps/users/view/activity-timeline'
import { ProjectsDatatable } from '@/views/apps/users/view/projects-datatable'
import { useI18n } from '@/hooks/use-i18n'

// Hook Imports
import { usePagination } from '@/hooks/use-pagination'

const PAGE_SIZE = 5

export interface AccountTabProps {
  user: AppUser
}

export function AccountTab({ user }: AccountTabProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const activityLog = user.activityLog ?? []

  const filteredProjects = useMemo(() => {
    const projects = user.projects ?? []
    const query = search.trim().toLowerCase()

    if (!query) {
      return projects
    }

    return projects.filter(project => project.name.toLowerCase().includes(query))
  }, [user.projects, search])

  const totalProjects = filteredProjects.length
  const totalPages = Math.max(1, Math.ceil(totalProjects / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProjects = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE

    return filteredProjects.slice(start, start + PAGE_SIZE)
  }, [filteredProjects, safeCurrentPage])

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safeCurrentPage,
    totalPages,
    paginationItemsToDisplay: 2
  })

  const showingFrom = totalProjects === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safeCurrentPage * PAGE_SIZE, totalProjects)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  return (
    <div className='space-y-6'>
      <Card className='gap-0 py-0'>
        <ProjectsDatatable
          projects={paginatedProjects}
          search={search}
          totalProjects={totalProjects}
          showingFrom={showingFrom}
          showingTo={showingTo}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          pages={pages}
          showLeftEllipsis={showLeftEllipsis}
          showRightEllipsis={showRightEllipsis}
          onSearchChange={handleSearchChange}
          onPageChange={setCurrentPage}
        />
      </Card>

      <Card>
        <CardContent>
          <div className='flex items-center'>
            <span className='text-lg font-medium'>{t('userProfile.activityTimelineTitle') || 'Línea de Actividad'}</span>
          </div>
          <div>
            {activityLog.length === 0 ? (
              <p className='text-muted-foreground py-4 text-sm'>{t('common.noData') || 'Sin actividad registrada aún'}</p>
            ) : (
              <ActivityTimeline activityLog={activityLog} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
