'use client'

// React Imports
import type { ReactNode } from 'react'

// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  CrownIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  GaugeIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCheckIcon,
  UserRoundIcon,
  UserXIcon
} from 'lucide-react'

// Type Imports
import type { TenantMemberSummary } from '@/features/users/types'
import type { UserStatus } from '@/types/apps/user-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Config Imports
import { getInitialsFromName } from '@/configs/mailConfig'

// Hook Imports
import { membershipStatusToUiStatus } from '@/hooks/use-user-app'

// Util Imports
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<string, ReactNode> = {
  owner: <CrownIcon className='text-chart-5 size-4' />,
  admin: <UserRoundIcon className='size-4 text-green-600 dark:text-green-400' />,
  analyst: <ShieldCheckIcon className='text-chart-2 size-4' />,
  viewer: <EyeIcon className='text-chart-1 size-4' />
}

const STATUS_STYLES: Record<UserStatus, string> = {
  Active:
    'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
  Pending:
    'bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5',
  Suspended:
    'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive',
  Inactive:
    'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive'
}

export interface UserTableColumnHandlers {
  onEdit: (member: TenantMemberSummary) => void
  onDisable: (member: TenantMemberSummary) => void
  onEnable: (member: TenantMemberSummary) => void
  onSoftDelete?: (member: TenantMemberSummary) => void
  disabled?: boolean
  t?: (key: string, params?: Record<string, string | number>) => string
}

function MemberRowActions({
  member,
  onEdit,
  onDisable,
  onEnable,
  onSoftDelete,
  disabled,
  t = (key: string) => key
}: UserTableColumnHandlers & { member: TenantMemberSummary }) {
  const canEnable = member.status === 'suspended'
  const canDisable = member.status === 'active' || member.status === 'pending'
  const isOwner = member.roleKey === 'owner'

  return (
    <div className='flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              aria-label={t('users.editRole')}
              onClick={() => onEdit(member)}
              disabled={disabled}
            />
          }
        >
          <PencilIcon className='size-4' />
        </TooltipTrigger>
        <TooltipContent>{t('users.editRole')}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant='ghost' size='icon' aria-label={t('users.colActions')} disabled={disabled} />}
        >
          <EllipsisVerticalIcon className='size-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            {canEnable ? (
              <DropdownMenuItem onClick={() => onEnable(member)}>
                <UserCheckIcon className='size-4' />
                {t('users.enable')}
              </DropdownMenuItem>
            ) : null}
            {canDisable ? (
              <DropdownMenuItem variant='destructive' onClick={() => onDisable(member)}>
                <UserXIcon className='size-4' />
                {t('users.disable')}
              </DropdownMenuItem>
            ) : null}
            {!isOwner ? (
              <DropdownMenuItem
                variant='destructive'
                onClick={() => (onSoftDelete ? onSoftDelete(member) : onDisable(member))}
              >
                <Trash2Icon className='size-4' />
                {t('users.revokeMembership')}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function createUserTableColumns(handlers: UserTableColumnHandlers): ColumnDef<TenantMemberSummary>[] {
  const t = handlers.t ?? ((key: string) => key)

  const statusLabelMap: Record<UserStatus, string> = {
    Active: t('users.statusActive'),
    Pending: t('users.statusPending'),
    Suspended: t('users.statusSuspended'),
    Inactive: t('users.statusInactive')
  }

  return [
    {
      id: 'user',
      header: () => t('users.colUser'),
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Avatar className='size-9'>
            {row.original.avatarUrl ? <AvatarImage src={row.original.avatarUrl} alt={row.original.name} /> : null}
            <AvatarFallback className='text-xs'>{getInitialsFromName(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>{row.original.name}</span>
            <span className='text-muted-foreground'>{row.original.email ?? '—'}</span>
          </div>
        </div>
      ),
      size: 360,
      enableSorting: true
    },
    {
      id: 'role',
      header: () => t('users.colRole'),
      accessorKey: 'roleKey',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          {ROLE_ICONS[row.original.roleKey] ?? <GaugeIcon className='text-muted-foreground size-4' />}
          <span className='capitalize'>{row.original.roleName}</span>
        </div>
      ),
      enableSorting: true
    },
    {
      id: 'status',
      header: () => t('users.colStatus'),
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = membershipStatusToUiStatus(row.original.status)

        return (
          <Badge className={cn('h-auto rounded-sm border-none capitalize focus-visible:outline-none', STATUS_STYLES[status])}>
            {statusLabelMap[status] ?? status}
          </Badge>
        )
      },
      enableSorting: true
    },
    {
      id: 'joinedDate',
      header: () => t('users.colJoinedDate'),
      accessorKey: 'createdAt',
      cell: ({ row }) => <span>{format(new Date(row.original.createdAt), 'dd MMM yyyy')}</span>,
      enableSorting: true
    },
    {
      id: 'actions',
      header: () => t('users.colActions'),
      cell: ({ row }) => <MemberRowActions member={row.original} {...handlers} t={t} />,
      enableHiding: false,
      enableSorting: false
    }
  ]
}
