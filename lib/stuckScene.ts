import type { SupabaseClient } from '@supabase/supabase-js'
// ═══ KINEO-CENA-PRESA-2026-09-22 — a cena que nunca volta do fornecedor deixa de segurar o filme ═══
//
// Render H3 nº 1 (22/09 03:16Z, geração d7f73bf6): 5/5 cenas aceitas, 4 prontas em ~4 min, a 5ª ficou IN_PROGRESS
// na fal por 50 min. O cliente só desistia no FAL_POLL_DEADLINE_MS (50 min) e ninguém ressubmetia: 27 cr presos,
// filme nenhum, estorno só pelo cron 2 h depois. Fundador (proposta 22/09, "vai"): teto por cena + ressubmissão.
//
// A peça reaproveita o que já existia: o cliente já re-submete UMA cena que o fornecedor recusou (duas rodadas,
// /api/retry-hollywood-scene, retarget do claim assinado). O que faltava era declarar a cena PRESA como recusada.
// Regra (pura, aqui): com pelo menos uma cena PRONTA da mesma geração (o fornecedor está vivo) e o relógio da
// última submissão em ≥ 12 min, toda cena pendente/em processamento vira `failed` (stuck); sem nenhuma pronta,
// o teto é 20 min (todas presas → all_failed → estorno imediato, nunca 50 min de spinner). O relógio reinicia a
// cada ressubmissão (evento HOLLYWOOD_SCENE_RETRIED_EVENT, gravado pela rota de retry).
export const STUCK_SCENE_WITH_PROGRESS_MINUTES = 12
export const STUCK_SCENE_NO_PROGRESS_MINUTES = 20
export const CINEMATIC_SCENE_STUCK_EVENT = 'cinematic_scene_stuck'
export const HOLLYWOOD_SCENE_RETRIED_EVENT = 'hollywood_scene_retried'

export type ClipStatusWord = 'pending' | 'processing' | 'done' | 'failed'

/** Índices das cenas a declarar presas. Puro. */
export function stuckSceneIndexes(statuses: ReadonlyArray<ClipStatusWord>, elapsedMinutes: number, thresholds?: { withProgress?: number; noProgress?: number }): number[] {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes <= 0) return []
  const anyDone = statuses.some((s) => s === 'done')
  const limite = anyDone ? (thresholds?.withProgress ?? STUCK_SCENE_WITH_PROGRESS_MINUTES) : (thresholds?.noProgress ?? STUCK_SCENE_NO_PROGRESS_MINUTES)
  if (elapsedMinutes < limite) return []
  const out: number[] = []
  statuses.forEach((s, i) => { if (s === 'pending' || s === 'processing') out.push(i) })
  return out
}

/** Relógio da geração: a última submissão (claim settled ou último retry), em ms. 0 = desconhecido (nunca declara). */
export function stuckClockStart(claimCompletedAt: string | null | undefined, claimStartedAt: string | null | undefined, lastRetryAt: string | null | undefined): number {
  const c = Date.parse(claimCompletedAt ?? '')
  const s = Date.parse(claimStartedAt ?? '')
  const r = Date.parse(lastRetryAt ?? '')
  const base = Number.isFinite(c) ? c : Number.isFinite(s) ? s : 0
  return Math.max(base, Number.isFinite(r) ? r : 0)
}


/** Último retry de cena desta geração (a rota de retry grava o evento com session_id = generationId). Falha aberta → null. */
export async function lastSceneRetryAt(db: SupabaseClient, generationId: string): Promise<string | null> {
  try {
    const { data, error } = await db.from('events').select('created_at').eq('session_id', generationId).eq('name', HOLLYWOOD_SCENE_RETRIED_EVENT).order('created_at', { ascending: false }).limit(1)
    if (error || !data || data.length === 0) return null
    return typeof data[0].created_at === 'string' ? data[0].created_at : null
  } catch {
    return null
  }
}
