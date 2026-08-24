'use client'

import { PlusIcon, MoreVerticalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanCard } from './kanban-card'
import type { KanbanTask, KanbanMember } from './card-form-dialog'
import { useI18n } from '@/hooks/use-i18n'

export type KanbanColumnData = {
  id: string
  name: string
  slug: string
  position: number
}

type KanbanColumnProps = {
  column: KanbanColumnData
  tasks: KanbanTask[]
  members: KanbanMember[]
  columns: KanbanColumnData[]
  onAddNewTask: (columnId: string) => void
  onEditTask: (task: KanbanTask) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetColumnId: string) => void
}

export function KanbanColumn({
  column,
  tasks,
  members,
  columns,
  onAddNewTask,
  onEditTask,
  onDeleteTask,
  onMoveTask
}: KanbanColumnProps) {
  const { t } = useI18n()

  return (
    <div className='flex w-72 sm:w-80 shrink-0 flex-col rounded-xl bg-muted/40 border p-3 min-h-[500px]'>
      {/* Column Header */}
      <div className='flex items-center justify-between pb-3 px-1'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold tracking-tight text-foreground'>
            {column.name}
          </h3>
          <span className='flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'>
            {tasks.length}
          </span>
        </div>

        <Button variant='ghost' size='icon' className='size-7 text-muted-foreground'>
          <MoreVerticalIcon className='size-3.5' />
        </Button>
      </div>

      {/* Cards List */}
      <div className='flex-1 space-y-3 overflow-y-auto pr-0.5 min-h-[100px]'>
        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            members={members}
            columns={columns}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
          />
        ))}

        {tasks.length === 0 && (
          <div className='flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground'>
            {t('kanban.notitemyet') || 'Aún no hay ítems declarados'}
          </div>
        )}
      </div>

      {/* Add New Item Button */}
      <div className='pt-3'>
        <Button
          variant='ghost'
          onClick={() => onAddNewTask(column.id)}
          className='w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground h-9 gap-1.5'
        >
          <PlusIcon className='size-3.5' />
          {t('kanban.addNewItem') || 'Agregar elemento'}
        </Button>
      </div>
    </div>
  )
}
