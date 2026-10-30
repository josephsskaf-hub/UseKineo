// KINEO-CENA-RETRY-3010 [TRAVA 8.2 — pedido do fundador 30/10].
// Same recovery for an open tab and the cron. Credit settlement remains with its existing owners.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { POST as retryScene } from '@/app/api/retry-hollywood-scene/route'
import { authorizeCinematicCompletedUrls, authorizeCinematicTerminalFailures, loadVerifiedCinematicClaim, type CinematicClaim } from './claim'
import { readVerifiedSceneRetryHold } from './sceneRetry'
import { CENA_RETRY_EVENT, classificarFalhaDeCena, executarRetentativas, type FalhaDeCena, type PlanoDaCena } from './sceneRetryPolicy'
import { HOLLYWOOD_SCENE_RETRIED_EVENT } from '@/lib/stuckScene'
import { SCENE_RETRY_BUDGET_EVENT, sceneRetryBudgetId } from '@/lib/sceneRetryBudget'

export function sceneRetryPollIdsMatch(ids: readonly (string | null)[], claim: CinematicClaim): boolean {
  if (ids.length !== claim.falRequestIds.length) return false
  const history = claim.response?.scene_retry_replacements
  return ids.every((id, i) => id === claim.falRequestIds[i] || typeof id === 'string' && Array.isArray(history) && history.some(h =>
    h && h.index === i && h.old_request_id === id && h.model === claim.falModels[i]))
}

function markerId(userId: string, generationId: string, p: PlanoDaCena, phase: string): string {
  const hex = createHash('sha256').update(JSON.stringify(['kineo:cena-retry-cron:v1', userId, generationId, p.falha.index, p.falha.requestId, phase])).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export async function recoverSceneFailures(a: {
  db: SupabaseClient; secret: string; userId: string; generationId: string
  failures: FalhaDeCena[]; completed: Array<{ requestId: string; model: string; url: string }>
  via: 'poll' | 'cron'; now?: number
}): Promise<{ reenviadas: number; segurar: boolean; claim: CinematicClaim | null }> {
  const now = a.now ?? Date.now()
  const identity = { db: a.db, secret: a.secret, userId: a.userId, generationId: a.generationId }
  const loaded = await loadVerifiedCinematicClaim(identity)
  if (!loaded.ok || !loaded.claim) return { reenviadas: 0, segurar: true, claim: null }
  let claim = loaded.claim
  if (claim.status !== 'settled') return { reenviadas: 0, segurar: false, claim }
  // Frozen Kling4 ledgers already own their fallback allowance; never buy another slot.
  if (claim.response?.kling4_trial || claim.response?.kling4_paid) return { reenviadas: 0, segurar: false, claim }
  const started = Date.parse(claim.startedAt), age = (now - started) / 60_000
  const inTime = Number.isFinite(age) && age >= 0 && age < 70
  if (!inTime) return { reenviadas: 0, segurar: false, claim }
  const originalIds = [...claim.falRequestIds]
  // A concurrent retry changed our snapshot. Poll the new ids before considering compose/refund.
  if (a.failures.some(f => claim.falRequestIds[f.index] !== f.requestId)) return { reenviadas: 0, segurar: true, claim }
  const hold = await readVerifiedSceneRetryHold(identity)
  if (hold && now - Date.parse(hold.startedAt) < 120_000) return { reenviadas: 0, segurar: true, claim }
  const { data: rows, error } = await a.db.from('events').select('id,name,created_at,metadata')
    .eq('user_id', a.userId).eq('session_id', a.generationId)
    .in('name', [HOLLYWOOD_SCENE_RETRIED_EVENT, CENA_RETRY_EVENT, SCENE_RETRY_BUDGET_EVENT]).limit(500)
  if (error || !rows || rows.length >= 500) return { reenviadas: 0, segurar: true, claim }
  // Remember the classification of a proved terminal job across a later status lookup outage.
  // The deterministic server record contains only a closed class, never provider text or customer prompts.
  const failures = a.failures.map(f => {
    if (classificarFalhaDeCena(f) !== 'desconhecida') return f
    const prior = rows.find(r => r.name === CENA_RETRY_EVENT && r.metadata?.fase === 'observada' &&
      r.metadata?.scene_index === f.index && r.metadata?.old_request_id === f.requestId && r.metadata?.model === f.model)
    const classe = prior?.metadata?.classe
    return { ...f, message: classe === 'retentavel' ? 'temporarily unavailable' : classe === 'conteudo' ? 'content policy' : classe === 'saldo' ? 'insufficient funds' : '' }
  })
  for (const f of failures) {
    const p: PlanoDaCena = { falha: f, classe: classificarFalhaDeCena(f), decisao: 'esperar', tentativa: 1 }
    if (p.classe === 'desconhecida') continue
    await a.db.from('events').insert({ id: markerId(a.userId, a.generationId, p, 'observada'), name: CENA_RETRY_EVENT,
      user_id: a.userId, session_id: a.generationId, path: '/api/cinematic-clip-status',
      metadata: { fase: 'observada', scene_index: f.index, old_request_id: f.requestId, model: f.model, classe: p.classe } })
  }
  const previous = rows.filter(r => r.name === SCENE_RETRY_BUDGET_EVENT
    ? Number.isInteger(r.metadata?.scene_index) && [0, 1].includes(r.metadata?.retry_budget_slot) &&
      r.id === sceneRetryBudgetId(a.userId, a.generationId, r.metadata.scene_index, r.metadata.retry_budget_slot)
    : r.name === HOLLYWOOD_SCENE_RETRIED_EVENT && r.metadata?.retry_budget_slot === undefined).map(r => ({
    index: Number(r.metadata?.scene_index), at: Date.parse(r.created_at),
  })).filter(r => Number.isInteger(r.index) && Number.isFinite(r.at))
  let recentDuplicate = false
  // A finished/abandoned submit of the SAME old job cannot be posted blindly again. Skip it BEFORE the round limit,
  // so one rejected submit in a zero-ready batch cannot starve the other untouched scenes.
  const candidates = failures.filter(f => {
    const p: PlanoDaCena = { falha: f, classe: classificarFalhaDeCena(f), decisao: 'retentar', tentativa: 1 }
    const marker = rows.find(r => r.id === markerId(a.userId, a.generationId, p, 'tentativa'))
    if (!marker) return true
    const finished = rows.some(r => r.name === CENA_RETRY_EVENT && r.metadata?.fase === 'resultado' &&
      r.metadata?.scene_index === f.index && r.metadata?.old_request_id === f.requestId)
    if (!finished && now - Date.parse(marker.created_at) < 120_000) recentDuplicate = true
    return false
  })
  const result = await executarRetentativas({
    falhas: candidates, anteriores: previous, prontas: a.completed.length,
    agora: now, inicioMs: started, idadeMin: age,
    maxPerRound: a.completed.length === 0 ? 1 : 4,
    allTerminal: claim.response?.submission_uncertain === false && originalIds.every((id, i) => !!id &&
      (!!claim.authorizedCompletedUrls[i] || a.completed.some(c => c.requestId === id && c.model === claim.falModels[i]) ||
        a.failures.some(f => f.index === i && f.requestId === id && f.model === claim.falModels[i]))),
    deps: {
      marcar: async (phase, p, metadata) => {
        const id = markerId(a.userId, a.generationId, p, phase)
        const existing = rows.find(r => r.id === id)
        if (phase === 'tentativa' && existing) {
          const finished = rows.some(r => r.name === CENA_RETRY_EVENT && r.metadata?.fase === 'resultado' && r.metadata?.old_request_id === p.falha.requestId && r.metadata?.scene_index === p.falha.index)
          if (!finished && now - Date.parse(existing.created_at) < 120_000) recentDuplicate = true
        }
        const { error: insertError } = await a.db.from('events').insert({ id, name: CENA_RETRY_EVENT,
          user_id: a.userId, session_id: a.generationId, path: '/api/cinematic-clip-status', metadata: { ...metadata, via: a.via } })
        if (insertError?.code === '23505' && phase === 'tentativa' && !existing) recentDuplicate = true
        return !insertError ? 'nova' : insertError.code === '23505' ? 'repetida' : 'erro'
      },
      provar: async () => {
        if (a.completed.length && !(await authorizeCinematicCompletedUrls({ ...identity, completed: a.completed })).ok) return false
        return (await authorizeCinematicTerminalFailures({ ...identity, failed: failures.map(f => ({ requestId: f.requestId, model: f.model })) })).ok
      },
      reenviar: async f => {
        try {
          const response = await retryScene(new NextRequest('https://www.usekineo.com/api/retry-hollywood-scene', {
            method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`, 'x-kineo-service-user': a.userId },
            body: JSON.stringify({ generationId: a.generationId, sceneIndex: f.index, model: f.model, oldRequestId: f.requestId, sanitize: false }),
          }))
          const body = await response.json().catch(() => null)
          if (response.status === 409 && body?.pending === true) recentDuplicate = true
          return { status: response.status, requestId: typeof body?.requestId === 'string' ? body.requestId : null }
        } catch { return { status: 0 } }
      },
      registrar: async (_p, metadata) => {
        try { await a.db.from('events').insert({ name: CENA_RETRY_EVENT, user_id: a.userId, session_id: a.generationId,
          path: '/api/cinematic-clip-status', metadata: { ...metadata, via: a.via } }) } catch { /* Diagnostic only. */ }
      },
    },
  })
  const refreshed = await loadVerifiedCinematicClaim(identity)
  if (!refreshed.ok || !refreshed.claim) return { reenviadas: result.reenviadas, segurar: true, claim: null }
  claim = refreshed.claim
  return { reenviadas: result.reenviadas, segurar: result.segurar || recentDuplicate ||
    originalIds.some((id, i) => id !== claim.falRequestIds[i]), claim }
}
