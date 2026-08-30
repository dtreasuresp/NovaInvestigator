'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, XIcon } from 'lucide-react'
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
  position?: number
}

export type KanbanMember = {
  id: string
  name: string
  initials: string
  avatar: string | null
  email: string
  role?: string
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
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setCoverImage(task.cover_image || null)
      setAssigneeIds(task.assignee_ids || [])
      setDueDate(task.due_date ? new Date(task.due_date) : undefined)
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setCoverImage(null)
      setAssigneeIds([])
      setDueDate(undefined)
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
        due_date: dueDate ? dueDate.toISOString() : null
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px] p-6'>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-lg font-semibold'>
            {task ? 'Edit card' : 'Create card'}
          </DialogTitle>
          <DialogDescription className='text-muted-foreground text-sm'>
            {task ? 'Update the card details below.' : 'Add the card details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          {/* Title */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-title' className='text-sm font-medium'>
              Title
            </Label>
            <Input
              id='task-title'
              placeholder={t('kanban.cardTitlePlaceholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className='h-10'
            />
          </div>

          {/* Description */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-description' className='text-sm font-medium'>
              Description
            </Label>
            <Textarea
              id='task-description'
              placeholder={t('kanban.cardDescriptionPlaceholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className='resize-none'
            />
          </div>

          {/* Priority */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-priority' className='text-sm font-medium'>
              Priority
            </Label>
            <Select value={priority} onValueChange={(val: 'low' | 'medium' | 'high' | 'urgent' | null) => { if (val) setPriority(val) }}>
              <SelectTrigger id='task-priority' className='h-10 w-full'>
                <SelectValue placeholder={t('kanban.selectPriority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='low'>{t('kanban.priorityLow')}</SelectItem>
                <SelectItem value='medium'>{t('kanban.priorityMedium')}</SelectItem>
                <SelectItem value='high'>{t('kanban.priorityHigh')}</SelectItem>
                <SelectItem value='urgent'>{t('kanban.priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card image */}
          <div className='space-y-1.5'>
            <Label htmlFor='task-image' className='text-sm font-medium'>
              Card image
            </Label>
            <div className='flex items-center gap-3'>
              <Input
                id='task-image'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='h-10 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground hover:file:bg-secondary/80'
              />
              {coverImage && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setCoverImage(null)}
                  className='text-destructive text-xs shrink-0'
                >
                  Quitar
                </Button>
              )}
            </div>
            {coverImage && (
              <div className='mt-2 relative h-28 w-full rounded-md overflow-hidden border bg-muted'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt={t('common.preview') || 'Vista previa'} className='h-full w-full object-cover' />
              </div>
            )}
          </div>

          {/* Assignees */}
          <div className='space-y-1.5'>
            <Label className='text-sm font-medium'>{t('kanban.assignees')}</Label>
            <div className='flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-md border bg-background items-center'>
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

            {/* Quick dropdown for assignees */}
            <div className='pt-1'>
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

          {/* Due date */}
          <div className='space-y-1.5'>
            <Label className='text-sm font-medium'>{t('kanban.dueDate')}</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dueDate && 'text-muted-foreground'
                    )}
                  />
                }
              >
                <CalendarIcon className='mr-2 size-4' />
                {dueDate ? format(dueDate, 'MMM d, yyyy') : <span>{t('kanban.pickDate')}</span>}
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

          {/* Footer Buttons */}
          <div className='flex items-center justify-end gap-3 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
