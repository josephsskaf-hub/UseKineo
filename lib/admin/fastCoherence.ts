// KINEO-1-COERENCIA-2026-09-16 — leitura do painel: filmes com a nota de coerência.
// R3 (fundador 16/09 noite: "aplicar em todos os motores… ter essa régua do meu olho"): TODOS os motores.
//
// Junta, por filme: videos → compose_submission_claim pelo render_id (o que foi NARRADO e o generation_id)
// → evidência visual pelo generation_id:
//   · Kineo 1: fast_scene_plan (fala · busca · origem do clipe · tags), gravado pela rota;
//   · motores de IA (Seedance/Veo/Kling/H3/Omni/S25): cinematic_dispatch_result, que a casa JÁ grava desde
//     o #353A — `submitted_prompts` (o prompt exato de cada cena) e `scenes[].disposition` (aceita/rejeitada);
// → fast_coherence pelo generation_id (a nota, se já calculada na versão vigente) → film_feedback pelo
// video_id (o 👍/👎 que a pessoa deu no e-mail de entrega — a régua humana ao lado da do juiz).
// O que ainda não tem nota é julgado aqui, até `maxCompute` por chamada, e gravado como evento.
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
import { FILM_FEEDBACK_ASKED_EVENT, FILM_FEEDBACK_EVENT, type FilmFeedbackVerdict } from '@/lib/filmFeedback'

export type FastCoherenceRow = {
  video_id: string
  created_at: string
  user_id: string
  email: string | null
  /** quality_mode do vídeo (fast, cinematic_ai, cinematic_kling, …) */
  engine: string
  topic: string
  /** true = só existe o texto cortado (500/1.000) do vídeo/claim (filme anterior ao rastro completo) */
  topic_truncated: boolean
  narration: string | null
  /** de onde a narração veio (KINEO-JUIZ-COBRE-OS-8): compose_claim | birth_claim | recoverable | scene_plan */
  narration_source: 'compose_claim' | 'birth_claim' | 'recoverable' | 'scene_plan' | null
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
  /** 👍/👎 da pessoa (e-mail de entrega), com comentário se deixou */
  feedback: { verdict: FilmFeedbackVerdict; comment: string | null; at: string } | null
  /** quando o fundador já mandou o e-mail "did it match?" para este filme (botão do quadro) */
  feedback_asked_at: string | null
}

type VideoRow = { id: string; user_id: string; created_at: string; topic: string | null; video_url: string | null; duration: number | null; credits_used: number | null; render_id: string | null; quality_mode: string | null }
type EventRow = { created_at: string; session_id: string | null; user_id: string | null; metadata: Record<string, unknown> | null }

export const ENGINE_LABEL: Record<string, string> = {
  fast: 'Kineo 1',
  cinematic_ai: 'Seedance 1.5',
  cinematic_veo: 'Veo 3.1',
  cinematic_kling: 'Kling 2.5',
  cinematic_hollywood: 'Kling 3',
  cinematic_h3: 'MiniMax H3',
  cinematic_omni: 'Omni',
  cinematic_s25: 'Seedance 2.5',
  avatar: 'Avatar',
}

function histogram(scenes: FastSceneEvidence[] | null): Record<string, number> {
  const h: Record<string, number> = {}
  for (const s of scenes ?? []) for (const src of s.sources) h[src] = (h[src] ?? 0) + 1
  return h
}

/** cinematic_dispatch_result → evidência por cena (prompt exato + aceita/rejeitada). */
export function evidenceFromDispatch(md: Record<string, unknown> | null | undefined): FastSceneEvidence[] | null {
  if (!md) return null
  const prompts = Array.isArray(md.submitted_prompts) ? (md.submitted_prompts as unknown[]) : []
  const scenes = Array.isArray(md.scenes) ? (md.scenes as Array<Record<string, unknown>>) : []
  const n = Math.max(prompts.length, scenes.length)
  if (n === 0) return null
  const out: FastSceneEvidence[] = []
  for (let i = 0; i < n; i++) {
    const sc = scenes.find((s) => s && s.scene_index === i) ?? scenes[i]
    const disp = typeof sc?.disposition === 'string' ? (sc.disposition as string) : 'unknown'
    const p = typeof prompts[i] === 'string' ? (prompts[i] as string) : null
    out.push({
      scene: i + 1,
      voiceover: '',
      query: p ? p.replace(/\s+/g, ' ').trim().slice(0, 320) : null,
      from: i,
      sources: [disp === 'accepted' ? 'aiVideo' : disp === 'rejected' ? 'rejected' : `ai_${disp}`],
      tags: [],
    })
  }
  return out
}

/**
 * Filmes na janela, com nota. `userId` restringe a uma pessoa; `engine` a um motor (quality_mode).
 * `maxCompute` = quantos filmes sem nota são julgados nesta chamada (0 = só ler).
 */
export async function listFastCoherence(
  admin: SupabaseClient,
  opts: { hours?: number; limit?: number; userId?: string; engine?: string; maxCompute?: number; excludeEmails?: string[] },
): Promise<FastCoherenceRow[]> {
  const hours = Math.max(1, Math.min(24 * 30, opts.hours ?? 48))
  const limit = Math.max(1, Math.min(300, opts.limit ?? 120))
  const since = new Date(Date.now() - hours * 3600_000).toISOString()

  let vq = admin
    .from('videos')
    .select('id, user_id, created_at, topic, video_url, duration, credits_used, render_id, quality_mode')
    .neq('quality_mode', 'clip') // "Just this clip" não tem narração: nada para ser coerente com
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts.userId) vq = vq.eq('user_id', opts.userId)
  if (opts.engine) vq = vq.eq('quality_mode', opts.engine)
  const { data: vids } = await vq
  const videos = (vids ?? []) as VideoRow[]
  if (videos.length === 0) return []

  const userIds = Array.from(new Set(videos.map((v) => v.user_id)))
  const videoIds = videos.map((v) => v.id)
  const renderIds = videos.map((v) => v.render_id).filter((r): r is string => typeof r === 'string' && r.length > 0)

  const [profs, claims, feedbacks] = await Promise.all([
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
    admin
      .from('events')
      .select('created_at, session_id, user_id, metadata')
      .in('name', [FILM_FEEDBACK_EVENT, FILM_FEEDBACK_ASKED_EVENT])
      .in('session_id', videoIds)
      .order('created_at', { ascending: true })
      .limit(1000),
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

  // ═══ KINEO-JUIZ-COBRE-OS-8-2026-09-22 — o juiz só via 4 de 8 motores, e metade do Seedance ═══
  // Medido 22/09 (30 d, videos completos): a narração que o juiz exige vinha SÓ do claim de compose, que a carrega em
  // 208/339 filmes do Kineo 1, 110/230 do Seedance, 1/10 do Omni, 1/10 do H3, 4/7 do Kling 3. Sem narração, o filme
  // nunca entra em 'pending' — e o placar dizia "sem juiz" para a estrada hollywood inteira. A narração existe em 100%
  // dos filmes cinematic no claim de NASCIMENTO (cinematic_submission_claim.response.voiceover_script, com o prompt
  // completo em response.prompt) e, no Kineo 1 resgatado, em fast_compose_recoverable.payload.voiceover_script.
  // Cadeia: compose → nascimento → recuperável → plano (voiceovers das cenas). O evento grava narration_source.
  const [plans, dispatches, scores, births, recoverables] = genIds.length
    ? await Promise.all([
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', FAST_SCENE_PLAN_EVENT).in('session_id', genIds).limit(1000),
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', 'cinematic_dispatch_result').in('metadata->>generation_id', genIds).order('created_at', { ascending: false }).limit(1000),
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', FAST_COHERENCE_EVENT).in('session_id', genIds).limit(1000),
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', 'cinematic_submission_claim').in('session_id', genIds).limit(1000),
        admin.from('events').select('created_at, session_id, user_id, metadata').eq('name', 'fast_compose_recoverable').in('session_id', genIds).limit(1000),
      ])
    : [{ data: [] as EventRow[] }, { data: [] as EventRow[] }, { data: [] as EventRow[] }, { data: [] as EventRow[] }, { data: [] as EventRow[] }]
  const birthByGen = new Map<string, EventRow>()
  for (const b of (births.data ?? []) as EventRow[]) if (b.session_id && !birthByGen.has(b.session_id)) birthByGen.set(b.session_id, b)
  const recoverableByGen = new Map<string, EventRow>()
  for (const r of (recoverables.data ?? []) as EventRow[]) if (r.session_id && !recoverableByGen.has(r.session_id)) recoverableByGen.set(r.session_id, r)
  const planByGen = new Map<string, EventRow>()
  for (const p of (plans.data ?? []) as EventRow[]) if (p.session_id && !planByGen.has(p.session_id)) planByGen.set(p.session_id, p)
  const dispatchByGen = new Map<string, EventRow>()
  for (const d of (dispatches.data ?? []) as EventRow[]) {
    const g = typeof d.metadata?.generation_id === 'string' ? (d.metadata.generation_id as string) : null
    if (g && !dispatchByGen.has(g)) dispatchByGen.set(g, d) // mais recente primeiro (retry ganha)
  }
  const scoreByGen = new Map<string, EventRow>()
  for (const s of (scores.data ?? []) as EventRow[]) {
    if (!s.session_id) continue
    const prev = scoreByGen.get(s.session_id)
    if (!prev || prev.created_at < s.created_at) scoreByGen.set(s.session_id, s)
  }
  // Último 👍/👎 por vídeo; o comentário (evento posterior) cola no veredito.
  const feedbackByVideo = new Map<string, { verdict: FilmFeedbackVerdict; comment: string | null; at: string }>()
  const askedByVideo = new Map<string, string>()
  for (const f of (feedbacks.data ?? []) as EventRow[]) {
    if (!f.session_id) continue
    if (f.metadata?.asked === true) { askedByVideo.set(f.session_id, f.created_at); continue }
    const v = f.metadata?.verdict
    const prev = feedbackByVideo.get(f.session_id)
    if (v === 'up' || v === 'down') feedbackByVideo.set(f.session_id, { verdict: v, comment: prev?.comment ?? null, at: f.created_at })
    else if (typeof f.metadata?.comment === 'string' && prev) prev.comment = (f.metadata.comment as string).slice(0, 600)
  }

  const rows: FastCoherenceRow[] = []
  for (const v of videos) {
    const email = emailOf.get(v.user_id) ?? null
    if (email && excluded.has(email.toLowerCase())) continue
    const engine = v.quality_mode ?? 'unknown'
    const claim = v.render_id ? claimByRender.get(v.render_id) : undefined
    const gen = typeof claim?.metadata?.generation_id === 'string' ? (claim.metadata.generation_id as string) : null
    const plan = gen ? planByGen.get(gen) : undefined
    const birthResponse = gen ? (birthByGen.get(gen)?.metadata?.response as Record<string, unknown> | undefined) : undefined
    const recoverablePayload = gen ? (recoverableByGen.get(gen)?.metadata?.payload as Record<string, unknown> | undefined) : undefined
    const narrationCandidates: Array<[FastCoherenceRow['narration_source'], unknown]> = [
      ['compose_claim', claim?.metadata?.narration],
      ['birth_claim', birthResponse?.voiceover_script],
      ['recoverable', recoverablePayload?.voiceover_script],
      ['scene_plan', Array.isArray(plan?.metadata?.scenes) ? (plan!.metadata!.scenes as Array<{ voiceover?: unknown }>).map((s) => (typeof s?.voiceover === 'string' ? s.voiceover : '')).filter(Boolean).join(' ') : ''],
    ]
    const narrationHit = narrationCandidates.find(([, t]) => typeof t === 'string' && t.trim().length > 0)
    const narration = narrationHit ? String(narrationHit[1]).trim() : null
    const narrationSource: FastCoherenceRow['narration_source'] = narrationHit ? narrationHit[0] : null
    const scenes: FastSceneEvidence[] | null =
      engine === 'fast'
        ? Array.isArray(plan?.metadata?.scenes) ? (plan!.metadata!.scenes as FastSceneEvidence[]) : null
        : evidenceFromDispatch(gen ? dispatchByGen.get(gen)?.metadata : null)
    const scoreEv = gen ? scoreByGen.get(gen) : undefined
    // Só a versão vigente do juiz vale; nota antiga é julgada de novo (custa ~US$ 0,001).
    const coherence = scoreEv?.metadata && typeof scoreEv.metadata.score === 'number' && scoreEv.metadata.version === FAST_COHERENCE_VERSION ? (scoreEv.metadata as unknown as FastCoherenceResult) : null
    // O texto mais longo que existir: plano (inteiro, filmes novos) > claim (1.000) > vídeo (500).
    const candidatos = [typeof plan?.metadata?.topic === 'string' ? (plan!.metadata!.topic as string) : '', typeof claim?.metadata?.topic === 'string' ? (claim.metadata.topic as string) : '', typeof birthResponse?.prompt === 'string' ? (birthResponse.prompt as string) : '', typeof recoverablePayload?.topic === 'string' ? (recoverablePayload.topic as string) : '', v.topic ?? '']
    const topic = candidatos.reduce((a, b) => (b.length > a.length ? b : a), '')
    const topicTruncated = !(typeof plan?.metadata?.topic === 'string') && topic.length >= TOPIC_TRUNCATION_HINT
    const sources = histogram(scenes)
    rows.push({
      video_id: v.id,
      created_at: v.created_at,
      user_id: v.user_id,
      email,
      engine,
      topic,
      topic_truncated: topicTruncated,
      narration,
      narration_source: narrationSource,
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
      feedback: feedbackByVideo.get(v.id) ?? null,
      feedback_asked_at: askedByVideo.get(v.id) ?? null,
    })
  }

  // Julga o que ainda não tem nota (mais recentes primeiro), grava, e devolve já com a nota.
  const maxCompute = Math.max(0, Math.min(12, opts.maxCompute ?? 6))
  const pending = rows.filter((r) => !r.coherence && r.generation_id && r.narration && r.topic).slice(0, maxCompute)
  if (pending.length > 0) {
    await Promise.all(
      pending.map(async (r) => {
        const result = await scoreFastCoherence({ prompt: r.topic, narration: r.narration ?? '', scenes: r.scenes, promptMayBeTruncated: r.topic_truncated, engine: r.engine })
        if (!result) return
        r.coherence = result
        r.coherence_at = new Date().toISOString()
        await admin.from('events').insert({
          name: FAST_COHERENCE_EVENT,
          user_id: r.user_id,
          session_id: r.generation_id,
          path: '/admin/coerencia',
          metadata: { ...result, engine: r.engine, video_id: r.video_id, render_id: r.render_id, generation_id: r.generation_id, topic: r.topic.slice(0, 120), topic_truncated: r.topic_truncated, narration_source: r.narration_source },
        })
      }),
    )
  }
  return rows
}
