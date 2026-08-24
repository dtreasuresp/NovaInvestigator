'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/use-i18n'

type ColumnFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => Promise<void>
}

export function ColumnFormDialog({ open, onOpenChange, onSave }: ColumnFormDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave(name.trim())
      setName('')
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[400px] p-6'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>{t('kanban.addColumn')}</DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Create a new status column for your workspace workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='col-name' className='text-sm font-medium'>
              Column Name
            </Label>
            <Input
              id='col-name'
              placeholder={t('kanban.columnNamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className='flex items-center justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !name.trim()}>
              {isSaving ? 'Creating...' : 'Create Column'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
