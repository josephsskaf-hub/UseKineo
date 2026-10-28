// KINEO-ADS-POS-ENTREGA-1510 — o lado servidor das ferramentas depois da entrega (lib/ads/v2PostDelivery.ts tem o porquê).
//
// Fluxo de uma VERSÃO (edição ou formato), espelho do fluxo da montagem da entrega (lib/ads/v2Advance.ts), SEM tocar nele:
//   pedido entregue + linhas prontas ──editBaseFromOrder──▶ (os MESMOS clipes do bucket) ──adsV2EditMontageInput + buildAdV2Source──▶
//   INSERT ads_v2_versions (status 'rendering', submit_at = carimbo ANTES do POST) ──▶ submitCreatomateRender ──▶ grava o id ──▶
//   (tela) advanceAdsV2Versions: poll ──▶ persistRenderAssets (bucket renders, render_id 'adsv2edit-<versão>') ──▶ INSERT videos
//   (credits_used 0: a biblioteca guarda TODAS as versões) ──▶ UPDATE condicional rendering → delivered.
// NADA aqui chama a fal, sintetiza voz, debita ou estorna crédito. POST sem id = ambíguo: nunca reenviado; o prazo marca falha.
// Aprovação: cópia do MP4 para renders/share/<aleatório>.mp4 (o caminho original carrega o id da conta), token assinado
// (lib/ads/v2ApprovalToken.ts), decisão por UPDATE condicional pending → approved | changes_requested (uma decisão por link).
import { randomBytes, randomUUID } from 'node:crypto'
import { cenaApplyCaptions } from '@/lib/ads/v2CenaQuality' // KINEO-ADS-CENA-2110
import { adsV2BusinessName } from '@/lib/ads/v2BolaFix' // KINEO-ADS-BOLA-2110 — o nome das versões sem travessão solto
import type { SupabaseClient } from '@supabase/supabase-js'
import { CreatomateSubmitError, pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { persistRenderAssets } from '@/lib/renderAssets'
import { renderOutputSpecFor } from '@/lib/renderProfile'
import { captionFontFor } from '@/lib/textLanguage'
import { writeServerEvent } from '@/lib/serverEvents'
import { buildAdV2Source, adsV2ProductOverlays, type AdV2MontageShot } from '@/lib/ads/adV2Montage'
import { adsV2IsPackshot, adsV2PlanFormat, isAdsV2PlanStyle, type AdsV2Format } from '@/lib/ads/v2ShotLists'
import { adsV2IsPresenterHolds } from '@/lib/ads/v2PresenterHolds'
import { adsV2PresenterInsertOrder } from '@/lib/ads/v2Presenter'
import { variationTintOf } from '@/lib/ads/v2Variations'
import { isAdsV2PlanShotRow, isAdsV2PresenterRow, latestShots, type AdsV2OrderRow, type AdsV2ShotRow } from '@/lib/ads/v2Advance'
import { mintApprovalToken, verifyApprovalToken } from '@/lib/ads/v2ApprovalToken'
import {
  ADS_V2_APPROVAL_DAYS,
  ADS_V2_EDIT_AMBIGUOUS_MS,
  ADS_V2_EDIT_CREDITS,
  ADS_V2_EDIT_RENDER_MAX_MS,
  ADS_V2_EDIT_RENDER_PREFIX,
  adsV2ApprovalPublicView,
  adsV2EditMontageInput,
  adsV2EditWithoutPresenter,
  adsV2EditUsd,
  adsV2RendersPath,
  type AdsV2ApprovalPublic,
  type AdsV2EditBase,
  type AdsV2EditClip,
  type AdsV2EditResolved,
} from '@/lib/ads/v2PostDelivery'
import { posErr } from '@/lib/ads/v2PostDelivery'
import { adsV2ScriptSafeFonts } from '@/lib/ads/v2FonteTexto' // KINEO-ADS-FONTE-LINK-2810 — a fonte segue a escrita de CADA texto (cartão, botão e marca-d'água latinos num pedido em hindi/árabe saíam □□□□)

export const ADS_V2_VERSION_COLS = 'id, order_id, user_id, version, kind, format, base_version_id, batch_id, edits, status, credits_charged, creatomate_render_id, submit_at, video_id, video_url, error, created_at, updated_at, delivered_at, failed_at'
export const ADS_V2_APPROVAL_COLS = 'id, order_id, user_id, version_id, video_id, brand_name, lang, status, comment, created_at, decided_at, viewed_at, revoked_at, expires_at'

export interface AdsV2VersionRow {
  id: string
  order_id: string
  user_id: string
  version: number
  kind: 'edit' | 'format'
  format: AdsV2Format
  base_version_id: string | null
  batch_id: string | null
  edits: Partial<AdsV2EditResolved> | null
  status: 'rendering' | 'delivered' | 'failed'
  credits_charged: number
  creatomate_render_id: string | null
  submit_at: string | null
  video_id: string | null
  video_url: string | null
  error: string | null
  created_at: string
  updated_at: string
  delivered_at: string | null
  failed_at: string | null
}

const READY = new Set(['done', 'skipped_text'])
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
const ageMs = (iso: string | null | undefined): number => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? Date.now() - t : 0
}
const nowIso = () => new Date().toISOString()
export const isMissingPosEntregaTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

/**
 * A montagem ENTREGUE, reconstruída das linhas do pedido (o mesmo mapa da entrega em lib/ads/v2Advance.ts prepareAndSubmit):
 * cada plano com a MESMA URL do bucket e o MESMO trecho; frases do plano; cartão, música e voz gravados no pedido; o ator pronto.
 */
export function editBaseFromOrder(order: AdsV2OrderRow, shots: readonly AdsV2ShotRow[]): { ok: true; base: AdsV2EditBase } | { ok: false; error: string } {
  const plan = order.plan
  if (order.status !== 'delivered' || !order.video_id) return { ok: false, error: 'not_delivered' }
  if (!plan || !order.card_url) return { ok: false, error: 'no_plan' }
  const latest = latestShots([...shots]).filter(isAdsV2PlanShotRow)
  if (latest.length === 0 || latest.some((r) => !READY.has(r.status) || !r.stored_url)) return { ok: false, error: 'shots_not_ready' }
  const clips: AdsV2EditClip[] = latest.map((r) => {
    const base: AdV2MontageShot = {
      url: (r.stored_url ?? '').trim(),
      kind: r.kind,
      cutStart: num(r.cut_start) ?? 0,
      cutSeconds: num(r.cut_seconds) ?? 0,
      measuredSeconds: r.kind === 'text' ? null : num(r.measured_seconds),
    }
    const p = plan.shots?.find((s) => s.idx === r.idx)
    let shot = base
    if (r.kind === 'text' && adsV2IsPackshot(plan, r.idx)) shot = { ...base, packshot: true }
    else if (r.kind === 'user_video') shot = { ...base, focusX: p?.focusX ?? 0.5, focusY: p?.focusY ?? 0.5, videoWidth: p?.videoWidth ?? null, videoHeight: p?.videoHeight ?? null }
    return { idx: r.idx, shot, nineOnly: r.kind !== 'text' && r.kind !== 'user_video' && isAdsV2PlanStyle(p?.effect) }
  })
  const narration = order.narration && typeof plan.narration === 'string' && plan.narration.trim() ? plan.narration.trim() : null
  const voiceSeconds = num(order.voice_seconds)
  const presenterRow = latestShots([...shots]).find(isAdsV2PresenterRow) ?? null
  const presenterSeconds = presenterRow ? num(presenterRow.measured_seconds) : null
  const presenter = presenterRow && presenterRow.status === 'done' && presenterRow.stored_url && presenterSeconds
    ? {
        url: presenterRow.stored_url,
        measuredSeconds: presenterSeconds,
        insertIdx: adsV2PresenterInsertOrder(latest.map((r) => ({ idx: r.idx, kind: r.kind as string, source: r.source as string, effect: plan.shots?.find((s) => s.idx === r.idx)?.effect, ...(r.kind === 'text' && adsV2IsPackshot(plan, r.idx) ? { packshot: true } : {}), ...(adsV2IsPresenterHolds(plan, r.idx) ? { presenterHolds: true } : {}) }))),
      }
    : null
  return {
    ok: true,
    base: {
      format: adsV2PlanFormat(plan),
      clips,
      overlays: (plan.overlays ?? []).filter((o) => o && typeof o.text === 'string' && o.text.trim()).map((o) => ({ text: o.text, start: o.start, end: o.end })),
      cardUrl: order.card_url,
      musicUrl: order.music_url,
      voiceUrl: narration && order.voice_url && voiceSeconds ? order.voice_url : null,
      voiceSeconds: narration && order.voice_url && voiceSeconds ? voiceSeconds : null,
      tint: variationTintOf(order.brief) ?? null,
      overlayPlacement: adsV2ProductOverlays(order.photos) ? 'lower_third' : null,
      presenter,
    },
  }
}

/** O source do Creatomate da versão. Montagem com ator que não passa = o anúncio de sempre (a regra da entrega). */
export function buildVersionSource(base: AdsV2EditBase, edit: AdsV2EditResolved, format: AdsV2Format, language: string | null): Record<string, unknown> {
  const frame = renderOutputSpecFor(format)
  const f = { width: frame.width, height: frame.height, fontFamily: captionFontFor(language), format }
  const captioned = (source: Record<string, unknown>) => cenaApplyCaptions({ source, text: null, seconds: null, legacyTextTrack: 4, fontFamily: f.fontFamily }) // KINEO-ADS-CENA-2110 — edited copy and its windows survive export; captions match Studio Ads.
  if (base.presenter) {
    try {
      return captioned(buildAdV2Source(adsV2EditMontageInput(base, edit, f))) // KINEO-ADS-CENA-2110
    } catch (e) {
      const m = posErr(e)
      if (m.startsWith('ads_v2_edit_')) throw e
    }
    return captioned(buildAdV2Source(adsV2EditMontageInput(adsV2EditWithoutPresenter(base), edit, f))) // KINEO-ADS-CENA-2110
  }
  return captioned(buildAdV2Source(adsV2EditMontageInput(base, edit, f))) // KINEO-ADS-CENA-2110
}

export async function loadAdsV2Versions(admin: SupabaseClient, orderId: string, userId: string): Promise<{ rows: AdsV2VersionRow[]; error: { code?: string } | null }> {
  const { data, error } = await admin.from('ads_v2_versions').select(ADS_V2_VERSION_COLS).eq('order_id', orderId).eq('user_id', userId).order('version', { ascending: true })
  return { rows: (data ?? []) as AdsV2VersionRow[], error: error ? { code: error.code } : null }
}

/** Montagens em andamento na conta (teto de concorrência). null = leitura falhou. */
export async function countRenderingVersions(admin: SupabaseClient, userId: string): Promise<number | null> {
  const { count, error } = await admin.from('ads_v2_versions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'rendering')
  return error ? null : count ?? 0
}

/**
 * Uma versão nova: grava a linha (com o carimbo do envio) ANTES do POST ao Creatomate, manda e grava o id. Lança
 * 'version_insert_failed' se a linha não entra; 'creatomate_rejected' se o Creatomate recusa (a linha fica 'failed').
 */
export async function submitAdsV2Version(
  admin: SupabaseClient,
  args: { order: AdsV2OrderRow; userId: string; kind: 'edit' | 'format'; format: AdsV2Format; edit: AdsV2EditResolved; source: Record<string, unknown>; baseVersionId: string | null; batchId: string | null },
): Promise<AdsV2VersionRow> {
  let row: AdsV2VersionRow | null = null
  for (let tries = 0; tries < 3 && !row; tries++) {
    const top = await admin.from('ads_v2_versions').select('version').eq('order_id', args.order.id).order('version', { ascending: false }).limit(1).maybeSingle()
    if (top.error) throw new Error(`version_read_failed:${top.error.code ?? ''}`)
    const next = Math.max(1, Number((top.data as { version?: number } | null)?.version ?? 1)) + 1
    const ins = await admin
      .from('ads_v2_versions')
      .insert({
        order_id: args.order.id,
        user_id: args.userId,
        version: next,
        kind: args.kind,
        format: args.format,
        base_version_id: args.baseVersionId,
        batch_id: args.batchId,
        edits: args.edit,
        status: 'rendering',
        credits_charged: ADS_V2_EDIT_CREDITS,
        submit_at: nowIso(),
      })
      .select(ADS_V2_VERSION_COLS)
      .maybeSingle()
    if (!ins.error && ins.data) row = ins.data as AdsV2VersionRow
    else if ((ins.error as { code?: string } | null)?.code !== '23505') throw new Error(`version_insert_failed:${ins.error?.code ?? ''}`)
  }
  if (!row) throw new Error('version_insert_failed:conflict')
  let renderId: string
  try {
    renderId = await submitCreatomateRender(adsV2ScriptSafeFonts(args.source)) // KINEO-ADS-FONTE-LINK-2810
  } catch (e) {
    if (e instanceof CreatomateSubmitError && e.ambiguous) return row // sem reenvio: o prazo decide (advanceAdsV2Versions)
    const msg = `creatomate_rejected:${posErr(e).slice(0, 160)}`
    await admin.from('ads_v2_versions').update({ status: 'failed', error: msg, failed_at: nowIso() }).eq('id', row.id).eq('status', 'rendering')
    throw new Error('creatomate_rejected')
  }
  const write = () => admin.from('ads_v2_versions').update({ creatomate_render_id: renderId }).eq('id', row!.id).is('creatomate_render_id', null).select('id').maybeSingle()
  let w = await write()
  if (w.error) w = await write()
  if (w.error) console.error(`[ads-v2-edit] creatomate_render_id NÃO gravado version=${row.id} render=${renderId}`)
  const seconds = Number(args.source.duration) || 0
  await writeServerEvent({
    name: args.kind === 'edit' ? 'ads_v2_edit_started' : 'ads_v2_format_started',
    userId: args.userId,
    path: '/lib/ads/v2PostDeliveryServer',
    metadata: { order_id: args.order.id, version_id: row.id, version: row.version, format: args.format, creatomate_render_id: renderId, seconds, credits: ADS_V2_EDIT_CREDITS, usd_estimate: adsV2EditUsd(seconds, Number(args.source.width), Number(args.source.height)), fal: false, edits: { overlays: args.edit.overlays !== null, card: args.edit.cardUrl !== null, music: args.edit.music, order: args.edit.order } },
  })
  return { ...row, creatomate_render_id: renderId }
}

function businessName(order: Pick<AdsV2OrderRow, 'brief'>): string {
  const b = order.brief && typeof order.brief.business === 'string' ? order.brief.business : ''
  return adsV2BusinessName(b).slice(0, 120) || 'Studio Ads' // KINEO-ADS-BOLA-2110 — a MESMA limpeza do título da Biblioteca (v2Advance businessName)
}

/** Um passo das versões em andamento do pedido (tela). Nunca lança. Até `max` consultas ao Creatomate por chamada. */
export async function advanceAdsV2Versions(admin: SupabaseClient, order: AdsV2OrderRow, userId: string, max = 4): Promise<void> {
  const { rows } = await loadAdsV2Versions(admin, order.id, userId)
  let budget = max
  for (const v of rows.filter((r) => r.status === 'rendering')) {
    try {
      if (!v.creatomate_render_id) {
        if (ageMs(v.submit_at ?? v.created_at) > ADS_V2_EDIT_AMBIGUOUS_MS) await failVersion(admin, v, 'creatomate_submit_ambiguous')
        continue
      }
      if (budget-- <= 0) break
      const st = await pollCreatomateRender(v.creatomate_render_id).catch(() => null)
      if (!st) continue
      if (st.status === 'failed' || st.status === 'cancelled') { await failVersion(admin, v, `creatomate_${st.status}:${(st.error ?? '').slice(0, 120)}`); continue }
      if (st.status !== 'succeeded' || !st.url) {
        if (ageMs(v.submit_at ?? v.created_at) > ADS_V2_EDIT_RENDER_MAX_MS) await failVersion(admin, v, 'creatomate_stuck')
        continue
      }
      const renderKey = `${ADS_V2_EDIT_RENDER_PREFIX}${v.id}`
      const assets = await persistRenderAssets({ userId, renderId: renderKey, videoUrl: st.url, snapshotUrl: st.snapshotUrl, downloadTimeoutMs: 45_000 })
      const business = businessName(order)
      const label = `${business} · v${v.version}${v.format !== '9:16' ? ` (${v.format})` : ''}`
      const fresh = randomUUID()
      const ins = await admin.from('videos').insert({
        id: fresh,
        user_id: userId,
        status: 'completed',
        video_url: assets.videoUrl,
        thumbnail_url: assets.thumbnailUrl ?? null,
        render_id: renderKey,
        topic: `${label} · Studio Ads`.slice(0, 200),
        title: label.slice(0, 200),
        platform: 'Studio Ads',
        duration: Math.round(Number(assets.measuredSeconds ?? st.durationSeconds ?? order.seconds) || order.seconds),
        quality_mode: 'ads_v2',
        credits_used: ADS_V2_EDIT_CREDITS,
        ...(order.plan?.narration ? { script: order.plan.narration } : {}),
      }).select('id').maybeSingle()
      let videoId: string | null = !ins.error && ins.data ? String((ins.data as { id: string }).id) : null
      if (!videoId && (ins.error as { code?: string } | null)?.code === '23505') {
        const ex = await admin.from('videos').select('id').eq('render_id', renderKey).eq('user_id', userId).maybeSingle()
        videoId = ex.data ? String((ex.data as { id: string }).id) : null
      }
      if (!videoId) continue // a linha não entrou: a próxima volta tenta de novo (a cópia do bucket é idempotente)
      const won = await admin.from('ads_v2_versions').update({ status: 'delivered', video_id: videoId, video_url: assets.videoUrl, delivered_at: nowIso(), error: null }).eq('id', v.id).eq('status', 'rendering').select('id').maybeSingle()
      if (!won.error && won.data) {
        await writeServerEvent({ name: v.kind === 'edit' ? 'ads_v2_edit_delivered' : 'ads_v2_format_delivered', userId, path: '/lib/ads/v2PostDeliveryServer', metadata: { order_id: order.id, version_id: v.id, version: v.version, format: v.format, video_id: videoId, measured_seconds: assets.measuredSeconds, minutes: Math.round(ageMs(v.created_at) / 6000) / 10 } })
      }
    } catch (e) {
      console.warn(`[ads-v2-edit] versão ${v.id} falhou no avanço:`, posErr(e))
    }
  }
}

async function failVersion(admin: SupabaseClient, v: AdsV2VersionRow, reason: string): Promise<void> {
  const r = await admin.from('ads_v2_versions').update({ status: 'failed', error: reason.slice(0, 200), failed_at: nowIso() }).eq('id', v.id).eq('status', 'rendering').select('id').maybeSingle()
  if (!r.error && r.data) await writeServerEvent({ name: 'ads_v2_edit_failed', userId: v.user_id, path: '/lib/ads/v2PostDeliveryServer', metadata: { order_id: v.order_id, version_id: v.id, kind: v.kind, format: v.format, reason: reason.slice(0, 120), credits: 0 } })
}

/** A vista de uma versão para a tela (sem dado de outra conta). */
export function adsV2VersionView(v: AdsV2VersionRow) {
  return { id: v.id, version: v.version, kind: v.kind, format: v.format, status: v.status, video_id: v.video_id, video_url: v.status === 'delivered' ? v.video_url : null, error: v.status === 'failed' ? (v.error ?? 'failed') : null, batch_id: v.batch_id, created_at: v.created_at, credits: v.credits_charged }
}

// ── aprovação ────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Link novo de aprovação para UM vídeo da conta (o entregue ou uma versão). O MP4 é copiado para renders/share/<aleatório>.mp4:
 * o caminho de sempre carrega o id da conta. Devolve o token UMA vez (o banco guarda só o hash).
 */
export async function createAdsV2Approval(
  admin: SupabaseClient,
  args: { userId: string; order: AdsV2OrderRow; versionId: string | null; videoId: string; videoUrl: string; brand: string; lang: string; secret: string },
): Promise<{ token: string; id: string; expires_at: string }> {
  const path = adsV2RendersPath(args.videoUrl)
  if (!path) throw new Error('share_video_not_in_bucket')
  const dest = `share/${randomBytes(18).toString('base64url')}.mp4`
  const cp = await admin.storage.from('renders').copy(path, dest)
  if (cp.error) throw new Error(`share_copy_failed:${cp.error.message.slice(0, 80)}`)
  const mark = '/storage/v1/object/public/renders/'
  const shareUrl = args.videoUrl.slice(0, args.videoUrl.indexOf(mark) + mark.length) + dest
  const { token, hash } = mintApprovalToken(args.secret)
  const expires = new Date(Date.now() + ADS_V2_APPROVAL_DAYS * 86_400_000).toISOString()
  const ins = await admin
    .from('ads_v2_approvals')
    .insert({ order_id: args.order.id, user_id: args.userId, version_id: args.versionId, video_id: args.videoId, token_hash: hash, share_video_url: shareUrl, brand_name: args.brand, lang: args.lang, status: 'pending', expires_at: expires })
    .select('id, expires_at')
    .maybeSingle()
  if (ins.error || !ins.data) {
    await admin.storage.from('renders').remove([dest]).catch(() => null)
    throw new Error(`approval_insert_failed:${ins.error?.code ?? ''}`)
  }
  const row = ins.data as { id: string; expires_at: string }
  await writeServerEvent({ name: 'ads_v2_approval_shared', userId: args.userId, path: '/lib/ads/v2PostDeliveryServer', metadata: { order_id: args.order.id, approval_id: row.id, version_id: args.versionId, video_id: args.videoId, lang: args.lang } })
  return { token, id: row.id, expires_at: row.expires_at }
}

interface ApprovalRowFull {
  id: string
  order_id: string
  user_id: string
  brand_name: string
  share_video_url: string
  status: string
  lang: string | null
  expires_at: string
  revoked_at: string | null
  viewed_at: string | null
}

/** A aprovação do token (assinatura → hash → linha), vencida/revogada = null. */
export async function loadApprovalByToken(admin: SupabaseClient, token: unknown, secret: string): Promise<ApprovalRowFull | null> {
  const v = verifyApprovalToken(token, secret)
  if (!v.ok) return null
  const { data, error } = await admin.from('ads_v2_approvals').select('id, order_id, user_id, brand_name, share_video_url, status, lang, expires_at, revoked_at, viewed_at').eq('token_hash', v.hash).maybeSingle()
  if (error || !data) return null
  const row = data as ApprovalRowFull
  if (row.revoked_at || row.status === 'revoked' || Date.parse(row.expires_at) <= Date.now()) return null
  return row
}

/** Vista pública da página (só vídeo, marca, estado e língua) e o 1º "visto" (UPDATE condicional, um evento só). */
export async function openApproval(admin: SupabaseClient, token: unknown, secret: string): Promise<AdsV2ApprovalPublic | null> {
  const row = await loadApprovalByToken(admin, token, secret)
  if (!row) return null
  if (!row.viewed_at) {
    const r = await admin.from('ads_v2_approvals').update({ viewed_at: nowIso() }).eq('id', row.id).is('viewed_at', null).select('id').maybeSingle()
    if (!r.error && r.data) await writeServerEvent({ name: 'ads_v2_approval_viewed', userId: row.user_id, path: '/approve', metadata: { approval_id: row.id, order_id: row.order_id } })
  }
  return adsV2ApprovalPublicView(row)
}

/** A decisão do cliente: só de 'pending', uma vez. */
export async function decideApproval(admin: SupabaseClient, args: { token: string; decision: 'approve' | 'changes'; comment: string | null; secret: string }): Promise<{ ok: true; status: 'approved' | 'changes_requested' } | { ok: false; error: 'not_found' | 'already_decided' | 'write_failed' }> {
  const row = await loadApprovalByToken(admin, args.token, args.secret)
  if (!row) return { ok: false, error: 'not_found' }
  if (row.status !== 'pending') return { ok: false, error: 'already_decided' }
  const status = args.decision === 'approve' ? 'approved' : 'changes_requested'
  const r = await admin.from('ads_v2_approvals').update({ status, comment: args.comment, decided_at: nowIso() }).eq('id', row.id).eq('status', 'pending').select('id').maybeSingle()
  if (r.error) return { ok: false, error: 'write_failed' }
  if (!r.data) return { ok: false, error: 'already_decided' }
  await writeServerEvent({ name: 'ads_v2_approval_decided', userId: row.user_id, path: '/api/ads/v2/approval/decide', metadata: { approval_id: row.id, order_id: row.order_id, status, has_comment: Boolean(args.comment) } })
  return { ok: true, status }
}
