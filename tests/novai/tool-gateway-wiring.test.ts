import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiToolGateway } from '../../src/features/novai/tool-gateway'
import { NOVAI_ALL_MODULAR_TOOLS, getNovaiVercelTools } from '../../src/features/novai/tools/index'

/**
 * Stub universal de cliente Supabase: cualquier cadena `.from(t).select()...`
 * resuelve `{ data: null, error: null }` y CAPTURA cada `.insert()` para
 * verificar que el Gateway escribe en `novai_audit_events`.
 */
function createAuditCapturingClient() {
  const insertedRows: Array<{ table: string; row: Record<string, unknown> }> = []

  const makeChain = (table: string): any => {
    const promise = Promise.resolve({ data: null, error: null })

    return new Proxy({}, {
      get(_target, prop) {
        const p = String(prop)

        if (p === 'then' || p === 'catch' || p === 'finally') {
          return (promise as any)[p].bind(promise)
        }

        if (p === 'insert') {
          return (row: Record<string, unknown>) => {
            insertedRows.push({ table, row })

            return makeChain(table)
          }
        }

        return () => makeChain(table)
      }
    })
  }

  const client = {
    from: (table: string) => makeChain(table)
  } as any

  return { client, insertedRows }
}

test('NovAi Tool Gateway Wiring (Fase A PROMPT_NOVAI_PRO_V2)', async t => {
  await t.test('buildGovernedVercelTools expone exactamente el catálogo modular completo', () => {
    const mockPrincipal = { userId: 'usr-wire-1', tenantId: 'tnt-wire-1', client: {} as any }

    const raw = getNovaiVercelTools(mockPrincipal)
    const governed = NovaiToolGateway.buildGovernedVercelTools(mockPrincipal)

    const rawKeys = Object.keys(raw).sort()
    const governedKeys = Object.keys(governed).sort()
    const catalogKeys = Object.keys(NOVAI_ALL_MODULAR_TOOLS).sort()

    assert.deepEqual(governedKeys, catalogKeys)
    assert.deepEqual(rawKeys, catalogKeys)

    for (const name of governedKeys) {
      const tool = governed[name] as { execute?: unknown }

      assert.equal(typeof tool.execute, 'function', `${name} debe seguir exponiendo execute`)
    }
  })

  await t.test('tool read-only ejecuta bajo gobierno y registra auditoría en novai_audit_events', async () => {
    const { client, insertedRows } = createAuditCapturingClient()
    const mockPrincipal = { userId: 'usr-audit-1', tenantId: 'tnt-audit-1', client }

    const governed = NovaiToolGateway.buildGovernedVercelTools(mockPrincipal, { runId: 'run-test-1' })
    const statsTool = governed['get_investigations_stats'] as { execute: (args: Record<string, unknown>) => Promise<unknown> }

    const result = await statsTool.execute({})

    assert.equal(typeof result, 'object')
    assert.ok(result !== null)

    // La auditoría es asíncrona no bloqueante: esperar a que la microtarea asíncrona complete
    await new Promise(resolve => setTimeout(resolve, 50))

    const auditRow = insertedRows.find(r => r.table === 'novai_audit_events')

    assert.ok(auditRow, 'el Gateway debe intentar insertar el evento de auditoría')
    assert.equal(auditRow!.row.tenant_id, 'tnt-audit-1')
    assert.equal(auditRow!.row.user_id, 'usr-audit-1')
    assert.equal(auditRow!.row.tool_name, 'get_investigations_stats')
    assert.equal(auditRow!.row.action, 'tool.get_investigations_stats')
    assert.equal(auditRow!.row.risk_level, 'low')
    assert.equal(auditRow!.row.approval_status, 'auto_approved')
    assert.equal(auditRow!.row.run_id, 'run-test-1')
  })

  await t.test('wrapper captura errores de ejecución sin propagarlos al modelo', async () => {
    const { client } = createAuditCapturingClient()
    const mockPrincipal = { userId: 'usr-err-1', tenantId: 'tnt-err-1', client }

    const governed = NovaiToolGateway.buildGovernedVercelTools(mockPrincipal)
    const memoryTool = governed['record_strategic_memory'] as { execute: (args: Record<string, unknown>) => Promise<unknown> }

    // Args incompletos: ninguna tool gobernada debe lanzar excepción al runtime
    const result = await memoryTool.execute({})

    assert.equal(typeof result, 'object')
    assert.ok(result !== null)
  })

  await t.test('enforcement de riesgo ALTO sigue activo en el Gateway público', async () => {
    const { client } = createAuditCapturingClient()
    const mockPrincipal = { userId: 'usr-high-1', tenantId: 'tnt-high-1', client }

    const denied = await NovaiToolGateway.executeGovernedTool('delete_investigation', {}, mockPrincipal)

    assert.equal(denied.success, false)
    assert.match(denied.error || '', /riesgo ALTO|confirmación explícita/i)
  })
})
