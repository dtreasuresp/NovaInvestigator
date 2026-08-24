'use client'

// Component Imports
import { AlertCircleIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { UserPagination } from './user-pagination'
import { UserTable } from './user-table'
import { UserTableFilters } from './user-table-filters'
import { UserTableToolbar } from './user-table-toolbar'
import { ManageMemberSheet } from '@/views/apps/users/dialogs/manage-member-sheet'

// Hook Imports
import { useUserApp } from '@/hooks/use-user-app'
import { useI18n } from '@/hooks/use-i18n'

const UserListApp = () => {
  const { t } = useI18n()
  const {
    filters,
    paginatedUsers,
    totalPages,
    totalFilteredCount,
    showingFrom,
    showingTo,
    rowsPerPage,
    currentPage,
    sorting,
    loading,
    error,
    mutating,
    sheetMode,
    editingMember,
    handleFilterChange,
    handleSearchChange,
    handleRowsPerPageChange,
    handlePageChange,
    handleSortingChange,
    handleOpenAddSheet,
    handleOpenEditSheet,
    handleCloseSheet,
    handleInviteMember,
    handleUpdateMemberRole,
    handleDisableMember,
    handleEnableMember,
    refresh,
    workspaces,
    workspacesLoading
  } = useUserApp()

  return (
    <div className='flex flex-col gap-3 lg:gap-6'>
      <Card className='py-0 shadow-none'>
        <div className='w-full'>
          <div className='border-b'>
            <UserTableFilters filters={filters} onFilterChange={handleFilterChange} />
            <UserTableToolbar
              search={filters.search}
              rowsPerPage={rowsPerPage}
              onSearch={handleSearchChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              onAddUser={handleOpenAddSheet}
            />

            {error ? (
              <div className='p-6 pt-0'>
                <Alert variant='destructive'>
                  <AlertCircleIcon />
                  <AlertTitle>{t('common.error')}</AlertTitle>
                  <AlertDescription>
                    <button type='button' className='underline underline-offset-2' onClick={() => void refresh()}>
                      {t('common.refresh')}
                    </button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : loading ? (
              <div className='flex flex-col gap-3 p-6 pt-0'>
                {Array.from({ length: 5 }).map((_, index) => (
                   
                  <Skeleton key={index} className='h-14 w-full' />
                ))}
              </div>
            ) : (
              <UserTable
                paginatedUsers={paginatedUsers}
                totalPages={totalPages}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                onEdit={member => handleOpenEditSheet(member.id)}
                onDisable={member => void handleDisableMember(member)}
                onEnable={member => void handleEnableMember(member)}
                disabled={mutating}
              />
            )}
          </div>

          <UserPagination
            showingFrom={showingFrom}
            showingTo={showingTo}
            total={totalFilteredCount}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </Card>

      <ManageMemberSheet
        mode={sheetMode}
        member={editingMember}
        submitting={mutating}
        workspaces={workspaces}
        workspacesLoading={workspacesLoading}
        onClose={handleCloseSheet}
        onInvite={handleInviteMember}
        onUpdateRole={handleUpdateMemberRole}
      />
    </div>
  )
}

export default UserListApp
