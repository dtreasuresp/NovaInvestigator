'use client'

import React, { useMemo } from 'react'
import {
  TargetIcon,
  LayersIcon,
  CheckCircle2Icon,
  FileTextIcon,
  PlusIcon,
  ShieldCheckIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanTask, KanbanMember } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface StrategicAlignmentViewProps {
  project: StrategicProjectItem | null
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
  members: KanbanMember[]
  onAddNewTaskForCame?: (cameActionId: string, cameTitle: string) => void
  onEditTask?: (task: KanbanTask) => void
}

export function StrategicAlignmentView({
  project,
  tasks,
  columns,
  members,
  onAddNewTaskForCame,
  onEditTask
}: StrategicAlignmentViewProps) {
  const columnMap = useMemo(() => {
    const map = new Map<string, KanbanColumnData>()
    columns.forEach(c => map.set(c.id, c))
    return map
  }, [columns])

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

  const factorMap = useMemo(() => {
    const map = new Map<string, any>()
    ;(project?.swotFactors || []).forEach(f => {
      if (f.id) map.set(f.id, f)
    })
    return map
  }, [project])

  const cameActions = project?.cameActions || []

  if (!project) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground'>
        Seleccione un proyecto o investigación para visualizar la matriz de alineación estratégica.
      </div>
    )
  }

  if (cameActions.length === 0) {
    return (
      <div className='rounded-xl border border-dashed p-10 text-center space-y-3 bg-muted/10'>
        <div className='mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <TargetIcon className='size-5' />
        </div>
        <div className='space-y-1 max-w-md mx-auto'>
          <h3 className='text-sm font-semibold text-foreground'>Proyecto sin Matriz CAME Vinculada</h3>
          <p className='text-xs text-muted-foreground'>
            Este proyecto fue creado de forma independiente o su investigación de origen aún no tiene acciones CAME configuradas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3'>
        <div>
          <h3 className='text-sm font-bold text-foreground flex items-center gap-2'>
            <TargetIcon className='size-4 text-primary' />
            Matriz de Alineación y Trazabilidad Estratégica (CAME $\rightarrow$ Kanban)
          </h3>
          <p className='text-xs text-muted-foreground'>
            Trazabilidad metodológica entre las acciones CAME, factores DAFO, evidencias y tareas Kanban ejecutoras.
          </p>
        </div>
        <Badge variant='outline' className='text-xs font-semibold self-start sm:self-auto'>
          {cameActions.length} acciones estratégicas
        </Badge>
      </div>

      {/* Cards of Strategic Traceability */}
      <div className='space-y-4'>
        {cameActions.map(action => {
          const actionTasks = tasks.filter(t => t.came_action_id === action.id)
          const completedCount = actionTasks.filter(t => doneColumnIds.has(t.column_id)).length
          const totalCount = actionTasks.length
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          const actionBudget = actionTasks.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)

          const factor = action.factorId ? factorMap.get(action.factorId) : null

          const typeInfo = {
            C: { label: 'Corregir', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
            A: { label: 'Afrontar', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
            M: { label: 'Mantener', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
            E: { label: 'Explotar', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
          }[action.type as 'C' | 'A' | 'M' | 'E'] || { label: action.type, color: 'bg-muted text-muted-foreground' }

          return (
            <div key={action.id} className='rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4'>
              {/* Header of CAME Action */}
              <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3'>
                <div className='space-y-1 min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline' className={`text-xs font-bold ${typeInfo.color}`}>
                      {action.id} • {typeInfo.label}
                    </Badge>
                    {action.strategyId && (
                      <Badge variant='secondary' className='text-xs font-medium'>
                        Estrategia: {action.strategyId}
                      </Badge>
                    )}
                    <span className='text-xs font-semibold text-muted-foreground'>
                      Responsable institucional: {action.responsible || 'Director General'}
                    </span>
                  </div>
                  <h4 className='text-sm font-bold text-foreground leading-snug break-words' title={action.action || action.objective}>
                    {action.action || action.objective}
                  </h4>
                  {action.problem && (
                    <p className='text-xs text-muted-foreground break-words line-clamp-2 leading-relaxed' title={action.problem}>
                      <span className='font-semibold text-foreground/80'>Problema / Desafío:</span> {action.problem}
                    </p>
                  )}
                </div>

                {/* Progress Mini Badge */}
                <div className='flex sm:flex-col items-end justify-between sm:justify-start gap-1 shrink-0'>
                  <div className='text-right'>
                    <span className='text-xs font-bold text-foreground'>{progressPercent}%</span>
                    <span className='text-xs text-muted-foreground block'>{completedCount}/{totalCount} tareas</span>
                  </div>
                  <span className='text-xs font-semibold text-primary'>
                    ${actionBudget.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Two columns: Left = Factor & Evidence; Right = Kanban Activities */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs'>
                {/* Left Column: Factor DAFO & Evidencia */}
                <div className='rounded-lg border bg-muted/20 p-3 space-y-2.5'>
                  <div className='flex items-center gap-1.5 font-semibold text-foreground text-xs'>
                    <ShieldCheckIcon className='size-3.5 text-primary' />
                    <span>Justificación Metodológica y Evidencia DAFO</span>
                  </div>

                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='font-semibold text-muted-foreground text-xs'>Factor Asociado:</span>
                      {action.factorId && (
                        <Badge variant='outline' className='text-xs font-bold'>
                          {action.factorId}
                        </Badge>
                      )}
                      <span className='font-medium text-foreground break-words'>{action.factor}</span>
                    </div>
                    {factor?.description && (
                      <p className='text-xs text-muted-foreground italic pl-2 border-l-2 border-primary/30 break-words leading-relaxed'>
                        "{factor.description}"
                      </p>
                    )}
                  </div>

                  {/* Evidence quote if exists */}
                  {factor?.evidence ? (
                    <div className='space-y-1 bg-background/60 p-2.5 rounded-md border'>
                      <div className='flex items-center gap-1 text-xs font-semibold text-foreground/80'>
                        <FileTextIcon className='size-3 text-primary' />
                        <span>Evidencia Documentada:</span>
                      </div>
                      <p className='text-xs text-muted-foreground break-words leading-relaxed'>
                        {factor.evidence}
                      </p>
                    </div>
                  ) : action.justification ? (
                    <div className='space-y-1 bg-background/60 p-2.5 rounded-md border'>
                      <div className='flex items-center gap-1 text-xs font-semibold text-foreground/80'>
                        <FileTextIcon className='size-3 text-primary' />
                        <span>Fundamentación:</span>
                      </div>
                      <p className='text-xs text-muted-foreground break-words leading-relaxed'>
                        {action.justification}
                      </p>
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground italic'>
                      Sin evidencia textual adjunta en el factor.
                    </p>
                  )}
                </div>

                {/* Right Column: Execution Tasks (Kanban) */}
                <div className='rounded-lg border bg-muted/20 p-3 space-y-2.5'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 font-semibold text-foreground text-xs'>
                      <LayersIcon className='size-3.5 text-primary' />
                      <span>Actividades de Ejecución Kanban ({actionTasks.length})</span>
                    </div>
                    {onAddNewTaskForCame && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-6 text-xs gap-1 text-primary hover:text-primary font-medium p-0 hover:bg-transparent'
                        onClick={() => onAddNewTaskForCame(action.id, action.action || action.objective || action.id)}
                      >
                        <PlusIcon className='size-3' />
                        <span>Añadir Actividad</span>
                      </Button>
                    )}
                  </div>

                  {actionTasks.length === 0 ? (
                    <div className='rounded-md border border-dashed bg-background/40 p-4 text-center space-y-2'>
                      <p className='text-xs text-muted-foreground'>
                        No hay tareas Kanban asignadas a esta acción estratégica.
                      </p>
                      {onAddNewTaskForCame && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs gap-1'
                          onClick={() => onAddNewTaskForCame(action.id, action.action || action.objective || action.id)}
                        >
                          <PlusIcon className='size-3' />
                          <span>Crear primera actividad</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className='space-y-1.5 max-h-48 overflow-y-auto pr-1'>
                      {actionTasks.map(task => {
                        const col = columnMap.get(task.column_id)
                        const isDone = doneColumnIds.has(task.column_id)

                        return (
                          <div
                            key={task.id}
                            className='flex items-center justify-between gap-2 p-2 rounded-md bg-background border hover:border-primary/40 transition-colors'
                          >
                            <div className='min-w-0 flex-1 space-y-0.5'>
                              <div className='flex items-center gap-1.5'>
                                {isDone ? (
                                  <CheckCircle2Icon className='size-3.5 text-emerald-500 shrink-0' />
                                ) : (
                                  <div className='size-2 rounded-full bg-primary shrink-0' />
                                )}
                                <span
                                  className='font-semibold text-xs text-foreground break-words line-clamp-2 leading-snug'
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                              </div>
                              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <span>{col?.name || 'Backlog'}</span>
                                {task.budget_amount ? <span>• ${Number(task.budget_amount).toLocaleString()}</span> : null}
                              </div>
                            </div>

                            {onEditTask && (
                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-6 text-xs text-muted-foreground hover:text-foreground'
                                onClick={() => onEditTask(task)}
                              >
                                Ver
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
