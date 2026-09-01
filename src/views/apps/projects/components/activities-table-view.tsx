'use client'

import React, { useState, useMemo } from 'react'
import {
  SearchIcon,
  FilterIcon,
  ArrowUpDownIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  MoreHorizontalIcon,
  Edit2Icon,
  Trash2Icon,
  TargetIcon,
  UserIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { KanbanTask, KanbanMember } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface ActivitiesTableViewProps {
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
  members: KanbanMember[]
  onOpenNewTask?: () => void
  onAddNewTask?: () => void
  onEditTask?: (task: KanbanTask) => void
  onDeleteTask?: (taskId: string) => void
}

export function ActivitiesTableView({
  tasks,
  columns,
  members,
  onOpenNewTask,
  onAddNewTask,
  onEditTask,
  onDeleteTask
}: ActivitiesTableViewProps) {
  const handleNewTask = onAddNewTask || onOpenNewTask
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'priority' | 'budget'>('dueDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const memberMap = useMemo(() => {
    const map = new Map<string, KanbanMember>()
    members.forEach(m => map.set(m.id, m))
    return map
  }, [members])

  const columnMap = useMemo(() => {
    const map = new Map<string, KanbanColumnData>()
    columns.forEach(c => map.set(c.id, c))
    return map
  }, [columns])

  const now = new Date()

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const matchesSearch =
          !search.trim() ||
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(search.toLowerCase())) ||
          (task.came_action_id && task.came_action_id.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus = statusFilter === 'all' || task.column_id === statusFilter
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
        const matchesAssignee =
          assigneeFilter === 'all' ||
          (task.assignee_ids && task.assignee_ids.includes(assigneeFilter))

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee
      })
      .sort((a, b) => {
        let diff = 0
        if (sortField === 'title') {
          diff = a.title.localeCompare(b.title)
        } else if (sortField === 'dueDate') {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity
          diff = dateA - dateB
        } else if (sortField === 'budget') {
          diff = (Number(a.budget_amount) || 0) - (Number(b.budget_amount) || 0)
        } else if (sortField === 'priority') {
          const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
          const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0
          const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0
          diff = weightB - weightA
        }
        return sortDirection === 'asc' ? diff : -diff
      })
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, sortField, sortDirection])

  const toggleSort = (field: 'title' | 'dueDate' | 'priority' | 'budget') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant='outline' className='text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 uppercase tracking-wide'>Urgente</Badge>
      case 'high':
        return <Badge variant='outline' className='text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 uppercase tracking-wide'>Alta</Badge>
      case 'medium':
        return <Badge variant='outline' className='text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'>Media</Badge>
      case 'low':
        return <Badge variant='outline' className='text-xs font-semibold bg-muted text-muted-foreground'>Baja</Badge>
      default:
        return <Badge variant='outline' className='text-xs font-semibold'>{priority}</Badge>
    }
  }

  return (
    <div className='space-y-4'>
      {/* Controls Bar */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          {/* Search */}
          <div className='relative w-full sm:w-60'>
            <SearchIcon className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Buscar actividad...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='h-8 pl-8 text-xs'
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val: string | null) => { if (val) setStatusFilter(val) }}>
            <SelectTrigger className='h-8 w-[130px] text-xs'>
              <SelectValue placeholder='Estado' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>Todos los Estados</SelectItem>
              {columns.map(col => (
                <SelectItem key={col.id} value={col.id} className='text-xs'>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(val: string | null) => { if (val) setPriorityFilter(val) }}>
            <SelectTrigger className='h-8 w-[130px] text-xs'>
              <SelectValue placeholder='Prioridad' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>Todas las Prioridades</SelectItem>
              <SelectItem value='urgent' className='text-xs'>Urgente</SelectItem>
              <SelectItem value='high' className='text-xs'>Alta</SelectItem>
              <SelectItem value='medium' className='text-xs'>Media</SelectItem>
              <SelectItem value='low' className='text-xs'>Baja</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter */}
          <Select value={assigneeFilter} onValueChange={(val: string | null) => { if (val) setAssigneeFilter(val) }}>
            <SelectTrigger className='h-8 w-[140px] text-xs'>
              <SelectValue placeholder='Responsable' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>Todos los Responsables</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id} className='text-xs'>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Button */}
        {handleNewTask && (
          <Button size='sm' className='h-8 gap-1.5 text-xs font-semibold shadow-xs shrink-0' onClick={handleNewTask}>
            <PlusIcon className='size-3.5' />
            <span>Nueva Actividad</span>
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div className='rounded-xl border bg-card/60 backdrop-blur-md overflow-hidden shadow-xs'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='border-b bg-muted/40 text-muted-foreground font-semibold'>
              <tr>
                <th
                  className='p-3 pl-4 cursor-pointer select-none hover:text-foreground'
                  onClick={() => toggleSort('title')}
                >
                  <div className='flex items-center gap-1.5'>
                    <span>Actividad / Alcance</span>
                    <ArrowUpDownIcon className='size-3' />
                  </div>
                </th>
                <th className='p-3'>Estado</th>
                <th
                  className='p-3 cursor-pointer select-none hover:text-foreground'
                  onClick={() => toggleSort('priority')}
                >
                  <div className='flex items-center gap-1.5'>
                    <span>Prioridad</span>
                    <ArrowUpDownIcon className='size-3' />
                  </div>
                </th>
                <th className='p-3'>Responsables</th>
                <th
                  className='p-3 cursor-pointer select-none hover:text-foreground'
                  onClick={() => toggleSort('dueDate')}
                >
                  <div className='flex items-center gap-1.5'>
                    <span>Fecha Límite</span>
                    <ArrowUpDownIcon className='size-3' />
                  </div>
                </th>
                <th
                  className='p-3 text-right cursor-pointer select-none hover:text-foreground'
                  onClick={() => toggleSort('budget')}
                >
                  <div className='flex items-center justify-end gap-1.5'>
                    <span>Costo Est.</span>
                    <ArrowUpDownIcon className='size-3' />
                  </div>
                </th>
                <th className='p-3 pr-4 text-center'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/50'>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className='p-8 text-center text-muted-foreground'>
                    No se encontraron actividades que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const col = columnMap.get(task.column_id)
                  const isOverdue = task.due_date && new Date(task.due_date) < now
                  const taskAssignees = (task.assignee_ids || [])
                    .map(id => memberMap.get(id))
                    .filter((m): m is KanbanMember => Boolean(m))

                  return (
                    <tr key={task.id} className='hover:bg-muted/30 transition-colors group'>
                      {/* Actividad */}
                      <td className='p-3 pl-4 min-w-[220px] max-w-md'>
                        <div className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            {task.came_action_id && (
                              <Badge variant='outline' className='text-xs font-bold bg-primary/5 text-primary border-primary/20 shrink-0'>
                                {task.came_action_id}
                              </Badge>
                            )}
                            <span
                              className='font-semibold text-xs text-foreground break-words line-clamp-2 leading-snug'
                              title={task.title}
                            >
                              {task.title}
                            </span>
                          </div>
                          {task.description && (
                            <p
                              className='text-xs text-muted-foreground break-words line-clamp-2 leading-relaxed'
                              title={task.description}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className='p-3 whitespace-nowrap'>
                        <Badge variant='secondary' className='text-xs font-medium'>
                          {col?.name || 'Backlog'}
                        </Badge>
                      </td>

                      {/* Prioridad */}
                      <td className='p-3 whitespace-nowrap'>
                        {getPriorityBadge(task.priority)}
                      </td>

                      {/* Responsables */}
                      <td className='p-3 whitespace-nowrap'>
                        {taskAssignees.length === 0 ? (
                          <span className='text-xs text-muted-foreground italic'>Sin asignar</span>
                        ) : (
                          <div className='flex -space-x-1.5 overflow-hidden'>
                            <TooltipProvider delay={150}>
                              {taskAssignees.slice(0, 3).map(m => (
                                <Tooltip key={m.id}>
                                  <TooltipTrigger>
                                    <Avatar className='size-6 border-2 border-background ring-1 ring-border text-xs font-bold'>
                                      <AvatarImage src={m.avatar || undefined} />
                                      <AvatarFallback>{m.initials || m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent className='text-xs'>
                                    <p className='font-semibold'>{m.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                            {taskAssignees.length > 3 && (
                              <div className='flex size-6 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-semibold text-muted-foreground'>
                                +{taskAssignees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Fecha Límite */}
                      <td className='p-3 whitespace-nowrap'>
                        {task.due_date ? (
                          <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            <ClockIcon className='size-3.5' />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                            {isOverdue && <span className='text-xs font-bold'>(Vencida)</span>}
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground'>-</span>
                        )}
                      </td>

                      {/* Costo */}
                      <td className='p-3 text-right font-semibold text-foreground whitespace-nowrap'>
                        {task.budget_amount ? `$${Number(task.budget_amount).toLocaleString()}` : '-'}
                      </td>

                      {/* Acciones */}
                      <td className='p-3 pr-4 text-center whitespace-nowrap'>
                        <div className='flex items-center justify-center gap-1'>
                          {onEditTask && (
                            <Button
                              size='icon-xs'
                              variant='ghost'
                              className='hover:bg-muted text-muted-foreground hover:text-foreground'
                              onClick={() => onEditTask(task)}
                              title='Editar actividad'
                            >
                              <Edit2Icon className='size-3.5' />
                            </Button>
                          )}
                          {onDeleteTask && (
                            <Button
                              size='icon-xs'
                              variant='ghost'
                              className='hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                              onClick={() => onDeleteTask(task.id)}
                              title='Eliminar actividad'
                            >
                              <Trash2Icon className='size-3.5' />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
