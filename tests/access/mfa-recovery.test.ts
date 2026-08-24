import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

import { generateMfaRecoveryCodeBatch, hashMfaRecoveryCode, verifyMfaRecoveryCode } from '@/lib/auth/mfa-recovery-codes'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('MFA recovery code cryptography', () => {
  it('generates one-time display codes and stores only verifiable hashes', () => {
    const batch = generateMfaRecoveryCodeBatch()

    assert.equal(batch.codes.length, 10)
    assert.equal(batch.hashes.length, 10)
    assert.equal(new Set(batch.codes).size, batch.codes.length)
    assert.equal(new Set(batch.hashes).size, batch.hashes.length)

    for (const [index, code] of batch.codes.entries()) {
      assert.match(code, /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){2}$/)
      assert.notEqual(batch.hashes[index], code)
      assert.equal(verifyMfaRecoveryCode(code, batch.hashes[index] ?? ''), true)
    }
  })

  it('uses a fresh salted hash for the same code', () => {
    const code = generateMfaRecoveryCodeBatch(1).codes[0]

    assert.ok(code)

    const firstHash = hashMfaRecoveryCode(code)
    const secondHash = hashMfaRecoveryCode(code)

    assert.notEqual(firstHash, secondHash)
    assert.equal(verifyMfaRecoveryCode(code, firstHash), true)
    const wrongCode = `${code.slice(0, -1)}${code.endsWith('A') ? 'B' : 'A'}`
    assert.equal(verifyMfaRecoveryCode(wrongCode, firstHash), false)
  })
})

describe('MFA recovery code implementation contract', () => {
  it('keeps recovery material server-only and invalidates prior batches atomically', () => {
    const migration = read('supabase/migrations/2026-08-12T13-20-00_mfa_recovery_codes.sql')
    const route = read('src/app/api/auth/mfa/recovery/route.ts')

    assert.match(migration, /alter table public\.mfa_recovery_codes enable row level security/)
    assert.match(migration, /revoke all on table public\.mfa_recovery_codes from public, anon, authenticated/)
    assert.match(migration, /update public\.mfa_recovery_codes[\s\S]*set revoked_at = clock_timestamp\(\)/)
    assert.match(migration, /replace_mfa_recovery_codes/)
    assert.match(migration, /revoke_mfa_recovery_codes/)
    assert.match(route, /aalData\.currentLevel !== 'aal2'/)
    assert.match(route, /replace_mfa_recovery_codes/)
    assert.match(route, /'Cache-Control': 'no-store'/)
    assert.doesNotMatch(route, /mfa\.challenge|mfa\.verify/)
  })
})
