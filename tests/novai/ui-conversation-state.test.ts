import test from 'node:test'
import assert from 'node:assert/strict'

import type { ChatMessage, ChatThread } from '../../src/views/apps/novai/types'

test('NovAi UI Conversation State & Rich Message Preservation', async t => {
  await t.test('merging conversation list preserves already loaded messages in state', () => {
    const existingThreads: ChatThread[] = [
      {
        id: 'conv-1',
        title: 'Investigación Estratégica',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: { app: 'investigator', mode: 'CONSULTANT' },
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Analiza los cruces DAFO',
            timestamp: new Date().toISOString()
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Se detectaron 3 cruces relevantes...',
            timestamp: new Date().toISOString(),
            agentTraces: [
              {
                id: 'tr-1',
                category: 'investigation',
                title: 'Consultando Expediente',
                description: 'Verificado',
                status: 'completed',
                timestamp: new Date().toISOString()
              }
            ]
          }
        ]
      }
    ]

    const incomingApiConversations = [
      {
        id: 'conv-1',
        title: 'Investigación Estratégica',
        app_context: 'investigator',
        mode: 'CONSULTANT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'conv-2',
        title: 'Nueva conversación',
        app_context: 'general',
        mode: 'CHAT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    const mapped: ChatThread[] = incomingApiConversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      context: { app: c.app_context as any, mode: c.mode as any },
      messages: []
    }))

    // Non-destructive merge logic
    const mergedThreads = mapped.map(m => {
      const existing = existingThreads.find(p => p.id === m.id)
      return existing && existing.messages && existing.messages.length > 0
        ? { ...m, messages: existing.messages }
        : m
    })

    assert.equal(mergedThreads.length, 2)
    assert.equal(mergedThreads[0].id, 'conv-1')
    assert.equal(mergedThreads[0].messages.length, 2, 'conv-1 messages should be preserved')
    assert.equal(mergedThreads[0].messages[1].agentTraces?.length, 1, 'agent traces should be preserved')
    assert.equal(mergedThreads[1].id, 'conv-2')
    assert.equal(mergedThreads[1].messages.length, 0, 'conv-2 starts with empty messages')
  })

  await t.test('merging server messages with rich in-memory message preserves agentTraces and reasoning', () => {
    const activeMessages: ChatMessage[] = [
      {
        id: 'msg-u1',
        role: 'user',
        content: 'Calcular matrices',
        timestamp: new Date().toISOString()
      },
      {
        id: 'msg-a1',
        role: 'assistant',
        content: 'Cálculo completado exitosamente.',
        reasoning: 'Evaluando pesos EFI y EFE...',
        agentTraces: [
          {
            id: 'tr-calc',
            category: 'calculation',
            title: 'calculate_matrix completado',
            description: 'Datos validados',
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        ],
        calculations: [
          {
            matrixType: 'EFI',
            total: 2.85,
            items: []
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]

    const serverRawMessages = [
      {
        id: 'db-u1',
        role: 'user',
        content: 'Calcular matrices',
        created_at: new Date().toISOString()
      },
      {
        id: 'db-a1',
        role: 'assistant',
        content: 'Cálculo completado exitosamente.',
        created_at: new Date().toISOString()
      }
    ]

    const mappedServerMsgs: ChatMessage[] = serverRawMessages.map(m => ({
      id: m.id,
      role: m.role as any,
      content: m.content,
      timestamp: m.created_at
    }))

    const merged = mappedServerMsgs.map(newMsg => {
      const existingMsg = activeMessages.find(
        em => em.id === newMsg.id || (em.role === newMsg.role && em.content === newMsg.content)
      )

      if (existingMsg) {
        return {
          ...newMsg,
          agentTraces: existingMsg.agentTraces,
          toolInvocations: existingMsg.toolInvocations,
          evidences: existingMsg.evidences,
          audits: existingMsg.audits,
          calculations: existingMsg.calculations,
          sources: existingMsg.sources,
          reasoning: existingMsg.reasoning
        }
      }

      return newMsg
    })

    assert.equal(merged.length, 2)
    assert.equal(merged[1].reasoning, 'Evaluando pesos EFI y EFE...')
    assert.equal(merged[1].agentTraces?.length, 1)
    assert.equal(merged[1].calculations?.length, 1)
  })
})
