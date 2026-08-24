import type { SupabaseClient } from '@supabase/supabase-js'

// ==============================================================================
// AI Rate Limit — capa Policy/Context §11 del doc RBAC
// Reutiliza rate_limit_buckets (scope ai_chat_daily) y la nueva RPC daily.
// Mantiene SODA: src/features/ai (feature) — llama a infrastructure (Supabase)
// ==============================================================================

export interface DailyQuota {
  readonly remaining: number | null
  readonly limitValue: number | null
  readonly consumed: number
}

/**
 * Peek sin consumo del tope diario (para GET /quota y authorize check).
 * Usa la nueva RPC get_ai_daily_remaining (migración 2026-08-21T01-26-52).
 * Fallback a null si la RPC no existe aún (migración no aplicada).
 */
export async function getDailyQuota(client: SupabaseClient, tenantId: string): Promise<DailyQuota> {
  try {
    const { data, error } = await (client as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
      'get_ai_daily_remaining',
      { p_tenant_id: tenantId }
    )

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Fallback: sin RPC o error → 0 (denied) — no hardcodear unlimited
      return { remaining: 0, limitValue: 0, consumed: 0 }
    }

    const row = data[0] as { remaining: number | null; limit_value: number | null; consumed: number | null }

    return {
      remaining: row.remaining !== null ? Number(row.remaining) : row.limit_value === null ? null : 0,
      limitValue: row.limit_value !== null ? Number(row.limit_value) : row.limit_value === null ? null : 0,
      consumed: row.consumed !== null ? Number(row.consumed) : 0
    }
  } catch {
    return { remaining: 0, limitValue: 0, consumed: 0 }
  }
}

/**
 * Consumo atómico del tope diario (policy) vía consume_ai_daily_quota.
 * Retorna allowed=false si no hay cupo diario.
 */
export async function consumeDailyQuota(
  client: SupabaseClient,
  tenantId: string
): Promise<{ allowed: boolean; remaining: number | null; limitValue: number | null }> {
  try {
    const { data, error } = await (client as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc(
      'consume_ai_daily_quota',
      { p_tenant_id: tenantId }
    )

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Fallback: sin RPC → denegar (no hardcodear unlimited)
      return { allowed: false, remaining: 0, limitValue: 0 }
    }

    const row = data[0] as { allowed: boolean; remaining: number | null; limit_value: number | null }

    return {
      allowed: Boolean(row.allowed),
      remaining: row.remaining !== null ? Number(row.remaining) : row.limit_value === null ? null : 0,
      limitValue: row.limit_value !== null ? Number(row.limit_value) : row.limit_value === null ? null : 0
    }
  } catch {
    return { allowed: false, remaining: 0, limitValue: 0 }
  }
}

/**
 * Helper para el Authorization Engine: expone getDailyRemaining en forma
 * compatible con AuthorizationEngineDeps.getDailyRemaining.
 */
export function createDailyRemainingGetter(client: SupabaseClient) {
  return async (tenantId: string): Promise<{ remaining: number | null; limitValue: number | null }> => {
    const q = await getDailyQuota(client, tenantId)

    return { remaining: q.remaining, limitValue: q.limitValue }
  }
}
