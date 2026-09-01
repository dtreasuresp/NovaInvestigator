'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  LayoutDashboardIcon,
  KanbanIcon,
  ListTodoIcon,
  TargetIcon,
  DollarSignIcon,
  PlusIcon,
  FolderPlusIcon,
  Loader2Icon,
  ColumnsIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import {
  StrategicContextSwitcher,
  type StrategicProjectItem
} from './components/strategic-context-switcher'
import { StrategicExecutionHeader } from './components/strategic-execution-header'
import { ProjectPortfolioView } from './components/project-portfolio-view'
import { ExecutionOverview } from './components/execution-overview'
import { ActivitiesTableView } from './components/activities-table-view'
import { StrategicAlignmentView } from './components/strategic-alignment-view'
import { BudgetGovernanceView } from './components/budget-governance-view'
import { ProjectSettingsDrawer } from './components/project-settings-drawer'

import { KanbanColumn, type KanbanColumnData } from './kanban/components/kanban-column'
import { CardFormDialog, type KanbanTask, type KanbanMember } from './kanban/components/card-form-dialog'
import { ColumnFormDialog } from './kanban/components/column-form-dialog'
import { NewProjectDialog } from './kanban/components/new-project-dialog'

export default function ProjectsView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [columns, setColumns] = useState<KanbanColumnData[]>([])
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [members, setMembers] = useState<KanbanMember[]>([])
  const [projects, setProjects] = useState<StrategicProjectItem[]>([])
  const [loading, setLoading] = useState(true)

  // Selection and Tab State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Modals state
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | undefined>(undefined)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false)
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)

  // Sync with URL search params (?project=... & ?tab=...)
  useEffect(() => {
    const urlProjectId = searchParams.get('project')
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId)
    }
    const urlTab = searchParams.get('tab')
    if (urlTab && ['overview', 'board', 'activities', 'strategy', 'budget'].includes(urlTab)) {
      setActiveTab(urlTab)
    }
  }, [searchParams])

  // Load Board & Strategic Data
  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/kanban')
      if (!res.ok) throw new Error('Error al cargar datos del tablero')
      const data = await res.json()

      if (data.ok) {
        setColumns(data.columns || [])
        setTasks(data.tasks || [])
        setMembers(data.members || [])
        setProjects(data.projects || [])
      }
    } catch {
      toast.error('No se pudieron cargar los datos del Strategic Execution Workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter Tasks by Selected Project Context
  const filteredTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks
    return tasks.filter(t => t.project_id === selectedProjectId)
  }, [tasks, selectedProjectId])

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') return null
    return projects.find(p => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  // Project Selection Handler
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'all') {
      params.delete('project')
    } else {
      params.set('project', id)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Tab Selection Handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Task Actions
  const handleAddNewTask = (columnId?: string) => {
    setActiveTask(null)
    setActiveColumnId(columnId || columns[0]?.id)
    setCardDialogOpen(true)
  }

  const handleAddNewTaskForCame = (cameActionId: string, cameTitle: string) => {
    setActiveTask(null)
    setActiveColumnId(columns[0]?.id)
    // We can open the dialog pre-filled
    setCardDialogOpen(true)
  }

  const handleEditTask = (task: KanbanTask) => {
    setActiveTask(task)
    setActiveColumnId(task.column_id)
    setCardDialogOpen(true)
  }

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
          toast.success('Actividad actualizada.')
        } else {
          toast.error('Error al actualizar la actividad.')
        }
      } else {
        // Create
        const res = await fetch('/api/kanban/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            columnId: taskData.column_id || columns[0]?.id,
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            coverImage: taskData.cover_image,
            assigneeIds: taskData.assignee_ids,
            dueDate: taskData.due_date,
            budgetAmount: taskData.budget_amount,
            cameActionId: taskData.came_action_id,
            projectId: selectedProjectId !== 'all' ? selectedProjectId : null
          })
        })
        const data = await res.json()
        if (data.ok && data.task) {
          setTasks(prev => [...prev, data.task])
          toast.success('Nueva actividad creada.')
        } else {
          toast.error('Error al crear la actividad.')
        }
      }
    } catch {
      toast.error('Error de comunicación con el servidor.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const prev = tasks
      setTasks(tasks.filter(t => t.id !== taskId))

      const res = await fetch(`/api/kanban/tasks/${taskId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.ok) {
        setTasks(prev)
        toast.error('No se pudo eliminar la actividad.')
      } else {
        toast.success('Actividad eliminada.')
      }
    } catch {
      toast.error('Error al eliminar la actividad.')
    }
  }

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
        loadData()
        toast.error('Error al mover la actividad.')
      }
    } catch {
      loadData()
      toast.error('Error al mover la actividad.')
    }
  }

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

  if (loading) {
    return (
      <div className='flex h-96 w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-3 text-muted-foreground'>
          <Loader2Icon className='size-8 animate-spin text-primary' />
          <p className='text-sm font-medium'>Cargando Strategic Execution Workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-12'>
      {/* Top Workspace Navigation Bar */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-wrap items-center gap-3'>
          {/* Strategic Context Switcher */}
          <StrategicContextSwitcher
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={handleSelectProject}
            onOpenNewProjectModal={() => setNewProjectDialogOpen(true)}
            loading={loading}
          />
        </div>
      </div>

      {/* Strategic Execution Header (if a specific project or investigation is selected) */}
      {selectedProject && (
        <StrategicExecutionHeader
          project={selectedProject}
          tasks={filteredTasks}
          columns={columns}
          members={members}
          onOpenSettings={() => setSettingsDrawerOpen(true)}
          onOpenNewTask={() => handleAddNewTask()}
        />
      )}

      {/* Multi-View Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className='space-y-6'>
        <div className='border-b'>
          <TabsList className='h-10 bg-transparent p-0 gap-6 justify-start border-none'>
            <TabsTrigger
              value='overview'
              className='data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-1 font-semibold text-xs flex items-center gap-2'
            >
              <LayoutDashboardIcon className='size-3.5' />
              <span>Overview</span>
            </TabsTrigger>

            <TabsTrigger
              value='board'
              className='data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-1 font-semibold text-xs flex items-center gap-2'
            >
              <KanbanIcon className='size-3.5' />
              <span>Board (Kanban)</span>
            </TabsTrigger>

            <TabsTrigger
              value='activities'
              className='data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-1 font-semibold text-xs flex items-center gap-2'
            >
              <ListTodoIcon className='size-3.5' />
              <span>Activities</span>
            </TabsTrigger>

            <TabsTrigger
              value='strategy'
              className='data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-1 font-semibold text-xs flex items-center gap-2'
            >
              <TargetIcon className='size-3.5' />
              <span>Strategy (CAME Alignment)</span>
            </TabsTrigger>

            <TabsTrigger
              value='budget'
              className='data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-1 font-semibold text-xs flex items-center gap-2'
            >
              <DollarSignIcon className='size-3.5' />
              <span>Budget</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview / Portfolio */}
        <TabsContent value='overview' className='space-y-4 m-0'>
          {selectedProjectId === 'all' ? (
            <ProjectPortfolioView
              projects={projects}
              tasks={tasks}
              columns={columns}
              members={members}
              onSelectProject={handleSelectProject}
              onOpenNewProjectModal={() => setNewProjectDialogOpen(true)}
            />
          ) : (
            <ExecutionOverview
              project={selectedProject}
              tasks={filteredTasks}
              columns={columns}
              members={members}
              onNavigateToBoard={() => handleTabChange('board')}
              onNavigateToActivities={() => handleTabChange('activities')}
              onNavigateToStrategy={() => handleTabChange('strategy')}
              onSelectTask={handleEditTask}
            />
          )}
        </TabsContent>

        {/* Tab 2: Board */}
        <TabsContent value='board' className='space-y-4 m-0'>
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
              Añadir Columna
            </button>
          </div>
        </TabsContent>

        {/* Tab 3: Activities */}
        <TabsContent value='activities' className='space-y-4 m-0'>
          <ActivitiesTableView
            tasks={filteredTasks}
            columns={columns}
            members={members}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddNewTask={() => handleAddNewTask()}
          />
        </TabsContent>

        {/* Tab 4: Strategy */}
        <TabsContent value='strategy' className='space-y-4 m-0'>
          <StrategicAlignmentView
            project={selectedProject}
            tasks={filteredTasks}
            columns={columns}
            members={members}
            onAddNewTaskForCame={handleAddNewTaskForCame}
            onEditTask={handleEditTask}
          />
        </TabsContent>

        {/* Tab 5: Budget */}
        <TabsContent value='budget' className='space-y-4 m-0'>
          <BudgetGovernanceView
            project={selectedProject}
            tasks={filteredTasks}
            columns={columns}
          />
        </TabsContent>
      </Tabs>

      {/* Modals & Dialogs */}
      <CardFormDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        task={activeTask}
        columnId={activeColumnId}
        members={members}
        onSave={handleSaveTask}
      />

      <ColumnFormDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        onSave={handleSaveColumn}
      />

      <NewProjectDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        onProjectCreated={() => loadData()}
      />

      {selectedProject && (
        <ProjectSettingsDrawer
          open={settingsDrawerOpen}
          onOpenChange={setSettingsDrawerOpen}
          project={selectedProject}
          members={members}
          onProjectUpdated={() => loadData()}
        />
      )}
    </div>
  )
}
