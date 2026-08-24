'use client'

import { useEffect, useState } from 'react'

import { Building2Icon, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/hooks/use-i18n'

interface OrganizationOption {
  id: string
  name: string
  slug: string
}

interface OrganizationSelectionResponse {
  primaryTenantId: string | null
  items: OrganizationOption[]
  error?: {
    messageKey?: string
  }
}

const PrimaryOrganization = () => {
  const { t } = useI18n()
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadPrimaryOrganization = async () => {
      try {
        const response = await fetch('/api/user/primary-tenant')
        const data = (await response.json()) as OrganizationSelectionResponse

        if (!response.ok) {
          throw new Error('No se pudo cargar la organización predeterminada.')
        }

        if (isMounted) {
          setOrganizations(data.items ?? [])
          setSelectedOrganizationId(data.primaryTenantId)
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'No se pudo cargar la organización predeterminada.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadPrimaryOrganization()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectPrimaryOrganization = async (nextTenantId: string) => {
    if (nextTenantId === selectedOrganizationId || saving) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/user/primary-tenant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ primaryTenantId: nextTenantId })
      })

      const data = (await response.json()) as { error?: { messageKey?: string } }

      if (!response.ok) {
        throw new Error('No se pudo actualizar la organización predeterminada.')
      }

      setSelectedOrganizationId(nextTenantId)
      toast.success('Organización predeterminada actualizada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la organización predeterminada.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='mb-10'>
        <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
          <div className='flex flex-col space-y-1'>
            <h3 className='text-base font-semibold'>{t('userSettings.defaultOrganization')}</h3>
            <p className='text-muted-foreground text-sm'>{t('userSettings.defaultOrganizationDesc')}</p>
          </div>
          <div className='space-y-3 lg:col-span-2'>
            <Card>
              <CardContent className='py-6'>
                <div className='bg-muted h-10 animate-pulse rounded' />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const activeOrg = organizations.find(org => org.id === selectedOrganizationId) ?? organizations[0]

  if (organizations.length <= 1) {
    return (
      <div className='mb-10'>
        <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
          <div className='flex flex-col space-y-1'>
            <h3 className='text-base font-semibold'>{t('userSettings.defaultOrganization')}</h3>
            <p className='text-muted-foreground text-sm'>
              {t('userSettings.defaultOrganizationDesc')}
            </p>
          </div>
          <div className='space-y-3 lg:col-span-2'>
            <Card>
              <CardContent className='flex items-center justify-between py-4'>
                <div className='flex items-center gap-3'>
                  <Building2Icon className='text-primary size-5' aria-hidden='true' />
                  <div>
                    <p className='font-semibold'>{activeOrg?.name ?? 'DGTECNOVA'}</p>
                    <p className='text-muted-foreground text-xs font-mono'>{activeOrg?.slug ?? 'dgtecnova'}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='inline-block size-2 rounded-full bg-green-500' />
                  <span className='text-muted-foreground text-xs font-medium'>{t('roles.scopeTenant')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mb-10'>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.defaultOrganization')}</h3>
          <p className='text-muted-foreground text-sm'>
            {t('userSettings.defaultOrganizationDesc')}
          </p>
        </div>
        <div className='space-y-3 lg:col-span-2'>
          <Card>
            <CardContent className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Building2Icon className='text-muted-foreground size-4' aria-hidden='true' />
                <Label htmlFor='primary-organization'>{t('nav.organizations')}</Label>
              </div>
              <Select
                value={selectedOrganizationId ?? undefined}
                onValueChange={value => {
                  if (value) void handleSelectPrimaryOrganization(value)
                }}
                disabled={saving}
              >
                <SelectTrigger id='primary-organization' className='w-full'>
                  <SelectValue placeholder={t('userSettings.defaultOrganization')} />
                  {saving ? <LoaderCircleIcon className='size-4 animate-spin' aria-hidden='true' /> : null}
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(organization => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PrimaryOrganization
