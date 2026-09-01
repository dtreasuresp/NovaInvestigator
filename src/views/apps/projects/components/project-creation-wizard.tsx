'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FolderKanbanIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
  AlertCircleIcon,
  LayersIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  ListTodoIcon,
  DollarSignIcon,
  TargetIcon,
  InfoIcon
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
import type { CreateProjectInput, ProjectCameActionInput, ProjectActivityInput, ProjectTaskInput } from '@/features/projects'

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
  { id: 1, title: 'Proyecto', desc: 'Datos y líder' },
  { id: 2, title: 'Acciones CAME', desc: 'Acciones origen' },
  { id: 3, title: 'Presupuesto', desc: 'Modo y límite' },
  { id: 4, title: 'Actividades', desc: 'Planificación 1:1 o 1:N' },
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
  const [rawText, setRawText] = useState('')

  const formattedDisplay = useMemo(() => {
    if (value === 0 || isNaN(value)) return ''
    return new Intl.NumberFormat(formatLocale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value)
  }, [value, formatLocale])

  const handleFocus = () => {
    setIsFocused(true)
    setRawText(value === 0 ? '' : String(value))
  }

  const handleBlur = () => {
    setIsFocused(false)
    const cleaned = rawText.replace(/[^0-9.]/g, '')
    const parsed = parseFloat(cleaned)
    onChange(isNaN(parsed) || parsed < 0 ? 0 : parsed)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setRawText(text)
    const cleaned = text.replace(/[^0-9.]/g, '')
    const parsed = parseFloat(cleaned)
    onChange(isNaN(parsed) || parsed < 0 ? 0 : parsed)
  }

  return (
    <div className={cn('relative flex items-center w-full min-w-0', className)}>
      <span className='absolute left-3 text-muted-foreground text-xs font-semibold select-none pointer-events-none'>
        {prefix}
      </span>
      <Input
        type='text'
        inputMode='numeric'
        disabled={disabled}
        className='pl-7 text-xs font-medium h-9 w-full min-w-0'
        placeholder={placeholder}
        value={isFocused ? rawText : (formattedDisplay ? `${formattedDisplay}` : '')}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
    </div>
  )
}

// Selector multi-asignado con Combobox
interface MultiAssigneeComboboxProps {
  teamMembers: TeamMemberOption[]
  assigneeIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

function MultiAssigneeCombobox({
  teamMembers,
  assigneeIds,
  onChange,
  disabled = false
}: MultiAssigneeComboboxProps) {
  const anchor = useComboboxAnchor()

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMemberOption>()
    teamMembers.forEach(m => map.set(m.userId, m))
    return map
  }, [teamMembers])

  return (
    <div className='w-full min-w-0'>
      <Combobox
        multiple
        value={assigneeIds}
        onValueChange={(nextValues: string[] | null) => onChange(nextValues || [])}
        disabled={disabled}
      >
        <ComboboxChips ref={anchor} className='min-h-9 w-full text-xs p-1 bg-background'>
          {assigneeIds.map(userId => {
            const member = memberMap.get(userId)
            if (!member) return null
            return (
              <ComboboxValue key={userId}>
                <span className='truncate max-w-[120px]'>{member.name}</span>
              </ComboboxValue>
            )
          })}
          <ComboboxChipsInput
            placeholder={assigneeIds.length === 0 ? 'Seleccionar responsables...' : ''}
            className='text-xs'
          />
        </ComboboxChips>

        <ComboboxContent align='start' className='w-[260px] p-0'>
          <ComboboxList className='max-h-52 overflow-y-auto p-1'>
            <ComboboxEmpty className='py-3 text-center text-xs text-muted-foreground'>
              No se encontraron miembros.
            </ComboboxEmpty>
            {teamMembers.map(m => (
              <ComboboxItem key={m.userId} value={m.userId} className='text-xs py-1.5'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span className='size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0'>
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className='flex flex-col min-w-0'>
                    <span className='font-medium text-foreground truncate'>{m.name}</span>
                    {m.email && (
                      <span className='text-xs text-muted-foreground truncate'>{m.email}</span>
                    )}
                  </div>
                </div>
              </ComboboxItem>
            ))}
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
  const [planningMode, setPlanningMode] = useState<'quick' | 'detailed'>('quick')
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set())
  const [activities, setActivities] = useState<ProjectActivityInput[]>([])

  // Load team members and eligible CAME actions on open
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
      return
    }

    // Default project name from investigation if derived
    if (investigationId && investigationTitle) {
      setName(`Plan de Ejecución — ${investigationTitle}`)
      if (investigationObjective) {
        setObjective(investigationObjective)
      }
    } else {
      setName('')
      setObjective('')
    }
    setDescription('')
    setPriority('medium')
    setBudgetMode('action_based')
    setBudgetTotal(0)
    setPlanningMode('quick')
    setActivities([])

    // Load available workspace members for assignment
    setLoadingMembers(true)
    fetch('/api/users/profile')
      .then(async res => {
        if (!res.ok) return
        const data = await res.json()
        if (data?.user) {
          const userOption: TeamMemberOption = {
            userId: data.user.id,
            name: data.user.name || data.user.email || 'Usuario Principal',
            email: data.user.email,
            role: 'owner',
            isLeader: true
          }
          setTeamMembers([userOption])
          setLeaderUserId(data.user.id)
        }
      })
      .catch(() => {
        if (currentUser) {
          const fallbackMember: TeamMemberOption = {
            userId: currentUser.id,
            name: currentUser.fullName || currentUser.email || 'Líder de Proyecto',
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

    if (selectedActionsList.length > 0) {
      // Reconcile activities with selected CAME actions
      setActivities(prev => {
        const existingMap = new Map<string, ProjectActivityInput>()
        prev.forEach(act => {
          if (act.cameActionId) existingMap.set(act.cameActionId, act)
        })

        return selectedActionsList.map(a => {
          const existing = existingMap.get(a.id)
          if (existing) return existing

          const defaultTitle = a.action || a.objective || `Actividad ${a.id}`
          return {
            title: defaultTitle,
            description: a.problem ? `Problema estratégico: ${a.problem}` : `Acción CAME ${a.id} (${a.type})`,
            priority: 'medium',
            ownerUserId: leaderUserId || null,
            assigneeIds: leaderUserId ? [leaderUserId] : [],
            cameActionId: a.id,
            budget: 0,
            budgetAmount: 0,
            startDate: startDate || null,
            endDate: a.endDate || null,
            dueDate: a.endDate || null,
            status: 'pending',
            tasks: []
          }
        })
      })
    } else if (!investigationId && activities.length === 0) {
      // For blank projects without investigation, start with 1 blank package
      setActivities([
        {
          title: 'Paquete de Trabajo 1',
          description: 'Definición de objetivos operativos',
          priority: 'medium',
          ownerUserId: leaderUserId || null,
          assigneeIds: leaderUserId ? [leaderUserId] : [],
          cameActionId: null,
          budget: 0,
          budgetAmount: 0,
          startDate: startDate || null,
          endDate: endDate || null,
          dueDate: endDate || null,
          status: 'pending',
          tasks: []
        }
      ])
    }
  }, [selectedActionIds, eligibleActions, cameActions, leaderUserId, startDate, investigationId])

  // Presupuestos calculados (Suma de actividades y sus subtareas)
  const sumActivitiesBudget = useMemo(() => {
    return activities.reduce((acc, act) => {
      const actBudget = Number(act.budget || act.budgetAmount) || 0
      const tasksBudget = (act.tasks || []).reduce((tAcc, t) => tAcc + (Number(t.budgetAmount) || 0), 0)
      return acc + Math.max(actBudget, tasksBudget)
    }, 0)
  }, [activities])

  const totalKanbanTasksCount = useMemo(() => {
    return activities.reduce((acc, act) => {
      const taskCount = act.tasks && act.tasks.length > 0 ? act.tasks.length : 1
      return acc + taskCount
    }, 0)
  }, [activities])

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
    if (currentStep === 2) {
      if (investigationId && selectedActionIds.size === 0) {
        toast.error('Debe seleccionar al menos una acción CAME para continuar.')
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
              description: action.problem ? `Problema estratégico: ${action.problem}` : `Acción CAME ${action.id} (${action.type})`,
              priority: 'medium',
              ownerUserId: leaderUserId || null,
              assigneeIds: leaderUserId ? [leaderUserId] : [],
              cameActionId: action.id,
              budget: 0,
              budgetAmount: 0,
              startDate: startDate || null,
              endDate: action.endDate || endDate || null,
              dueDate: action.endDate || endDate || null,
              status: 'pending',
              tasks: []
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
        title: `Paquete de Trabajo ${prev.length + 1}`,
        description: '',
        priority: 'medium',
        ownerUserId: leaderUserId || null,
        assigneeIds: leaderUserId ? [leaderUserId] : [],
        cameActionId: null,
        budget: 0,
        budgetAmount: 0,
        startDate: startDate || null,
        endDate: endDate || null,
        dueDate: endDate || null,
        status: 'pending',
        tasks: []
      }
    ])
  }

  const handleUpdateActivity = (index: number, patch: Partial<ProjectActivityInput>) => {
    setActivities(prev => prev.map((act, i) => (i === index ? { ...act, ...patch } : act)))
  }

  const handleRemoveActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddTaskToActivity = (activityIndex: number) => {
    setActivities(prev =>
      prev.map((act, i) => {
        if (i !== activityIndex) return act
        const currentTasks = act.tasks || []
        return {
          ...act,
          tasks: [
            ...currentTasks,
            {
              title: `Tarea operativa ${currentTasks.length + 1}`,
              description: '',
              priority: act.priority || 'medium',
              columnId: null,
              assigneeIds:
                act.assigneeIds && act.assigneeIds.length > 0
                  ? [act.assigneeIds[0]]
                  : act.ownerUserId
                    ? [act.ownerUserId]
                    : leaderUserId
                      ? [leaderUserId]
                      : [],
              dueDate: act.endDate || act.dueDate || null,
              budgetAmount: 0
            }
          ]
        }
      })
    )
  }

  const handleUpdateActivityTask = (
    activityIndex: number,
    taskIndex: number,
    patch: Partial<ProjectTaskInput>
  ) => {
    setActivities(prev =>
      prev.map((act, i) => {
        if (i !== activityIndex) return act
        const updatedTasks = (act.tasks || []).map((t, ti) => (ti === taskIndex ? { ...t, ...patch } : t))
        return {
          ...act,
          tasks: updatedTasks
        }
      })
    )
  }

  const handleRemoveActivityTask = (activityIndex: number, taskIndex: number) => {
    setActivities(prev =>
      prev.map((act, i) => {
        if (i !== activityIndex) return act
        return {
          ...act,
          tasks: (act.tasks || []).filter((_, ti) => ti !== taskIndex)
        }
      })
    )
  }

  const handleFinishCreate = async () => {
    try {
      setSubmitting(true)

      const cameActionsPayload: ProjectCameActionInput[] = Array.from(selectedActionIds).map(cameId => {
        const fullAction = (eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions).find(
          a => a.id === cameId
        )
        return {
          cameActionId: cameId,
          title: fullAction?.action || fullAction?.objective || `Acción CAME ${cameId}`,
          actionType: fullAction?.type || 'C',
          budgetAllocated: 0,
          snapshot: fullAction ? JSON.parse(JSON.stringify(fullAction)) : {}
        }
      })

      const activitiesPayload: ProjectActivityInput[] = activities.map(act => ({
        title: act.title.trim().slice(0, 1000),
        description: act.description ? act.description.trim().slice(0, 4000) : '',
        priority: act.priority || 'medium',
        ownerUserId: act.ownerUserId || (act.assigneeIds && act.assigneeIds[0]) || leaderUserId || null,
        assigneeIds: act.assigneeIds || [],
        cameActionId: act.cameActionId || null,
        budget: Number(act.budget || act.budgetAmount) || 0,
        budgetAmount: Number(act.budget || act.budgetAmount) || 0,
        startDate: act.startDate || startDate || null,
        endDate: act.endDate || act.dueDate || endDate || null,
        dueDate: act.dueDate || act.endDate || endDate || null,
        status: act.status || 'pending',
        tasks: (act.tasks || []).map(t => ({
          title: t.title.trim().slice(0, 1000),
          description: t.description ? t.description.trim().slice(0, 4000) : '',
          priority: t.priority || act.priority || 'medium',
          columnId: t.columnId || null,
          assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds.filter(Boolean) : [],
          dueDate: t.dueDate || act.endDate || null,
          budgetAmount: Number(t.budgetAmount) || 0
        }))
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
        planningMode,
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

      toast.success('Proyecto estratégico y estructura de actividades Kanban creados con éxito.')
      onOpenChange(false)
      onProjectCreated?.(data.project.id)
    } catch {
      toast.error('No se pudo crear el proyecto.')
    } finally {
      setSubmitting(false)
    }
  }

  const actionsPool = eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] sm:max-h-[85vh] w-[95vw] sm:max-w-4xl lg:max-w-5xl p-0 flex flex-col overflow-hidden bg-background border border-border shadow-2xl rounded-2xl'>
        {/* Header Fijo */}
        <DialogHeader className='p-6 pb-4 border-b shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
              <FolderKanbanIcon className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <DialogTitle className='text-base sm:text-lg font-bold text-foreground truncate'>
                {investigationId ? 'Nuevo proyecto derivado de CAME' : 'Nuevo proyecto estratégico en blanco'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5 truncate'>
                Configure datos generales, equipo, acciones CAME, presupuesto y actividades para el tablero Kanban.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper Responsive Fijo */}
        <div className='flex items-center justify-between border-b bg-muted/30 px-4 sm:px-6 py-2.5 shrink-0 select-none'>
          {STEPS.map((s, idx) => (
            <div key={s.id} className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
              <div
                className={`flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === s.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : currentStep > s.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > s.id ? <CheckCircle2Icon className='size-3.5 sm:size-4' /> : s.id}
              </div>
              <div className='hidden md:flex flex-col min-w-0'>
                <span
                  className={`text-xs font-semibold truncate ${
                    currentStep === s.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRightIcon className='size-3.5 text-muted-foreground/30 shrink-0 ml-1' />
              )}
            </div>
          ))}
        </div>

        {/* Contenedor Central con Scroll Vertical Limpio (CERO scroll horizontal) */}
        <div className='flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5 min-w-0'>
          {/* PASO 1: Proyecto (Alcance, Datos Generales & Líder) */}
          {currentStep === 1 && (
            <div className='space-y-4 min-w-0'>
              {investigationId && (
                <div className='rounded-lg border bg-muted/30 p-3.5 space-y-1'>
                  <div className='flex items-center gap-2 text-xs font-semibold text-foreground'>
                    <TargetIcon className='size-3.5 text-primary' />
                    <span>Investigación de Origen</span>
                  </div>
                  <p className='text-xs text-muted-foreground'>{investigationTitle || investigationId}</p>
                </div>
              )}

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium'>Nombre del Proyecto *</Label>
                  <span className='text-xs text-muted-foreground'>{name.length} / 300</span>
                </div>
                <Input
                  className='text-xs h-9'
                  maxLength={300}
                  placeholder='Ej. Implementación del Plan de Transformación Digital'
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium'>Objetivo Estratégico</Label>
                  <span className='text-xs text-muted-foreground'>{objective.length} / 4000</span>
                </div>
                <Textarea
                  className='text-xs resize-none'
                  rows={3}
                  maxLength={4000}
                  placeholder='Defina el impacto esperado del proyecto...'
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Líder del Proyecto (Team Leader) *</Label>
                  {loadingMembers ? (
                    <div className='flex items-center text-xs text-muted-foreground h-9'>
                      <Loader2Icon className='mr-2 size-3.5 animate-spin' /> Cargando miembros...
                    </div>
                  ) : (
                    <Select value={leaderUserId} onValueChange={val => setLeaderUserId(val || '')}>
                      <SelectTrigger className='text-xs h-9'>
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
                  <p className='text-xs text-muted-foreground'>
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
                    <SelectTrigger className='text-xs h-9'>
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

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Fecha de Inicio</Label>
                  <Input
                    type='date'
                    className='text-xs h-9'
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium'>Fecha Estimada de Fin</Label>
                  <Input
                    type='date'
                    className='text-xs h-9'
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Acciones CAME */}
          {currentStep === 2 && (
            <div className='space-y-3 min-w-0'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-sm font-semibold text-foreground'>Acciones Estratégicas CAME</h4>
                  <p className='text-xs text-muted-foreground'>
                    Seleccione las acciones estratégicas CAME que formarán la base de ejecución de este proyecto.
                  </p>
                </div>
                <Badge variant='outline' className='text-xs font-semibold'>
                  {selectedActionIds.size} seleccionadas
                </Badge>
              </div>

              {actionsPool.length === 0 ? (
                <div className='rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground space-y-2'>
                  <InfoIcon className='size-6 mx-auto text-muted-foreground/60' />
                  <p className='font-medium text-foreground'>No se encontraron acciones CAME disponibles.</p>
                  <p>Puede continuar al siguiente paso para definir actividades operativas manualmente.</p>
                </div>
              ) : (
                <div className='max-h-72 space-y-2.5 overflow-y-auto pr-1'>
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
                        className={`flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all shadow-xs ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className='space-y-1.5 pr-3 min-w-0 flex-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <Badge
                              variant={isSelected ? 'default' : 'secondary'}
                              className='text-xs font-semibold'
                            >
                              {action.id} · {typeLabel}
                            </Badge>
                            <span className='text-xs font-semibold text-foreground leading-snug break-words'>
                              {action.action || action.objective}
                            </span>
                          </div>
                          {action.problem && (
                            <p className='text-xs text-muted-foreground leading-relaxed'>
                              <span className='font-medium text-foreground/80'>Problema:</span> {action.problem}
                            </p>
                          )}
                        </div>

                        <div className='flex items-center shrink-0 pt-0.5'>
                          <div
                            className={`flex size-5 items-center justify-center rounded-md border transition-colors ${
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
            <div className='space-y-4 min-w-0'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div
                  onClick={() => setBudgetMode('action_based')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-xs ${
                    budgetMode === 'action_based'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <DollarSignIcon className='size-4 text-primary' />
                    <span className='text-xs font-bold text-foreground'>Modo A: Base Acciones (Bottom-Up)</span>
                  </div>
                  <p className='mt-1.5 text-xs text-muted-foreground leading-relaxed'>
                    El presupuesto total se calcula dinámicamente de la suma de cada actividad asignada en el paso siguiente.
                  </p>
                </div>

                <div
                  onClick={() => setBudgetMode('total_first')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all shadow-xs ${
                    budgetMode === 'total_first'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <DollarSignIcon className='size-4 text-primary' />
                    <span className='text-xs font-bold text-foreground'>Modo B: Presupuesto Fijado (Top-Down)</span>
                  </div>
                  <p className='mt-1.5 text-xs text-muted-foreground leading-relaxed'>
                    Se define un techo presupuestario máximo global que la suma de actividades no podrá exceder.
                  </p>
                </div>
              </div>

              {budgetMode === 'total_first' && (
                <div className='space-y-2 rounded-xl border bg-muted/20 p-4'>
                  <Label className='text-xs font-medium'>Presupuesto Total Tope ($) *</Label>
                  <LocalizedCurrencyInput
                    value={budgetTotal}
                    onChange={val => setBudgetTotal(val)}
                    placeholder='0'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Fije el importe límite. En el paso de actividades podrá distribuir los fondos en tiempo real.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Planificación Táctica y Operativa (Modo Rápido 1:1 vs Modo Detallado 1:N) */}
          {currentStep === 4 && (
            <div className='space-y-4 min-w-0'>
              {/* Cabecera y Selector de Modo */}
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3'>
                <div>
                  <h4 className='text-sm font-bold text-foreground'>Planificación Táctica y Operativa</h4>
                  <p className='text-xs text-muted-foreground'>
                    {planningMode === 'quick'
                      ? 'Modo Rápido: Se genera automáticamente 1 tarea Kanban por cada acción estratégica CAME.'
                      : 'Modo Detallado: Desglose manual de múltiples tareas operativas Kanban para cada acción estratégica CAME.'}
                  </p>
                </div>

                <div className='flex items-center gap-1 rounded-lg border bg-muted/40 p-1 shrink-0'>
                  <button
                    type='button'
                    onClick={() => setPlanningMode('quick')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      planningMode === 'quick'
                        ? 'bg-background shadow-xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Modo Rápido (1:1)
                  </button>
                  <button
                    type='button'
                    onClick={() => setPlanningMode('detailed')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      planningMode === 'detailed'
                        ? 'bg-background shadow-xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Modo Detallado (1:N)
                  </button>
                </div>
              </div>

              {/* Gobernanza Financiera en Tiempo Real */}
              <div className='rounded-xl border bg-muted/30 p-4 space-y-2.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-semibold text-foreground flex items-center gap-1.5'>
                    <DollarSignIcon className='size-3.5 text-primary' />
                    Gobernanza Financiera ({budgetMode === 'action_based' ? 'Base Acciones' : 'Presupuesto Tope'})
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {activities.length} actividades · {totalKanbanTasksCount} tareas Kanban
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs'>
                  <div>
                    <span className='text-muted-foreground text-xs block'>Suma Asignada en Actividades:</span>
                    <span className='font-bold text-foreground text-sm'>
                      ${sumActivitiesBudget.toLocaleString()}
                    </span>
                  </div>
                  {budgetMode === 'total_first' && (
                    <>
                      <div>
                        <span className='text-muted-foreground text-xs block'>Presupuesto Fijado (Tope):</span>
                        <span className='font-bold text-foreground text-sm'>
                          ${budgetTotal.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className='text-muted-foreground text-xs block'>Saldo Restante:</span>
                        <span
                          className={`font-bold text-sm ${
                            budgetTotal - sumActivitiesBudget < 0
                              ? 'text-destructive'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ${(budgetTotal - sumActivitiesBudget).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {budgetMode === 'total_first' && !isBudgetValid && (
                  <div className='flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium'>
                    <AlertCircleIcon className='size-4 shrink-0' />
                    <span>
                      La suma de actividades (${sumActivitiesBudget.toLocaleString()}) supera el presupuesto tope ($
                      {budgetTotal.toLocaleString()}).
                    </span>
                  </div>
                )}
              </div>

              {/* LISTA DE ACCIONES CAME Y SUS TAREAS OPERATIVAS */}
              <div className='max-h-96 space-y-4 overflow-y-auto pr-1 min-w-0'>
                {activities.length === 0 ? (
                  <div className='rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground space-y-2'>
                    <InfoIcon className='size-6 mx-auto text-muted-foreground/60' />
                    <p className='font-medium text-foreground'>No hay actividades registradas.</p>
                    <p>Regrese al Paso 2 para seleccionar acciones CAME o agregue una actividad inicial.</p>
                    <Button size='sm' variant='outline' onClick={handleAddManualActivity} className='mt-2 text-xs'>
                      <PlusIcon className='size-3.5 mr-1' /> Agregar Actividad Manual
                    </Button>
                  </div>
                ) : (
                  activities.map((act, actIdx) => {
                    const cameAction = act.cameActionId
                      ? (eligibleActions.length > 0 ? eligibleActions.map(e => e.action) : cameActions).find(
                          a => a.id === act.cameActionId
                        )
                      : null

                    const typeLabel =
                      cameAction?.type === 'C'
                        ? 'Corregir'
                        : cameAction?.type === 'A'
                          ? 'Afrontar'
                          : cameAction?.type === 'M'
                            ? 'Mantener'
                            : 'Explotar'

                    return (
                      <div
                        key={actIdx}
                        className='rounded-xl border border-border bg-card shadow-xs overflow-hidden min-w-0 space-y-0'
                      >
                        {/* Cabecera de la Acción Estratégica CAME */}
                        <div className='bg-muted/40 p-4 border-b space-y-2'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='space-y-1 min-w-0 flex-1'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                {act.cameActionId ? (
                                  <Badge variant='default' className='text-xs font-bold shrink-0'>
                                    {act.cameActionId} · {typeLabel}
                                  </Badge>
                                ) : (
                                  <Badge variant='outline' className='text-xs font-semibold shrink-0'>
                                    Actividad Manual
                                  </Badge>
                                )}
                                <span className='text-xs font-semibold text-foreground leading-snug break-words'>
                                  {act.title}
                                </span>
                              </div>
                              {cameAction?.problem && (
                                <p className='text-xs text-muted-foreground leading-relaxed'>
                                  <span className='font-medium text-foreground/80'>Problema estratégico:</span>{' '}
                                  {cameAction.problem}
                                </p>
                              )}
                            </div>

                            {planningMode === 'detailed' && (
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-8 gap-1.5 text-xs shrink-0 font-semibold bg-background'
                                onClick={() => handleAddTaskToActivity(actIdx)}
                              >
                                <PlusIcon className='size-3.5' />
                                Añadir Tarea
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Parámetros de la Actividad: Responsable, Presupuesto, Fechas */}
                        <div className='p-4 space-y-4'>
                          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                            <div className='space-y-1 min-w-0'>
                              <Label className='text-xs text-muted-foreground font-medium block'>
                                Responsable del Paquete
                              </Label>
                              <MultiAssigneeCombobox
                                teamMembers={teamMembers}
                                assigneeIds={act.assigneeIds || []}
                                onChange={ids => handleUpdateActivity(actIdx, { assigneeIds: ids })}
                              />
                            </div>

                            <div className='space-y-1 min-w-0'>
                              <Label className='text-xs text-muted-foreground font-medium block'>
                                Presupuesto Asignado ($)
                              </Label>
                              <LocalizedCurrencyInput
                                value={Number(act.budget || act.budgetAmount) || 0}
                                onChange={val => handleUpdateActivity(actIdx, { budget: val, budgetAmount: val })}
                                placeholder='0'
                              />
                            </div>

                            <div className='space-y-1 min-w-0'>
                              <Label className='text-xs text-muted-foreground font-medium block'>
                                Fecha Límite
                              </Label>
                              <Input
                                type='date'
                                className='h-9 text-xs'
                                value={act.endDate ? act.endDate.split('T')[0] : (act.dueDate ? act.dueDate.split('T')[0] : '')}
                                onChange={e =>
                                  handleUpdateActivity(actIdx, {
                                    endDate: e.target.value || null,
                                    dueDate: e.target.value || null
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* MODO RÁPIDO (1:1) — Tarea Automática */}
                          {planningMode === 'quick' && (
                            <div className='rounded-lg border bg-muted/20 p-3 flex items-center gap-2 text-xs text-muted-foreground'>
                              <CheckCircle2Icon className='size-4 text-primary shrink-0' />
                              <span>
                                Se generará automáticamente 1 tarea Kanban inicial para esta acción estratégica con el responsable y presupuesto fijados.
                              </span>
                            </div>
                          )}

                          {/* MODO DETALLADO (1:N) — Desglose de Tareas Operativas */}
                          {planningMode === 'detailed' && (
                            <div className='rounded-xl bg-muted/20 border p-3.5 space-y-3'>
                              <div className='flex items-center justify-between'>
                                <span className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                                  <ListTodoIcon className='size-3.5 text-primary' />
                                  Tareas Operativas Kanban ({(act.tasks || []).length})
                                </span>
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  className='h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10'
                                  onClick={() => handleAddTaskToActivity(actIdx)}
                                >
                                  <PlusIcon className='size-3.5' />
                                  Añadir Tarea
                                </Button>
                              </div>

                              {(act.tasks || []).length === 0 ? (
                                <div className='rounded-lg border border-dashed bg-background/50 p-4 text-center text-xs text-muted-foreground'>
                                  No hay tareas operativas desglosadas aún. Haga clic en "+ Añadir Tarea" para detallar el trabajo operativo.
                                </div>
                              ) : (
                                <div className='space-y-2.5 min-w-0'>
                                  {act.tasks!.map((task, taskIdx) => (
                                    <div
                                      key={taskIdx}
                                      className='grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center rounded-lg border bg-background p-3 shadow-2xs min-w-0'
                                    >
                                      <div className='col-span-12 sm:col-span-8 min-w-0 space-y-1'>
                                        <Label className='text-xs font-medium text-muted-foreground block'>
                                          Tarea operativa #{taskIdx + 1}
                                        </Label>
                                        <Input
                                          className='h-9 text-xs font-medium min-w-0 w-full'
                                          placeholder='Nombre de la tarea operativa...'
                                          value={task.title}
                                          onChange={e =>
                                            handleUpdateActivityTask(actIdx, taskIdx, { title: e.target.value })
                                          }
                                        />
                                      </div>

                                      <div className='col-span-9 sm:col-span-3 min-w-0 space-y-1'>
                                        <Label className='text-xs font-medium text-muted-foreground block'>
                                          Costo ($)
                                        </Label>
                                        <LocalizedCurrencyInput
                                          value={Number(task.budgetAmount) || 0}
                                          onChange={val =>
                                            handleUpdateActivityTask(actIdx, taskIdx, { budgetAmount: val })
                                          }
                                          placeholder='0'
                                        />
                                      </div>

                                      <div className='col-span-3 sm:col-span-1 flex justify-end sm:pt-5'>
                                        <Button
                                          type='button'
                                          size='icon'
                                          variant='ghost'
                                          className='size-9 text-destructive hover:bg-destructive/10 shrink-0'
                                          onClick={() => handleRemoveActivityTask(actIdx, taskIdx)}
                                          title='Eliminar tarea'
                                        >
                                          <Trash2Icon className='size-4' />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* PASO 5: Revisión y Confirmación Jerárquica */}
          {currentStep === 5 && (
            <div className='space-y-4 min-w-0'>
              <div className='rounded-xl border bg-muted/20 p-4 space-y-3'>
                <h4 className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                  <FolderKanbanIcon className='size-4 text-primary' />
                  Resumen Ejecutivo del Proyecto
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                  <div>
                    <span className='text-muted-foreground text-xs block'>Nombre del Proyecto:</span>
                    <p className='font-semibold text-foreground text-sm'>{name}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-xs block'>Líder del Proyecto:</span>
                    <p className='font-semibold text-foreground text-sm'>
                      {teamMembers.find(m => m.userId === leaderUserId)?.name || 'No asignado'}
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-xs block'>Modelo Presupuestario:</span>
                    <p className='font-semibold text-foreground text-sm'>
                      ${(budgetMode === 'action_based' ? sumActivitiesBudget : budgetTotal).toLocaleString()} (
                      {budgetMode === 'action_based' ? 'Base Acciones' : 'Presupuesto Fijado'})
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-xs block'>Modo de Planificación:</span>
                    <p className='font-semibold text-foreground text-sm'>
                      {planningMode === 'quick' ? 'Modo Rápido (1:1)' : 'Modo Detallado (1:N)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Trazabilidad Jerárquica */}
              <div className='rounded-xl border bg-card p-4 space-y-3'>
                <h5 className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                  <LayersIcon className='size-3.5 text-primary' />
                  Estructura Jerárquica a Desplegar
                </h5>
                <div className='grid grid-cols-3 gap-3 text-center text-xs'>
                  <div className='rounded-lg border bg-muted/30 p-3'>
                    <span className='text-xl font-bold text-primary block'>{selectedActionIds.size}</span>
                    <span className='text-xs text-muted-foreground font-medium'>Acciones CAME</span>
                  </div>
                  <div className='rounded-lg border bg-muted/30 p-3'>
                    <span className='text-xl font-bold text-foreground block'>{activities.length}</span>
                    <span className='text-xs text-muted-foreground font-medium'>Paquetes de Trabajo</span>
                  </div>
                  <div className='rounded-lg border bg-muted/30 p-3'>
                    <span className='text-xl font-bold text-foreground block'>{totalKanbanTasksCount}</span>
                    <span className='text-xs text-muted-foreground font-medium'>Tareas Kanban</span>
                  </div>
                </div>
              </div>

              <p className='text-center text-xs text-muted-foreground'>
                Al confirmar, se persistirá el proyecto, las actividades tácticas y se desplegarán las tareas operativas en el tablero Kanban.
              </p>
            </div>
          )}
        </div>

        {/* Footer Fijo */}
        <DialogFooter className='flex items-center justify-between border-t bg-muted/20 px-6 py-3.5 shrink-0'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
            className='gap-1 text-xs h-9'
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
              className='text-xs h-9'
            >
              Cancelar
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type='button'
                size='sm'
                onClick={handleNext}
                className='gap-1 text-xs h-9'
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
                className='gap-1.5 text-xs h-9'
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
