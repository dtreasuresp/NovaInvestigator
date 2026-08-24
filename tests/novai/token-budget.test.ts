import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiTokenBudget } from '../../src/features/novai/token-budget'

test('NovAi Token Budget & Intelligent Conversation Trimming', async t => {
  await t.test('estimateTokens: calculates conservative token counts for multilingual text and code', () => {
    assert.equal(NovaiTokenBudget.estimateTokens(''), 0)
    assert.equal(NovaiTokenBudget.estimateTokens(null), 0)

    const shortText = 'Hola mundo'
    const shortTokens = NovaiTokenBudget.estimateTokens(shortText)
    assert.ok(shortTokens >= 3 && shortTokens <= 5)

    const complexMathText = 'Fórmula general: $$TAS_i = w_i \\cdot AS_i$$ donde w_i es el peso normalizado.'
    const mathTokens = NovaiTokenBudget.estimateTokens(complexMathText)
    assert.ok(mathTokens >= 20)
  })

  await t.test('estimateMessagesTokens: includes message structure, tool calls and IDs overhead', () => {
    const messages = [
      { role: 'user', content: '¿Por qué F-01 da 0.03?' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: { name: 'get_investigation_details', arguments: '{"investigation_id":"inv-123"}' }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: 'call-1',
        content: '{"factor":"F-01","weight":0.06}'
      }
    ]

    const total = NovaiTokenBudget.estimateMessagesTokens(messages)
    assert.ok(total > 30, 'Total tokens should account for tool calls and message payload')
  })

  await t.test('trimConversationHistory: does not trim when messages are within budget', () => {
    const systemPrompt = 'Eres NovAi, asesor estratégico.'
    const messages = [
      { role: 'user', content: 'Pregunta 1' },
      { role: 'assistant', content: 'Respuesta 1' },
      { role: 'user', content: 'Pregunta 2' }
    ]

    const result = NovaiTokenBudget.trimConversationHistory({
      messages,
      systemPrompt,
      maxTotalTokens: 10000,
      reservedOutputTokens: 2000
    })

    assert.equal(result.wasTrimmed, false)
    assert.equal(result.omittedCount, 0)
    assert.equal(result.trimmedMessages.length, 3)
  })

  await t.test('trimConversationHistory: preserves anchor message and sliding window when budget is exceeded', () => {
    const systemPrompt = 'Sistema: ' + 'A'.repeat(500) // ~156 tokens

    const longMessages = [
      { role: 'user', content: 'MENSAJE_ANCLA_ORIGINAL: ' + 'X'.repeat(50) },
      { role: 'assistant', content: 'Respuesta intermedia 1: ' + 'Y'.repeat(200) },
      { role: 'user', content: 'Pregunta intermedia 2: ' + 'Y'.repeat(200) },
      { role: 'assistant', content: 'Respuesta intermedia 2: ' + 'Y'.repeat(200) },
      { role: 'user', content: 'Pregunta intermedia 3: ' + 'Y'.repeat(200) },
      { role: 'assistant', content: 'Respuesta intermedia 3: ' + 'Y'.repeat(200) },
      { role: 'user', content: 'ULTIMA_PREGUNTA_RECIENTE: ' + 'Z'.repeat(50) }
    ]

    // Presupuesto pequeño forzado para activar el recorte inteligente
    const result = NovaiTokenBudget.trimConversationHistory({
      messages: longMessages,
      systemPrompt,
      maxTotalTokens: 600,
      reservedOutputTokens: 100
    })

    assert.equal(result.wasTrimmed, true)
    assert.ok(result.omittedCount > 0, 'Debe haber omitido mensajes intermedios')

    // El primer mensaje debe ser el ancla original
    assert.match(result.trimmedMessages[0].content || '', /MENSAJE_ANCLA_ORIGINAL/)

    // El segundo elemento debe ser la nota de compresión
    assert.equal(result.trimmedMessages[1].role, 'system')
    assert.match(result.trimmedMessages[1].content || '', /Nota de memoria contextual/)

    // El último mensaje debe ser la pregunta más reciente
    const lastMsg = result.trimmedMessages[result.trimmedMessages.length - 1]
    assert.match(lastMsg.content || '', /ULTIMA_PREGUNTA_RECIENTE/)
  })

  await t.test('trimConversationHistory: preserves tool_calls and tool result pairing during trim', () => {
    const systemPrompt = 'Sistema'
    const messages = [
      { role: 'user', content: 'Inicio' },
      { role: 'assistant', content: 'Old 1: ' + 'W'.repeat(200) },
      { role: 'user', content: 'Old 2: ' + 'W'.repeat(200) },
      {
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'tc-99', function: { name: 'get_stats' } }]
      },
      {
        role: 'tool',
        tool_call_id: 'tc-99',
        content: '{"status":"ok"}'
      },
      { role: 'user', content: 'Fin' }
    ]

    const result = NovaiTokenBudget.trimConversationHistory({
      messages,
      systemPrompt,
      maxTotalTokens: 500,
      reservedOutputTokens: 100
    })

    // Si incluye el mensaje 'tool', DEBE incluir también el 'assistant' con tool_calls inmediatamente anterior
    const toolIdx = result.trimmedMessages.findIndex(m => m.role === 'tool')
    if (toolIdx > 0) {
      const prevMsg = result.trimmedMessages[toolIdx - 1]
      assert.equal(prevMsg.role, 'assistant')
      assert.ok(prevMsg.tool_calls, 'Tool call message must precede tool result message')
    }
  })
})
