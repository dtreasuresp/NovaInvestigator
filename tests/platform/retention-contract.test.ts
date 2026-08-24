import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('legal retention migration', () => {
  const migration = read('supabase/migrations/2026-08-12T15-00-00_legal_retention_enforcement.sql')

  it('adds non-decreasing seven-year deadlines to every regulated record source', () => {
    for (const table of [
      'audit_logs',
      'billing_invoices',
      'billing_webhook_events',
      'access_grants'
    ]) {
      assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*add column if not exists retention_until`))
      assert.match(migration, new RegExp(`${table}_retention_min_check`))
    }

    assert.match(migration, /vid_requests_retention_min_check/)
    assert.match(migration, /retention_until >= created_at \+ interval '7 years'/)
    assert.match(migration, /prevent_legal_retention_reduction/)
    assert.match(migration, /create table if not exists public\.legal_retention_archives/)
    assert.match(migration, /source_snapshot jsonb not null/)
    assert.match(migration, /legal_retention_archives_no_update_delete/)
    assert.match(migration, /revoke all on table public\.legal_retention_archives from public, anon, authenticated/)
    assert.doesNotMatch(migration, /guest_access_grants/)
  })

  it('protects payment evidence and VID rows from premature physical deletion', () => {
    assert.match(migration, /prevent_payment_evidence_mutation/)
    assert.match(migration, /payment evidence cannot be deleted during legal retention/)
    assert.match(migration, /prevent_vid_request_delete_during_retention/)
    assert.match(migration, /vid requests cannot be deleted during legal retention/)
    assert.match(migration, /vid_requests_redacted_immutable/)
  })
})

describe('retention job contract', () => {
  const service = read('src/features/platform/retention-service.ts')

  it('redacts expired VID data in place and checks every database operation', () => {
    assert.match(service, /\.is\('redacted_at', null\)/)
    assert.match(service, /provider_reference: null/)
    assert.match(service, /decision_reason: null/)
    assert.match(service, /reviewer_user_id: null/)
    assert.match(service, /redacted_after_expiry/)
    assert.match(service, /writeArchiveManifest/)
    assert.match(service, /legalRecordsArchived/)
    assert.match(service, /sourceSnapshot/)
    assert.match(service, /\.select\('\*'\)/)
    assert.match(service, /if \(vidRedactionError\)/)
    assert.match(service, /if \(auditError\)/)
    assert.doesNotMatch(service, /purged_after_expiry/)
  })

  it('reports database-enforced retention and the archive manifest contract', () => {
    assert.match(service, /database-enforced/)
    assert.match(service, /immutable archive manifest/)
    assert.match(service, /paymentEvidenceRetentionStatus/)
    assert.match(service, /vidRetentionStatus/)
    assert.match(service, /legalRetentionYearsMin: 7/)
  })
})
