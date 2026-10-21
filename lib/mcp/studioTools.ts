// ═══ KINEO-MCP-STUDIO-2010 — as dependências REAIS das tools do conector "Kineo Studio" ═══════════════════════
//
// Tudo escopado pelo user_id que o token OAuth identificou (app/api/mcp/studio/route.ts). Leituras pela chave de
// serviço SEMPRE com .eq('user_id', …); a escrita que custa dinheiro (kineo_create_video) NÃO é feita aqui — este
// arquivo cunha a sessão da pessoa (lib/mcp/studioSession.ts) e chama o MESMO /api/generate-video-cinematic que o
// botão Generate chama, com o MESMO corpo que app/(dashboard)/generate/GenerateClient.tsx manda. Quem valida, modera,
// mede a régua, assina o claim e debita é a rota de sempre; aqui só se traduz a resposta dela para o Claude.
//
// O filme termina SEM navegador: o cron finish-stranded-renders (a cada minuto) monta o que a fal entregou quando
// não há aba viva (lib/strandedRescue.ts) — exatamente o caso do Claude. kineo_video_status lê o desfecho onde o site
// lê: claim cinematic (events) → claim do compose (events) → linha em `videos` pelo render_id.
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CINEMATIC_CLAIM_EVENT, cinematicClaimId } from '@/lib/cinematic/claim'
import { COMPOSE_CLAIM_EVENT } from '@/lib/composeClaim'
import { fetchUserPlan } from '@/lib/plan'
import { isTrialActive } from '@/lib/reverseTrial'
import { writeServerEvent } from '@/lib/serverEvents'
import { mintUserSession } from '@/lib/mcp/studioSession'
import {
  ACTIVE_JOB_WINDOW_MS,
  TOOL_CREATE,
  engineCatalog,
  estimatedMinutes,
  studioEngineLabel,
  type CreateVideoInput,
  type StudioBalance,
  type StudioCounts,
  type StudioToolResult,
} from '@/lib/mcp/studioMcp'

export const STUDIO_TOOL_EVENT = 'mcp_studio_tool_called'
export const STUDIO_INIT_EVENT = 'mcp_studio_initialized'
export const STUDIO_AUTH_EVENT = 'mcp_studio_authorized'
export const STUDIO_TOKEN_EVENT = 'mcp_studio_token_issued'
export const STUDIO_REFUSED_EVENT = 'mcp_studio_refused'
export const STUDIO_EVENT_PATH = '/api/mcp/studio'
/** A rota do site que o conector chama — a mesma do botão Generate. */
export const STUDIO_GENERATE_PATH = '/api/generate-video-cinematic'
export const STUDIO_USER_AGENT = 'kineo-mcp-studio/1.0'
/** O despacho do site responde em < 90 s na aba; aqui há folga para a fila da fal. */
export const STUDIO_DISPATCH_TIMEOUT_MS = 170_000
/** Depois disto sem desfecho, o sweep do servidor já estornou (CINEMATIC_ABANDON_CUTOFF_MS = 45 min). */
export const STUDIO_JOB_GIVE_UP_MS = 50 * 60 * 1000

export type StudioCtx = { db: SupabaseClient; userId: string; email: string | null; origin: string; publicOrigin: string }

// ═══ KINEO-MCP-STUDIO-AJUSTE-2010 — o que mudou depois do 1º filme real (Claude fa216362, ChatGPT 6ce0763f) ═══════
// (1) O TÍTULO que a pessoa dá em kineo_create_video chega à biblioteca: o /api/compose/status deriva videos.title da
//     1ª linha do tema, e o caminho "Let AI structure" começa por "[Idea: …]" — a linha inteira é colchete, sai vazia e o
//     título nasce NULL. Em vez de mexer no pipeline compartilhado, o conector preenche videos.title (SÓ quando NULL, SÓ
//     no vídeo DESTA conta) com dispatch.title quando kineo_video_status / kineo_list_videos veem o filme pronto.
// (2) RECONEXÃO = o que a aba do site faz: quando o /api/generate-video-cinematic responde `pending` (409/503) ou cai
//     (sem resposta / 5xx), o débito pode já ter acontecido e o claim fica em 'pending'/'done' — e QUEM resolve esse claim
//     é o PRÓPRIO cliente reenviando a MESMA geração (o refund-sweep só olha claim 'settled'; 'pending'/'done' "are
//     handled by the birth route"). O botão Generate reenvia; o conector não reenviava e não gravava job: o crédito
//     ficava preso e a mesma idempotency_key cobrava de novo. Agora o create reenvia a mesma geração enquanto houver
//     prazo, e se ainda assim não fechar grava o job com o corpo para o kineo_video_status reenviar depois — o claim
//     liquida (o filme segue) ou a rota estorna e libera (status 'refunded').
// I/O injetável para o guardião (scripts/test-mcp-studio-ajuste-2010.mjs) rodar create/status com dublês, sem rede.
export type StudioMinted = Awaited<ReturnType<typeof mintUserSession>>
export type StudioIo = {
  mint: (userId: string, email: string) => Promise<StudioMinted>
  fetch: (url: string, init: RequestInit) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  now: () => number
}
export const STUDIO_REAL_IO: StudioIo = {
  mint: (userId, email) => mintUserSession(userId, email),
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
}
/** Prazo total do create (a rota do MCP tem maxDuration 300 s): reenvios de `pending` só enquanto couberem. */
export const STUDIO_CREATE_BUDGET_MS = 200_000
/** Quantas vezes o create reenvia a MESMA geração quando a rota responde `pending` (o GenerateClient faz o mesmo). */
export const STUDIO_PENDING_REPLAYS = 6
/** O status só reenvia a geração presa depois disto (dá tempo ao despacho original de terminar sozinho). */
export const STUDIO_STATUS_REPLAY_AFTER_MS = 2 * 60 * 1000
export const STUDIO_STATUS_REPLAY_TIMEOUT_MS = 60_000

type ProfileRow = { video_credits?: number | null; plan?: string | null; has_paid?: boolean | null; trial_status?: unknown; trial_ends_at?: unknown; trial_credits_used?: unknown; email?: string | null }

async function readProfile(ctx: StudioCtx): Promise<ProfileRow | null> {
  const { data, error } = await ctx.db
    .from('profiles')
    .select('video_credits, plan, has_paid, trial_status, trial_ends_at, trial_credits_used, email')
    .eq('id', ctx.userId)
    .maybeSingle()
  return error ? null : ((data as ProfileRow | null) ?? {})
}

export async function studioBalance(ctx: StudioCtx): Promise<StudioBalance | null> {
  const p = await readProfile(ctx)
  if (!p) return null
  const credits = typeof p.video_credits === 'number' && Number.isFinite(p.video_credits) ? p.video_credits : 0
  const plan = typeof p.plan === 'string' && p.plan ? p.plan.toLowerCase() : 'free'
  if (credits <= 0) return { credits, plan, canRender: false, reason: 'This Kineo account has no credits right now.' }
  return { credits, plan, canRender: true }
}

export async function studioAccount(ctx: StudioCtx, pausedEngines: readonly string[]): Promise<StudioToolResult> {
  const p = await readProfile(ctx)
  if (!p) return { ok: false, error: 'Kineo could not read this account right now. Try again in a minute.' }
  const info = await fetchUserPlan(ctx.db, ctx.userId)
  const credits = typeof p.video_credits === 'number' && Number.isFinite(p.video_credits) ? p.video_credits : 0
  const engines = engineCatalog(pausedEngines)
  const cheapest = engines.flatMap((e) => e.durations.map((d) => d.credits)).reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY)
  const data = {
    email: ctx.email,
    plan: typeof p.plan === 'string' && p.plan ? p.plan.toLowerCase() : 'free',
    plan_tier: info.tier,
    has_paid: p.has_paid === true,
    trial_active: isTrialActive(p),
    credits,
    can_render_now: credits > 0 && credits >= cheapest,
    engines,
    plans_url: `${ctx.publicOrigin}/pricing?utm_source=claude_studio_connector`,
    library_url: `${ctx.publicOrigin}/library`,
    note: 'Credits are per film: the engine and the length decide the price. A 15-second Seedance 1.5 film is the cheapest way to try.',
  }
  return { ok: true, data, summary: `Plan ${data.plan} · ${credits} credits` }
}

export async function studioCounts(ctx: StudioCtx): Promise<StudioCounts | null> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const activeSince = new Date(Date.now() - ACTIVE_JOB_WINDOW_MS).toISOString()
  const [calls, creates, jobs] = await Promise.all([
    ctx.db.from('events').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('name', STUDIO_TOOL_EVENT).gte('created_at', hourAgo),
    ctx.db.from('events').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('name', STUDIO_TOOL_EVENT).eq('metadata->>tool', TOOL_CREATE).eq('metadata->>charged', 'true').gte('created_at', hourAgo),
    ctx.db.from('mcp_studio_jobs').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('status', 'processing').gte('created_at', activeSince),
  ])
  if (calls.error || creates.error || jobs.error) return null
  return { toolCallsLastHour: calls.count ?? 0, createsLastHour: creates.count ?? 0, activeJobs: jobs.count ?? 0 }
}

// ─── kineo_create_video ──────────────────────────────────────────────────────
type JobRow = { id: string; generation_id: string; engine: string; duration: number; credits: number | null; status: string; created_at: string; format: string; dispatch?: unknown } // KINEO-MCP-STUDIO-AJUSTE-2010: + dispatch (título pedido e corpo para reenvio)

async function findJobByKey(ctx: StudioCtx, key: string): Promise<JobRow | null> {
  const { data, error } = await ctx.db.from('mcp_studio_jobs').select('id, generation_id, engine, duration, credits, status, created_at, format').eq('user_id', ctx.userId).eq('idempotency_key', key).maybeSingle()
  return error || !data ? null : (data as JobRow)
}

function readNumber(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

export async function studioCreateVideo(ctx: StudioCtx, input: CreateVideoInput, estimate: number, io: StudioIo = STUDIO_REAL_IO): Promise<StudioToolResult> {
  if (input.idempotencyKey) {
    const existing = await findJobByKey(ctx, input.idempotencyKey)
    if (existing) {
      const status = await studioVideoStatus(ctx, existing.generation_id, io)
      return status.ok
        ? { ok: true, data: { ...status.data, reused: true, idempotency_key: input.idempotencyKey }, summary: 'Same request already started — returning the existing job (nothing charged again).' }
        : status
    }
  }
  if (!ctx.email) return { ok: false, error: 'This account has no e-mail on file, so the connector cannot sign in for it. Nothing was charged.', details: { reason: 'no_email' } }

  const startedAt = io.now()
  const minted = await io.mint(ctx.userId, ctx.email) // KINEO-MCP-STUDIO-AJUSTE-2010: mintUserSession(ctx.userId, ctx.email) pelo I/O injetável
  if (!minted.ok) {
    console.error('[mcp-studio] session mint failed:', minted.error)
    return { ok: false, error: 'Kineo could not sign in to this account for the render. Try again in a minute; nothing was charged.', details: { reason: 'session_mint_failed' } }
  }
  const generationId = randomUUID()
  const body: Record<string, unknown> = {
    generationId,
    prompt: input.prompt,
    duration: input.duration,
    language: input.language,
    ...(input.aspect !== '9:16' ? { aspect: input.aspect } : {}),
    script_mode: input.scriptMode,
    engine: input.engine,
  }
  let res: Response | null = null
  let data: Record<string, unknown> = {}
  try {
    // KINEO-MCP-STUDIO-AJUSTE-2010 — `pending` = a MESMA geração ainda fechando: reenvia o MESMO corpo (o claim casa pela
    // impressão digital) enquanto houver prazo, como a aba do site faz. Nada novo é cobrado: a chave do débito é a geração.
    for (let attempt = 0; attempt <= STUDIO_PENDING_REPLAYS; attempt++) {
      const left = STUDIO_CREATE_BUDGET_MS - (io.now() - startedAt)
      if (attempt > 0 && left < 15_000) break
      res = null
      data = {}
      try {
        res = await io.fetch(`${ctx.origin}${STUDIO_GENERATE_PATH}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: minted.session.cookie, 'user-agent': STUDIO_USER_AGENT, 'x-kineo-mcp-studio': '1' },
          body: JSON.stringify(body),
          cache: 'no-store',
          signal: AbortSignal.timeout(Math.max(10_000, Math.min(STUDIO_DISPATCH_TIMEOUT_MS, left))),
        })
        data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      } catch (e) {
        console.error('[mcp-studio] dispatch failed:', e instanceof Error ? e.message : String(e))
        res = null
        break
      }
      if (!isPendingAnswer(res.status, data)) break
      const wait = typeof data.retry_after_ms === 'number' && Number.isFinite(data.retry_after_ms) ? data.retry_after_ms : 2500
      await io.sleep(Math.min(Math.max(wait, 1000), 5000))
    }
  } finally {
    await minted.session.dispose()
  }
  const plans = `${ctx.publicOrigin}/pricing?utm_source=claude_studio_connector`
  // Sem resposta, `pending` até o fim do prazo, ou 5xx: o débito PODE ter acontecido. Grava o job (com o corpo, para o
  // kineo_video_status reenviar a mesma geração) — a mesma idempotency_key passa a devolver ESTE job, nunca cobra de novo.
  if (!res || isPendingAnswer(res.status, data) || res.status >= 500) {
    const reason = !res ? 'dispatch_timeout' : isPendingAnswer(res.status, data) ? 'pending' : `http_${res.status}`
    const tracked = await recordStudioJob(ctx, input, generationId, estimate, { http_status: res?.status ?? null, outcome: reason, replay: body })
    const where = tracked ? `Call kineo_video_status with job_id ${generationId} in a minute` : 'Call kineo_list_videos in a minute'
    const msg = !res
      ? `Kineo did not answer the render request in time. ${where}: it shows whether the film started; if it did not, nothing stays charged — any credits taken for this attempt are returned automatically.`
      : isPendingAnswer(res.status, data)
        ? `Kineo is still confirming this render. ${where}: it finishes the confirmation; if the render cannot start, the credits are returned automatically.`
        : `${typeof data.error === 'string' && data.error ? data.error : 'Kineo could not start this render.'} ${where}: if any credits were taken for this attempt, they are returned automatically.`
    return { ok: false, error: msg, details: { reason, job_id: tracked ? generationId : null, http_status: res?.status ?? null, charged: data.charged === true, poll_after_seconds: 60 } }
  }
  const message = typeof data.error === 'string' && data.error ? data.error : null
  if (res.status === 402) {
    return { ok: false, error: `${message ?? 'This engine or length needs a plan the account does not have.'} Nothing was charged. Plans: ${plans}`, details: { reason: typeof data.reason === 'string' ? data.reason : 'plan_required', plans_url: plans, balance: readNumber(data, ['balance']) } }
  }
  if (!res.ok) {
    return { ok: false, error: `${message ?? 'Kineo refused this request.'} Nothing was charged.`, details: { reason: typeof data.reason === 'string' ? data.reason : `http_${res.status}`, http_status: res.status, charged: data.charged === true } }
  }
  const charged = readNumber(data, ['cost', 'creditCost', 'credits_charged', 'credits']) ?? estimate
  await recordStudioJob(ctx, input, generationId, charged, { http_status: res.status, scenes: Array.isArray(data.falRequestIds) ? data.falRequestIds.length : null, quality: typeof data.quality === 'string' ? data.quality : null })
  const minutes = estimatedMinutes(input.engine, input.duration)
  return {
    ok: true,
    data: {
      job_id: generationId,
      status: 'processing',
      engine: input.engine,
      engine_label: studioEngineLabel(input.engine),
      duration_seconds: input.duration,
      language: input.language,
      aspect: input.aspect,
      credits_charged: charged,
      estimated_minutes: minutes,
      poll_after_seconds: 60,
      library_url: `${ctx.publicOrigin}/library`,
      next_step: `The film is rendering. Call ${'kineo_video_status'} with this job_id about once a minute; it usually completes in ~${minutes} minutes.`,
    },
    summary: `Render started (${studioEngineLabel(input.engine)}, ${input.duration}s, ${charged} credits). Check kineo_video_status with job_id ${generationId} in about a minute.`,
  }
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — a rota respondeu "a mesma geração ainda está fechando; reenvie". */
export function isPendingAnswer(status: number, data: Record<string, unknown>): boolean {
  return (status === 409 || status === 503) && data.pending === true
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — a linha do job (com o user_id do token). Devolve se gravou. */
async function recordStudioJob(ctx: StudioCtx, input: CreateVideoInput, generationId: string, credits: number, dispatch: Record<string, unknown>): Promise<boolean> {
  const { error: jobErr } = await ctx.db.from('mcp_studio_jobs').insert({
    user_id: ctx.userId,
    idempotency_key: input.idempotencyKey,
    generation_id: generationId,
    format: input.format,
    engine: input.engine,
    duration: input.duration,
    credits,
    status: 'processing',
    dispatch: { ...dispatch, title: input.title },
  })
  if (jobErr) console.error('[mcp-studio] job row insert failed:', jobErr.message)
  return !jobErr
}

// ─── kineo_video_status ──────────────────────────────────────────────────────
type VideoRow = { id: string; title: string | null; status: string | null; video_url: string | null; final_video_url: string | null; duration: number | null; quality_mode: string | null; created_at: string; published_at: string | null; render_id?: string | null }
const VIDEO_COLUMNS = 'id, title, status, video_url, final_video_url, duration, quality_mode, created_at, published_at, render_id'

function videoLinks(ctx: StudioCtx, v: VideoRow): { video_url: string | null; watch_url: string | null } {
  const url = v.final_video_url || v.video_url || null
  return { video_url: url, watch_url: v.published_at ? `${ctx.publicOrigin}/v/${v.id}` : null }
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — o título pedido em kineo_create_video (dispatch.title), saneado. */
export function studioJobTitle(dispatch: unknown): string | null {
  const t = dispatch && typeof dispatch === 'object' ? (dispatch as Record<string, unknown>).title : null
  return typeof t === 'string' && t.trim() ? t.trim().slice(0, 120) : null
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — grava o título na biblioteca: SÓ se videos.title for NULL e SÓ no vídeo desta conta. */
export async function fillStudioVideoTitle(ctx: StudioCtx, videoId: string, title: string | null): Promise<boolean> {
  if (!title) return false
  const { error } = await ctx.db.from('videos').update({ title }).eq('id', videoId).eq('user_id', ctx.userId).is('title', null)
  if (error) console.error('[mcp-studio] title fill failed:', error.message)
  return !error
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — reenvia a MESMA geração presa (claim 'pending'/'done'), como a aba do site faz. */
async function replayStuckGeneration(ctx: StudioCtx, replay: Record<string, unknown>, io: StudioIo): Promise<number | null> {
  if (!ctx.email || replay.generationId === undefined) return null
  const minted = await io.mint(ctx.userId, ctx.email)
  if (!minted.ok) return null
  try {
    const res = await io.fetch(`${ctx.origin}${STUDIO_GENERATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: minted.session.cookie, 'user-agent': STUDIO_USER_AGENT, 'x-kineo-mcp-studio': '1' },
      body: JSON.stringify(replay),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDIO_STATUS_REPLAY_TIMEOUT_MS),
    })
    return res.status
  } catch (e) {
    console.error('[mcp-studio] replay failed:', e instanceof Error ? e.message : String(e))
    return null
  } finally {
    await minted.session.dispose()
  }
}

export async function studioVideoStatus(ctx: StudioCtx, jobId: string, io: StudioIo = STUDIO_REAL_IO): Promise<StudioToolResult> {
  const { data: jobData, error: jobErr } = await ctx.db.from('mcp_studio_jobs').select('id, generation_id, engine, duration, credits, status, created_at, format, dispatch').eq('user_id', ctx.userId).eq('generation_id', jobId).maybeSingle()
  if (jobErr) return { ok: false, error: 'Kineo could not read this job right now. Try again in a minute.' }
  const job = jobData as JobRow | null
  if (!job) return { ok: false, error: 'No video job with this job_id in this Kineo account.', details: { job_id: jobId } }
  const startedMs = Date.parse(job.created_at)
  const elapsedMs = Number.isFinite(startedMs) ? Math.max(0, io.now() - startedMs) : null
  const elapsedMin = elapsedMs === null ? null : Math.round(elapsedMs / 60000)
  const jobTitle = studioJobTitle(job.dispatch)
  const base = { job_id: job.generation_id, engine: job.engine, engine_label: studioEngineLabel(job.engine as never), duration_seconds: job.duration, credits_charged: job.credits, started_at: job.created_at, elapsed_minutes: elapsedMin, library_url: `${ctx.publicOrigin}/library` }

  const [claim, compose] = await Promise.all([
    ctx.db.from('events').select('metadata').eq('id', cinematicClaimId(ctx.userId, job.generation_id)).eq('user_id', ctx.userId).eq('name', CINEMATIC_CLAIM_EVENT).maybeSingle(),
    ctx.db.from('events').select('metadata').eq('user_id', ctx.userId).eq('name', COMPOSE_CLAIM_EVENT).eq('session_id', job.generation_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const claimMeta = (claim.data?.metadata && typeof claim.data.metadata === 'object' ? claim.data.metadata : {}) as Record<string, unknown>
  const composeMeta = (compose.data?.metadata && typeof compose.data.metadata === 'object' ? compose.data.metadata : {}) as Record<string, unknown>
  const renderId = typeof composeMeta.render_id === 'string' ? composeMeta.render_id : null

  let video: VideoRow | null = null
  if (renderId) {
    const { data } = await ctx.db.from('videos').select(VIDEO_COLUMNS).eq('user_id', ctx.userId).eq('render_id', renderId).maybeSingle()
    video = (data as VideoRow | null) ?? null
  }
  const finish = async (status: string) => {
    if (job.status !== status) await ctx.db.from('mcp_studio_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', job.id).eq('user_id', ctx.userId)
  }

  if (video && (video.status ?? '') === 'completed' && (video.final_video_url || video.video_url)) {
    await finish('completed')
    const links = videoLinks(ctx, video)
    const title = video.title || ((await fillStudioVideoTitle(ctx, video.id, jobTitle)) ? jobTitle : null)
    return {
      ok: true,
      data: { ...base, status: 'completed', video_id: video.id, title, ...links, download_hint: 'The video_url is the MP4; the library_url shows it in the person\'s Kineo library (download, share and publish live there).' },
      summary: `Completed: ${links.video_url}`,
    }
  }
  if (video && (video.status ?? '') === 'failed') {
    await finish('failed')
    return { ok: true, data: { ...base, status: 'failed', message: 'The render failed; Kineo returns the credits automatically.' }, summary: 'Failed (credits returned).' }
  }
  const claimStatus = typeof claimMeta.status === 'string' ? claimMeta.status : null
  if (claimStatus === 'released') {
    await finish('refunded')
    return { ok: true, data: { ...base, status: 'refunded', message: 'This render did not complete and the credits were returned to the account.' }, summary: 'Refunded.' }
  }
  if (!claim.error && !claimStatus && elapsedMin !== null && elapsedMin >= 5) {
    await finish('failed')
    return { ok: true, data: { ...base, status: 'failed', message: 'The submission did not settle on the server; nothing is being rendered and nothing stays charged.' }, summary: 'Failed before rendering.' }
  }
  // KINEO-MCP-STUDIO-AJUSTE-2010 — claim preso em 'pending'/'done' (o despacho caiu ou respondeu `pending`): reenvia a
  // MESMA geração. A rota liquida (o filme segue) ou, vencido o prazo, estorna e libera — a próxima consulta vê 'released'.
  const replay = job.dispatch && typeof job.dispatch === 'object' ? (job.dispatch as Record<string, unknown>).replay : null
  let replayed: number | null = null
  if ((claimStatus === 'pending' || claimStatus === 'done') && replay && typeof replay === 'object' && elapsedMs !== null && elapsedMs >= STUDIO_STATUS_REPLAY_AFTER_MS) {
    replayed = await replayStuckGeneration(ctx, replay as Record<string, unknown>, io)
  }
  if (elapsedMs !== null && elapsedMs > STUDIO_JOB_GIVE_UP_MS) {
    await finish('stalled')
    return { ok: true, data: { ...base, status: 'stalled', message: 'This render is taking far longer than normal. Kineo\'s recovery returns the credits if it cannot finish; check the library later.' }, summary: 'Stalled.' }
  }
  const stage = renderId ? 'assembling' : claimStatus === 'settled' ? 'generating_scenes' : 'submitting'
  return {
    ok: true,
    data: { ...base, status: 'processing', stage, poll_after_seconds: 60, ...(replayed !== null ? { reconnected: true } : {}), message: `Still rendering (${stage}). Check again in about a minute.` },
    summary: `Processing (${stage}, ${elapsedMin ?? '?'} min elapsed). Check again in a minute.`,
  }
}

// ─── kineo_list_videos ───────────────────────────────────────────────────────
export async function studioListVideos(ctx: StudioCtx, limit: number): Promise<StudioToolResult> {
  const { data, error } = await ctx.db.from('videos').select(VIDEO_COLUMNS).eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(limit)
  if (error) return { ok: false, error: 'Kineo could not list the videos right now. Try again in a minute.' }
  const rows = (data ?? []) as VideoRow[]
  await fillTitlesFromJobs(ctx, rows)
  const videos = rows.map((v) => ({ id: v.id, title: v.title, status: v.status, duration_seconds: v.duration, engine: v.quality_mode, created_at: v.created_at, ...videoLinks(ctx, v) }))
  return { ok: true, data: { count: videos.length, videos, library_url: `${ctx.publicOrigin}/library` }, summary: `${videos.length} video(s).` }
}

/** KINEO-MCP-STUDIO-AJUSTE-2010 — vídeo pronto sem título que veio de um job do conector: ganha o título pedido (só se NULL). */
async function fillTitlesFromJobs(ctx: StudioCtx, rows: VideoRow[]): Promise<void> {
  const untitled = rows.filter((v) => !v.title && typeof v.render_id === 'string' && v.render_id && (v.status ?? '') === 'completed')
  if (!untitled.length) return
  const { data: jobs, error: jobsErr } = await ctx.db.from('mcp_studio_jobs').select('generation_id, dispatch').eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(50)
  if (jobsErr || !jobs?.length) return
  const titleByGen = new Map<string, string>()
  for (const j of jobs as { generation_id: string; dispatch: unknown }[]) {
    const t = studioJobTitle(j.dispatch)
    if (t) titleByGen.set(j.generation_id, t)
  }
  if (!titleByGen.size) return
  const { data: claims, error: claimsErr } = await ctx.db.from('events').select('session_id, metadata').eq('user_id', ctx.userId).eq('name', COMPOSE_CLAIM_EVENT).in('session_id', Array.from(titleByGen.keys())).limit(100)
  if (claimsErr || !claims?.length) return
  const titleByRender = new Map<string, string>()
  for (const c of claims as { session_id: string | null; metadata: unknown }[]) {
    const rid = c.metadata && typeof c.metadata === 'object' ? (c.metadata as Record<string, unknown>).render_id : null
    const t = c.session_id ? titleByGen.get(c.session_id) : undefined
    if (typeof rid === 'string' && rid && t) titleByRender.set(rid, t)
  }
  for (const v of untitled) {
    const t = titleByRender.get(v.render_id as string)
    if (t && (await fillStudioVideoTitle(ctx, v.id, t))) v.title = t
  }
}

/** Medição: um evento por tools/call (tool, desfecho, créditos) e por initialize. */
export async function recordStudioEvent(name: string, userId: string | null, metadata: Record<string, unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      writeServerEvent({ name, userId, path: STUDIO_EVENT_PATH, metadata }),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, 1500) }),
    ])
  } catch {
    /* a medição nunca derruba a resposta */
  } finally {
    if (timer) clearTimeout(timer)
  }
}
