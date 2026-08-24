// Type Imports
import { SYSTEM_MEMBER_ROLE_KEYS } from '@/features/users/types'
import type { UserFilters, UserStatus } from '@/types/apps/user-types'

// Component Imports
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/hooks/use-i18n'

const STATUSES: UserStatus[] = ['Active', 'Pending', 'Suspended', 'Inactive']

export interface UserTableFiltersProps {
  filters: UserFilters
  onFilterChange: (filters: Partial<UserFilters>) => void
}

export function UserTableFilters({ filters, onFilterChange }: UserTableFiltersProps) {
  const { t } = useI18n()

  const statusLabelMap: Record<UserStatus, string> = {
    Active: t('users.statusActive'),
    Pending: t('users.statusPending'),
    Suspended: t('users.statusSuspended'),
    Inactive: t('users.statusInactive')
  }

  return (
    <div className='flex flex-col gap-4 border-b p-6'>
      <div className='grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2'>
        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-role'>{t('users.selectRole')}</Label>
          <Select
            value={filters.role}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ role: value })
              }
            }}
          >
            <SelectTrigger id='filter-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>{t('common.all')}</SelectItem>
                {SYSTEM_MEMBER_ROLE_KEYS.map(role => (
                  <SelectItem key={role} value={role} className='capitalize'>
                    {role}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-status'>{t('users.selectStatus')}</Label>
          <Select
            value={filters.status}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ status: value as UserFilters['status'] })
              }
            }}
          >
            <SelectTrigger id='filter-status' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>{t('common.all')}</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {statusLabelMap[status]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

