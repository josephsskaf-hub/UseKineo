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
type JobRow = { id: string; generation_id: string; engine: string; duration: number; credits: number | null; status: string; created_at: string; format: string }

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

export async function studioCreateVideo(ctx: StudioCtx, input: CreateVideoInput, estimate: number): Promise<StudioToolResult> {
  if (input.idempotencyKey) {
    const existing = await findJobByKey(ctx, input.idempotencyKey)
    if (existing) {
      const status = await studioVideoStatus(ctx, existing.generation_id)
      return status.ok
        ? { ok: true, data: { ...status.data, reused: true, idempotency_key: input.idempotencyKey }, summary: 'Same request already started — returning the existing job (nothing charged again).' }
        : status
    }
  }
  if (!ctx.email) return { ok: false, error: 'This account has no e-mail on file, so the connector cannot sign in for it. Nothing was charged.', details: { reason: 'no_email' } }

  const minted = await mintUserSession(ctx.userId, ctx.email)
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
    res = await fetch(`${ctx.origin}${STUDIO_GENERATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: minted.session.cookie, 'user-agent': STUDIO_USER_AGENT, 'x-kineo-mcp-studio': '1' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(STUDIO_DISPATCH_TIMEOUT_MS),
    })
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  } catch (e) {
    console.error('[mcp-studio] dispatch failed:', e instanceof Error ? e.message : String(e))
  } finally {
    await minted.session.dispose()
  }
  if (!res) {
    return { ok: false, error: 'Kineo did not answer the render request in time. Call kineo_list_videos in a minute: if nothing new appears, try again with the same idempotency_key.', details: { reason: 'dispatch_timeout' } }
  }
  const message = typeof data.error === 'string' && data.error ? data.error : null
  if (res.status === 402) {
    const plans = `${ctx.publicOrigin}/pricing?utm_source=claude_studio_connector`
    return { ok: false, error: `${message ?? 'This engine or length needs a plan the account does not have.'} Nothing was charged. Plans: ${plans}`, details: { reason: typeof data.reason === 'string' ? data.reason : 'plan_required', plans_url: plans, balance: readNumber(data, ['balance']) } }
  }
  if ((res.status === 409 || res.status === 503) && data.pending === true) {
    return { ok: false, error: 'Kineo is still processing a previous submission for this account. Wait a minute and retry with the same idempotency_key.', details: { reason: 'pending' } }
  }
  if (!res.ok) {
    return { ok: false, error: `${message ?? 'Kineo refused this request.'} Nothing was charged.`, details: { reason: typeof data.reason === 'string' ? data.reason : `http_${res.status}`, http_status: res.status, charged: data.charged === true } }
  }
  const charged = readNumber(data, ['cost', 'creditCost', 'credits_charged', 'credits']) ?? estimate
  const { error: jobErr } = await ctx.db.from('mcp_studio_jobs').insert({
    user_id: ctx.userId,
    idempotency_key: input.idempotencyKey,
    generation_id: generationId,
    format: input.format,
    engine: input.engine,
    duration: input.duration,
    credits: charged,
    status: 'processing',
    dispatch: { http_status: res.status, scenes: Array.isArray(data.falRequestIds) ? data.falRequestIds.length : null, quality: typeof data.quality === 'string' ? data.quality : null, title: input.title },
  })
  if (jobErr) console.error('[mcp-studio] job row insert failed:', jobErr.message)
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

// ─── kineo_video_status ──────────────────────────────────────────────────────
type VideoRow = { id: string; title: string | null; status: string | null; video_url: string | null; final_video_url: string | null; duration: number | null; quality_mode: string | null; created_at: string; published_at: string | null; render_id?: string | null }
const VIDEO_COLUMNS = 'id, title, status, video_url, final_video_url, duration, quality_mode, created_at, published_at, render_id'

function videoLinks(ctx: StudioCtx, v: VideoRow): { video_url: string | null; watch_url: string | null } {
  const url = v.final_video_url || v.video_url || null
  return { video_url: url, watch_url: v.published_at ? `${ctx.publicOrigin}/v/${v.id}` : null }
}

export async function studioVideoStatus(ctx: StudioCtx, jobId: string): Promise<StudioToolResult> {
  const { data: jobData, error: jobErr } = await ctx.db.from('mcp_studio_jobs').select('id, generation_id, engine, duration, credits, status, created_at, format').eq('user_id', ctx.userId).eq('generation_id', jobId).maybeSingle()
  if (jobErr) return { ok: false, error: 'Kineo could not read this job right now. Try again in a minute.' }
  const job = jobData as JobRow | null
  if (!job) return { ok: false, error: 'No video job with this job_id in this Kineo account.', details: { job_id: jobId } }
  const startedMs = Date.parse(job.created_at)
  const elapsedMin = Number.isFinite(startedMs) ? Math.max(0, Math.round((Date.now() - startedMs) / 60000)) : null
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
    if (job.status !== status) await ctx.db.from('mcp_studio_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', job.id)
  }

  if (video && (video.status ?? '') === 'completed' && (video.final_video_url || video.video_url)) {
    await finish('completed')
    const links = videoLinks(ctx, video)
    return {
      ok: true,
      data: { ...base, status: 'completed', video_id: video.id, title: video.title, ...links, download_hint: 'The video_url is the MP4; the library_url shows it in the person\'s Kineo library (download, share and publish live there).' },
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
  if (Number.isFinite(startedMs) && Date.now() - startedMs > STUDIO_JOB_GIVE_UP_MS) {
    await finish('stalled')
    return { ok: true, data: { ...base, status: 'stalled', message: 'This render is taking far longer than normal. Kineo\'s recovery returns the credits if it cannot finish; check the library later.' }, summary: 'Stalled.' }
  }
  const stage = renderId ? 'assembling' : claimStatus === 'settled' ? 'generating_scenes' : 'submitting'
  return {
    ok: true,
    data: { ...base, status: 'processing', stage, poll_after_seconds: 60, message: `Still rendering (${stage}). Check again in about a minute.` },
    summary: `Processing (${stage}, ${elapsedMin ?? '?'} min elapsed). Check again in a minute.`,
  }
}

// ─── kineo_list_videos ───────────────────────────────────────────────────────
export async function studioListVideos(ctx: StudioCtx, limit: number): Promise<StudioToolResult> {
  const { data, error } = await ctx.db.from('videos').select(VIDEO_COLUMNS).eq('user_id', ctx.userId).order('created_at', { ascending: false }).limit(limit)
  if (error) return { ok: false, error: 'Kineo could not list the videos right now. Try again in a minute.' }
  const rows = (data ?? []) as VideoRow[]
  const videos = rows.map((v) => ({ id: v.id, title: v.title, status: v.status, duration_seconds: v.duration, engine: v.quality_mode, created_at: v.created_at, ...videoLinks(ctx, v) }))
  return { ok: true, data: { count: videos.length, videos, library_url: `${ctx.publicOrigin}/library` }, summary: `${videos.length} video(s).` }
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
