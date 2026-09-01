'use client'

import React, { useState } from 'react'
import {
  FolderKanbanIcon,
  ChevronsUpDownIcon,
  CheckIcon,
  SearchIcon,
  PlusIcon,
  LayersIcon,
  Loader2Icon
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface StrategicProjectItem {
  id: string
  title: string
  description?: string | null
  objective?: string | null
  organization: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  investigationId: string | null
  leaderUserId: string | null
  budgetTotal?: number | null
  budgetMode?: 'action_based' | 'total_first'
  startDate?: string | null
  endDate?: string | null
  cameActions?: Array<{
    id: string
    type?: string
    action?: string
    objective?: string
    problem?: string
    factor?: string
    factorId?: string
    strategyId?: string
    responsible?: string
    justification?: string
  }>
  swotFactors?: Array<{
    id: string
    code?: string
    type?: string
    description?: string
    evidence?: string
  }>
  strategies?: Array<{
    id: string
    title?: string
  }>
  createdAt?: string
}

interface StrategicContextSwitcherProps {
  projects: StrategicProjectItem[]
  selectedId: string // 'all' or projectId
  onSelect: (projectId: string) => void
  onOpenNewProjectModal?: () => void
  loading?: boolean
}

export function StrategicContextSwitcher({
  projects,
  selectedId,
  onSelect,
  onOpenNewProjectModal,
  loading = false
}: StrategicContextSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedProject = projects.find(p => p.id === selectedId)

  const filteredProjects = projects.filter(p => {
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.organization.toLowerCase().includes(q)
    )
  })

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant='outline' className='text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'>Activo</Badge>
      case 'planning':
        return <Badge variant='outline' className='text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'>Plan</Badge>
      case 'completed':
        return <Badge variant='outline' className='text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'>Listo</Badge>
      case 'on_hold':
        return <Badge variant='outline' className='text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'>Pausa</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className='flex h-9 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-xs text-muted-foreground animate-pulse w-64'>
        <Loader2Icon className='size-3.5 animate-spin text-primary shrink-0' />
        <span className='truncate'>Cargando contexto estratégico...</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className='h-9 w-full sm:w-80 justify-between text-xs px-3 font-normal border rounded-md bg-background border-input hover:border-primary/40 transition-colors shadow-xs flex items-center'
      >
        <div className='flex items-center gap-2 min-w-0 overflow-hidden text-left'>
          <div className='flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
            <FolderKanbanIcon className='size-3.5' />
          </div>
          <div className='flex flex-col min-w-0 truncate'>
            {selectedId === 'all' ? (
              <span className='font-semibold text-foreground truncate'>
                Todos los Contextos Estratégicos
              </span>
            ) : selectedProject ? (
              <>
                <span className='font-semibold text-foreground truncate' title={selectedProject.title}>
                  {selectedProject.title}
                </span>
                <span className='text-xs text-muted-foreground truncate' title={selectedProject.organization}>
                  {selectedProject.organization}
                </span>
              </>
            ) : (
              <span className='text-muted-foreground truncate italic'>
                Contexto no disponible
              </span>
            )}
          </div>
        </div>
        <ChevronsUpDownIcon className='ml-2 size-3.5 shrink-0 opacity-50' />
      </PopoverTrigger>
      <PopoverContent className='w-88 p-2 text-xs' align='start'>
        {/* Search Bar */}
        <div className='relative mb-2'>
          <SearchIcon className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Buscar proyecto o investigación...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='h-8 pl-8 text-xs'
            autoFocus
          />
        </div>

        {/* Options List */}
        <div className='max-h-60 overflow-y-auto space-y-1 pr-1'>
          {/* Global 'All' option */}
          <button
            type='button'
            onClick={() => {
              onSelect('all')
              setOpen(false)
            }}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent',
              selectedId === 'all' && 'bg-accent/80 font-medium'
            )}
          >
            <div className='flex items-center gap-2 min-w-0'>
              <div className='flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                <LayersIcon className='size-3.5' />
              </div>
              <div className='flex flex-col min-w-0'>
                <span className='text-xs font-medium text-foreground truncate'>
                  Todos los Contextos Estratégicos
                </span>
                <span className='text-xs text-muted-foreground'>
                  Vista consolidada del portafolio
                </span>
              </div>
            </div>
            {selectedId === 'all' && <CheckIcon className='size-3.5 text-primary shrink-0' />}
          </button>

          <div className='my-1 border-t border-border/50' />

          {/* Project Items */}
          {filteredProjects.length === 0 ? (
            <div className='py-4 text-center text-xs text-muted-foreground'>
              No se encontraron proyectos coincidentes.
            </div>
          ) : (
            filteredProjects.map(project => (
              <button
                key={project.id}
                type='button'
                onClick={() => {
                  onSelect(project.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent',
                  selectedId === project.id && 'bg-accent/80 font-medium'
                )}
                title={project.title}
              >
                <div className='flex items-center gap-2 min-w-0 flex-1'>
                  <div className='flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                    <FolderKanbanIcon className='size-3.5' />
                  </div>
                  <div className='flex flex-col min-w-0 flex-1'>
                    <span className='text-xs font-medium text-foreground truncate' title={project.title}>
                      {project.title}
                    </span>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      <span className='text-xs text-muted-foreground truncate max-w-[140px]' title={project.organization}>
                        {project.organization}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </div>
                {selectedId === project.id && (
                  <CheckIcon className='size-3.5 text-primary shrink-0 ml-1' />
                )}
              </button>
            ))
          )}
        </div>

        {/* Action Button at bottom */}
        {onOpenNewProjectModal && (
          <div className='mt-2 pt-2 border-t'>
            <Button
              size='sm'
              variant='ghost'
              className='w-full justify-start gap-1.5 text-xs text-primary hover:text-primary font-semibold h-8'
              onClick={() => {
                setOpen(false)
                onOpenNewProjectModal()
              }}
            >
              <PlusIcon className='size-3.5' />
              <span>Crear Nuevo Proyecto</span>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
