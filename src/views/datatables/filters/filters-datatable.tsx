import { useId, useMemo, useState } from 'react'

import type { Column, ColumnDef, ColumnFiltersState, RowData, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { SearchIcon } from 'lucide-react'

import { useI18n } from '@/hooks/use-i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select'
  }
}

export type Item = {
  id: string
  product: string
  productImage: string
  fallback: string
  price: number
  availability: 'In Stock' | 'Out of Stock' | 'Limited'
  rating: number
}

export const getColumns = (t: (key: string) => string): ColumnDef<Item>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('datatables.selectAll')}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label={t('datatables.selectRow')}
      />
    )
  },
  {
    header: 'Product',
    accessorKey: 'product',
    cell: ({ row }) => (
      <div className='flex items-center gap-3'>
        <Avatar className='rounded-sm'>
          <AvatarImage src={row.original.productImage} alt={row.original.fallback} />
          <AvatarFallback className='text-xs'>{row.original.fallback}</AvatarFallback>
        </Avatar>
        <div className='font-medium'>{row.getValue('product')}</div>
      </div>
    )
  },
  {
    header: 'Price',
    accessorKey: 'price',
    cell: ({ row }) => <div>${row.getValue('price')}</div>,
    enableSorting: false,
    meta: {
      filterVariant: 'range'
    }
  },
  {
    header: 'Availability',
    accessorKey: 'availability',
    cell: ({ row }) => {
      const availability = row.getValue('availability') as string

      const styles = {
        'In Stock':
          'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
        'Out of Stock':
          'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive',
        Limited:
          'bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5'
      }[availability]

      return <Badge className={styles}>{row.getValue('availability')}</Badge>
    },
    enableSorting: false,
    meta: {
      filterVariant: 'select'
    }
  },
  {
    header: 'Rating',
    accessorKey: 'rating',
    cell: ({ row }) => <div>{row.getValue('rating')}</div>,
    meta: {
      filterVariant: 'range'
    }
  }
]

export const columns: ColumnDef<Item>[] = getColumns((k: string) => k)

const DataTableFilters = ({ data }: { data: Item[] }) => {
  const { t } = useI18n()
  const tableColumns = useMemo(() => getColumns(t), [t])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'price',
      desc: false
    }
  ])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    onSortingChange: setSorting,
    enableSortingRemoval: false
  })

  return (
    <div className='w-full'>
      <div className='flex flex-wrap gap-3 px-4 py-6'>
        <div className='w-full sm:w-44'>
          <Filter column={table.getColumn('product')!} />
        </div>
        <div className='w-full sm:w-36'>
          <Filter column={table.getColumn('price')!} />
        </div>
        <div className='w-full sm:w-44'>
          <Filter column={table.getColumn('availability')!} />
        </div>
        <div className='w-full sm:w-36'>
          <Filter column={table.getColumn('rating')!} />
        </div>
      </div>
      <div className='border-t border-b'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='bg-muted/50'>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} className='relative h-10 select-none'>
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
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Filter({ column }: { column: Column<Item, unknown> }) {
  const { t } = useI18n()
  const id = useId()
  const columnFilterValue = column.getFilterValue()
  const { filterVariant } = column.columnDef.meta ?? {}
  const columnHeader = typeof column.columnDef.header === 'string' ? column.columnDef.header : ''
  const facetedUniqueValues = column.getFacetedUniqueValues()

  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === 'range') return []

    const values = Array.from(facetedUniqueValues.keys())

    const flattenedValues = values.reduce((acc: string[], curr) => {
      if (Array.isArray(curr)) {
        return [...acc, ...curr]
      }

      return [...acc, curr]
    }, [])

    return Array.from(new Set(flattenedValues)).sort()
  }, [facetedUniqueValues, filterVariant])

  if (filterVariant === 'range') {
    return (
      <div className='*:not-first:mt-2'>
        <Label>{columnHeader}</Label>
        <div className='flex'>
          <Input
            id={`${id}-range-1`}
            className='flex-1 rounded-r-none [-moz-appearance:textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
            value={(columnFilterValue as [number, number])?.[0] ?? ''}
            onChange={e =>
              column.setFilterValue((old: [number, number]) => [
                e.target.value ? Number(e.target.value) : undefined,
                old?.[1]
              ])
            }
            placeholder={t('datatables.min')}
            type='number'
            aria-label={`${columnHeader} ${t('datatables.min')}`}
          />
          <Input
            id={`${id}-range-2`}
            className='-ms-px flex-1 rounded-l-none [-moz-appearance:textfield] focus:z-10 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
            value={(columnFilterValue as [number, number])?.[1] ?? ''}
            onChange={e =>
              column.setFilterValue((old: [number, number]) => [
                old?.[0],
                e.target.value ? Number(e.target.value) : undefined
              ])
            }
            placeholder={t('datatables.max')}
            type='number'
            aria-label={`${columnHeader} ${t('datatables.max')}`}
          />
        </div>
      </div>
    )
  }

  if (filterVariant === 'select') {
    const selectItems = [
      { label: t('common.all'), value: 'all' },
      ...sortedUniqueValues.map(value => ({
        label: String(value),
        value: String(value)
      }))
    ]

    return (
      <div className='*:not-first:mt-2'>
        <Label htmlFor={`${id}-select`}>{columnHeader}</Label>
        <Select
          items={selectItems}
          value={columnFilterValue?.toString() ?? 'all'}
          onValueChange={value => {
            column.setFilterValue(value === 'all' ? undefined : value)
          }}
        >
          <SelectTrigger id={`${id}-select`} className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='p-1'>
            {selectItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className='*:not-first:mt-2'>
      <Label htmlFor={`${id}-input`}>{columnHeader}</Label>
      <div className='relative'>
        <Input
          id={`${id}-input`}
          className='peer pl-9'
          value={(columnFilterValue ?? '') as string}
          onChange={e => column.setFilterValue(e.target.value)}
          placeholder={`${t('common.search')} ${columnHeader.toLowerCase()}...`}
          type='text'
        />
        <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
          <SearchIcon size={16} />
        </div>
      </div>
    </div>
  )
}

export default DataTableFilters
