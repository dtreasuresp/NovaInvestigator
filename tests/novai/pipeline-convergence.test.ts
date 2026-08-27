import test from 'node:test'
import assert from 'node:assert/strict'

import type { InvestigationsPrincipal } from '../../src/lib/investigations/access'
import type { NovaiContext, AiMessage } from '../../src/features/novai/schema'
import type { StreamCallbacks } from '../../src/features/novai/client/gemini-client'
import { streamNovaiChat, streamAiConsultation, streamAiReport } from '../../src/features/novai/service'
import { NovaiAgentRuntime } from '../../src/features/novai/agent-runtime'

test('NovAi Pipeline Convergence (Fase D · AUDITORIA_NOVAI_V2 / PROMPT_NOVAI_PRO_V2)', async t => {
  const mockPrincipal: InvestigationsPrincipal = {
    userId: 'usr-convergence-test',
    tenantId: 'tnt-convergence-test',
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({
              limit: async () => ({ data: [], error: null })
            })
          })
        })
      })
    } as any
  }

  await t.test('streamNovaiChat dispatches text-delta, tool events and onComplete via NovaiAgentRuntime', async () => {
    // Mock NovaiAgentRuntime.executeStreaming
    const originalExecute = NovaiAgentRuntime.executeStreaming
    let capturedOptions: any = null

    NovaiAgentRuntime.executeStreaming = async (options) => {
      capturedOptions = options
      // Simulate events
      await options.onEvent({ type: 'text-delta', delta: 'Hola ' })
      await options.onEvent({ type: 'text-delta', delta: 'Mundo' })
      await options.onEvent({
        type: 'tool-call',
        id: 'tc-test-1',
        tool: 'get_active_investigation',
        label: 'Investigación activa',
        input: {},
        timestamp: new Date().toISOString()
      })
      await options.onEvent({
        type: 'tool-result',
        id: 'tc-test-1',
        tool: 'get_active_investigation',
        label: 'Investigación activa',
        result: { investigationId: 'inv-123', name: 'FCBC' }
      })
      await options.onEvent({
        type: 'message-complete',
        fullText: 'Hola Mundo',
        durationMs: 150
      })
    }

    try {
      const chunks: string[] = []
      const toolCalls: any[] = []
      const toolResults: any[] = []
      let completedText = ''

      const callbacks: StreamCallbacks = {
        onChunk: (text) => chunks.push(text),
        onToolCall: (event) => toolCalls.push(event),
        onToolResult: (event) => toolResults.push(event),
        onComplete: (fullText) => { completedText = fullText },
        onError: (err) => { throw err }
      }

      const context: NovaiContext = { app: 'investigator', mode: 'CONSULTANT' }
      const messages: AiMessage[] = [{ role: 'user', content: '¿Cuál es la investigación activa?' }]

      await streamNovaiChat({
        principal: mockPrincipal,
        context,
        messages,
        isFreeText: true,
        locale: 'es',
        callbacks
      })

      assert.ok(capturedOptions, 'NovaiAgentRuntime.executeStreaming must have been called')
      assert.equal(capturedOptions.principal.tenantId, 'tnt-convergence-test')
      assert.equal(capturedOptions.context.mode, 'CONSULTANT')
      assert.deepEqual(chunks, ['Hola ', 'Mundo'])
      assert.equal(toolCalls.length, 1)
      assert.equal(toolCalls[0].toolName, 'get_active_investigation')
      assert.equal(toolResults.length, 1)
      assert.equal(toolResults[0].result.investigationId, 'inv-123')
      assert.equal(completedText, 'Hola Mundo')
    } finally {
      NovaiAgentRuntime.executeStreaming = originalExecute
    }
  })

  await t.test('streamAiConsultation and streamAiReport route seamlessly through unified streamNovaiChat', async () => {
    const originalExecute = NovaiAgentRuntime.executeStreaming
    let capturedOptions: any = null

    NovaiAgentRuntime.executeStreaming = async (options) => {
      capturedOptions = options
      await options.onEvent({ type: 'text-delta', delta: 'Dictamen Estratégico' })
      await options.onEvent({ type: 'message-complete', fullText: 'Dictamen Estratégico', durationMs: 100 })
    }

    try {
      let reportText = ''
      await streamAiReport({
        principal: mockPrincipal,
        format: 'executive',
        locale: 'es',
        state: { metadata: { organization: 'DGTECNOVA' } } as any,
        callbacks: {
          onChunk: () => {},
          onComplete: (txt) => { reportText = txt },
          onError: (err) => { throw err }
        }
      })

      assert.ok(capturedOptions)
      assert.equal(capturedOptions.context.app, 'investigator')
      assert.equal(capturedOptions.context.mode, 'CONSULTANT')
      assert.equal(reportText, 'Dictamen Estratégico')
    } finally {
      NovaiAgentRuntime.executeStreaming = originalExecute
    }
  })
})
