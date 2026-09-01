'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, XIcon, TargetIcon, DollarSignIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

export type KanbanTask = {
  id: string
  column_id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  cover_image?: string | null
  assignee_ids?: string[]
  due_date?: string | null
  project_id?: string | null
  activity_id?: string | null
  came_action_id?: string | null
  budget_amount?: number | null
  position?: number
  strategicOrigin?: {
    investigationTitle?: string
    cameCategory?: string
    cameActionText?: string
    factorCode?: string
    factorDescription?: string
    activityTitle?: string
  }
}

export type KanbanMember = {
  id: string
  name: string
  initials: string
  avatar: string | null
  email: string
  role?: string
  roleName?: string
}

type CardFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: KanbanTask | null
  columnId?: string
  members: KanbanMember[]
  onSave: (taskData: Partial<KanbanTask>) => Promise<void>
}

export function CardFormDialog({
  open,
  onOpenChange,
  task,
  columnId,
  members,
  onSave
}: CardFormDialogProps) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [budgetAmount, setBudgetAmount] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setCoverImage(task.cover_image || null)
      setAssigneeIds(task.assignee_ids || [])
      setDueDate(task.due_date ? new Date(task.due_date) : undefined)
      setBudgetAmount(task.budget_amount || 0)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCoverImage(null)
      setAssigneeIds([])
      setDueDate(undefined)
      setBudgetAmount(0)
    }
  }, [task, open])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleAssignee = (memberId: string) => {
    if (assigneeIds.includes(memberId)) {
      setAssigneeIds(assigneeIds.filter(id => id !== memberId))
    } else {
      setAssigneeIds([...assigneeIds, memberId])
    }
  }

  const removeAssignee = (memberId: string) => {
    setAssigneeIds(assigneeIds.filter(id => id !== memberId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        id: task?.id,
        column_id: task?.column_id || columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        cover_image: coverImage,
        assignee_ids: assigneeIds,
        due_date: dueDate ? dueDate.toISOString() : null,
        budget_amount: budgetAmount
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const hasStrategicOrigin = Boolean(task?.came_action_id || task?.strategicOrigin)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-6 space-y-4'>
        <DialogHeader className='pb-1'>
          <DialogTitle className='text-base sm:text-lg font-bold text-foreground'>
            {task ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {task ? 'Actualice los detalles y asignaciones de la tarea operativa.' : 'Complete los datos de la nueva tarea operativa.'}
          </DialogDescription>
        </DialogHeader>

        {/* Sección de Origen Estratégico (solo si la tarea proviene de CAME / Research) */}
        {hasStrategicOrigin && (
          <div className='rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-xs'>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-primary flex items-center gap-1.5'>
                <TargetIcon className='size-3.5' />
                Origen Estratégico
              </span>
              {task?.came_action_id && (
                <Badge variant='outline' className='text-xs font-semibold bg-background'>
                  {task.came_action_id}
                </Badge>
              )}
            </div>

            {task?.strategicOrigin?.investigationTitle && (
              <p className='text-xs text-muted-foreground'>
                <span className='font-semibold text-foreground/80'>Investigación:</span>{' '}
                {task.strategicOrigin.investigationTitle}
              </p>
            )}

            {task?.strategicOrigin?.cameActionText && (
              <p className='text-xs text-muted-foreground'>
                <span className='font-semibold text-foreground/80'>Acción CAME:</span>{' '}
                {task.strategicOrigin.cameActionText}
              </p>
            )}

            {task?.strategicOrigin?.factorDescription && (
              <p className='text-xs text-muted-foreground'>
                <span className='font-semibold text-foreground/80'>Factor DAFO:</span>{' '}
                {task.strategicOrigin.factorCode ? `${task.strategicOrigin.factorCode} — ` : ''}
                {task.strategicOrigin.factorDescription}
              </p>
            )}

            {task?.strategicOrigin?.activityTitle && (
              <p className='text-xs text-muted-foreground'>
                <span className='font-semibold text-foreground/80'>Paquete / Actividad:</span>{' '}
                {task.strategicOrigin.activityTitle}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Título */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-title' className='text-xs font-medium'>
              Título de la Tarea *
            </Label>
            <Input
              id='task-title'
              placeholder={t('kanban.cardTitlePlaceholder') || 'Título descriptivo...'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className='h-9 text-xs font-medium'
            />
          </div>

          {/* Descripción */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-description' className='text-xs font-medium'>
              Descripción / Alcance
            </Label>
            <Textarea
              id='task-description'
              placeholder={t('kanban.cardDescriptionPlaceholder') || 'Detalles de ejecución...'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className='text-xs resize-none'
            />
          </div>

          {/* Prioridad y Costo */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='task-priority' className='text-xs font-medium'>
                Prioridad
              </Label>
              <Select value={priority} onValueChange={(val: 'low' | 'medium' | 'high' | 'urgent' | null) => { if (val) setPriority(val) }}>
                <SelectTrigger id='task-priority' className='h-9 text-xs'>
                  <SelectValue placeholder={t('kanban.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low' className='text-xs'>{t('kanban.priorityLow')}</SelectItem>
                  <SelectItem value='medium' className='text-xs'>{t('kanban.priorityMedium')}</SelectItem>
                  <SelectItem value='high' className='text-xs'>{t('kanban.priorityHigh')}</SelectItem>
                  <SelectItem value='urgent' className='text-xs'>{t('kanban.priorityUrgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='task-budget' className='text-xs font-medium'>
                Costo Estimado ($)
              </Label>
              <div className='relative flex items-center'>
                <span className='absolute left-3 text-muted-foreground text-xs font-semibold select-none pointer-events-none'>
                  $
                </span>
                <Input
                  id='task-budget'
                  type='number'
                  min='0'
                  step='any'
                  value={budgetAmount === 0 ? '' : budgetAmount}
                  onChange={e => setBudgetAmount(Number(e.target.value) || 0)}
                  placeholder='0'
                  className='h-9 text-xs pl-7 font-medium'
                />
              </div>
            </div>
          </div>

          {/* Asignados */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium'>{t('kanban.assignees')}</Label>
            <div className='flex flex-wrap gap-1.5 p-2 min-h-[40px] rounded-lg border bg-background items-center'>
              {assigneeIds.length === 0 ? (
                <span className='text-xs text-muted-foreground px-1'>{t('kanban.noAssignees')}</span>
              ) : (
                assigneeIds.map(id => {
                  const m = members.find(mem => mem.id === id)
                  if (!m) return null
                  return (
                    <Badge
                      key={id}
                      variant='secondary'
                      className='inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-normal rounded-md'
                    >
                      {m.name}
                      <button
                        type='button'
                        onClick={() => removeAssignee(id)}
                        className='hover:text-destructive text-muted-foreground ml-0.5'
                      >
                        <XIcon className='size-3' />
                      </button>
                    </Badge>
                  )
                })
              )}
            </div>

            <div className='pt-0.5'>
              <Select onValueChange={(val: string | null) => { if (val) toggleAssignee(val) }}>
                <SelectTrigger className='h-8 text-xs text-muted-foreground'>
                  <SelectValue placeholder={t('kanban.addRemoveAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id} className='text-xs'>
                      {m.name} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha Límite */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium'>{t('kanban.dueDate')}</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full justify-start text-left font-normal h-9 text-xs',
                      !dueDate && 'text-muted-foreground'
                    )}
                  />
                }
              >
                <CalendarIcon className='mr-2 size-3.5' />
                {dueDate ? format(dueDate, 'PPP', { locale: es }) : <span>{t('kanban.pickDate')}</span>}
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={dueDate}
                  onSelect={setDueDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Imagen de Portada */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-image' className='text-xs font-medium'>
              Imagen de Portada (Opcional)
            </Label>
            <div className='flex items-center gap-3'>
              <Input
                id='task-image'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='h-9 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground hover:file:bg-secondary/80'
              />
              {coverImage && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setCoverImage(null)}
                  className='text-destructive text-xs shrink-0 h-8'
                >
                  Quitar
                </Button>
              )}
            </div>
            {coverImage && (
              <div className='mt-2 relative h-28 w-full rounded-lg overflow-hidden border bg-muted'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt={t('common.preview') || 'Vista previa'} className='h-full w-full object-cover' />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className='flex items-center justify-end gap-2.5 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className='text-xs h-9'
            >
              Cancelar
            </Button>
            <Button type='submit' size='sm' disabled={isSaving || !title.trim()} className='text-xs h-9'>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
