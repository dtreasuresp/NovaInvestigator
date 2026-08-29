import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiToolGateway } from '../../src/features/novai/tool-gateway'
import { NovaiMemoryEngine, type NovaiMemory } from '../../src/features/novai/memory-engine'

test('NovAi Tool Gateway & Multi-Level Memory Engine', async t => {
  const mockPrincipal = {
    userId: 'usr-gw-123',
    tenantId: 'tnt-gw-456',
    client: {} as any
  }

  await t.test('Risk Classification: Correctly categorizes read-only vs destructive tools', () => {
    assert.equal(NovaiToolGateway.evaluateToolRisk('list_investigations'), 'low')
    assert.equal(NovaiToolGateway.evaluateToolRisk('get_investigation_details'), 'low')
    assert.equal(NovaiToolGateway.evaluateToolRisk('get_kanban_board_summary'), 'low')
    assert.equal(NovaiToolGateway.evaluateToolRisk('record_strategic_memory'), 'medium')
    assert.equal(NovaiToolGateway.evaluateToolRisk('delete_investigation'), 'high')
    assert.equal(NovaiToolGateway.evaluateToolRisk('change_subscription_plan'), 'high')
  })

  await t.test('Human-in-the-Loop Policy: Blocks unconfirmed high-risk tools and allows confirmed ones', () => {
    // 1. High risk tool without confirmation -> blocked
    const policyUnconfirmed = NovaiToolGateway.checkPolicy('delete_investigation', mockPrincipal, false)
    
    assert.equal(policyUnconfirmed.isAuthorized, false)
    assert.equal(policyUnconfirmed.requiresApproval, true)
    assert.match(policyUnconfirmed.reason || '', /requiere confirmación explícita/)

    // 2. High risk tool with confirmation -> authorized
    const policyConfirmed = NovaiToolGateway.checkPolicy('delete_investigation', mockPrincipal, true)
    
    assert.equal(policyConfirmed.isAuthorized, true)
    assert.equal(policyConfirmed.requiresApproval, false)

    // 3. Low risk tool -> auto-approved
    const policyLow = NovaiToolGateway.checkPolicy('list_investigations', mockPrincipal, false)
    
    assert.equal(policyLow.isAuthorized, true)
    assert.equal(policyLow.requiresApproval, false)
  })

  await t.test('Memory Engine: Formats strategic and workspace memories into governed prompt block', () => {
    const mockMemories: NovaiMemory[] = [
      {
        id: 'mem-1',
        tenantId: 'tnt-1',
        scope: 'strategic',
        category: 'architecture',
        key: 'PAYMENT_PROCESSOR',
        content: 'NovaResearch delega el procesamiento de pagos a Stripe Checkout.',
        confidence: 0.95,
        status: 'active',
        createdAt: '2026-08-23',
        updatedAt: '2026-08-23'
      },
      {
        id: 'mem-2',
        tenantId: 'tnt-1',
        scope: 'workspace',
        category: 'workflow',
        key: 'SPRINT_CADENCE',
        content: 'Los sprints son bisemanales con cierre los viernes.',
        confidence: 1.0,
        status: 'active',
        createdAt: '2026-08-23',
        updatedAt: '2026-08-23'
      }
    ]

    const promptText = NovaiMemoryEngine.formatMemoriesForPrompt(mockMemories)
    
    assert.match(promptText, /MEMORIA PERSISTENTE DE NOVARESEARCH/)
    assert.match(promptText, /MEMORIA ESTRATÉGICA Y DECISIONES PREVIAS/)
    assert.match(promptText, /PAYMENT_PROCESSOR/)
    assert.match(promptText, /CONTEXTO Y ACUERDOS DEL WORKSPACE/)
    assert.match(promptText, /SPRINT_CADENCE/)
  })
})
