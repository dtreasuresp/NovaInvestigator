'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// Third-party Imports
import {
  CalendarIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon
} from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BillingPurchasePolicy } from '@/features/billing/schema'
import { useI18n } from '@/hooks/use-i18n'

interface PurchaseDelegationSectionProps {
  loading?: boolean
}

interface DelegatedMemberItem {
  id: string
  workspaceId: string
  userId: string
  grantedBy: string
  status: string
  createdAt: string
  updatedAt: string
  displayName: string
  avatarUrl: string | null
  email: string | null
}

interface AvailableMemberItem {
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string | null
}

const POLICY_LABELS: Record<BillingPurchasePolicy, string> = {
  owner_only: 'Solo Propietario del Espacio (Por defecto)',
  approved_members: 'Propietario y Miembros Delegados Específicos',
  all_active_members: 'Todos los Miembros Activos del Espacio'
}

export function PurchaseDelegationSection({ loading }: PurchaseDelegationSectionProps) {
  const { t } = useI18n()
  const [policy, setPolicy] = useState<BillingPurchasePolicy>('owner_only')
  const [canManage, setCanManage] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  // Delegations State
  const [delegations, setDelegations] = useState<DelegatedMemberItem[]>([])
  const [availableMembers, setAvailableMembers] = useState<AvailableMemberItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loadingDelegations, setLoadingDelegations] = useState(false)
  const [granting, setGranting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // 1. Fetch delegations when policy is approved_members
  const fetchDelegations = useCallback(async (targetWorkspaceId?: string | null) => {
    let wsId = targetWorkspaceId ?? workspaceId

    if (!wsId) {
      try {
        const wsRes = await fetch('/api/workspace', { cache: 'no-store' })

        if (wsRes.ok) {
          const wsData = (await wsRes.json()) as { ok?: boolean; workspace?: { id: string } }

          if (wsData.workspace?.id) {
            wsId = wsData.workspace.id
            setWorkspaceId(wsId)
          }
        }
      } catch {}
    }

    if (!wsId) return

    setLoadingDelegations(true)

    try {
      const res = await fetch(`/api/billing/purchase-delegations?workspaceId=${wsId}`, {
        cache: 'no-store'
      })

      if (!res.ok) return

      const payload = (await res.json()) as {
        items?: DelegatedMemberItem[]
        availableMembers?: AvailableMemberItem[]
      }

      if (payload.items) {
        setDelegations(payload.items.filter(d => d.status === 'active'))
      }

      if (payload.availableMembers) {
        setAvailableMembers(payload.availableMembers)
      }
    } catch {
      toast.error('No se pudieron consultar las delegaciones de compra.')
    } finally {
      setLoadingDelegations(false)
    }
  }, [workspaceId])

  // 2. Fetch initial workspace & purchase policy
  useEffect(() => {
    let active = true

    Promise.all([
      fetch('/api/workspace', { cache: 'no-store' })
        .then(async res => {
          if (!res.ok) return null
          const data = (await res.json()) as { ok?: boolean; workspace?: { id: string } }

          return data.workspace?.id ?? null
        })
        .catch(() => null),
      fetch('/api/billing/purchase-policy', { cache: 'no-store' })
        .then(async res => {
          if (!res.ok) return null
          
          return (await res.json()) as {
            tenantId?: string
            policy?: BillingPurchasePolicy
            canManage?: boolean
          }
        })
        .catch(() => null)
    ])
      .then(([wId, pData]) => {
        if (!active) return
        if (wId) setWorkspaceId(wId)
        if (pData?.policy) setPolicy(pData.policy)
        if (typeof pData?.canManage === 'boolean') setCanManage(pData.canManage)

        if (pData?.policy === 'approved_members') {
          void fetchDelegations(wId)
        }
      })
      .finally(() => {
        if (active) setFetching(false)
      })

    return () => {
      active = false
    }
  }, [fetchDelegations])

  useEffect(() => {
    if (policy === 'approved_members') {
      void fetchDelegations(workspaceId)
    }
  }, [policy, workspaceId, fetchDelegations])

  // 3. Change policy
  const handlePolicyChange = async (newPolicy: BillingPurchasePolicy | null) => {
    if (!newPolicy || newPolicy === policy) return

    const prevPolicy = policy

    setPolicy(newPolicy)
    setSaving(true)

    try {
      const response = await fetch('/api/billing/purchase-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: newPolicy })
      })

      if (!response.ok) {
        setPolicy(prevPolicy)
        const errData = (await response.json().catch(() => null)) as { error?: { message?: string } } | null

        toast.error(errData?.error?.message ?? 'Error al actualizar la política de compra.')

        return
      }

      toast.success('Política de compras actualizada exitosamente.')

      if (newPolicy === 'approved_members' && workspaceId) {
        void fetchDelegations()
      }
    } catch {
      setPolicy(prevPolicy)
      toast.error('Error de conexión al actualizar la política.')
    } finally {
      setSaving(false)
    }
  }

  // 4. Grant delegation
  const handleGrantDelegation = async () => {
    if (!workspaceId || !selectedUserId) return

    setGranting(true)

    try {
      const res = await fetch('/api/billing/purchase-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, userId: selectedUserId })
      })

      const payload = (await res.json()) as { error?: { message?: string } }

      if (!res.ok) {
        toast.error(payload.error?.message || 'No se pudo otorgar el permiso de compra.')

        return
      }

      toast.success('Permiso de compra delegado con éxito.')
      setSelectedUserId('')
      void fetchDelegations()
    } catch {
      toast.error('Error de conexión al delegar permiso.')
    } finally {
      setGranting(false)
    }
  }

  // 5. Revoke delegation
  const handleRevokeDelegation = async (delegationId: string, memberName: string) => {
    setRevokingId(delegationId)

    try {
      const res = await fetch(`/api/billing/purchase-delegations/${delegationId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        toast.error('No se pudo revocar la delegación.')

        return
      }

      toast.success(`Permiso de compra revocado para "${memberName}".`)
      void fetchDelegations()
    } catch {
      toast.error('Error de conexión al revocar la delegación.')
    } finally {
      setRevokingId(null)
    }
  }

  const isDisabled = loading || fetching || saving || !canManage
  const selectedUserObj = availableMembers.find(u => u.userId === selectedUserId)

  return (
    <div className='mb-10'>
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.purchaseDelegationTitle')}</h3>
          <p className='text-muted-foreground text-sm'>
            Configure organization-wide rules for subscription purchases and billing management.
          </p>
        </div>
        <div className='space-y-3 lg:col-span-2'>
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <ShieldCheckIcon className='size-5 text-primary' />
                <CardTitle className='text-base font-semibold'>{t('userSettings.purchasingPolicy')}</CardTitle>
              </div>
              <CardDescription>
                Define which workspace members are authorized to initiate plan purchases, upgrades, and billing changes.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {loading || fetching ? (
                <div className='bg-muted h-16 animate-pulse rounded' />
              ) : (
                <div className='space-y-3'>
                  <div className='flex flex-col items-start gap-2'>
                    <Label htmlFor='purchase-policy-select'>{t('userSettings.whoCanPurchase')}</Label>
                    <Select value={policy} onValueChange={handlePolicyChange} disabled={isDisabled}>
                      <SelectTrigger id='purchase-policy-select' className='w-full'>
                        <SelectValue placeholder={t('common.select')}>
                          {val => (val ? POLICY_LABELS[val as BillingPurchasePolicy] ?? val : t('common.select'))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent side='bottom' align='start' alignItemWithTrigger={false}>
                        <SelectItem value='owner_only'>
                          <div className='flex items-center gap-2'>
                            <ShieldCheckIcon className='size-4 text-muted-foreground' />
                            <span>{t('userSettings.policyOwnerOnly')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value='approved_members'>
                          <div className='flex items-center gap-2'>
                            <UserCheckIcon className='size-4 text-muted-foreground' />
                            <span>{t('userSettings.policyDelegated')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value='all_active_members'>
                          <div className='flex items-center gap-2'>
                            <UsersIcon className='size-4 text-muted-foreground' />
                            <span>{t('userSettings.policyAllMembers')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className='text-muted-foreground text-xs'>
                    {!canManage ? (
                      <span className='text-amber-500 font-medium'>
                        ⚠️ Only workspace owners can modify the purchasing capability policy.
                      </span>
                    ) : policy === 'owner_only' ? (
                      'Only the primary workspace owner can initiate checkout sessions and access the Stripe Billing portal.'
                    ) : policy === 'approved_members' ? (
                      'The owner and members explicitly delegated with purchasing capability can buy subscriptions.'
                    ) : (
                      'Any active member of this organization can initiate plan upgrades.'
                    )}
                  </p>

                  {/* Delegated Members Interactive Management (When policy === 'approved_members') */}
                  {policy === 'approved_members' && (
                    <div className='mt-4 pt-4 border-t space-y-3'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <h4 className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                            <UserCheckIcon className='size-3.5 text-primary' />
                            Colaboradores con Permiso Delegado de Compra
                          </h4>
                          <p className='text-[11px] text-muted-foreground'>
                            Los siguientes miembros están autorizados para renovar o comprar licencias.
                          </p>
                        </div>
                        <Badge variant='outline' className='text-[10px] px-2 py-0'>
                          {delegations.length} {delegations.length === 1 ? 'delegado' : 'delegados'}
                        </Badge>
                      </div>

                      {/* Add Delegation Form (Only for Owners) */}
                      {canManage && (
                        <div className='rounded-lg border bg-muted/20 p-3 space-y-2'>
                          <span className='text-xs font-medium text-foreground'>
                            Autorizar a otro colaborador:
                          </span>
                          <div className='grid grid-cols-1 sm:grid-cols-12 gap-2 items-center'>
                            <div className='sm:col-span-8'>
                              <Select
                                value={selectedUserId}
                                onValueChange={v => setSelectedUserId(v || '')}
                                disabled={granting || availableMembers.length === 0}
                              >
                                <SelectTrigger className='h-9 w-full text-xs px-2.5 bg-background'>
                                  {selectedUserObj ? (
                                    <div className='flex items-center gap-2 truncate flex-1 text-left'>
                                      <Avatar className='size-5 rounded-full shrink-0 border'>
                                        {selectedUserObj.avatarUrl ? (
                                          <AvatarImage src={selectedUserObj.avatarUrl} />
                                        ) : null}
                                        <AvatarFallback className='text-[9px] bg-primary/10 text-primary font-semibold'>
                                          {selectedUserObj.displayName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className='truncate font-medium text-foreground'>
                                        {selectedUserObj.displayName}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className='text-muted-foreground flex-1 text-left truncate'>
                                      {availableMembers.length === 0
                                        ? 'No hay más miembros disponibles'
                                        : 'Seleccionar colaborador...'}
                                    </span>
                                  )}
                                </SelectTrigger>
                                <SelectContent side='bottom' align='start' alignItemWithTrigger={false} className='w-(--anchor-width) min-w-[var(--anchor-width)] max-h-56'>
                                  {availableMembers.length === 0 ? (
                                    <div className='p-3 text-center text-xs text-muted-foreground'>
                                      No hay más colaboradores disponibles
                                    </div>
                                  ) : (
                                    availableMembers.map(user => (
                                      <SelectItem key={user.userId} value={user.userId} className='text-xs py-2'>
                                        <div className='flex items-center gap-2.5'>
                                          <Avatar className='size-6 rounded-full border shrink-0'>
                                            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                                            <AvatarFallback className='text-[10px] bg-primary/10 text-primary font-semibold'>
                                              {user.displayName.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className='truncate text-left'>
                                            <p className='truncate font-medium'>{user.displayName}</p>
                                            {user.email && (
                                              <p className='truncate text-[10px] text-muted-foreground'>{user.email}</p>
                                            )}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className='sm:col-span-4'>
                              <Button
                                size='sm'
                                className='h-9 w-full gap-1.5 text-xs font-medium'
                                onClick={handleGrantDelegation}
                                disabled={granting || !selectedUserId}
                              >
                                {granting ? (
                                  <Loader2Icon className='size-3.5 animate-spin' />
                                ) : (
                                  <PlusIcon className='size-3.5' />
                                )}
                                Delegar Permiso
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delegations List */}
                      <div className='space-y-2 pt-1'>
                        {loadingDelegations ? (
                          <div className='flex items-center justify-center p-6'>
                            <Loader2Icon className='size-5 animate-spin text-primary' />
                          </div>
                        ) : delegations.length === 0 ? (
                          <div className='rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground'>
                            No hay colaboradores delegados actualmente. Solo el propietario puede realizar compras.
                          </div>
                        ) : (
                          <div className='space-y-1.5'>
                            {delegations.map(member => (
                              <div
                                key={member.id}
                                className='flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/30'
                              >
                                <div className='flex items-center gap-2.5 min-w-0'>
                                  <Avatar className='size-8 rounded-md border shrink-0'>
                                    {member.avatarUrl ? (
                                      <AvatarImage src={member.avatarUrl} alt={member.displayName} />
                                    ) : null}
                                    <AvatarFallback className='rounded-md text-xs font-semibold bg-primary/10 text-primary'>
                                      {member.displayName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className='truncate min-w-0'>
                                    <div className='flex items-center gap-1.5'>
                                      <p className='truncate text-xs font-medium text-foreground'>
                                        {member.displayName}
                                      </p>
                                      <Badge
                                        variant='secondary'
                                        className='text-[9px] px-1.5 py-0 font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      >
                                        Autorizado
                                      </Badge>
                                    </div>
                                    <span className='inline-flex items-center gap-1 text-[10px] text-muted-foreground'>
                                      <CalendarIcon className='size-2.5 opacity-70' />
                                      Delegado: {new Date(member.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                {canManage && (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1'
                                    onClick={() => handleRevokeDelegation(member.id, member.displayName)}
                                    disabled={revokingId === member.id}
                                    title={t('userSettings.revokeDelegation') || 'Revocar delegación'}
                                  >
                                    {revokingId === member.id ? (
                                      <Loader2Icon className='size-3 animate-spin' />
                                    ) : (
                                      <Trash2Icon className='size-3.5' />
                                    )}
                                    {t('invitations.revoke') || 'Revocar'}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
