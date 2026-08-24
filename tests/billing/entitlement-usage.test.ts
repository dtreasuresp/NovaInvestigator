import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/2026-08-13T01-00-00_grant_entitlement_usage.sql'),
  'utf8'
)

describe('grant entitlement usage migration', () => {
  it('isolates monthly counters by access grant', () => {
    assert.match(migration, /add column if not exists grant_id uuid references public\.access_grants/)
    assert.match(migration, /unique \(grant_id, entitlement_key, period_start\)/)
    assert.match(migration, /on conflict \(grant_id, entitlement_key, period_start\)/)
  })

  it('checks the authenticated owner, tenant, active window, and capability', () => {
    assert.match(migration, /grant_row\.user_id = v_user_id/)
    assert.match(migration, /grant_row\.tenant_id = p_tenant_id/)
    assert.match(migration, /grant_row\.status = 'active'/)
    assert.match(migration, /grant_row\.starts_at <= v_now/)
    assert.match(migration, /public\.has_capability\(v_user_id, p_tenant_id, 'investigations\.export'\)/)
  })
})
