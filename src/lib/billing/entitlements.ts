export interface BillingEntitlementRowLike {
  readonly entitlement_key: string
  readonly limit_value: number | string | null
  readonly is_enabled: boolean
}

const isLegacyLimitKey = (key: string): boolean =>
  key.includes('.max_') || key.includes('_max') || key.endsWith('_monthly') || key.endsWith('_bytes')

export function canonicalizeBillingEntitlementKey(value: string): string {
  const key = value.trim().toLowerCase()

  if (key.length === 0) {
    return ''
  }

  if (/^(modules|actions|limits)\./.test(key)) {
    return key
  }

  return `${isLegacyLimitKey(key) ? 'limits' : 'actions'}.${key}`
}

export function findBillingEntitlementRow<Row extends BillingEntitlementRowLike>(
  rows: readonly Row[],
  entitlement: string
): Row | null {
  const rawKey = entitlement.trim().toLowerCase()
  const canonicalKey = canonicalizeBillingEntitlementKey(entitlement)

  return (
    rows.find(row => row.entitlement_key.trim().toLowerCase() === rawKey) ??
    rows.find(row => canonicalizeBillingEntitlementKey(row.entitlement_key) === canonicalKey) ??
    null
  )
}
