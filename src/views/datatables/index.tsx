'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Component Imports
import DataTableBasic from '@/views/datatables/basic'
import DataTableWithFilters from '@/views/datatables/filters'
import DataTablePinnableColumn from '@/views/datatables/pinnable-columns'

const DataTable = () => {
  const { t } = useI18n()
  return (
    <div className='flex flex-col gap-8'>
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>{t('datatables.basic')}</h2>
        <DataTableBasic />
      </div>
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>{t('datatables.pinnableColumns')}</h2>
        <DataTablePinnableColumn />
      </div>
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>{t('datatables.filters')}</h2>
        <DataTableWithFilters />
      </div>
    </div>
  )
}

export default DataTable
