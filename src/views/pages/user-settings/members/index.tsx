'use client'

import { useState } from 'react'

import {
  EllipsisVerticalIcon,
  MailIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserXIcon
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUserApp } from '@/hooks/use-user-app'
import { getInitialsFromName } from '@/configs/mailConfig'
import { ManageMemberSheet } from '@/views/apps/users/dialogs/manage-member-sheet'
import { useI18n } from '@/hooks/use-i18n'

export default function WorkspaceMembersSettings() {
  const { t } = useI18n()
  const {
    paginatedUsers,
    loading,
    mutating,
    sheetMode,
    editingMember,
    handleOpenAddSheet,
    handleOpenEditSheet,
    handleCloseSheet,
    handleInviteMember,
    handleUpdateMemberRole,
    handleDisableMember,
    handleEnableMember,
    workspaces,
    workspacesLoading
  } = useUserApp()

  const [pendingInvites] = useState([
    { id: 'inv-1', email: 'chris.ford@example.com', role: 'Espectador', sentAt: '2 days ago' },
    { id: 'inv-2', email: 'alex.kim@example.com', role: 'Espectador', sentAt: '5 days ago' }
  ])

  return (
    <section className='py-3 space-y-10'>
      {/* Header with Title and Invite Member Button */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-xl font-semibold tracking-tight'>{t('userSettings.tabMembers')}</h3>
          <p className='text-muted-foreground text-sm'>
            Gestiona a los miembros de tu equipo y sus permisos en el espacio de trabajo.
          </p>
        </div>
        <Button onClick={handleOpenAddSheet} className='gap-2'>
          <PlusIcon className='size-4' />
          {t('userSettings.inviteMember')}
        </Button>
      </div>

      {/* Table 1: Miembros Activos */}
      <div className='space-y-3'>
        <Card className='gap-0 py-0'>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-6 space-y-3'>
                <div className='bg-muted h-12 animate-pulse rounded' />
                <div className='bg-muted h-12 animate-pulse rounded' />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-6'>{t('users.colUser')}</TableHead>
                    <TableHead>{t('users.colRole')}</TableHead>
                    <TableHead className='pr-6 text-right'>{t('users.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className='pl-6'>
                        <div className='flex items-center gap-3'>
                          <Avatar className='size-9'>
                            {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name} /> : null}
                            <AvatarFallback>{getInitialsFromName(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className='flex flex-col'>
                            <span className='font-medium text-sm'>{member.name}</span>
                            <span className='text-muted-foreground text-xs'>{member.email ?? '—'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='w-48'>
                          <Select
                            value={member.roleKey ?? 'viewer'}
                            onValueChange={(newRole: string | null) => {
                              if (newRole) {
                                void handleUpdateMemberRole(member, { roleKey: newRole })
                              }
                            }}
                            disabled={mutating || member.roleKey === 'owner'}
                          >
                            <SelectTrigger className='h-8 text-xs'>
                              <SelectValue placeholder={t('users.selectRole')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='owner'>{t('nav.administrationGroup')}</SelectItem>
                              <SelectItem value='admin'>{t('users.roleAdmin')}</SelectItem>
                              <SelectItem value='analyst'>{t('pricingPage.featCollaboratorsPerSpace')}</SelectItem>
                              <SelectItem value='viewer'>{t('roles.scopeTenant')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className='pr-6 text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                size='icon'
                                variant='ghost'
                                aria-label={t('users.colActions')}
                                disabled={mutating || member.roleKey === 'owner'}
                              />
                            }
                          >
                            <EllipsisVerticalIcon className='size-4' />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => handleOpenEditSheet(member.id)}>
                                <ShieldCheckIcon className='size-4' />
                                Editar rol
                              </DropdownMenuItem>
                              {member.status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => void handleEnableMember(member)}>
                                  <UserCheckIcon className='size-4' />
                                  Reactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  variant='destructive'
                                  onClick={() => void handleDisableMember(member)}
                                >
                                  <UserXIcon className='size-4' />
                                  Revocar acceso
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table 2: Invitaciones Pendientes */}
      <div className='space-y-3 pt-4'>
        <div className='flex flex-col space-y-1'>
          <h4 className='text-base font-semibold'>{t('invitations.pendingTitle')}</h4>
          <p className='text-muted-foreground text-sm'>
            {t('invitations.pendingDesc')}
          </p>
        </div>

        <Card className='gap-0 py-0'>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='pl-6'>{t('invitations.colEmail')}</TableHead>
                  <TableHead>{t('invitations.colRole')}</TableHead>
                  <TableHead className='pr-6 text-right'>{t('invitations.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map(invite => (
                  <TableRow key={invite.id}>
                    <TableCell className='pl-6'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='size-9'>
                          <AvatarFallback className='bg-muted text-xs'>@</AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col'>
                          <span className='font-medium text-sm'>{invite.email}</span>
                          <span className='text-muted-foreground text-xs'>Enviada hace {invite.sentAt}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className='font-normal text-xs'>
                        {invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className='pr-6 text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size='icon' variant='ghost' aria-label={t('invitations.colActions')} />}>
                          <EllipsisVerticalIcon className='size-4' />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <MailIcon className='size-4' />
                              {t('invitations.resend')}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant='destructive'>
                              <UserXIcon className='size-4' />
                              {t('invitations.cancel')}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ManageMemberSheet
        mode={sheetMode}
        member={editingMember}
        submitting={mutating}
        workspaces={workspaces}
        workspacesLoading={workspacesLoading}
        onClose={handleCloseSheet}
        onInvite={handleInviteMember}
        onUpdateRole={handleUpdateMemberRole}
      />
    </section>
  )
}
