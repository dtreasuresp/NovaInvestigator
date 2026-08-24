'use client'

// React Imports
import { useEffect, useId, useMemo, useState } from 'react'

// Third-party Imports
import { CheckIcon, ChevronsUpDownIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

interface WorkspaceData {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  description: string | null
  timezone: string
  appId: string
}

const WorkspaceName = () => {
  const { t } = useI18n()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [appId, setAppId] = useState('')
  const [value, setValue] = useState<string>('UTC')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch supported timezones
  const timezones = Intl.supportedValuesOf('timeZone')

  const formattedTimezones = useMemo(() => {
    return timezones
      .map(timezone => {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: timezone,
          timeZoneName: 'shortOffset'
        })

        const parts = formatter.formatToParts(new Date())

        const offset = parts.find(part => part.type === 'timeZoneName')?.value || ''

        const formattedOffset = offset === 'GMT' ? 'GMT+0' : offset

        return {
          value: timezone,
          label: `(${formattedOffset}) ${timezone.replace(/_/g, ' ')}`,
          numericOffset: parseInt(formattedOffset.replace('GMT', '').replace('+', '') || '0')
        }
      })
      .sort((a, b) => a.numericOffset - b.numericOffset)
  }, [timezones])

  useEffect(() => {
    let active = true

    fetch('/api/workspace', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) return
        const data = (await res.json()) as { ok: boolean; workspace?: WorkspaceData }
        if (active && data.workspace) {
          setName(data.workspace.name)
          setAppId(data.workspace.appId)
          setValue(data.workspace.timezone || 'UTC')
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, timezone: value })
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message || 'Error al actualizar el espacio')
      }

      toast.success('Espacio de trabajo actualizado con éxito')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-4 w-60' />
        </div>
        <div className='space-y-6 lg:col-span-2'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave}>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        {/* Workspace Name */}
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.workspaceNameTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.workspaceNameDesc')}</p>
        </div>
        {/* Content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Workspace Name */}
          <div className='flex flex-col items-start gap-1'>
            <Label htmlFor='workspace-name'>{t('userSettings.workspaceNameTitle')}</Label>
            <Input
              id='workspace-name'
              placeholder={t('userSettings.workspaceNameTitle')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          {/* Workspace ID */}
          <div className='w-full space-y-2'>
            <Label htmlFor='app-id'>{t('common.code')}</Label>
            <Input
              id='app-id'
              type='text'
              placeholder={t('common.code')}
              value={appId}
              className='read-only:bg-muted'
              readOnly
            />
          </div>
          {/* Workspace timezone */}
          <div className='w-full space-y-2'>
            <Label htmlFor={id}>{t('userSettings.timezone')}</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <Button
                    id={id}
                    variant='outline'
                    role='combobox'
                    aria-expanded={open}
                    className='w-full justify-between'
                  />
                }
              >
                <span className={cn('truncate')}>
                  {value ? (
                    formattedTimezones.find(timezone => timezone.value === value)?.label
                  ) : (
                    <span className='text-muted-foreground'>{t('userSettings.selectTimezone')}</span>
                  )}
                </span>
                <ChevronsUpDownIcon className='text-muted-foreground/80 shrink-0' aria-hidden='true' />
              </PopoverTrigger>
              <PopoverContent className='w-(--anchor-width) p-0'>
                <Command>
                  <CommandInput placeholder={t('userSettings.searchTimezone')} />
                  <CommandList>
                    <CommandEmpty>{t('userSettings.noTimezoneFound')}</CommandEmpty>
                    <CommandGroup>
                      {formattedTimezones.map(({ value: itemValue, label }) => (
                        <CommandItem
                          key={itemValue}
                          value={itemValue}
                          onSelect={currentValue => {
                            setValue(currentValue === value ? '' : currentValue)
                            setOpen(false)
                          }}
                        >
                          <span className='flex-1 truncate'>{label}</span>
                          {value === itemValue && <CheckIcon className='ml-auto' />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' disabled={saving} className='max-sm:w-full'>
              {saving && <Loader2Icon className='mr-2 size-4 animate-spin' />}
              {saving ? t('common.saving') : t('userSettings.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default WorkspaceName
