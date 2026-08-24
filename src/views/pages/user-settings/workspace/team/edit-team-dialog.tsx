'use client'

import { useEffect, useRef, useState } from 'react'
import { Edit3Icon, Loader2Icon, TagIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { compressImage } from '@/utils/image-compression'
import { useI18n } from '@/hooks/use-i18n'

interface TeamData {
  id: string
  name: string
  slug: string
  description: string | null
  avatarUrl: string | null
  tags?: string[]
}

interface EditTeamDialogProps {
  team: TeamData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated?: () => void
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onTeamUpdated
}: EditTeamDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (team && open) {
      setName(team.name || '')
      setDescription(team.description || '')
      setTags(team.tags || [])
      setTagInput('')
      setLogoPreview(team.avatarUrl || null)
      setLogoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [team, open])

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '')
    if (!clean) return
    if (tags.includes(clean)) {
      setTagInput('')
      return
    }
    if (tags.length >= 8) {
      toast.error('Máximo 8 etiquetas por equipo.')
      return
    }
    setTags(prev => [...prev, clean])
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (!f.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.')
      return
    }

    try {
      const compressed = await compressImage(f, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        cropToSquare: true
      })

      setLogoFile(compressed)
      setLogoPreview(URL.createObjectURL(compressed))
    } catch {
      toast.error('No se pudo procesar la imagen.')
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    if (!name.trim()) {
      toast.error('El nombre del equipo no puede estar vacío.')
      return
    }

    setLoading(true)

    try {
      // 1. Update team details
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          tags
        })
      })

      const payload = (await response.json()) as { ok?: boolean; error?: { message?: string } }

      if (!response.ok || !payload.ok) {
        toast.error(payload.error?.message ?? 'No se pudo actualizar el equipo.')
        return
      }

      // 2. If a new logo was selected, upload via /api/teams/[id]/avatar
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)

        await fetch(`/api/teams/${team.id}/avatar`, {
          method: 'POST',
          body: formData
        })
      }

      toast.success(`Equipo "${name.trim()}" actualizado exitosamente.`)
      window.dispatchEvent(new Event('novastore:workspace-updated'))

      onOpenChange(false)
      onTeamUpdated?.()
    } catch {
      toast.error('Error de conexión al actualizar el equipo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-lg'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Edit3Icon className='size-4' />
              </div>
              Editar Datos del Equipo
            </DialogTitle>
            <DialogDescription>
              Actualiza el nombre, la descripción, las etiquetas y el logotipo de este equipo de trabajo.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3.5 py-1'>
            {/* Team Name */}
            <div className='space-y-1.5'>
              <Label htmlFor='edit-team-name' className='text-sm font-medium'>
                {t('userSettings.workspaceTeamsTitle')} <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='edit-team-name'
                placeholder={t('userSettings.workspaceTeamsTitle')}
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* Slug Preview */}
            {slug && (
              <div className='rounded-md bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground'>
                Identificador URL: <span className='font-mono font-medium text-foreground'>{slug}</span>
              </div>
            )}

            {/* Description */}
            <div className='space-y-1.5'>
              <Label htmlFor='edit-team-description' className='text-sm font-medium'>
                {t('common.description')}
              </Label>
              <Textarea
                id='edit-team-description'
                placeholder={t('common.description')}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Tags / Categories */}
            <div className='space-y-1.5'>
              <Label htmlFor='edit-team-tags' className='text-sm font-medium'>
                Etiquetas (Tags)
              </Label>
              <div className='flex items-center gap-2'>
                <div className='relative flex-1'>
                  <TagIcon className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
                  <Input
                    id='edit-team-tags'
                    placeholder={t('userProfile.tabTeams')}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    maxLength={30}
                    className='pl-8 h-9 text-xs'
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className='h-9 text-xs px-3'
                >
                  {t('common.save')}
                </Button>
              </div>

              {tags.length > 0 && (
                <div className='flex flex-wrap gap-1.5 pt-1.5'>
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant='secondary'
                      className='gap-1 py-0.5 px-2 text-xs font-normal bg-muted hover:bg-muted'
                    >
                      {tag}
                      <button
                        type='button'
                        onClick={() => handleRemoveTag(tag)}
                        className='text-muted-foreground hover:text-destructive'
                      >
                        <XIcon className='size-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Logo / Avatar Upload */}
            <div className='space-y-1.5'>
              <Label className='text-sm font-medium'>{t('userSettings.teamAvatar')}</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleLogoChange}
                className='hidden'
              />

              {logoPreview ? (
                <div className='flex items-center gap-3 rounded-lg border p-2 bg-muted/30'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt={t('userSettings.avatar') || 'Logo del equipo'}
                    className='size-12 rounded-md object-cover border'
                  />
                  <div className='flex-1 truncate text-xs text-muted-foreground'>
                    Logo optimizado
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={removeLogo}
                    className='size-8 text-muted-foreground hover:text-destructive'
                  >
                    <XIcon className='size-4' />
                  </Button>
                </div>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='w-full border-dashed gap-2 h-11 text-muted-foreground hover:text-foreground'
                >
                  <UploadCloudIcon className='size-4' />
                  Seleccionar nueva imagen (Auto-optimización WebP)
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className='gap-2.5 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2Icon className='mr-2 size-4 animate-spin' />
                  Guardando cambios...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
