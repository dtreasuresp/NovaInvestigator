'use client'

import React, { useMemo } from 'react'
import {
  LayersIcon,
  FolderKanbanIcon,
  TargetIcon,
  DollarSignIcon,
  UsersIcon,
  CheckCircle2Icon,
  ClockIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  Settings2Icon,
  PlusIcon,
  FlameIcon
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanTask, KanbanMember } from '../kanban/components/card-form-dialog'
import type { KanbanColumnData } from '../kanban/components/kanban-column'

interface StrategicExecutionHeaderProps {
  project: StrategicProjectItem
  tasks: KanbanTask[]
  columns: KanbanColumnData[]
  members: KanbanMember[]
  onOpenNewTask?: () => void
  onOpenSettings?: () => void
}

export function StrategicExecutionHeader({
  project,
  tasks,
  columns,
  members,
  onOpenNewTask,
  onOpenSettings
}: StrategicExecutionHeaderProps) {
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

  const projectTasks = tasks.filter(t => t.project_id === project.id)
  const totalTasks = projectTasks.length
  const completedTasks = projectTasks.filter(t => doneColumnIds.has(t.column_id)).length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const overdueTasks = projectTasks.filter(t => {
    if (!t.due_date) return false
    const isCompleted = doneColumnIds.has(t.column_id)
    return !isCompleted && new Date(t.due_date).getTime() < Date.now()
  }).length

  const budgetAllocated = projectTasks.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0)
  const budgetCap = Number(project.budgetTotal) || 0
  const isBudgetOver = budgetCap > 0 && budgetAllocated > budgetCap
  const budgetRatio = budgetCap > 0 ? Math.round((budgetAllocated / budgetCap) * 100) : 0

  const totalCameActions = project.cameActions?.length || 0
  const coveredCameCount = useMemo(() => {
    const uniqueCoveredCame = new Set(
      projectTasks.map(t => t.came_action_id).filter(Boolean)
    )
    return uniqueCoveredCame.size
  }, [projectTasks])
  const cameCoveragePercent = totalCameActions > 0 ? Math.round((coveredCameCount / totalCameActions) * 100) : 0

  const uniqueAssigneeIds = useMemo(() => {
    const set = new Set<string>()
    projectTasks.forEach(t => (t.assignee_ids || []).forEach(id => set.add(id)))
    return Array.from(set)
  }, [projectTasks])

  const activeTeamMembers = uniqueAssigneeIds
    .map(id => memberMap.get(id))
    .filter((m): m is KanbanMember => Boolean(m))

  const leaderMember = project.leaderUserId ? memberMap.get(project.leaderUserId) : null

  return (
    <div className='rounded-xl border bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-xs space-y-4'>
      {/* Top row: Title, Badges & Action Buttons */}
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='space-y-1 min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2
              className='text-lg sm:text-xl font-bold tracking-tight text-foreground break-words leading-tight'
              title={project.title}
            >
              {project.title}
            </h2>
            <Badge
              variant='outline'
              className='text-xs font-semibold bg-primary/10 text-primary border-primary/20 break-words'
              title={project.organization || undefined}
            >
              {project.organization}
            </Badge>
            {project.investigationId && (
              <Link
                href={`/apps/investigator?id=${project.investigationId}`}
                className='inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-muted px-2 py-0.5 rounded-md border'
                title='Abrir expediente en Research'
              >
                <span>Expediente Research</span>
                <ExternalLinkIcon className='size-3' />
              </Link>
            )}
          </div>
          {project.objective && (
            <p
              className='text-xs text-muted-foreground break-words leading-relaxed max-w-4xl'
              title={project.objective}
            >
              <span className='font-semibold text-foreground/80'>Objetivo Estratégico:</span> {project.objective}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2 shrink-0'>
          {onOpenNewTask && (
            <Button size='sm' className='h-8 text-xs gap-1.5 shadow-xs' onClick={onOpenNewTask}>
              <PlusIcon className='size-3.5' />
              <span>Nueva Actividad</span>
            </Button>
          )}
          {onOpenSettings && (
            <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5' onClick={onOpenSettings}>
              <Settings2Icon className='size-3.5' />
              <span>Ajustes</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t'>
        {/* KPI 1: Execution Progress */}
        <div className='rounded-lg border bg-background/50 p-2.5 space-y-1.5'>
          <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs font-medium'>Progreso de Ejecución</span>
            <CheckCircle2Icon className='size-3.5 text-primary' />
          </div>
          <div className='flex items-baseline justify-between'>
            <span className='text-base sm:text-lg font-bold text-foreground'>{progressPercent}%</span>
            <span className='text-xs text-muted-foreground'>{completedTasks}/{totalTasks} tareas</span>
          </div>
          <Progress value={progressPercent} className='h-1.5' />
        </div>

        {/* KPI 2: Overdue / Risk Activities */}
        <div className='rounded-lg border bg-background/50 p-2.5 space-y-1.5'>
          <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs font-medium'>Actividades Vencidas</span>
            <ClockIcon className={`size-3.5 ${overdueTasks > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
          </div>
          <div className='flex items-baseline justify-between'>
            <span className={`text-base sm:text-lg font-bold ${overdueTasks > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {overdueTasks}
            </span>
            <span className='text-xs text-muted-foreground'>
              {overdueTasks === 0 ? 'Sin retrasos' : 'Requieren atención'}
            </span>
          </div>
          <div className='h-1.5 w-full rounded-full bg-muted overflow-hidden'>
            <div
              className={`h-full transition-all ${overdueTasks > 0 ? 'bg-destructive' : 'bg-emerald-500'}`}
              style={{ width: overdueTasks > 0 ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* KPI 3: Budget Health */}
        <div className='rounded-lg border bg-background/50 p-2.5 space-y-1.5'>
          <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs font-medium'>Salud Presupuestaria</span>
            <DollarSignIcon className={`size-3.5 ${isBudgetOver ? 'text-destructive' : 'text-emerald-500'}`} />
          </div>
          <div className='flex items-baseline justify-between'>
            <span className={`text-base sm:text-lg font-bold ${isBudgetOver ? 'text-destructive' : 'text-foreground'}`}>
              ${budgetAllocated.toLocaleString()}
            </span>
            <span className='text-xs text-muted-foreground'>
              {budgetCap > 0 ? `Tope: $${budgetCap.toLocaleString()}` : 'Sin tope'}
            </span>
          </div>
          <Progress
            value={Math.min(budgetRatio, 100)}
            className={`h-1.5 ${isBudgetOver ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500'}`}
          />
        </div>

        {/* KPI 4: Strategic CAME Coverage */}
        <div className='rounded-lg border bg-background/50 p-2.5 space-y-1.5'>
          <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs font-medium'>Cobertura CAME</span>
            <TargetIcon className='size-3.5 text-primary' />
          </div>
          <div className='flex items-baseline justify-between'>
            <span className='text-base sm:text-lg font-bold text-foreground'>
              {totalCameActions > 0 ? `${cameCoveragePercent}%` : 'N/A'}
            </span>
            <span className='text-xs text-muted-foreground'>
              {totalCameActions > 0 ? `${coveredCameCount}/${totalCameActions} acciones` : 'Independiente'}
            </span>
          </div>
          <Progress value={totalCameActions > 0 ? cameCoveragePercent : 100} className='h-1.5' />
        </div>

        {/* KPI 5: Team & Leadership */}
        <div className='rounded-lg border bg-background/50 p-2.5 space-y-1.5 col-span-2 sm:col-span-2 lg:col-span-1'>
          <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs font-medium'>Equipo y Liderazgo</span>
            <UsersIcon className='size-3.5 text-primary' />
          </div>
          <div className='flex items-center justify-between min-h-6'>
            <div className='flex -space-x-1.5 overflow-hidden'>
              <TooltipProvider delay={150}>
                {activeTeamMembers.slice(0, 4).map(member => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger>
                      <Avatar className='size-6 border-2 border-background ring-1 ring-border text-xs font-bold'>
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback>{member.initials || member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent className='text-xs'>
                      <p className='font-semibold'>{member.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {member.id === project.leaderUserId ? '👑 Líder del Proyecto' : member.roleName || member.role || 'Miembro'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {activeTeamMembers.length > 4 && (
                <div className='flex size-6 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-semibold text-muted-foreground'>
                  +{activeTeamMembers.length - 4}
                </div>
              )}
            </div>
            <span
              className='text-xs font-medium text-foreground truncate max-w-[100px]'
              title={leaderMember ? `Líder: ${leaderMember.name}` : `${activeTeamMembers.length} miembros`}
            >
              {leaderMember ? `${leaderMember.name.split(' ')[0]} 👑` : `${activeTeamMembers.length} miembros`}
            </span>
          </div>
          <p
            className='text-xs text-muted-foreground truncate'
            title={leaderMember ? `Líder: ${leaderMember.name}` : 'Sin líder asignado'}
          >
            {leaderMember ? `Líder: ${leaderMember.name}` : 'Sin líder asignado'}
          </p>
        </div>
      </div>
    </div>
  )
}
