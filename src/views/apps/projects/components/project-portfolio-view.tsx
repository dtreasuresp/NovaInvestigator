'use client'

import React, { useMemo } from 'react'
import {
  FolderKanbanIcon,
  LayersIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  UsersIcon,
  ArrowRightIcon,
  PlusIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanTask, KanbanMember } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface ProjectPortfolioViewProps {
  projects: StrategicProjectItem[]
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
  members: KanbanMember[]
  onSelectProject: (projectId: string) => void
  onOpenNewProjectModal: () => void
}

export function ProjectPortfolioView({
  projects,
  tasks,
  columns,
  members,
  onSelectProject,
  onOpenNewProjectModal
}: ProjectPortfolioViewProps) {
  const memberMap = useMemo(() => {
    const map = new Map<string, KanbanMember>()
    members.forEach(m => map.set(m.id, m))
    return map
  }, [members])

  const doneColumnIds = useMemo(() => {
    return new Set(
      columns
        .filter(c => {
          const slug = c.slug?.toLowerCase() || ''
          const name = c.name?.toLowerCase() || ''
          return slug.includes('done') || slug.includes('complet') || name.includes('complet') || name.includes('hecho')
        })
        .map(c => c.id)
    )
  }, [columns])

  // Global KPIs
  const totalProjects = projects.length
  const activeProjectsCount = projects.filter(p => p.status === 'active').length
  const planningProjectsCount = projects.filter(p => p.status === 'planning').length
  const completedProjectsCount = projects.filter(p => p.status === 'completed').length

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => doneColumnIds.has(t.column_id)).length
  const globalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalBudgetCap = projects.reduce((sum, p) => sum + (Number(p.budgetTotal) || 0), 0)
  const totalAllocatedBudget = tasks.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant='outline' className='text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'>Activo</Badge>
      case 'planning':
        return <Badge variant='outline' className='text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'>Planificación</Badge>
      case 'completed':
        return <Badge variant='outline' className='text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'>Completado</Badge>
      case 'on_hold':
        return <Badge variant='outline' className='text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'>En Pausa</Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority?: string) => {
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
        return null
    }
  }

  return (
    <div className='space-y-6'>
      {/* Top Header & Overview */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4'>
        <div>
          <h3 className='text-base sm:text-lg font-bold text-foreground flex items-center gap-2'>
            <LayersIcon className='size-5 text-primary' />
            Portafolio de proyectos e iniciativas estratégicas
          </h3>
          <p className='text-xs text-muted-foreground'>
            Visión consolidada del progreso operativo, gobernanza presupuestaria y alineación de todas las investigaciones.
          </p>
        </div>

        <Button size='sm' className='gap-1.5 text-xs font-semibold shadow-xs shrink-0' onClick={onOpenNewProjectModal}>
          <PlusIcon className='size-4' />
          <span>Nuevo Proyecto</span>
        </Button>
      </div>

      {/* Global Portfolio KPIs */}
      <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Metric 1: Total Projects */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Proyectos Registrados</span>
              <FolderKanbanIcon className='size-4 text-primary' />
            </CardDescription>
            <CardTitle className='text-2xl font-bold text-foreground'>
              {totalProjects}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
              <span className='text-emerald-600 font-semibold'>{activeProjectsCount} activos</span>
              <span>•</span>
              <span>{planningProjectsCount} en plan</span>
              <span>•</span>
              <span>{completedProjectsCount} listos</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Global Execution Progress */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Avance Global</span>
              <CheckCircle2Icon className='size-4 text-emerald-500' />
            </CardDescription>
            <CardTitle className='text-2xl font-bold text-foreground'>
              {globalProgress}%
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 space-y-1.5'>
            <Progress value={globalProgress} className='h-1.5' />
            <p className='text-xs text-muted-foreground'>
              {completedTasks} de {totalTasks} actividades completadas
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Total Allocated Budget */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Presupuesto de las actividades</span>
              <DollarSignIcon className='size-4 text-primary' />
            </CardDescription>
            <CardTitle className='text-2xl font-bold text-foreground'>
              ${totalAllocatedBudget.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              {totalBudgetCap > 0 ? `Tope global: $${totalBudgetCap.toLocaleString()}` : 'Sin tope consolidado'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Total Team Members */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Equipo de trabajo</span>
              <UsersIcon className='size-4 text-primary' />
            </CardDescription>
            <CardTitle className='text-2xl font-bold text-foreground'>
              {members.length}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              Miembros actuales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-bold text-foreground'>
            Proyectos del Portafolio ({projects.length})
          </h4>
          <span className='text-xs text-muted-foreground hidden sm:inline-block'>
            Haga clic en cualquier tarjeta para abrir el plan de ejecución
          </span>
        </div>

        {projects.length === 0 ? (
          <div className='rounded-xl border border-dashed p-10 text-center space-y-3 bg-muted/10'>
            <FolderKanbanIcon className='size-8 text-muted-foreground mx-auto' />
            <div className='space-y-1'>
              <h3 className='text-sm font-semibold text-foreground'>No hay proyectos creados</h3>
              <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
                Cree un proyecto derivado de CAME desde una investigación en Research o cree un proyecto independiente.
              </p>
            </div>
            <Button size='sm' className='gap-1.5 text-xs' onClick={onOpenNewProjectModal}>
              <PlusIcon className='size-3.5' />
              <span>Crear Primer Proyecto</span>
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {projects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id)
              const projectCompleted = projectTasks.filter(t => doneColumnIds.has(t.column_id)).length
              const projectTotal = projectTasks.length
              const progressPercent = projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0
              const projectBudget = projectTasks.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)
              const leader = project.leaderUserId ? memberMap.get(project.leaderUserId) : null

              return (
                <Card
                  key={project.id}
                  className='hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group'
                  onClick={() => onSelectProject(project.id)}
                >
                  <CardHeader className='pb-3 space-y-2.5'>
                    {/* Top Row: Organization Badge + Badges */}
                    <div className='flex flex-wrap items-center justify-between gap-2 min-w-0'>
                      <Badge
                        variant='outline'
                        className='text-xs font-semibold bg-primary/10 text-primary border-primary/20 break-words max-w-full'
                        title={project.organization || undefined}
                      >
                        <span className='truncate max-w-[180px] sm:max-w-[220px]'>
                          {project.organization || 'Organización'}
                        </span>
                      </Badge>
                      <div className='flex items-center gap-1.5 shrink-0'>
                        {getPriorityBadge(project.priority)}
                        {getStatusBadge(project.status)}
                      </div>
                    </div>

                    {/* Title & Objective Multi-line */}
                    <div className='space-y-1 min-w-0'>
                      <CardTitle
                        className='text-sm font-bold text-foreground break-words line-clamp-2 leading-snug group-hover:text-primary transition-colors'
                        title={project.title}
                      >
                        {project.title}
                      </CardTitle>
                      {project.objective && (
                        <CardDescription
                          className='text-xs text-muted-foreground break-words line-clamp-3 leading-relaxed'
                          title={project.objective}
                        >
                          {project.objective}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-4 pt-0'>
                    {/* Progress Bar */}
                    <div className='space-y-1.5'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-muted-foreground text-xs font-medium'>Progreso de Ejecución</span>
                        <span className='font-bold text-foreground text-xs'>{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className='h-1.5' />
                      <div className='flex items-center justify-between text-xs text-muted-foreground'>
                        <span>{projectCompleted}/{projectTotal} tareas completadas</span>
                        <span className='font-semibold text-foreground'>${projectBudget.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Footer: Leader & Action */}
                    <div className='flex items-center justify-between border-t pt-3'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <Avatar className='size-6 border text-xs font-bold'>
                          <AvatarImage src={leader?.avatar || undefined} />
                          <AvatarFallback>{leader?.initials || '👑'}</AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col min-w-0'>
                          <span
                            className='text-xs font-medium text-foreground truncate max-w-[140px] sm:max-w-[170px]'
                            title={leader ? leader.name : 'Sin líder'}
                          >
                            {leader ? leader.name : 'Sin líder'}
                          </span>
                          <span className='text-[11px] text-muted-foreground'>Líder del Proyecto</span>
                        </div>
                      </div>

                      <div className='flex items-center gap-1 text-xs font-semibold text-primary opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0'>
                        <span>Abrir</span>
                        <ArrowRightIcon className='size-3.5' />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
