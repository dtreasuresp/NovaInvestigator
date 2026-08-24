'use client'

import { useMemo, useState } from 'react'

import { CheckIcon, LockKeyholeIcon, SaveIcon, ShieldAlertIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type { TenantRoleAdminSummary, UnifiedPermissionMatrix } from '@/features/users/types'
import { useI18n } from '@/hooks/use-i18n'

interface PermissionsViewProps {
  initialMatrix: UnifiedPermissionMatrix
}

interface ApiErrorBody {
  error?: {
    code?: string
  }
}

async function readApiError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null

  if (body?.error?.code === 'VERSION_CONFLICT') {
    return new Error('Los permisos cambiaron en otra sesión. Recarga la página antes de guardar.')
  }

  if (body?.error?.code === 'CAPABILITY_NOT_ASSIGNABLE') {
    return new Error('No puedes conceder capacidades que tu sesión no posee.')
  }

  if (body?.error?.code === 'INVALID_TRANSITION') {
    return new Error('No puedes modificar las capacidades del rol de tu propia sesión.')
  }

  return new Error('No se pudo actualizar la matriz de permisos.')
}

const PermissionsView = ({ initialMatrix }: PermissionsViewProps) => {
  const { t } = useI18n()

  const roleScopeLabel = (role: TenantRoleAdminSummary): string => {
    if (role.scope === 'platform') {
      return t('roles.scopePlatform')
    }

    if (role.scope === 'global_tenant') {
      return t('roles.scopeGlobalTenant')
    }

    return role.tenantName ?? t('roles.scopeTenant')
  }

  const [matrix, setMatrix] = useState(initialMatrix)
  const [selectedRoleId, setSelectedRoleId] = useState(initialMatrix.roles[0]?.id ?? '')

  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(() => {
    const initialRoleId = initialMatrix.roles[0]?.id ?? ''

    return initialMatrix.assignments
      .filter(assignment => assignment.roleId === initialRoleId)
      .map(assignment => assignment.capabilityKey)
  })

  const [saving, setSaving] = useState(false)

  const selectedRole = matrix.roles.find(role => role.id === selectedRoleId) ?? null
  const selectedCapabilitySet = useMemo(() => new Set(selectedCapabilities), [selectedCapabilities])

  const canManageSelectedRole =
    selectedRole?.scope === 'platform'
      ? matrix.canManageCapabilities
      : selectedRole?.scope === 'global_tenant'
        ? matrix.canManageCapabilities || matrix.canManageGlobalRoles
        : matrix.canManageCapabilities || matrix.canManageTenantRoles

  const visibleCapabilities = useMemo(() => {
    if (!selectedRole) {
      return []
    }

    return matrix.capabilities.filter(capability =>
      selectedRole.scope === 'platform'
        ? isPlatformCapabilityKey(capability.key)
        : !isPlatformCapabilityKey(capability.key)
    )
  }, [matrix.capabilities, selectedRole])

  const groupedCapabilities = useMemo(() => {
    return visibleCapabilities.reduce<Record<string, typeof visibleCapabilities>>((groups, capability) => {
      groups[capability.resource] = [...(groups[capability.resource] ?? []), capability]

      return groups
    }, {})
  }, [visibleCapabilities])

  const selectRole = (roleId: string) => {
    setSelectedRoleId(roleId)
    setSelectedCapabilities(
      matrix.assignments.filter(assignment => assignment.roleId === roleId).map(assignment => assignment.capabilityKey)
    )
  }

  const toggleCapability = (capabilityKey: string, checked: boolean) => {
    setSelectedCapabilities(current => {
      if (checked) {
        return current.includes(capabilityKey) ? current : [...current, capabilityKey]
      }

      return current.filter(key => key !== capabilityKey)
    })
  }

  const savePermissions = async () => {
    if (!selectedRole || !canManageSelectedRole || !selectedRole.isActive) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: selectedRole.scope,
          capabilityKeys: selectedCapabilities,
          updatedAt: selectedRole.updatedAt
        })
      })

      if (!response.ok) {
        throw await readApiError(response)
      }

      const nextMatrix = (await response.json()) as UnifiedPermissionMatrix

      setMatrix(nextMatrix)
      setSelectedCapabilities(
        nextMatrix.assignments
          .filter(assignment => assignment.roleId === selectedRole.id)
          .map(assignment => assignment.capabilityKey)
      )
      toast.success('Permisos actualizados.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la matriz.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-end'>
        <div>
          <p className='text-muted-foreground text-sm'>{t('permissions.kicker')}</p>
          <h1 className='font-heading text-2xl font-semibold tracking-tight'>{t('permissions.title')}</h1>
          <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
            {t('permissions.description')}
          </p>
        </div>
        {matrix.canManageRoles || matrix.canManageCapabilities ? (
          <Button
            disabled={!selectedRole || !canManageSelectedRole || !selectedRole.isActive || saving}
            onClick={() => void savePermissions()}
          >
            <SaveIcon />
            {t('permissions.savePermissions')}
          </Button>
        ) : (
          <Badge variant='secondary'>{t('common.readOnlyMode')}</Badge>
        )}
      </div>

      <div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
        <Card className='h-fit'>
          <CardHeader>
            <CardTitle>{t('permissions.rolesTitle')}</CardTitle>
            <CardDescription>
              {t('permissions.rolesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-1'>
            {matrix.roles.map(role => (
              <button
                className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  selectedRoleId === role.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                key={`${role.scope}-${role.id}`}
                onClick={() => selectRole(role.id)}
                type='button'
              >
                <span className='min-w-0'>
                  <span className='block truncate'>{role.name}</span>
                  <span className='block truncate text-xs opacity-70'>{roleScopeLabel(role)}</span>
                </span>
                <span className='ml-2 text-xs opacity-70'>{role.capabilityCount}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <CardTitle>{selectedRole?.name ?? '—'}</CardTitle>
                <CardDescription>
                  {selectedRole
                    ? canManageSelectedRole
                      ? t('permissions.selectCapabilitiesPrompt')
                      : 'Solo lectura para este ámbito.'
                    : t('permissions.rolesDesc')}
                </CardDescription>
              </div>
              {selectedRole?.isSystem ? (
                <Badge variant='secondary'>
                  <LockKeyholeIcon />
                  {t('permissions.system')}
                </Badge>
              ) : (
                <Badge variant={selectedRole?.isActive ? 'default' : 'secondary'}>
                  {selectedRole?.isActive ? t('permissions.custom') : t('roles.inactive')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className='grid gap-6'>
            {Object.entries(groupedCapabilities).map(([resource, capabilities]) => (
              <section className='grid gap-3' key={resource}>
                <div className='flex items-center justify-between border-b pb-2'>
                  <h2 className='text-sm font-semibold capitalize'>{resource}</h2>
                  <span className='text-muted-foreground text-xs'>
                    {t('permissions.capabilityCount', { count: capabilities.length })}
                  </span>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  {capabilities.map(capability => {
                    const checked = selectedCapabilitySet.has(capability.key)

                    return (
                      <label className='flex items-start gap-3 rounded-md border p-3' key={capability.key}>
                        <Checkbox
                          checked={checked}
                          disabled={!canManageSelectedRole || !selectedRole?.isActive || saving}
                          onCheckedChange={value => toggleCapability(capability.key, value === true)}
                        />
                        <span className='grid gap-1'>
                          <span className='font-medium'>{capability.action}</span>
                          <span className='text-muted-foreground text-xs'>{capability.description}</span>
                          <code className='text-muted-foreground text-[11px]'>{capability.key}</code>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}
            {selectedRole && visibleCapabilities.length === 0 && (
              <p className='text-muted-foreground text-sm'>{t('roles.noCapabilitiesInScope') || 'No hay capacidades activas para este ámbito.'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('roles.overridesTitle') || 'Overrides por miembro'}</CardTitle>
          <CardDescription>
            {t('roles.overridesDesc') || 'Un override individual prevalece sobre la capacidad heredada del rol: deny tiene prioridad sobre allow.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrix.overrides.length === 0 ? (
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <ShieldAlertIcon className='size-4' />
              {t('roles.noOverrides') || 'No hay overrides configurados en el ámbito visible.'}
            </div>
          ) : (
            <div className='grid gap-2'>
              {matrix.overrides.map(override => (
                <div
                  className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm'
                  key={`${override.membershipId}-${override.capabilityKey}`}
                >
                  <div className='grid gap-1'>
                    <span className='font-medium'>{override.capabilityKey}</span>
                    <span className='text-muted-foreground text-xs'>Membership {override.membershipId}</span>
                  </div>
                  <Badge variant={override.effect === 'allow' ? 'default' : 'destructive'}>
                    {override.effect === 'allow' ? <CheckIcon /> : <XIcon />}
                    {override.effect}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PermissionsView
