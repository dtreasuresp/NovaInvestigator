'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Loader2Icon,
  Settings2Icon,
  SaveIcon,
  TargetIcon,
  ShieldCheckIcon,
  PlusIcon,
  CalendarIcon,
  DollarSignIcon,
  UsersIcon,
  InfoIcon
} from 'lucide-react'
import type { StrategicProjectItem } from './strategic-context-switcher'
import type { KanbanMember } from '../kanban/components/card-form-dialog'

interface ProjectSettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: StrategicProjectItem | null
  members: KanbanMember[]
  onProjectUpdated: () => void
}

interface EligibleCameAction {
  action: {
    id: string
    type: string
    factor: string
    action?: string
    objective?: string
    problem?: string
  }
  isAssigned: boolean
}

export function ProjectSettingsDrawer({
  open,
  onOpenChange,
  project,
  members,
  onProjectUpdated
}: ProjectSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>('general')

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [objective, setObjective] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [status, setStatus] = useState<'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'>('active')
  const [leaderUserId, setLeaderUserId] = useState<string>('')
  const [budgetMode, setBudgetMode] = useState<'action_based' | 'total_first'>('action_based')
  const [budgetTotal, setBudgetTotal] = useState<number>(0)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // CAME Sync State
  const [eligibleActions, setEligibleActions] = useState<EligibleCameAction[]>([])
  const [selectedCameIdsToSync, setSelectedCameIdsToSync] = useState<string[]>([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [syncingCame, setSyncingCame] = useState(false)

  useEffect(() => {
    if (project && open) {
      setName(project.title || '')
      setDescription(project.description || '')
      setObjective(project.objective || '')
      setPriority(project.priority || 'medium')
      setStatus(project.status || 'active')
      setLeaderUserId(project.leaderUserId || '')
      setBudgetMode(project.budgetMode || 'action_based')
      setBudgetTotal(project.budgetTotal || 0)
      setStartDate(project.startDate ? project.startDate.split('T')[0] : '')
      setEndDate(project.endDate ? project.endDate.split('T')[0] : '')
      setSelectedCameIdsToSync([])

      // Load eligible CAME actions if project is linked to an investigation
      if (project.investigationId) {
        loadEligibleCameActions(project.investigationId)
      } else {
        setEligibleActions([])
      }
    }
  }, [project, open])

  const loadEligibleCameActions = async (investigationId: string) => {
    try {
      setLoadingEligible(true)
      const res = await fetch(`/api/investigations/${investigationId}/came/eligible-actions`)
      if (!res.ok) return
      const data = await res.json()
      if (data.ok && Array.isArray(data.actions)) {
        setEligibleActions(data.actions)
      }
    } catch {
      // Non-critical, ignore
    } finally {
      setLoadingEligible(false)
    }
  }

  const handleSave = async () => {
    if (!project) return
    if (!name.trim()) {
      toast.error('El nombre del proyecto es obligatorio.')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: name.trim().slice(0, 300),
        description: description.trim().slice(0, 4000),
        objective: objective.trim().slice(0, 4000),
        priority,
        status,
        leaderUserId: leaderUserId || null,
        budgetMode,
        budgetTotal: Number(budgetTotal) || 0,
        startDate: startDate || null,
        endDate: endDate || null
      }

      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.messageKey || 'Error al actualizar el proyecto.')
      }

      toast.success('Ajustes del proyecto actualizados correctamente.')
      onOpenChange(false)
      onProjectUpdated()
    } catch {
      toast.error('No se pudo guardar la configuración del proyecto.')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncCameActions = async () => {
    if (!project || selectedCameIdsToSync.length === 0) return

    try {
      setSyncingCame(true)
      const res = await fetch(`/api/projects/${project.id}/came-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameActionIds: selectedCameIdsToSync })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.messageKey || 'Error al sincronizar acciones CAME.')
      }

      toast.success(`Se importaron ${data.addedCount} acciones CAME y se crearon sus tareas Kanban.`)
      setSelectedCameIdsToSync([])
      if (project.investigationId) {
        loadEligibleCameActions(project.investigationId)
      }
      onProjectUpdated()
    } catch {
      toast.error('No se pudieron sincronizar las acciones CAME.')
    } finally {
      setSyncingCame(false)
    }
  }

  const toggleSelectCameAction = (id: string) => {
    setSelectedCameIdsToSync(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const unassignedCameActions = eligibleActions.filter(item => !item.isAssigned)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto text-xs'>
        <DialogHeader>
          <DialogTitle className='text-sm font-bold flex items-center gap-2'>
            <Settings2Icon className='size-4 text-primary' />
            Configuración y Gobernanza del Proyecto
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Modifique los parámetros estratégicos, presupuesto, líder responsable y sincronice acciones CAME.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid grid-cols-4 h-9 text-xs mb-4'>
            <TabsTrigger value='general' className='text-xs gap-1.5'>
              <InfoIcon className='size-3.5' />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value='governance' className='text-xs gap-1.5'>
              <UsersIcon className='size-3.5' />
              <span>Equipo</span>
            </TabsTrigger>
            <TabsTrigger value='budget' className='text-xs gap-1.5'>
              <DollarSignIcon className='size-3.5' />
              <span>Presupuesto</span>
            </TabsTrigger>
            <TabsTrigger value='came' className='text-xs gap-1.5'>
              <TargetIcon className='size-3.5' />
              <span>CAME ({project?.cameActions?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: General & Objective */}
          <TabsContent value='general' className='space-y-4 m-0'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>Nombre del Proyecto *</Label>
                <span className='text-[10px] text-muted-foreground'>{name.length} / 300</span>
              </div>
              <Input
                className='text-xs'
                maxLength={300}
                placeholder='Nombre descriptivo del proyecto'
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>Objetivo Estratégico</Label>
                <span className='text-[10px] text-muted-foreground'>{objective.length} / 4000</span>
              </div>
              <Textarea
                className='text-xs'
                rows={3}
                maxLength={4000}
                placeholder='Objetivo principal a alcanzar con la ejecución...'
                value={objective}
                onChange={e => setObjective(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>Descripción o Alcance</Label>
                <span className='text-[10px] text-muted-foreground'>{description.length} / 4000</span>
              </div>
              <Textarea
                className='text-xs'
                rows={2}
                maxLength={4000}
                placeholder='Detalles y delimitación del proyecto...'
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* TAB 2: Governance & Team */}
          <TabsContent value='governance' className='space-y-4 m-0'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>Líder del Proyecto (Team Leader)</Label>
              <Select value={leaderUserId} onValueChange={(val: any) => setLeaderUserId(val || '')}>
                <SelectTrigger className='text-xs'>
                  <SelectValue placeholder='Seleccione el líder'>
                    {(() => {
                      const selected = members.find(m => m.id === leaderUserId)
                      return selected ? `${selected.name} 👑` : undefined
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id} className='text-xs'>
                      {m.name} {m.role === 'owner' || m.role === 'admin' ? '👑' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-[10px] text-muted-foreground'>
                El líder es el responsable principal de la gobernanza y asignación del proyecto.
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Estado del Proyecto</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className='text-xs'>
                    <SelectValue placeholder='Estado' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='planning' className='text-xs'>En Planificación</SelectItem>
                    <SelectItem value='active' className='text-xs'>Activo</SelectItem>
                    <SelectItem value='on_hold' className='text-xs'>En Pausa</SelectItem>
                    <SelectItem value='completed' className='text-xs'>Completado</SelectItem>
                    <SelectItem value='cancelled' className='text-xs'>Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Prioridad</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                  <SelectTrigger className='text-xs'>
                    <SelectValue placeholder='Prioridad' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low' className='text-xs'>Baja</SelectItem>
                    <SelectItem value='medium' className='text-xs'>Media</SelectItem>
                    <SelectItem value='high' className='text-xs'>Alta</SelectItem>
                    <SelectItem value='urgent' className='text-xs'>Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Budget & Dates */}
          <TabsContent value='budget' className='space-y-4 m-0'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Modo Presupuestario</Label>
                <Select value={budgetMode} onValueChange={(val: any) => setBudgetMode(val)}>
                  <SelectTrigger className='text-xs'>
                    <SelectValue placeholder='Modo' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='action_based' className='text-xs'>Suma de Actividades</SelectItem>
                    <SelectItem value='total_first' className='text-xs'>Presupuesto Tope Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Presupuesto Total Fijado (Tope)</Label>
                <Input
                  type='number'
                  className='text-xs'
                  min={0}
                  placeholder='0'
                  value={budgetTotal || ''}
                  onChange={e => setBudgetTotal(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Fecha de Inicio</Label>
                <Input
                  type='date'
                  className='text-xs'
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>Fecha de Finalización</Label>
                <Input
                  type='date'
                  className='text-xs'
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: CAME Actions & Sync */}
          <TabsContent value='came' className='space-y-4 m-0'>
            {/* Linked CAME Actions */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-foreground text-xs'>
                  Acciones CAME Ya Vinculadas ({project?.cameActions?.length || 0})
                </span>
                <span className='text-[10px] text-muted-foreground'>
                  {project?.investigationId ? 'Vinculado a Research' : 'Proyecto independiente'}
                </span>
              </div>

              {project?.cameActions && project.cameActions.length > 0 ? (
                <div className='space-y-1.5 max-h-36 overflow-y-auto pr-1'>
                  {project.cameActions.map((action: any) => (
                    <div
                      key={action.id}
                      className='flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40 border text-xs'
                    >
                      <div className='flex items-center gap-1.5 min-w-0'>
                        <Badge variant='outline' className='text-[9px] font-bold shrink-0'>
                          {action.id} ({action.type})
                        </Badge>
                        <span className='font-medium text-foreground truncate'>
                          {action.action || action.objective}
                        </span>
                      </div>
                      <ShieldCheckIcon className='size-3.5 text-emerald-500 shrink-0' />
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground italic p-2 bg-muted/20 rounded-md'>
                  No hay acciones CAME vinculadas actualmente.
                </p>
              )}
            </div>

            {/* Sync Section (if investigation exists) */}
            {project?.investigationId && (
              <div className='space-y-2.5 pt-3 border-t'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <span className='font-semibold text-foreground text-xs flex items-center gap-1.5'>
                      <PlusIcon className='size-3.5 text-primary' />
                      Importar Nuevas Acciones CAME Pendientes
                    </span>
                    <p className='text-[11px] text-muted-foreground'>
                      Seleccione acciones de la investigación para incorporarlas al proyecto como nuevas tareas Kanban.
                    </p>
                  </div>
                </div>

                {loadingEligible ? (
                  <div className='py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2'>
                    <Loader2Icon className='size-3.5 animate-spin text-primary' />
                    <span>Consultando acciones de la investigación...</span>
                  </div>
                ) : unassignedCameActions.length === 0 ? (
                  <p className='text-[11px] text-muted-foreground italic bg-muted/20 p-2.5 rounded-md'>
                    Todas las acciones CAME de la investigación ya han sido incorporadas.
                  </p>
                ) : (
                  <div className='space-y-2'>
                    <div className='space-y-1.5 max-h-40 overflow-y-auto pr-1'>
                      {unassignedCameActions.map(({ action }) => {
                        const isSelected = selectedCameIdsToSync.includes(action.id)
                        return (
                          <label
                            key={action.id}
                            className='flex items-start gap-2.5 p-2 rounded-md border hover:bg-muted/30 transition-colors cursor-pointer'
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectCameAction(action.id)}
                              className='mt-0.5'
                            />
                            <div className='min-w-0 flex-1 space-y-0.5 text-xs'>
                              <div className='flex items-center gap-1.5'>
                                <Badge variant='outline' className='text-[9px] font-bold'>
                                  {action.id} ({action.type})
                                </Badge>
                                <span className='font-semibold text-foreground truncate'>
                                  {action.action || action.objective}
                                </span>
                              </div>
                              <p className='text-[10px] text-muted-foreground line-clamp-1'>
                                Factor: {action.factor}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    <Button
                      size='sm'
                      className='w-full gap-1.5 text-xs'
                      onClick={handleSyncCameActions}
                      disabled={syncingCame || selectedCameIdsToSync.length === 0}
                    >
                      {syncingCame ? (
                        <>
                          <Loader2Icon className='size-3.5 animate-spin' />
                          <span>Importando al proyecto...</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className='size-3.5' />
                          <span>Importar {selectedCameIdsToSync.length} Acción(es) CAME Seleccionada(s)</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className='gap-2 pt-2 border-t'>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button size='sm' className='gap-1' onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2Icon className='size-3.5 animate-spin' />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <SaveIcon className='size-3.5' />
                <span>Guardar Cambios</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
