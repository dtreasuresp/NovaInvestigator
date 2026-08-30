'use client'

import React, { useState, useEffect } from 'react'
import {
  FolderPlusIcon,
  SparklesIcon,
  LayersIcon,
  ArrowRightIcon,
  FileTextIcon,
  Loader2Icon,
  ListTodoIcon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ProjectCreationWizard } from '@/views/apps/projects/components/project-creation-wizard'

interface InvestigationSummaryItem {
  id: string
  title: string
  organization: string
}

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: (projectId: string) => void
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onProjectCreated
}: NewProjectDialogProps) {
  const [mode, setMode] = useState<'choice' | 'wizard'>('choice')
  const [projectType, setProjectType] = useState<'standalone' | 'derived'>('standalone')
  const [investigations, setInvestigations] = useState<InvestigationSummaryItem[]>([])
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('')
  const [loadingInv, setLoadingInv] = useState<boolean>(false)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState<boolean>(false)

  useEffect(() => {
    if (!open) {
      setMode('choice')
      setWizardOpen(false)
      return
    }

    // Load user's investigations
    setLoadingInv(true)
    fetch('/api/kanban')
      .then(async res => {
        if (!res.ok) return
        const data = await res.json()
        if (data.ok && Array.isArray(data.projects)) {
          setInvestigations(
            data.projects.map((p: { id: string; title: string; organization: string }) => ({
              id: p.id,
              title: p.title,
              organization: p.organization
            }))
          )
        }
      })
      .finally(() => setLoadingInv(false))
  }, [open])

  const handleStartWizard = () => {
    onOpenChange(false)
    setWizardOpen(true)
  }

  const selectedInvObj = investigations.find(i => i.id === selectedInvestigationId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <div className='flex items-center gap-2'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <FolderPlusIcon className='size-4' />
              </div>
              <div>
                <DialogTitle className='text-base font-bold'>Nuevo Proyecto</DialogTitle>
                <DialogDescription className='text-xs'>
                  Elija la modalidad de creación del proyecto.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='space-y-3 py-2'>
            {/* Opción Standalone */}
            <div
              onClick={() => setProjectType('standalone')}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                projectType === 'standalone'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <LayersIcon className='mt-0.5 size-4 text-primary' />
              <div className='space-y-0.5'>
                <span className='text-xs font-bold text-foreground'>Proyecto Independiente</span>
                <p className='text-[11px] text-muted-foreground'>
                  Iniciativa operativa sin vinculación directa a matrices de diagnóstico CAME.
                </p>
              </div>
            </div>

            {/* Opción Derivado */}
            <div
              onClick={() => setProjectType('derived')}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                projectType === 'derived'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <ListTodoIcon className='mt-0.5 size-4 text-primary' />
              <div className='space-y-0.5'>
                <span className='text-xs font-bold text-foreground'>Derivado de Investigación CAME</span>
                <p className='text-[11px] text-muted-foreground'>
                  Importa acciones CAME formuladas en la matriz estratégica y preserva la trazabilidad.
                </p>
              </div>
            </div>

            {/* Selector de Investigación si es Derivado */}
            {projectType === 'derived' && (
              <div className='space-y-1.5 rounded-lg border bg-muted/20 p-3'>
                <Label className='text-xs font-medium'>Seleccione la Investigación *</Label>
                {loadingInv ? (
                  <div className='flex items-center text-xs text-muted-foreground'>
                    <Loader2Icon className='mr-2 size-3.5 animate-spin' /> Cargando investigaciones...
                  </div>
                ) : (
                  <Select value={selectedInvestigationId} onValueChange={val => setSelectedInvestigationId(val || '')}>
                    <SelectTrigger className='text-xs'>
                      <SelectValue placeholder='Seleccione investigación origen...' />
                    </SelectTrigger>
                    <SelectContent>
                      {investigations.map(inv => (
                        <SelectItem key={inv.id} value={inv.id} className='text-xs'>
                          {inv.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <div className='flex items-center justify-end gap-2 border-t pt-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              className='text-xs'
            >
              Cancelar
            </Button>
            <Button
              size='sm'
              disabled={projectType === 'derived' && !selectedInvestigationId}
              onClick={handleStartWizard}
              className='gap-1.5 text-xs'
            >
              Continuar al Wizard
              <ArrowRightIcon className='size-3.5' />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shared Wizard */}
      <ProjectCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        investigationId={projectType === 'derived' ? selectedInvestigationId : undefined}
        investigationTitle={projectType === 'derived' ? selectedInvObj?.title : undefined}
        onProjectCreated={onProjectCreated}
      />
    </>
  )
}
