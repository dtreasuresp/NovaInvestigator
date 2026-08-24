'use client'

// Third-party Imports
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'

// Hook Imports
import { usePagination } from '@/hooks/use-pagination'
import { useI18n } from '@/hooks/use-i18n'

export interface UserPaginationProps {
  showingFrom: number
  showingTo: number
  total: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function UserPagination({
  showingFrom,
  showingTo,
  total,
  currentPage,
  totalPages,
  onPageChange
}: UserPaginationProps) {
  const { t } = useI18n()
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 2
  })

  return (
    <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
      <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
        {t('common.showingEntries', { from: showingFrom, to: showingTo, total })}
      </p>

      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                className='disabled:pointer-events-none disabled:opacity-50'
                variant='ghost'
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label={t('common.previous')}
              >
                <ChevronLeftIcon aria-hidden='true' />
                <span className='max-sm:hidden'>{t('common.previous')}</span>
              </Button>
            </PaginationItem>

            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pages.map(page => {
              const isActive = page === currentPage

              return (
                <PaginationItem key={page}>
                  <Button
                    size='icon'
                    className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                    onClick={() => onPageChange(page)}
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label={t('common.next')}
              >
                <span className='max-sm:hidden'>{t('common.next')}</span>
                <ChevronRightIcon aria-hidden='true' />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
