'use client'

import { useMemo, useState } from 'react'

import { PencilIcon, PlusIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { AccessRoleScope, UnifiedPermissionMatrix, TenantRoleAdminSummary } from '@/features/users/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/hooks/use-i18n'

interface RolesViewProps {
  initialMatrix: UnifiedPermissionMatrix
}

interface ApiErrorBody {
  error?: {
    code?: string
  }
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' })

async function readApiError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  const code = body?.error?.code

  if (code === 'VERSION_CONFLICT') {
    return new Error('Los datos cambiaron en otra sesión. Recarga la página antes de guardar.')
  }

  if (code === 'ROLE_KEY_CONFLICT') {
    return new Error('Ya existe un rol con esa clave en el ámbito seleccionado.')
  }

  if (code === 'LAST_OWNER_PROTECTED' || code === 'INVALID_TRANSITION') {
    return new Error('La operación está protegida para evitar perder el último administrador.')
  }

  return new Error('No se pudo completar la operación.')
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

const RolesView = ({ initialMatrix }: RolesViewProps) => {
  const { t } = useI18n()

  const scopeLabel = (scope: AccessRoleScope): string => {
    if (scope === 'platform') {
      return t('roles.scopePlatform')
    }

    if (scope === 'global_tenant') {
      return t('roles.scopeGlobalTenant')
    }

    return t('roles.scopeTenant')
  }
  const [matrix, setMatrix] = useState(initialMatrix)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState<TenantRoleAdminSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [newScope, setNewScope] = useState<AccessRoleScope>(
    initialMatrix.canManagePlatformRoles
      ? 'platform'
      : initialMatrix.canManageGlobalRoles
        ? 'global_tenant'
        : 'tenant'
  )
  const [newTenantId, setNewTenantId] = useState(initialMatrix.tenants?.[0]?.id ?? '')
  const [newKey, setNewKey] = useState('')
  const [newName, setNewName] = useState('')
  const [editName, setEditName] = useState('')

  const tenants = useMemo(() => {
    const existing = matrix.tenants ?? []
    const fromRoles = matrix.roles
      .filter(role => role.tenantId && role.tenantName)
      .map(role => ({ id: role.tenantId as string, name: role.tenantName as string }))
    const byId = new Map([...existing, ...fromRoles].map(tenant => [tenant.id, tenant]))

    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [matrix.roles, matrix.tenants])

  const activeRoles = matrix.roles.filter(role => role.isActive)
  const customRoles = matrix.roles.filter(role => !role.isSystem)

  const canManageRole = (role: TenantRoleAdminSummary): boolean => {
    if (role.scope === 'platform') {
      return matrix.canManagePlatformRoles
    }

    if (role.scope === 'global_tenant') {
      return matrix.canManageGlobalRoles
    }

    return matrix.canManageTenantRoles
  }

  const canCreateScope = (scope: AccessRoleScope): boolean => {
    if (scope === 'platform') {
      return matrix.canManagePlatformRoles
    }

    if (scope === 'global_tenant') {
      return matrix.canManageGlobalRoles
    }

    return matrix.canManageTenantRoles && tenants.length > 0
  }

  const resetCreate = () => {
    setNewKey('')
    setNewName('')
    setCreateOpen(false)
  }

  const openCreate = () => {
    const defaultScope = matrix.canManagePlatformRoles
      ? 'platform'
      : matrix.canManageGlobalRoles
        ? 'global_tenant'
        : 'tenant'

    setNewScope(defaultScope)
    setNewTenantId(tenants[0]?.id ?? '')
    setCreateOpen(true)
  }

  const applyMatrix = (nextMatrix: UnifiedPermissionMatrix) => {
    setMatrix(nextMatrix)
    setEditRole(current => (current ? nextMatrix.roles.find(role => role.id === current.id) ?? null : null))
  }

  const handleCreate = async () => {
    if (!canCreateScope(newScope) || (newScope === 'tenant' && !newTenantId)) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: newScope,
          tenantId: newScope === 'tenant' ? newTenantId : null,
          key: newKey,
          name: newName
        })
      })

      if (!response.ok) {
        throw await readApiError(response)
      }

      applyMatrix((await response.json()) as UnifiedPermissionMatrix)
      resetCreate()
      toast.success('Rol creado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el rol.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (role: TenantRoleAdminSummary) => {
    setEditRole(role)
    setEditName(role.name)
  }

  const handleEdit = async () => {
    if (!editRole || !canManageRole(editRole)) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/roles/${editRole.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: editRole.scope,
          name: editName,
          updatedAt: editRole.updatedAt
        })
      })

      if (!response.ok) {
        throw await readApiError(response)
      }

      applyMatrix((await response.json()) as UnifiedPermissionMatrix)
      toast.success('Rol actualizado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el rol.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (role: TenantRoleAdminSummary) => {
    if (!canManageRole(role)) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: role.scope,
          isActive: !role.isActive,
          updatedAt: role.updatedAt
        })
      })

      if (!response.ok) {
        throw await readApiError(response)
      }

      applyMatrix((await response.json()) as UnifiedPermissionMatrix)
      toast.success(role.isActive ? 'Rol desactivado.' : 'Rol activado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado del rol.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-end'>
        <div>
          <p className='text-muted-foreground text-sm'>{t('roles.kicker')}</p>
          <h1 className='font-heading text-2xl font-semibold tracking-tight'>{t('roles.title')}</h1>
          <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
            {t('roles.description')}
          </p>
        </div>
        {matrix.canManageRoles ? (
          <Button onClick={openCreate}>
            <PlusIcon />
            {t('roles.createRole')}
          </Button>
        ) : (
          <Badge variant='secondary'>{t('common.readOnlyMode')}</Badge>
        )}
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <Card size='sm'>
          <CardHeader>
            <CardDescription>{t('roles.totalRoles')}</CardDescription>
            <CardTitle className='text-2xl'>{matrix.roles.length}</CardTitle>
            <CardAction>
              <ShieldCheckIcon className='text-muted-foreground size-5' />
            </CardAction>
          </CardHeader>
        </Card>
        <Card size='sm'>
          <CardHeader>
            <CardDescription>{t('roles.activeRoles')}</CardDescription>
            <CardTitle className='text-2xl'>{activeRoles.length}</CardTitle>
            <CardAction>
              <ShieldCheckIcon className='size-5 text-emerald-600' />
            </CardAction>
          </CardHeader>
        </Card>
        <Card size='sm'>
          <CardHeader>
            <CardDescription>{t('roles.customRoles')}</CardDescription>
            <CardTitle className='text-2xl'>{customRoles.length}</CardTitle>
            <CardAction>
              <UsersIcon className='text-muted-foreground size-5' />
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      <Card className='py-0'>
        <CardHeader className='border-b'>
          <CardTitle>{t('roles.allRolesTitle')}</CardTitle>
          <CardDescription>{t('roles.allRolesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roles.colRole')}</TableHead>
                <TableHead>{t('roles.colScope')}</TableHead>
                <TableHead>{t('roles.colTenant')}</TableHead>
                <TableHead>{t('roles.colMembers')}</TableHead>
                <TableHead>{t('roles.colCapabilities')}</TableHead>
                <TableHead>{t('roles.colStatus')}</TableHead>
                <TableHead className='text-right'>{t('roles.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.roles.map(role => (
                <TableRow key={`${role.scope}-${role.id}`}>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{role.name}</span>
                      <span className='text-muted-foreground text-xs'>
                        {role.isSystem ? t('roles.systemRole') : `${t('common.details')} ${formatDate(role.createdAt)}`}
                      </span>
                      <code className='text-muted-foreground text-xs'>{role.key}</code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{scopeLabel(role.scope)}</Badge>
                  </TableCell>
                  <TableCell>{role.tenantName ?? t('common.all')}</TableCell>
                  <TableCell>{role.memberCount}</TableCell>
                  <TableCell>{role.capabilityCount}</TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? 'default' : 'secondary'}>
                      {role.isActive ? t('roles.active') : t('roles.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-2'>
                      {canManageRole(role) && (
                        <>
                          <Button
                            aria-label={`${t('common.edit')} ${role.name}`}
                            disabled={saving}
                            onClick={() => openEdit(role)}
                            size='icon-sm'
                            variant='ghost'
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            disabled={saving || (role.isActive && role.memberCount > 0)}
                            onClick={() => void handleToggle(role)}
                            size='sm'
                            variant='outline'
                          >
                            {role.isActive ? t('roles.deactivate') : t('roles.activate')}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {matrix.canManageRoles && (
        <>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('roles.createRole')}</DialogTitle>
                <DialogDescription>
                  El rol se crea sin capacidades. Asígnalas después desde la pantalla Permissions.
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4'>
                <label className='grid gap-2 text-sm font-medium' htmlFor='role-scope'>
                  Ámbito
                  <select
                    className='border-input bg-background h-9 rounded-md border px-3 text-sm'
                    id='role-scope'
                    onChange={event => setNewScope(event.target.value as AccessRoleScope)}
                    value={newScope}
                  >
                    {matrix.canManagePlatformRoles && <option value='platform'>{t('roles.scopePlatform')}</option>}
                    {matrix.canManageGlobalRoles && <option value='global_tenant'>{t('roles.scopeGlobalTenant')}</option>}
                    {matrix.canManageTenantRoles && tenants.length > 0 && <option value='tenant'>{t('roles.scopeTenant')}</option>}
                  </select>
                </label>
                {newScope === 'tenant' && (
                  <label className='grid gap-2 text-sm font-medium' htmlFor='role-tenant'>
                    Tenant
                    <select
                      className='border-input bg-background h-9 rounded-md border px-3 text-sm'
                      id='role-tenant'
                      onChange={event => setNewTenantId(event.target.value)}
                      value={newTenantId}
                    >
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className='grid gap-2 text-sm font-medium' htmlFor='role-key'>
                  {t('roles.key') || 'Clave'}
                  <Input
                    id='role-key'
                    onChange={event => setNewKey(event.target.value.toLowerCase())}
                    placeholder={t('roles.keyPlaceholder') || 'analista_financiero'}
                    value={newKey}
                  />
                </label>
                <label className='grid gap-2 text-sm font-medium' htmlFor='role-name'>
                  {t('roles.name') || 'Nombre'}
                  <Input
                    id='role-name'
                    onChange={event => setNewName(event.target.value)}
                    placeholder={t('roles.namePlaceholder') || 'Analista financiero'}
                    value={newName}
                  />
                </label>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant='outline' />}>{t('invitations.cancel')}</DialogClose>
                <Button
                  disabled={
                    saving ||
                    !canCreateScope(newScope) ||
                    newKey.trim().length < 2 ||
                    newName.trim().length < 2 ||
                    (newScope === 'tenant' && !newTenantId)
                  }
                  onClick={() => void handleCreate()}
                >
                  {t('roles.createRole') || 'Crear rol'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editRole !== null} onOpenChange={open => !open && setEditRole(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('users.editRole')}</DialogTitle>
                <DialogDescription>{t('roles.editRoleDesc') || 'La clave y el ámbito son inmutables para no romper las membresías.'}</DialogDescription>
              </DialogHeader>
              <label className='grid gap-2 text-sm font-medium' htmlFor='edit-role-name'>
                {t('roles.name') || 'Nombre'}
                <Input id='edit-role-name' onChange={event => setEditName(event.target.value)} value={editName} />
              </label>
              <DialogFooter>
                <DialogClose render={<Button variant='outline' />}>{t('invitations.cancel')}</DialogClose>
                <Button disabled={saving || editName.trim().length < 2} onClick={() => void handleEdit()}>
                  {t('common.save') || 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default RolesView
