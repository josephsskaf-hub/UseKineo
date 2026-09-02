import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'
import { CINEMATIC_CLAIM_EVENT, CINEMATIC_CLAIM_PATH } from '@/lib/cinematic/claim'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-RESUME-RENDER-2026-08-04 — READ-ONLY probe: "what is the truth about
// this user's latest render right now?"
//
// WHY: closing the tab during a render used to strand the user. The client's
// resume path depends on a localStorage snapshot; when that snapshot is gone
// (cleared storage, another browser/device) or the restore gate wedges on a
// flaky auth round-trip, /generate showed only the blind red banner "Still
// checking for an in-progress render" — no progress, no link, no exit. Real
// incident (04/08 ~04:54Z): the render had already COMPLETED in `videos`
// while the founder stared at that banner.
//
// This route reads the SAME durable server-side sources the compose lock
// already uses — nothing new is written anywhere:
//   • `events` rows with name=compose_submission_claim (the distributed
//     submission mutex written by /api/compose before any provider POST;
//     metadata carries status pending|done, render_id, quality, duration)
//   • `videos` rows keyed by render_id (written by /api/compose/status on the
//     first successful poll — i.e. "this render is done and persisted")
//
// Decision, scoped to the authenticated user and a 15-minute window:
//   claim without a videos row, newer than any completed video → 'rendering'
//   completed videos row                                       → 'completed'
//   neither                                                    → 'none'
//
// A claim whose render actually FAILED at the provider also reports
// 'rendering' here (we deliberately do NOT poll Creatomate from this probe —
// read-only, zero provider traffic); the client's "Check progress" resumes
// the normal /api/compose/status poll, which surfaces the honest failure.
//
// Auth: session cookie (same as compose/status). Service role only for the
// reads, always filtered to user.id. Degrades to state:'none' on any lookup
// fault so the page never gets a NEW dead end from its dead-end fix.
//
// KINEO-CREDIT-INTEGRITY-2026-08-05 — CINEMATIC RENDERS WERE INVISIBLE HERE.
// A cinematic generation is DEBITED and submitted to fal by
// /api/generate-video-cinematic, and only reaches /api/compose (and therefore
// only writes a compose_submission_claim) AFTER every clip finishes. Between
// those two moments — the `fal_polling` stage, the longest and most expensive
// part of the job — this probe returned state:'none'. Incident 05/08 03:08Z /
// 03:17Z: two paid cinematic renders (110 credits) sat in fal_polling with no
// compose claim and no `videos` row, so the pill said nothing and the user had
// no evidence the render ever existed.
// We now also read the signed cinematic birth claim (name=
// cinematic_submission_claim, status=settled = provider submitted AND debited).
// It carries no Creatomate render id, so it is reported with render_id:null and
// resumable:false — the client must NOT offer "Check progress" for it (there is
// nothing to poll on /api/compose/status yet), only show that it is alive.
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

const ACTIVE_WINDOW_MS = 15 * 60 * 1000

// KINEO-SPRINT-V1V4-2026-08-31 (#3) — escolhe o tema que vai virar o episodio
// 2. Le so o que ja estava no banco; nao inventa titulo nem chama modelo.
function seriesSeedFrom(title: unknown, topic: unknown): string | null {
  const clean = (value: unknown): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  const fromTitle = clean(title)
  if (fromTitle) return fromTitle.slice(0, 180)
  const rawTopic = typeof topic === 'string' ? topic : ''
  if (rawTopic.includes('\n')) return null
  const fromTopic = clean(rawTopic)
  if (!fromTopic || fromTopic.length > 180) return null
  return fromTopic
}

export async function GET() {
  try {
    const supabase = createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.warn('[compose/active] service-role env missing — probe degraded')
      return NextResponse.json({ state: 'none', degraded: true })
    }
    const admin = createAdminClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()

    const [claimsResult, videoResult, cinematicResult] = await Promise.all([
      admin
        .from('events')
        .select('id, metadata, session_id, created_at')
        .eq('user_id', user.id)
        .eq('name', COMPOSE_CLAIM_EVENT)
        .eq('path', COMPOSE_CLAIM_PATH)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),
      admin
        .from('videos')
        .select('id, video_url, thumbnail_url, title, topic, render_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // The cinematic birth claim: written (and debited) before the fal
      // submission, settled once the provider accepted the clips. This is the
      // ONLY server-side evidence a cinematic render exists during fal_polling.
      admin
        .from('events')
        .select('id, metadata, session_id, created_at')
        .eq('user_id', user.id)
        .eq('name', CINEMATIC_CLAIM_EVENT)
        .eq('path', CINEMATIC_CLAIM_PATH)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (claimsResult.error) {
      console.warn('[compose/active] claim lookup failed:', claimsResult.error.message)
      return NextResponse.json({ state: 'none', degraded: true })
    }
    const claims = Array.isArray(claimsResult.data) ? claimsResult.data : []

    // ═══════════════════════════════════════════════════════════════════════
    // KINEO-RENDER-MORTO-2026-09-01 — a sonda parou de mentir sobre render morto.
    // O cabecalho deste arquivo ja avisava (04/08) que uma claim cujo render
    // FALHOU tambem reporta 'rendering' aqui, confiando que o poll de
    // /api/compose/status contaria a verdade depois. So que os erros que mais
    // matam cliente novo (analise de topico, guard de narracao) acontecem ANTES
    // de existir render no provedor: nao ha nada para aquele poll descobrir e o
    // spinner gira ate a janela de 15 min expirar. Medido em 7 dias: 3 pessoas
    // clicaram na pilula 6, 4 e 1 vez atras de um video que ja tinha morrido —
    // e as tres tem ZERO videos na vida inteira. A verdade sempre esteve na
    // MESMA tabela, a uma leitura de distancia.
    // ═══════════════════════════════════════════════════════════════════════
    const failureResult = await admin
      .from('events')
      .select('metadata, created_at')
      .eq('user_id', user.id)
      .eq('name', 'generation_stage_error')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
    if (failureResult.error) {
      console.warn('[compose/active] failure lookup failed:', failureResult.error.message)
    }
    // Mesmo formato do recentVideo logo acima — o padrao ja provado neste arquivo.
    const failureRows = failureResult.error ? null : failureResult.data
    const failureRow = Array.isArray(failureRows) && failureRows.length > 0 ? failureRows[0] : null
    const failureAt = failureRow ? Date.parse(String(failureRow.created_at ?? '')) : NaN
    const failureMessage = (() => {
      if (!failureRow || !failureRow.metadata || typeof failureRow.metadata !== 'object') return ''
      const meta = failureRow.metadata as Record<string, unknown>
      const text = typeof meta.error === 'string' ? meta.error.trim() : ''
      return text && text.length <= 400 ? text : ''
    })()
    // So e morte se o erro veio DEPOIS do nascimento daquela claim. Quem falhou
    // na tentativa 1 e recomecou continua vendo 'rendering' na tentativa 2.
    const diedAfter = (claimAtMs: number) =>
      Number.isFinite(failureAt) && Number.isFinite(claimAtMs) && failureAt > claimAtMs
    const deadRenderResponse = (claimAt: unknown) =>
      NextResponse.json({
        state: 'failed',
        render_id: null,
        resumable: false,
        started_at: claimAt ?? null,
        failed_at: failureRow ? failureRow.created_at : null,
        message: failureMessage || 'This render stopped before it finished.',
      })
    const recentVideo = videoResult.error ? null : videoResult.data
    if (videoResult.error) {
      console.warn('[compose/active] recent video lookup failed:', videoResult.error.message)
    }

    // Which of the recent claims already produced a persisted video? A claim
    // with a `videos` row is settled and must never render as "in progress".
    const claimRenderIds = claims
      .map((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? row.metadata as Record<string, unknown>
          : {}
        return typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      })
      .filter((id) => id.length > 0 && id.length <= 160)
    const settledRenderIds = new Set<string>()
    if (claimRenderIds.length > 0) {
      const { data: settledRows, error: settledError } = await admin
        .from('videos')
        .select('render_id')
        .eq('user_id', user.id)
        .in('render_id', claimRenderIds)
      if (settledError) {
        console.warn('[compose/active] settled-claim lookup failed:', settledError.message)
      } else if (Array.isArray(settledRows)) {
        for (const row of settledRows) {
          if (typeof row.render_id === 'string' && row.render_id) settledRenderIds.add(row.render_id)
        }
      }
    }

    const activeClaim = claims.find((row) => {
      const metadata = row.metadata && typeof row.metadata === 'object'
        ? row.metadata as Record<string, unknown>
        : {}
      const renderId = typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      return !(renderId && settledRenderIds.has(renderId))
    })

    const activeClaimAt = activeClaim ? Date.parse(String(activeClaim.created_at ?? '')) : NaN
    const recentVideoAt = recentVideo ? Date.parse(String(recentVideo.created_at ?? '')) : NaN

    // A live claim that is NEWER than the last completed video wins: the user
    // started another render after that video landed.
    if (activeClaim && Number.isFinite(activeClaimAt) && (!recentVideo || activeClaimAt > recentVideoAt)) {
      if (diedAfter(activeClaimAt)) return deadRenderResponse(activeClaim.created_at)
      const metadata = activeClaim.metadata && typeof activeClaim.metadata === 'object'
        ? activeClaim.metadata as Record<string, unknown>
        : {}
      const renderId = typeof metadata.render_id === 'string' ? metadata.render_id.trim() : ''
      const rawDuration = Number(metadata.duration)
      return NextResponse.json({
        state: 'rendering',
        render_id: renderId && renderId.length <= 160 ? renderId : null,
        resumable: true,
        started_at: activeClaim.created_at,
        elapsed_ms: Math.max(0, Date.now() - activeClaimAt),
        quality: typeof metadata.quality === 'string' && metadata.quality ? metadata.quality : 'fast',
        duration: rawDuration === 60 || rawDuration === 90 ? rawDuration : 45,
      })
    }

    // No compose claim in flight — but a cinematic job may still be generating
    // its clips at fal (the stage that has already been PAID for). Report it so
    // the render is never invisible; it carries no render id, so the client
    // shows presence only and must not attempt a compose/status poll.
    if (!cinematicResult.error && Array.isArray(cinematicResult.data)) {
      const composeSessions = new Set(
        claims
          .map((row) => (typeof row.session_id === 'string' ? row.session_id : ''))
          .filter(Boolean),
      )
      const activeCinematic = cinematicResult.data.find((row) => {
        const metadata = row.metadata && typeof row.metadata === 'object'
          ? row.metadata as Record<string, unknown>
          : {}
        // `settled` = provider accepted the submission AND the credits were
        // debited. `released` was refunded/closed; `pending`/`done` are still
        // inside the birth request and resolve within seconds.
        if (metadata.status !== 'settled') return false
        const sessionId = typeof row.session_id === 'string' ? row.session_id : ''
        return !(sessionId && composeSessions.has(sessionId))
      })
      const cinematicAt = activeCinematic ? Date.parse(String(activeCinematic.created_at ?? '')) : NaN
      if (activeCinematic && Number.isFinite(cinematicAt) && (!recentVideo || cinematicAt > recentVideoAt)) {
        if (diedAfter(cinematicAt)) return deadRenderResponse(activeCinematic.created_at)
        const metadata = activeCinematic.metadata && typeof activeCinematic.metadata === 'object'
          ? activeCinematic.metadata as Record<string, unknown>
          : {}
        return NextResponse.json({
          state: 'rendering',
          render_id: null,
          resumable: false,
          stage: 'ai_scenes',
          started_at: activeCinematic.created_at,
          elapsed_ms: Math.max(0, Date.now() - cinematicAt),
          quality: typeof metadata.quality === 'string' && metadata.quality ? metadata.quality : 'cinematic_ai',
          duration: 45,
        })
      }
    } else if (cinematicResult.error) {
      console.warn('[compose/active] cinematic claim lookup failed:', cinematicResult.error.message)
    }

    if (recentVideo && typeof recentVideo.video_url === 'string' && recentVideo.video_url) {
      return NextResponse.json({
        state: 'completed',
        video_id: recentVideo.id != null ? String(recentVideo.id) : null,
        video_url: recentVideo.video_url,
        thumbnail_url: typeof recentVideo.thumbnail_url === 'string' ? recentVideo.thumbnail_url : null,
        title: typeof recentVideo.title === 'string' ? recentVideo.title : null,
        // KINEO-SPRINT-V1V4-2026-08-31 (#3) — semente do proximo episodio.
        // `title` cobre 93% dos videos (294 de 317 em 14d); o resto cai no
        // `topic`, e SO quando o topic e curto e de uma linha: um topic longo
        // e o roteiro inteiro com marcadores HOOK/PAYOFF, que viraria uma
        // semente ilegivel. Sem semente, a pilula segue exatamente como era.
        series_seed: seriesSeedFrom(recentVideo.title, recentVideo.topic),
        completed_at: recentVideo.created_at,
        render_id: typeof recentVideo.render_id === 'string' ? recentVideo.render_id : null,
      })
    }

    return NextResponse.json({ state: 'none' })
  } catch (error: unknown) {
    console.error('[compose/active] unexpected error:', error instanceof Error ? error.message : String(error))
    // Degrade to 'none' — this probe must never create a new dead end.
    return NextResponse.json({ state: 'none', degraded: true })
  }
}
