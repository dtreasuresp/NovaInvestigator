'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanbanIcon,
  PlusCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  ArrowRightIcon,
  LayersIcon,
  Loader2Icon
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ProjectWithStats } from '@/features/projects'

interface ImplementationProjectsCardProps {
  investigationId?: string
  onCreateProject?: () => void
}

export function ImplementationProjectsCard({
  investigationId,
  onCreateProject
}: ImplementationProjectsCardProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!investigationId) {
      setProjects([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/investigations/${investigationId}/projects`)
      .then(async res => {
        if (cancelled) return
        if (!res.ok) return
        const data = (await res.json()) as { ok: boolean; projects: ProjectWithStats[] }
        if (data.ok && Array.isArray(data.projects)) {
          setProjects(data.projects)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [investigationId])

  const totalActivities = projects.reduce((acc, p) => acc + (p.tasksTotal || 0), 0)
  const completedActivities = projects.reduce((acc, p) => acc + (p.tasksCompleted || 0), 0)
  const inProgressActivities = projects.reduce((acc, p) => acc + (p.tasksInProgress || 0), 0)
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget_total || 0), 0)
  const globalProgress = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0

  return (
    <Card className='shadow-xs'>
      <CardHeader className='flex flex-row items-center justify-between pb-3'>
        <div className='flex items-center gap-2'>
          <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <FolderKanbanIcon className='size-5' />
          </div>
          <div>
            <CardTitle className='text-base font-semibold'>Proyectos de Implementación</CardTitle>
            <CardDescription className='text-xs'>
              Iniciativas operativas y gobernanza Kanban derivadas de esta investigación.
            </CardDescription>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='gap-1 text-xs'
            onClick={() => router.push('/apps/kanban')}
          >
            <LayersIcon className='size-3.5' />
            Ver Kanban
          </Button>
          <Button
            size='sm'
            className='gap-1 text-xs'
            onClick={onCreateProject}
          >
            <PlusCircleIcon className='size-3.5' />
            + Crear proyecto
          </Button>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Métricas Agregadas */}
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          <div className='rounded-md border bg-muted/30 p-2.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>Proyectos Activos</span>
            <div className='mt-1 flex items-baseline gap-1'>
              <span className='text-lg font-bold text-foreground'>{projects.length}</span>
              <span className='text-[10px] text-muted-foreground'>iniciativas</span>
            </div>
          </div>

          <div className='rounded-md border bg-muted/30 p-2.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>Actividades Kanban</span>
            <div className='mt-1 flex items-baseline gap-1'>
              <span className='text-lg font-bold text-foreground'>{completedActivities}</span>
              <span className='text-[10px] text-muted-foreground'>/ {totalActivities} listas</span>
            </div>
          </div>

          <div className='rounded-md border bg-muted/30 p-2.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>Presupuesto Total</span>
            <div className='mt-1 flex items-baseline gap-1'>
              <span className='text-lg font-bold text-foreground'>
                ${totalBudget.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className='rounded-md border bg-muted/30 p-2.5'>
            <span className='text-[11px] font-medium text-muted-foreground'>Avance Global</span>
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-lg font-bold text-foreground'>{globalProgress}%</span>
              <div className='w-16'>
                <Progress value={globalProgress} className='h-2' />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Proyectos */}
        {loading ? (
          <div className='flex items-center justify-center py-6 text-xs text-muted-foreground'>
            <Loader2Icon className='mr-2 size-4 animate-spin' />
            Cargando proyectos vinculados...
          </div>
        ) : projects.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center'>
            <FolderKanbanIcon className='size-8 text-muted-foreground/60' />
            <p className='mt-2 text-xs font-medium text-foreground'>
              Aún no hay proyectos de ejecución vinculados a esta investigación.
            </p>
            <p className='mt-1 max-w-sm text-[11px] text-muted-foreground'>
              Transforme las acciones del plan CAME en proyectos y actividades asignables en el tablero Kanban.
            </p>
            <Button
              size='sm'
              variant='outline'
              className='mt-3 gap-1 text-xs'
              onClick={onCreateProject}
            >
              <PlusCircleIcon className='size-3.5 text-primary' />
              Crear primer proyecto derivado
            </Button>
          </div>
        ) : (
          <div className='space-y-2.5'>
            {projects.map(proj => (
              <div
                key={proj.id}
                className='flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-foreground'>{proj.name}</span>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {proj.priority}
                    </Badge>
                    <Badge variant='secondary' className='text-[10px]'>
                      {proj.budget_mode === 'total_first' ? 'Presupuesto Fijado' : 'Base Acciones'}
                    </Badge>
                  </div>
                  <p className='line-clamp-1 text-[11px] text-muted-foreground'>
                    {proj.objective || proj.description || 'Sin objetivo registrado'}
                  </p>
                </div>

                <div className='flex items-center gap-4 text-xs'>
                  <div className='text-right'>
                    <span className='font-semibold text-foreground'>
                      ${Number(proj.budget_total).toLocaleString()}
                    </span>
                    <p className='text-[10px] text-muted-foreground'>
                      {proj.tasksCompleted}/{proj.tasksTotal} tareas ({proj.progressPercentage}%)
                    </p>
                  </div>

                  <div className='w-20'>
                    <Progress value={proj.progressPercentage} className='h-1.5' />
                  </div>

                  <Button
                    size='icon'
                    variant='ghost'
                    className='size-7'
                    onClick={() => router.push(`/apps/kanban?project=${proj.id}`)}
                  >
                    <ArrowRightIcon className='size-3.5' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
