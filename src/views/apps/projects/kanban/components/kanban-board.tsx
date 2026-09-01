'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, SearchIcon, FilterIcon, Loader2Icon, LayersIcon, FolderPlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/hooks/use-i18n'
import { KanbanColumn, type KanbanColumnData } from './kanban-column'
import { CardFormDialog, type KanbanTask, type KanbanMember } from './card-form-dialog'
import { ColumnFormDialog } from './column-form-dialog'
import { NewProjectDialog } from './new-project-dialog'

export function KanbanBoard() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const [columns, setColumns] = useState<KanbanColumnData[]>([])
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [members, setMembers] = useState<KanbanMember[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; title: string; organization: string }>>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // Modals state
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | undefined>(undefined)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false)

  // Check URL search params for project filter
  useEffect(() => {
    const urlProjectId = searchParams.get('project')
    if (urlProjectId) {
      setProjectFilter(urlProjectId)
    }
  }, [searchParams])

  // Fetch initial board data
  const loadBoardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/kanban')

      if (!res.ok) throw new Error('Error loading board')
      const data = await res.json()
    
      if (data.ok) {
        setColumns(data.columns || [])
        setTasks(data.tasks || [])
        setMembers(data.members || [])
        setProjects(data.projects || [])
      }
    } catch (err) {
      toast.error('No se pudo cargar el tablero Kanban.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoardData()
  }, [])

  // Open Create Dialog
  const handleAddNewTask = (columnId: string) => {
    setActiveTask(null)
    setActiveColumnId(columnId)
    setCardDialogOpen(true)
  }

  // Open Edit Dialog
  const handleEditTask = (task: KanbanTask) => {
    setActiveTask(task)
    setActiveColumnId(task.column_id)
    setCardDialogOpen(true)
  }

  // Save Task (Create or Update)
  const handleSaveTask = async (taskData: Partial<KanbanTask>) => {
    try {
      if (taskData.id) {
        // Update
        const res = await fetch(`/api/kanban/tasks/${taskData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })
        const data = await res.json()
        if (data.ok && data.task) {
          setTasks(prev => prev.map(t => (t.id === data.task.id ? data.task : t)))
          toast.success('Tarjeta actualizada.')
        } else {
          toast.error('Error al actualizar la tarjeta.')
        }
      } else {
        // Create
        const res = await fetch('/api/kanban/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            columnId: taskData.column_id,
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            coverImage: taskData.cover_image,
            assigneeIds: taskData.assignee_ids,
            dueDate: taskData.due_date,
            projectId: projectFilter !== 'all' ? projectFilter : null
          })
        })
        const data = await res.json()
        if (data.ok && data.task) {
          setTasks(prev => [...prev, data.task])
          toast.success('Nueva tarjeta creada.')
        } else {
          toast.error('Error al crear la tarjeta.')
        }
      }
    } catch {
      toast.error('Error de comunicación con el servidor.')
    }
  }

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const prev = tasks
      setTasks(tasks.filter(t => t.id !== taskId))

      const res = await fetch(`/api/kanban/tasks/${taskId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.ok) {
        setTasks(prev)
        toast.error('No se pudo eliminar la tarjeta.')
      } else {
        toast.success('Tarjeta eliminada.')
      }
    } catch {
      toast.error('Error al eliminar la tarjeta.')
    }
  }

  // Move Task between columns
  const handleMoveTask = async (taskId: string, targetColumnId: string) => {
    try {
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, column_id: targetColumnId } : t)))

      const res = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: targetColumnId })
      })
      const data = await res.json()
      if (!data.ok) {
        loadBoardData()
        toast.error('Error al mover la tarjeta.')
      }
    } catch {
      loadBoardData()
      toast.error('Error al mover la tarjeta.')
    }
  }

  // Create New Column
  const handleSaveColumn = async (name: string) => {
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, position: columns.length })
      })
      const data = await res.json()
      if (data.ok && data.column) {
        setColumns(prev => [...prev, data.column])
        toast.success(`Columna "${name}" creada.`)
      } else {
        toast.error('No se pudo crear la columna.')
      }
    } catch {
      toast.error('Error al crear la columna.')
    }
  }

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter

    return matchesSearch && matchesPriority && matchesProject
  })

  if (loading) {
    return (
      <div className='flex h-96 w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-muted-foreground'>
          <Loader2Icon className='size-8 animate-spin text-primary' />
          <p className='text-sm font-medium'>{t('kanban.loadingBoard')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Top Filter and Actions Bar */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
        {/* Search & Selectors */}
        <div className='flex flex-1 flex-wrap items-center gap-3'>
          <div className='relative w-full sm:w-64'>
            <SearchIcon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={t('kanban.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-9 h-9 text-sm'
            />
          </div>

          {/* Project Filter */}
          {projects.length > 0 && (
            <Select value={projectFilter} onValueChange={val => setProjectFilter(val ?? 'all')}>
              <SelectTrigger className='h-9 w-full sm:w-52 text-xs'>
                <SelectValue placeholder={t('kanban.allProjects')}>
                  {projectFilter === 'all'
                    ? t('kanban.allProjects')
                    : (projects.find(p => p.id === projectFilter)?.title ?? 'Contexto no disponible')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('kanban.allProjects')}</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className='text-xs'>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={val => setPriorityFilter(val ?? 'all')}>
            <SelectTrigger className='h-9 w-full sm:w-36 text-xs'>
              <SelectValue placeholder={t('kanban.priorityAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('kanban.priorityAll')}</SelectItem>
              <SelectItem value='high'>{t('kanban.priorityHigh')}</SelectItem>
              <SelectItem value='urgent'>{t('kanban.priorityUrgent')}</SelectItem>
              <SelectItem value='medium'>{t('kanban.priorityMedium')}</SelectItem>
              <SelectItem value='low'>{t('kanban.priorityLow')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2 shrink-0'>
          <Button
            onClick={() => setNewProjectDialogOpen(true)}
            size='sm'
            className='h-9 gap-1.5 font-semibold text-xs'
          >
            <FolderPlusIcon className='size-4' />
            + Nuevo Proyecto
          </Button>

          {/* Add New Column Button */}
          <Button
            onClick={() => setColumnDialogOpen(true)}
            variant='outline'
            size='sm'
            className='h-9 gap-1.5 text-xs'
          >
            <PlusIcon className='size-4' />
            Add New Column
          </Button>
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll */}
      <div className='flex gap-4 overflow-x-auto pb-6 pt-1'>
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={filteredTasks.filter(t => t.column_id === col.id)}
            members={members}
            columns={columns}
            onAddNewTask={handleAddNewTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        ))}

        {/* Inline Add Column Button */}
        <button
          onClick={() => setColumnDialogOpen(true)}
          type='button'
          className='flex h-20 w-72 sm:w-80 shrink-0 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-primary/40 transition-all gap-2'
        >
          <PlusIcon className='size-4' />
          Add New Column
        </button>
      </div>

      {/* Edit / Create Task Dialog */}
      <CardFormDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        task={activeTask}
        columnId={activeColumnId}
        members={members}
        onSave={handleSaveTask}
      />

      {/* Add Column Dialog */}
      <ColumnFormDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        onSave={handleSaveColumn}
      />

      {/* New Project Dialog */}
      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        onProjectCreated={() => loadBoardData()}
      />
    </div>
  )
}
