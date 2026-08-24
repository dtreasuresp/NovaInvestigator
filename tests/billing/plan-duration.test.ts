import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

import { evaluateCommercialGrant } from '@/lib/billing/commercial-access'
import type { CommercialGrantSnapshot } from '@/lib/billing/commercial-access'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('plan duration and lifetime access', () => {
  it('migration adds duration_seconds to public.plans and seeds one_time_access default', () => {
    const migration = read('supabase/migrations/2026-08-14T03-00-00_plan_duration_seconds.sql')

    assert.match(migration, /add column if not exists duration_seconds integer/)
    assert.match(migration, /check \(duration_seconds is null or duration_seconds > 0\)/)
    assert.match(migration, /set duration_seconds = 86400/)
    assert.match(migration, /where code = 'one_time_access'/)
  })

  it('evaluates lifetime access grant (expiresAt = null) as active indefinitely', () => {
    const startsAt = new Date('2026-01-01T00:00:00.000Z')
    const farFuture = new Date('2099-12-31T23:59:59.000Z')

    const lifetimeGrant: CommercialGrantSnapshot = {
      status: 'active',
      startsAt: startsAt.toISOString(),
      expiresAt: null,
      maxUses: 1,
      usedUses: 0
    }

    const initialStatus = evaluateCommercialGrant(lifetimeGrant, startsAt)
    const futureStatus = evaluateCommercialGrant(lifetimeGrant, farFuture)

    assert.equal(initialStatus, 'active')
    assert.equal(futureStatus, 'active')
  })

  it('evaluates temporary one-time grant (24h) as active within window and expired after window', () => {
    const startsAt = new Date('2026-08-14T10:00:00.000Z')
    const expiresAt = new Date(startsAt.getTime() + 86400 * 1000) // +24 hours
    const withinWindow = new Date('2026-08-14T20:00:00.000Z') // +10 hours
    const afterExpiry = new Date('2026-08-15T10:00:01.000Z') // +24 hours and 1 sec

    const temporaryGrant: CommercialGrantSnapshot = {
      status: 'active',
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: 1,
      usedUses: 0
    }

    assert.equal(evaluateCommercialGrant(temporaryGrant, withinWindow), 'active')
    assert.equal(evaluateCommercialGrant(temporaryGrant, afterExpiry), 'expired')
  })
})
