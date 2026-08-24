import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createBlankState } from '../../../src/utils/investigator/demo'
import {
  computeStateChanges,
  historyEntryFor,
  normalizeStoredState,
  sanitizeHistoryEntry,
  withHistory
} from '../../../src/utils/investigator/workspace'

describe('Delta-based History and Snapshot Sanitization', () => {
  it('computes metadata changes correctly', () => {
    const prev = createBlankState()
    const next = createBlankState()

    next.metadata.title = 'Nuevo Título Estratégico'
    next.metadata.isLocked = true

    const changes = computeStateChanges(prev, next, 'actualización de metadatos')

    assert.ok(changes.length >= 2)
    assert.ok(changes.some(c => c.area === 'metadata' && c.summary.includes('Nuevo Título Estratégico')))
    assert.ok(changes.some(c => c.area === 'metadata' && c.summary.includes('protegida')))
  })

  it('computes factor creations, modifications, and deletions', () => {
    const prev = createBlankState()
    const next = createBlankState()

    // Create factor
    next.internal = [
      {
        id: 'F-01',
        name: 'Tecnología de Punta',
        type: 'F',
        group: 'internal',
        weight: 0.25,
        rating: 4,
        description: 'Infraestructura moderna',
        evidence: 'Reporte 2026'
      }
    ]

    const changes = computeStateChanges(prev, next, 'adición de factor')

    assert.ok(changes.some(c => c.area === 'internal' && c.action === 'create' && c.entityId === 'F-01'))

    // Modify factor
    const modified = createBlankState()

    modified.internal = [
      {
        id: 'F-01',
        name: 'Tecnología de Punta',
        type: 'F',
        group: 'internal',
        weight: 0.35,
        rating: 3,
        description: 'Infraestructura moderna',
        evidence: 'Reporte 2026'
      }
    ]

    const modChanges = computeStateChanges(next, modified, 'edición de ponderación')

    assert.ok(
      modChanges.some(
        c => c.area === 'internal' && c.action === 'update' && c.summary.includes('ponderación')
      )
    )
  })

  it('generates lightweight history entries without cloning full state', () => {
    const current = createBlankState()
    const next = createBlankState()

    next.metadata.title = 'Investigación v2'

    const updated = withHistory(current, next, 'renombrar', 'Daniel Treasure')

    assert.equal(updated.history.length, 1)
    const entry = updated.history[0]

    assert.equal(entry.authorName, 'Daniel Treasure')
    assert.equal(entry.reason, 'renombrar')
    assert.ok(Array.isArray(entry.changes))
    assert.ok(entry.changes.length > 0)
    assert.equal(entry.snapshot, undefined)
  })

  it('sanitizes legacy bloated snapshot entries to reduce payload size', () => {
    const legacyState = createBlankState()

    // Simulate bloated legacy history with heavy full snapshot
    legacyState.history = [
      {
        id: 'VER-LEGACY-01',
        version: 1,
        timestamp: '2026-08-19T10:00:00.000Z',
        reason: 'versión inicial',
        snapshot: createBlankState() as any
      } as any
    ]

    const normalized = normalizeStoredState(legacyState)

    assert.equal(normalized.history.length, 1)
    assert.equal((normalized.history[0] as any).snapshot, undefined)
    assert.equal(normalized.history[0].id, 'VER-LEGACY-01')
    assert.equal(normalized.history[0].version, 1)
  })
})
