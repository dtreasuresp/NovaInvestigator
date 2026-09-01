'use client'

import React, { useMemo } from 'react'
import {
  AlertTriangleIcon,
  ClockIcon,
  UserXIcon,
  FlameIcon,
  CheckCircle2Icon,
  LayersIcon,
  TargetIcon,
  ArrowRightIcon,
  DollarSignIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanTask, KanbanMember } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface ExecutionOverviewProps {
  project: StrategicProjectItem | null
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
  members: KanbanMember[]
  onNavigateToBoard: () => void
  onNavigateToActivities: () => void
  onNavigateToStrategy: () => void
  onSelectTask?: (task: KanbanTask) => void
}

export function ExecutionOverview({
  project,
  tasks,
  columns,
  members,
  onNavigateToBoard,
  onNavigateToActivities,
  onNavigateToStrategy,
  onSelectTask
}: ExecutionOverviewProps) {
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

  // 1. Identify Risks
  const now = new Date()
  const overdueTasks = useMemo(() => {
    return tasks.filter(t => {
      if (doneColumnIds.has(t.column_id)) return false
      return t.due_date && new Date(t.due_date) < now
    })
  }, [tasks, doneColumnIds])

  const urgentTasks = useMemo(() => {
    return tasks.filter(t => {
      if (doneColumnIds.has(t.column_id)) return false
      return t.priority === 'urgent' || t.priority === 'high'
    })
  }, [tasks, doneColumnIds])

  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (doneColumnIds.has(t.column_id)) return false
      return !t.assignee_ids || t.assignee_ids.length === 0
    })
  }, [tasks, doneColumnIds])

  // 2. Column Distribution (Bottlenecks)
  const columnStats = useMemo(() => {
    return columns.map(col => {
      const count = tasks.filter(t => t.column_id === col.id).length
      const percent = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
      return {
        ...col,
        count,
        percent,
        isDone: doneColumnIds.has(col.id)
      }
    })
  }, [columns, tasks, doneColumnIds])

  // 3. CAME Actions Execution Progress
  const cameProgress = useMemo(() => {
    if (!project?.cameActions || project.cameActions.length === 0) return []

    return project.cameActions.map(action => {
      const actionTasks = tasks.filter(t => t.came_action_id === action.id)
      const completedCount = actionTasks.filter(t => doneColumnIds.has(t.column_id)).length
      const totalCount = actionTasks.length
      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      return {
        action,
        tasksCount: totalCount,
        completedCount,
        percent
      }
    })
  }, [project, tasks, doneColumnIds])

  return (
    <div className='space-y-6'>
      {/* Top Banner if multiple risks exist */}
      {(overdueTasks.length > 0 || unassignedTasks.length > 0) && (
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-amber-200'>
          <div className='flex items-center gap-2.5'>
            <AlertTriangleIcon className='size-4 shrink-0 text-amber-600 dark:text-amber-400' />
            <div>
              <span className='font-semibold'>Riesgos Operativos Detectados: </span>
              <span>
                {overdueTasks.length > 0 && `${overdueTasks.length} actividad(es) vencida(s)`}
                {overdueTasks.length > 0 && unassignedTasks.length > 0 && ' y '}
                {unassignedTasks.length > 0 && `${unassignedTasks.length} actividad(es) sin responsable`}
              </span>
            </div>
          </div>
          <Button
            size='sm'
            variant='outline'
            className='h-7 text-xs border-amber-500/30 hover:bg-amber-500/10'
            onClick={onNavigateToActivities}
          >
            Revisar en Actividades
          </Button>
        </div>
      )}

      {/* Grid: Execution Risks & Column Distribution */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Card 1: Critical Attention Items (Risks) */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <FlameIcon className='size-4 text-destructive' />
                Riesgos y Atención Inmediata
              </CardTitle>
              <Badge variant='outline' className='text-xs font-semibold'>
                {overdueTasks.length + urgentTasks.length + unassignedTasks.length} alertas
              </Badge>
            </div>
            <CardDescription className='text-xs'>
              Actividades que pueden comprometer el cronograma o los objetivos estratégicos.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 pt-0'>
            {/* Overdue Section */}
            {overdueTasks.length > 0 ? (
              <div className='space-y-1.5'>
                <div className='flex items-center gap-1 text-xs font-semibold text-destructive'>
                  <ClockIcon className='size-3' />
                  <span>Vencidas ({overdueTasks.length})</span>
                </div>
                <div className='space-y-1'>
                  {overdueTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      type='button'
                      onClick={() => onSelectTask?.(task)}
                      className='flex w-full items-center justify-between gap-2 rounded-md bg-destructive/5 hover:bg-destructive/10 p-2 text-left text-xs transition-colors'
                      title={task.title}
                    >
                      <span className='font-medium text-foreground break-words line-clamp-2 leading-snug flex-1 min-w-0'>
                        {task.title}
                      </span>
                      <span className='text-xs text-destructive shrink-0 font-medium'>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Vencida'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* High/Urgent Priority Section */}
            {urgentTasks.length > 0 ? (
              <div className='space-y-1.5'>
                <div className='flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400'>
                  <FlameIcon className='size-3' />
                  <span>Prioridad Alta / Urgente ({urgentTasks.length})</span>
                </div>
                <div className='space-y-1'>
                  {urgentTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      type='button'
                      onClick={() => onSelectTask?.(task)}
                      className='flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 hover:bg-muted p-2 text-left text-xs transition-colors'
                      title={task.title}
                    >
                      <span className='font-medium text-foreground break-words line-clamp-2 leading-snug flex-1 min-w-0'>
                        {task.title}
                      </span>
                      <Badge variant='outline' className='text-xs uppercase tracking-wide font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shrink-0'>
                        {task.priority}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Unassigned Section */}
            {unassignedTasks.length > 0 ? (
              <div className='space-y-1.5'>
                <div className='flex items-center gap-1 text-xs font-semibold text-muted-foreground'>
                  <UserXIcon className='size-3' />
                  <span>Sin Responsable Asignado ({unassignedTasks.length})</span>
                </div>
                <div className='space-y-1'>
                  {unassignedTasks.slice(0, 2).map(task => (
                    <button
                      key={task.id}
                      type='button'
                      onClick={() => onSelectTask?.(task)}
                      className='flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 hover:bg-muted p-2 text-left text-xs transition-colors'
                      title={task.title}
                    >
                      <span className='font-medium text-foreground break-words line-clamp-2 leading-snug flex-1 min-w-0'>
                        {task.title}
                      </span>
                      <span className='text-xs text-muted-foreground italic shrink-0'>Sin asignar</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {overdueTasks.length === 0 && urgentTasks.length === 0 && unassignedTasks.length === 0 && (
              <div className='py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2'>
                <CheckCircle2Icon className='size-6 text-emerald-500' />
                <span>Excelente: No hay alertas críticas ni cuellos de botella detectados.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Column Workflow Pipeline */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <LayersIcon className='size-4 text-primary' />
                Flujo de Estado en Tablero Kanban
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-primary gap-1 p-0 hover:bg-transparent font-medium'
                onClick={onNavigateToBoard}
              >
                <span>Ver Tablero</span>
                <ArrowRightIcon className='size-3' />
              </Button>
            </div>
            <CardDescription className='text-xs'>
              Distribución de carga de trabajo a través de los estados del proceso.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 pt-0'>
            {columnStats.map(col => (
              <div key={col.id} className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-1.5 min-w-0'>
                    <div className='size-2 rounded-full bg-primary shrink-0' />
                    <span className='font-medium text-foreground truncate max-w-[180px]' title={col.name}>
                      {col.name}
                    </span>
                    {col.isDone && (
                      <CheckCircle2Icon className='size-3 text-emerald-500 shrink-0' />
                    )}
                  </div>
                  <div className='flex items-center gap-2 text-muted-foreground shrink-0'>
                    <span className='font-semibold text-foreground'>{col.count}</span>
                    <span>({col.percent}%)</span>
                  </div>
                </div>
                <Progress value={col.percent} className='h-1.5' />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Card 3: CAME Strategic Actions Breakdown */}
      {cameProgress.length > 0 && (
        <Card className='shadow-xs'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                <TargetIcon className='size-4 text-primary' />
                Progreso por Acción Estratégica CAME
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-primary gap-1 p-0 hover:bg-transparent font-medium'
                onClick={onNavigateToStrategy}
              >
                <span>Ver Alineación CAME</span>
                <ArrowRightIcon className='size-3' />
              </Button>
            </div>
            <CardDescription className='text-xs'>
              Monitoreo del cumplimiento operativo de cada acción estratégica derivada de la investigación.
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
              {cameProgress.map(({ action, tasksCount, completedCount, percent }) => {
                const typeColors = {
                  C: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                  A: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                  M: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                  E: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }
                const badgeColor = typeColors[action.type as 'C' | 'A' | 'M' | 'E'] || 'bg-muted text-muted-foreground'

                return (
                  <div key={action.id} className='rounded-lg border bg-background/50 p-3 space-y-2'>
                    <div className='flex items-start justify-between gap-2 min-w-0'>
                      <div className='flex flex-wrap items-center gap-1.5 min-w-0 flex-1'>
                        <Badge variant='outline' className={`text-xs font-bold shrink-0 ${badgeColor}`}>
                          {action.id} ({action.type})
                        </Badge>
                        <span
                          className='font-semibold text-xs text-foreground break-words line-clamp-2 leading-snug flex-1'
                          title={action.action || action.objective}
                        >
                          {action.action || action.objective}
                        </span>
                      </div>
                      <span className='text-xs font-bold text-muted-foreground shrink-0'>
                        {completedCount}/{tasksCount}
                      </span>
                    </div>

                    <p
                      className='text-xs text-muted-foreground break-words line-clamp-2 leading-relaxed'
                      title={action.factor || action.problem}
                    >
                      <span className='font-semibold text-foreground/80'>Factor:</span> {action.factor || action.problem || 'General'}
                    </p>

                    <div className='space-y-1 pt-1'>
                      <div className='flex items-center justify-between text-xs text-muted-foreground'>
                        <span>Avance de la acción</span>
                        <span className='font-bold text-foreground'>{percent}%</span>
                      </div>
                      <Progress value={percent} className='h-1.5' />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
