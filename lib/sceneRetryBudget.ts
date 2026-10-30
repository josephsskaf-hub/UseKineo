// KINEO-RETRY-BUDGET-3010 — every caller shares two durable slots per scene.
// The compose mutex serializes scene replacement; these immutable PKs survive refreshes,
// changed provider IDs and missing telemetry. They never debit or refund customer credits.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const SCENE_RETRY_BUDGET_EVENT = 'cinematic_scene_retry_budget'
export const SCENE_RETRY_BUDGET_MAX = 2
export const SCENE_RETRY_BUDGET_MAX_AGE_MS = 70 * 60_000
const RETRY_PATH = '/api/retry-hollywood-scene'

export function sceneRetryBudgetOpen(startedAt: string, now: number): boolean {
  const start = Date.parse(startedAt)
  return Number.isFinite(start) && Number.isFinite(now) && now >= start && now - start < SCENE_RETRY_BUDGET_MAX_AGE_MS
}

export function sceneRetryBudgetId(userId: string, generationId: string, sceneIndex: number, slot: number): string {
  const hex = createHash('sha256').update(JSON.stringify(['kineo:scene-retry-budget:v1', userId, generationId, sceneIndex, slot])).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** Called only while owning the compose mutex and after verifying the signed birth. */
export async function reserveSceneRetryBudget(a: {
  db: SupabaseClient; userId: string; generationId: string; sceneIndex: number
  oldRequestId: string | null; model: string; startedAt: string; now: number
}): Promise<{ kind: 'reserved'; slot: number } | { kind: 'exhausted' | 'expired' | 'unavailable' }> {
  if (!sceneRetryBudgetOpen(a.startedAt, a.now)) return { kind: 'expired' }
  try {
    // Only pre-upgrade successful replacements count here. New successes carry their
    // durable slot index, so a successful POST is never counted twice.
    const { data, error } = await a.db.from('events').select('metadata')
      .eq('name', 'hollywood_scene_retried').eq('path', RETRY_PATH)
      .eq('user_id', a.userId).eq('session_id', a.generationId).limit(201)
    if (error || !Array.isArray(data) || data.length >= 201) return { kind: 'unavailable' }
    const legacy = new Set<string>()
    for (const row of data) {
      const md = row.metadata as Record<string, unknown> | null
      if (md?.scene_index === a.sceneIndex && md.retry_budget_slot === undefined &&
          typeof md.new_request_id === 'string' && md.new_request_id) legacy.add(md.new_request_id)
    }
    for (let slot = legacy.size; slot < SCENE_RETRY_BUDGET_MAX; slot++) {
      const { error: insertError } = await a.db.from('events').insert({
        id: sceneRetryBudgetId(a.userId, a.generationId, a.sceneIndex, slot), user_id: a.userId,
        name: SCENE_RETRY_BUDGET_EVENT, path: RETRY_PATH, session_id: a.generationId,
        metadata: { scene_index: a.sceneIndex, old_request_id: a.oldRequestId, model: a.model,
          retry_budget_slot: slot, max_attempts: SCENE_RETRY_BUDGET_MAX },
      })
      if (!insertError) return { kind: 'reserved', slot }
      if ((insertError as { code?: string }).code !== '23505') return { kind: 'unavailable' }
    }
    return { kind: 'exhausted' }
  } catch { return { kind: 'unavailable' } }
}
