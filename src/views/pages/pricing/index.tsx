'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

import {
  CheckIcon,
  FolderKanbanIcon,
  MinusIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon
} from 'lucide-react'
import { toast } from 'sonner'

import type { BillingPlan, PlatformModuleSummary } from '@/lib/billing/types'

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
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { useBilling } from '@/hooks/use-billing'
import { useCurrency } from '@/hooks/use-currency'
import { useI18n } from '@/hooks/use-i18n'

type PricingProps = {
  onboarding?: boolean
}

interface FeatureRowDef {
  key: string
  label: string
  description?: string
  formatValue: (plan: BillingPlan) => string | boolean
}

interface FeatureCategoryDef {
  id: string
  title: string
  icon: typeof SearchIcon
  rows: FeatureRowDef[]
}

const Pricing = ({ onboarding = false }: PricingProps) => {
  const { t, locale } = useI18n()
  const { billing, loading: billingLoading, openCustomerPortal } = useBilling()
  const { formatAmountMinor } = useCurrency()
  const [plans, setPlans] = useState<BillingPlan[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- modules fetched for future dynamic pricing, kept for admin parity
  const [modules, setModules] = useState<PlatformModuleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false)
  const [contactSalesDialogOpen, setContactSalesDialogOpen] = useState(false)
  const [contactPlan, setContactPlan] = useState<BillingPlan | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [sendingContact, setSendingContact] = useState(false)
  const [startingTrial, setStartingTrial] = useState(false)

  const formatBytes = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return t('pricingPage.limitUnlimited')

    if (bytes >= 1073741824) {
      const gb = Math.round((bytes / 1073741824) * 10) / 10

      return `${gb} GB`
    }

    const mb = Math.round((bytes / 1048576) * 10) / 10

    return `${mb} MB`
  }

  const intervalLabel = (plan: BillingPlan): string => {
    if (plan.interval === 'free') {
      if (plan.durationSeconds === null || plan.durationSeconds === undefined) {
        return t('pricingPage.intervalFree')
      }

      const hours = Math.round(plan.durationSeconds / 3600)

      return t('pricingPage.intervalHourDemo', { hours })
    }

    if (plan.interval === 'one_time') {
      if (plan.durationSeconds === null || plan.durationSeconds === undefined) {
        return t('pricingPage.intervalOneTime')
      }

      const hours = Math.round(plan.durationSeconds / 3600)

      return t('pricingPage.intervalHourPass', { hours })
    }

    const unit = plan.interval === 'month' ? t('pricingPage.intervalMonth') : plan.interval === 'year' ? t('pricingPage.intervalYear') : plan.interval

    return `/${unit}`
  }

  useEffect(() => {
    let active = true

    void fetch(`/api/billing/plans?locale=${encodeURIComponent(locale)}`)
      .then(async response => {
        const payload = (await response.json()) as {
          plans?: BillingPlan[]
          modules?: PlatformModuleSummary[]
          error?: { messageKey?: string }
        }

        if (!response.ok) {
          throw new Error(payload.error?.messageKey ?? 'billing.plansUnavailable')
        }

        if (active) {
          setPlans(payload.plans ?? [])
          setModules(payload.modules ?? [])
        }
      })
      .catch(requestError => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'billing.plansUnavailable')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [locale])

  const startCheckout = (plan: BillingPlan) => {
    if (plan.contactSales) {
      setContactPlan(plan)
      setContactSalesDialogOpen(true)

      return
    }

    if (billingLoading) {
      setError('billing.summaryUnavailable')
      toast.error('billing.summaryUnavailable')

      return
    }

    if (billing?.accountStatus === 'anonymous') {
      setRegistrationDialogOpen(true)

      return
    }

    window.location.assign(`/pages/billing/upgrade?plan=${encodeURIComponent(plan.code)}`)
  }

  const handleStartTrial = async () => {
    if (billingLoading) {
      setError('billing.summaryUnavailable')
      toast.error('billing.summaryUnavailable')

      return
    }

    if (billing?.accountStatus === 'anonymous') {
      setRegistrationDialogOpen(true)

      return
    }

    setStartingTrial(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/access/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { messageKey?: string } }

        throw new Error(payload.error?.messageKey ?? 'billing.trialUnavailable')
      }

      window.location.assign('/apps/investigator')
    } catch (trialError) {
      const errorMsg = trialError instanceof Error ? trialError.message : 'billing.trialUnavailable'

      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setStartingTrial(false)
    }
  }

  const handleSendContactSales = (e: React.FormEvent) => {
    e.preventDefault()
    setSendingContact(true)

    setTimeout(() => {
      setSendingContact(false)
      setContactSalesDialogOpen(false)
      setContactForm({ name: '', email: '', message: '' })
      toast.success(t('pricingPage.contactSalesSuccess'))
    }, 600)
  }

  // All plans displayed in a single unified screen, sorted naturally by price
  const allDisplayedPlans = useMemo(() => {
    return plans
      .filter(plan => plan.isPublic !== false)
      .sort((a, b) => a.amountMinor - b.amountMinor)
  }, [plans])

  // Comparison Categories Definition built dynamically with i18n + auto-discover de nuevas entitlements
  const comparisonCategories: FeatureCategoryDef[] = useMemo(() => {
    const baseCategories: FeatureCategoryDef[] = [
      {
        id: 'investigator',
        title: t('pricingPage.catInvestigator'),
        icon: SearchIcon,
        rows: [
          {
            key: 'modules.investigator',
            label: t('pricingPage.featInvestigatorAccess'),
            description: t('pricingPage.featInvestigatorAccessDesc'),
            formatValue: plan => {
              const hasModule =
                plan.features?.some(f => f.toLowerCase() === 'modules.investigator') ||
                plan.limits['modules.investigator'] !== undefined

              return hasModule
            }
          },
          {
            key: 'investigations.create',
            label: t('pricingPage.featStrategicMatrices'),
            description: t('pricingPage.featStrategicMatricesDesc'),
            formatValue: plan => {
              const hasFeature =
                plan.features?.some(f => f.toLowerCase() === 'investigations.create') ||
                plan.limits['investigations.create'] !== undefined

              return hasFeature
            }
          },
          {
            key: 'investigations.max_active',
            label: t('pricingPage.featSimultaneousInvestigations'),
            description: t('pricingPage.featSimultaneousInvestigationsDesc'),
            formatValue: plan => {
              const limit = plan.limits['investigations.max_active']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return limit === 1
                ? t('pricingPage.limitActiveSingular', { count: 1 })
                : t('pricingPage.limitActivePlural', { count: limit })
            }
          },
          {
            key: 'investigations.export_pdf_monthly',
            label: t('pricingPage.featExportPdfMonthly'),
            description: t('pricingPage.featExportPdfMonthlyDesc'),
            formatValue: plan => {
              const limit = plan.limits['investigations.export_pdf_monthly']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return t('pricingPage.limitUpToMonthly', { count: limit })
            }
          }
        ]
      },
      {
        id: 'kanban',
        title: t('pricingPage.catKanban'),
        icon: FolderKanbanIcon,
        rows: [
          {
            key: 'modules.kanban',
            label: t('pricingPage.featKanbanAccess'),
            description: t('pricingPage.featKanbanAccessDesc'),
            formatValue: plan => {
              const hasModule =
                plan.features?.some(f => f.toLowerCase() === 'modules.kanban' || f.toLowerCase() === 'modules.kanbam') ||
                plan.limits['modules.kanban'] !== undefined ||
                plan.limits['modules.kanbam'] !== undefined

              return hasModule
            }
          },
          {
            key: 'kanban.projects_max',
            label: t('pricingPage.featKanbanProjectsMax'),
            description: t('pricingPage.featKanbanProjectsMaxDesc'),
            formatValue: plan => {
              const hasModule =
                plan.features?.some(f => f.toLowerCase() === 'modules.kanban' || f.toLowerCase() === 'modules.kanbam') ||
                plan.limits['modules.kanban'] !== undefined ||
                plan.limits['modules.kanbam'] !== undefined

              if (!hasModule) return false
              const limit = plan.limits['kanban.projects_max'] ?? plan.limits['kanban.max_projects']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return t('pricingPage.limitUpToProjects', { count: limit })
            }
          },
          {
            key: 'kanban.tasks_max',
            label: t('pricingPage.featKanbanTasksMax'),
            description: t('pricingPage.featKanbanTasksMaxDesc'),
            formatValue: plan => {
              const hasModule =
                plan.features?.some(f => f.toLowerCase() === 'modules.kanban' || f.toLowerCase() === 'modules.kanbam') ||
                plan.limits['modules.kanban'] !== undefined ||
                plan.limits['modules.kanbam'] !== undefined

              if (!hasModule) return false
              const limit = plan.limits['kanban.tasks_max'] ?? plan.limits['kanban.max_tasks']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return t('pricingPage.limitUpToTasks', { count: limit })
            }
          }
        ]
      },
      {
        id: 'novai',
        title: (t('pricingPage.catNovai') as string) || 'App NovAi',
        icon: SparklesIcon,
        rows: [
          {
            key: 'modules.novai',
            label: (t('pricingPage.featNovaiAccess') as string) || 'Acceso a NovAi',
            description: (t('pricingPage.featNovaiAccessDesc') as string) || 'Asistente conversacional para toda NovaStore (Investigador, Kanban).',
            formatValue: plan => {
              const hasModule =
                plan.features?.some(f => f.toLowerCase() === 'modules.novai') ||
                plan.limits['modules.novai'] !== undefined

              return hasModule
            }
          },
          {
            key: 'limits.ai_queries_monthly',
            label: (t('pricingPage.featAiQueriesMonthly') as string) || 'Consultas IA mensuales',
            description: (t('pricingPage.featAiQueriesMonthlyDesc') as string) || 'Cuota de consultas IA al mes por workspace.',
            formatValue: plan => {
              const limit = plan.limits['limits.ai_queries_monthly']

              if (limit === null || limit === undefined) {
                const hasModule =
                  plan.features?.some(f => f.toLowerCase() === 'modules.novai') ||
                  plan.limits['modules.novai'] !== undefined

                return hasModule ? t('pricingPage.limitUnlimited') : false
              }

              return t('pricingPage.limitUpToMonthly', { count: limit })
            }
          },
          {
            key: 'limits.ai_queries_daily',
            label: (t('pricingPage.featAiQueriesDaily') as string) || 'Consultas IA diarias',
            description: (t('pricingPage.featAiQueriesDailyDesc') as string) || 'Tope diario de consultas IA (24h).',
            formatValue: plan => {
              const limit = plan.limits['limits.ai_queries_daily']

              if (limit === null || limit === undefined) {
                const hasModule =
                  plan.features?.some(f => f.toLowerCase() === 'modules.novai') ||
                  plan.limits['modules.novai'] !== undefined

                return hasModule ? t('pricingPage.limitUnlimited') : false
              }

              return t('pricingPage.limitUpToDaily', { count: limit }) || `Hasta ${limit} al día`
            }
          }
        ]
      },
      {
        id: 'workspace',
        title: t('pricingPage.catWorkspace'),
        icon: UsersIcon,
        rows: [
          {
            key: 'users.max_members',
            label: t('pricingPage.featCollaboratorsPerSpace'),
            description: t('pricingPage.featCollaboratorsPerSpaceDesc'),
            formatValue: plan => {
              const limit = plan.limits['users.max_members']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return limit === 1 ? t('pricingPage.limitSingleUser') : t('pricingPage.limitUpToMembers', { count: limit })
            }
          },
          {
            key: 'teams.max_teams',
            label: t('pricingPage.featWorkTeams'),
            description: t('pricingPage.featWorkTeamsDesc'),
            formatValue: plan => {
              const limit = plan.limits['teams.max_teams']

              if (limit === null || limit === undefined) return t('pricingPage.limitUnlimited')

              return limit === 1 ? t('pricingPage.limitSingleTeam') : t('pricingPage.limitUpToTeams', { count: limit })
            }
          },
          {
            key: 'storage.max_bytes',
            label: t('pricingPage.featCloudStorage'),
            description: t('pricingPage.featCloudStorageDesc'),
            formatValue: plan => formatBytes(plan.limits['storage.max_bytes'])
          }
        ]
      }
    ]

    // Auto-descubrimiento: cualquier entitlement/límite no cubierto arriba se muestra automáticamente
    // para que un nuevo plan creado vía UI no requiera tocar código
    const knownKeys = new Set(baseCategories.flatMap(c => c.rows.map(r => r.key.toLowerCase())))
    const distinct = new Map<string, string>()

    for (const plan of plans) {
      for (const f of plan.features ?? []) {
        const lk = f.toLowerCase()

        if (!knownKeys.has(lk) && !distinct.has(lk)) distinct.set(lk, f)
      }

      for (const k of Object.keys(plan.limits ?? {})) {
        const lk = k.toLowerCase()

        if (!knownKeys.has(lk) && !distinct.has(lk)) distinct.set(lk, k)
      }
    }

    if (distinct.size > 0) {
      baseCategories.push({
        id: 'other',
        title: 'Otras Capacidades',
        icon: SparklesIcon,
        rows: Array.from(distinct.values()).map(key => ({
          key,
          label: key,
          description: '',
          formatValue: (plan: BillingPlan) => {
            const hasFeature = plan.features?.some(f => f.toLowerCase() === key.toLowerCase())

            if (hasFeature) return true
            const limit = (plan.limits as Record<string, unknown>)[key] ?? (plan.limits as Record<string, unknown>)[key.toLowerCase()]

            if (limit === null || limit === undefined) return false
            if (typeof limit === 'boolean') return limit

            return String(limit)
          }
        }))
      })
    }

    return baseCategories
  // eslint-disable-next-line react-hooks/exhaustive-deps -- formatBytes is stable helper
  }, [t, plans])

  const renderActionButton = (plan: BillingPlan, variant: 'default' | 'outline' = 'default') => {
    if (plan.code === 'trial' || plan.interval === 'free' || plan.amountMinor === 0) {
      return (
        <Button
          className='w-full text-xs font-semibold'
          size='sm'
          variant={variant}
          disabled={startingTrial || billingLoading}
          onClick={() => void handleStartTrial()}
        >
          {startingTrial ? '...' : t('pricingPage.btnStartTrial')}
        </Button>
      )
    }

    if (plan.contactSales) {
      return (
        <Button
          className='w-full text-xs font-semibold'
          size='sm'
          variant={variant}
          onClick={() => {
            setContactPlan(plan)
            setContactSalesDialogOpen(true)
          }}
        >
          {t('pricingPage.btnConsult')}
        </Button>
      )
    }

    const isCurrentPlan = billing?.plan?.code === plan.code
    const hasActiveSubscription = billing?.subscription?.status === 'active'
    const checkoutAvailable = plan.providerPriceId !== null

    return (
      <Button
        className='w-full text-xs font-semibold'
        size='sm'
        variant={isCurrentPlan ? 'outline' : variant}
        disabled={
          startingTrial ||
          billingLoading ||
          isCurrentPlan ||
          (!checkoutAvailable && !hasActiveSubscription)
        }
        onClick={() => {
          if (hasActiveSubscription && !isCurrentPlan) {
            void openCustomerPortal()
          } else {
            void startCheckout(plan)
          }
        }}
      >
        {isCurrentPlan
          ? t('pricingPage.btnCurrentPlan')
          : hasActiveSubscription
            ? t('pricingPage.btnManagePlan')
            : !checkoutAvailable
              ? t('pricingPage.btnConsult')
              : plan.interval === 'one_time'
                ? t('pricingPage.btnBuyAccess')
                : t('pricingPage.btnChoosePlan')}
      </Button>
    )
  }

  return (
    <div className='flex flex-col gap-8 pb-16'>
      {/* Top Header */}
      <div className='flex flex-col items-center justify-center text-center gap-2 pt-2'>
        <span className='text-[11px] font-bold tracking-widest text-primary uppercase'>{t('pricingPage.kicker')}</span>
        <h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground'>
          {t('pricingPage.title')}
        </h1>
        <p className='text-muted-foreground text-sm max-w-2xl'>
          {t('pricingPage.subtitle')}
        </p>
      </div>

      {onboarding ? (
        <Card className='border-primary/20 bg-muted/40'>
          <CardContent className='py-4'>
            <p className='font-medium text-foreground'>{t('pricingPage.onboardingTitle')}</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('pricingPage.onboardingDesc')}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p className='text-destructive text-sm text-center' role='alert'>
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4' aria-busy='true'>
          {[0, 1, 2, 3].map(index => (
            <Card key={index}>
              <CardContent className='p-6 flex flex-col gap-4'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-8 w-24 mt-4' />
                <Skeleton className='h-10 w-full mt-2' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allDisplayedPlans.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2'>
            <p className='font-medium text-foreground'>{t('pricingPage.noPlansTitle')}</p>
            <p className='text-xs'>
              {t('pricingPage.noPlansDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (

        /* Unified 1:1 Flat Pricing Table Matrix with Full Multiline Text Wrapping */
        <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <Table className='w-full table-fixed border-collapse'>
              <TableHeader className='bg-card'>
                {/* Row 1: Plan Summary & Pricing (Flat Design, Fully Wrapped Descriptions) */}
                <TableRow className='border-b border-border/80 hover:bg-transparent'>
                  {/* First Column Header: Fixed Width */}
                  <TableHead className='w-[250px] min-w-[280px] max-w-[200px] p-6 align-bottom bg-transparent whitespace-normal'>
                    <div className='flex flex-col gap-1 pr-2'>
                      <span className='text-[11px] font-bold tracking-wider text-primary uppercase'>
                        {t('pricingPage.tableHeaderPlans')}
                      </span>
                      <h3 className='text-xl font-extrabold text-foreground tracking-tight'>
                        {t('pricingPage.tableHeaderWorkspacePlans')}
                      </h3>
                      <p className='text-xs text-muted-foreground leading-relaxed whitespace-normal break-words'>
                        {t('pricingPage.tableHeaderPlansDesc')}
                      </p>
                    </div>
                  </TableHead>

                  {/* Plan Columns in Flat Header Cells */}
                  {allDisplayedPlans.map(plan => {
                    const isCurrent = billing?.plan?.code === plan.code

                    const isLifetime =
                      plan.interval === 'one_time' &&
                      (plan.durationSeconds === null || plan.durationSeconds === undefined)

                    const isDemo = plan.code === 'trial' || plan.interval === 'free' || plan.amountMinor === 0

                    return (
                      <TableHead
                        key={plan.id}
                        className='w-[180px] min-w-[180px] p-5 align-top bg-transparent text-left whitespace-normal'
                      >
                        <div className='flex flex-col justify-between h-full gap-4'>
                          <div className='flex flex-col gap-1.5'>
                            <div className='flex items-center justify-between gap-1'>
                              <span className='text-base font-bold text-foreground truncate'>
                                {plan.name}
                              </span>
                              {isCurrent ? (
                                <Badge
                                  variant='outline'
                                  className='border-primary text-primary text-[10px] px-1.5 py-0 shrink-0'
                                >
                                  {t('pricingPage.badgeCurrent')}
                                </Badge>
                              ) : isLifetime ? (
                                <Badge variant='secondary' className='text-[10px] px-1.5 py-0 shrink-0'>
                                  {t('pricingPage.badgeLifetime')}
                                </Badge>
                              ) : isDemo ? (
                                <Badge variant='outline' className='text-[10px] px-1.5 py-0 shrink-0'>
                                  {t('pricingPage.badgeFree')}
                                </Badge>
                              ) : null}
                            </div>

                            <p className='text-xs text-muted-foreground leading-relaxed whitespace-normal break-words min-h-[40px]'>
                              {plan.description ?? ''}
                            </p>

                            <div className='mt-2 flex items-baseline gap-1 flex-wrap'>
                              <span className='text-lg font-black text-foreground tracking-tight'>
                                {isDemo
                                  ? 'Free'
                                  : plan.contactSales
                                    ? t('pricingPage.btnConsult')
                                    : plan.providerPriceId
                                      ? formatAmountMinor(plan.amountMinor, plan.currency)
                                      : t('pricingPage.btnConsult')}
                              </span>
                              {!isDemo && !plan.contactSales ? (
                                <span className='text-xs text-muted-foreground font-medium'>
                                  {intervalLabel(plan)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className='pt-1'>
                            {renderActionButton(plan)}
                          </div>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>

                {/* Row 2: Sub-header labels */}
                <TableRow className='border-b border-border bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='w-[320px] min-w-[300px] max-w-[340px] text-xs font-bold text-muted-foreground uppercase tracking-wider py-3 pl-6 pr-4 whitespace-normal'>
                    {t('pricingPage.tableHeaderFeatures')}
                  </TableHead>
                  {allDisplayedPlans.map(plan => (
                    <TableHead
                      key={plan.id}
                      className='text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-3 px-3 w-[190px] min-w-[180px] whitespace-normal'
                    >
                      {plan.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {comparisonCategories.map(category => {
                  const CategoryIcon = category.icon

                  return (
                    <Fragment key={category.id}>
                      {/* Category Section Header Row */}
                      <TableRow className='border-t border-border bg-muted/20 hover:bg-muted/20'>
                        <TableCell
                          colSpan={allDisplayedPlans.length + 1}
                          className='py-3 pl-6 font-bold text-xs sm:text-sm text-foreground whitespace-normal'
                        >
                          <div className='flex items-center gap-2'>
                            <CategoryIcon className='size-4 text-primary shrink-0' />
                            <span>{category.title}</span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Feature Rows with multiline wrapping */}
                      {category.rows.map(row => (
                        <TableRow
                          key={row.key}
                          className='border-b border-border/40 hover:bg-muted/10 transition-colors'
                        >
                          <TableCell className='w-[320px] min-w-[300px] max-w-[340px] py-4 pl-6 pr-6 align-middle whitespace-normal break-words'>
                            <div className='font-medium text-xs sm:text-sm text-foreground leading-snug break-words whitespace-normal'>
                              {row.label}
                            </div>
                            {row.description ? (
                              <div className='text-[11px] text-muted-foreground mt-1 leading-relaxed break-words whitespace-normal'>
                                {row.description}
                              </div>
                            ) : null}
                          </TableCell>

                          {allDisplayedPlans.map(plan => {
                            const value = row.formatValue(plan)

                            return (
                              <TableCell
                                key={plan.id}
                                className='w-[190px] min-w-[180px] py-4 px-3 text-center align-middle text-xs sm:text-sm whitespace-normal'
                              >
                                {typeof value === 'boolean' ? (
                                  value ? (
                                    <div className='size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto'>
                                      <CheckIcon className='size-3.5 stroke-[2.5]' />
                                    </div>
                                  ) : (
                                    <div className='size-6 rounded-full bg-muted text-muted-foreground/30 flex items-center justify-center mx-auto'>
                                      <MinusIcon className='size-3.5' />
                                    </div>
                                  )
                                ) : (
                                  <span className='font-semibold text-foreground break-words whitespace-normal'>
                                    {value}
                                  </span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Contact Sales / Custom Quote Dialog */}
      <Dialog open={contactSalesDialogOpen} onOpenChange={setContactSalesDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('pricingPage.btnConsult')} — {contactPlan?.name}</DialogTitle>
            <DialogDescription>
              {t('pricingPage.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendContactSales} className='flex flex-col gap-4 py-2'>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='contactName'>{t('userSettings.displayName')}</Label>
              <Input
                id='contactName'
                required
                placeholder={t('userSettings.displayName')}
                value={contactForm.name}
                onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='contactEmail'>{t('auth.businessEmail')}</Label>
              <Input
                id='contactEmail'
                type='email'
                required
                placeholder={t('auth.emailPlaceholder')}
                value={contactForm.email}
                onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='contactMessage'>{t('pricing.customSolution')}</Label>
              <Textarea
                id='contactMessage'
                rows={3}
                placeholder={t('common.description')}
                value={contactForm.message}
                onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <DialogFooter className='gap-2 pt-2 sm:gap-0'>
              <Button type='button' variant='outline' onClick={() => setContactSalesDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type='submit' disabled={sendingContact}>
                <SendIcon className='mr-2 size-3.5' />
                {sendingContact ? '...' : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Guest registration dialog */}
      <Dialog open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.signUp')}</DialogTitle>
            <DialogDescription>
              {t('auth.welcomeDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button variant='outline' onClick={() => setRegistrationDialogOpen(false)}>
              {t('auth.guestTrial')}
            </Button>
            <Button onClick={() => window.location.assign('/pages/auth/register')}>
              {t('auth.createAccount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Pricing
