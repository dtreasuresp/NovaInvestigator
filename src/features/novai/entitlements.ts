import type { EffectiveAccessSnapshot } from '@/features/access/types'

// ==============================================================================
// AI Entitlements — capa ABAC §10 del doc RBAC
// Centraliza la lectura de entitlements comerciales para el feature AI.
// Mantiene SODA: src/features/ai (feature) — no accede a infrastructure directa,
// solo interpreta snapshot ya resuelto por access-service.
// ==============================================================================

export interface AiEntitlementCheck {
  readonly hasAiModule: boolean
  readonly hasAiCapability: boolean
  readonly hasAiLimitEntitlement: boolean
  readonly hasDailyLimitEntitlement: boolean
  readonly monthlyEntitlement: { key: string; limitValue: number | null; isEnabled: boolean } | null
  readonly dailyEntitlement: { key: string; limitValue: number | null; isEnabled: boolean } | null
}

/**
 * Evalúa si el snapshot tiene los entitlements necesarios para AI.
 * §10: el plan no dice quién puede usar algo, dice qué compró el tenant.
 */
export function checkAiEntitlements(snapshot: EffectiveAccessSnapshot): AiEntitlementCheck {
  const hasAiModule =
    snapshot.modules.includes('novai') ||
    snapshot.entitlements.some(e => e.isEnabled && (e.key === 'modules.novai' || e.key === 'novai'))

  const hasAiCapability =
    snapshot.capabilities.includes('ai.chat' as never) ||
    snapshot.capabilities.includes('ai.free_chat' as never) ||
    snapshot.capabilities.includes('ai.report' as never) ||
    snapshot.actions.includes('ai.chat' as never) ||
    snapshot.actions.includes('ai.free_chat' as never) ||
    snapshot.actions.includes('ai.report' as never) ||
    snapshot.entitlements.some(
      e =>
        e.isEnabled &&
        (e.key === 'actions.ai.chat' ||
          e.key === 'actions.ai.free_chat' ||
          e.key === 'actions.ai.report' ||
          e.key === 'actions.novai')
    )

  const hasAiLimitEntitlement = snapshot.entitlements.some(e => e.isEnabled && e.key === 'limits.ai_queries_monthly')

  const hasDailyLimitEntitlement = snapshot.entitlements.some(e => e.isEnabled && e.key === 'limits.ai_queries_daily')

  const monthlyEntitlement = snapshot.entitlements.find(e => e.key === 'limits.ai_queries_monthly' && e.isEnabled) ?? null

  const dailyEntitlement =
    snapshot.entitlements.find(e => e.key === 'limits.ai_queries_daily' && e.isEnabled) ?? null

  return {
    hasAiModule,
    hasAiCapability,
    hasAiLimitEntitlement,
    hasDailyLimitEntitlement,
    monthlyEntitlement: monthlyEntitlement
      ? { key: monthlyEntitlement.key, limitValue: monthlyEntitlement.limitValue, isEnabled: monthlyEntitlement.isEnabled }
      : null,
    dailyEntitlement: dailyEntitlement
      ? { key: dailyEntitlement.key, limitValue: dailyEntitlement.limitValue, isEnabled: dailyEntitlement.isEnabled }
      : null
  }
}

export function canUseFreeText(snapshot: EffectiveAccessSnapshot): boolean {
  return (
    snapshot.actions.includes('ai.free_chat' as never) ||
    snapshot.actions.includes('ai.chat' as never) ||
    snapshot.capabilities.includes('ai.free_chat' as never) ||
    snapshot.entitlements.some(
      e => e.isEnabled && (e.key === 'actions.ai.free_chat' || e.key === 'actions.ai.chat' || e.key === 'ai.free_chat')
    )
  )
}

/**
 * §13 Distinción para UX: ENTITLEMENT_REQUIRED vs AUTHORIZATION_DENIED
 * Retorna qué falta para mostrar mensaje de upsell correcto.
 */
export function getAiAccessReason(snapshot: EffectiveAccessSnapshot): { allowed: boolean; reason: string; entitlement?: string } {
  const check = checkAiEntitlements(snapshot)

  if (!check.hasAiLimitEntitlement) {
    return { allowed: false, reason: 'ENTITLEMENT_REQUIRED', entitlement: 'limits.ai_queries_monthly' }
  }

  if (!check.hasAiModule && !check.hasAiCapability) {
    return { allowed: false, reason: 'ENTITLEMENT_REQUIRED', entitlement: 'modules.novai' }
  }

  return { allowed: true, reason: 'ROLE_PERMISSION' }
}
