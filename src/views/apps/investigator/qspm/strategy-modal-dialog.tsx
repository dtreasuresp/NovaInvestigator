'use client'

// React Imports
import { useEffect, useState } from 'react'

// Type Imports
import type { Quadrant, Strategy } from '@/types/apps/investigator-types'

// Component Imports
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { ORIENTATIONS } from '@/utils/investigator/domain'

interface StrategyModalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategy: Strategy | null
  isEditing: boolean
  onSave: (data: { name: string; quadrant: Quadrant; description: string }) => void
}

const QUADRANTS: Quadrant[] = ['FO', 'DO', 'FA', 'DA']

export const StrategyModalDialog = ({
  open,
  onOpenChange,
  strategy,
  isEditing,
  onSave
}: StrategyModalDialogProps) => {
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [quadrant, setQuadrant] = useState<Quadrant>('DO')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (strategy && isEditing) {
        setName(strategy.name || '')
        setQuadrant(strategy.quadrant || 'DO')
        setDescription(strategy.description || '')
      } else {
        setName('')
        setQuadrant('DO')
        setDescription('')
      }
      setError(null)
    }
  }, [open, strategy, isEditing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(t('investigator.strategyNamePlaceholder') || 'El nombre de la alternativa es requerido.')
      return
    }

    onSave({
      name: name.trim(),
      quadrant,
      description: description.trim()
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle className='font-heading text-lg font-semibold'>
              {isEditing
                ? `${t('investigator.editAlternative') || 'Editar alternativa'} · ${strategy?.id || ''}`
                : (t('investigator.newAlternative') || 'Nueva alternativa estratégica')}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {t('investigator.strategyModalDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3.5 py-1'>
            {/* Cuadrante DAFO */}
            <div className='space-y-1.5'>
              <Label htmlFor='strategy-quadrant' className='text-xs font-medium'>
                {t('investigator.strategyQuadrant') || 'Cuadrante DAFO'}
              </Label>
              <Select value={quadrant} onValueChange={val => setQuadrant(val as Quadrant)}>
                <SelectTrigger id='strategy-quadrant' className='w-full text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUADRANTS.map(q => {
                    const info = ORIENTATIONS[q]
                    return (
                      <SelectItem key={q} value={q} className='text-xs'>
                        <span className='font-mono font-bold'>{q}</span> · {info.name} ({info.subtitle})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className='text-[11px] text-muted-foreground'>
                {ORIENTATIONS[quadrant].action}
              </p>
            </div>

            {/* Nombre de la alternativa */}
            <div className='space-y-1.5'>
              <Label htmlFor='strategy-name' className='text-xs font-medium'>
                {t('investigator.strategyName') || 'Nombre de la alternativa'} <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='strategy-name'
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={t('investigator.strategyNamePlaceholder')}
                className='text-xs'
                autoFocus
              />
              {error && <p className='text-[11px] text-destructive font-medium'>{error}</p>}
            </div>

            {/* Descripción y alcance */}
            <div className='space-y-1.5'>
              <Label htmlFor='strategy-desc' className='text-xs font-medium'>
                {t('investigator.strategyDescription') || 'Descripción y alcance estratégico'}
              </Label>
              <Textarea
                id='strategy-desc'
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('investigator.strategyDescriptionPlaceholder')}
                className='min-h-24 text-xs resize-none'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0 pt-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' size='sm'>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
