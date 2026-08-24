'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// Third-party Imports
import { ImageIcon, Loader2Icon, TrashIcon, UploadCloudIcon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { compressImage } from '@/utils/image-compression'

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

const WorkspaceDetail = () => {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Form State
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/workspace', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) return null
        const data = (await res.json()) as { ok: boolean; workspace?: WorkspaceData }
        if (active && data.workspace) {
          setSlug(data.workspace.slug)
          setDescription(data.workspace.description || '')
          setPreview(data.workspace.avatarUrl)
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (!f.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.')
      e.currentTarget.value = ''
      return
    }

    setUploadingLogo(true)
    try {
      // Auto-compress and resize workspace logo into lightweight WebP
      const optimizedFile = await compressImage(f, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.9,
        cropToSquare: false
      })

      const fd = new FormData()
      fd.append('file', optimizedFile)

      const res = await fetch('/api/workspace/logo', {
        method: 'POST',
        body: fd
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message || 'Error al subir el logo')
      }

      const data = (await res.json()) as { ok: boolean; avatarUrl: string }
      setPreview(data.avatarUrl)
      toast.success('Logo actualizado con éxito')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar la imagen')
    } finally {
      setUploadingLogo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    setUploadingLogo(true)
    try {
      const res = await fetch('/api/workspace/logo', { method: 'DELETE' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message || 'Error al eliminar el logo')
      }
      setPreview(null)
      toast.success('Logo eliminado con éxito')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const openPicker = () => inputRef.current?.click()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, description })
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message || 'Error al guardar los detalles')
      }

      toast.success('Detalles del espacio actualizados con éxito')
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
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave}>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        {/* Workspace Detail */}
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.workspaceDetailTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.workspaceDetailDesc')}</p>
        </div>
        {/* Content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Workspace logo */}
          <div className='w-full space-y-2'>
            <Label>{t('userSettings.workspaceLogo')}</Label>
            <div className='flex items-center gap-4'>
              <div
                role='button'
                tabIndex={0}
                aria-label={t('userSettings.uploadAvatar')}
                onClick={openPicker}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openPicker()
                  }
                }}
                className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'
              >
                {preview ? (
                  <img src={preview} alt={t('userSettings.avatar') || 'Logo de la organización'} className='h-full w-full object-cover' />
                ) : (
                  <ImageIcon className='text-muted-foreground size-8' />
                )}
              </div>

              <div className='flex items-center gap-2'>
                <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={onSelect} />
                <Button
                  type='button'
                  variant='outline'
                  onClick={openPicker}
                  disabled={uploadingLogo}
                  className='flex items-center gap-2'
                >
                  {uploadingLogo ? <Loader2Icon className='size-4 animate-spin' /> : <UploadCloudIcon />}
                  {t('userSettings.uploadAvatar')}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={remove}
                  disabled={!preview || uploadingLogo}
                  className='text-destructive'
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>
            <p className='text-muted-foreground text-sm'>{t('userSettings.avatarConstraint')}</p>
          </div>
          {/* Workspace URL */}
          <div className='w-full space-y-2'>
            <Label htmlFor='workspace-url'>{t('userSettings.workspaceUrl')}</Label>
            <InputGroup>
              <InputGroupAddon className='text-foreground font-normal'>https://store.dgtecnova.com/</InputGroupAddon>
              <InputGroupInput id='workspace-url' value={slug} readOnly />
            </InputGroup>
          </div>
          {/* Workspace slug */}
          <div className='w-full space-y-2'>
            <Label htmlFor='workspace-slug'>{t('userSettings.workspaceSlug')}</Label>
            <Input
              id='workspace-slug'
              type='text'
              placeholder={t('userSettings.workspaceSlug')}
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
            />
            <p className='text-muted-foreground text-xs'>
              Solo letras minúsculas, números y guiones. Máx. 48 caracteres.
            </p>
          </div>
          {/* Workspace Description */}
          <div className='w-full space-y-2'>
            <Label htmlFor='workspace-description'>{t('userSettings.workspaceDescription')}</Label>
            <Textarea
              placeholder={t('userSettings.workspaceDescription')}
              id='workspace-description'
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
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

export default WorkspaceDetail
