'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FolderKanbanIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
  AlertCircleIcon,
  UsersIcon,
  CalendarIcon,
  DollarSignIcon,
  LayersIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  FileTextIcon,
  ListTodoIcon
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/components/ui/combobox'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'
import type { CameAction } from '@/types/apps/investigator-types'
import type { CreateProjectInput, ProjectCameActionInput, ProjectActivityInput } from '@/features/projects'

export interface TeamMemberOption {
  userId: string
  name: string
  email: string
  role: string
  isLeader?: boolean
}

export interface ProjectCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investigationId?: string
  investigationTitle?: string
  investigationObjective?: string
  investigationOwnerId?: string
  cameActions?: CameAction[]
  onProjectCreated?: (projectId: string) => void
}

const STEPS = [
  { id: 1, title: 'Proyecto', desc: 'Datos generales y líder' },
  { id: 2, title: 'Acciones CAME', desc: 'Acciones origen' },
  { id: 3, title: 'Presupuesto', desc: 'Modo y límite' },
  { id: 4, title: 'Actividades', desc: 'Kanban y responsables' },
  { id: 5, title: 'Revisión', desc: 'Confirmación' }
]

// Componente de input monetario localizado que borra el 0 al foco y formatea con separador de miles
interface LocalizedCurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  prefix?: string
}

function LocalizedCurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className,
  disabled = false,
  prefix = '$'
}: LocalizedCurrencyInputProps) {
  const { locale } = useI18n()
  const formatLocale = locale === 'en' ? 'en-US' : locale === 'de' ? 'de-DE' : locale === 'pt' ? 'pt-PT' : 'es-ES'
  const [isFocused, setIsFocused] = useState(false)
  const [displayString, setDisplayString] = useState('')

  const formatNumber = (num: number) => {
    if (!num && num !== 0) return ''
    return new Intl.NumberFormat(formatLocale, {
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num)
  }

  useEffect(() => {
    if (!isFocused) {
      setDisplayString(value > 0 ? formatNumber(value) : '')
    }
  }, [value, isFocused, locale])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    if (value === 0) {
      setDisplayString('')
    } else {
      setDisplayString(String(value))
    }
    e.target.select()
  }

  const handleBlur = () => {
    setIsFocused(false)
    setDisplayString(value > 0 ? formatNumber(value) : '')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    const cleanRaw = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
    const num = cleanRaw === '' ? 0 : Number(cleanRaw)

    setDisplayString(cleanRaw)
    if (!Number.isNaN(num)) {
      onChange(num)
    }
  }

  return (
    <div className='relative flex items-center'>
      {prefix && (
        <span className='pointer-events-none absolute left-2.5 text-xs text-muted-foreground font-medium'>
          {prefix}
        </span>
      )}
      <Input
        type='text'
        inputMode='decimal'
        disabled={disabled}
        className={cn(prefix ? 'pl-6 text-xs' : 'text-xs', className)}
        placeholder={placeholder}
        value={isFocused ? displayString : value > 0 ? formatNumber(value) : ''}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
    </div>
  )
}

// Selector Múltiple de Responsables usando Shadcn Combobox
function MultiAssigneeCombobox({
  teamMembers,
  assigneeIds,
  onChange,
  disabled = false
}: {
  teamMembers: TeamMemberOption[]
  assigneeIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const anchor = useComboboxAnchor()
  const inputRef = useRef<HTMLInputElement>(null)

  const memberIds = useMemo(() => teamMembers.map(m => m.userId), [teamMembers])

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMemberOption>()
    teamMembers.forEach(m => map.set(m.userId, m))
    return map
  }, [teamMembers])

  return (
    <div className='w-full'>
      <Combobox
        multiple
        autoHighlight
        items={memberIds}
        value={assigneeIds}
        onValueChange={(val: string[]) => onChange(val || [])}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <ComboboxChips
          ref={anchor}
          className='min-h-8 text-xs py-1 px-2 gap-1 cursor-pointer bg-background w-full'
          onClick={() => {
            if (!disabled) {
              setOpen(true)
              inputRef.current?.focus()
            }
          }}
        >
          <ComboboxValue>
            {(values: string[]) =>
              values.length > 0 ? (
                <div className='flex flex-wrap items-center gap-1 w-full'>
                  <Badge variant='secondary' className='rounded-md text-[10px] px-1.5 py-0 h-5 font-semibold shrink-0'>
                    {values.length}
                  </Badge>
                  <span className='text-[11px] text-foreground truncate max-w-[140px]'>
                    {values.map(id => memberMap.get(id)?.name || id).join(', ')}
                  </span>
                  <ComboboxChipsInput ref={inputRef} className='text-xs h-5 min-w-8' />
                </div>
              ) : (
                <div className='flex items-center justify-between w-full'>
                  <span className='text-[11px] text-muted-foreground'>Seleccionar responsables...</span>
                  <ComboboxChipsInput ref={inputRef} className='text-xs h-5 min-w-8' />
                </div>
              )
            }
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className='min-w-[220px] text-xs z-50'>
          <ComboboxEmpty className='text-xs py-2 text-center text-muted-foreground'>
            No se encontraron miembros.
          </ComboboxEmpty>
          <ComboboxList className='max-h-48 text-xs'>
            {userId => {
              const member = memberMap.get(userId)
              if (!member) return null
              return (
                <ComboboxItem key={userId} value={userId} className='text-xs py-1.5'>
                  <div className='flex items-center gap-2'>
                    <span className='size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0'>
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className='flex flex-col min-w-0'>
                      <span className='font-medium text-foreground truncate'>{member.name}</span>
                      {member.email && (
                        <span className='text-[10px] text-muted-foreground truncate'>{member.email}</span>
                      )}
                    </div>
                  </div>
                </ComboboxItem>
              )
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export function ProjectCreationWizard({
  open,
  onOpenChange,
  investigationId,
  investigationTitle,
  investigationObjective,
  investigationOwnerId,
  cameActions = [],
  onProjectCreated
}: ProjectCreationWizardProps) {
  const { user: currentUser } = useCurrentUser()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])
  const [eligibleActions, setEligibleActions] = useState<Array<{ action: CameAction; isAssigned: boolean }>>([])

  // Form State
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [objective, setObjective] = useState<string>('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [leaderUserId, setLeaderUserId] = useState<string>('')
  const [budgetMode, setBudgetMode] = useState<'action_based' | 'total_first'>('action_based')
  const [budgetTotal, setBudgetTotal] = useState<number>(0)
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set())
  const [activities, setActivities] = useState<ProjectActivityInput[]>([])

  // Load team members and eligible CAME actions on open
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
      return
    }

    // Default name and objective if derived from investigation
    if (investigationTitle && !name) {
      setName(`Implementación: ${investigationTitle}`)
    }
    if (investigationObjective && !objective) {
      setObjective(investigationObjective)
    }

    // Fetch team members for user's active tenant
    setLoadingMembers(true)
    fetch('/api/kanban')
      .then(async res => {
        if (!res.ok) return
        const data = await res.json()
        if (data.ok && Array.isArray(data.members) && data.members.length > 0) {
          const memberMap = new Map<string, TeamMemberOption>()
          data.members.forEach((m: { id: string; name: string; email?: string; role?: string }) => {
            if (m.id && !memberMap.has(m.id)) {
              memberMap.set(m.id, {
                userId: m.id,
                name: m.name,
                email: m.email || '',
                role: m.role || 'member',
                isLeader: m.role === 'team_leader' || m.role === 'owner' || m.role === 'admin'
              })
            }
          })
          const members = Array.from(memberMap.values())
          setTeamMembers(members)

          // Preselect leader: prioritize investigation owner, then team leader/owner, then first member
          const targetLeader =
            (investigationOwnerId && members.find(m => m.userId === investigationOwnerId)) ||
            members.find(m => m.isLeader) ||
            members[0]

          if (targetLeader) {
            setLeaderUserId(targetLeader.userId)
          }
        }
      })
      .catch(() => {
        // Fallback with current user if network fails
        if (currentUser && teamMembers.length === 0) {
          const fallbackMember: TeamMemberOption = {
            userId: currentUser.id,
            name: currentUser.fullName || currentUser.email?.split('@')[0] || 'Mi Usuario',
            email: currentUser.email || '',
            role: 'owner',
            isLeader: true
          }
          setTeamMembers([fallbackMember])
          if (!leaderUserId) {
            setLeaderUserId(currentUser.id)
          }
        }
      })
      .finally(() => setLoadingMembers(false))

    // If investigationId, load eligible came actions
    if (investigationId) {
      fetch(`/api/investigations/${investigationId}/came/eligible-actions`)
        .then(async res => {
          if (!res.ok) return
          const data = await res.json()
          if (data.ok && Array.isArray(data.items)) {
            setEligibleActions(data.items)
            const initialSet = new Set<string>()
            data.items.forEach((item: { action: CameAction; isAssigned: boolean }) => {
              if (!item.isAssigned) initialSet.add(item.action.id)
            })
            setSelectedActionIds(initialSet)
          }
        })
        .catch(() => {
          const initialSet = new Set(cameActions.map(a => a.id))
          setSelectedActionIds(initialSet)
        })
    }
  }, [open, investigationId, investigationTitle, investigationObjective, currentUser])

  // Sync activities when selected CAME actions change
  useEffect(() => {
    const selectedActionsList = (eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions).filter(
      a => selectedActionIds.has(a.id)
    )

    if (selectedActionsList.length > 0 && activities.length === 0) {
      const initialActs: ProjectActivityInput[] = selectedActionsList.map(a => ({
        title: a.action || a.objective || `Actividad ${a.id}`,
        description: `Derivada de la acción CAME ${a.id} (${a.type}): ${a.problem || ''}`,
        priority: 'medium',
        assigneeIds: leaderUserId ? [leaderUserId] : [],
        cameActionId: a.id,
        budgetAmount: 0,
        dueDate: a.endDate || null
      }))
      setActivities(initialActs)
    }
  }, [selectedActionIds, eligibleActions, cameActions, leaderUserId])

  // Presupuestos calculados
  const sumActivitiesBudget = useMemo(
    () => activities.reduce((acc, a) => acc + (Number(a.budgetAmount) || 0), 0),
    [activities]
  )

  const isBudgetValid = useMemo(() => {
    if (budgetMode === 'total_first' && budgetTotal > 0) {
      return sumActivitiesBudget <= budgetTotal
    }
    return true
  }, [budgetMode, budgetTotal, sumActivitiesBudget])

  const handleNext = () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        toast.error('El nombre del proyecto es obligatorio.')
        return
      }
      if (!leaderUserId && teamMembers.length > 0) {
        toast.error('Debe seleccionar un líder de proyecto.')
        return
      }
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        toast.error('La fecha de fin no puede ser anterior a la fecha de inicio.')
        return
      }
    }
    if (currentStep === 4) {
      if (!isBudgetValid) {
        toast.error('La suma asignada a las actividades supera el presupuesto total fijado.')
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleToggleAction = (actionId: string) => {
    setSelectedActionIds(prev => {
      const next = new Set(prev)
      if (next.has(actionId)) {
        next.delete(actionId)
        setActivities(current => current.filter(act => act.cameActionId !== actionId))
      } else {
        next.add(actionId)
        const action = (eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions).find(
          a => a.id === actionId
        )
        if (action) {
          setActivities(current => [
            ...current,
            {
              title: action.action || action.objective || `Actividad ${action.id}`,
              description: `Derivada de la acción CAME ${action.id} (${action.type}): ${action.problem || ''}`,
              priority: 'medium',
              assigneeIds: leaderUserId ? [leaderUserId] : [],
              cameActionId: action.id,
              budgetAmount: 0,
              dueDate: action.endDate || null
            }
          ])
        }
      }
      return next
    })
  }

  const handleAddManualActivity = () => {
    setActivities(prev => [
      ...prev,
      {
        title: 'Nueva actividad operativa',
        description: '',
        priority: 'medium',
        assigneeIds: leaderUserId ? [leaderUserId] : [],
        cameActionId: null,
        budgetAmount: 0,
        dueDate: null
      }
    ])
  }

  const handleUpdateActivity = (index: number, patch: Partial<ProjectActivityInput>) => {
    setActivities(prev => prev.map((act, i) => (i === index ? { ...act, ...patch } : act)))
  }

  const handleRemoveActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index))
  }

  const handleFinishCreate = async () => {
    try {
      setSubmitting(true)

      const selectedActionsList = (eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions).filter(
        a => selectedActionIds.has(a.id)
      )

      const cameActionsPayload: ProjectCameActionInput[] = selectedActionsList.map(a => ({
        cameActionId: a.id,
        actionType: a.type as 'C' | 'A' | 'M' | 'E',
        title: (a.action || a.objective || a.id).slice(0, 2000),
        budgetAllocated: 0,
        snapshot: {
          problem: a.problem || '',
          objective: a.objective || '',
          action: a.action || '',
          responsible: a.responsible || '',
          criteria: a.criteria || {}
        }
      }))

      const activitiesPayload: ProjectActivityInput[] = activities.map(act => ({
        title: (act.title || '').trim().slice(0, 1000),
        description: (act.description || '').trim().slice(0, 4000),
        priority: act.priority || 'medium',
        columnId: act.columnId || null,
        assigneeIds: Array.isArray(act.assigneeIds) ? act.assigneeIds.filter(Boolean) : [],
        dueDate: act.dueDate || null,
        cameActionId: act.cameActionId || null,
        budgetAmount: typeof act.budgetAmount === 'number' && act.budgetAmount >= 0 ? act.budgetAmount : 0
      }))

      const payload: CreateProjectInput = {
        name: name.trim().slice(0, 300),
        description: description.trim().slice(0, 4000),
        objective: objective.trim().slice(0, 4000),
        priority,
        startDate: startDate || null,
        endDate: endDate || null,
        investigationId: investigationId || null,
        leaderUserId: leaderUserId || null,
        budgetMode,
        budgetTotal: budgetMode === 'action_based' ? sumActivitiesBudget : budgetTotal,
        cameActions: cameActionsPayload,
        activities: activitiesPayload,
        idempotencyKey: `proj-create-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.error?.code === 'ENTITLEMENT_LIMIT_EXCEEDED') {
          toast.error('Límite de proyectos activos alcanzado para su plan comercial.')
          return
        }
        if (data?.error?.code === 'VALIDATION_ERROR' && Array.isArray(data?.error?.details?.issues)) {
          const firstIssue = data.error.details.issues[0]
          toast.error(`Error de validación: ${firstIssue?.message || 'Verifique los campos ingresados.'}`)
          return
        }
        throw new Error(data?.error?.messageKey || 'Error al crear el proyecto.')
      }

      toast.success('Proyecto estratégico y actividades Kanban creados con éxito.')
      onOpenChange(false)
      onProjectCreated?.(data.project.id)
    } catch (err) {
      toast.error('No se pudo crear el proyecto.')
    } finally {
      setSubmitting(false)
    }
  }

  const actionsPool = eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-4xl'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <FolderKanbanIcon className='size-4' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                {investigationId ? 'Nuevo proyecto derivado de CAME' : 'Nuevo proyecto estratégico en blanco'}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Configure datos generales, equipo, acciones CAME, presupuesto y actividades para el tablero Kanban.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper Navigation (5 Pasos Unificados) */}
        <div className='flex items-center justify-between border-y bg-muted/20 px-4 py-2.5'>
          {STEPS.map((s, idx) => (
            <div key={s.id} className='flex items-center gap-2'>
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  currentStep === s.id
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > s.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > s.id ? <CheckCircle2Icon className='size-3.5' /> : s.id}
              </div>
              <div className='hidden flex-col sm:flex'>
                <span
                  className={`text-xs font-semibold ${
                    currentStep === s.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && <ChevronRightIcon className='size-3.5 text-muted-foreground/40' />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className='py-4'>
          {/* PASO 1: Proyecto (Alcance, Datos Generales & Líder) */}
          {currentStep === 1 && (
            <div className='space-y-4'>
              {investigationId && (
                <div className='rounded-lg border bg-muted/40 p-3'>
                  <span className='text-xs font-semibold text-foreground'>Investigación de Origen</span>
                  <p className='text-xs text-muted-foreground'>{investigationTitle || investigationId}</p>
                </div>
              )}

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium'>Nombre del Proyecto *</Label>
                  <span className='text-[10px] text-muted-foreground'>{name.length} / 300</span>
                </div>
                <Input
                  className='text-xs'
                  maxLength={300}
                  placeholder='Ej. Implementación del Plan de Transformación Digital'
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
                  rows={2}
                  maxLength={4000}
                  placeholder='Defina el impacto esperado del proyecto (máx. 4000 caracteres)...'
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Líder del Proyecto (Team Leader) *</Label>
                  {loadingMembers ? (
                    <div className='flex items-center text-xs text-muted-foreground'>
                      <Loader2Icon className='mr-2 size-3.5 animate-spin' /> Cargando miembros...
                    </div>
                  ) : (
                    <Select value={leaderUserId} onValueChange={val => setLeaderUserId(val || '')}>
                      <SelectTrigger className='text-xs'>
                        <SelectValue placeholder='Seleccione el líder responsable'>
                          {(() => {
                            const selected = teamMembers.find(m => m.userId === leaderUserId)
                            if (selected) {
                              return `${selected.name}${selected.isLeader ? ' 👑 (Líder)' : ''}`
                            }
                            return undefined
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(m => (
                          <SelectItem key={m.userId} value={m.userId} className='text-xs'>
                            {m.name} {m.isLeader ? '👑 (Líder)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className='text-[11px] text-muted-foreground'>
                    El líder supervisará la ejecución del tablero Kanban y el presupuesto.
                  </p>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Prioridad</Label>
                  <Select
                    value={priority}
                    onValueChange={(val: 'low' | 'medium' | 'high' | 'urgent' | null) => {
                      if (val) setPriority(val)
                    }}
                  >
                    <SelectTrigger className='text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>Baja</SelectItem>
                      <SelectItem value='medium'>Media</SelectItem>
                      <SelectItem value='high'>Alta</SelectItem>
                      <SelectItem value='urgent'>Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
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
                  <Label className='text-xs font-medium'>Fecha Estimada de Fin</Label>
                  <Input
                    type='date'
                    className='text-xs'
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Acciones CAME */}
          {currentStep === 2 && (
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-xs font-semibold text-foreground'>Acciones Estratégicas CAME</h4>
                  <p className='text-[11px] text-muted-foreground'>
                    Seleccione las acciones CAME que formarán parte de este proyecto de ejecución.
                  </p>
                </div>
                <Badge variant='outline' className='text-xs'>
                  {selectedActionIds.size} seleccionadas
                </Badge>
              </div>

              {actionsPool.length === 0 ? (
                <div className='rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground'>
                  No se encontraron acciones CAME en esta investigación o es un proyecto en blanco. Podrá agregar actividades manualmente en el paso de Actividades.
                </div>
              ) : (
                <div className='max-h-72 space-y-2 overflow-y-auto pr-1'>
                  {actionsPool.map(action => {
                    const isSelected = selectedActionIds.has(action.id)
                    const typeLabel =
                      action.type === 'C'
                        ? 'Corregir'
                        : action.type === 'A'
                          ? 'Afrontar'
                          : action.type === 'M'
                            ? 'Mantener'
                            : 'Explotar'

                    return (
                      <div
                        key={action.id}
                        onClick={() => handleToggleAction(action.id)}
                        className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border bg-card hover:bg-accent/40'
                        }`}
                      >
                        <div className='space-y-1 pr-2'>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant={isSelected ? 'default' : 'secondary'}
                              className='text-[10px]'
                            >
                              {action.id} ({typeLabel})
                            </Badge>
                            <span className='text-xs font-medium text-foreground'>
                              {action.action || action.objective}
                            </span>
                          </div>
                          {action.problem && (
                            <p className='text-[11px] text-muted-foreground'>
                              <span className='font-semibold'>Problema:</span> {action.problem}
                            </p>
                          )}
                        </div>

                        <div className='flex items-center shrink-0 pt-0.5'>
                          <div
                            className={`flex size-5 items-center justify-center rounded-md border text-xs ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            {isSelected && <CheckCircle2Icon className='size-3.5' />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Presupuesto */}
          {currentStep === 3 && (
            <div className='space-y-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div
                  onClick={() => setBudgetMode('action_based')}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    budgetMode === 'action_based'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-accent/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <DollarSignIcon className='size-4 text-primary' />
                    <span className='text-xs font-bold'>Modo A: Base Acciones (Bottom-Up)</span>
                  </div>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    El presupuesto total se calcula dinámicamente de la suma de cada actividad asignada en el paso siguiente.
                  </p>
                </div>

                <div
                  onClick={() => setBudgetMode('total_first')}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    budgetMode === 'total_first'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-accent/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <DollarSignIcon className='size-4 text-primary' />
                    <span className='text-xs font-bold'>Modo B: Presupuesto Fijado (Top-Down)</span>
                  </div>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    Se define un techo presupuestario máximo global que la suma de actividades no podrá exceder.
                  </p>
                </div>
              </div>

              {budgetMode === 'total_first' && (
                <div className='space-y-1.5 rounded-lg border bg-muted/20 p-3.5'>
                  <Label className='text-xs font-medium'>Presupuesto Total Tope ($) *</Label>
                  <LocalizedCurrencyInput
                    value={budgetTotal}
                    onChange={val => setBudgetTotal(val)}
                    placeholder='0'
                    className='h-8'
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    Fije el importe límite. En el paso de actividades podrá distribuir los fondos en tiempo real.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Actividades Kanban y Control Presupuestario */}
          {currentStep === 4 && (
            <div className='space-y-4'>
              {/* Sección Superior: Control Presupuestario en Tiempo Real */}
              <div className='rounded-lg border bg-muted/30 p-3.5 space-y-2'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-semibold text-foreground flex items-center gap-1.5'>
                    <DollarSignIcon className='size-3.5 text-primary' />
                    Control Presupuestario ({budgetMode === 'action_based' ? 'Base Acciones' : 'Presupuesto Tope'})
                  </span>
                  <span className='text-muted-foreground text-[11px]'>
                    {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t text-xs'>
                  <div>
                    <span className='text-muted-foreground text-[11px] block'>Suma Asignada en Actividades:</span>
                    <span className='font-bold text-foreground text-sm'>
                      ${sumActivitiesBudget.toLocaleString()}
                    </span>
                  </div>
                  {budgetMode === 'total_first' && (
                    <>
                      <div>
                        <span className='text-muted-foreground text-[11px] block'>Presupuesto Fijado (Tope):</span>
                        <span className='font-bold text-foreground text-sm'>
                          ${budgetTotal.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className='text-muted-foreground text-[11px] block'>Saldo Restante:</span>
                        <span
                          className={`font-bold text-sm ${
                            budgetTotal - sumActivitiesBudget < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ${(budgetTotal - sumActivitiesBudget).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {budgetMode === 'total_first' && !isBudgetValid && (
                  <div className='flex items-center gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive font-medium'>
                    <AlertCircleIcon className='size-4 shrink-0' />
                    <span>La suma de actividades (${sumActivitiesBudget.toLocaleString()}) supera el presupuesto tope (${budgetTotal.toLocaleString()}).</span>
                  </div>
                )}
              </div>

              {/* Encabezado del listado de actividades */}
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-xs font-semibold text-foreground'>Actividades del Tablero Kanban</h4>
                  <p className='text-[11px] text-muted-foreground'>
                    Asigne responsables múltiples y presupuesto individual para cada actividad.
                  </p>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  className='gap-1 text-xs h-7'
                  onClick={handleAddManualActivity}
                >
                  <PlusIcon className='size-3.5' />
                  Agregar Actividad
                </Button>
              </div>

              {/* Listado de Actividades con Vista Multilínea y Combobox Múltiple */}
              <div className='max-h-80 space-y-3 overflow-y-auto pr-1'>
                {activities.length === 0 ? (
                  <div className='rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground'>
                    No hay actividades registradas. Haga clic en "+ Agregar Actividad" para comenzar.
                  </div>
                ) : (
                  activities.map((act, index) => {
                    const isCameActivity = Boolean(act.cameActionId)

                    return (
                      <div key={index} className='space-y-2 rounded-lg border bg-card p-3 shadow-xs'>
                        {/* Cabecera / Título de la actividad */}
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex-1 min-w-0'>
                            {isCameActivity ? (
                              <div className='space-y-1'>
                                <div className='flex items-center gap-1.5'>
                                  <Badge variant='outline' className='text-[10px] font-bold shrink-0 bg-primary/5 text-primary'>
                                    {act.cameActionId}
                                  </Badge>
                                  <span className='text-xs font-semibold text-foreground leading-relaxed break-words'>
                                    {act.title}
                                  </span>
                                </div>
                                {act.description && (
                                  <p className='text-[11px] text-muted-foreground leading-normal break-words'>
                                    {act.description}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className='space-y-1.5'>
                                <div className='flex items-center justify-between'>
                                  <span className='text-[10px] font-medium text-muted-foreground'>Actividad manual</span>
                                  <span className='text-[10px] text-muted-foreground'>{(act.title || '').length} / 1000</span>
                                </div>
                                <Input
                                  className='h-7 text-xs font-semibold'
                                  maxLength={1000}
                                  placeholder='Nombre de la actividad (máx. 1000 caracteres)...'
                                  value={act.title}
                                  onChange={e => handleUpdateActivity(index, { title: e.target.value })}
                                />
                                <div className='flex items-center justify-between'>
                                  <span className='text-[10px] text-muted-foreground'>Descripción opcional</span>
                                  <span className='text-[10px] text-muted-foreground'>{(act.description || '').length} / 4000</span>
                                </div>
                                <Input
                                  className='h-6 text-[11px] text-muted-foreground'
                                  maxLength={4000}
                                  placeholder='Descripción u objetivo (máx. 4000 caracteres)...'
                                  value={act.description || ''}
                                  onChange={e => handleUpdateActivity(index, { description: e.target.value })}
                                />
                              </div>
                            )}
                          </div>

                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7 text-destructive shrink-0 hover:bg-destructive/10'
                            onClick={() => handleRemoveActivity(index)}
                            title='Eliminar actividad'
                          >
                            <Trash2Icon className='size-3.5' />
                          </Button>
                        </div>

                        {/* Campos de Asignación, Presupuesto y Fecha */}
                        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1 border-t'>
                          <div>
                            <Label className='text-[10px] text-muted-foreground font-medium mb-1 block'>
                              Responsables
                            </Label>
                            <MultiAssigneeCombobox
                              teamMembers={teamMembers}
                              assigneeIds={act.assigneeIds || []}
                              onChange={ids => handleUpdateActivity(index, { assigneeIds: ids })}
                            />
                          </div>

                          <div>
                            <Label className='text-[10px] text-muted-foreground font-medium mb-1 block'>
                              Presupuesto ($)
                            </Label>
                            <LocalizedCurrencyInput
                              value={Number(act.budgetAmount) || 0}
                              onChange={val => handleUpdateActivity(index, { budgetAmount: val })}
                              placeholder='0'
                              className='h-8'
                            />
                          </div>

                          <div>
                            <Label className='text-[10px] text-muted-foreground font-medium mb-1 block'>
                              Fecha Entrega
                            </Label>
                            <Input
                              type='date'
                              className='h-8 text-xs'
                              value={act.dueDate ? act.dueDate.split('T')[0] : ''}
                              onChange={e => handleUpdateActivity(index, { dueDate: e.target.value || null })}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* PASO 5: Revisión y Confirmación */}
          {currentStep === 5 && (
            <div className='space-y-4'>
              <div className='rounded-lg border bg-muted/20 p-4 space-y-3'>
                <h4 className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                  <FolderKanbanIcon className='size-4 text-primary' />
                  Resumen Ejecutivo del Proyecto
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                  <div>
                    <span className='text-muted-foreground text-[11px] block'>Nombre:</span>
                    <p className='font-semibold text-foreground'>{name}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-[11px] block'>Líder del Proyecto:</span>
                    <p className='font-semibold text-foreground'>
                      {teamMembers.find(m => m.userId === leaderUserId)?.name || 'No asignado'}
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-[11px] block'>Modelo Presupuestario:</span>
                    <p className='font-semibold text-foreground'>
                      ${(budgetMode === 'action_based' ? sumActivitiesBudget : budgetTotal).toLocaleString()} (
                      {budgetMode === 'action_based' ? 'Base Acciones' : 'Presupuesto Fijado'})
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-[11px] block'>Tarjetas Kanban a Generar:</span>
                    <p className='font-semibold text-foreground'>{activities.length} actividades programadas</p>
                  </div>
                </div>
              </div>

              <p className='text-center text-xs text-muted-foreground'>
                Al confirmar, se persistirá el proyecto en la base de datos y se desplegarán inmediatamente las tareas en el tablero Kanban.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className='flex items-center justify-between border-t pt-3'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
            className='gap-1 text-xs'
          >
            <ChevronLeftIcon className='size-3.5' />
            Anterior
          </Button>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className='text-xs'
            >
              Cancelar
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type='button'
                size='sm'
                onClick={handleNext}
                className='gap-1 text-xs'
              >
                Siguiente
                <ChevronRightIcon className='size-3.5' />
              </Button>
            ) : (
              <Button
                type='button'
                size='sm'
                onClick={handleFinishCreate}
                disabled={submitting}
                className='gap-1.5 text-xs'
              >
                {submitting ? (
                  <>
                    <Loader2Icon className='size-3.5 animate-spin' />
                    Creando proyecto...
                  </>
                ) : (
                  <>
                    <FolderKanbanIcon className='size-3.5' />
                    Confirmar y Crear Proyecto
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectCreationWizard
