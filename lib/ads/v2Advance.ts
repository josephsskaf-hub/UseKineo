// KINEO-ADS-V2-2026-09-28 — o motor de avanço do anúncio v2 (etapa 2, servidor). Uma função chamada pela TELA
// (GET /api/ads/v2/status) e pelo CRON (/api/cron/ads-v2-advance) — os dois podem rodar AO MESMO TEMPO, então todo
// passo que gasta dinheiro ou muda estado é decidido por UPDATE condicional (só um vence):
//
//   plano     pending ──claim(submit_claimed_at)──▶ POST fal ──▶ submitted | ambiguous | failed
//             (cena criada: image_submit_claimed_at → Nano Banana → image_submitted → image_done → vídeo)
//             submitted ──poll──▶ fal_url ──cópia (renders) + mvhd──▶ done
//             ambiguous/carimbo sem desfecho > 20 min → failed (NUNCA reenvio às cegas antes disso)
//             failed/stuck por culpa do fornecedor → nova tentativa SEM cobrar: 2ª no motor principal, 3ª no H3 de
//             reserva (routeShot); `text` nunca vai à fal em tentativa nenhuma; saldo/acesso da fal = terminal.
//   pedido    generating ──(todos prontos) claim──▶ assembling ──música (Lyria→bucket) + voz MiniMax (medida,
//             bucket) + buildAdV2Source──▶ carimbo assembly_submit_at ──▶ submitCreatomateRender ──▶ grava
//             creatomate_render_id ANTES de qualquer outra coisa ──poll──▶ persistRenderAssets ──▶ insert videos
//             (quality_mode 'ads_v2', render_id = billing_ref) ──▶ UPDATE condicional →delivered ──▶ evento.
//             Falha terminal → failAdsV2Order (UPDATE condicional →failed; só o vencedor estorna).
//   Creatomate ambíguo (carimbo sem id) NUNCA é reenviado: passado o prazo, falha com estorno.
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReasonClass } from '@/lib/cinematic/sceneDisposition'
import {
  CreatomateSubmitError,
  estimateMp3DurationSeconds,
  pollCreatomateRender,
  submitCreatomateRender,
  uploadVoiceoverToSupabase,
} from '@/lib/compose'
import { getLyriaMusicUrl } from '@/lib/lyriaMusic'
import { getBackgroundMusicUrl, type MusicMood } from '@/lib/pixabayMusic'
import { synthesizeTtsFallback } from '@/lib/ttsFallback'
import { persistRenderAssets } from '@/lib/renderAssets'
import { renderOutputSpecFor } from '@/lib/renderProfile'
import { captionFontFor, narrationLanguage } from '@/lib/textLanguage'
import { speakableForTts } from '@/lib/ads/speakable'
import { writeServerEvent } from '@/lib/serverEvents'
import { buildShotInput } from '@/lib/ads/v2Engines'
import { ADS_V2_ENGINES, adsV2RetakeCredits, routeShot, type AdsV2Engine, type AdsV2ShotKind, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import { ADS_V2_CARD_SECONDS, type AdsV2ShotPlan } from '@/lib/ads/v2ShotLists'
import { buildAdV2Source, ADS_V2_VOICE_START, type AdV2MontageShot } from '@/lib/ads/adV2Montage'
import { adsV2FallbackTrack, adsV2MusicTrimStart, adsV2MusicUsable, adsV2SwapLibraryTrack } from '@/lib/ads/v2Music'
import { ADS_V2_QUALITY, confirmAdsV2Debit, failAdsV2Order } from '@/lib/ads/v2Billing'
import {
  ADS_V2_AMBIGUOUS_MAX_MS,
  ADS_V2_BATCH_SIZE,
  ADS_V2_COPY_MAX_MS,
  ADS_V2_KLING_GAP_MS,
  ADS_V2_SHOT_STUCK_MS,
  persistShotClip,
  pollFalJob,
  submitShotOnce,
} from '@/lib/ads/v2Shots'
import { persistAudioCopy, persistSceneImage, pollSceneImage, submitSceneImage } from '@/lib/ads/v2Images'
import { ADS_V2_SAME_PERSON_LINE, adsV2AnchorDecision, variationTagOf, variationTintOf } from '@/lib/ads/v2Variations'

/** Tentativas por plano dentro de UMA geração paga: 1ª + refação automática no principal + reserva H3. */
export const ADS_V2_MAX_AUTO_ATTEMPTS = 3
/** Classes que NÃO são refeitas: é a conta da fal (saldo/acesso) ou a nossa própria recusa — refazer só queima tempo. */
export const ADS_V2_NON_RETRY_CLASSES: readonly string[] = ['balance_quota', 'auth_model_access', 'local_policy_gate']
/** Pedido em andamento há mais que isto = falha terminal com estorno (a varredura de 2 h é a rede de trás). */
export const ADS_V2_ORDER_MAX_MS = 90 * 60 * 1000
/** Trava de preparo da montagem (música/voz): outra lambda só retoma depois disto. */
export const ADS_V2_ASSEMBLY_LEASE_MS = 5 * 60 * 1000
/** Carimbo do POST ao Creatomate sem id depois disto = ambíguo vencido → falha (nunca reenvio). */
export const ADS_V2_CREATOMATE_AMBIGUOUS_MS = 15 * 60 * 1000
/** Render do Creatomate que não termina depois disto (a partir do carimbo) = falha. */
export const ADS_V2_CREATOMATE_MAX_MS = 45 * 60 * 1000
/**
 * REVISÃO 28/09 (dinheiro): pedido 'generating' SEM as linhas de plano. A rota (/start ou /retake) grava o status
 * ANTES do débito e das linhas; tela/cron podem cair nessa janela. Dentro da folga, o avanço ESPERA (nunca manda nada
 * à fal antes do débito confirmado); passada a folga, o pedido novo só é recriado com o débito CONFIRMADO no ledger, e a
 * refação (cujas linhas são cópias do pai) nunca é recriada pelo plano — falha com estorno.
 */
export const ADS_V2_ROWS_GRACE_MS = 3 * 60 * 1000
/** O cartão final pode crescer para caber a voz (passar do alvo é bom), até este teto. */
export const ADS_V2_CARD_MAX_SECONDS = ADS_V2_CARD_SECONDS + 4

export const ADS_V2_ORDER_COLS =
  'id, user_id, status, tier, seconds, sector, brief, language, narration, logo_footage_id, card_url, card_footage_id, photos, plan, music_url, voice_url, voice_seconds, billing_ref, credits_charged, generation_id, creatomate_render_id, video_id, error, created_at, updated_at, started_at, delivered_at, failed_at, assembly_lease_at, assembly_submit_at, parent_order_id, retake_idx'
export const ADS_V2_SHOT_COLS =
  'id, order_id, idx, attempt, role, kind, source, source_footage_id, image_url, image_request_id, engine, prompt, gen_seconds, cut_start, cut_seconds, request_id, status, fal_url, stored_url, measured_seconds, usd, reason, reason_class, movement_variant, image_submit_claimed_at, submit_claimed_at, submitted_at, fal_done_at, created_at, updated_at'

export interface AdsV2StoredOverlay { role: string; start: number; end: number; text: string }
export type AdsV2StoredPlan = Omit<AdsV2ShotPlan, 'overlays'> & { overlays: AdsV2StoredOverlay[]; narration: string | null }

export interface AdsV2OrderRow {
  id: string
  user_id: string
  status: 'draft' | 'planned' | 'generating' | 'assembling' | 'delivered' | 'failed' | 'cancelled'
  tier: AdsV2Tier
  seconds: 15 | 20 | 30
  sector: string | null
  brief: Record<string, unknown> | null
  language: string | null
  narration: boolean
  logo_footage_id: string | null
  card_url: string | null
  card_footage_id: string | null
  photos: { footage_id: string; kind: string; url: string }[] | null
  plan: AdsV2StoredPlan | null
  music_url: string | null
  voice_url: string | null
  voice_seconds: number | string | null
  billing_ref: string | null
  credits_charged: number
  generation_id: string | null
  creatomate_render_id: string | null
  video_id: string | null
  error: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  delivered_at: string | null
  failed_at: string | null
  assembly_lease_at: string | null
  assembly_submit_at: string | null
  parent_order_id: string | null
  retake_idx: number | null
}

export interface AdsV2ShotRow {
  id: string
  order_id: string
  idx: number
  attempt: number
  role: string | null
  kind: AdsV2ShotKind
  source: 'client_photo' | 'generated_scene'
  source_footage_id: string | null
  image_url: string | null
  image_request_id: string | null
  engine: AdsV2Engine | null
  prompt: string | null
  gen_seconds: number | string | null
  cut_start: number | string | null
  cut_seconds: number | string | null
  request_id: string | null
  status: 'pending' | 'image_submitted' | 'image_done' | 'submitted' | 'ambiguous' | 'done' | 'failed' | 'stuck' | 'skipped_text'
  fal_url: string | null
  stored_url: string | null
  measured_seconds: number | string | null
  usd: number | string | null
  reason: string | null
  reason_class: string | null
  movement_variant: number
  image_submit_claimed_at: string | null
  submit_claimed_at: string | null
  submitted_at: string | null
  fal_done_at: string | null
  created_at: string
  updated_at: string
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
const ageMs = (iso: string | null | undefined): number => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? Date.now() - t : 0
}
const nowIso = () => new Date().toISOString()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── linhas iniciais ───────────────────────────────────────────────────────────────────────────────────────────────
/**
 * As linhas de plano (tentativa 1) de uma geração paga. REGRA DURA: plano `text` nasce 'skipped_text', sem motor,
 * sem prompt de vídeo e com a própria foto como stored_url — nunca vai à fal (o CHECK ads_v2_shots_text_never_ai
 * repete a regra no banco).
 */
export function buildInitialShotRows(orderId: string, tier: AdsV2Tier, plan: Pick<AdsV2ShotPlan, 'shots'>): Record<string, unknown>[] {
  return plan.shots.map((s) => {
    // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo do cliente nasce 'done': sem motor, sem prompt, sem imagem, com o
    // próprio arquivo como stored_url e a duração MEDIDA pelo servidor. Nunca vai à fal (o CHECK
    // ads_v2_shots_user_video_never_ai, migrations_pending/2026-09-29_ads_v2_user_video.sql, repete a regra no banco).
    if (s.kind === 'user_video') {
      return {
        order_id: orderId,
        idx: s.idx,
        attempt: 1,
        role: s.role,
        kind: 'user_video',
        source: 'client_photo',
        source_footage_id: s.sourceFootageId,
        image_url: null,
        engine: null,
        prompt: null,
        gen_seconds: null,
        cut_start: s.cutStart,
        cut_seconds: s.cutSeconds,
        movement_variant: 0,
        status: 'done',
        stored_url: s.videoUrl ?? null,
        measured_seconds: s.videoSeconds ?? null,
        usd: 0,
      }
    }
    const isText = s.kind === 'text'
    const engine = isText ? null : routeShot(s.kind, tier, 1)
    return {
      order_id: orderId,
      idx: s.idx,
      attempt: 1,
      role: s.role,
      kind: s.kind,
      source: s.source,
      source_footage_id: s.sourceFootageId,
      image_url: s.source === 'client_photo' ? s.imageUrl : null,
      engine,
      prompt: isText ? null : s.prompt,
      gen_seconds: engine ? ADS_V2_ENGINES[engine].genSeconds : null,
      cut_start: s.cutStart,
      cut_seconds: s.cutSeconds,
      movement_variant: s.movementVariant,
      status: isText ? 'skipped_text' : 'pending',
      stored_url: isText ? s.imageUrl : null,
    }
  })
}

export async function loadAdsV2Order(admin: SupabaseClient, orderId: string, userId?: string): Promise<{ order: AdsV2OrderRow | null; error: { code?: string; message?: string } | null }> {
  let q = admin.from('ads_v2_orders').select(ADS_V2_ORDER_COLS).eq('id', orderId)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.maybeSingle()
  return { order: (data as AdsV2OrderRow | null) ?? null, error: error ? { code: error.code, message: error.message } : null }
}

export async function loadAdsV2Shots(admin: SupabaseClient, orderId: string): Promise<AdsV2ShotRow[] | null> {
  const { data, error } = await admin.from('ads_v2_shots').select(ADS_V2_SHOT_COLS).eq('order_id', orderId).order('idx', { ascending: true }).order('attempt', { ascending: true })
  if (error) return null
  return (data ?? []) as AdsV2ShotRow[]
}

/** A tentativa mais nova de cada plano. */
export function latestShots(rows: readonly AdsV2ShotRow[]): AdsV2ShotRow[] {
  const by = new Map<number, AdsV2ShotRow>()
  for (const r of rows) {
    const cur = by.get(r.idx)
    if (!cur || r.attempt > cur.attempt) by.set(r.idx, r)
  }
  return [...by.values()].sort((a, b) => a.idx - b.idx)
}

const READY = new Set(['done', 'skipped_text'])

// ── transições de um plano (todas condicionais ao status de origem) ──────────────────────────────────────────────
async function markShot(admin: SupabaseClient, row: AdsV2ShotRow, from: readonly string[], patch: Record<string, unknown>, stillNull?: 'submit_claimed_at' | 'image_submit_claimed_at'): Promise<boolean> {
  let q = admin.from('ads_v2_shots').update(patch).eq('id', row.id).in('status', from as string[])
  // Carimbo de envio: só vence quem o encontra VAZIO (status sozinho não basta: o 1º ainda está esperando a fal).
  if (stillNull) q = q.is(stillNull, null)
  const r = await q.select('id').maybeSingle()
  return !r.error && !!r.data
}
function failShot(admin: SupabaseClient, row: AdsV2ShotRow, from: readonly string[], reason: string, reasonClass: ReasonClass | string): Promise<boolean> {
  return markShot(admin, row, from, { status: 'failed', reason: reason.slice(0, 200), reason_class: reasonClass })
}

// ── envio (tela, cron e /start) ───────────────────────────────────────────────────────────────────────────────────
/** Plano que nunca passa por IA: `text` (foto parada com zoom) e `user_video` (o vídeo do próprio cliente). */
function neverAi(r: Pick<AdsV2ShotRow, 'kind'>): boolean {
  return r.kind === 'text' || r.kind === 'user_video'
}
function needsImage(r: AdsV2ShotRow): boolean {
  return !neverAi(r) && r.source === 'generated_scene' && !r.image_url && r.status === 'pending' && !r.image_submit_claimed_at
}
function needsVideo(r: AdsV2ShotRow): boolean {
  return !neverAi(r) && !!r.engine && !!r.image_url && (r.status === 'pending' || r.status === 'image_done') && !r.submit_claimed_at
}

/**
 * KINEO-ADS-3-VARIACOES-2026-09-30 — o still da MESMA cena (mesmo idx) na variação A: o estado do pedido A e a imagem
 * mais nova já copiada para o nosso bucket. Leitura que falha = 'unknown' (espera, nunca "a A morreu").
 */
async function loadAnchorStill(admin: SupabaseClient, anchorOrderId: string, userId: string, idx: number): Promise<{ status: string | null; imageUrl: string | null }> {
  const o = await admin.from('ads_v2_orders').select('status').eq('id', anchorOrderId).eq('user_id', userId).maybeSingle()
  if (o.error) return { status: 'unknown', imageUrl: null }
  if (!o.data) return { status: null, imageUrl: null }
  const status = String((o.data as { status: string }).status)
  const s = await admin.from('ads_v2_shots').select('image_url, attempt').eq('order_id', anchorOrderId).eq('idx', idx).not('image_url', 'is', null).order('attempt', { ascending: false }).limit(1)
  if (s.error) return { status: 'unknown', imageUrl: null }
  const url = ((s.data ?? []) as { image_url: string | null }[])[0]?.image_url ?? null
  return { status, imageUrl: url }
}

async function submitImageFor(admin: SupabaseClient, order: AdsV2OrderRow, row: AdsV2ShotRow): Promise<void> {
  // KINEO-ADS-3-VARIACOES-2026-09-30 — variação B/C com gente: a MESMA gente da A. Espera o still da A (ANTES de
  // carimbar: esperar não gasta nada); pedido comum e variação A nunca entram aqui (tag nula ou slot 'A').
  const tag = variationTagOf(order.brief)
  let anchorUrl: string | null = null
  let anchorOutcome: string | null = null
  if (tag && tag.slot !== 'A' && row.kind === 'people' && row.source === 'generated_scene') {
    const anchor = await loadAnchorStill(admin, tag.anchor_order_id, order.user_id, row.idx)
    const d = adsV2AnchorDecision({ slot: tag.slot, shotKind: row.kind, shotSource: row.source, anchorOrderStatus: anchor.status, anchorImageUrl: anchor.imageUrl, waitedMs: ageMs(order.started_at) })
    if (d.kind === 'wait') return
    if (d.kind === 'use') anchorUrl = d.url
    anchorOutcome = d.kind === 'use' ? 'used' : `skipped:${d.reason}`
  }
  // Trava: só quem grava o carimbo envia (tela e cron juntos nunca mandam a mesma cena duas vezes).
  const claimed = await markShot(admin, row, ['pending'], { image_submit_claimed_at: nowIso() }, 'image_submit_claimed_at')
  if (!claimed) return
  const planned = order.plan?.shots?.find((s) => s.idx === row.idx)
  const basePrompt = planned?.scenePrompt ?? null
  const baseRefs = planned?.referenceUrls ?? []
  // O still da A entra como ÚLTIMA referência (as fotos do cliente continuam sendo a referência do lugar e do produto).
  const prompt = basePrompt && anchorUrl ? `${basePrompt} ${ADS_V2_SAME_PERSON_LINE}` : basePrompt
  const refs = anchorUrl && baseRefs.length > 0 ? [...baseRefs, anchorUrl] : baseRefs
  if (anchorOutcome) {
    await writeServerEvent({ name: 'ads_v2_variation_anchor', userId: order.user_id, path: '/lib/ads/v2Advance', metadata: { order_id: order.id, group_id: tag?.group_id ?? null, slot: tag?.slot ?? null, idx: row.idx, outcome: anchorOutcome } })
  }
  if (!prompt || refs.length === 0) {
    await failShot(admin, row, ['pending'], 'scene_without_prompt_or_reference', 'local_policy_gate')
    return
  }
  let outcome
  try {
    outcome = await submitSceneImage({ prompt, referenceUrls: refs }, { userId: order.user_id, orderId: order.id })
  } catch (e) {
    // buildSceneImageInput recusou (nada saiu daqui): recusa NOSSA, não refazer.
    await failShot(admin, row, ['pending'], `scene_input_invalid:${e instanceof Error ? e.message : String(e)}`, 'local_policy_gate')
    return
  }
  if (outcome.kind === 'accepted') {
    await markShot(admin, row, ['pending'], { status: 'image_submitted', image_request_id: outcome.requestId })
  } else if (outcome.kind === 'ambiguous') {
    await markShot(admin, row, ['pending'], { status: 'ambiguous', reason: 'image_submit_ambiguous', reason_class: outcome.reasonClass })
    // Resposta tardia ainda nesta lambda: grava o id (o job existe; nada é reenviado).
    void outcome.late.then(async (id) => {
      if (id) await admin.from('ads_v2_shots').update({ status: 'image_submitted', image_request_id: id, reason: null }).eq('id', row.id).eq('status', 'ambiguous').is('image_request_id', null)
    }).catch(() => {})
  } else {
    await failShot(admin, row, ['pending'], `image_submit_rejected:${outcome.status ?? 'none'}`, outcome.reasonClass)
  }
}

async function submitVideoFor(admin: SupabaseClient, order: AdsV2OrderRow, row: AdsV2ShotRow): Promise<void> {
  // REGRA DURA: texto e o vídeo do cliente nunca passam por IA de vídeo — nem por engano de linha (engine nulo também não sai).
  if (neverAi(row) || !row.engine) return
  const engine = row.engine
  const claimed = await markShot(admin, row, ['pending', 'image_done'], { submit_claimed_at: nowIso() }, 'submit_claimed_at')
  if (!claimed) return
  let input: Record<string, unknown>
  try {
    input = buildShotInput(engine, { imageUrl: row.image_url ?? '', prompt: row.prompt ?? '' }) as unknown as Record<string, unknown>
  } catch (e) {
    await failShot(admin, row, ['pending', 'image_done'], `shot_input_invalid:${e instanceof Error ? e.message : String(e)}`, 'local_policy_gate')
    return
  }
  const spec = ADS_V2_ENGINES[engine]
  const outcome = await submitShotOnce(spec.slug, input, { userId: order.user_id, orderId: order.id })
  if (outcome.kind === 'accepted') {
    await markShot(admin, row, ['pending', 'image_done'], {
      status: 'submitted',
      request_id: outcome.requestId,
      submitted_at: nowIso(),
      gen_seconds: spec.genSeconds,
      usd: Math.round(spec.usdPerSecond * spec.genSeconds * 10000) / 10000,
    })
  } else if (outcome.kind === 'ambiguous') {
    await markShot(admin, row, ['pending', 'image_done'], { status: 'ambiguous', reason: 'submit_ambiguous', reason_class: outcome.reasonClass, submitted_at: nowIso() })
    void outcome.late.then(async (id) => {
      if (id) await admin.from('ads_v2_shots').update({ status: 'submitted', request_id: id, reason: null }).eq('id', row.id).eq('status', 'ambiguous').is('request_id', null)
    }).catch(() => {})
  } else {
    await failShot(admin, row, ['pending', 'image_done'], `submit_rejected:${outcome.status ?? 'none'}`, outcome.reasonClass)
  }
}

/**
 * Envia o que está pronto para sair: imagens das cenas criadas (antes do vídeo) e vídeos. Concorrência moderada:
 * Kling O3 em série com pausa curta; Seedance/H3/Nano Banana em lotes de 3. Para de abrir envio novo no prazo.
 */
export async function dispatchAdsV2Shots(admin: SupabaseClient, order: AdsV2OrderRow, deadlineMs: number): Promise<number> {
  // Pedido que já falhou/entregou (outra lambda venceu entre a leitura e aqui) não manda NADA à fal.
  if (order.status !== 'generating') return 0
  const rows = await loadAdsV2Shots(admin, order.id)
  if (!rows) return 0
  const latest = latestShots(rows)
  const images = latest.filter(needsImage)
  const videos = latest.filter(needsVideo)
  const kling = videos.filter((r) => r.engine === 'kling_o3')
  const others = videos.filter((r) => r.engine !== 'kling_o3')
  let sent = 0
  const batch = async (list: AdsV2ShotRow[], fn: (r: AdsV2ShotRow) => Promise<void>) => {
    for (let i = 0; i < list.length; i += ADS_V2_BATCH_SIZE) {
      if (Date.now() > deadlineMs) return
      const part = list.slice(i, i + ADS_V2_BATCH_SIZE)
      await Promise.all(part.map((r) => fn(r).catch((e) => console.warn('[ads-v2] envio falhou:', e instanceof Error ? e.message : String(e)))))
      sent += part.length
    }
  }
  await batch(images, (r) => submitImageFor(admin, order, r))
  await batch(others, (r) => submitVideoFor(admin, order, r))
  for (const r of kling) {
    if (Date.now() > deadlineMs) break
    await submitVideoFor(admin, order, r).catch((e) => console.warn('[ads-v2] envio Kling falhou:', e instanceof Error ? e.message : String(e)))
    sent += 1
    await sleep(ADS_V2_KLING_GAP_MS)
  }
  return sent
}

// ── acompanhamento de um plano ────────────────────────────────────────────────────────────────────────────────────
async function pollOne(admin: SupabaseClient, order: AdsV2OrderRow, row: AdsV2ShotRow): Promise<void> {
  const ctx = { userId: order.user_id, orderId: order.id }
  switch (row.status) {
    case 'pending':
    case 'image_done': {
      // Carimbo de envio sem desfecho (a lambda morreu entre o carimbo e o POST): ambíguo vencido depois de 20 min.
      const claim = row.status === 'pending' && row.source === 'generated_scene' && !row.image_url ? row.image_submit_claimed_at : row.submit_claimed_at
      if (claim && ageMs(claim) > ADS_V2_AMBIGUOUS_MAX_MS) await failShot(admin, row, [row.status], 'claim_without_outcome', 'transport_timeout_5xx')
      return
    }
    case 'ambiguous': {
      if (ageMs(row.updated_at) > ADS_V2_AMBIGUOUS_MAX_MS) await failShot(admin, row, ['ambiguous'], `${row.reason ?? 'ambiguous'}_expired`, 'transport_timeout_5xx')
      return
    }
    case 'image_submitted': {
      if (!row.image_request_id) return
      const p = await pollSceneImage(row.image_request_id, ctx)
      if (p.state === 'done' && p.url) {
        const stored = await persistSceneImage({ userId: order.user_id, orderId: order.id, idx: row.idx, attempt: row.attempt, falUrl: p.url })
        if (stored) await markShot(admin, row, ['image_submitted'], { status: 'image_done', image_url: stored })
        else if (ageMs(row.updated_at) > ADS_V2_COPY_MAX_MS) await failShot(admin, row, ['image_submitted'], 'image_copy_failed', 'unknown')
      } else if (p.state === 'failed') {
        await failShot(admin, row, ['image_submitted'], 'image_provider_failed', 'unknown')
      } else if (ageMs(row.image_submit_claimed_at ?? row.updated_at) > ADS_V2_SHOT_STUCK_MS) {
        await markShot(admin, row, ['image_submitted'], { status: 'stuck', reason: 'image_stuck', reason_class: 'unknown' })
      }
      return
    }
    case 'submitted': {
      let falUrl = row.fal_url
      if (!falUrl) {
        if (!row.request_id || !row.engine) return
        const p = await pollFalJob(ADS_V2_ENGINES[row.engine].slug, row.request_id, 'video', ctx)
        if (p.state === 'failed') { await failShot(admin, row, ['submitted'], 'provider_failed', 'unknown'); return }
        if (p.state !== 'done' || !p.url) {
          if (ageMs(row.submitted_at ?? row.updated_at) > ADS_V2_SHOT_STUCK_MS) await markShot(admin, row, ['submitted'], { status: 'stuck', reason: 'shot_stuck', reason_class: 'unknown' })
          return
        }
        falUrl = p.url
        await markShot(admin, row, ['submitted'], { fal_url: falUrl, fal_done_at: nowIso() })
      }
      // A URL da fal expira: o plano só fica 'done' com a cópia no NOSSO bucket e a duração medida no mvhd.
      const copy = await persistShotClip({ userId: order.user_id, orderId: order.id, idx: row.idx, attempt: row.attempt, falUrl })
      if (copy) {
        const need = (num(row.cut_start) ?? 0) + (num(row.cut_seconds) ?? 0) + 0.25
        if (copy.measuredSeconds + 1e-6 < need) {
          await failShot(admin, row, ['submitted'], `clip_too_short:${copy.measuredSeconds}<${need}`, 'unknown')
          return
        }
        await markShot(admin, row, ['submitted'], { status: 'done', stored_url: copy.storedUrl, measured_seconds: copy.measuredSeconds, reason: null })
      } else if (ageMs(row.fal_done_at ?? nowIso()) > ADS_V2_COPY_MAX_MS) {
        await failShot(admin, row, ['submitted'], 'clip_copy_failed', 'unknown')
      }
      return
    }
    default:
      return
  }
}

/**
 * Plano que falhou por culpa do fornecedor ganha nova tentativa SEM cobrar (2ª no principal, 3ª no H3). Devolve o
 * motivo terminal quando não há mais tentativa (o pedido inteiro falha e estorna).
 */
async function retryOrTerminal(admin: SupabaseClient, order: AdsV2OrderRow, row: AdsV2ShotRow): Promise<string | null> {
  if (row.kind === 'text') return `text_shot_${row.idx}_${row.status}` // nunca acontece: text nasce skipped_text
  if (row.kind === 'user_video') return `user_video_shot_${row.idx}_${row.status}` // nunca acontece: nasce 'done', sem IA
  if (row.reason_class && ADS_V2_NON_RETRY_CLASSES.includes(row.reason_class)) return `shot_${row.idx}_${row.reason_class}`
  if (row.attempt >= ADS_V2_MAX_AUTO_ATTEMPTS) return `shot_${row.idx}_exhausted:${row.reason ?? row.status}`
  const attempt = row.attempt + 1
  const engine = routeShot(row.kind, order.tier, attempt)
  if (!engine) return `shot_${row.idx}_no_engine`
  // Cena criada cuja IMAGEM já saiu reaproveita a imagem (só o vídeo falhou); falha na imagem recomeça pela imagem.
  const keepImage = row.source === 'client_photo' || !!row.image_url
  const next = {
    order_id: order.id,
    idx: row.idx,
    attempt,
    role: row.role,
    kind: row.kind,
    source: row.source,
    source_footage_id: row.source_footage_id,
    image_url: keepImage ? row.image_url : null,
    engine,
    prompt: row.prompt,
    gen_seconds: ADS_V2_ENGINES[engine].genSeconds,
    cut_start: row.cut_start,
    cut_seconds: row.cut_seconds,
    movement_variant: row.movement_variant,
    status: row.source === 'generated_scene' && keepImage ? 'image_done' : 'pending',
  }
  const ins = await admin.from('ads_v2_shots').upsert(next, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true }).select('id')
  if (!ins.error && Array.isArray(ins.data) && ins.data.length > 0) {
    await writeServerEvent({
      name: 'ads_v2_shot_retried',
      userId: order.user_id,
      path: '/lib/ads/v2Advance',
      metadata: { order_id: order.id, idx: row.idx, attempt, engine, previous_reason: row.reason, previous_class: row.reason_class, charged: false },
    })
  }
  return null
}

// ── montagem ──────────────────────────────────────────────────────────────────────────────────────────────────────
const SECTOR_MOOD: Readonly<Record<string, MusicMood>> = {
  restaurant: 'emotional', clinic: 'emotional', real_estate: 'nature', gym: 'hustle',
  salon: 'emotional', store: 'hustle', app_service: 'tech', other: 'emotional',
}

function businessName(order: AdsV2OrderRow): string {
  const b = order.brief && typeof order.brief.business === 'string' ? order.brief.business : ''
  return b.split(/\s+[—–-]\s+/)[0].trim().slice(0, 120) || 'Studio Ads'
}

async function prepareAndSubmit(admin: SupabaseClient, order: AdsV2OrderRow, leaseToken: string, shots: AdsV2ShotRow[]): Promise<void> {
  const plan = order.plan
  if (!plan || !order.card_url) {
    await failAdsV2Order(admin, order, 'assembly_missing_plan_or_card', '/lib/ads/v2Advance')
    return
  }
  const language = narrationLanguage(order.language) ?? 'en'
  const mood = SECTOR_MOOD[order.sector ?? 'other'] ?? 'emotional'
  // 1. Música: Lyria (instrumental) copiada para o NOSSO bucket; sem Lyria, a trilha Pixabay de sempre.
  let musicUrl = order.music_url
  if (!musicUrl) {
    const lyria = await getLyriaMusicUrl(null, mood)
    musicUrl = lyria ? await persistAudioCopy({ userId: order.user_id, name: `adsv2-${order.id}-music`, sourceUrl: lyria }) : null
    if (!musicUrl) musicUrl = await getBackgroundMusicUrl(order.id, mood).catch(() => null)
    // KINEO-ADS-V2-MUSICA-2026-09-29 — faixa da biblioteca sem 32 s seguidos de música não serve para anúncio:
    // troca por uma aprovada do mesmo clima (lib/ads/v2Music.ts).
    if (musicUrl && !adsV2MusicUsable(musicUrl)) musicUrl = adsV2SwapLibraryTrack(musicUrl, adsV2FallbackTrack(mood, order.id))
    if (musicUrl) await admin.from('ads_v2_orders').update({ music_url: musicUrl }).eq('id', order.id).is('music_url', null)
  }
  // 2. Voz MiniMax (a mesma TTS da casa para MiniMax: synthesizeTtsFallback, fal-ai/minimax/speech-2.8-hd), medida
  //    e enviada ao bucket voiceovers. Telefone/site falados por extenso (speakableForTts), como no v1.
  let voiceUrl = order.voice_url
  let voiceSeconds = num(order.voice_seconds)
  const narration = order.narration && typeof plan.narration === 'string' && plan.narration.trim() ? plan.narration.trim() : null
  if (narration && (!voiceUrl || !voiceSeconds)) {
    const buf = await synthesizeTtsFallback(speakableForTts(narration, language), { userId: order.user_id, generationId: order.generation_id })
    voiceSeconds = Math.round(estimateMp3DurationSeconds(buf) * 1000) / 1000
    voiceUrl = await uploadVoiceoverToSupabase(order.user_id, buf)
    await admin.from('ads_v2_orders').update({ voice_url: voiceUrl, voice_seconds: voiceSeconds }).eq('id', order.id)
  }
  if (!narration) { voiceUrl = null; voiceSeconds = null }
  // 3. Linha do tempo: planos na ordem; o cartão cresce se a voz passar do fim (passar do alvo é bom; cortar, nunca).
  const latest = latestShots(shots)
  const montageShots: AdV2MontageShot[] = latest.map((r) => {
    const base: AdV2MontageShot = {
      url: (r.stored_url ?? '').trim(),
      kind: r.kind,
      cutStart: num(r.cut_start) ?? 0,
      cutSeconds: num(r.cut_seconds) ?? 0,
      measuredSeconds: r.kind === 'text' ? null : num(r.measured_seconds),
    }
    if (r.kind !== 'user_video') return base
    // Vídeo do cliente: o enquadramento (foco e dimensões) mora no plano gravado.
    const p = plan.shots?.find((s) => s.idx === r.idx)
    return { ...base, focusX: p?.focusX ?? 0.5, focusY: p?.focusY ?? 0.5, videoWidth: p?.videoWidth ?? null, videoHeight: p?.videoHeight ?? null }
  })
  const shotsSeconds = montageShots.reduce((s, x) => s + x.cutSeconds, 0)
  let cardSeconds = ADS_V2_CARD_SECONDS
  if (voiceSeconds) {
    const voiceEnd = ADS_V2_VOICE_START + voiceSeconds + 0.2
    cardSeconds = Math.max(cardSeconds, Math.round((voiceEnd - shotsSeconds) * 1000) / 1000)
    if (cardSeconds > ADS_V2_CARD_MAX_SECONDS) {
      await failAdsV2Order(admin, order, `voice_too_long:${voiceSeconds}`, '/lib/ads/v2Advance')
      return
    }
  }
  const out = renderOutputSpecFor('9:16')
  let source: Record<string, unknown>
  try {
    source = buildAdV2Source({
      width: out.width,
      height: out.height,
      shots: montageShots,
      overlays: (plan.overlays ?? []).filter((o) => o && typeof o.text === 'string' && o.text.trim()).map((o) => ({ text: o.text, start: o.start, end: o.end })),
      fontFamily: captionFontFor(language),
      cardUrl: order.card_url,
      cardSeconds,
      musicUrl,
      musicTrimStart: adsV2MusicTrimStart(musicUrl),
      voiceUrl,
      voiceSeconds,
      // KINEO-ADS-3VAR-COR-2026-09-30 — a cor do look na montagem (null fora das 3 variações).
      tint: variationTintOf(order.brief),
    })
  } catch (e) {
    await failAdsV2Order(admin, order, `montage_invalid:${e instanceof Error ? e.message : String(e)}`, '/lib/ads/v2Advance')
    return
  }
  // 4. Carimbo ANTES do POST (só quem ainda segura a trava): com ele e sem id, o envio é ambíguo e nunca se repete.
  const stamp = await admin
    .from('ads_v2_orders')
    .update({ assembly_submit_at: nowIso() })
    .eq('id', order.id)
    .eq('status', 'assembling')
    .eq('assembly_lease_at', leaseToken)
    .is('creatomate_render_id', null)
    .is('assembly_submit_at', null)
    .select('id')
    .maybeSingle()
  if (stamp.error || !stamp.data) return
  let renderId: string
  try {
    renderId = await submitCreatomateRender(source)
  } catch (e) {
    if (e instanceof CreatomateSubmitError && e.ambiguous) {
      console.warn(`[ads-v2] Creatomate ambíguo order=${order.id} — sem reenvio; o prazo decide`)
      return
    }
    await failAdsV2Order(admin, order, `creatomate_rejected:${e instanceof Error ? e.message.slice(0, 160) : String(e)}`, '/lib/ads/v2Advance')
    return
  }
  // 5. O id do render é a PRIMEIRA coisa gravada depois do POST (uma repetição se a escrita falhar).
  const write = () => admin.from('ads_v2_orders').update({ creatomate_render_id: renderId }).eq('id', order.id).is('creatomate_render_id', null).select('id').maybeSingle()
  let w = await write()
  if (w.error) w = await write()
  if (w.error) console.error(`[ads-v2] creatomate_render_id NÃO gravado order=${order.id} render=${renderId}`)
  await writeServerEvent({
    name: 'ads_v2_assembling',
    userId: order.user_id,
    path: '/lib/ads/v2Advance',
    metadata: { order_id: order.id, creatomate_render_id: renderId, shots: montageShots.length, card_seconds: cardSeconds, voice_seconds: voiceSeconds, music: Boolean(musicUrl), total_seconds: Math.round((shotsSeconds + cardSeconds) * 1000) / 1000 },
  })
}

async function pollAssembly(admin: SupabaseClient, order: AdsV2OrderRow): Promise<void> {
  const renderId = order.creatomate_render_id
  if (!renderId || !order.billing_ref) return
  let st
  try {
    st = await pollCreatomateRender(renderId)
  } catch {
    return // consulta falhou: tenta na próxima volta
  }
  if (st.status === 'failed' || st.status === 'cancelled') {
    await failAdsV2Order(admin, order, `creatomate_${st.status}:${(st.error ?? '').slice(0, 120)}`, '/lib/ads/v2Advance')
    return
  }
  if (st.status !== 'succeeded' || !st.url) {
    if (ageMs(order.assembly_submit_at) > ADS_V2_CREATOMATE_MAX_MS) await failAdsV2Order(admin, order, 'creatomate_stuck', '/lib/ads/v2Advance')
    return
  }
  // Cópia para o nosso bucket com a chave de cobrança como render_id (a mesma do videos.render_id).
  const assets = await persistRenderAssets({ userId: order.user_id, renderId: order.billing_ref, videoUrl: st.url, snapshotUrl: st.snapshotUrl, downloadTimeoutMs: 60_000 })
  const business = businessName(order)
  const seconds = assets.measuredSeconds ?? st.durationSeconds ?? (order.plan?.totalSeconds ?? order.seconds)
  const row = {
    user_id: order.user_id,
    status: 'completed',
    video_url: assets.videoUrl,
    thumbnail_url: assets.thumbnailUrl ?? null,
    render_id: order.billing_ref,
    topic: `${business} · Studio Ads`.slice(0, 200),
    title: business,
    platform: 'Studio Ads',
    duration: Math.round(Number(seconds) || order.seconds),
    quality_mode: ADS_V2_QUALITY,
    credits_used: order.credits_charged,
    ...(order.plan?.narration ? { script: order.plan.narration } : {}),
  }
  // REVISÃO 28/09 (dinheiro): o id do vídeo é RESERVADO no pedido ANTES da linha em videos. failAdsV2Order (prazo do
  // pedido, Creatomate preso) e a varredura exigem video_id nulo — com a reserva, ninguém estorna o filme que está
  // entrando na biblioteca do cliente. Linha em videos que não entra: a reserva é SOLTA (o prazo volta a decidir).
  let reserved = order.video_id
  if (!reserved) {
    const fresh = randomUUID()
    const claim = await admin.from('ads_v2_orders').update({ video_id: fresh }).eq('id', order.id).eq('status', 'assembling').is('video_id', null).select('id').maybeSingle()
    if (claim.error || !claim.data) return
    reserved = fresh
  }
  let videoId: string | null = null
  const ins = await admin.from('videos').insert({ id: reserved, ...row }).select('id').maybeSingle()
  if (!ins.error && ins.data) videoId = String((ins.data as { id: string }).id)
  else if ((ins.error as { code?: string } | null)?.code === '23505') {
    const ex = await admin.from('videos').select('id').eq('render_id', order.billing_ref).eq('user_id', order.user_id).maybeSingle()
    videoId = ex.data ? String((ex.data as { id: string }).id) : null
  }
  if (!videoId) {
    console.error(`[ads-v2] insert em videos falhou order=${order.id}:`, ins.error?.message)
    await admin.from('ads_v2_orders').update({ video_id: null }).eq('id', order.id).eq('status', 'assembling').eq('video_id', reserved)
    return
  }
  const won = await admin
    .from('ads_v2_orders')
    .update({ status: 'delivered', video_id: videoId, delivered_at: nowIso(), error: null })
    .eq('id', order.id)
    .eq('status', 'assembling')
    .eq('video_id', reserved)
    .select('id')
    .maybeSingle()
  if (!won.error && won.data) {
    await writeServerEvent({
      name: 'ads_v2_delivered',
      userId: order.user_id,
      path: '/lib/ads/v2Advance',
      metadata: {
        order_id: order.id,
        video_id: videoId,
        billing_ref: order.billing_ref,
        tier: order.tier,
        seconds: order.seconds,
        credits: order.credits_charged,
        measured_seconds: assets.measuredSeconds,
        copied: assets.videoUrl !== st.url,
        retake: Boolean(order.parent_order_id),
        minutes: Math.round(ageMs(order.started_at) / 6000) / 10,
      },
    })
  }
}

async function stepAssembly(admin: SupabaseClient, order: AdsV2OrderRow, justClaimedToken: string | null, shots: AdsV2ShotRow[]): Promise<void> {
  if (order.creatomate_render_id) return pollAssembly(admin, order)
  if (order.assembly_submit_at) {
    // POST ao Creatomate sem id gravado: AMBÍGUO. Nunca reenviar; passado o prazo, falha com estorno.
    if (ageMs(order.assembly_submit_at) > ADS_V2_CREATOMATE_AMBIGUOUS_MS) await failAdsV2Order(admin, order, 'creatomate_submit_ambiguous', '/lib/ads/v2Advance')
    return
  }
  let token = justClaimedToken
  if (!token) {
    // Trava de preparo vencida (a lambda anterior morreu antes do carimbo): retoma com UPDATE condicional.
    if (order.assembly_lease_at && ageMs(order.assembly_lease_at) < ADS_V2_ASSEMBLY_LEASE_MS) return
    const fresh = nowIso()
    let q = admin.from('ads_v2_orders').update({ assembly_lease_at: fresh }).eq('id', order.id).eq('status', 'assembling').is('creatomate_render_id', null).is('assembly_submit_at', null)
    q = order.assembly_lease_at ? q.eq('assembly_lease_at', order.assembly_lease_at) : q.is('assembly_lease_at', null)
    const r = await q.select('id').maybeSingle()
    if (r.error || !r.data) return
    token = fresh
  }
  try {
    await prepareAndSubmit(admin, order, token, shots)
  } catch (e) {
    // Voz/música falharam (ex.: saldo da fal): a próxima volta retoma depois da trava; o prazo do pedido decide.
    console.warn(`[ads-v2] preparo da montagem falhou order=${order.id}:`, e instanceof Error ? e.message : String(e))
  }
}

// ── avanço do pedido ──────────────────────────────────────────────────────────────────────────────────────────────
export interface AdsV2ShotView {
  idx: number
  kind: string
  source: string
  attempt: number
  state: 'ready' | 'working' | 'failed'
  status: string
  url: string | null
  retake_credits: number
}
export interface AdsV2OrderView {
  order_id: string
  status: AdsV2OrderRow['status']
  tier: AdsV2Tier
  seconds: number
  credits: number
  video_id: string | null
  error: string | null
  parent_order_id: string | null
  shots: AdsV2ShotView[]
}

export function adsV2View(order: AdsV2OrderRow, shots: readonly AdsV2ShotRow[]): AdsV2OrderView {
  return {
    order_id: order.id,
    status: order.status,
    tier: order.tier,
    seconds: order.seconds,
    credits: order.credits_charged,
    video_id: order.video_id,
    error: order.status === 'failed' ? (order.error ?? 'failed') : null,
    parent_order_id: order.parent_order_id,
    shots: latestShots(shots).map((r) => ({
      idx: r.idx,
      kind: r.kind,
      source: r.source,
      attempt: r.attempt,
      state: READY.has(r.status) ? 'ready' : r.status === 'failed' || r.status === 'stuck' ? 'failed' : 'working',
      status: r.status,
      url: READY.has(r.status) ? r.stored_url : null,
      retake_credits: r.kind === 'text' || r.kind === 'user_video' ? 0 : adsV2RetakeCredits(r.kind, order.tier),
    })),
  }
}

/**
 * Um passo do pedido. Idempotente e seguro em paralelo (tela + cron). Nunca lança; devolve a vista do pedido.
 * `deadlineMs` limita os envios novos (o chamador tem teto de função).
 */
export async function advanceAdsV2Order(admin: SupabaseClient, orderId: string, opts: { deadlineMs: number }): Promise<AdsV2OrderView | null> {
  try {
    let { order } = await loadAdsV2Order(admin, orderId)
    if (!order) return null
    if (order.status === 'generating' || order.status === 'assembling') {
      if (ageMs(order.started_at) > ADS_V2_ORDER_MAX_MS && !order.video_id) {
        await failAdsV2Order(admin, order, 'order_timeout', '/lib/ads/v2Advance')
      } else if (order.status === 'generating') {
        await stepGenerating(admin, order, opts.deadlineMs)
      } else {
        const shots = (await loadAdsV2Shots(admin, order.id)) ?? []
        await stepAssembly(admin, order, null, shots)
      }
    }
    order = (await loadAdsV2Order(admin, orderId)).order
    if (!order) return null
    const shots = (await loadAdsV2Shots(admin, order.id)) ?? []
    return adsV2View(order, shots)
  } catch (e) {
    console.warn(`[ads-v2] avanço falhou order=${orderId}:`, e instanceof Error ? e.message : String(e))
    const { order } = await loadAdsV2Order(admin, orderId).catch(() => ({ order: null }))
    if (!order) return null
    return adsV2View(order, (await loadAdsV2Shots(admin, order.id).catch(() => null)) ?? [])
  }
}

async function stepGenerating(admin: SupabaseClient, order: AdsV2OrderRow, deadlineMs: number): Promise<void> {
  let rows = await loadAdsV2Shots(admin, order.id)
  if (!rows) return
  // Linhas que faltam (o /start caiu entre o débito e o insert): recria pelo plano gravado, sem duplicar.
  const planned = order.plan?.shots ?? []
  const have = new Set(rows.map((r) => r.idx))
  const missing = planned.filter((s) => !have.has(s.idx))
  if (missing.length > 0) {
    const young = ageMs(order.started_at) < ADS_V2_ROWS_GRACE_MS
    if (order.parent_order_id) {
      // Refação: as linhas são CÓPIAS do pai + 1 plano refeito. Recriar pelo plano mandaria o anúncio INTEIRO à fal.
      if (!young) await failAdsV2Order(admin, order, 'retake_rows_missing', '/lib/ads/v2Advance')
      return
    }
    const debit = order.billing_ref
      ? await confirmAdsV2Debit(admin, { userId: order.user_id, billingRef: order.billing_ref, cost: order.credits_charged })
      : ({ ok: false, reason: 'missing' } as const)
    if (!debit.ok || debit.refunded) {
      if (!young) await failAdsV2Order(admin, order, 'rows_missing_debit_unconfirmed', '/lib/ads/v2Advance')
      return
    }
    await admin.from('ads_v2_shots').upsert(buildInitialShotRows(order.id, order.tier, { shots: missing }), { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
    rows = (await loadAdsV2Shots(admin, order.id)) ?? rows
  }
  // 1. Consulta/copia/marca cada plano em andamento (em lotes, para não estourar o prazo).
  const active = latestShots(rows).filter((r) => !READY.has(r.status) && r.status !== 'failed' && r.status !== 'stuck')
  for (let i = 0; i < active.length; i += ADS_V2_BATCH_SIZE) {
    await Promise.all(active.slice(i, i + ADS_V2_BATCH_SIZE).map((r) => pollOne(admin, order, r).catch((e) => console.warn('[ads-v2] poll falhou:', e instanceof Error ? e.message : String(e)))))
  }
  // 2. Falhas: nova tentativa sem cobrar, ou falha terminal do pedido (estorno pelo vencedor).
  rows = (await loadAdsV2Shots(admin, order.id)) ?? rows
  for (const r of latestShots(rows).filter((x) => x.status === 'failed' || x.status === 'stuck')) {
    const terminal = await retryOrTerminal(admin, order, r)
    if (terminal) {
      await failAdsV2Order(admin, order, terminal, '/lib/ads/v2Advance')
      return
    }
  }
  // 3. Envia o que ficou pronto para sair (imagens das cenas antes do vídeo).
  await dispatchAdsV2Shots(admin, order, deadlineMs)
  // 4. Todos prontos → montagem (só um vence o generating→assembling).
  rows = (await loadAdsV2Shots(admin, order.id)) ?? rows
  const latest = latestShots(rows)
  if (latest.length === 0 || latest.length < planned.length || !latest.every((r) => READY.has(r.status))) return
  const token = nowIso()
  const claim = await admin
    .from('ads_v2_orders')
    .update({ status: 'assembling', assembly_lease_at: token })
    .eq('id', order.id)
    .eq('status', 'generating')
    .select(ADS_V2_ORDER_COLS)
    .maybeSingle()
  if (claim.error || !claim.data) return
  await stepAssembly(admin, claim.data as AdsV2OrderRow, token, rows)
}
