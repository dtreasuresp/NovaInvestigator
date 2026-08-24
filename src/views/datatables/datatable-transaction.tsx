'use client'

import { useState, useMemo } from 'react'

import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/hooks/use-i18n'

import { usePagination } from '@/hooks/use-pagination'

export type Item = {
  id: string
  avatar: string
  avatarFallback: string
  name: string
  email: string
  amount: number
  status: 'pending' | 'processing' | 'paid' | 'failed'
  paidBy: 'mastercard' | 'visa'
}

const TransactionDatatable = ({ data }: { data: Item[] }) => {
  const { t } = useI18n()
  const pageSize = 5

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize
  })

  const columns = useMemo<ColumnDef<Item>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => <span>{t('users.colUser') || 'Cliente'}</span>,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Avatar className='size-9'>
              <AvatarImage src={row.original.avatar} alt={row.original.name} />
              <AvatarFallback className='text-xs'>{row.original.avatarFallback}</AvatarFallback>
            </Avatar>
            <div className='flex flex-col text-sm'>
              <span className='text-card-foreground font-medium'>{row.getValue('name')}</span>
              <span className='text-muted-foreground'>{row.original.email}</span>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'amount',
        header: () => <span>{t('datatables.amount') || 'Importe'}</span>,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue('amount'))

          const formatted = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
          }).format(amount)

          return <span>{formatted}</span>
        }
      },
      {
        accessorKey: 'status',
        header: () => <span>{t('common.status') || 'Estado'}</span>,
        cell: ({ row }) => (
          <Badge className='bg-primary/10 text-primary h-auto rounded-sm px-1.5 capitalize'>{row.getValue('status')}</Badge>
        )
      },
      {
        accessorKey: 'paidBy',
        header: () => <span className='w-fit'>{t('datatables.paidBy')}</span>,
        cell: ({ row }) => (
          <img
            src={
              row.getValue('paidBy') === 'mastercard' ? '/images/datatable/image-1.webp' : '/images/datatable/image-2.webp'
            }
            alt={t('datatables.paymentPlatform')}
            className='w-10.5'
          />
        )
      },
      {
        id: 'actions',
        header: () => <span>{t('common.actions')}</span>,
        cell: () => <RowActions />,
        size: 60,
        enableHiding: false
      }
    ],
    [t]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination
    }
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2
  })

  return (
    <div className='w-full'>
      <div className='border-b'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} className='text-muted-foreground h-14 first:pl-4'>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className='first:pl-4'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-4 p-4'>
        <p className='text-muted-foreground text-sm'>
          <span>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
            {Math.min(
              Math.max(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                0
              ),
              table.getRowCount()
            )}
          </span>{' '}
          de <span>{table.getRowCount().toString()} registros</span>
        </p>

        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label={t('datatables.previousPage')}
                >
                  <ChevronLeftIcon aria-hidden='true' />
                  {t('common.previous') || 'Anterior'}
                </Button>
              </PaginationItem>

              {showLeftEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {pages.map(page => {
                const isActive = page === table.getState().pagination.pageIndex + 1

                return (
                  <PaginationItem key={page}>
                    <Button
                      size='icon'
                      className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                      onClick={() => table.setPageIndex(page - 1)}
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
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label={t('datatables.nextPage')}
                >
                  {t('common.next') || 'Siguiente'}
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}

export default TransactionDatatable

function RowActions() {
  const { t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size='icon' variant='ghost' aria-label={t('datatables.edit')} />}>
        <EllipsisVerticalIcon className='size-5' aria-hidden='true' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <span>{t('users.editRole')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span>{t('datatables.duplicate')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem variant='destructive'>
            <span>{t('datatables.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
