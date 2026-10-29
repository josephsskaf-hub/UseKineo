// KINEO-UPSELL-FILME15-2610 — durable, owner-bound intent; no new table or price.
import { createHash, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { isNonPayingAccount } from '@/lib/growth/filmReady60s'
import { FILM_COMPLETE_CAMPAIGN, FILM_COMPLETE_ENGINE, FILM_COMPLETE_INTENT_EVENT, FILM_COMPLETE_TARGET_SECONDS, FILM_COMPLETE_UUID, FILM_COMPLETE_VERSION, filmCompletePaymentMetadata, type FilmCompleteState } from '@/lib/growth/filmComplete'
import { COMPOSE_CLAIM_EVENT } from '@/lib/composeClaim'
import { CINEMATIC_CLAIM_EVENT, cinematicClaimId } from '@/lib/cinematic/claim'
import { mintUserSession } from '@/lib/mcp/studioSession'
import { depoisDaResposta } from '@/lib/posResposta'
import { narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { parseUserScript } from '@/lib/scriptParser'
import { promptComRoteiro } from '@/lib/meta95/ideiaNoEscritor'
import { readKling4PaidAvailability } from '@/lib/kling4PromoServer' // KINEO-VERSAO-COMPLETA-K4-2910
import { kling4PaidFalExtrasMilliUsd } from '@/lib/kling4PaidPricing' // KINEO-VERSAO-COMPLETA-K4-2910
import { filmQualityFromBirth, filmQualityWriterDirection, readFilmQualitySnapshot, type FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance' // KINEO-QUALIDADE-TODOS-MOTORES-2910

type Meta = Record<string, unknown>
export interface FilmCompleteIntent {
  id: string
  userId: string
  sourceVideoId: string
  prompt: string
  script: string
  topic: string
  language: string
  generationId: string
  metadata: Meta
}

export function filmCompleteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }) : null
}

export function filmCompleteId(userId: string, videoId: string): string {
  const hex = createHash('sha256').update(`kineo:film-complete:v1:${userId}:${videoId}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — private, owner-bound birth data is the only source of inherited identity and image URLs.
async function qualityFromStoredBirth(db: SupabaseClient, userId: string, sourceGenerationId: string, response: Meta): Promise<FilmQualitySnapshot> {
  const saved = readFilmQualitySnapshot(response.quality_snapshot)
  if (saved && saved.sourceGenerationId === sourceGenerationId) return saved
  const { data, error } = await db.from('events').select('name, metadata').eq('user_id', userId).eq('session_id', sourceGenerationId)
    .in('name', ['cinematic_character_sheet', 'cinematic_still_critic']).order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('film_complete_source_quality_unavailable')
  const values = (name: string) => (data ?? []).filter(row => row.name === name).map(row => row.metadata && typeof row.metadata === 'object' ? row.metadata as Meta : {})
  return filmQualityFromBirth({ sourceGenerationId, response, sheetEvents: values('cinematic_character_sheet'), criticEvents: values('cinematic_still_critic') })
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — old paid intents are recovered from their original owned film, never from caller-supplied sheets/URLs.
async function sourceQualityForIntent(db: SupabaseClient, intent: FilmCompleteIntent): Promise<FilmQualitySnapshot | null> {
  const saved = readFilmQualitySnapshot(intent.metadata.source_quality)
  if (saved && saved.sourceGenerationId === text(intent.metadata.source_generation_id)) return saved
  const { data: video, error: ve } = await db.from('videos').select('id, user_id, render_id, status').eq('id', intent.sourceVideoId).eq('user_id', intent.userId).maybeSingle()
  if (ve) throw new Error('film_complete_source_quality_unavailable')
  if (!video || video.user_id !== intent.userId || video.status !== 'completed' || !text(video.render_id)) return null
  const { data: compose, error: ce } = await db.from('events').select('session_id, metadata').eq('user_id', intent.userId).eq('name', COMPOSE_CLAIM_EVENT)
    .eq('metadata->>render_id', video.render_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (ce) throw new Error('film_complete_source_quality_unavailable')
  const sourceGenerationId = text(compose?.metadata?.generation_id) || text(compose?.session_id)
  if (!sourceGenerationId) return null
  const { data: birth, error: be } = await db.from('events').select('metadata').eq('user_id', intent.userId).eq('name', CINEMATIC_CLAIM_EVENT)
    .eq('id', cinematicClaimId(intent.userId, sourceGenerationId)).maybeSingle()
  if (be) throw new Error('film_complete_source_quality_unavailable')
  const response = birth?.metadata?.response && typeof birth.metadata.response === 'object' ? birth.metadata.response as Meta : {}
  return qualityFromStoredBirth(db, intent.userId, sourceGenerationId, response)
}

// KINEO-QUALIDADE-TODOS-MOTORES-2910 — renderer resolves the paid intent on the server; identity cannot be injected through the request body.
export async function loadFilmCompleteQuality(db: SupabaseClient, userId: string, id: string, generationId: string): Promise<FilmQualitySnapshot | null> {
  const intent = await loadFilmCompleteIntent(db, userId, id)
  if (!intent || intent.generationId !== generationId || !text(intent.metadata.paid_session_id)) return null
  return sourceQualityForIntent(db, intent)
}

export async function loadFilmCompleteIntent(db: SupabaseClient, userId: string, id: string): Promise<FilmCompleteIntent | null> {
  if (!FILM_COMPLETE_UUID.test(id)) return null
  const { data, error } = await db.from('events').select('id, user_id, metadata')
    .eq('id', id).eq('user_id', userId).eq('name', FILM_COMPLETE_INTENT_EVENT).maybeSingle()
  if (error) throw new Error('film_complete_read_unavailable')
  const m = data?.metadata && typeof data.metadata === 'object' ? data.metadata as Meta : null
  if (!data || data.user_id !== userId || !m || m.version !== FILM_COMPLETE_VERSION ||
      !FILM_COMPLETE_UUID.test(text(m.source_video_id)) || id !== filmCompleteId(userId, text(m.source_video_id)) ||
      text(m.generation_id) !== `filmcomplete-${id}` || !text(m.prompt) || text(m.prompt).length > 12000) return null
  return { id, userId, sourceVideoId: text(m.source_video_id), prompt: text(m.prompt), script: text(m.source_script), topic: text(m.source_topic), language: text(m.language) || 'en', generationId: text(m.generation_id), metadata: m }
}

/** Only stored text from the delivered, owned film becomes a purchase intent. No title/client prompt fallback. */
export async function createFilmCompleteIntent(db: SupabaseClient, userId: string, videoId: string, surface: string): Promise<FilmCompleteIntent | null> {
  if (!FILM_COMPLETE_UUID.test(videoId)) return null
  const id = filmCompleteId(userId, videoId)
  const saved = await loadFilmCompleteIntent(db, userId, id)
  if (saved) return saved
  const [{ data: video, error: ve }, { data: profile, error: pe }] = await Promise.all([
    db.from('videos').select('id, user_id, status, render_id, script, topic, quality_mode, duration, video_url').eq('id', videoId).eq('user_id', userId).maybeSingle(),
    db.from('profiles').select('plan, has_paid').eq('id', userId).maybeSingle(),
  ])
  if (ve || pe) throw new Error('film_complete_source_unavailable')
  if (!video || video.user_id !== userId || video.status !== 'completed' || !text(video.video_url) ||
      video.quality_mode !== 'cinematic_ai' || !(Number(video.duration) > 0 && Number(video.duration) < FILM_COMPLETE_TARGET_SECONDS) ||
      !isNonPayingAccount({ plan: profile?.plan, hasPaid: profile?.has_paid })) return null
  let language: string = 'en'
  let script = text(video.script)
  let birthPrompt = ''
  let sourceAspect = '9:16'
  let sourceVisualMode = ''
  let sourceQuality: FilmQualitySnapshot | null = null // KINEO-QUALIDADE-TODOS-MOTORES-2910
  if (text(video.render_id)) {
    const { data: claim, error } = await db.from('events').select('session_id, metadata').eq('user_id', userId).eq('name', COMPOSE_CLAIM_EVENT)
      .eq('metadata->>render_id', video.render_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw new Error('film_complete_source_unavailable')
    const m = claim?.metadata && typeof claim.metadata === 'object' ? claim.metadata as Meta : {}
    language = narrationLanguage(m.language) ?? 'en'
    if (!script) script = text(m.narration)
    const sourceGenerationId = text(m.generation_id) || text(claim?.session_id)
    if (sourceGenerationId) {
      // Modern compose claims do not store language. The original signed birth response does.
      const { data: birth, error: be } = await db.from('events').select('metadata').eq('user_id', userId).eq('name', CINEMATIC_CLAIM_EVENT)
        .eq('id', cinematicClaimId(userId, sourceGenerationId)).maybeSingle()
      if (be) throw new Error('film_complete_source_unavailable')
      const response = birth?.metadata?.response && typeof birth.metadata.response === 'object' ? birth.metadata.response as Meta : {}
      language = narrationLanguage(response.language) ?? language
      birthPrompt = text(response.prompt)
      sourceAspect = ['9:16', '16:9', '1:1', '4:5'].includes(text(response.aspect)) ? text(response.aspect) : '9:16'
      sourceVisualMode = text(response.visual_mode)
      sourceQuality = await qualityFromStoredBirth(db, userId, sourceGenerationId, response) // KINEO-QUALIDADE-TODOS-MOTORES-2910
    }
  }
  language = resolveNarrationLanguage(narrationLanguage(language) ?? 'en', script).language
  const topic = text(video.topic)
  // The original request retains visual direction; the actual narration anchors its story.
  const originalRequest = birthPrompt || topic
  const prompt = originalRequest && script && originalRequest !== script ? `${originalRequest}\n\n${script}` : script || originalRequest
  if (!prompt || prompt.length > 12000) return null
  const metadata = {
    version: FILM_COMPLETE_VERSION, source_video_id: videoId, source_script: script, source_topic: topic,
    prompt, language, generation_id: `filmcomplete-${id}`, target_seconds: FILM_COMPLETE_TARGET_SECONDS,
    source_aspect: sourceAspect, source_visual_mode: sourceVisualMode,
    source_generation_id: sourceQuality?.sourceGenerationId ?? null, source_quality: sourceQuality, // KINEO-QUALIDADE-TODOS-MOTORES-2910 — frozen before checkout
    engine: FILM_COMPLETE_ENGINE, script_mode: 'ai', surface: surface === 'email' ? 'email' : 'film_ready', source_video_url: text(video.video_url),
    state: 'awaiting_payment', paid_session_id: null, created_at: new Date().toISOString(),
  }
  const { error } = await db.from('events').insert({ id, name: FILM_COMPLETE_INTENT_EVENT, user_id: userId, path: '/api/film-complete/checkout', metadata })
  if (error && error.code !== '23505') throw new Error('film_complete_save_unavailable')
  return loadFilmCompleteIntent(db, userId, id)
}

export function filmCompleteCheckoutMetadata(intent: FilmCompleteIntent): Record<string, string> {
  return { film_complete_id: intent.id, film_complete_source_video_id: intent.sourceVideoId, film_complete_version: FILM_COMPLETE_VERSION }
}

export async function filmCompleteStatus(db: SupabaseClient, intent: FilmCompleteIntent): Promise<Record<string, unknown>> {
  const base = { intentId: intent.id, sourceVideoId: intent.sourceVideoId, sourceVideoUrl: /^https:\/\//.test(text(intent.metadata.source_video_url)) ? text(intent.metadata.source_video_url) : null, generationId: intent.generationId, targetSeconds: FILM_COMPLETE_TARGET_SECONDS, retryHref: `/api/film-complete/checkout?intent=${intent.id}` }
  if (!text(intent.metadata.paid_session_id)) return { ...base, state: 'awaiting_payment' }
  const [composeResult, birthResult] = await Promise.all([
    db.from('events').select('metadata').eq('user_id', intent.userId).eq('name', COMPOSE_CLAIM_EVENT)
      .eq('session_id', intent.generationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('events').select('metadata').eq('id', cinematicClaimId(intent.userId, intent.generationId))
      .eq('user_id', intent.userId).eq('name', CINEMATIC_CLAIM_EVENT).maybeSingle(),
  ])
  if (composeResult.error || birthResult.error) throw new Error('film_complete_status_unavailable')
  const compose = composeResult.data
  const claim = birthResult.data
  const renderId = text(compose?.metadata?.render_id)
  if (renderId) {
    const { data: video, error } = await db.from('videos').select('id, status, video_url').eq('user_id', intent.userId).eq('render_id', renderId).maybeSingle()
    if (error) throw new Error('film_complete_status_unavailable')
    if (video?.status === 'completed' && text(video.video_url)) return { ...base, state: 'completed', videoId: video.id, videoUrl: video.video_url }
    if (video?.status === 'failed' || claim?.metadata?.status === 'released') return { ...base, state: 'failed' }
    const { data: debit, error: de } = await db.from('credit_debits').select('refunded_at').eq('user_id', intent.userId)
      .eq('render_id', `cinematic-${cinematicClaimId(intent.userId, intent.generationId)}`).maybeSingle()
    if (de) throw new Error('film_complete_status_unavailable')
    if (text(debit?.refunded_at)) return { ...base, state: 'failed' }
    return { ...base, state: 'processing' }
  }
  if (claim?.metadata?.status === 'released') return { ...base, state: 'failed' }
  if (claim?.metadata?.status === 'settled' || claim?.metadata?.status === 'done') {
    // A rescue that exhausted compose attempts is an explicit delivery failure, not an endless spinner.
    const { data: outcome, error: oe } = await db.from('events').select('metadata').eq('user_id', intent.userId).eq('session_id', intent.generationId)
      .eq('name', 'stranded_outcome').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (oe) throw new Error('film_complete_status_unavailable')
    const result = text(outcome?.metadata?.outcome)
    if (['compose_gave_up', 'rescue_email_sent', 'rescue_already_sent_direct', 'pending_stale', 'no_request_ids'].includes(result) || result.startsWith('pending_stale:')) return { ...base, state: 'failed' }
  }
  if (claim?.metadata?.status === 'settled') return { ...base, state: 'processing' }
  // 'done' still needs deterministic debit settlement; the rescue cron only takes 'settled'.
  if (claim?.metadata?.status === 'done') return { ...base, state: 'starting' }
  const state: FilmCompleteState = intent.metadata.state === 'failed' ? 'failed' : intent.metadata.state === 'waiting_entitlement' ? 'waiting_entitlement' : 'starting'
  return { ...base, state }
}

export interface FilmCompleteIo {
  now: () => number
  mint: typeof mintUserSession
  fetch: typeof fetch
  /** KINEO-VERSAO-COMPLETA-K4-2910 — true só com a promo do Kling 4.0 confirmada no servidor para este usuário. Ausente = Seedance. */
  kling4Free?: (db: SupabaseClient, userId: string) => Promise<boolean>
}
// KINEO-VERSAO-COMPLETA-K4-2910 — a versão completa sai em Kling 4.0 quando o servidor confirma a promo do assinante (0 crédito).
// Medido 29/10: o 1º comprador vindo do filme grátis em Kling 4.0 recebeu a versão completa em Seedance, pagou 35 cr e viu o estilo
// mudar. O Kling 4.0 pago só aceita 15/30/60 s: a versão completa vira 30 s nele. Sem promo confirmada, segue Seedance 35 s.
export const FILM_COMPLETE_KLING4_ENGINE = 'hollywood' as const
export const FILM_COMPLETE_KLING4_SECONDS = 30
const REAL_IO: FilmCompleteIo = { now: () => Date.now(), mint: mintUserSession, fetch: (...args) => fetch(...args),
  kling4Free: async (db, userId) => { try { const a = await readKling4PaidAvailability(db, { userId, seconds: FILM_COMPLETE_KLING4_SECONDS, falExtrasMilliUsd: kling4PaidFalExtrasMilliUsd(FILM_COMPLETE_KLING4_SECONDS) }); return a.paidLive && a.promoAvailable } catch { return false } } }

/** A leased launch, plus the cinematic route's existing signed claim, reuse ONE deterministic generation on every retry. */
export async function startFilmComplete(db: SupabaseClient, intent: FilmCompleteIntent, origin: string, io: FilmCompleteIo = REAL_IO): Promise<Record<string, unknown>> {
  if (!text(intent.metadata.paid_session_id)) return filmCompleteStatus(db, intent)
  const status = await filmCompleteStatus(db, intent)
  if (status.state === 'completed' || status.state === 'processing' || status.state === 'failed') return status
  const { data: profile, error: pe } = await db.from('profiles').select('email, has_paid, plan').eq('id', intent.userId).maybeSingle()
  if (pe) throw new Error('film_complete_entitlement_unavailable')
  if (profile?.has_paid !== true || !['basic', 'creator', 'pro', 'studio'].includes(text(profile.plan)) || !text(profile.email)) return { ...status, state: 'waiting_entitlement' }
  const leaseAt = text(intent.metadata.launch_at)
  if (leaseAt && io.now() - Date.parse(leaseAt) < 5 * 60_000) return { ...status, state: 'starting' }
  const owner = randomUUID()
  const next: Meta = { ...intent.metadata, state: 'starting', launch_owner: owner, launch_at: new Date(io.now()).toISOString() }
  let lease = db.from('events').update({ metadata: next }).eq('id', intent.id).eq('user_id', intent.userId).eq('name', FILM_COMPLETE_INTENT_EVENT)
    .eq('metadata->>paid_session_id', text(intent.metadata.paid_session_id))
  lease = leaseAt ? lease.eq('metadata->>launch_at', leaseAt) : lease.is('metadata->>launch_at', null)
  const { data: acquired, error: le } = await lease.select('id').maybeSingle()
  if (le) throw new Error('film_complete_launch_unavailable')
  if (!acquired) return { ...status, state: 'starting' }
  const update = async (values: Meta) => {
    const { data, error } = await db.from('events').update({ metadata: { ...next, ...values } }).eq('id', intent.id).eq('user_id', intent.userId)
      .eq('name', FILM_COMPLETE_INTENT_EVENT).eq('metadata->>launch_owner', owner).select('id').maybeSingle()
    if (error || data?.id !== intent.id) throw new Error('film_complete_launch_save_unavailable')
  }
  let minted: Awaited<ReturnType<typeof mintUserSession>> | null = null
  try {
    // KINEO-QUALIDADE-TODOS-MOTORES-2910 — freeze legacy recovery before screenplay/provider work; both dispatch engines reuse it.
    const sourceQuality = await sourceQualityForIntent(db, intent)
    if (sourceQuality && !readFilmQualitySnapshot(next.source_quality)) {
      next.source_quality = sourceQuality
      next.source_generation_id = sourceQuality.sourceGenerationId
      await update({ state: 'starting' })
    }
    minted = await io.mint(intent.userId, text(profile.email))
    if (!minted.ok) { await update({ launch_at: null }); return { ...status, state: 'starting' } }
    let dispatchPrompt = text(intent.metadata.dispatch_prompt)
    // KINEO-VERSAO-COMPLETA-K4-2910 — motor e duração decididos UMA vez, antes do roteiro, e gravados; toda nova tentativa reusa os mesmos.
    const savedEngine = text(intent.metadata.dispatch_engine)
    const useKling4 = savedEngine ? savedEngine === FILM_COMPLETE_KLING4_ENGINE : !dispatchPrompt && io.kling4Free ? await io.kling4Free(db, intent.userId) : false
    const engine = useKling4 ? FILM_COMPLETE_KLING4_ENGINE : FILM_COMPLETE_ENGINE
    const seconds = useKling4 ? FILM_COMPLETE_KLING4_SECONDS : FILM_COMPLETE_TARGET_SECONDS
    if (!dispatchPrompt) {
      // The normal cinematic AI writer runs BEFORE its fingerprint. Freeze its expanded screenplay first,
      // otherwise a retry could rewrite the text and conflict with the same generation's original claim.
      const context = `${intent.prompt}\n${filmQualityWriterDirection(sourceQuality)}`.replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim() // KINEO-QUALIDADE-TODOS-MOTORES-2910 — keep source style and cast in the existing writer call
      const writer = await io.fetch(`${origin}/api/generate-script`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie: minted.session.cookie }, cache: 'no-store',
        body: JSON.stringify({ topic: `Expand the same story into a ${seconds}-second film. Preserve its topic, characters, setting, language and ending. Develop the same events. Original story and direction: [${context}]`, language: intent.language, targetSeconds: seconds, engine, forceAuthoring: true }), // KINEO-VERSAO-COMPLETA-K4-2910
        signal: AbortSignal.timeout(60_000),
      })
      const written = await writer.json().catch(() => ({})) as Meta
      const script = text(written.script)
      const parsed = parseUserScript(script)
      if (!writer.ok || written.stillShort === true || !parsed.hasMarkers || !parsed.segments.length || Number(written.targetSeconds) !== seconds) {
        const state = writer.status >= 500 || writer.status === 429 ? 'starting' : 'failed'
        await update({ state, launch_at: null, writer_http_status: writer.status })
        return { ...status, state }
      }
      dispatchPrompt = promptComRoteiro(intent.prompt, script)
      if (dispatchPrompt.length > 12000) { await update({ state: 'failed' }); return { ...status, state: 'failed' } }
      // Persist and confirm the exact bytes before any paid scene can start. Every later launch reuses them.
      next.dispatch_prompt = dispatchPrompt
      next.dispatch_script_mode = 'verbatim'
      next.dispatch_engine = engine // KINEO-VERSAO-COMPLETA-K4-2910
      next.dispatch_seconds = seconds // KINEO-VERSAO-COMPLETA-K4-2910
      await update({ state: 'starting' })
    }
    const response = await io.fetch(`${origin}/api/generate-video-cinematic`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: minted.session.cookie }, cache: 'no-store',
      body: JSON.stringify({ generationId: intent.generationId, prompt: dispatchPrompt, language: intent.language, engine, duration: seconds, ...(useKling4 ? { kling4_expect_promo: true } : {}), script_mode: 'verbatim', allow_shorter_duration: false, aspect: text(intent.metadata.source_aspect) || '9:16', film_complete_id: intent.id }), // KINEO-QUALIDADE-TODOS-MOTORES-2910 — renderer loads private source_quality by paid, owner-bound intent
      signal: AbortSignal.timeout(240_000),
    })
    const result = await response.json().catch(() => ({})) as Meta
    // KINEO-VERSAO-COMPLETA-K4-2910 — promo do Kling 4.0 acabou entre a leitura e o envio: a rota recusa com 409 SEM cobrar. A próxima
    // tentativa reescreve o roteiro e sai em Seedance (o roteiro do Kling 4.0 tem outra régua de voz).
    if (useKling4 && response.status === 409 && result.charged === false) {
      await update({ state: 'starting', launch_at: null, dispatch_prompt: '', dispatch_engine: FILM_COMPLETE_ENGINE, dispatch_seconds: FILM_COMPLETE_TARGET_SECONDS, kling4_promo_refused: text(result.reason) || 'promo_unavailable' })
      return { ...status, state: 'starting' }
    }
    const state = response.ok ? 'processing' : response.status === 402 ? 'waiting_entitlement' : response.status >= 400 && response.status < 500 && result.pending !== true ? 'failed' : 'starting'
    await update({ state, http_status: response.status, ...(response.status === 402 ? { launch_at: null } : {}) })
    return { ...status, state }
  } catch {
    // A timeout can have submitted scenes: never generate another id or assert failure/refund.
    return { ...status, state: 'starting' }
  } finally {
    if (minted?.ok) await minted.session.dispose()
  }
}

/** Called only AFTER the existing subscription entitlement grant. A free/trial/unpaid Session cannot arm a render. */
export async function settleFilmComplete(db: SupabaseClient, session: Stripe.Checkout.Session, origin: string, paidAt: number): Promise<void> {
  const metadata = filmCompletePaymentMetadata(session.metadata)
  if (!metadata.film_complete_id) return
  const userId = text(session.metadata?.supabase_user_id)
  if (!FILM_COMPLETE_UUID.test(userId) || session.payment_status !== 'paid' || session.mode !== 'subscription' ||
      !(typeof session.amount_total === 'number' && session.amount_total > 0) || session.metadata?.tier !== 'basic' ||
      session.metadata?.billing !== 'monthly' || session.metadata?.card_trial === '1' || session.metadata?.intro === '1' ||
      session.metadata?.intent_campaign !== FILM_COMPLETE_CAMPAIGN) return
  let intent = await loadFilmCompleteIntent(db, userId, metadata.film_complete_id)
  if (!intent || intent.sourceVideoId !== metadata.film_complete_source_video_id) throw new Error('film_complete_intent_mismatch')
  const previousSession = text(intent.metadata.paid_session_id)
  if (previousSession && previousSession !== session.id) return
  if (!previousSession) {
    const { error } = await db.from('events').update({ metadata: { ...intent.metadata, paid_session_id: session.id, paid_at: new Date(paidAt).toISOString(), state: 'starting' } })
      .eq('id', intent.id).eq('user_id', userId).eq('name', FILM_COMPLETE_INTENT_EVENT).is('metadata->>paid_session_id', null)
    if (error) throw new Error('film_complete_payment_save_unavailable')
    intent = await loadFilmCompleteIntent(db, userId, intent.id)
    if (!intent || text(intent.metadata.paid_session_id) !== session.id) return
  }
  const paidIntent = intent
  const task = async () => { await startFilmComplete(db, paidIntent, origin) }
  if (!depoisDaResposta('film-complete-start', task)) await task()
}

/** Existing minute cron retries one paid launch that never reached a cinematic claim (for example, a closed return tab). */
export async function retryPaidFilmCompleteIntents(
  db: SupabaseClient, origin: string, now = Date.now(),
  launch: typeof startFilmComplete = startFilmComplete,
): Promise<{ scanned: number; scheduled: number }> {
  const { data: rows, error } = await db.from('events').select('id, user_id, metadata')
    .eq('name', FILM_COMPLETE_INTENT_EVENT).eq('metadata->>version', FILM_COMPLETE_VERSION)
    .in('metadata->>state', ['starting', 'waiting_entitlement']).not('metadata->>paid_session_id', 'is', null)
    .gte('metadata->>paid_at', new Date(now - 48 * 60 * 60_000).toISOString())
    // Unchecked intents go first; repeated entitlement waits cannot monopolize the bounded retry pass.
    .order('metadata->>retry_checked_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true }).limit(10)
  if (error) throw new Error('film_complete_retry_unavailable')
  let scanned = 0
  for (const row of rows ?? []) {
    scanned++
    if (!FILM_COMPLETE_UUID.test(text(row.user_id)) || !FILM_COMPLETE_UUID.test(text(row.id))) continue
    const intent = await loadFilmCompleteIntent(db, text(row.user_id), text(row.id))
    if (!intent || !text(intent.metadata.paid_session_id)) continue
    const paidAt = Date.parse(text(intent.metadata.paid_at))
    if (!Number.isFinite(paidAt) || paidAt > now) continue
    const observed = await filmCompleteStatus(db, intent)
    const retire = ['processing', 'completed', 'failed'].includes(String(observed.state))
    const leaseAt = Date.parse(text(intent.metadata.launch_at))
    if (!retire && Number.isFinite(leaseAt) && now - leaseAt < 5 * 60_000) continue
    const metadata = { ...intent.metadata, retry_checked_at: new Date(now).toISOString(), ...(retire ? { state: observed.state } : {}) }
    // Compare the complete JSON snapshot: a concurrent writer/launcher may have frozen the screenplay
    // since our read. A lost CAS skips this intent instead of overwriting that newly saved text or lease.
    const { data: reconciled, error: re } = await db.from('events').update({ metadata }).eq('id', intent.id)
      .eq('user_id', intent.userId).eq('name', FILM_COMPLETE_INTENT_EVENT)
      .eq('metadata', JSON.stringify(intent.metadata)).select('id').maybeSingle()
    if (re) throw new Error('film_complete_retry_reconcile_unavailable')
    if (!reconciled || retire) continue
    const currentIntent = { ...intent, metadata }
    const task = async () => { await launch(db, currentIntent, origin) }
    if (!depoisDaResposta('film-complete-retry', task)) await task()
    return { scanned, scheduled: 1 }
  }
  return { scanned, scheduled: 0 }
}
