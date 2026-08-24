'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarIcon, Edit3Icon, MoreHorizontalIcon, Trash2Icon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateTeamDialog } from '@/views/pages/user-settings/workspace/team/create-team-dialog'
import { EditTeamDialog } from '@/views/pages/user-settings/workspace/team/edit-team-dialog'
import { ManageTeamMembersDialog } from '@/views/pages/user-settings/workspace/team/manage-team-members-dialog'
import { useI18n } from '@/hooks/use-i18n'

interface TeamItem {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  description: string | null
  tags?: string[]
  memberCount: number
  createdAt: string
}

const WorkspaceTeams = () => {
  const { t } = useI18n()
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<{ id: string; name: string } | null>(null)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<TeamItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/teams', { cache: 'no-store' })

      if (!res.ok) return

      const payload = (await res.json()) as { teams?: TeamItem[] }

      if (payload.teams) {
        setTeams(payload.teams)
      }
    } catch {
      toast.error('No se pudieron consultar los equipos del espacio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  const handleDeleteTeam = async (team: TeamItem) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el equipo "${team.name}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const payload = (await res.json()) as { error?: { message?: string } }

        toast.error(payload.error?.message || 'No se pudo eliminar el equipo.')

        return
      }

      toast.success('Equipo eliminado exitosamente.')
      void fetchTeams()
    } catch {
      toast.error('No se pudo eliminar el equipo.')
    }
  }

  const handleOpenMembers = (team: TeamItem) => {
    setSelectedTeamForMembers({ id: team.id, name: team.name })
    setMembersDialogOpen(true)
  }

  const handleOpenEdit = (team: TeamItem) => {
    setSelectedTeamForEdit(team)
    setEditDialogOpen(true)
  }

  return (
    <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
      {/* Section info */}
      <div className='space-y-2'>
        <h3 className='text-base font-semibold'>{t('userSettings.workspaceTeamsTitle')}</h3>
        <p className='text-muted-foreground text-sm leading-relaxed'>
          Gestiona los equipos funcionales asociados a este espacio de trabajo para organizar proyectos, tableros Kanban e investigaciones.
        </p>
      </div>

      {/* Content */}
      <div className='space-y-4 lg:col-span-2'>
        {/* Header with Create Button */}
        <div className='flex items-center justify-between pb-1'>
          <div className='text-sm font-medium text-foreground'>
            {loading ? 'Cargando equipos...' : `${teams.length} ${teams.length === 1 ? 'equipo registrado' : 'equipos registrados'}`}
          </div>
          <CreateTeamDialog onTeamCreated={fetchTeams} />
        </div>

        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-28 w-full rounded-xl' />
            <Skeleton className='h-28 w-full rounded-xl' />
          </div>
        ) : teams.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20'>
            <div className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3'>
              <UsersIcon className='size-6' />
            </div>
            <h4 className='text-sm font-semibold'>{t('userSettings.noTeamsCreated')}</h4>
            <p className='text-xs text-muted-foreground mt-1 max-w-sm'>
              Crea tu primer equipo para delegar proyectos y organizar investigaciones estratégicas colaborativas.
            </p>
            <div className='mt-4'>
              <CreateTeamDialog onTeamCreated={fetchTeams} />
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {teams.map(team => {
              const initials = team.name
                .split(/\s+/)
                .filter(Boolean)
                .map(p => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <div
                  key={team.id}
                  className='group relative flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm'
                >
                  <div>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <Avatar className='size-11 rounded-lg border shrink-0'>
                          {team.avatarUrl ? <AvatarImage src={team.avatarUrl} alt={team.name} /> : null}
                          <AvatarFallback className='rounded-lg text-xs font-semibold bg-primary/10 text-primary'>
                            {initials || 'TM'}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <h4 className='truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors'>
                            {team.name}
                          </h4>
                          <span className='font-mono text-xs text-muted-foreground'>/{team.slug}</span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant='ghost' size='icon' className='size-8 text-muted-foreground'>
                              <MoreHorizontalIcon className='size-4' />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align='end' className='w-48'>
                          <DropdownMenuItem onClick={() => handleOpenEdit(team)} className='gap-2 text-xs'>
                            <Edit3Icon className='size-3.5' />
                            Editar datos del equipo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMembers(team)} className='gap-2 text-xs'>
                            <UserPlusIcon className='size-3.5' />
                            Gestionar miembros
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteTeam(team)}
                            className='gap-2 text-xs text-destructive focus:text-destructive'
                          >
                            <Trash2Icon className='size-3.5' />
                            Eliminar equipo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {team.description && (
                      <p className='mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed'>
                        {team.description}
                      </p>
                    )}

                    {team.tags && team.tags.length > 0 && (
                      <div className='mt-2.5 flex flex-wrap gap-1'>
                        {team.tags.map(tag => (
                          <Badge key={tag} variant='outline' className='text-[10px] px-1.5 py-0 font-normal'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='mt-3.5 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleOpenMembers(team)}
                      className='h-7 -ml-2 px-2 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground font-normal'
                    >
                      <Badge variant='secondary' className='text-[10px] font-medium gap-1 px-1.5 py-0'>
                        <UsersIcon className='size-2.5' />
                        {team.memberCount}
                      </Badge>
                      Gestionar miembros
                    </Button>

                    <span className='inline-flex items-center gap-1 text-[11px]'>
                      <CalendarIcon className='size-3 opacity-70' />
                      {new Date(team.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Team Dialog */}
      <EditTeamDialog
        team={selectedTeamForEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTeamUpdated={fetchTeams}
      />

      {/* Manage Members Dialog */}
      <ManageTeamMembersDialog
        teamId={selectedTeamForMembers?.id || null}
        teamName={selectedTeamForMembers?.name || ''}
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        onMembersUpdated={fetchTeams}
      />
    </div>
  )
}

export default WorkspaceTeams
