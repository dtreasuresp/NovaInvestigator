'use client'

import { useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { PlusIcon, RefreshCwIcon, EditIcon, ShieldAlertIcon, XIcon } from 'lucide-react'

import type {
  AdminBillingAuditLog,
  AdminBillingInvoice,
  AdminPlanEntitlement,
  AdminPlanSummary,
  AdminPlatformModule,
  AdminSubscriptionSummary,
  AdminTenantEntitlement,
  AdminTrialPolicy,
  AdminTrialPolicyEntitlement
} from '@/features/billing/admin-service'
import type { BillingInterval } from '@/lib/billing/types'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrency } from '@/hooks/use-currency'
import { useI18n } from '@/hooks/use-i18n'
import { getEntitlementFullLabel } from '@/lib/billing/entitlementLabels'
import { getMinorExponent, majorToMinorUnits, minorToMajorUnits } from '@/lib/currency/iso4217'

import { cn } from '@/lib/utils'

import { toast } from 'sonner'

interface PlanFormState {
  code: string
  name: string
  description: string
  providerPriceId: string
  currency: string
  interval: BillingInterval
  durationType: 'lifetime' | 'temporary'
  durationHours: string
  amountMajor: string
  isActive: boolean
  isPublic: boolean
  contactSales: boolean
  entitlements: PlanEntitlementDraft[]
}

interface EntitlementDraft {
  limitValue: string
  isEnabled: boolean
}

interface PlanEntitlementDraft {
  entitlementKey: string
  limitValue: string
  isEnabled: boolean
}

interface KnownEntitlementOption {
  key: string
  label: string
  category: 'ai' | 'investigations' | 'users' | 'storage' | 'kanban' | 'modules'
  defaultLimit?: string
}

const KNOWN_ENTITLEMENT_CATALOG: readonly KnownEntitlementOption[] = [
  // NovAi — módulo independiente (ai.*)
  { key: 'modules.novai', label: 'Módulo NovAi (modules.novai)', category: 'ai', defaultLimit: '1' },
  { key: 'limits.ai_queries_monthly', label: 'Consultas IA mensuales (limits.ai_queries_monthly)', category: 'ai', defaultLimit: '50' },
  { key: 'limits.ai_queries_daily', label: 'Consultas IA diarias — tope 24h (limits.ai_queries_daily)', category: 'ai', defaultLimit: '10' },
  { key: 'actions.ai.chat', label: 'Chat NovAi (actions.ai.chat)', category: 'ai', defaultLimit: '1' },
  { key: 'actions.ai.free_chat', label: 'Chat Libre NovAi (actions.ai.free_chat)', category: 'ai', defaultLimit: '1' },
  { key: 'actions.ai.report', label: 'Reportes NovAi (actions.ai.report)', category: 'ai', defaultLimit: '1' },

  // Investigaciones & DAFO
  { key: 'investigations.max_active', label: 'Máx. Investigaciones activas (investigations.max_active)', category: 'investigations', defaultLimit: '10' },
  { key: 'investigations.export_pdf_monthly', label: 'Exportaciones PDF/mes (investigations.export_pdf_monthly)', category: 'investigations', defaultLimit: '50' },
  { key: 'modules.investigator', label: 'Módulo de Investigación (modules.investigator)', category: 'investigations', defaultLimit: '1' },
  { key: 'investigations.create', label: 'Creación de investigaciones (investigations.create)', category: 'investigations', defaultLimit: '1' },
  { key: 'investigations.export', label: 'Exportación de investigaciones (investigations.export)', category: 'investigations', defaultLimit: '1' },

  // Usuarios y Equipos
  { key: 'users.max_members', label: 'Máx. Miembros/Colaboradores (users.max_members)', category: 'users', defaultLimit: '5' },
  { key: 'teams.max_teams', label: 'Máx. Equipos/Teams (teams.max_teams)', category: 'users', defaultLimit: '3' },

  // Almacenamiento
  { key: 'storage.max_bytes', label: 'Almacenamiento (storage.max_bytes - 1GB = 1073741824)', category: 'storage', defaultLimit: '1073741824' },

  // Kanban & Tareas
  { key: 'kanban.projects_max', label: 'Máx. Proyectos Kanban (kanban.projects_max)', category: 'kanban', defaultLimit: '10' },
  { key: 'kanban.tasks_max', label: 'Máx. Tareas Kanban (kanban.tasks_max)', category: 'kanban', defaultLimit: '100' },
  { key: 'modules.kanban', label: 'Módulo Kanban (modules.kanban)', category: 'kanban', defaultLimit: '1' },

  // Módulos de Plataforma
  { key: 'modules.billing', label: 'Módulo de Facturación (modules.billing)', category: 'modules', defaultLimit: '1' },
  { key: 'modules.platform', label: 'Módulo de Plataforma (modules.platform)', category: 'modules', defaultLimit: '1' }
] as const

interface ModuleFormState {
  moduleKey: string
  name: string
  description: string
  routePrefix: string
  isActive: boolean
  displayOrder: number
}

export default function PlatformBillingView() {
  const { t } = useI18n()
  const { formatAmountMinor } = useCurrency()
  const [plans, setPlans] = useState<AdminPlanSummary[]>([])
  const [modules, setModules] = useState<AdminPlatformModule[]>([])
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionSummary[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminBillingAuditLog[]>([])
  const [entitlements, setEntitlements] = useState<AdminTenantEntitlement[]>([])
  const [invoices, setInvoices] = useState<AdminBillingInvoice[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [tenantIdInput, setTenantIdInput] = useState('')
  const [invoiceTenantFilter, setInvoiceTenantFilter] = useState('')
  const [entitlementDrafts, setEntitlementDrafts] = useState<Record<string, EntitlementDraft>>({})

  const [loading, setLoading] = useState(true)
  const [loadingEntitlements, setLoadingEntitlements] = useState(false)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<AdminPlanSummary | null>(null)
  const [selectedCatalogKey, setSelectedCatalogKey] = useState('')
  const [newPlanEntitlementKey, setNewPlanEntitlementKey] = useState('')
  const [newPlanEntitlementLimit, setNewPlanEntitlementLimit] = useState('')
  const [planEntitlementsPagination, setPlanEntitlementsPagination] = useState({ pageIndex: 0, pageSize: 5 })

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<AdminPlatformModule | null>(null)

  const [moduleForm, setModuleForm] = useState<ModuleFormState>({
    moduleKey: '',
    name: '',
    description: '',
    routePrefix: '/',
    isActive: true,
    displayOrder: 0
  })

  const [savingModule, setSavingModule] = useState(false)

  const [planForm, setPlanForm] = useState<PlanFormState>({
    code: '',
    name: '',
    description: '',
    providerPriceId: '',
    currency: 'USD',
    interval: 'month',
    durationType: 'lifetime',
    durationHours: '24',
    amountMajor: '0',
    isActive: true,
    isPublic: true,
    contactSales: false,
    entitlements: []
  })

  const [savingPlan, setSavingPlan] = useState(false)

  const [trialForm, setTrialForm] = useState({
    enabled: true,
    maxSessions: 1,
    allowGuest: true,
    allowCheckout: true
  })

  const [savingTrial, setSavingTrial] = useState(false)
  const [savingEntitlementKey, setSavingEntitlementKey] = useState<string | null>(null)

  const entitlementsColumnHelper = createColumnHelper<(typeof planForm.entitlements)[number]>()

  const entitlementsColumns = useMemo(() => [
    entitlementsColumnHelper.accessor('entitlementKey', {
      header: () => t('platform.keyOrCapacity'),
      cell: info => (
        <span className={info.getValue().startsWith('modules.') ? 'font-semibold text-primary' : 'font-mono text-xs'}>
          {getEntitlementFullLabel(info.getValue())}
        </span>
      )
    }),
    entitlementsColumnHelper.accessor('limitValue', {
      header: () => t('platform.entitlementLimit'),
      cell: info => {
        const row = info.row.original

        return (
          <Input
            aria-label={t('platform.entitlementLimitParam', { key: row.entitlementKey })}
            className='w-28 h-8 text-xs'
            type='number'
            min={0}
            step={1}
            placeholder={t('platform.unlimited')}
            value={row.limitValue ?? ''}
            onChange={event => {
              const nextValue = event.target.value

              setPlanForm(prev => ({
                ...prev,
                entitlements: prev.entitlements.map(e =>
                  e.entitlementKey === row.entitlementKey ? { ...e, limitValue: nextValue } : e
                )
              }))
            }}
          />
        )
      }
    }),
    entitlementsColumnHelper.accessor('isEnabled', {
      header: () =>
      <span className='text-center block'>
        {t('platform.enabled')}
      </span>,
      cell: info => {
        const row = info.row.original

        return (
          <div className='flex justify-center'>
            <Switch
              aria-label={t('platform.enableEntitlementParam', { key: row.entitlementKey })}
              checked={row.isEnabled}
              onCheckedChange={checked =>
                setPlanForm(prev => ({
                  ...prev,
                  entitlements: prev.entitlements.map(e =>
                    e.entitlementKey === row.entitlementKey ? { ...e, isEnabled: checked } : e
                  )
                }))
              }
            />
          </div>
        )
      }
    }),
    entitlementsColumnHelper.display({
      id: 'remove',
      header: () => <span className='text-right block'>{t('common.remove')}</span>,
      cell: info => {
        const row = info.row.original

        return (
          <div className='flex justify-end'>
            <Button
              aria-label={t('platform.removeEntitlementParam', { key: row.entitlementKey })}
              size='icon'
              variant='ghost'
              className='h-7 w-7'
              onClick={() => {
                setPlanForm(prev => {
                  const nextEntitlements = prev.entitlements.filter(e => e.entitlementKey !== row.entitlementKey)
                  const nextPageCount = Math.max(1, Math.ceil(nextEntitlements.length / planEntitlementsPagination.pageSize))
                  if (planEntitlementsPagination.pageIndex >= nextPageCount) {
                    setPlanEntitlementsPagination(p => ({ ...p, pageIndex: Math.max(0, nextPageCount - 1) }))
                  }
                  return { ...prev, entitlements: nextEntitlements }
                })
              }}
            >
              <XIcon className='size-3.5' />
            </Button>
          </div>
        )
      }
    })
  ], [t, planEntitlementsPagination.pageIndex, planEntitlementsPagination.pageSize])

  const entitlementsTable = useReactTable({
    data: planForm.entitlements,
    columns: entitlementsColumns,
    getRowId: row => row.entitlementKey,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    autoResetExpanded: false,
    onPaginationChange: setPlanEntitlementsPagination,
    state: { pagination: planEntitlementsPagination }
  })

  const loadTenantEntitlements = async (tenantId: string) => {
    setLoadingEntitlements(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/billing/entitlements?tenantId=${encodeURIComponent(tenantId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      if (!res.ok) {
        throw new Error('No se pudieron cargar los límites del tenant.')
      }

      const data = (await res.json()) as { entitlements?: AdminTenantEntitlement[] }
      const rows = data.entitlements ?? []
      const nextDrafts: Record<string, EntitlementDraft> = {}

      for (const row of rows) {
        nextDrafts[`${row.planId}:${row.entitlementKey}`] = {
          limitValue: row.overrideId !== null && row.overrideLimitValue !== null ? String(row.overrideLimitValue) : '',
          isEnabled: row.effectiveIsEnabled
        }
      }

      setEntitlements(rows)
      setEntitlementDrafts(nextDrafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los límites del tenant.')
      setEntitlements([])
      setEntitlementDrafts({})
    } finally {
      setLoadingEntitlements(false)
    }
  }

  const loadInvoices = async (tenantId?: string) => {
    setLoadingInvoices(true)
    setError(null)

    try {
      const query = new URLSearchParams({ limit: '100' })

      if (tenantId) {
        query.set('tenantId', tenantId)
      }

      const res = await fetch(`/api/admin/billing/invoices?${query.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })

      if (!res.ok) {
        throw new Error('No se pudieron cargar las facturas.')
      }

      const data = (await res.json()) as { invoices?: AdminBillingInvoice[] }

      setInvoices(data.invoices ?? [])
    } finally {
      setLoadingInvoices(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [plansRes, policyRes, modulesRes, subsRes, auditRes] = await Promise.all([
        fetch('/api/admin/billing/plans'),
        fetch('/api/admin/billing/trial-policy'),
        fetch('/api/admin/billing/modules'),
        fetch('/api/admin/billing/subscriptions'),
        fetch('/api/admin/billing/audit')
      ])

      if (plansRes.ok) {
        const pData = (await plansRes.json()) as { plans?: AdminPlanSummary[] }

        setPlans(pData.plans ?? [])
      }

      if (policyRes.ok) {
        const polData = (await policyRes.json()) as { policy?: AdminTrialPolicy }

        if (polData.policy) {
          setTrialForm({
            enabled: polData.policy.enabled,
            maxSessions: polData.policy.maxSessions,
            allowGuest: polData.policy.allowGuest,
            allowCheckout: polData.policy.allowCheckout
          })
        }
      }

      if (modulesRes.ok) {
        const modulesData = (await modulesRes.json()) as { modules?: AdminPlatformModule[] }

        setModules(modulesData.modules ?? [])
      }

      if (subsRes.ok) {
        const sData = (await subsRes.json()) as { subscriptions?: AdminSubscriptionSummary[] }
        const nextSubscriptions = sData.subscriptions ?? []

        setSubscriptions(nextSubscriptions)

        if (!selectedTenantId) {
          const firstTenantId = nextSubscriptions[0]?.tenantId ?? ''

          if (firstTenantId) {
            setSelectedTenantId(firstTenantId)
            setTenantIdInput(firstTenantId)
          }
        }
      }

      if (auditRes.ok) {
        const aData = (await auditRes.json()) as { auditLogs?: AdminBillingAuditLog[] }

        setAuditLogs(aData.auditLogs ?? [])
      }

      await loadInvoices(invoiceTenantFilter || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de administración de Billing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedTenantId) {
      const timeoutId = window.setTimeout(() => {
        void loadTenantEntitlements(selectedTenantId)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [selectedTenantId])

  const handleOpenCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm({
      code: '',
      name: '',
      description: '',
      providerPriceId: '',
      currency: 'USD',
      interval: 'month',
      durationType: 'lifetime',
      durationHours: '24',
      amountMajor: '0',
      isActive: true,
      isPublic: true,
      contactSales: false,
      entitlements: []
    })
    setSelectedCatalogKey('')
    setNewPlanEntitlementKey('')
    setNewPlanEntitlementLimit('')
    setPlanEntitlementsPagination({ pageIndex: 0, pageSize: 5 })
    setPlanDialogOpen(true)
  }

  const handleOpenEditPlan = (plan: AdminPlanSummary) => {
    setEditingPlan(plan)
    const isOneTime = plan.interval === 'one_time' || plan.interval === 'free'
    const isTemporary = isOneTime && plan.durationSeconds !== null && plan.durationSeconds !== undefined && plan.durationSeconds > 0
    const durationHours = isTemporary ? String(Math.round(plan.durationSeconds! / 3600)) : '24'

    setPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      providerPriceId: plan.providerPriceId ?? '',
      currency: plan.currency,
      interval: plan.interval,
      durationType: isTemporary ? 'temporary' : 'lifetime',
      durationHours,
      amountMajor: String(minorToMajorUnits(plan.amountMinor, plan.currency)),
      isActive: plan.isActive,
      isPublic: plan.isPublic ?? true,
      contactSales: plan.contactSales ?? false,
      entitlements: plan.entitlements.map((entitlement: AdminPlanEntitlement) => ({
        entitlementKey: entitlement.entitlementKey,
        limitValue: entitlement.limitValue === null ? '' : String(entitlement.limitValue),
        isEnabled: entitlement.isEnabled
      }))
    })
    setSelectedCatalogKey('')
    setNewPlanEntitlementKey('')
    setNewPlanEntitlementLimit('')
    setPlanEntitlementsPagination({ pageIndex: 0, pageSize: 5 })
    setPlanDialogOpen(true)
  }

  const handleAddPlanEntitlement = () => {
    const entitlementKey = (selectedCatalogKey || newPlanEntitlementKey).trim().toLowerCase()

    if (!entitlementKey) {
      toast.error('Selecciona una capacidad del catálogo para el plan.')

      return
    }

    if (planForm.entitlements.some(e => e.entitlementKey === entitlementKey)) {
      toast.error('Ese entitlement ya existe en el plan.')

      return
    }

    const limitValue = newPlanEntitlementLimit.trim()

    setPlanForm(prev => ({
      ...prev,
      entitlements: [...prev.entitlements, { entitlementKey, limitValue, isEnabled: true }]
    }))
    setSelectedCatalogKey('')
    setNewPlanEntitlementKey('')
    setNewPlanEntitlementLimit('')
  }

  const handleRemovePlanEntitlement = (key: string) => {
    setPlanForm(prev => ({
      ...prev,
      entitlements: prev.entitlements.filter(e => e.entitlementKey !== key)
    }))
  }

  const handleToggleModuleInPlan = (moduleKey: string, checked: boolean) => {
    const fullKey = `modules.${moduleKey.toLowerCase()}`

    setPlanForm(previous => {
      const exists = previous.entitlements.some(e => e.entitlementKey === fullKey)

      if (checked) {
        if (!exists) {
          return {
            ...previous,
            entitlements: [...previous.entitlements, { entitlementKey: fullKey, limitValue: '', isEnabled: true }]
          }
        }

        return {
          ...previous,
          entitlements: previous.entitlements.map(e => (e.entitlementKey === fullKey ? { ...e, isEnabled: true } : e))
        }
      } else {
        if (exists) {
          return {
            ...previous,
            entitlements: previous.entitlements.filter(e => e.entitlementKey !== fullKey)
          }
        }
      }

      return previous
    })
  }

  const handleAddPresetLimit = (key: string, defaultLimit: string = '') => {
    if (planForm.entitlements.some(e => e.entitlementKey === key)) {
      toast.info('Ese límite ya está presente en la lista del plan.')
      return
    }

    setPlanForm(previous => ({
      ...previous,
      entitlements: [...previous.entitlements, { entitlementKey: key, limitValue: defaultLimit, isEnabled: true }]
    }))
  }

  const handleSavePlan = async () => {
    setSavingPlan(true)
    setError(null)

    try {
      const parsedMajor = planForm.interval === 'free' ? 0 : Number.parseFloat(planForm.amountMajor)

      if (!Number.isFinite(parsedMajor) || parsedMajor < 0) {
        toast.error('El precio debe ser un número no negativo.')
        setSavingPlan(false)

        return
      }

      const amountMinor = planForm.interval === 'free' ? 0 : majorToMinorUnits(parsedMajor, planForm.currency)
      const url = editingPlan ? `/api/admin/billing/plans/${editingPlan.id}` : '/api/admin/billing/plans'

      const method = editingPlan ? 'PATCH' : 'POST'

      const entitlements = planForm.entitlements.map(entitlement => ({
        entitlementKey: entitlement.entitlementKey,
        limitValue: entitlement.limitValue.trim() === '' ? null : Number(entitlement.limitValue),
        isEnabled: entitlement.isEnabled
      }))

      const durationSeconds =
        planForm.interval === 'one_time' || planForm.interval === 'free'
          ? planForm.durationType === 'temporary'
            ? Math.max(1, Math.round(Number.parseFloat(planForm.durationHours || '24') * 3600))
            : null
          : null

      const { amountMajor: _omitted, durationType: _dtOmitted, durationHours: _dhOmitted, ...restPlanForm } = planForm

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...restPlanForm, durationSeconds, amountMinor, entitlements })
      })

      if (!res.ok) {
        const payload = (await res.json()) as { error?: { messageKey?: string } }

        throw new Error(payload.error?.messageKey ?? 'No se pudo guardar el plan.')
      }

      toast.success(editingPlan ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.')
      setPlanDialogOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el plan.')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleSaveTrialPolicy = async () => {
    setSavingTrial(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/billing/trial-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: trialForm.enabled,
          maxSessions: trialForm.maxSessions,
          allowGuest: trialForm.allowGuest,
          allowCheckout: trialForm.allowCheckout
        })
      })

      if (!res.ok) {
        throw new Error('No se pudo actualizar la política de acceso.')
      }

      toast.success('Política de acceso y pruebas actualizada correctamente.')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la política de acceso.')
    } finally {
      setSavingTrial(false)
    }
  }

  const handleOpenCreateModule = () => {
    setEditingModule(null)
    setModuleForm({
      moduleKey: '',
      name: '',
      description: '',
      routePrefix: '/',
      isActive: true,
      displayOrder: 0
    })
    setModuleDialogOpen(true)
  }

  const handleOpenEditModule = (module: AdminPlatformModule) => {
    setEditingModule(module)
    setModuleForm({
      moduleKey: module.moduleKey,
      name: module.name,
      description: module.description ?? '',
      routePrefix: module.routePrefix,
      isActive: module.isActive,
      displayOrder: module.displayOrder
    })
    setModuleDialogOpen(true)
  }

  const handleSaveModule = async () => {
    setSavingModule(true)
    setError(null)

    try {
      const url = editingModule
        ? `/api/admin/billing/modules/${encodeURIComponent(editingModule.moduleKey)}`
        : '/api/admin/billing/modules'

      const method = editingModule ? 'PATCH' : 'POST'

      const body = editingModule
        ? {
            name: moduleForm.name,
            description: moduleForm.description || null,
            routePrefix: moduleForm.routePrefix,
            isActive: moduleForm.isActive,
            displayOrder: moduleForm.displayOrder
          }
        : moduleForm

      const res = await fetch(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        throw new Error('No se pudo guardar el módulo de la plataforma.')
      }

      toast.success(editingModule ? 'Módulo actualizado correctamente.' : 'Módulo creado correctamente.')
      setModuleDialogOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el módulo de la plataforma.')
    } finally {
      setSavingModule(false)
    }
  }

  const handleLoadTenant = () => {
    const nextTenantId = tenantIdInput.trim()

    if (!nextTenantId) {
      toast.error('Indica un tenant para cargar sus límites.')

      return
    }

    setSelectedTenantId(nextTenantId)
  }

  const handleInvoiceFilterChange = async (value: string | null) => {
    const nextTenantId = value === 'all' ? '' : (value ?? '')

    setInvoiceTenantFilter(nextTenantId)

    try {
      await loadInvoices(nextTenantId || undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las facturas.')
    }
  }

  const handleSaveEntitlement = async (row: AdminTenantEntitlement) => {
    const draftKey = `${row.planId}:${row.entitlementKey}`
    const draft = entitlementDrafts[draftKey]

    if (!draft || !selectedTenantId) {
      toast.error('Selecciona un tenant antes de guardar un entitlement.')

      return
    }

    const parsedLimit = draft.limitValue.trim() === '' ? null : Number(draft.limitValue)

    if (parsedLimit !== null && (!Number.isInteger(parsedLimit) || parsedLimit < 0)) {
      toast.error('El límite debe ser un entero no negativo o quedar vacío para indicar ilimitado.')

      return
    }

    setSavingEntitlementKey(draftKey)
    setError(null)

    try {
      const res = await fetch(
        `/api/admin/billing/entitlements/${encodeURIComponent(row.planId)}?tenantId=${encodeURIComponent(selectedTenantId)}`,
        {
          method: 'PATCH',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entitlementKey: row.entitlementKey,
            limitValue: parsedLimit,
            isEnabled: draft.isEnabled
          })
        }
      )

      if (!res.ok) {
        throw new Error('No se pudo actualizar el límite del entitlement.')
      }

      toast.success(`Entitlement ${row.entitlementKey} actualizado correctamente.`)
      await loadTenantEntitlements(selectedTenantId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el límite del entitlement.')
    } finally {
      setSavingEntitlementKey(null)
    }
  }

  const tenantOptions = Array.from(
    new Map(subscriptions.map(subscription => [subscription.tenantId, subscription.tenantName])).entries()
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>{t('roles.scopePlatform')}</p>
          <h1 className='text-2xl font-semibold'>{t('platformAdmin.billingTitle')}</h1>
          <p className='text-muted-foreground text-sm'>
            {t('platformAdmin.billingDesc')}
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={() => void loadData()} disabled={loading}>
          <RefreshCwIcon className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {error ? (
        <Card className='border-destructive/30 bg-destructive/5'>
          <CardContent className='text-destructive flex items-center gap-3 py-4 text-sm'>
            <ShieldAlertIcon className='size-5 shrink-0' />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className='w-full'>
        <Tabs defaultValue='plans' className='w-full'>
          <div className='overflow-x-auto sm:overflow-visible'>
            <TabsList
              variant='line'
              className='h-fit! w-max min-w-full flex-nowrap justify-start gap-0 rounded-none border-b p-0 sm:w-full sm:flex-wrap'
            >
              <TabsTrigger
                value='plans'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Catálogo
              </TabsTrigger>
              <TabsTrigger
                value='modules'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Módulos
              </TabsTrigger>
              <TabsTrigger
                value='entitlements'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Entitlements
              </TabsTrigger>
              <TabsTrigger
                value='subscriptions'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Suscripciones
              </TabsTrigger>
              <TabsTrigger
                value='invoices'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Facturas
              </TabsTrigger>
              <TabsTrigger
                value='audit'
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                Auditoría
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Catálogo de Planes y Política de Prueba */}
          <TabsContent value='plans' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-3'>
                  <div>
                    <h3 className='text-base font-semibold'>{t('platform.commercialPlans')}</h3>
                    <p className='text-muted-foreground text-sm'>
                      Configura la lista de planes comerciales, precios de Stripe e intervalos de cobro para la
                      plataforma.
                    </p>
                  </div>
                  <div>
                    <Button size='sm' onClick={handleOpenCreatePlan}>
                      <PlusIcon className='mr-2 size-4' />
                      Nuevo Plan
                    </Button>
                  </div>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card className='gap-0 py-0'>
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='pl-6'>{t('platform.planName')}</TableHead>
                          <TableHead>{t('platform.planCode')}</TableHead>
                          <TableHead>{t('platform.planPrice')}</TableHead>
                          <TableHead>{t('platform.planInterval')}</TableHead>
                          <TableHead>{t('platform.planVisibility')}</TableHead>
                          <TableHead>{t('platform.planMode')}</TableHead>
                          <TableHead>{t('platform.planStatus')}</TableHead>
                          <TableHead className='pr-6 text-right'>{t('platform.planAction')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell className='pl-6'><Skeleton className='h-4 w-32' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-16' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-20' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-24' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-14 rounded-full' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-16 rounded-full' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-14 rounded-full' /></TableCell>
                              <TableCell className='pr-6 text-right'><Skeleton className='h-8 w-8 ml-auto rounded-md' /></TableCell>
                            </TableRow>
                          ))
                        ) : plans.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className='text-muted-foreground py-8 text-center'>
                              No hay planes comerciales registrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          plans.map(plan => (
                            <TableRow key={plan.id} className={plan.isActive ? '' : 'opacity-70 bg-muted/10'}>
                              <TableCell className='pl-6 font-medium'>{plan.name}</TableCell>
                              <TableCell>
                                <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>{plan.code}</code>
                              </TableCell>
                              <TableCell>
                                {plan.interval === 'free' ? 'Gratis ($0)' : formatAmountMinor(plan.amountMinor, plan.currency)}
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-col gap-1'>
                                  <span className='capitalize'>
                                    {plan.interval === 'free' ? 'Gratis' : plan.interval === 'one_time' ? 'Pago Único' : plan.interval === 'year' ? 'Anual' : 'Mensual'}
                                  </span>
                                  {plan.interval === 'one_time' || plan.interval === 'free' ? (
                                    <Badge variant='outline' className='w-fit text-xs font-normal'>
                                      {plan.durationSeconds === null || plan.durationSeconds === undefined
                                        ? 'De por vida'
                                        : `${Math.round(plan.durationSeconds / 3600)}h (${(plan.durationSeconds / 86400).toFixed(plan.durationSeconds % 86400 === 0 ? 0 : 1)}d)`}
                                    </Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={plan.isPublic !== false ? 'outline' : 'secondary'} className='text-[10px]'>
                                  {plan.isPublic !== false ? 'Público' : 'Oculto'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={plan.contactSales ? 'secondary' : 'outline'} className='text-[10px]'>
                                  {plan.contactSales ? 'Cotización' : 'Stripe'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                                  {plan.isActive ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className='pr-6 text-right'>
                                <Button variant='ghost' size='sm' onClick={() => handleOpenEditPlan(plan)}>
                                  <EditIcon className='size-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </div>

            <Separator className='my-10' />

            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-1'>
                  <h3 className='text-base font-semibold'>{t('platform.accessGovernance')}</h3>
                  <p className='text-muted-foreground text-sm'>
                    {t('platform.accessGovernanceDesc') || 'Configura las reglas globales de activación y límites para usuarios registrados y visitantes anónimos.'}
                  </p>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card>
                    <CardContent className='space-y-6 pt-6'>
                      {loading ? (
                        <div className='space-y-4'>
                          <Skeleton className='h-16 w-full rounded-lg' />
                          <Skeleton className='h-16 w-full rounded-lg' />
                          <Skeleton className='h-16 w-full rounded-lg' />
                          <Skeleton className='h-12 w-full rounded-md' />
                          <Skeleton className='h-9 w-44 rounded-md' />
                        </div>
                      ) : (
                        <>
                          <div className='flex items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <Label className='text-base'>{t('platform.enableRegisteredTrial')}</Label>
                              <p className='text-muted-foreground text-sm'>
                                Permite a usuarios autenticados con cuenta verificada iniciar una prueba temporal.
                              </p>
                            </div>
                            <Switch
                              checked={trialForm.enabled}
                              onCheckedChange={checked => setTrialForm(prev => ({ ...prev, enabled: checked }))}
                            />
                          </div>

                          <div className='flex items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <Label className='text-base'>{t('platform.allowGuestTrial')}</Label>
                              <p className='text-muted-foreground text-sm'>
                                Habilita que visitantes anónimos prueben la herramienta sin crear una cuenta.
                              </p>
                            </div>
                            <Switch
                              checked={trialForm.allowGuest}
                              onCheckedChange={checked => setTrialForm(prev => ({ ...prev, allowGuest: checked }))}
                            />
                          </div>

                          <div className='flex items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <Label className='text-base'>{t('platform.allowCheckoutInTrial')}</Label>
                              <p className='text-muted-foreground text-sm'>
                                Permite a usuarios en estado de prueba iniciar compras o realizar upgrade de suscripción.
                              </p>
                            </div>
                            <Switch
                              checked={trialForm.allowCheckout}
                              onCheckedChange={checked => setTrialForm(prev => ({ ...prev, allowCheckout: checked }))}
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='maxSessions'>{t('platform.maxGuestSessions')}</Label>
                            <Input
                              id='maxSessions'
                              type='number'
                              min={1}
                              max={100000}
                              value={trialForm.maxSessions}
                              onChange={e =>
                                setTrialForm(prev => ({ ...prev, maxSessions: Number(e.target.value) || 1 }))
                              }
                            />
                            <p className='text-muted-foreground text-xs'>
                              Límite de concurrencia y sesiones simultáneas para visitantes anónimos.
                            </p>
                          </div>

                          <Button onClick={() => void handleSaveTrialPolicy()} disabled={savingTrial}>
                            {savingTrial ? 'Guardando…' : 'Guardar Política de Acceso'}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Catálogo de módulos */}
          <TabsContent value='modules' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-3'>
                  <div>
                    <h3 className='text-base font-semibold'>{t('platform.globalModuleCatalog')}</h3>
                    <p className='text-muted-foreground text-sm'>
                      Define las aplicaciones que pueden concederse mediante trial, suscripción o compra única.
                      Desactivar un módulo revoca su visibilidad efectiva sin borrar su configuración histórica.
                    </p>
                  </div>
                  <div>
                    <Button size='sm' onClick={handleOpenCreateModule}>
                      <PlusIcon className='mr-2 size-4' />
                      Nuevo Módulo
                    </Button>
                  </div>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card className='gap-0 py-0'>
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='pl-6'>{t('platform.moduleKey')}</TableHead>
                          <TableHead>{t('platform.moduleName')}</TableHead>
                          <TableHead>{t('platform.moduleRoutePrefix')}</TableHead>
                          <TableHead>{t('platform.moduleDisplayOrder')}</TableHead>
                          <TableHead>{t('platform.moduleStatus')}</TableHead>
                          <TableHead className='pr-6 text-right'>{t('platform.moduleAction')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell className='pl-6'><Skeleton className='h-4 w-24' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-32' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-28' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-10' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-14 rounded-full' /></TableCell>
                              <TableCell className='pr-6 text-right'><Skeleton className='h-8 w-8 ml-auto rounded-md' /></TableCell>
                            </TableRow>
                          ))
                        ) : modules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                              No hay módulos registrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          modules.map(mod => (
                            <TableRow key={mod.moduleKey}>
                              <TableCell className='pl-6'>
                                <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>{mod.moduleKey}</code>
                              </TableCell>
                              <TableCell className='font-medium'>{mod.name}</TableCell>
                              <TableCell className='text-muted-foreground text-sm'>{mod.routePrefix}</TableCell>
                              <TableCell className='text-sm'>{mod.displayOrder}</TableCell>
                              <TableCell>
                                <Badge variant={mod.isActive ? 'default' : 'secondary'}>
                                  {mod.isActive ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className='pr-6 text-right'>
                                <Button variant='ghost' size='sm' onClick={() => handleOpenEditModule(mod)}>
                                  <EditIcon className='size-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Entitlements de Planes y Tenants */}
          <TabsContent value='entitlements' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-1'>
                  <h3 className='text-base font-semibold'>{t('platform.tenantEntitlements')}</h3>
                  <p className='text-muted-foreground text-sm'>
                    Visualiza y sobrescribe límites y accesos a nivel de tenant específico.
                  </p>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card>
                    <CardContent className='space-y-4 pt-6'>
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                        <Input
                          placeholder={t('platform.tenantIdPlaceholder')}
                          value={selectedTenantId}
                          onChange={event => setSelectedTenantId(event.target.value)}
                          className='max-w-md'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => void loadTenantEntitlements(selectedTenantId)}
                          disabled={!selectedTenantId || loadingEntitlements}
                        >
                          Cargar Entitlements
                        </Button>
                      </div>

                      {!selectedTenantId ? (
                        <p className='text-muted-foreground text-sm'>{t('platform.tenantRequired')}</p>
                      ) : loadingEntitlements ? (
                        <div className='overflow-x-auto rounded-md border'>
                          <Table>
                            <TableHeader>
                              <TableRow className='hover:bg-transparent'>
                                <TableHead>{t('platform.entitlementPlan')}</TableHead>
                                <TableHead>{t('platform.entitlementKey')}</TableHead>
                                <TableHead>{t('platform.entitlementBaseLimit')}</TableHead>
                                <TableHead>{t('platform.effectiveLimit') || 'Límite efectivo'}</TableHead>
                                <TableHead>{t('platform.enabled') || 'Habilitado'}</TableHead>
                                <TableHead className='text-right'>{t('platform.moduleAction')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.from({ length: 4 }).map((_, idx) => (
                                <TableRow key={idx}>
                                  <TableCell><Skeleton className='h-4 w-28' /></TableCell>
                                  <TableCell><Skeleton className='h-4 w-36' /></TableCell>
                                  <TableCell><Skeleton className='h-4 w-16' /></TableCell>
                                  <TableCell><Skeleton className='h-8 w-28 rounded-md' /></TableCell>
                                  <TableCell><Skeleton className='h-5 w-9 rounded-full' /></TableCell>
                                  <TableCell className='text-right'><Skeleton className='h-8 w-16 ml-auto rounded-md' /></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className='overflow-x-auto rounded-md border'>
                          <Table>
                            <TableHeader>
                              <TableRow className='hover:bg-transparent'>
                                <TableHead>{t('platform.entitlementPlan')}</TableHead>
                                <TableHead>{t('platform.entitlementKey')}</TableHead>
                                <TableHead>{t('platform.entitlementBaseLimit')}</TableHead>
                                <TableHead>{t('platform.effectiveLimit') || 'Límite efectivo'}</TableHead>
                                <TableHead>{t('platform.enabled') || 'Habilitado'}</TableHead>
                                <TableHead className='text-right'>{t('platform.moduleAction')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entitlements.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                                    No hay entitlements configurados para este tenant.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                entitlements.map(row => {
                                  const draftKey = `${row.planId}:${row.entitlementKey}`

                                  const draft = entitlementDrafts[draftKey] ?? {
                                    limitValue: row.effectiveLimitValue === null ? '' : String(row.effectiveLimitValue),
                                    isEnabled: row.effectiveIsEnabled
                                  }

                                  return (
                                    <TableRow key={draftKey}>
                                      <TableCell className='font-medium'>{row.planName}</TableCell>
                                      <TableCell>
                                        <code className='bg-muted rounded px-1.5 py-0.5 text-xs'>
                                          {row.entitlementKey}
                                        </code>
                                      </TableCell>
                                      <TableCell className='text-muted-foreground text-sm'>
                                        {row.baseLimitValue === null ? 'Ilimitado' : row.baseLimitValue}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          aria-label={`Límite ${row.entitlementKey}`}
                                          className='w-28'
                                          type='number'
                                          min={0}
                                          step={1}
                                          placeholder={t('pricingPage.limitUnlimited')}
                                          value={draft.limitValue}
                                          onChange={event =>
                                            setEntitlementDrafts(previous => ({
                                              ...previous,
                                              [draftKey]: { ...draft, limitValue: event.target.value }
                                            }))
                                          }
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Switch
                                          aria-label={`Habilitar ${row.entitlementKey}`}
                                          checked={draft.isEnabled}
                                          onCheckedChange={checked =>
                                            setEntitlementDrafts(previous => ({
                                              ...previous,
                                              [draftKey]: { ...draft, isEnabled: checked }
                                            }))
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className='text-right'>
                                        <Button
                                          type='button'
                                          size='sm'
                                          onClick={() => void handleSaveEntitlement(row)}
                                          disabled={savingEntitlementKey === draftKey}
                                        >
                                          {savingEntitlementKey === draftKey ? 'Guardando…' : 'Guardar'}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Suscripciones */}
          <TabsContent value='subscriptions' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-1'>
                  <h3 className='text-base font-semibold'>{t('platform.activeSubscriptions') || 'Suscripciones Activas'}</h3>
                  <p className='text-muted-foreground text-sm'>
                    Monitoreo comercial de todas las suscripciones registradas por tenant en la plataforma.
                  </p>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card className='gap-0 py-0'>
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='pl-6'>{t('roles.scopeTenant')}</TableHead>
                          <TableHead>{t('platform.entitlementPlan') || 'Plan'}</TableHead>
                          <TableHead>{t('billing.stripeSubId') || 'Stripe Sub ID'}</TableHead>
                          <TableHead>{t('common.status') || 'Estado'}</TableHead>
                          <TableHead className='pr-6'>{t('platform.periodEnd') || 'Fin del Período'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell className='pl-6'><Skeleton className='h-4 w-32' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-24' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-36' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-16 rounded-full' /></TableCell>
                              <TableCell className='pr-6'><Skeleton className='h-4 w-24' /></TableCell>
                            </TableRow>
                          ))
                        ) : subscriptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className='text-muted-foreground py-8 text-center'>
                              No hay suscripciones activas en la plataforma.
                            </TableCell>
                          </TableRow>
                        ) : (
                          subscriptions.map(sub => (
                            <TableRow key={sub.id}>
                              <TableCell className='pl-6 font-medium'>{sub.tenantName}</TableCell>
                              <TableCell>{sub.planName}</TableCell>
                              <TableCell className='text-muted-foreground font-mono text-xs'>
                                {sub.providerSubscriptionId}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={sub.status === 'active' ? 'default' : 'secondary'}
                                  className='capitalize'
                                >
                                  {sub.status}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-muted-foreground pr-6 text-sm'>
                                {sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), 'MMM dd, yyyy') : '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Facturas */}
          <TabsContent value='invoices' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-1'>
                  <h3 className='text-base font-semibold'>{t('platform.billingInvoices') || 'Facturas de Billing'}</h3>
                  <p className='text-muted-foreground text-sm'>
                    Consulta las facturas emitidas por Stripe sin modificar el historial append-only.
                  </p>
                </div>
                <div className='space-y-4 lg:col-span-2'>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='text-muted-foreground text-xs font-medium'>
                      {invoices.length} {invoices.length === 1 ? 'factura encontrada' : 'facturas encontradas'}
                    </span>
                    <div className='flex items-center gap-2.5 w-full sm:w-80'>
                      <Label htmlFor='invoiceTenantFilter' className='text-xs text-muted-foreground shrink-0'>
                        Filtrar por tenant:
                      </Label>
                      <Select
                        value={invoiceTenantFilter || 'all'}
                        onValueChange={value => void handleInvoiceFilterChange(value)}
                        disabled={loadingInvoices}
                      >
                        <SelectTrigger id='invoiceTenantFilter' className='w-full'>
                          <SelectValue placeholder={t('platform.allTenants')}>
                            {val => {
                              if (!val || val === 'all') return t('platform.allTenants')
                              const match = tenantOptions.find(([id]) => id === val)

                              return match ? `${match[1]}` : val
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>{t('platform.allTenants')}</SelectItem>
                          {tenantOptions.map(([tenantId, tenantName]) => (
                            <SelectItem key={tenantId} value={tenantId}>
                              {tenantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Card className='gap-0 overflow-x-auto py-0'>
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='pl-6'>{t('roles.scopeTenant')}</TableHead>
                          <TableHead>{t('userSettings.colInvoice')}</TableHead>
                          <TableHead>{t('userSettings.colTotal')}</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                          <TableHead>{t('userSettings.colIssuedDate')}</TableHead>
                          <TableHead className='pr-6 text-right'>{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading || loadingInvoices ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell className='pl-6'>
                                <Skeleton className='h-4 w-28 mb-1' />
                                <Skeleton className='h-3 w-36' />
                              </TableCell>
                              <TableCell><Skeleton className='h-4 w-24' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-16' /></TableCell>
                              <TableCell><Skeleton className='h-5 w-14 rounded-full' /></TableCell>
                              <TableCell><Skeleton className='h-4 w-24' /></TableCell>
                              <TableCell className='pr-6 text-right'><Skeleton className='h-4 w-16 ml-auto' /></TableCell>
                            </TableRow>
                          ))
                        ) : invoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                              {t('userSettings.noInvoices')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoices.map(invoice => (
                            <TableRow key={invoice.id}>
                              <TableCell className='pl-6'>
                                <div className='font-medium'>{invoice.tenantName ?? 'Sin tenant'}</div>
                                <div className='text-muted-foreground font-mono text-xs'>{invoice.tenantId ?? '—'}</div>
                              </TableCell>
                              <TableCell className='font-mono text-xs'>
                                {invoice.number ?? invoice.providerInvoiceId}
                              </TableCell>
                              <TableCell>{formatAmountMinor(invoice.amountMinor, invoice.currency)}</TableCell>
                              <TableCell>
                                <Badge
                                   variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                  className='capitalize'
                                >
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-muted-foreground text-sm'>
                                {invoice.issuedAt ? format(new Date(invoice.issuedAt), 'MMM dd, yyyy') : '—'}
                              </TableCell>
                              <TableCell className='pr-6 text-right'>
                                {invoice.hostedInvoiceUrl ? (
                                  <a
                                    className='text-primary text-sm font-medium underline-offset-4 hover:underline'
                                    href={invoice.hostedInvoiceUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                  >
                                    {t('userSettings.viewInvoice')}
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Auditoría */}
          <TabsContent value='audit' className='py-3'>
            <div className='mb-10'>
              <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
                <div className='flex flex-col space-y-1'>
                  <h3 className='text-base font-semibold'>{t('platform.commercialAudit')}</h3>
                  <p className='text-muted-foreground text-sm'>
                    Historial y trazabilidad de eventos comerciales, asignaciones de prueba y webhooks.
                  </p>
                </div>
                <div className='space-y-3 lg:col-span-2'>
                  <Card className='gap-0 py-0'>
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='pl-6'>{t('userSettings.colIssuedDate')}</TableHead>
                          <TableHead>{t('platform.moduleAction')}</TableHead>
                          <TableHead>{t('common.source')}</TableHead>
                          <TableHead className='pr-6'>{t('common.entityId')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 5 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell className='pl-6'><Skeleton className='h-3 w-28' /></TableCell>
                              <TableCell><Skeleton className='h-3 w-44' /></TableCell>
                              <TableCell><Skeleton className='h-3 w-16' /></TableCell>
                              <TableCell className='pr-6'><Skeleton className='h-3 w-32' /></TableCell>
                            </TableRow>
                          ))
                        ) : auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className='text-muted-foreground py-8 text-center'>
                              No hay registros de auditoría de billing.
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className='text-muted-foreground pl-6 text-xs'>
                                {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                              <TableCell className='font-mono text-xs'>{log.action}</TableCell>
                              <TableCell className='text-xs capitalize'>{log.source}</TableCell>
                              <TableCell className='text-muted-foreground pr-6 font-mono text-xs'>
                                {log.entityId ?? '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className='max-h-[85vh] sm:max-w-4xl flex flex-col overflow-hidden'>
          <DialogHeader>
            <DialogTitle>{editingPlan ? t('platform.editPlan') : t('platform.createPlan')}</DialogTitle>
            <DialogDescription>
              {t('platform.planDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 overflow-y-auto flex-1 pr-1 -mr-1'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='code'>{t('platform.uniqueCode')}</Label>
                <Input
                  id='code'
                  disabled={!!editingPlan}
                  placeholder={t('platform.uniqueCodePlaceholder')}
                  value={planForm.code}
                  onChange={e => setPlanForm(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='name'>{t('platform.planName')}</Label>
                <Input
                  id='name'
                  placeholder={t('platform.planNamePlaceholder')}
                  value={planForm.name}
                  onChange={e => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='planDescription'>{t('platform.planDescription')}</Label>
              <Input
                id='planDescription'
                placeholder={t('platform.planDescriptionPlaceholder')}
                value={planForm.description}
                onChange={e => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
              <div className='space-y-2'>
                <Label htmlFor='amountMajor'>{t('billing.price')} ({planForm.currency})</Label>
                <Input
                  id='amountMajor'
                  type='number'
                  disabled={planForm.interval === 'free'}
                  step={getMinorExponent(planForm.currency) > 0 ? '0.01' : '1'}
                  min='0'
                  placeholder={planForm.interval === 'free' ? '0' : planForm.currency === 'CLP' ? '9500' : '4.99'}
                  value={planForm.interval === 'free' ? '0' : planForm.amountMajor}
                  onChange={e => setPlanForm(prev => ({ ...prev, amountMajor: e.target.value }))}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='providerPriceId'>{t('billing.stripePriceId')}</Label>
                <Input
                  id='providerPriceId'
                  placeholder='price_1N...'
                  value={planForm.providerPriceId}
                  onChange={e => setPlanForm(prev => ({ ...prev, providerPriceId: e.target.value }))}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='interval'>{t('platform.billingInterval')}</Label>
                <Select
                  value={planForm.interval}
                  onValueChange={(val: string | null) => {
                    const nextInterval = (val as BillingInterval) ?? 'month'

                    setPlanForm(prev => ({
                      ...prev,
                      interval: nextInterval,
                      amountMajor: nextInterval === 'free' ? '0' : prev.amountMajor === '0' ? '9.99' : prev.amountMajor
                    }))
                  }}
                >
                  <SelectTrigger id='interval' className='w-full'>
                    <SelectValue placeholder={t('platform.billingInterval')}>
                      {planForm.interval === 'free' && t('pricing.freeTrial')}
                      {planForm.interval === 'one_time' && t('pricing.oneTimePayment')}
                      {planForm.interval === 'year' && t('pricing.yearly')}
                      {planForm.interval === 'month' && t('pricing.monthly')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side='bottom' align='start' alignItemWithTrigger={false}>
                    <SelectItem value='month'>{t('pricing.monthly')}</SelectItem>
                    <SelectItem value='year'>{t('pricing.yearly')}</SelectItem>
                    <SelectItem value='one_time'>{t('pricing.oneTimePayment')}</SelectItem>
                    <SelectItem value='free'>{t('pricing.freeTrial')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='currency'>{t('platform.currency')}</Label>
                <Select
                  value={planForm.currency}
                  onValueChange={(val: string | null) => setPlanForm(prev => ({ ...prev, currency: val ?? 'USD' }))}
                >
                  <SelectTrigger id='currency' className='w-full'>
                    <SelectValue placeholder={t('platform.currency')}>
                      {planForm.currency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side='bottom' align='start' alignItemWithTrigger={false}>
                    <SelectItem value='USD'>USD</SelectItem>
                    <SelectItem value='EUR'>EUR</SelectItem>
                    <SelectItem value='CLP'>CLP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {planForm.interval === 'one_time' || planForm.interval === 'free' ? (
              <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='durationType'>
                      {planForm.interval === 'free' ? t('platform.trialDuration') : t('platform.accessType')}
                    </Label>
                    <Select
                      value={planForm.durationType}
                      onValueChange={(val: string | null) =>
                        setPlanForm(prev => ({
                          ...prev,
                          durationType: (val as 'lifetime' | 'temporary') ?? (planForm.interval === 'free' ? 'temporary' : 'lifetime')
                        }))
                      }
                    >
                      <SelectTrigger id='durationType' className='w-full'>
                        <SelectValue placeholder={t('platform.accessType')}>
                          {planForm.durationType === 'lifetime' ? t('platform.permanentAccess') : t('platform.temporaryAccess')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent side='bottom' align='start' alignItemWithTrigger={false}>
                        <SelectItem value='temporary'>{t('platform.temporaryAccess')}</SelectItem>
                        <SelectItem value='lifetime'>{t('platform.permanentAccess')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {planForm.durationType === 'temporary' ? (
                    <div className='space-y-2'>
                      <Label htmlFor='durationHours'>{t('platform.accessDurationHours')}</Label>
                      <Input
                        id='durationHours'
                        type='number'
                        min='1'
                        placeholder='24'
                        value={planForm.durationHours}
                        onChange={e => setPlanForm(prev => ({ ...prev, durationHours: e.target.value }))}
                      />
                    </div>
                  ) : null}
                </div>

                {planForm.durationType === 'temporary' ? (
                  <p className='text-muted-foreground text-xs'>
                    El acceso expirará automáticamente tras cumplirse las horas indicadas desde la activación (ej. 24 horas = 1 día, 72 horas = 3 días, 168 horas = 7 días).
                  </p>
                ) : (
                  <p className='text-muted-foreground text-xs'>
                    Acceso indefinido y permanente sin límite de tiempo ni fecha de vencimiento.
                  </p>
                )}
              </div>
            ) : null}



            {/* 1. Módulos / Aplicaciones del Ecosistema NovaStore */}
            <div className='space-y-3 rounded border p-4'>
              <div>
                <Label className='text-sm font-semibold'>{t('platform.modulesAndAppsIncluded')}</Label>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Selecciona qué aplicaciones de NovaStore están habilitadas comercialmente en este plan.
                </p>
              </div>

              <div className='grid gap-2 sm:grid-cols-4'>
                {modules.map(module => {
                  const modKey = `modules.${module.moduleKey.toLowerCase()}`
                  const isIncluded = planForm.entitlements.some(
                    e => e.entitlementKey === modKey && e.isEnabled
                  )

                  return (
                    <div
                      key={module.moduleKey}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors',
                        isIncluded ? 'border-primary/40 bg-primary/5' : 'bg-muted/20'
                      )}
                    >
                      <div className='flex flex-col min-w-0'>
                        <span className='text-xs font-semibold truncate'>{module.name}</span>
                        <span className='text-muted-foreground text-[11px] font-mono truncate'>{module.routePrefix}</span>
                      </div>
                      <Switch
                        aria-label={`Incluir módulo ${module.name}`}
                        checked={isIncluded}
                        onCheckedChange={checked => handleToggleModuleInPlan(module.moduleKey, checked)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. Cuotas y Límites de Capacidad */}
            <div className='space-y-3 rounded border p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-sm font-semibold'>{t('platform.planLimitsAndCapacities')}</Label>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Añade o ajusta las cuotas numéricas del plan. Deja el valor en blanco para indicar acceso ilimitado.
                  </p>
                </div>
              </div>

              {/* Atajos rápidos */}
              <div className='flex flex-wrap gap-1.5 pt-1'>
                <span className='text-muted-foreground text-[11px] self-center mr-1'>{t('common.shortcuts')}</span>
                {/* Atajos de IA */}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                  onClick={() => handleAddPresetLimit('limits.ai_queries_monthly', '10')}
                >
                  + {t('platform.aiQueries10Preset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                  onClick={() => handleAddPresetLimit('limits.ai_queries_monthly', '50')}
                >
                  + {t('platform.aiQueries50Preset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                  onClick={() => handleAddPresetLimit('limits.ai_queries_daily', '10')}
                >
                  + {t('platform.aiDailyQueries10Preset') || '+10/día IA'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                  onClick={() => handleAddPresetLimit('modules.novai', '1')}
                >
                  + {t('platform.aiCopilotModulePreset') || '+NovAi'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10'
                  onClick={() => handleAddPresetLimit('actions.ai.free_chat', '1')}
                >
                  + {t('platform.aiFreeTextActionPreset') || '+Chat Libre'}
                </Button>
                {/* Atajos estándar */}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('investigations.max_active', '10')}
                >
                  + {t('platform.activeInvestigationsPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('investigations.export_pdf_monthly', '50')}
                >
                  + {t('platform.exportPdfMonthlyPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('storage.max_bytes', '1073741824')}
                >
                  + {t('platform.storage1GbPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('users.max_members', '5')}
                >
                  + {t('platform.collaboratorsPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('teams.max_teams', '3')}
                >
                  + {t('platform.teamsPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('kanban.projects_max', '10')}
                >
                  + {t('platform.kanbanProjectsPreset')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 text-[11px] px-2'
                  onClick={() => handleAddPresetLimit('kanban.tasks_max', '100')}
                >
                  + {t('platform.kanbanTasksPreset')}
                </Button>
              </div>

              {/* Selector Desplegable + Límite para agregar capacidad */}
              <div className='grid gap-2 pt-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]'>
                <Select
                  value={selectedCatalogKey}
                  onValueChange={(val: string | null) => {
                    const nextVal = val ?? ''
                    setSelectedCatalogKey(nextVal)
                    if (nextVal) {
                      setNewPlanEntitlementKey(nextVal)
                      const opt = KNOWN_ENTITLEMENT_CATALOG.find(c => c.key === nextVal)
                      if (opt?.defaultLimit && !newPlanEntitlementLimit) {
                        setNewPlanEntitlementLimit(opt.defaultLimit)
                      }
                    }
                  }}
                >
                  <SelectTrigger className='w-full' aria-label={t('platform.selectEntitlement')}>
                    <SelectValue placeholder={t('platform.selectEntitlement')} />
                  </SelectTrigger>
                  <SelectContent
                    side='bottom'
                    align='start'
                    alignItemWithTrigger={false}
                    className='max-h-72 w-(--anchor-width) min-w-[var(--anchor-width)]'
                  >
                    {/* IA */}
                    <SelectGroup>
                      <SelectLabel>Inteligencia Artificial</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'ai').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    {/* Investigaciones */}
                    <SelectGroup>
                      <SelectLabel>Investigaciones & DAFO</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'investigations').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    {/* Usuarios */}
                    <SelectGroup>
                      <SelectLabel>Usuarios y Equipos</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'users').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    {/* Almacenamiento */}
                    <SelectGroup>
                      <SelectLabel>Almacenamiento</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'storage').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    {/* Kanban */}
                    <SelectGroup>
                      <SelectLabel>Kanban & Tareas</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'kanban').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    {/* Módulos */}
                    <SelectGroup>
                      <SelectLabel>Módulos de Plataforma</SelectLabel>
                      {KNOWN_ENTITLEMENT_CATALOG.filter(c => c.category === 'modules').map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Input
                  aria-label={t('platform.entitlementLimit')}
                  type='number'
                  min={0}
                  step={1}
                  placeholder={t('platform.unlimited')}
                  value={newPlanEntitlementLimit}
                  onChange={event => setNewPlanEntitlementLimit(event.target.value)}
                />

                <Button type='button' variant='outline' onClick={handleAddPlanEntitlement}>
                  {t('common.add')}
                </Button>
              </div>

              {planForm.entitlements.length > 0 ? (
                <div className='rounded border overflow-hidden flex flex-col'>
                  <div className='max-h-[260px] overflow-y-auto overflow-x-hidden'>
                    <Table>
                      <TableHeader className='sticky top-0 z-10 bg-background border-b'>
                        {entitlementsTable.getHeaderGroups().map(headerGroup => (
                          <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                            {headerGroup.headers.map(header => (
                              <TableHead
                                key={header.id}
                                className={
                                  header.column.id === 'entitlementKey'
                                    ? ''
                                    : header.column.id === 'limit'
                                      ? 'w-32'
                                      : header.column.id === 'isEnabled'
                                        ? 'w-24 text-center'
                                        : 'w-20 text-right'
                                }
                              >
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {entitlementsTable.getRowModel().rows.map(row => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id} className={cell.column.id === 'entitlementKey' ? 'font-mono text-xs' : cell.column.id === 'isEnabled' ? 'text-center' : cell.column.id === 'remove' ? 'text-right' : ''}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className='flex items-center justify-between border-t px-3 py-2 bg-muted/20'>
                    <span className='text-xs text-muted-foreground'>
                      {t('common.page')} {entitlementsTable.getState().pagination.pageIndex + 1} {t('common.of')} {entitlementsTable.getPageCount() || 1} · {planForm.entitlements.length} {t('platform.entitlementsCount')}
                    </span>
                    <div className='flex items-center gap-1.5'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-xs'
                        disabled={!entitlementsTable.getCanPreviousPage()}
                        onClick={() => entitlementsTable.previousPage()}
                      >
                        Anterior
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-xs'
                        disabled={!entitlementsTable.getCanNextPage()}
                        onClick={() => entitlementsTable.nextPage()}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className='text-muted-foreground text-xs'>{t('platform.noEntitlementsConfigured')}</p>
              )}
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <div className='flex items-center justify-between rounded-lg border p-3 bg-muted/20'>
                <div className='flex flex-col gap-0.5'>
                  <Label htmlFor='isActive' className='text-xs font-semibold'>{t('platform.activePlan')}</Label>
                  <span className='text-[11px] text-muted-foreground'>{t('platform.enabledInSystem')}</span>
                </div>
                <Switch
                  id='isActive'
                  checked={planForm.isActive}
                  onCheckedChange={checked => setPlanForm(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div className='flex items-center justify-between rounded-lg border p-3 bg-muted/20'>
                <div className='flex flex-col gap-0.5'>
                  <Label htmlFor='isPublic' className='text-xs font-semibold'>{t('platform.visibleInPricing')}</Label>
                  <span className='text-[11px] text-muted-foreground'>{t('platform.publicForClients')}</span>
                </div>
                <Switch
                  id='isPublic'
                  checked={planForm.isPublic}
                  onCheckedChange={checked => setPlanForm(prev => ({ ...prev, isPublic: checked }))}
                />
              </div>

              <div className='flex items-center justify-between rounded-lg border p-3 bg-muted/20'>
                <div className='flex flex-col gap-0.5'>
                  <Label htmlFor='contactSales' className='text-xs font-semibold'>{t('platform.contactSales')}</Label>
                  <span className='text-[11px] text-muted-foreground'>{t('platform.customQuote')}</span>
                </div>
                <Switch
                  id='contactSales'
                  checked={planForm.contactSales}
                  onCheckedChange={checked => setPlanForm(prev => ({ ...prev, contactSales: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setPlanDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSavePlan()} disabled={savingPlan}>
              {savingPlan ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editingModule ? t('platform.editModule') : t('platform.createModule')}</DialogTitle>
            <DialogDescription>
              {t('platform.moduleDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='moduleKey'>{t('platform.moduleKey')}</Label>
              <Input
                id='moduleKey'
                disabled={!!editingModule}
                placeholder={t('platform.moduleKeyPlaceholder')}
                value={moduleForm.moduleKey}
                onChange={event => setModuleForm(previous => ({ ...previous, moduleKey: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='moduleName'>{t('platform.moduleName')}</Label>
              <Input
                id='moduleName'
                placeholder={t('platform.moduleNamePlaceholder')}
                value={moduleForm.name}
                onChange={event => setModuleForm(previous => ({ ...previous, name: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='moduleDescription'>{t('roles.description')}</Label>
              <Input
                id='moduleDescription'
                placeholder={t('platform.moduleDescPlaceholder')}
                value={moduleForm.description}
                onChange={event => setModuleForm(previous => ({ ...previous, description: event.target.value }))}
              />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='moduleRoutePrefix'>{t('platform.moduleRoute')}</Label>
                <Input
                  id='moduleRoutePrefix'
                  placeholder='/apps/investigator'
                  value={moduleForm.routePrefix}
                  onChange={event => setModuleForm(previous => ({ ...previous, routePrefix: event.target.value }))}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='moduleDisplayOrder'>{t('platform.moduleOrder')}</Label>
                <Input
                  id='moduleDisplayOrder'
                  type='number'
                  min={0}
                  value={moduleForm.displayOrder}
                  onChange={event =>
                    setModuleForm(previous => ({ ...previous, displayOrder: Number(event.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className='flex items-center justify-between rounded border p-3'>
              <Label htmlFor='moduleIsActive'>{t('platform.moduleActive')}</Label>
              <Switch
                id='moduleIsActive'
                checked={moduleForm.isActive}
                onCheckedChange={checked => setModuleForm(previous => ({ ...previous, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setModuleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSaveModule()} disabled={savingModule}>
              {savingModule ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
