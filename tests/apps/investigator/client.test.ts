import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mapRemoteInvestigation } from '../../../src/lib/investigations/client'
import { createDemoState } from '../../../src/utils/investigator/demo'

describe('investigation remote client', () => {
  it('maps the authorized remote metadata over the stored domain state', () => {
    const state = createDemoState()

    const mapped = mapRemoteInvestigation({
      id: '2d4e8e0c-7850-4b70-8b54-5c1b9b9f1b64',
      ownerId: 'user-1',
      title: 'Investigación persistida',
      status: 'en análisis',
      archivedAt: null,
      schemaVersion: 1,
      version: 3,
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T01:00:00.000Z',
      updatedBy: 'user-1',
      lastOpenedAt: '2026-08-07T02:00:00.000Z',
      lastOpenedBy: 'user-2',
      isLocked: true,
      accessLevel: 'team_write',
      state
    })

    assert.notStrictEqual(mapped, state)
    assert.equal(mapped.metadata.id, '2d4e8e0c-7850-4b70-8b54-5c1b9b9f1b64')
    assert.equal(mapped.metadata.ownerId, 'user-1')
    assert.equal(mapped.metadata.title, 'Investigación persistida')
    assert.equal(mapped.metadata.status, 'en análisis')
    assert.equal(mapped.metadata.archivedAt, null)
    assert.equal(mapped.metadata.updatedAt, '2026-08-07T01:00:00.000Z')
    assert.equal(mapped.metadata.isLocked, true)
    assert.equal(mapped.metadata.accessLevel, 'team_write')
    assert.equal(mapped.internal.length, state.internal.length)
  })
})
