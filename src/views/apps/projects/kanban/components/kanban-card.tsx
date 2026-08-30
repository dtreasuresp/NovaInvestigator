'use client'

import { CalendarDaysIcon, MoreHorizontalIcon, Trash2Icon, Edit2Icon, ArrowRightIcon } from 'lucide-react'
import { format } from 'date-fns'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'
import type { KanbanTask, KanbanMember } from './card-form-dialog'

type KanbanCardProps = {
  task: KanbanTask
  members: KanbanMember[]
  columns: Array<{ id: string; name: string }>
  onEdit: (task: KanbanTask) => void
  onDelete: (taskId: string) => void
  onMove: (taskId: string, targetColumnId: string) => void
}

const priorityStyles: Record<string, { label: string; className: string }> = {
  high: {
    label: 'High',
    className: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60'
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
  },
  low: {
    label: 'Low',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
  }
}

export function KanbanCard({ task, members, columns, onEdit, onDelete, onMove }: KanbanCardProps) {
  const { t } = useI18n()
  const priorityConfig = priorityStyles[task.priority] || priorityStyles.medium
  
  const assignedMembers = (task.assignee_ids || [])
    .map(id => members.find(m => m.id === id))
    .filter(Boolean) as KanbanMember[]

  const otherColumns = columns.filter(c => c.id !== task.column_id)

  return (
    <Card
      onClick={() => onEdit(task)}
      className='group relative cursor-pointer border bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 p-0 overflow-hidden'
    >
      {/* Optional Cover Image */}
      {task.cover_image && (
        <div className='relative h-32 w-full overflow-hidden bg-muted'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.cover_image}
            alt={task.title}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
        </div>
      )}

      <CardContent className='p-3.5 space-y-3'>
        {/* Top row: Priority Badge + 3 dots menu */}
        <div className='flex items-center justify-between gap-2'>
          <Badge variant='outline' className={cn('text-[11px] font-medium px-2 py-0.5 rounded', priorityConfig.className)}>
            {priorityConfig.label}
          </Badge>

          <div onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <MoreHorizontalIcon className='size-3.5' />
                  </Button>
                }
              />
              <DropdownMenuContent align='end' className='w-40'>
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit2Icon className='mr-2 size-3.5' />
                  Edit Card
                </DropdownMenuItem>

                {otherColumns.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowRightIcon className='mr-2 size-3.5' />
                      Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {otherColumns.map(col => (
                        <DropdownMenuItem key={col.id} onClick={() => onMove(task.id, col.id)}>
                          {col.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2Icon className='mr-2 size-3.5' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h4 className='text-sm font-semibold text-foreground leading-snug line-clamp-2'>
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
            {task.description}
          </p>
        )}

        {/* Bottom row: Assignees + Due date */}
        <div className='flex items-center justify-between pt-1 text-xs text-muted-foreground'>
          {/* Stacked Assignee Avatars */}
          <div className='flex items-center -space-x-1.5 overflow-hidden'>
            {assignedMembers.length === 0 ? (
              <span className='text-[11px] text-muted-foreground/70'>{t('kanban.unassigned')}</span>
            ) : (
              assignedMembers.slice(0, 3).map(member => (
                <Avatar key={member.id} className='size-6 ring-2 ring-background'>
                  {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} /> : null}
                  <AvatarFallback className='text-[10px] bg-secondary font-medium'>
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
              ))
            )}
            {assignedMembers.length > 3 && (
              <span className='flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background'>
                +{assignedMembers.length - 3}
              </span>
            )}
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className='inline-flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <CalendarDaysIcon className='size-3.5' />
              <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
