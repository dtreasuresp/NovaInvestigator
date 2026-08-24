'use client'

import { useCallback, useEffect, useState } from 'react'
import { CrownIcon, Loader2Icon, PlusIcon, ShieldIcon, Trash2Icon, UserIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useI18n } from '@/hooks/use-i18n'

interface TeamMemberItem {
  userId: string
  displayName: string
  avatarUrl: string | null
  tenantRole: string
  teamRole: 'admin' | 'member' | 'lead'
  joinedAt: string
}

interface AvailableMember {
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface ManageTeamMembersDialogProps {
  teamId: string | null
  teamName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMembersUpdated?: () => void
}

export function ManageTeamMembersDialog({
  teamId,
  teamName,
  open,
  onOpenChange,
  onMembersUpdated
}: ManageTeamMembersDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<TeamMemberItem[]>([])
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'lead'>('member')
  const [addingMember, setAddingMember] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar miembros')
      const payload = (await res.json()) as {
        ok?: boolean
        items?: TeamMemberItem[]
        availableMembers?: AvailableMember[]
      }
      if (payload.ok) {
        setMembers(payload.items || [])
        setAvailableMembers(payload.availableMembers || [])
      }
    } catch {
      toast.error('No se pudieron consultar los miembros del equipo.')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    if (open && teamId) {
      void fetchMembers()
      setSelectedUserId('')
      setSelectedRole('member')
    }
  }, [open, teamId, fetchMembers])

  const handleAddMember = async () => {
    if (!teamId || !selectedUserId) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole })
      })
      const payload = (await res.json()) as { ok?: boolean; error?: { message?: string } }
      if (!res.ok || !payload.ok) {
        toast.error(payload.error?.message || 'Error al añadir miembro.')
        return
      }

      toast.success('Miembro añadido al equipo.')
      setSelectedUserId('')
      setSelectedRole('member')
      window.dispatchEvent(new Event('novastore:workspace-updated'))
      void fetchMembers()
      onMembersUpdated?.()
    } catch {
      toast.error('Error de conexión al añadir miembro.')
    } finally {
      setAddingMember(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member' | 'lead') => {
    if (!teamId) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      if (!res.ok) throw new Error()
      toast.success('Rol actualizado con éxito.')
      window.dispatchEvent(new Event('novastore:workspace-updated'))
      void fetchMembers()
      onMembersUpdated?.()
    } catch {
      toast.error('No se pudo actualizar el rol.')
    }
  }

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!teamId) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members?userId=${userId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error()
      toast.success(`"${name}" removido del equipo.`)
      window.dispatchEvent(new Event('novastore:workspace-updated'))
      void fetchMembers()
      onMembersUpdated?.()
    } catch {
      toast.error('No se pudo remover al miembro.')
    }
  }

  const getRoleBadge = (role: 'admin' | 'member' | 'lead') => {
    switch (role) {
      case 'lead':
        return (
          <span className='inline-flex items-center gap-1.5 font-medium text-amber-500'>
            <CrownIcon className='size-3.5' />
            Líder
          </span>
        )
      case 'admin':
        return (
          <span className='inline-flex items-center gap-1.5 font-medium text-primary'>
            <ShieldIcon className='size-3.5' />
            Admin
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center gap-1.5 font-normal text-muted-foreground'>
            <UserIcon className='size-3.5' />
            Miembro
          </span>
        )
    }
  }

  const selectedUserObj = availableMembers.find(u => u.userId === selectedUserId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[580px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-lg'>
            <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <UsersIcon className='size-4' />
            </div>
            Miembros de {teamName}
          </DialogTitle>
          <DialogDescription>
            Administra los integrantes y roles funcionales asignados a este equipo.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Add member box */}
          <div className='rounded-xl border bg-muted/30 p-3.5 space-y-2.5'>
            <div className='flex items-center justify-between text-xs font-medium text-foreground'>
              <span>{t('userSettings.addOrgCollaborator')}</span>
              <Badge variant='outline' className='text-[10px] font-normal px-2 py-0'>
                {availableMembers.length} {availableMembers.length === 1 ? 'disponible' : 'disponibles'}
              </Badge>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-12 gap-2 items-center'>
              {/* User Selector (col-span-6) */}
              <div className='sm:col-span-6'>
                <Select value={selectedUserId} onValueChange={v => setSelectedUserId(v || '')}>
                  <SelectTrigger className='h-9 w-full text-xs px-2.5 bg-background'>
                    {selectedUserObj ? (
                      <div className='flex items-center gap-2 truncate flex-1 text-left'>
                        <Avatar className='size-5 rounded-full shrink-0 border'>
                          {selectedUserObj.avatarUrl ? <AvatarImage src={selectedUserObj.avatarUrl} /> : null}
                          <AvatarFallback className='text-[9px] bg-primary/10 text-primary font-semibold'>
                            {selectedUserObj.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className='truncate font-medium text-foreground'>{selectedUserObj.displayName}</span>
                      </div>
                    ) : (
                      <span className='text-muted-foreground flex-1 text-left truncate'>{t('userSettings.selectUser')}</span>
                    )}
                  </SelectTrigger>
                  <SelectContent side='bottom' align='start' alignItemWithTrigger={false} className='w-[280px] max-h-60'>
                    {availableMembers.length === 0 ? (
                      <div className='p-3 text-center text-xs text-muted-foreground'>
                        Todos los usuarios ya están en este equipo
                      </div>
                    ) : (
                      availableMembers.map(user => (
                        <SelectItem
                          key={user.userId}
                          value={user.userId}
                          className='text-xs py-2'
                        >
                          <div className='flex items-center gap-2.5'>
                            <Avatar className='size-6 rounded-full border shrink-0'>
                              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                              <AvatarFallback className='text-[10px] bg-primary/10 text-primary font-semibold'>
                                {user.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className='truncate font-medium'>{user.displayName}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selector (col-span-3) */}
              <div className='sm:col-span-3'>
                <Select
                  value={selectedRole}
                  onValueChange={v => {
                    if (v) setSelectedRole(v as 'admin' | 'member' | 'lead')
                  }}
                >
                  <SelectTrigger className='h-9 w-full text-xs px-2.5 bg-background'>
                    {getRoleBadge(selectedRole)}
                  </SelectTrigger>
                  <SelectContent side='bottom' align='start' alignItemWithTrigger={false} className='w-36'>
                    <SelectItem value='member' className='text-xs gap-1.5'>
                      <UserIcon className='size-3.5 text-muted-foreground' />
                      Miembro
                    </SelectItem>
                    <SelectItem value='lead' className='text-xs gap-1.5'>
                      <CrownIcon className='size-3.5 text-amber-500' />
                      Líder
                    </SelectItem>
                    <SelectItem value='admin' className='text-xs gap-1.5'>
                      <ShieldIcon className='size-3.5 text-primary' />
                      Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button (col-span-3) */}
              <div className='sm:col-span-3'>
                <Button
                  size='sm'
                  className='h-9 w-full gap-1.5 text-xs shadow-sm font-medium'
                  onClick={handleAddMember}
                  disabled={addingMember || !selectedUserId}
                >
                  {addingMember ? <Loader2Icon className='size-3.5 animate-spin' /> : <PlusIcon className='size-3.5' />}
                  Añadir
                </Button>
              </div>
            </div>
          </div>

          {/* Members list */}
          <div className='space-y-2 pt-1'>
            <div className='flex items-center justify-between text-xs text-muted-foreground font-medium px-1'>
              <span>Integrantes del Equipo ({members.length})</span>
              <span>{t('userSettings.assignedRole')}</span>
            </div>

            {loading ? (
              <div className='flex items-center justify-center p-8'>
                <Loader2Icon className='size-6 animate-spin text-primary' />
              </div>
            ) : members.length === 0 ? (
              <div className='rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground'>
                No hay miembros asignados a este equipo aún.
              </div>
            ) : (
              <div className='max-h-[260px] space-y-1.5 overflow-y-auto pr-1'>
                {members.map(member => {
                  const initials = member.displayName
                    .split(/\s+/)
                    .filter(Boolean)
                    .map(p => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <div
                      key={member.userId}
                      className='flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/40'
                    >
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <Avatar className='size-8 rounded-md border shrink-0'>
                          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.displayName} /> : null}
                          <AvatarFallback className='rounded-md text-xs font-semibold bg-primary/10 text-primary'>
                            {initials || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className='truncate min-w-0'>
                          <p className='truncate text-xs font-medium text-foreground'>{member.displayName}</p>
                          <span className='text-[10px] text-muted-foreground capitalize'>
                            Rol org: {member.tenantRole}
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Select
                          value={member.teamRole}
                          onValueChange={v => {
                            if (v) handleUpdateRole(member.userId, v as 'admin' | 'member' | 'lead')
                          }}
                        >
                          <SelectTrigger className='h-7 w-28 text-[11px] px-2'>
                            {getRoleBadge(member.teamRole)}
                          </SelectTrigger>
                          <SelectContent side='bottom' align='end' alignItemWithTrigger={false} className='w-32'>
                            <SelectItem value='member' className='text-xs gap-1.5'>
                              <UserIcon className='size-3.5 text-muted-foreground' />
                              Miembro
                            </SelectItem>
                            <SelectItem value='lead' className='text-xs gap-1.5'>
                              <CrownIcon className='size-3.5 text-amber-500' />
                              Líder
                            </SelectItem>
                            <SelectItem value='admin' className='text-xs gap-1.5'>
                              <ShieldIcon className='size-3.5 text-primary' />
                              Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-7 text-muted-foreground hover:text-destructive'
                          onClick={() => handleRemoveMember(member.userId, member.displayName)}
                          title={t('userSettings.removeMember')}
                        >
                          <Trash2Icon className='size-3.5' />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
