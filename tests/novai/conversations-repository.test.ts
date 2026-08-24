import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiConversationsRepository } from '../../src/features/novai/conversations-repository'

test('NovAi Conversations & Messages Repository (In-Memory / Contract Tests)', async t => {
  // Mock In-Memory Database
  const mockDb = {
    conversations: [] as any[],
    messages: [] as any[]
  }

  const createMockBuilder = (table: string) => {
    const filters: Array<{ col: string; val: any }> = []

    const builder: any = {
      eq: (col: string, val: any) => {
        filters.push({ col, val })
        return builder
      },
      order: () => builder,
      limit: (n: number) => {
        const dataset = table === 'novai_conversations' ? mockDb.conversations : mockDb.messages
        const filtered = dataset.filter(item => filters.every(f => item[f.col] === f.val))
        return Promise.resolve({ data: filtered.slice(0, n), error: null })
      },
      single: () => {
        const dataset = table === 'novai_conversations' ? mockDb.conversations : mockDb.messages
        const match = dataset.find(item => filters.every(f => item[f.col] === f.val))
        return Promise.resolve({ data: match || null, error: match ? null : { message: 'Not found' } })
      },
      then: (resolve: any) => {
        const dataset = table === 'novai_conversations' ? mockDb.conversations : mockDb.messages
        const filtered = dataset.filter(item => filters.every(f => item[f.col] === f.val))
        return Promise.resolve({ data: filtered, error: null }).then(resolve)
      }
    }

    return builder
  }

  const mockClient = {
    from: (table: string) => {
      if (table === 'novai_conversations') {
        return {
          select: () => createMockBuilder(table),
          insert: (payload: any) => ({
            select: () => ({
              single: () => {
                const item = {
                  id: `conv-${Date.now()}`,
                  ...payload,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                mockDb.conversations.push(item)
                return Promise.resolve({ data: item, error: null })
              }
            })
          }),
          update: (updates: any) => {
            const builder = createMockBuilder(table)
            builder.then = (resolve: any) => {
              mockDb.conversations.forEach(item => {
                Object.assign(item, updates)
              })
              return Promise.resolve({ error: null }).then(resolve)
            }
            return builder
          },
          delete: () => {
            const builder = createMockBuilder(table)
            builder.then = (resolve: any) => {
              mockDb.conversations = []
              return Promise.resolve({ error: null }).then(resolve)
            }
            return builder
          }
        }
      }

      if (table === 'novai_messages') {
        return {
          select: () => createMockBuilder(table),
          insert: (payload: any) => ({
            select: () => ({
              single: () => {
                const item = {
                  id: `msg-${Date.now()}-${Math.random()}`,
                  ...payload,
                  created_at: new Date().toISOString()
                }
                mockDb.messages.push(item)
                return Promise.resolve({ data: item, error: null })
              }
            })
          })
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }
  } as any

  await t.test('Creates a conversation and retrieves it', async () => {
    const conv = await NovaiConversationsRepository.createConversation(mockClient, {
      tenantId: 'tnt-test-1',
      userId: 'usr-test-1',
      title: 'Diagnóstico DAFO Inicial',
      mode: 'CONSULTANT',
      appContext: 'investigator'
    })

    assert.ok(conv)
    assert.equal(conv.title, 'Diagnóstico DAFO Inicial')
    assert.equal(conv.mode, 'CONSULTANT')
    assert.equal(conv.tenantId, 'tnt-test-1')
  })

  await t.test('Appends messages and retrieves thread with messages', async () => {
    const convId = mockDb.conversations[0].id

    const msg1 = await NovaiConversationsRepository.appendMessage(mockClient, {
      conversationId: convId,
      tenantId: 'tnt-test-1',
      userId: 'usr-test-1',
      role: 'user',
      content: '¿Cuál es el cruce DAFO más urgente?'
    })

    assert.ok(msg1)
    assert.equal(msg1.content, '¿Cuál es el cruce DAFO más urgente?')

    const msg2 = await NovaiConversationsRepository.appendMessage(mockClient, {
      conversationId: convId,
      tenantId: 'tnt-test-1',
      role: 'assistant',
      content: 'El cruce D-03 × A-02 requiere atención inmediata.'
    })

    assert.ok(msg2)
    assert.equal(msg2.role, 'assistant')

    const details = await NovaiConversationsRepository.getConversationWithMessages(mockClient, {
      conversationId: convId,
      tenantId: 'tnt-test-1',
      userId: 'usr-test-1'
    })

    assert.ok(details)
    assert.equal(details.conversation.id, convId)
    assert.equal(details.messages.length, 2)
  })
})
