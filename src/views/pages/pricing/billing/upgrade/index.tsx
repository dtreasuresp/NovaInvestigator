'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CreditCardIcon,
  HomeIcon,
  InfoIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UserIcon
} from 'lucide-react'
import { toast } from 'sonner'

import type { BillingPlan, CheckoutContext, CheckoutResponse } from '@/lib/billing/types'
import { WORLD_COUNTRIES } from '@/lib/countries/countries-data'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Stepper,
  StepperContent,
  StepperItem,
  StepperList,
  useStepper
} from '@/components/ui/stepper'
import { useCurrency } from '@/hooks/use-currency'
import { useI18n } from '@/hooks/use-i18n'

type UpgradeWizardProps = {
  initialPlanCode: string | null
}

const STEP_ORDER = ['account', 'personal', 'confirm'] as const

const intervalLabel = (plan: BillingPlan): string => {
  if (plan.interval === 'one_time') {
    if (plan.durationSeconds === null || plan.durationSeconds === undefined) {
      return '/pago único'
    }

    const hours = Math.round(plan.durationSeconds / 3600)

    return `/${hours}h`
  }

  return `/${plan.interval === 'month' ? 'month' : plan.interval === 'year' ? 'year' : plan.interval}`
}

const formatPlanPrice = (amountMinor: number): string => {
  const value = amountMinor / 100

  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

const friendlyError = (key: string | null | undefined): string => {
  switch (key) {
    case 'billing.checkout.subscription_in_progress':
    case 'billing.subscriptionCheckoutInProgress':
      return 'Ya existe un proceso de compra en curso para este espacio de trabajo.'
    case 'billing.subscriptionAlreadyActive':
      return 'Este espacio de trabajo ya tiene una suscripción activa con las mismas características.'
    case 'billing.checkoutFailed':
      return 'No se pudo crear la sesión de pago. Inténtalo de nuevo.'
    case 'billing.forbidden':
      return 'No tienes autorización para comprar en este espacio de trabajo.'
    case 'billing.rateLimited':
      return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
    case 'billing.unauthenticated':
      return 'Tu sesión expiró. Inicia sesión nuevamente.'
    default:
      return key ?? 'No se pudo completar la operación.'
  }
}

interface PlanDifference {
  label: string
  current: string
  target: string
  isDowngrade: boolean
}

interface PlanTransition {
  type: 'upgrade' | 'downgrade' | 'same_plan' | 'new_subscription'
  differences: PlanDifference[]
}

function getPlanTransition(currentPlan: BillingPlan | null, targetPlan: BillingPlan | null): PlanTransition {
  if (!targetPlan) {
    return { type: 'new_subscription', differences: [] }
  }

  if (!currentPlan) {
    return { type: 'new_subscription', differences: [] }
  }

  if (currentPlan.code === targetPlan.code) {
    return { type: 'same_plan', differences: [] }
  }

  const differences: PlanDifference[] = []

  // Compare price
  const isPriceLower = targetPlan.amountMinor < currentPlan.amountMinor

  differences.push({
    label: 'Precio e intervalo',
    current: `$${(currentPlan.amountMinor / 100).toFixed(2)}${intervalLabel(currentPlan)}`,
    target: `$${(targetPlan.amountMinor / 100).toFixed(2)}${intervalLabel(targetPlan)}`,
    isDowngrade: isPriceLower
  })

  // Compare active investigations
  const currentMaxActive = currentPlan.limits['investigations.max_active'] ?? null
  const targetMaxActive = targetPlan.limits['investigations.max_active'] ?? null

  const isMaxActiveReduced =
    currentMaxActive === null && targetMaxActive !== null
      ? true
      : currentMaxActive !== null && targetMaxActive !== null && targetMaxActive < currentMaxActive

  differences.push({
    label: 'Investigaciones activas simultáneas',
    current: currentMaxActive === null ? 'Ilimitadas' : `${currentMaxActive} activa(s)`,
    target: targetMaxActive === null ? 'Ilimitadas' : `${targetMaxActive} activa(s)`,
    isDowngrade: Boolean(isMaxActiveReduced)
  })

  // Compare PDF exports
  const currentPdf = currentPlan.limits['investigations.export_pdf_monthly'] ?? null
  const targetPdf = targetPlan.limits['investigations.export_pdf_monthly'] ?? null

  const isPdfReduced =
    currentPdf === null && targetPdf !== null
      ? true
      : currentPdf !== null && targetPdf !== null && targetPdf < currentPdf

  differences.push({
    label: 'Exportación de informes en PDF',
    current: currentPdf === null ? 'Ilimitada' : `${currentPdf} al mes`,
    target: targetPdf === null ? 'Ilimitada' : `${targetPdf} al mes`,
    isDowngrade: Boolean(isPdfReduced)
  })

  // Compare modules
  const currentHasKanban = currentPlan.features.includes('modules.kanban')
  const targetHasKanban = targetPlan.features.includes('modules.kanban')

  if (currentHasKanban && !targetHasKanban) {
    differences.push({
      label: 'Módulo Projects (Kanban)',
      current: 'Incluido',
      target: 'No incluido',
      isDowngrade: true
    })
  }

  const isDowngrade = isPriceLower || isMaxActiveReduced || isPdfReduced || (currentHasKanban && !targetHasKanban)

  return {
    type: isDowngrade ? 'downgrade' : 'upgrade',
    differences
  }
}

const UpgradeWizard = ({ initialPlanCode }: UpgradeWizardProps) => {
  const { t } = useI18n()
  const { formatAmountMinor } = useCurrency()

  const [context, setContext] = useState<CheckoutContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [planCode, setPlanCode] = useState<string>('')
  const [checkingOut, setCheckingOut] = useState(false)

  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false)
  const [downgradeAgreed, setDowngradeAgreed] = useState(false)

  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    country: ''
  })

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: ''
  })

  useEffect(() => {
    let active = true

    void fetch('/api/billing/checkout/context')
      .then(async response => {
        const payload = (await response.json()) as CheckoutContext & { error?: { messageKey?: string } }

        if (!response.ok) {
          throw new Error(payload.error?.messageKey ?? 'billing.checkoutFailed')
        }

        if (active) {
          setContext(payload)

          const fullName = payload.profile.displayName ?? ''
          const [first, ...rest] = fullName.split(' ')

          setPersonal(prev => ({
            ...prev,
            firstName: payload.profile.firstName || first || '',
            lastName: payload.profile.lastName || rest.join(' '),
            mobile: payload.purchaseAddress?.mobile || payload.profile.mobile || '',
            country: payload.purchaseAddress?.country || payload.profile.country || 'US'
          }))

          if (payload.purchaseAddress) {
            setAddress({
              line1: payload.purchaseAddress.line1 ?? '',
              line2: payload.purchaseAddress.line2 ?? '',
              city: payload.purchaseAddress.city ?? '',
              state: payload.purchaseAddress.state ?? '',
              postalCode: payload.purchaseAddress.postalCode ?? ''
            })
          }

          const availablePlans = payload.plans ?? []
          const matchedInitial = availablePlans.find((plan: BillingPlan) => plan.code === initialPlanCode)
          const currentPlanCode = payload.currentPlan?.code
          const matchedCurrent = availablePlans.find((plan: BillingPlan) => plan.code === currentPlanCode)

          let targetCode = ''
          if (matchedInitial) {
            targetCode = matchedInitial.code
          } else if (matchedCurrent) {
            targetCode = matchedCurrent.code
          } else {
            const firstPaid = availablePlans.find(
              (plan: BillingPlan) => plan.providerPriceId !== null && plan.code !== 'try_demo'
            )
            const firstPurchasable = firstPaid || availablePlans.find((plan: BillingPlan) => plan.providerPriceId !== null)

            if (firstPurchasable) {
              targetCode = firstPurchasable.code
            }
          }

          if (targetCode) {
            setPlanCode(targetCode)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.set('plan', targetCode)
              window.history.replaceState(null, '', url.toString())
            }
          }
        }
      })
      .catch(fetchError => {
        if (active) {
          const errorMsg = fetchError instanceof Error ? fetchError.message : 'billing.checkoutFailed'

          setError(friendlyError(errorMsg))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [initialPlanCode])

  const plans: BillingPlan[] = useMemo(() => {
    const list = [...(context?.plans ?? [])]

    return list.sort((a: BillingPlan, b: BillingPlan) => a.amountMinor - b.amountMinor)
  }, [context])

  const currentActivePlan = useMemo(() => {
    if (!context?.currentPlan) return null

    return plans.find((p: BillingPlan) => p.code === context.currentPlan?.code) ?? null
  }, [context, plans])

  const selectedPlan = useMemo(() => plans.find((p: BillingPlan) => p.code === planCode) ?? null, [plans, planCode])

  const selectedPlanTransition = useMemo(
    () => getPlanTransition(currentActivePlan, selectedPlan),
    [currentActivePlan, selectedPlan]
  )

  const isDelegated = context?.authorization ? context.authorization.source !== 'owner' : false
  const hasValidPlan = Boolean(selectedPlan && selectedPlan.providerPriceId)
  const checkoutWorkspaceId = context?.authorization?.workspaceId
  const hasActivePlan = Boolean(context?.currentPlan)

  const handleSelectPlan = (code: string) => {
    setPlanCode(code)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('plan', code)
      window.history.replaceState(null, '', url.toString())
    }
  }

  const completePurchase = async (forceBypassDowngradeWarning = false) => {
    if (!selectedPlan || !selectedPlan.providerPriceId) {
      toast.error('Selecciona un plan disponible para continuar.')

      return false
    }

    if (selectedPlan.interval !== 'one_time' && !checkoutWorkspaceId) {
      toast.error('No se pudo determinar el espacio de trabajo de destino.')

      return false
    }

    // If it's a downgrade and not explicitly confirmed yet, open warning dialog
    if (selectedPlanTransition.type === 'downgrade' && !forceBypassDowngradeWarning && !downgradeAgreed) {
      setDowngradeModalOpen(true)

      return false
    }

    setCheckingOut(true)
    setError(null)

    try {
      if (isDelegated) {
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: personal.firstName,
            lastName: personal.lastName,
            mobile: personal.mobile,
            country: personal.country,
            billingAddress: {
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: personal.country
            }
          })
        })
      }

      const checkoutResponse = await fetch(
        `/api/billing/checkout${selectedPlan.interval === 'one_time' ? '/one-time' : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planCode: selectedPlan.code,
            ...(selectedPlan.interval !== 'one_time' ? { workspaceId: checkoutWorkspaceId } : {})
          })
        }
      )

      const checkoutPayload = (await checkoutResponse.json()) as Partial<CheckoutResponse> & {
        error?: { messageKey?: string }
      }

      if (!checkoutResponse.ok || !checkoutPayload.checkoutUrl) {
        throw new Error(checkoutPayload.error?.messageKey ?? 'billing.checkoutFailed')
      }

      window.location.assign(checkoutPayload.checkoutUrl)

      return true
    } catch (purchaseError) {
      const errorMsg = purchaseError instanceof Error ? purchaseError.message : 'billing.checkoutFailed'

      setError(friendlyError(errorMsg))
      toast.error(friendlyError(errorMsg))

      return false
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className='space-y-6' aria-busy='true'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-16 w-full' />
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[0, 1, 2].map(index => (
            <Skeleton key={index} className='h-44 w-full' />
          ))}
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <Card className='border-destructive/40 bg-destructive/5'>
        <CardContent className='p-6'>
          <p className='text-sm text-destructive'>{error ?? 'No se pudo cargar el contexto de facturación.'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='w-full space-y-6 sm:p-8 lg:p-10'>
      {/* Title & Subtitle */}
      <div className='space-y-1'>
        <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>{t('billing.upgradePlan')}</h1>
        <p className='text-sm text-muted-foreground'>
          Configura tus datos, selecciona el plan ideal y potencia tu espacio de trabajo.
        </p>
      </div>

      <Stepper defaultValue='account' className='w-full space-y-8'>
        {/* Custom Stepper Header: Basic Icons - Horizontal (Equidistant Chevrons, No Horizontal Line) */}
        <CustomStepperHeader />

        {/* Step 1: Account Details */}
        <StepperContent value='account' className='border-none bg-transparent p-0 shadow-none'>
          <div className='space-y-6'>
            <div>
              <h3 className='text-xl font-bold tracking-tight text-foreground'>{t('userSettings.profileDetails')}</h3>
              <p className='text-sm text-muted-foreground'>{t('userSettings.accountManagementDesc')}</p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='checkout-account-name'>{t('platform.planName')}</FieldLabel>
                <FieldContent>
                  <Input
                    id='checkout-account-name'
                    value={context.profile.displayName ?? ''}
                    disabled
                    className='bg-muted/40'
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor='checkout-account-email'>{t('userSettings.emailPasswordTitle')}</FieldLabel>
                <FieldContent>
                  <Input
                    id='checkout-account-email'
                    type='email'
                    value={context.profile.email ?? ''}
                    disabled
                    className='bg-muted/40'
                  />
                </FieldContent>
              </Field>
            </div>

            <div className='rounded-lg border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed'>
              <p className='font-semibold text-foreground mb-1'>{t('userSettings.role')}</p>
              {isDelegated ? (
                <p>
                  {t('billing.delegatedRoleNotice') || 'Estás operando bajo permiso delegado en el espacio de trabajo. La factura y recibo se emitirán a tu nombre, vinculados a la organización.'}
                </p>
              ) : (
                <p>
                  {t('billing.ownerRoleNotice') || 'Eres el propietario (Owner) de este espacio de trabajo.'}
                </p>
              )}
            </div>
          </div>
        </StepperContent>

        {/* Step 2: Personal Information */}
        <StepperContent value='personal' className='border-none bg-transparent p-0 shadow-none'>
          <div className='space-y-6'>
            <div>
              <h3 className='text-xl font-bold tracking-tight text-foreground'>{t('userSettings.personalInfo')}</h3>
              <p className='text-sm text-muted-foreground'>{t('userSettings.personalInfoDesc')}</p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='checkout-personal-first-name'>{t('userSettings.firstName')}</FieldLabel>
                <FieldContent>
                  <Input
                    id='checkout-personal-first-name'
                    value={personal.firstName}
                    onChange={event => setPersonal(prev => ({ ...prev, firstName: event.target.value }))}
                    placeholder={t('userSettings.firstName')}
                    autoComplete='given-name'
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor='checkout-personal-last-name'>{t('userSettings.lastName')}</FieldLabel>
                <FieldContent>
                  <Input
                    id='checkout-personal-last-name'
                    value={personal.lastName}
                    onChange={event => setPersonal(prev => ({ ...prev, lastName: event.target.value }))}
                    placeholder={t('userSettings.lastName')}
                    autoComplete='family-name'
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor='checkout-personal-country'>{t('userSettings.country')}</FieldLabel>
                <FieldContent>
                  <Select
                    value={personal.country}
                    onValueChange={value => setPersonal(prev => ({ ...prev, country: value ?? '' }))}
                  >
                    <SelectTrigger id='checkout-personal-country' className='w-full'>
                      <SelectValue placeholder={t('userSettings.selectCountry')} />
                    </SelectTrigger>
                    <SelectContent>
                      {WORLD_COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor='checkout-personal-mobile'>{t('userSettings.mobile')}</FieldLabel>
                <FieldContent>
                  <Input
                    id='checkout-personal-mobile'
                    type='tel'
                    value={personal.mobile}
                    onChange={event => setPersonal(prev => ({ ...prev, mobile: event.target.value }))}
                    placeholder={t('userSettings.mobilePlaceholder') || '+34 600 000 000'}
                    autoComplete='tel'
                  />
                </FieldContent>
              </Field>
            </div>

            {isDelegated ? (
              <>
                <Separator />
                <div className='space-y-4'>
                  <h4 className='text-sm font-semibold text-foreground'>{t('userSettings.billingAddressTitle')}</h4>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <Field className='sm:col-span-2'>
                      <FieldLabel htmlFor='checkout-address-line1'>{t('userSettings.addressLine1')}</FieldLabel>
                      <FieldContent>
                        <Input
                          id='checkout-address-line1'
                          value={address.line1}
                          onChange={event => setAddress(prev => ({ ...prev, line1: event.target.value }))}
                          placeholder={t('userSettings.addressLine1')}
                          autoComplete='address-line1'
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor='checkout-address-city'>{t('userSettings.city')}</FieldLabel>
                      <FieldContent>
                        <Input
                          id='checkout-address-city'
                          value={address.city}
                          onChange={event => setAddress(prev => ({ ...prev, city: event.target.value }))}
                          placeholder={t('userSettings.city')}
                          autoComplete='address-level2'
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor='checkout-address-postal-code'>{t('userSettings.postalCode')}</FieldLabel>
                      <FieldContent>
                        <Input
                          id='checkout-address-postal-code'
                          value={address.postalCode}
                          onChange={event => setAddress(prev => ({ ...prev, postalCode: event.target.value }))}
                          placeholder={t('userSettings.postalCode')}
                          autoComplete='postal-code'
                        />
                      </FieldContent>
                    </Field>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </StepperContent>

        {/* Step 3: Select Plan & Billing */}
        <StepperContent value='confirm' className='border-none bg-transparent p-0 shadow-none'>
          <div className='space-y-8'>


            {/* Selected Plan Context Alerts (Same Plan / Upgrade / Downgrade) */}
            {selectedPlan && selectedPlanTransition.type === 'same_plan' ? (
              <div className='flex items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-950 dark:text-sky-200'>
                <InfoIcon className='size-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5' />
                <div className='space-y-1'>
                  <p className='font-semibold text-sky-900 dark:text-sky-300'>{t('userSettings.renewPlan') || 'Renovación del plan actual'}</p>
                  <p className='text-xs text-sky-900/90 dark:text-sky-200/90 leading-relaxed'>
                    Estás seleccionando el mismo plan <strong>{selectedPlan.name}</strong> que actualmente tiene contratado tu espacio de trabajo. Al completar el pago, la suscripción se renovará a tu cargo y se desvinculará el cobro automático anterior en Stripe para que no se generen cargos dobles al propietario.
                  </p>
                </div>
              </div>
            ) : selectedPlan && selectedPlanTransition.type === 'downgrade' ? (
              <div className='flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-200'>
                <AlertTriangleIcon className='size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
                <div className='space-y-1'>
                  <p className='font-semibold text-amber-900 dark:text-amber-300'>{t('platform.entitlementPlan') || 'Plan de menor capacidad'}</p>
                  <p className='text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed'>
                    El plan seleccionado <strong>{selectedPlan.name}</strong> cuenta con menores características o límites de investigación que el plan activo actual. Al continuar, se te solicitará una confirmación explícita.
                  </p>
                </div>
              </div>
            ) : selectedPlan && selectedPlanTransition.type === 'upgrade' ? (
              <div className='flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-950 dark:text-emerald-200'>
                <TrendingUpIcon className='size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                <div className='space-y-1'>
                  <p className='font-semibold text-emerald-900 dark:text-emerald-300'>{t('platform.entitlementPlan') || 'Ampliación de capacidades'}</p>
                  <p className='text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed'>
                    Estás ampliando las capacidades y límites de tu espacio de trabajo con el plan <strong>{selectedPlan.name}</strong>.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Vertical Plan Cards Centered (Matching Template Screenshot + Badges) */}
            <RadioGroup value={planCode} onValueChange={value => value && handleSelectPlan(value)}>
              <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-6'>
                {plans.map((plan: BillingPlan) => {
                  const isSelected = planCode === plan.code
                  const isCurrent = plan.code === context?.currentPlan?.code
                  const isDemo = plan.code === 'try_demo' || plan.amountMinor === 0
                  const isDemoDisabled = isDemo && hasActivePlan
                  const hasPrice = plan.providerPriceId !== null && !isDemoDisabled
                  const transition = getPlanTransition(currentActivePlan, plan)

                  return (
                    <div
                      key={plan.id}
                      onClick={() => hasPrice && handleSelectPlan(plan.code)}
                      className={`relative flex flex-col items-center justify-between rounded-xl border p-6 text-center transition-all ${
                        isDemoDisabled
                          ? 'opacity-40 cursor-not-allowed border-border/40 bg-muted/20 grayscale-[20%]'
                          : isSelected
                            ? 'cursor-pointer border-foreground bg-card text-foreground ring-1 ring-foreground/20 shadow-lg'
                            : hasPrice
                              ? 'cursor-pointer border-border/60 bg-card/40 text-foreground/80 hover:border-border hover:bg-card/70'
                              : 'opacity-50 cursor-not-allowed border-border/40'
                      }`}
                    >
                      <RadioGroupItem
                        value={plan.code}
                        id={`plan-${plan.code}`}
                        disabled={!hasPrice}
                        className='sr-only'
                      />

                      {/* Top: Status Badge */}
                      <div className='mb-3 h-6 flex items-center justify-center'>
                        {isDemoDisabled ? (
                          <Badge variant='outline' className='border-muted-foreground/30 bg-muted/40 text-muted-foreground text-[10px] font-medium py-0.5 px-2'>
                            No disponible
                          </Badge>
                        ) : isCurrent ? (
                          <Badge variant='outline' className='border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-medium py-0.5 px-2'>
                            Plan actual / Renovar
                          </Badge>
                        ) : transition.type === 'upgrade' ? (
                          <Badge variant='outline' className='border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium py-0.5 px-2'>
                            Upgrade
                          </Badge>
                        ) : transition.type === 'downgrade' ? (
                          <Badge variant='outline' className='border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-medium py-0.5 px-2'>
                            Downgrade
                          </Badge>
                        ) : null}
                      </div>

                      {/* Name & Description */}
                      <div className='w-full'>
                        <h4 className='text-base font-bold text-foreground'>{plan.name}</h4>
                        <p className='mt-1 text-xs text-muted-foreground line-clamp-5 min-h-[32px]'>
                          {plan.description ?? 'Plan de acceso para tu espacio.'}
                        </p>
                      </div>

                      {/* Center: Big Price Centered */}
                      <div className='my-6 flex items-baseline justify-center gap-0.5'>
                        <span className='text-base font-semibold text-foreground'>$</span>
                        <span className='text-4xl font-extrabold tracking-tight text-foreground'>
                          {formatPlanPrice(plan.amountMinor)}
                        </span>
                        <span className='text-xs text-muted-foreground'>{intervalLabel(plan)}</span>
                      </div>

                      {/* Bottom: Custom Centered Radio Indicator Ring */}
                      <div className='mt-auto flex items-center justify-center pt-2'>
                        <div
                          className={`size-6 rounded-full border-2 transition-all flex items-center justify-center ${
                            isDemoDisabled
                              ? 'border-muted-foreground/20'
                              : isSelected
                                ? 'border-foreground'
                                : 'border-muted-foreground/40'
                          }`}
                        >
                          {isSelected && !isDemoDisabled ? (
                            <div className='size-3 rounded-full bg-foreground' />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>

            {/* Order Summary & Fiscal Note */}
            <div className='space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4'>
              {context.currentPlan ? (
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>{t('pricingPage.btnCurrentPlan') || 'Plan actual'}</span>
                  <span className='font-medium text-foreground'>{context.currentPlan.name}</span>
                </div>
              ) : null}
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>{t('platform.entitlementPlan') || 'Plan'}</span>
                <div className='flex items-center gap-2'>
                  <span className='font-semibold text-foreground'>{selectedPlan?.name ?? '—'}</span>
                  {selectedPlanTransition.type === 'same_plan' ? (
                    <Badge variant='outline' className='border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] py-0 px-1.5'>
                      Renovación
                    </Badge>
                  ) : selectedPlanTransition.type === 'upgrade' ? (
                    <Badge variant='outline' className='border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] py-0 px-1.5'>
                      Upgrade
                    </Badge>
                  ) : selectedPlanTransition.type === 'downgrade' ? (
                    <Badge variant='outline' className='border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] py-0 px-1.5'>
                      Downgrade
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>{t('userSettings.paidBy') || 'Pagado por'}:</span>
                <span className='font-medium text-foreground'>{context.profile.email ?? '—'}</span>
              </div>
              <Separator />
              <div className='flex items-center justify-between text-base font-bold'>
                <span>{t('userSettings.colTotal') || 'Total'}</span>
                <span className='text-foreground'>
                  {selectedPlan ? formatAmountMinor(selectedPlan.amountMinor, selectedPlan.currency) : '—'}
                  {selectedPlan ? (
                    <span className='ml-1 text-xs font-normal text-muted-foreground'>
                      {intervalLabel(selectedPlan)}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>

            <p className='text-xs text-muted-foreground leading-relaxed'>
              Nota fiscal: los impuestos se calculan con Stripe Tax según el país y la dirección de facturación al
              momento del pago. {isDelegated ? 'Se creará un cliente de pago nuevo con tu correo; no se usará la tarjeta del propietario y el propietario será notificado automáticamente sin perder su rol.' : 'El pago se procesa de forma segura en Stripe Checkout.'}
            </p>
          </div>
        </StepperContent>

        {error ? (
          <p className='mt-4 text-sm text-destructive' role='alert'>
            {error}
          </p>
        ) : null}

        {/* Footer with Previous / Next / Submit Buttons */}
        <WizardFooter
          hasValidPlan={hasValidPlan}
          checkingOut={checkingOut}
          onCompletePurchase={() => void completePurchase()}
        />
      </Stepper>

      {/* Downgrade Warning Confirmation Dialog */}
      <Dialog open={downgradeModalOpen} onOpenChange={setDowngradeModalOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <div className='flex items-center gap-3 text-amber-500'>
              <AlertTriangleIcon className='size-6 shrink-0' />
              <DialogTitle>{t('platform.downgradeWarningTitle') || 'Confirmación de Downgrade'}</DialogTitle>
            </div>
            <DialogDescription className='pt-2 text-sm text-muted-foreground leading-relaxed'>
              Estás por cambiar al plan <strong>{selectedPlan?.name}</strong>, el cual reduce los límites y cuotas operativas de tu espacio de trabajo. ¿Deseas continuar hacia el portal de pago?
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Comparativa de cambios en tu espacio de trabajo:
            </p>

            <div className='rounded-lg border border-border/60 overflow-hidden text-xs'>
              <table className='w-full border-collapse'>
                <thead className='bg-muted/40 text-muted-foreground font-semibold border-b border-border/60'>
                  <tr>
                    <th className='p-2.5 text-left'>{t('platform.planFeatures')}</th>
                    <th className='p-2.5 text-left'>{t('billing.currentPlan')}</th>
                    <th className='p-2.5 text-left'>{t('platform.entitlementPlan')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/40'>
                  {selectedPlanTransition.differences.map((diff, index) => (
                    <tr key={index} className={diff.isDowngrade ? 'bg-amber-500/5' : ''}>
                      <td className='p-2.5 font-medium text-foreground'>{diff.label}</td>
                      <td className='p-2.5 text-muted-foreground'>{diff.current}</td>
                      <td className={`p-2.5 font-semibold ${diff.isDowngrade ? 'text-amber-400' : 'text-foreground'}`}>
                        {diff.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3'>
              <Checkbox
                id='confirm-downgrade-checkbox'
                checked={downgradeAgreed}
                onCheckedChange={checked => setDowngradeAgreed(Boolean(checked))}
                className='mt-0.5'
              />
              <label
                htmlFor='confirm-downgrade-checkbox'
                className='text-xs text-foreground leading-relaxed cursor-pointer select-none font-medium'
              >
                Entiendo que las características y cuotas del espacio de trabajo se reducirán según el nuevo plan y confirmo el cambio.
              </label>
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDowngradeModalOpen(false)}
              disabled={checkingOut}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={checkingOut}
              onClick={() => {
                setDowngradeModalOpen(false)
                void completePurchase(true)
              }}
            >
              Confirmar y Proceder al Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Custom Stepper Header: Basic Icons - Horizontal                   */
/* ------------------------------------------------------------------ */

function CustomStepperHeader() {
  const { t } = useI18n()
  const { value, currentIndex } = useStepper()

  const stepMetaMap: Record<(typeof STEP_ORDER)[number], { label: string; description: string; icon: typeof HomeIcon }> = {
    account: { label: t('userSettings.profileDetails') || 'Detalles del Perfil', description: t('userSettings.accountManagementDesc') || 'Configuración y cuenta', icon: HomeIcon },
    personal: { label: t('userSettings.personalInfo') || 'Información Personal', description: t('userSettings.personalInfoDesc') || 'Información personal y rol', icon: UserIcon },
    confirm: { label: t('userSettings.tabBilling') || 'Facturación y Plan', description: t('userSettings.paymentMethodsTitle') || 'Selección de plan y pago', icon: CreditCardIcon }
  }

  return (
    <StepperList className='flex w-full items-center justify-between gap-4 sm:gap-6 md:gap-8 border-none bg-transparent p-0 shadow-none'>
      {STEP_ORDER.map((step, index) => {
        const meta = stepMetaMap[step]
        const StepIcon = meta.icon
        const isCurrent = value === step
        const isCompleted = currentIndex > index

        return (
          <Fragment key={step}>
            <StepperItem
              value={step}
              defaultTrigger={false}
              separator={false}
              className='data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:items-center data-[orientation=horizontal]:justify-start data-[orientation=horizontal]:flex-initial flex flex-row items-center gap-3.5 bg-transparent p-0 hover:bg-transparent focus:bg-transparent data-active:bg-transparent group cursor-pointer'
            >
              {/* Circle Icon Container with Semantic Tokens */}
              <div
                className={`size-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
                    : isCompleted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                      : 'bg-muted text-muted-foreground border border-border/50 group-hover:border-border'
                }`}
              >
                <StepIcon className='size-5 shrink-0' />
              </div>

              {/* Title & Subtitle */}
              <div className='flex flex-col text-left'>
                <span
                  className={`text-sm tracking-tight transition-colors ${
                    isCurrent
                      ? 'text-foreground font-semibold'
                      : isCompleted
                        ? 'text-foreground/90 font-medium'
                        : 'text-muted-foreground font-normal group-hover:text-foreground'
                  }`}
                >
                  {meta.label}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {meta.description}
                </span>
              </div>
            </StepperItem>

            {/* Separator Chevron between steps */}
            {index < STEP_ORDER.length - 1 ? (
              <div className='flex items-center justify-center text-muted-foreground/30 shrink-0'>
                <ChevronRightIcon className='size-4' />
              </div>
            ) : null}
          </Fragment>
        )
      })}
    </StepperList>
  )
}

/* ------------------------------------------------------------------ */
/* Navigation Footer Buttons                                          */
/* ------------------------------------------------------------------ */

function WizardFooter({
  hasValidPlan,
  checkingOut,
  onCompletePurchase
}: {
  hasValidPlan: boolean
  checkingOut: boolean
  onCompletePurchase: () => void
}) {
  const { t } = useI18n()
  const { currentIndex, totalSteps, canGoPrevious, canGoNext, goPrevious, goNext } = useStepper()
  const isLast = currentIndex === totalSteps - 1

  return (
    <div className='flex items-center justify-between border-t border-border pt-6 mt-8'>
      {/* Previous Button */}
      <Button
        type='button'
        variant='outline'
        onClick={goPrevious}
        disabled={!canGoPrevious || checkingOut}
        className='gap-2'
      >
        <ArrowLeftIcon className='size-4' />
        {t('common.previous') || 'Anterior'}
      </Button>

      {/* Next / Proceed Button */}
      {isLast ? (
        <Button
          type='button'
          disabled={!hasValidPlan || checkingOut}
          onClick={onCompletePurchase}
          className='gap-2 px-6'
        >
          {checkingOut ? 'Redirigiendo a Stripe...' : t('billing.upgradePlan') || 'Mejorar Plan'}
          <CreditCardIcon className='size-4' />
        </Button>
      ) : (
        <Button
          type='button'
          onClick={goNext}
          disabled={!canGoNext || checkingOut}
          className='gap-2 px-6'
        >
          {t('common.next') || 'Siguiente'}
          <ArrowRightIcon className='size-4' />
        </Button>
      )}
    </div>
  )
}

export default UpgradeWizard
