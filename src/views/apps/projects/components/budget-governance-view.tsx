'use client'

import React, { useMemo } from 'react'
import {
  DollarSignIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  TrendingUpIcon,
  CreditCardIcon,
  LayersIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanTask } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface BudgetGovernanceViewProps {
  project: StrategicProjectItem | null
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
}

export function BudgetGovernanceView({
  project,
  tasks,
  columns
}: BudgetGovernanceViewProps) {
  const columnMap = useMemo(() => {
    const map = new Map<string, KanbanColumnData>()
    columns.forEach(c => map.set(c.id, c))
    return map
  }, [columns])

  const budgetCap = project?.budgetTotal || 0
  const budgetMode = project?.budgetMode || 'action_based'

  const sumActivitiesBudget = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)
  }, [tasks])

  const remaining = budgetCap - sumActivitiesBudget
  const isOverBudget = budgetCap > 0 && remaining < 0
  const consumptionPercent = budgetCap > 0 ? Math.round((sumActivitiesBudget / budgetCap) * 100) : 0

  // Sorted tasks by budget descending
  const rankedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (Number(b.budget_amount) || 0) - (Number(a.budget_amount) || 0))
  }, [tasks])

  if (!project) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground'>
        Seleccione un proyecto o investigación para ver el control presupuestario.
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3'>
        <div>
          <h3 className='text-sm font-bold text-foreground flex items-center gap-2'>
            <DollarSignIcon className='size-4 text-emerald-600 dark:text-emerald-400' />
            Gobernanza Financiera y Presupuesto de Ejecución
          </h3>
          <p className='text-xs text-muted-foreground'>
            Control en tiempo real del presupuesto asignado a actividades Kanban y contraste contra el tope autorizado.
          </p>
        </div>
        <Badge variant='outline' className='text-xs font-semibold self-start sm:self-auto'>
          Modo: {budgetMode === 'action_based' ? 'Suma de Actividades' : 'Tope Global'}
        </Badge>
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Card 1: Presupuesto Total Tope */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Presupuesto Fijado (Tope)</span>
              <CreditCardIcon className='size-3.5 text-primary' />
            </CardDescription>
            <CardTitle className='text-xl font-bold text-foreground'>
              ${budgetCap.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              {budgetCap > 0 ? 'Límite máximo autorizado' : 'Sin tope predefinido'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Asignado en Actividades */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Total Asignado en Tareas</span>
              <DollarSignIcon className='size-3.5 text-emerald-500' />
            </CardDescription>
            <CardTitle className={`text-xl font-bold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
              ${sumActivitiesBudget.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              {tasks.filter(t => (Number(t.budget_amount) || 0) > 0).length} de {tasks.length} tareas con fondos
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Saldo Disponible */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>Saldo Restante</span>
              {isOverBudget ? (
                <AlertCircleIcon className='size-3.5 text-destructive' />
              ) : (
                <CheckCircle2Icon className='size-3.5 text-emerald-500' />
              )}
            </CardDescription>
            <CardTitle className={`text-xl font-bold ${isOverBudget ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ${remaining.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              {isOverBudget ? 'Sobreasignación presupuestaria' : 'Fondos disponibles'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: % Consumo */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-medium flex items-center justify-between'>
              <span>% de Consumo Financiero</span>
              <TrendingUpIcon className='size-3.5 text-primary' />
            </CardDescription>
            <CardTitle className='text-xl font-bold text-foreground'>
              {budgetCap > 0 ? `${consumptionPercent}%` : '100%'}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 space-y-1.5'>
            <Progress
              value={Math.min(consumptionPercent, 100)}
              className={`h-1.5 ${isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500'}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table: Activities Financial Allocation */}
      <Card className='shadow-xs'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm font-semibold flex items-center gap-2'>
            <LayersIcon className='size-4 text-primary' />
            Desglose de Asignación por Actividad
          </CardTitle>
          <CardDescription className='text-xs'>
            Distribución de fondos por cada tarea de ejecución del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs border-collapse'>
              <thead>
                <tr className='border-b bg-muted/40 text-muted-foreground font-semibold'>
                  <th className='p-2.5 pl-3'>Actividad</th>
                  <th className='p-2.5'>Acción CAME</th>
                  <th className='p-2.5'>Estado</th>
                  <th className='p-2.5'>Prioridad</th>
                  <th className='p-2.5 pr-3 text-right'>Fondo Asignado</th>
                  <th className='p-2.5 pr-3 text-right'>% del Total</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {rankedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-6 text-center text-muted-foreground'>
                      No hay actividades registradas con presupuesto en este proyecto.
                    </td>
                  </tr>
                ) : (
                  rankedTasks.map(task => {
                    const amount = Number(task.budget_amount) || 0
                    const percentOfTotal = sumActivitiesBudget > 0 ? Math.round((amount / sumActivitiesBudget) * 100) : 0
                    const col = columnMap.get(task.column_id)

                    return (
                      <tr key={task.id} className='hover:bg-muted/30 transition-colors'>
                        <td className='p-2.5 pl-3 font-semibold text-foreground min-w-[200px] max-w-sm'>
                          <span
                            className='break-words line-clamp-2 leading-snug'
                            title={task.title}
                          >
                            {task.title}
                          </span>
                        </td>
                        <td className='p-2.5'>
                          {task.came_action_id ? (
                            <Badge variant='outline' className='text-xs font-bold bg-primary/5 text-primary border-primary/20'>
                              {task.came_action_id}
                            </Badge>
                          ) : (
                            <span className='text-muted-foreground text-xs'>-</span>
                          )}
                        </td>
                        <td className='p-2.5'>
                          <Badge variant='secondary' className='text-xs font-medium'>
                            {col?.name || 'Backlog'}
                          </Badge>
                        </td>
                        <td className='p-2.5 uppercase text-xs font-bold tracking-wide'>
                          {task.priority}
                        </td>
                        <td className='p-2.5 pr-3 text-right font-bold text-foreground'>
                          ${amount.toLocaleString()}
                        </td>
                        <td className='p-2.5 pr-3 text-right text-muted-foreground font-medium'>
                          {percentOfTotal}%
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
