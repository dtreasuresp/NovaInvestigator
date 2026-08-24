'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/hooks/use-i18n'
import type { InvestigationCollaborator, InvestigationState } from '@/types/apps/investigator-types'

interface WorkspaceMember {
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface ShareInvestigationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InvestigationState | null
  isOwner: boolean
  currentUserId: string | null
  onSaveSharing: (
    researchId: string,
    accessLevel: 'private' | 'team_read' | 'team_write',
    isLocked: boolean,
    collaborators: InvestigationCollaborator[]
  ) => Promise<void>
}

export function ShareInvestigationDialog({
  open,
  onOpenChange,
  item,
  isOwner,
  currentUserId,
  onSaveSharing
}: ShareInvestigationDialogProps) {
  const { t } = useI18n()

  const [accessLevel, setAccessLevel] = useState<'private' | 'team_read' | 'team_write'>('team_write')
  const [isLocked, setIsLocked] = useState(false)
  const [collaborators, setCollaborators] = useState<InvestigationCollaborator[]>([])

  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor')
  const [saving, setSaving] = useState(false)

  const isClosed = Boolean(item?.metadata?.status === 'cerrada' || item?.metadata?.archivedAt)

  // Sincronizar estado inicial cuando se abre el diálogo
  useEffect(() => {
    if (open && item) {
      const itemLocked = Boolean(item.metadata.isLocked)
      const closed = Boolean(item.metadata.status === 'cerrada' || item.metadata.archivedAt)
      const rawAccessLevel = item.metadata.accessLevel ?? 'team_write'

      // Si está bloqueado o cerrado, el acceso general efectivo no puede ser 'team_write'
      const effectiveAccessLevel =
        (itemLocked || closed) && rawAccessLevel === 'team_write' ? 'team_read' : rawAccessLevel

      setAccessLevel(effectiveAccessLevel)
      setIsLocked(itemLocked || closed)
      setCollaborators(item.metadata.collaborators ?? [])
      setSelectedUserId('')
      setSelectedRole('editor')
    }
  }, [open, item])

  // Cargar miembros del workspace
  const fetchWorkspaceMembers = useCallback(async () => {
    setLoadingMembers(true)

    try {
      const res = await fetch('/api/workspace/members', { cache: 'no-store' })

      if (!res.ok) throw new Error('Error al cargar miembros')

      const data = (await res.json()) as { ok?: boolean; members?: WorkspaceMember[] }

      if (data.ok && Array.isArray(data.members)) {
        setWorkspaceMembers(data.members)
      }
    } catch {
      toast.error('No se pudieron consultar los miembros del espacio de trabajo.')
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void fetchWorkspaceMembers()
    }
  }, [open, fetchWorkspaceMembers])

  if (!item) return null

  const ownerId = item.metadata.ownerId
  const ownerName = item.metadata.createdByName || item.metadata.author || 'Autor original'

  // Miembros que aún no son colaboradores ni son el propietario
  const availableMembers = workspaceMembers.filter(
    m => m.userId !== ownerId && !collaborators.some(c => c.userId === m.userId)
  )

  const handleLockChange = (checked: boolean) => {
    setIsLocked(checked)

    if (checked && accessLevel === 'team_write') {
      setAccessLevel('team_read')
    }
  }

  const handleAccessLevelChange = (val: 'private' | 'team_read' | 'team_write' | null) => {
    if (!val) return

    setAccessLevel(val)

    if (val === 'team_write') {
      setIsLocked(false)
    }
  }

  const handleAddCollaborator = () => {
    if (!selectedUserId) return

    const member = workspaceMembers.find(m => m.userId === selectedUserId)

    if (!member) return

    const newCollaborator: InvestigationCollaborator = {
      userId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      role: selectedRole,
      addedAt: new Date().toISOString()
    }

    setCollaborators(prev => [...prev, newCollaborator])
    setSelectedUserId('')
  }

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(c => c.userId !== userId))
  }

  const handleRoleChange = (userId: string, newRole: 'editor' | 'viewer') => {
    setCollaborators(prev =>
      prev.map(c => (c.userId === userId ? { ...c, role: newRole } : c))
    )
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      await onSaveSharing(item.metadata.id, accessLevel, isLocked, collaborators)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[560px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-4 border-b border-border/50'>
          <DialogTitle className='text-lg font-semibold'>
            {t('investigator.shareInvestigation')}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground mt-1'>
            {t('investigator.shareSubtitle')}
          </DialogDescription>
          <div className='mt-2 p-2 bg-muted/40 rounded-md border border-border/40 text-xs font-medium text-foreground truncate'>
            {item.metadata.title}
          </div>
        </DialogHeader>

        <div className='p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]'>
          {/* 1. Nivel de Acceso General */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold text-foreground'>
              {t('investigator.generalAccess')}
            </Label>
            <Select
              value={accessLevel}
              onValueChange={handleAccessLevelChange}
              disabled={!isOwner || isClosed}
            >
              <SelectTrigger className='w-full text-xs h-9'>
                <SelectValue>
                  {accessLevel === 'team_write' && t('investigator.accessCollaborative')}
                  {accessLevel === 'team_read' && t('investigator.accessTeamRead')}
                  {accessLevel === 'private' && t('investigator.accessPrivate')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value='team_write'
                  className='text-xs'
                  disabled={isClosed || isLocked}
                >
                  {t('investigator.accessCollaborative')}
                </SelectItem>
                <SelectItem value='team_read' className='text-xs'>
                  {t('investigator.accessTeamRead')}
                </SelectItem>
                <SelectItem value='private' className='text-xs'>
                  {t('investigator.accessPrivate')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className='text-[11px] text-muted-foreground'>
              {isClosed
                ? 'El expediente está cerrado. El acceso para el equipo es en modo solo lectura.'
                : isLocked
                  ? 'La edición general está bloqueada. El equipo tiene acceso de solo lectura y solo los co-autores pueden editar.'
                  : accessLevel === 'team_write'
                    ? t('investigator.accessCollaborativeDesc')
                    : accessLevel === 'team_read'
                      ? t('investigator.accessTeamReadDesc')
                      : t('investigator.accessPrivateDesc')}
            </p>
          </div>

          {/* 2. Switch de Bloqueo / Protección de Autoría */}
          <div className='flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20'>
            <div className='space-y-0.5 pr-4'>
              <Label className='text-xs font-semibold text-foreground cursor-pointer'>
                {t('investigator.lockProtection')}
              </Label>
              <p className='text-[11px] text-muted-foreground'>
                {t('investigator.lockProtectionDesc')}
              </p>
            </div>
            <Switch
              checked={isLocked}
              onCheckedChange={handleLockChange}
              disabled={!isOwner || isClosed}
              aria-label={t('investigator.lockProtection')}
            />
          </div>

          {/* 3. Sección de Añadir Colaborador */}
          {isOwner && !isClosed && (
            <div className='space-y-2 pt-2 border-t border-border/40'>
              <Label className='text-xs font-semibold text-foreground'>
                {t('investigator.addCollaborator')}
              </Label>
              <div className='flex flex-wrap sm:flex-nowrap gap-2 items-center'>
                <Select
                  value={selectedUserId}
                  onValueChange={(val: string | null) => setSelectedUserId(val || '')}
                  disabled={loadingMembers || availableMembers.length === 0}
                >
                  <SelectTrigger className='flex-1 text-xs h-9 min-w-[180px]'>
                    <SelectValue
                      placeholder={
                        loadingMembers
                          ? t('investigator.loadingMembers')
                          : availableMembers.length === 0
                            ? t('investigator.noAvailableMembers')
                            : t('investigator.selectMember')
                      }
                    >
                      {selectedUserId &&
                        workspaceMembers.find(m => m.userId === selectedUserId)?.displayName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map(member => (
                      <SelectItem key={member.userId} value={member.userId} className='text-xs'>
                        <div className='flex items-center gap-2'>
                          <Avatar className='w-4 h-4'>
                            {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                            <AvatarFallback className='text-[9px]'>
                              {member.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedRole}
                  onValueChange={(val: 'editor' | 'viewer' | null) => {
                    if (val) setSelectedRole(val)
                  }}
                  disabled={!selectedUserId}
                >
                  <SelectTrigger className='w-[140px] text-xs h-9'>
                    <SelectValue>
                      {selectedRole === 'editor' && t('investigator.roleEditor')}
                      {selectedRole === 'viewer' && t('investigator.roleViewer')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='editor' className='text-xs'>
                      {t('investigator.roleEditor')}
                    </SelectItem>
                    <SelectItem value='viewer' className='text-xs'>
                      {t('investigator.roleViewer')}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size='sm'
                  onClick={handleAddCollaborator}
                  disabled={!selectedUserId}
                  className='h-9 px-3 shrink-0 text-xs'
                >
                  {t('common.add')}
                </Button>
              </div>
            </div>
          )}

          {/* 4. Lista de Colaboradores */}
          <div className='space-y-2 pt-2 border-t border-border/40'>
            <Label className='text-xs font-semibold text-foreground'>
              {t('investigator.collaboratorsTitle')} ({1 + collaborators.length})
            </Label>

            <div className='space-y-2'>
              {/* Propietario / Autor */}
              <div className='flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40'>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <Avatar className='w-7 h-7 shrink-0'>
                    <AvatarFallback className='text-xs bg-muted text-foreground font-semibold'>
                      {ownerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <div className='text-xs font-medium text-foreground truncate flex items-center gap-1.5'>
                      <span>{ownerName}</span>
                      {ownerId === currentUserId && (
                        <span className='text-[10px] text-muted-foreground'>({t('common.you')})</span>
                      )}
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      {t('investigator.ownerBadge')}
                    </div>
                  </div>
                </div>

                <Badge
                  variant='secondary'
                  className='text-[10px] font-medium'
                >
                  {t('investigator.ownerBadge')}
                </Badge>
              </div>

              {/* Colaboradores asignados */}
              {collaborators.map(collaborator => (
                <div
                  key={collaborator.userId}
                  className='flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50 hover:border-border transition-colors'
                >
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <Avatar className='w-7 h-7 shrink-0'>
                      {collaborator.avatarUrl && <AvatarImage src={collaborator.avatarUrl} />}
                      <AvatarFallback className='text-xs bg-muted text-foreground font-semibold'>
                        {collaborator.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <div className='text-xs font-medium text-foreground truncate flex items-center gap-1.5'>
                        <span>{collaborator.displayName}</span>
                        {collaborator.userId === currentUserId && (
                          <span className='text-[10px] text-muted-foreground'>({t('common.you')})</span>
                        )}
                      </div>
                      <div className='text-[10px] text-muted-foreground'>
                        {collaborator.role === 'editor'
                          ? t('investigator.roleEditor')
                          : t('investigator.roleViewer')}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2 shrink-0'>
                    {isOwner && !isClosed ? (
                      <>
                        <Select
                          value={collaborator.role}
                          onValueChange={(val: 'editor' | 'viewer' | null) => {
                            if (val) handleRoleChange(collaborator.userId, val)
                          }}
                        >
                          <SelectTrigger className='w-[130px] text-xs h-7'>
                            <SelectValue>
                              {collaborator.role === 'editor' && t('investigator.roleEditor')}
                              {collaborator.role === 'viewer' && t('investigator.roleViewer')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='editor' className='text-xs'>
                              {t('investigator.roleEditor')}
                            </SelectItem>
                            <SelectItem value='viewer' className='text-xs'>
                              {t('investigator.roleViewer')}
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-7 w-7 text-muted-foreground hover:text-destructive'
                          onClick={() => handleRemoveCollaborator(collaborator.userId)}
                          title={t('investigator.removeCollaborator')}
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant='outline'
                        className='text-[10px]'
                      >
                        {collaborator.role === 'editor'
                          ? t('investigator.roleEditor')
                          : t('investigator.roleViewer')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className='p-4 px-6 border-t border-border/50 bg-muted/20 flex items-center justify-between sm:justify-between'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className='text-xs'
          >
            {t('common.cancel')}
          </Button>

          {isOwner && !isClosed && (
            <Button
              size='sm'
              onClick={handleSave}
              disabled={saving}
              className='gap-1.5 text-xs'
            >
              {saving && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
              {t('investigator.savePermissions')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
