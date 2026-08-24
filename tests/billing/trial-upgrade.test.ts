import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/2026-08-10T00-00-00_close_trial_grant_on_subscription.sql'),
  'utf8'
)

describe('trial to subscription closeout migration', () => {
  it('closes only active trial grants and records the transition', () => {
    assert.match(migration, /grant_row\.mode = 'trial'/)
    assert.match(migration, /grant_row\.status = 'active'/)
    assert.match(migration, /status = 'revoked/)
    assert.match(migration, /revoked_at = clock_timestamp\(\)/)
    assert.match(migration, /billing\.trial_grant\.closed_on_upgrade/)
  })

  it('audits only rows returned by the update so duplicate webhooks are idempotent', () => {
    assert.match(migration, /for v_grant_id in[\s\S]*returning grant_row\.id[\s\S]*loop/)
    assert.match(migration, /entity_id,[\s\S]*v_grant_id/)
    assert.doesNotMatch(migration, /v_ids|v_idx/)
  })
})
