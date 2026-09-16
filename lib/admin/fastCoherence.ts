// KINEO-1-COERENCIA-2026-09-16 — leitura do painel: filmes do Kineo 1 com a nota de coerência.
//
// Junta, por filme: videos (fast) → compose_submission_claim pelo render_id (o que foi NARRADO e o
// generation_id) → fast_scene_plan pelo generation_id (o plano visual cena a cena, gravado pela rota)
// → fast_coherence pelo generation_id (a nota, se já calculada). O que ainda não tem nota é julgado
// aqui, até `maxCompute` por chamada, e a nota é GRAVADA como evento — o próximo painel só lê.
// Só serviço (service role); nunca chamado do lado do cliente.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FAST_COHERENCE_EVENT,
  FAST_COHERENCE_VERSION,
  FAST_SCENE_PLAN_EVENT,
  TOPIC_TRUNCATION_HINT,
  scoreFastCoherence,
  type FastCoherenceResult,
  type FastSceneEvidence,
} from '@/lib/fastCoherence'

export type FastCoherenceRow = {
  video_id: string
  created_at: string
  user_id: string
  email: string | null
  topic: string
  /** true = só existe o texto cortado em 500 do vídeo (filme anterior ao rastro completo) */
  topic_truncated: boolean
  narration: string | null
  url: string | null
  seconds: number | null
  credits: number | null
  generation_id: string | null
  render_id: string | null
  scenes: FastSceneEvidence[] | null
  stills_used: number
  sources: Record<string, number>
  coherence: FastCoherenceResult | null
  coherence_at: string | null
}

type VideoRow = { id: string; user_id: string; created_at: string; topic: string | null; video_url: string | null; duration: number | null; credits_used: number | null; render_id: string | null }
type EventRow = { created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }

function histogram(scenes: FastSceneEvidence[] | null): Record<string, number> {
  const h: Record<string, number> = {}
  for (const s of scenes ?? []) for (const src of s.sources) h[src] = (h[src] ?? 0) + 1
  return h
}

/**
 * Filmes do Kineo 1 na janela, com nota. `userId` restringe a uma pessoa (painel por pessoa).
 * `maxCompute` = quantos filmes sem nota são julgados nesta chamada (0 = só ler).
 */
export async function listFastCoherence(
  admin: SupabaseClient,
  opts: { hours?: number; limit?: number; userId?: string; maxCompute?: number; excludeEmails?: string[] },
): Promise<FastCoherenceRow[]> {
  const hours = Math.max(1, Math.min(24 * 30, opts.hours ?? 48))
  const limit = Math.max(1, Math.min(300, opts.limit ?? 120))
  const since = new Date(Date.now() - hours * 3600_000).toISOString()

  let vq = admin
    .from('videos')
    .select('id, user_id, created_at, topic, video_url, duration, credits_used, render_id')
    .eq('quality_mode', 'fast')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts.userId) vq = vq.eq('user_id', opts.userId)
  const { data: vids } = await vq
  const videos = (vids ?? []) as VideoRow[]
  if (videos.length === 0) return []

  const userIds = Array.from(new Set(videos.map((v) => v.user_id)))
  const renderIds = videos.map((v) => v.render_id).filter((r): r is string => typeof r === 'string' && r.length > 0)

  const [profs, claims] = await Promise.all([
    admin.from('profiles').select('id, email').in('id', userIds),
    renderIds.length
      ? admin
          .from('events')
          .select('created_at, session_id, user_id, metadata')
          .eq('name', 'compose_submission_claim')
          .in('user_id', userIds)
          .gte('created_at', since)
          .limit(1000)
      : Promise.resolve({ data: [] as EventRow[] }),
  ])
  const emailOf = new Map<string, string | null>()
  for (const p of (profs.data ?? []) as Array<{ id: string; email: string | null }>) emailOf.set(p.id, p.email)
  const excluded = new Set((opts.excludeEmails ?? []).map((e) => e.toLowerCase()))

  const claimByRender = new Map<string, EventRow>()
  for (const c of (claims.data ?? []) as EventRow[]) {
    const rid = c.metadata?.render_id
    if (typeof rid === 'string' && !claimByRender.has(rid)) claimByRender.set(rid, c)
  }
  const genIds = Array.from(
    new Set(Array.from(claimByRender.values()).map((c) => c.metadata?.generation_id).filter((g): g is string => typeof g === 'string' && g.length > 0)),
  )

  const [plans, scores] = genIds.length
    ? await Promise.all([
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', FAST_SCENE_PLAN_EVENT).in('session_id', genIds).limit(1000),
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', FAST_COHERENCE_EVENT).in('session_id', genIds).limit(1000),
      ])
    : [{ data: [] as EventRow[] }, { data: [] as EventRow[] }]
  const planByGen = new Map<string, EventRow>()
  for (const p of (plans.data ?? []) as EventRow[]) if (p.session_id && !planByGen.has(p.session_id)) planByGen.set(p.session_id, p)
  const scoreByGen = new Map<string, EventRow>()
  for (const s of (scores.data ?? []) as EventRow[]) {
    if (!s.session_id) continue
    const prev = scoreByGen.get(s.session_id)
    if (!prev || prev.created_at < s.created_at) scoreByGen.set(s.session_id, s)
  }

  const rows: FastCoherenceRow[] = []
  for (const v of videos) {
    const email = emailOf.get(v.user_id) ?? null
    if (email && excluded.has(email.toLowerCase())) continue
    const claim = v.render_id ? claimByRender.get(v.render_id) : undefined
    const gen = typeof claim?.metadata?.generation_id === 'string' ? (claim.metadata.generation_id as string) : null
    const narration = typeof claim?.metadata?.narration === 'string' ? (claim.metadata.narration as string) : null
    const plan = gen ? planByGen.get(gen) : undefined
    const scenes = Array.isArray(plan?.metadata?.scenes) ? (plan!.metadata!.scenes as FastSceneEvidence[]) : null
    const scoreEv = gen ? scoreByGen.get(gen) : undefined
    // Só a versão vigente do juiz vale; nota antiga é julgada de novo (custa ~US$ 0,001).
    const coherence = scoreEv?.metadata && typeof scoreEv.metadata.score === 'number' && scoreEv.metadata.version === FAST_COHERENCE_VERSION ? (scoreEv.metadata as unknown as FastCoherenceResult) : null
    // O texto mais longo que existir: plano (inteiro, filmes novos) > claim > vídeo (cortado em 500).
    const candidatos = [typeof plan?.metadata?.topic === 'string' ? (plan!.metadata!.topic as string) : '', typeof claim?.metadata?.topic === 'string' ? (claim.metadata.topic as string) : '', v.topic ?? '']
    const topic = candidatos.reduce((a, b) => (b.length > a.length ? b : a), '')
    const topicTruncated = !(typeof plan?.metadata?.topic === 'string') && topic.length >= TOPIC_TRUNCATION_HINT
    const sources = histogram(scenes)
    rows.push({
      video_id: v.id,
      created_at: v.created_at,
      user_id: v.user_id,
      email,
      topic,
      topic_truncated: topicTruncated,
      narration,
      url: v.video_url,
      seconds: v.duration,
      credits: v.credits_used,
      generation_id: gen,
      render_id: v.render_id,
      scenes,
      stills_used: sources.aiStill ?? 0,
      sources,
      coherence,
      coherence_at: scoreEv?.created_at ?? null,
    })
  }

  // Julga o que ainda não tem nota (mais recentes primeiro), grava, e devolve já com a nota.
  const maxCompute = Math.max(0, Math.min(12, opts.maxCompute ?? 6))
  const pending = rows.filter((r) => !r.coherence && r.generation_id && r.narration && r.topic).slice(0, maxCompute)
  if (pending.length > 0) {
    await Promise.all(
      pending.map(async (r) => {
        const result = await scoreFastCoherence({ prompt: r.topic, narration: r.narration ?? '', scenes: r.scenes, promptMayBeTruncated: r.topic_truncated })
        if (!result) return
        r.coherence = result
        r.coherence_at = new Date().toISOString()
        await admin.from('events').insert({
          name: FAST_COHERENCE_EVENT,
          user_id: r.user_id,
          session_id: r.generation_id,
          path: '/admin/coerencia',
          metadata: { ...result, video_id: r.video_id, render_id: r.render_id, generation_id: r.generation_id, topic: r.topic.slice(0, 120), topic_truncated: r.topic_truncated },
        })
      }),
    )
  }
  return rows
}
