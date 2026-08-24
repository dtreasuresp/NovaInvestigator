import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { createBlankState, createDemoState } from '../../../src/utils/investigator/demo'
import {
  clearWorkspaceStorage,
  inspectWorkspaceMigration,
  persistWorkspace,
  WORKSPACE_STORAGE_KEY
} from '../../../src/utils/investigator/workspace'

const createStorage = () => {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    key: (index: number) => [...values.keys()][index] ?? null
  }
}

const storage = createStorage()

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: storage }
})

afterEach(() => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)

    if (key) storage.removeItem(key)
  }
})

describe('legacy workspace migration inspection', () => {
  it('excludes demo fixtures and reports migratable count and bytes', () => {
    const demo = createDemoState()
    const local = createBlankState()

    local.metadata = {
      ...local.metadata,
      id: 'LOCAL-001',
      title: 'Investigación local'
    }

    persistWorkspace(local.metadata.id, [demo, local])

    const snapshot = inspectWorkspaceMigration()

    assert.equal(snapshot.storageWarning, false)
    assert.equal(snapshot.items.length, 1)
    assert.equal(snapshot.items[0]?.metadata.id, 'LOCAL-001')
    assert.ok(snapshot.totalBytes > 0)
  })

  it('keeps local storage untouched until explicit cleanup', () => {
    storage.setItem(WORKSPACE_STORAGE_KEY, '{"schemaVersion":1,"items":[]}')
    storage.setItem(`${WORKSPACE_STORAGE_KEY}-backup-2026-08-09T10:00:00`, 'backup')

    const snapshot = inspectWorkspaceMigration()

    assert.equal(snapshot.storageWarning, false)
    assert.ok(storage.getItem(WORKSPACE_STORAGE_KEY))
    assert.ok(storage.getItem(`${WORKSPACE_STORAGE_KEY}-backup-2026-08-09T10:00:00`))

    clearWorkspaceStorage()

    assert.equal(storage.getItem(WORKSPACE_STORAGE_KEY), null)
    assert.equal(storage.getItem(`${WORKSPACE_STORAGE_KEY}-backup-2026-08-09T10:00:00`), null)
  })

  it('surfaces malformed legacy data as a storage warning', () => {
    storage.setItem(WORKSPACE_STORAGE_KEY, '{malformed')

    const snapshot = inspectWorkspaceMigration()

    assert.equal(snapshot.storageWarning, true)
    assert.equal(snapshot.items.length, 0)
  })
})
