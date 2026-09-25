'use client'

// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — o assistente do Studio Ads: a empresa faz o próprio anúncio sozinha
// (fundador 24/09 à noite: sobe fotos, vídeos e logo, ganha a narração e baixa o anúncio pronto, sem trabalho manual).
//
// ESTADO NO SERVIDOR (ads_orders), nunca no navegador: a página sobrevive a recarregar em qualquer passo. O passo
// atual é DERIVADO do pedido (brief → mídia+consentimento → modelo → roteiro → voz → storyboard). Só o storyboard e o
// id do cartão final moram no componente (o PATCH do pedido não os aceita; vão direto no corpo do render).
// Preço e créditos só de lib/ads/offer.ts; vozes, limites e mensagens de erro de lib/ads/renderContract.ts.
// Eventos de cliente: só os da lista fechada (lib/ads/events.ts). ads_brief_saved / ads_template_selected /
// ads_consent_given são gravados pelo servidor — nunca daqui.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { ADS_WIZARD_THEME_CSS } from './adsWizardTheme'
import { trackEvent } from '@/lib/analytics'
import { downloadVideoFile } from '@/lib/videoDownload'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import { adsModelById, adsModelMissingInputs, ADS_MODELS, type AdsModel, type AdsModelId } from '@/lib/ads/models'
import type { AdsBrief, AdsMediaItem, AdsOrder } from '@/lib/ads/types'
import type { AdsScriptVersion } from '@/lib/ads/scriptPrompt'
import { ADS_PASS_CREDITS, adsPassLive, adsPassPriceLabel } from '@/lib/ads/offer'
import {
  ADS_BEAT_MAX_CHARS,
  ADS_DEFAULT_VOICE,
  ADS_MAX_MEDIA_PER_BEAT,
  ADS_RENDER_ERROR_MESSAGES,
  ADS_VOICE_PREVIEW_MAX_CHARS,
  ADS_VOICES,
  adsRenderErrorMessage,
  adsRenderWordRange,
  countWords,
  isAdsVoice,
  type AdsRenderRequest,
  type AdsRenderStarted,
  type AdsRenderState,
  type AdsVoiceId,
} from '@/lib/ads/renderContract'
import { ADS_UPLOAD_ACCEPT_LOGO, ADS_UPLOAD_ACCEPT_MEDIA, AdsUploadError, uploadFootage } from '@/lib/ads/uploadFootage'
import { drawEndCard, endCardCtaLabel, fitCardToFormat, loadLogoImage, toPngFile } from '@/lib/ads/endCard'
import { AD_CAPTION_STYLES, AD_FORMATS, AD_MUSIC_MOODS, adFormatSize, type AdCaptionStyle, type AdFormat, type AdMusicMood } from '@/lib/ads/adStyle' // KINEO-ADS-ESTILO-2026-09-26
import { ADS_AUTO_MIN_ITEMS, adsAutoVisible } from '@/lib/ads/autoBrief' // KINEO-ADS-IA-FAZ-2026-09-26

// ─── tipos e constantes ──────────────────────────────────────────────────────────────────────

type Gate = 'ok' | 'no_access' | 'closed'
type Access = 'pass' | 'subscriber' | 'internal' | 'none'

interface OrdersPayload {
  access: Access
  gate: Gate
  live: boolean
  ready: boolean
  orders: AdsOrder[]
}

type Boot =
  | { kind: 'loading' }
  | { kind: 'unlocking' }
  | { kind: 'unlock_timeout' }
  | { kind: 'closed' }
  | { kind: 'no_access' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

const STEPS = [
  { id: 'brief', label: 'Brief' },
  { id: 'media', label: 'Photos & logo' },
  { id: 'model', label: 'Model' },
  { id: 'script', label: 'Script' },
  { id: 'voice', label: 'Voice' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'render', label: 'Render' },
] as const
type StepId = (typeof STEPS)[number]['id']
type View = StepId | 'progress' | 'delivery' | 'failed'
/** Cartão final já subido. `sig` = assinatura do texto+logo com que foi desenhado NESTA sessão; `null` = cartão
 *  recuperado do pedido salvo (rascunho após 402, falha, recarga): o texto é desconhecido, então ele só vale depois
 *  que a pessoa o vê no passo do storyboard (reachableIndex não deixa pular para o Render com ele). `savedUrl` = o PNG
 *  salvo que a pessoa viu e aceitou: a prévia mostra ele (e não o canvas) enquanto o texto não for editado. */
type CardInfo = { id: string; sig: string | null; savedUrl?: string | null }
type Storyboard = Record<number, string[]>
/** KINEO-ADS-VERSOES-2026-09-26 — nova versão de um anúncio pronto: outra abertura (A/B), outra língua ou outro formato. */
type RemixKind = 'opening' | 'language' | 'format'
type Remix = { base: AdsOrder; kind: RemixKind; language?: string; format?: AdFormat }
type RenderInfo = { renderId: string | null; seconds: number; topic: string }

const MAX_MEDIA = 12
const REUSABLE_STATUSES: readonly string[] = ['draft', 'rendering', 'failed', 'delivered', 'reviewed']
/** Estados em que o pedido carrega o storyboard e o cartão gravados pelo render (o claim grava os dois). */
const SEEDABLE_STATUSES: readonly string[] = ['draft', 'failed', 'rendering']
const REVIEW_LINE = 'A human editor reviews your first ad within 24 hours and sends a corrected version if anything is off.'
const BUSINESS_SEP = ' — '
const POLL_MS = 5000
const POLL_CAP_MS = 15 * 60_000
/** 'rendering' sem render_id por mais que isto (maxDuration do POST é 300 s) = o despacho morreu no caminho. */
const STUCK_NO_RENDER_MS = 6 * 60_000
const SUPPORT_EMAIL = 'hello@usekineo.com'
/** O menor número de fotos que algum modelo exige (vídeo não conta): abaixo disso nenhum modelo abre no passo 3. */
const MIN_PHOTOS_ANY_MODEL = Math.min(...ADS_MODELS.map((m) => m.inputs.minPhotos))
const PHOTOS_NEEDED_LINE = `Add at least ${MIN_PHOTOS_ANY_MODEL} photos — every ad model uses photos; videos are extra.`
/** O roteiro salvo carrega o modelo para o qual foi escrito: script_angle = "<ângulo>@<id do modelo>" (≤ 40). */
const SCRIPT_MODEL_SEP = '@'
/** WAV mudo de 0,05 s: tocado DENTRO do toque para destravar o <audio> no iPhone antes de qualquer await. */
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACA' + 'gICA'.repeat(133)
const VOICE_CACHE_MAX = 8
const UNLOCK_POLL_MS = 3000
const UNLOCK_CAP_MS = 90_000
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const CTA_OPTIONS: { id: AdsBrief['cta']; label: string; contact: string; placeholder: string }[] = [
  { id: 'call', label: 'Call', contact: 'Phone number', placeholder: 'e.g. +1 555 010 2030' },
  { id: 'whatsapp', label: 'WhatsApp', contact: 'WhatsApp number', placeholder: 'e.g. +55 11 91234 5678' },
  { id: 'visit', label: 'Visit', contact: 'Address', placeholder: 'e.g. 120 Main St, Springfield' },
  { id: 'buy', label: 'Buy', contact: 'Shop link', placeholder: 'e.g. yourshop.com' },
  { id: 'book', label: 'Book', contact: 'Booking link or phone', placeholder: 'e.g. yourclinic.com/book' },
  { id: 'signup', label: 'Sign up', contact: 'Sign-up link', placeholder: 'e.g. yourcourse.com/join' },
]
const TONES: { id: AdsBrief['tone']; label: string }[] = [
  { id: 'warm', label: 'Warm' },
  { id: 'direct', label: 'Direct' },
  { id: 'premium', label: 'Premium' },
]
const ANGLE_LABEL: Record<string, string> = { question: 'Question', number: 'Number', result: 'Result' }

/** Campos extras que cada modelo pede (models.ts inputs.extraFields). 'offer' vai para brief.offer. */
const EXTRA_FIELDS: Record<string, { label: string; placeholder: string; multiline?: boolean }> = {
  offer: { label: 'Offer and price', placeholder: 'e.g. 2 croissants and a coffee for 5 dollars' },
  deadline: { label: 'Deadline', placeholder: 'e.g. until Sunday, September 28' },
  hours: { label: 'Opening hours', placeholder: 'e.g. Monday to Saturday, 7 am to 7 pm' },
  address: { label: 'Address or neighborhood', placeholder: 'e.g. 120 Main St, Downtown' },
  pain: { label: 'The problem your customer has', placeholder: 'e.g. a leaking pipe under the sink' },
  differentiator: { label: 'What makes you different', placeholder: 'e.g. licensed plumbers, fixed price before we start' },
  turnaround: { label: 'How fast you solve it', placeholder: 'e.g. the same day' },
  testimonials: { label: 'Real customer testimonials, with first names', placeholder: 'e.g. "The best bread in town." — Maria', multiline: true },
  rating: { label: 'Your rating and number of reviews', placeholder: 'e.g. 4.9 stars from 120 Google reviews' },
  duration_of_service: { label: 'How long the service takes', placeholder: 'e.g. 2 hours' },
  origin_lines: { label: 'Why you started (2 or 3 lines)', placeholder: 'e.g. My grandmother baked for the whole street…', multiline: true },
  topic: { label: 'Your topic of expertise', placeholder: 'e.g. small-business taxes' },
  three_mistakes: { label: 'Three mistakes your customers make', placeholder: '1. … 2. … 3. …', multiline: true },
  seats: { label: 'Seats or spots left', placeholder: 'e.g. 12 seats' },
}

/** Códigos de erro do /api/ads/orders e do /api/ads/script → frase para a tela. */
const ORDER_ERRORS: Record<string, string> = {
  network: 'No connection. Check your internet and try again.',
  brief_missing: 'Fill in the brief first.',
  business_required: 'Tell us your business name and what you sell.',
  contact_required: 'Add how customers reach you: phone, WhatsApp, address or link.',
  offer_too_long: 'The offer is too long. Keep it under 300 characters.',
  audience_too_long: 'The audience line is too long. Keep it under 200 characters.',
  cta_invalid: 'Pick a call to action.',
  extra_too_many: 'Too many extra details. Keep only the ones this model asks for.',
  extra_key_invalid: 'One of the model details is not valid. Refresh the page and try again.',
  extra_value_invalid: 'One of the model details is too long. Keep each under 300 characters.',
  media_not_list: 'Something went wrong with your files. Refresh the page.',
  media_too_many: `Too many files. Keep up to ${MAX_MEDIA} photos and videos plus the logo.`,
  media_item_invalid: 'One of the files is not valid. Remove it and upload it again.',
  media_id_invalid: 'One of the files is not valid. Remove it and upload it again.',
  media_kind_invalid: 'One of the files is not valid. Remove it and upload it again.',
  media_not_owned: 'One of the files is no longer in your account. Remove it and upload it again.',
  logo_must_be_image: 'The logo must be a PNG or JPG image.',
  logo_only_one: 'Only one logo per ad.',
  template_invalid: 'Choose one of the models.',
  template_required: 'Choose a model first.',
  brief_required: 'Fill in the brief first.',
  script_invalid: 'The script is empty or too long.',
  angle_invalid: 'Pick a script version again.',
  consent_must_be_true: 'Confirm you own the photos and videos, or have permission to use them.',
  consent_needs_media: 'Upload at least one photo or video first.',
  patch_empty: 'Nothing to save.',
  patch_missing: 'Nothing to save.',
  order_id_invalid: 'This ad could not be found. Refresh the page.',
  body_must_be_object: 'Something went wrong. Refresh the page and try again.',
  sign_in_required: 'Sign in again to continue.',
  unavailable: 'Script writing is unavailable right now. Try again in a few minutes.',
  failed: 'Something went wrong. Try again in a minute.',
}

type ApiOk<T> = { ok: true; status: number; data: T }
type ApiErr = { ok: false; status: number; code: string | null; message: string | null; body: Record<string, unknown> }

// ─── utilidades puras ───────────────────────────────────────────────────────────────────────

async function callJson<T>(url: string, init?: RequestInit): Promise<ApiOk<T> | ApiErr> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', ...init })
  } catch {
    return { ok: false, status: 0, code: 'network', message: null, body: {} }
  }
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }
  const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  if (res.ok) return { ok: true, status: res.status, data: body as T }
  return {
    ok: false,
    status: res.status,
    code: typeof body.error === 'string' ? body.error : null,
    message: typeof body.message === 'string' ? body.message : null,
    body,
  }
}

function patchOrder(id: string, fields: Record<string, unknown>) {
  return callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ id, ...fields }) })
}

function errorText(r: { status: number; code: string | null; message: string | null }): string {
  if (r.status === 0) return ORDER_ERRORS.network
  if (r.code && ORDER_ERRORS[r.code]) return ORDER_ERRORS[r.code]
  if (r.code && Object.prototype.hasOwnProperty.call(ADS_RENDER_ERROR_MESSAGES, r.code)) return adsRenderErrorMessage(r.code)
  if (r.message) return r.message
  if (r.code && /\s/.test(r.code)) return r.code
  if (r.status === 503) return 'Studio Ads is not ready yet. Try again in a few minutes.'
  return 'Something went wrong. Try again in a minute.'
}

/** Falha do render → frase da casa. A frase crua do compose NUNCA vai para a tela (ela fala de telas e créditos de
 *  outro produto); código desconhecido vira a mensagem de 'render_failed', que diz que o crédito não foi usado. */
function failureText(failure: string | null | undefined): string {
  const f = (failure ?? '').trim()
  return adsRenderErrorMessage(f && Object.prototype.hasOwnProperty.call(ADS_RENDER_ERROR_MESSAGES, f) ? f : 'render_failed')
}

/** O código curto da falha (snake_case) para o suporte; frase livre devolve null e não aparece. */
function failureCode(failure: string | null | undefined): string | null {
  const f = (failure ?? '').trim()
  return /^[a-z][a-z0-9_]{1,47}$/.test(f) ? f : null
}

function goLogin() {
  if (typeof window === 'undefined') return
  window.location.href = `/login?redirect=${encodeURIComponent('/ads/new')}`
}

function splitBusiness(b: string): [string, string] {
  const i = b.indexOf(BUSINESS_SEP)
  return i > 0 ? [b.slice(0, i), b.slice(i + BUSINESS_SEP.length)] : [b, '']
}

function defaultLanguage(): string {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language : ''
    const code = (nav || '').slice(0, 2).toLowerCase()
    return NARRATION_LANGUAGES.some((l) => l.code === code) ? code : 'en'
  } catch {
    return 'en'
  }
}

function isRtl(language: string | null | undefined): boolean {
  const code = (language ?? '').slice(0, 2)
  return NARRATION_LANGUAGES.some((l) => l.code === code && l.rtl)
}

function orderMedia(order: AdsOrder | null): AdsMediaItem[] {
  return order && Array.isArray(order.media) ? order.media : []
}

function mediaSummary(media: AdsMediaItem[]) {
  const logo = media.find((m) => m.isLogo) ?? null
  const rest = media.filter((m) => !m.isLogo)
  return {
    logo,
    rest,
    photos: rest.filter((m) => m.kind === 'image').length,
    videos: rest.filter((m) => m.kind === 'video').length,
  }
}

function stripItem(m: AdsMediaItem): AdsMediaItem {
  return {
    footageId: m.footageId,
    url: m.url,
    kind: m.kind,
    isLogo: m.isLogo,
    bytes: m.bytes,
    width: m.width ?? null,
    height: m.height ?? null,
    seconds: m.seconds ?? null,
  }
}

function briefComplete(b: AdsBrief | null | undefined): b is AdsBrief {
  return Boolean(b && b.business?.trim() && b.contact?.trim() && b.cta)
}

function extrasMissing(model: AdsModel, brief: AdsBrief | null | undefined): string[] {
  return model.inputs.extraFields.filter((f) => {
    const v = f === 'offer' ? brief?.offer : brief?.extra?.[f]
    return !(v ?? '').trim()
  })
}

function scriptAngleFor(angle: string, modelId: string): string {
  return `${angle}${SCRIPT_MODEL_SEP}${modelId}`
}

/** O roteiro salvo foi escrito para ESTE modelo? Pedido antigo sem "@modelo" conta como não escrito. */
function scriptWrittenFor(order: AdsOrder | null, modelId: string | null | undefined): boolean {
  const a = order?.script_angle ?? ''
  return Boolean(modelId) && a.endsWith(`${SCRIPT_MODEL_SEP}${modelId}`)
}

/** "question_edited@oferta_relampago" → "question_edited". */
function angleOf(scriptAngle: string | null | undefined): string {
  const a = scriptAngle ?? ''
  const i = a.lastIndexOf(SCRIPT_MODEL_SEP)
  return i >= 0 ? a.slice(0, i) : a
}

/** As batidas do roteiro salvo — só se ele foi escrito para o modelo atual do pedido (troca de modelo + recarga
 *  não traz o roteiro do modelo anterior como pronto). */
function beatsFromOrder(order: AdsOrder | null): string[] | null {
  if (!order?.script) return null
  const model = adsModelById(order.template)
  if (!model || !scriptWrittenFor(order, model.id)) return null
  const parts = order.script.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
  return parts.length === model.beats.length ? parts : null
}

/** Até onde a pessoa pode ir com o que o servidor já guardou (índice em STEPS). */
function reachableIndex(order: AdsOrder | null, beats: string[] | null, card: CardInfo | null, storyboard: Storyboard): number {
  if (!order || !briefComplete(order.brief)) return 0
  const sum = mediaSummary(orderMedia(order))
  if (!sum.logo || sum.photos < MIN_PHOTOS_ANY_MODEL || !order.consent_at) return 1
  const model = adsModelById(order.template)
  if (!model) return 2
  if (adsModelMissingInputs(model, { photos: sum.photos, videos: sum.videos, logo: Boolean(sum.logo) }).length) return 2
  if (extrasMissing(model, order.brief).length) return 2
  if (!beats || beats.length !== model.beats.length || !scriptWrittenFor(order, model.id)) return 3
  if (!isAdsVoice(order.voice)) return 4
  // Cartão desta sessão (o recuperado do pedido só vale depois de visto) E storyboard válido para a mídia atual.
  if (!card || card.sig === null || !storyboardValid(storyboard, model, sum.rest)) return 5
  return 6
}

/** Identidade da mídia (ids, logo e tipo) — muda quando a pessoa sobe, remove ou troca o logo. */
function mediaKey(media: AdsMediaItem[]): string {
  return media.map((m) => `${m.footageId}:${m.isLogo ? 'logo' : m.kind}`).join('|')
}

/** Tira do storyboard os ids que não estão mais na mídia (sem o logo); batida que esvazia sai do mapa. */
function pruneStoryboard(sb: Storyboard, media: AdsMediaItem[]): Storyboard {
  const ids = new Set(media.filter((m) => !m.isLogo).map((m) => m.footageId))
  const out: Storyboard = {}
  for (const [k, list] of Object.entries(sb)) {
    const kept = (list ?? []).filter((id) => ids.has(id))
    if (kept.length) out[Number(k)] = kept
  }
  return out
}

/** O storyboard que o render gravou no pedido ([{beatIndex, footageIds}]), só com ids ainda presentes na mídia. */
function savedStoryboard(src: AdsOrder | null, media: AdsMediaItem[]): Storyboard {
  const model = adsModelById(src?.template ?? null)
  const raw: unknown = src?.storyboard
  if (!model || !Array.isArray(raw)) return {}
  const ids = new Set(media.filter((m) => !m.isLogo).map((m) => m.footageId))
  const out: Storyboard = {}
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue
    const e = s as { beatIndex?: unknown; footageIds?: unknown }
    const bi = typeof e.beatIndex === 'number' && Number.isInteger(e.beatIndex) ? e.beatIndex : -1
    if (bi < 0 || bi >= model.beats.length - 1 || !Array.isArray(e.footageIds)) continue
    const kept = Array.from(new Set(e.footageIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))).slice(0, ADS_MAX_MEDIA_PER_BEAT)
    if (kept.length) out[bi] = kept
  }
  return out
}

/** O cartão que o render gravou no pedido (card_footage_id), marcado como recuperado (sig null). */
function savedCard(src: AdsOrder | null): CardInfo | null {
  const id = src && typeof src.card_footage_id === 'string' && /^[0-9a-f-]{36}$/i.test(src.card_footage_id) ? src.card_footage_id : null
  return id ? { id, sig: null } : null
}

/** Hash curto e estável (FNV-1a 32 bits) — só para chavear as versões do roteiro pelo brief. */
function shortHash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const SCRIPT_ANGLES: readonly string[] = ['question', 'number', 'result']

/** Versões do roteiro guardadas nesta aba (conveniência: recarregar ou voltar não gasta o teto diário de novas). */
function readVersions(key: string, n: number): AdsScriptVersion[] | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const list = parsed.filter((v): v is AdsScriptVersion => {
      if (!v || typeof v !== 'object') return false
      const x = v as Record<string, unknown>
      return (
        typeof x.angle === 'string' && SCRIPT_ANGLES.includes(x.angle) &&
        Array.isArray(x.beats) && x.beats.length === n && x.beats.every((b) => typeof b === 'string') &&
        typeof x.script === 'string' && typeof x.words === 'number'
      )
    })
    return list.length ? list : null
  } catch {
    return null
  }
}

function writeVersions(key: string, list: AdsScriptVersion[]) {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* armazenamento indisponível (aba privada, cota): as versões só não sobrevivem à recarga */
  }
}

function storyboardValid(sb: Storyboard, model: AdsModel, rest: AdsMediaItem[]): boolean {
  const ids = new Set(rest.map((m) => m.footageId))
  for (let i = 0; i < model.beats.length - 1; i++) {
    const list = sb[i]
    if (!list || list.length < 1 || list.length > ADS_MAX_MEDIA_PER_BEAT) return false
    if (list.some((id) => !ids.has(id))) return false
  }
  return true
}

/** Distribui a mídia pelas batidas (menos a do cartão): vídeos primeiro, na ordem de envio; fotos podem repetir. */
function defaultStoryboard(model: AdsModel, media: AdsMediaItem[]): Storyboard {
  const content = model.beats.slice(0, -1)
  const n = content.length
  const rest = media.filter((m) => !m.isLogo)
  const videos = rest.filter((m) => m.kind === 'video')
  const photos = rest.filter((m) => m.kind === 'image')
  const ordered = [...videos, ...photos]
  const out: Storyboard = {}
  if (!ordered.length || !n) return out
  const want = content.reduce((a, b) => a + Math.min(ADS_MAX_MEDIA_PER_BEAT, Math.max(1, Math.round(b.seconds / 3.5))), 0)
  const total = Math.max(n, Math.min(ordered.length, want))
  const sumW = content.reduce((a, b) => a + b.seconds, 0) || 1
  const counts = content.map((b) => Math.max(1, Math.min(ADS_MAX_MEDIA_PER_BEAT, Math.floor((total * b.seconds) / sumW))))
  const sum = () => counts.reduce((a, b) => a + b, 0)
  for (let guard = 0; sum() < total && guard < 100; guard++) {
    let best = -1
    let bestR = -1
    content.forEach((b, i) => {
      if (counts[i] < ADS_MAX_MEDIA_PER_BEAT && b.seconds / counts[i] > bestR) {
        bestR = b.seconds / counts[i]
        best = i
      }
    })
    if (best < 0) break
    counts[best]++
  }
  for (let guard = 0; sum() > total && guard < 100; guard++) {
    let worst = -1
    let worstR = Infinity
    content.forEach((b, i) => {
      if (counts[i] > 1 && b.seconds / counts[i] < worstR) {
        worstR = b.seconds / counts[i]
        worst = i
      }
    })
    if (worst < 0) break
    counts[worst]--
  }
  const repeatPool = photos.length ? photos : ordered
  let k = 0
  let r = 0
  content.forEach((_, i) => {
    const ids: string[] = []
    for (let j = 0; j < counts[i]; j++) {
      let pick: AdsMediaItem | undefined
      if (k < ordered.length) pick = ordered[k++]
      else {
        for (let t = 0; t < repeatPool.length; t++) {
          const c = repeatPool[(r + t) % repeatPool.length]
          if (!ids.includes(c.footageId)) {
            pick = c
            r = (r + t + 1) % repeatPool.length
            break
          }
        }
      }
      if (!pick || ids.includes(pick.footageId)) break
      ids.push(pick.footageId)
    }
    if (!ids.length) ids.push(ordered[i % ordered.length].footageId)
    out[i] = ids
  })
  return out
}

function previewText(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const i = cut.lastIndexOf(' ')
  return (i > max * 0.6 ? cut.slice(0, i) : cut).trim()
}

function normContact(s: string): string {
  return s.toLowerCase().replace(/[\s\-().]/g, '')
}

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function fetchRenderState(orderId: string): Promise<AdsRenderState | null> {
  const r = await callJson<AdsRenderState>(`/api/ads/render?order_id=${encodeURIComponent(orderId)}`)
  if (!r.ok) {
    if (r.status === 401) goLogin()
    return null
  }
  return r.data && typeof r.data.status === 'string' ? r.data : null
}

function voiceLabel(id: string | null | undefined): string {
  return ADS_VOICES.find((v) => v.id === id)?.label ?? 'Warm · female'
}

function languageLabel(code: string | null | undefined): string {
  const c = (code ?? 'en').slice(0, 2)
  const l = NARRATION_LANGUAGES.find((x) => x.code === c)
  return l ? l.native : c
}

// ─── CSS do assistente (estático; o kit não estiliza input/select) ─────────────────────────

const ADS_WIZARD_CSS = `
.stu.adsw{width:100%;max-width:none;min-width:0;margin:0}
@media(max-width:900px){.stu.adsw{padding-left:16px;padding-right:16px}}
.adsw h2{font-size:20px;font-weight:700;margin:0 0 6px;color:#f2f5fa;letter-spacing:-.01em;line-height:1.3}
.adsw h2:focus{outline:none}
.adsw h3{font-size:15px;font-weight:700;margin:0 0 8px;color:#e6ecf5}
.adsw .adsw-lead{color:#a5afc0;font-size:14px;line-height:1.55;margin:0 0 16px}
.adsw .card{margin-top:14px;min-width:0;overflow-wrap:anywhere}
.adsw .adsw-f{display:block;margin-bottom:14px;min-width:0}
.adsw .adsw-f>span{display:block;font-size:13px;font-weight:600;color:#bdc8da;margin-bottom:6px}
.adsw .adsw-f small,.adsw .adsw-hint{display:block;font-size:12px;color:rgba(255,255,255,.5);line-height:1.45;margin:0 0 6px}
.adsw .adsw-req{color:#5cb3ff;margin-left:3px}
.adsw input[type=text],.adsw select{width:100%;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:15px;outline:none;font-family:inherit;caret-color:#2997ff;transition:border-color .18s ease;min-width:0}
.adsw input[type=text]::placeholder,.adsw textarea::placeholder{color:rgba(255,255,255,.32)}
.adsw input[type=text]:focus,.adsw select:focus{border-color:rgba(41,151,255,.55);box-shadow:0 0 0 3px rgba(41,151,255,.12)}
.adsw input[aria-invalid=true]{border-color:rgba(248,113,113,.7)}
.adsw select option{background:#141922;color:#fff}
.adsw textarea.adsw-ta{min-height:0;padding:12px 14px;font-size:15px;line-height:1.55;border-radius:12px}
@media(max-width:900px){.adsw input[type=text],.adsw select,.adsw textarea.adsw-ta{font-size:16px}}
.adsw .adsw-2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
@media(max-width:640px){.adsw .adsw-2{grid-template-columns:1fr}}
.adsw .adsw-err{color:#f87171;font-size:13.5px;margin:10px 0 0;line-height:1.45}
.adsw .adsw-warn{color:#fb923c;font-size:13px;margin:8px 0 0;line-height:1.45}
.adsw .adsw-good{color:#4ade80}
.adsw .adsw-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:18px}
.adsw .adsw-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:11px 20px;border-radius:999px;font-weight:800;font-size:14.5px;border:1px solid transparent;cursor:pointer;background:linear-gradient(140deg,#3aa0ff,#1a72d8);color:#fff;text-decoration:none;font-family:inherit;text-align:center;line-height:1.25}
.adsw .adsw-btn:disabled{background:rgba(255,255,255,.14);color:rgba(255,255,255,.5);cursor:not-allowed}
.adsw .adsw-btn.ghost{background:transparent;border-color:rgba(255,255,255,.2);color:#dfe6f1}
.adsw .adsw-btn.ghost:hover:not(:disabled){border-color:rgba(41,151,255,.6)}
.adsw .adsw-btn.small{min-height:36px;padding:7px 14px;font-size:13px}
.adsw .adsw-link{color:#5cb3ff;font-weight:700;text-decoration:none}
.adsw .adsw-link:hover{text-decoration:underline}
.adsw .adsw-steps ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}
.adsw .adsw-steps button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:6px 12px 6px 7px;border-radius:999px;font-size:12.5px;font-weight:700;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);cursor:pointer;font-family:inherit}
.adsw .adsw-steps button .sn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:99px;background:rgba(255,255,255,.08);font-size:11px}
.adsw .adsw-steps button.done{color:#cfe3ff;border-color:rgba(41,151,255,.35)}
.adsw .adsw-steps button.done .sn{background:rgba(41,151,255,.25)}
.adsw .adsw-steps button.on{color:#fff;border-color:rgba(120,190,255,.9);background:rgba(41,151,255,.18)}
.adsw .adsw-steps button.on .sn{background:#2997ff}
.adsw .adsw-steps button:disabled{cursor:default;opacity:.55}
.adsw .adsw-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px}
.adsw .adsw-tile{position:relative;aspect-ratio:3/4;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#0e1219;min-width:0}
.adsw .adsw-tile img,.adsw .adsw-tile video{width:100%;height:100%;object-fit:cover;display:block}
.adsw .adsw-tag{position:absolute;left:5px;bottom:5px;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(0,0,0,.65);color:#fff;letter-spacing:.02em}
.adsw .adsw-x{position:absolute;top:4px;right:4px;width:32px;height:32px;border-radius:99px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
.adsw .adsw-add{aspect-ratio:3/4;border-radius:12px;border:1px dashed rgba(255,255,255,.25);background:rgba(255,255,255,.03);color:rgba(255,255,255,.75);font-size:13px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;text-align:center;font-family:inherit}
.adsw .adsw-add:hover:not(:disabled){border-color:rgba(41,151,255,.6);background:rgba(41,151,255,.05)}
.adsw .adsw-add:disabled{cursor:not-allowed;opacity:.5}
.adsw .adsw-add .plus{font-size:24px;line-height:1}
.adsw .adsw-logo{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.adsw .adsw-logo .adsw-tile{width:104px;aspect-ratio:1/1;background:repeating-conic-gradient(#1b2230 0 25%,#141922 0 50%) 50%/16px 16px}
.adsw .adsw-logo .adsw-tile img{object-fit:contain;padding:8px}
.adsw .adsw-check{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:#dfe6f1;line-height:1.5;cursor:pointer;margin-top:14px}
.adsw .adsw-mode{margin:0 0 14px;gap:8px;flex-wrap:wrap}
.adsw .adsw-auto-stages{list-style:none;margin:14px 0;padding:0;display:grid;gap:8px}
.adsw .adsw-auto-stages li{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);opacity:.55}
.adsw .adsw-auto-stages li[data-state=on]{opacity:1;border-color:rgba(120,190,255,.9);background:rgba(41,151,255,.12)}
.adsw .adsw-auto-stages li[data-state=done]{opacity:.85}
.adsw .adsw-auto-stages li[data-state=done]::before{content:'✓ '}
.adsw .adsw-check input{width:20px;height:20px;margin-top:2px;accent-color:#2997ff;flex-shrink:0}
.adsw .adsw-count{font-size:13px;color:#bdc8da;margin:0 0 10px}
.adsw .cams .cam.adsw-model{text-align:left;display:flex;flex-direction:column;gap:5px;min-width:0;font-family:inherit}
.adsw .adsw-model b{font-size:14px;line-height:1.3}
.adsw .adsw-model .m-meta{font-size:12px;color:#5cb3ff;font-weight:700}
.adsw .adsw-model .m-seg{font-size:11.5px;color:rgba(255,255,255,.52);line-height:1.35}
.adsw .adsw-model .m-miss{font-size:11.5px;color:#fb923c;line-height:1.35}
.adsw .cams .cam.adsw-model:disabled{opacity:.55;cursor:not-allowed;transform:none}
.adsw .adsw-vers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media(max-width:900px){.adsw .adsw-vers{grid-template-columns:1fr}}
.adsw .adsw-ver{border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;background:rgba(255,255,255,.025);display:flex;flex-direction:column;gap:10px;min-width:0}
.adsw .adsw-ver.on{border-color:rgba(41,151,255,.7);background:rgba(41,151,255,.08)}
.adsw .adsw-ver-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.adsw .adsw-ver-h span{font-size:12px;color:rgba(255,255,255,.5)}
.adsw .adsw-ver p{margin:0;font-size:13.5px;line-height:1.55;color:#dfe6f1;display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden}
.adsw .adsw-words{font-size:13px;font-weight:700;margin-top:4px}
.adsw .adsw-voices{display:flex;flex-direction:column;gap:10px}
.adsw .adsw-voice{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.025)}
.adsw .adsw-voice.on{border-color:rgba(41,151,255,.7);background:rgba(41,151,255,.08)}
.adsw .adsw-voice .pill{flex:1 1 160px;text-align:left;justify-content:flex-start}
.adsw .adsw-beat{border-top:1px solid rgba(255,255,255,.08);padding-top:14px;margin-top:14px}
.adsw .adsw-beat:first-of-type{border-top:0;padding-top:0;margin-top:0}
.adsw .adsw-say{font-size:14px;line-height:1.55;color:#e6ecf5;margin:0 0 8px;font-style:italic}
.adsw .adsw-pick{padding:0;cursor:pointer;font-family:inherit}
.adsw .adsw-pick.on{border-color:#2997ff;box-shadow:inset 0 0 0 2px #2997ff}
.adsw .adsw-pick:not(.on) img,.adsw .adsw-pick:not(.on) video{opacity:.55}
.adsw .adsw-num{position:absolute;top:5px;left:5px;width:24px;height:24px;border-radius:99px;background:#2997ff;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.adsw .adsw-cardwrap{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}
.adsw .adsw-canvas{width:100%;max-width:220px;aspect-ratio:9/16;border-radius:12px;border:1px solid rgba(255,255,255,.14);display:block;background:#05070b;height:auto}
.adsw .adsw-cardside{flex:1 1 260px;min-width:0}
.adsw details summary{cursor:pointer;font-size:13.5px;font-weight:700;color:#cfe3ff;min-height:36px;display:flex;align-items:center}
.adsw .adsw-bar{height:10px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:14px 0 8px}
.adsw .adsw-bar i{display:block;height:100%;background:linear-gradient(90deg,#3aa0ff,#1a72d8);transition:width .6s ease}
.adsw .adsw-bar.pulse i{animation:adswpulse 1.4s ease-in-out infinite}
@keyframes adswpulse{0%,100%{opacity:.45}50%{opacity:1}}
.adsw .adsw-video{width:100%;max-width:360px;aspect-ratio:9/16;border-radius:14px;background:#000;border:1px solid rgba(41,151,255,.25);display:block;height:auto}
.adsw .adsw-panel{text-align:center;padding:30px 18px}
.adsw .adsw-panel .adsw-actions{justify-content:center}
.adsw .adsw-sum{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px;margin:0 0 14px}
.adsw .adsw-sum dt{color:rgba(255,255,255,.55)}
.adsw .adsw-sum dd{margin:0;color:#fff;font-weight:600;text-align:right;min-width:0;overflow-wrap:anywhere}
.adsw .adsw-review{font-size:13.5px;color:#cfe3ff;background:rgba(41,151,255,.08);border:1px solid rgba(41,151,255,.28);border-radius:12px;padding:10px 12px;line-height:1.5;margin:14px 0 0}
`

// ─── componente principal ───────────────────────────────────────────────────────────────────

export default function AdsWizardClient({ gate, access, resumingPass }: { gate: Gate; access: Access; resumingPass: boolean }) {
  const [boot, setBoot] = useState<Boot>(() => (resumingPass && (access === 'none' || gate === 'no_access') ? { kind: 'unlocking' } : { kind: 'loading' }))
  const [bootRound, setBootRound] = useState(0)
  const [order, setOrder] = useState<AdsOrder | null>(null)
  const [view, setView] = useState<View>('brief')
  const [beats, setBeats] = useState<string[] | null>(null)
  const [storyboard, setStoryboard] = useState<Storyboard>({})
  const [card, setCard] = useState<CardInfo | null>(null)
  const [render, setRender] = useState<RenderInfo | null>(null)
  const [renderState, setRenderState] = useState<AdsRenderState | null>(null)
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({})
  const [busyNew, setBusyNew] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)
  // KINEO-ADS-IA-FAZ-2026-09-26 — 'ai' = a IA faz o anúncio (uma tela); 'steps' = o passo a passo de sempre.
  const [mode, setMode] = useState<'ai' | 'steps'>(() => (adsAutoVisible(access) ? 'ai' : 'steps'))
  const [remix, setRemix] = useState<Remix | null>(null) // KINEO-ADS-VERSOES-2026-09-26
  const sessionUploads = useRef<Set<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)
  const settled = useRef(false)
  const localUrlsRef = useRef(localUrls)
  localUrlsRef.current = localUrls
  const orderRef = useRef<AdsOrder | null>(order)
  orderRef.current = order

  const model = useMemo(() => adsModelById(order?.template ?? null), [order?.template])

  /** Grava o pedido devolvido pelo servidor e derruba o que ficou velho: mídia mudou → cartão sai e o storyboard perde
   *  os ids que sumiram; brief mudou → cartão sai (o texto dele nasce do brief). Assim a barra de passos não chega ao
   *  Render com cartão ou storyboard de uma versão anterior. */
  const applyOrder = useCallback((next: AdsOrder) => {
    const prev = orderRef.current
    if (prev && prev.id === next.id) {
      if (mediaKey(orderMedia(prev)) !== mediaKey(orderMedia(next))) {
        setCard(null)
        setStoryboard((sb) => pruneStoryboard(sb, orderMedia(next)))
      }
      if (JSON.stringify(prev.brief ?? null) !== JSON.stringify(next.brief ?? null)) setCard(null)
    }
    orderRef.current = next
    setOrder(next)
  }, [])

  const hydrate = useCallback(async (orders: AdsOrder[]) => {
    const pick = orders.find((o) => REUSABLE_STATUSES.includes(o.status)) ?? null
    orderRef.current = pick
    setOrder(pick)
    const b = beatsFromOrder(pick)
    setBeats(b)
    // Rascunho devolvido (402), falha ou render em curso: o pedido guarda o storyboard e o cartão do último render.
    const seed = pick && SEEDABLE_STATUSES.includes(pick.status)
    setStoryboard(seed ? savedStoryboard(pick, orderMedia(pick)) : {})
    setCard(seed ? savedCard(pick) : null)
    if (!pick) {
      setView('brief')
      return
    }
    if (pick.status === 'draft') {
      setView(STEPS[Math.min(reachableIndex(pick, b, null, {}), 5)].id)
      return
    }
    const st = await fetchRenderState(pick.id)
    setRenderState(st)
    const status = st?.status ?? pick.status
    if (status === 'delivered' || status === 'reviewed') {
      setView('delivery')
      return
    }
    if (status === 'failed' || status === 'cancelled') {
      setView('failed')
      return
    }
    setRender({ renderId: st?.render_id ?? null, seconds: st?.seconds ?? pick.seconds ?? 35, topic: st?.topic ?? '' })
    setView('progress')
  }, [])

  // Carga + reconsulta pós-checkout (o webhook do passe pode atrasar alguns segundos).
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const started = Date.now()
    const dropQuery = () => {
      try {
        if (window.location.search) window.history.replaceState(null, '', '/ads/new')
      } catch {
        /* ignore */
      }
    }
    async function tick() {
      const r = await callJson<OrdersPayload>('/api/ads/orders')
      if (cancelled) return
      if (!r.ok) {
        if (r.status === 401) return goLogin()
        if (r.status === 503) return setBoot({ kind: 'closed' })
        return setBoot({ kind: 'error', message: errorText(r) })
      }
      const d = r.data
      if (resumingPass && d.access === 'none') {
        if (Date.now() - started < UNLOCK_CAP_MS) {
          setBoot({ kind: 'unlocking' })
          timer = setTimeout(tick, UNLOCK_POLL_MS)
          return
        }
        // Mantém ?resume=pass no endereço: recarregar a página reabre esta espera em vez de mandar para /ads.
        return setBoot({ kind: 'unlock_timeout' })
      }
      if (resumingPass) dropQuery()
      if (!d.ready || d.gate === 'closed') return setBoot({ kind: 'closed' })
      if (d.gate !== 'ok') return setBoot({ kind: 'no_access' })
      await hydrate(Array.isArray(d.orders) ? d.orders : [])
      if (!cancelled) setBoot({ kind: 'ready' })
    }
    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [resumingPass, hydrate, bootRound])

  // URLs locais (blob:) das miniaturas desta sessão: liberadas ao sair.
  useEffect(() => {
    return () => {
      Object.values(localUrlsRef.current).forEach((u) => {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      })
    }
  }, [])

  // Troca de passo: sobe para o topo e leva o foco ao título do passo (leitor de tela e teclado).
  useEffect(() => {
    if (boot.kind !== 'ready') {
      settled.current = false
      return
    }
    if (!settled.current) {
      settled.current = true
      return
    }
    const root = rootRef.current
    if (!root) return
    try {
      root.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } catch {
      root.scrollIntoView()
    }
    const h = root.querySelector<HTMLElement>('[data-step-heading]')
    if (h) h.focus({ preventScroll: true })
  }, [view, boot.kind])

  const addLocalUrl = useCallback((id: string, url: string) => setLocalUrls((m) => ({ ...m, [id]: url })), [])

  const reach = reachableIndex(order, beats, card, storyboard)
  const stepIndex = STEPS.findIndex((s) => s.id === view)

  async function startNew(src: AdsOrder | null, mode: 'another' | 'retry') {
    if (busyNew) return
    setBusyNew(true)
    setNewError(null)
    try {
      const brief = src?.brief && briefComplete(src.brief) ? src.brief : null
      const created = await callJson<{ order: AdsOrder }>('/api/ads/orders', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(brief ? { brief } : {}),
      })
      if (!created.ok) {
        if (created.status === 401) return goLogin()
        setNewError(created.status === 429 ? 'You have too many unfinished ads. Finish one first, or write to hello@usekineo.com.' : errorText(created))
        return
      }
      let next = created.data.order
      if (src) {
        const fields: Record<string, unknown> = {}
        const media = orderMedia(src).map(stripItem)
        if (media.length) fields.media = media
        if (mode === 'retry') {
          if (src.template) fields.template = src.template
          if (src.script) fields.script = src.script
          if (src.script_angle) fields.script_angle = src.script_angle
          if (src.voice) fields.voice = src.voice
        }
        if (Object.keys(fields).length) {
          let p = await patchOrder(next.id, fields)
          if (!p.ok && 'media' in fields) {
            delete fields.media
            if (Object.keys(fields).length) p = await patchOrder(next.id, fields)
          }
          if (p.ok) next = p.data.order
        }
      }
      const nextMedia = orderMedia(next)
      orderRef.current = next
      setOrder(next)
      setBeats(mode === 'retry' ? beatsFromOrder(next) : null)
      if (mode === 'retry' && src) {
        // Tentar de novo não pede cartão nem storyboard de novo: o desta sessão, ou o que o render gravou no pedido.
        setStoryboard((sb) => (Object.keys(sb).length ? pruneStoryboard(sb, nextMedia) : savedStoryboard(src, nextMedia)))
        setCard((c) => c ?? savedCard(src))
      } else {
        setStoryboard({})
        setCard(null)
      }
      setRender(null)
      setRenderState(null)
      setView(mode === 'retry' ? 'media' : 'brief')
    } finally {
      setBusyNew(false)
    }
  }

  // O modo IA só aparece para quem o interruptor libera, num passo do assistente, com pedido novo ou em rascunho.
  const autoOn = boot.kind === 'ready' && adsAutoVisible(access) && STEPS.some((s) => s.id === view) && (!order || order.status === 'draft')
  const toSteps = () => {
    setMode('steps')
    const o = orderRef.current
    setView(o ? STEPS[Math.min(reachableIndex(o, beatsFromOrder(o), null, {}), 5)].id : 'brief')
  }
  let content: React.ReactNode = null
  if (boot.kind === 'loading') {
    content = (
      <div className="card adsw-panel" role="status">
        <p className="adsw-lead" style={{ margin: 0 }}>Loading your ad…</p>
      </div>
    )
  } else if (boot.kind === 'unlocking') {
    content = (
      <div className="card adsw-panel" role="status" aria-live="polite">
        <h2 tabIndex={-1} data-step-heading>Unlocking your pass…</h2>
        <p className="adsw-lead">This takes a few seconds after payment.</p>
        <div className="adsw-bar pulse" aria-hidden="true"><i style={{ width: '60%' }} /></div>
      </div>
    )
  } else if (boot.kind === 'unlock_timeout') {
    content = (
      <div className="card adsw-panel" role="status">
        <h2 tabIndex={-1} data-step-heading>Almost there</h2>
        <p className="adsw-lead">Payment received. Your pass unlocks in a minute — refresh this page.</p>
        <div className="adsw-actions">
          <button type="button" className="adsw-btn" onClick={() => { setBoot({ kind: 'unlocking' }); setBootRound((n) => n + 1) }}>Check again</button>
          <a className="adsw-link" href="mailto:hello@usekineo.com?subject=Studio%20Ads%20pass">Still locked? Write to hello@usekineo.com</a>
        </div>
      </div>
    )
  } else if (boot.kind === 'closed') {
    content = (
      <div className="card adsw-panel">
        <h2 tabIndex={-1} data-step-heading>Studio Ads opens soon</h2>
        <p className="adsw-lead">We are finishing the last checks. Come back shortly.</p>
        <div className="adsw-actions">
          <Link className="adsw-btn ghost" href="/ads">What Studio Ads includes</Link>
          <Link className="adsw-link" href="/studio">Make a video in the Studio</Link>
        </div>
      </div>
    )
  } else if (boot.kind === 'no_access') {
    content = (
      <div className="card adsw-panel">
        <h2 tabIndex={-1} data-step-heading>Studio Ads needs a pass</h2>
        <p className="adsw-lead">Studio Ads is included with the Studio Ads pass or any paid plan.</p>
        <div className="adsw-actions">
          <Link className="adsw-btn" href="/ads">See the Studio Ads pass</Link>
        </div>
      </div>
    )
  } else if (boot.kind === 'error') {
    content = (
      <div className="card adsw-panel">
        <h2 tabIndex={-1} data-step-heading>Studio Ads could not load</h2>
        <p className="adsw-err" role="alert">{boot.message}</p>
        <div className="adsw-actions">
          <button type="button" className="adsw-btn" onClick={() => { setBoot({ kind: 'loading' }); setBootRound((n) => n + 1) }}>Try again</button>
        </div>
      </div>
    )
  } else if (autoOn && mode === 'ai') {
    content = (
      <AdsAutoPanel
        order={order}
        localUrls={localUrls}
        addLocalUrl={addLocalUrl}
        sessionUploads={sessionUploads}
        onOrder={applyOrder}
        onStarted={(s, m, b, sb, c) => {
          setBeats(b)
          setStoryboard(sb)
          setCard(c)
          setRender({ renderId: s.render_id, seconds: s.seconds, topic: s.topic })
          const cur = orderRef.current
          if (cur) setOrder({ ...cur, status: 'rendering', template: m.id })
          setView('progress')
        }}
        onSteps={toSteps}
        remix={remix}
        onRemixUsed={() => setRemix(null)}
        onFresh={() => {
          orderRef.current = null
          setOrder(null)
          setBeats(null)
          setStoryboard({})
          setCard(null)
        }}
      />
    )
  } else if (view === 'brief' || !order) {
    content = <BriefStep order={order} onSaved={(o) => { applyOrder(o); setView('media') }} />
  } else if (view === 'media') {
    content = (
      <MediaStep
        order={order}
        model={model}
        localUrls={localUrls}
        addLocalUrl={addLocalUrl}
        sessionUploads={sessionUploads}
        onOrder={applyOrder}
        onBack={() => setView('brief')}
        onContinue={(o) => { applyOrder(o); setView('model') }}
      />
    )
  } else if (view === 'model') {
    content = (
      <ModelStep
        order={order}
        onBack={() => setView('media')}
        onSaved={(o, changed) => {
          applyOrder(o)
          if (changed) {
            // Outro modelo = outras batidas: roteiro, storyboard e cartão da versão anterior não valem mais.
            setBeats(null)
            setStoryboard({})
            setCard(null)
          }
          setView('script')
        }}
      />
    )
  } else if (view === 'script' && model) {
    content = (
      <ScriptStep
        key={`${order.id}:${model.id}`}
        order={order}
        model={model}
        initialBeats={beats}
        onBack={() => setView('model')}
        onSaved={(o, b) => { setOrder(o); setBeats(b); setView('voice') }}
      />
    )
  } else if (view === 'voice' && model && beats) {
    content = <VoiceStep order={order} firstBeat={beats[0] ?? ''} onBack={() => setView('script')} onSaved={(o) => { setOrder(o); setView('storyboard') }} />
  } else if (view === 'storyboard' && model && beats) {
    content = (
      <StoryboardStep
        order={order}
        model={model}
        beats={beats}
        storyboard={storyboard}
        setStoryboard={setStoryboard}
        localUrls={localUrls}
        card={card}
        onCard={setCard}
        onBack={() => setView('voice')}
        onContinue={() => setView('render')}
      />
    )
  } else if (view === 'render' && model && beats && card && reach >= 6) {
    content = (
      <RenderStep
        order={order}
        model={model}
        beats={beats}
        storyboard={storyboard}
        card={card}
        onBack={() => setView('storyboard')}
        onStarted={(s) => {
          setRender({ renderId: s.render_id, seconds: s.seconds, topic: s.topic })
          setOrder({ ...order, status: 'rendering' })
          setView('progress')
        }}
        onState={(st) => {
          setRenderState(st)
          if (st.status === 'delivered' || st.status === 'reviewed') setView('delivery')
          else if (st.status === 'failed') setView('failed')
          else {
            setRender({ renderId: st.render_id, seconds: st.seconds ?? model.seconds, topic: st.topic ?? '' })
            setView('progress')
          }
        }}
      />
    )
  } else if (view === 'progress' && render) {
    content = (
      <ProgressView
        orderId={order.id}
        render={render}
        busyNew={busyNew}
        newError={newError}
        onStartNew={() => void startNew(order, 'retry')}
        onDone={(st) => { setRenderState(st); setOrder({ ...order, status: 'delivered' }); setView('delivery') }}
        onFailed={(st) => { setRenderState(st); setOrder({ ...order, status: 'failed' }); setView('failed') }}
        onDraft={(st) => {
          // O servidor devolveu o pedido a rascunho (ex.: sem crédito no compose): volta ao passo de render.
          const back: AdsOrder = { ...order, status: 'draft' }
          orderRef.current = back
          setRenderState(st)
          setOrder(back)
          setRender(null)
          const r = reachableIndex(back, beats, card, storyboard)
          setView(r >= 6 ? 'render' : STEPS[Math.min(r, 5)].id)
        }}
      />
    )
  } else if (view === 'delivery') {
    content = (
      <DeliveryView
        order={order}
        state={renderState}
        busyNew={busyNew}
        newError={newError}
        onAnother={() => void startNew(order, 'another')}
        onRemix={adsAutoVisible(access) ? (r) => {
          // Novo pedido (o de origem fica entregue como está), aberto direto na conferência do modo IA.
          setRemix({ ...r, base: order })
          orderRef.current = null
          setOrder(null)
          setBeats(null)
          setStoryboard({})
          setCard(null)
          setRender(null)
          setRenderState(null)
          setMode('ai')
          setView('brief')
        } : undefined}
      />
    )
  } else if (view === 'failed') {
    const code = failureCode(renderState?.failure)
    content = (
      <div className="card adsw-panel">
        <h2 tabIndex={-1} data-step-heading>This ad did not render</h2>
        <p className="adsw-lead" role="alert">{failureText(renderState?.failure)}</p>
        {code ? <p className="adsw-hint">Details: {code}</p> : null}
        <p className="adsw-hint">Try again with the same brief, photos, script and voice. You only confirm your photos and continue.</p>
        <div className="adsw-actions">
          <button type="button" className="adsw-btn" disabled={busyNew} onClick={() => void startNew(order, 'retry')}>
            {busyNew ? 'Preparing…' : 'Try again with the same details'}
          </button>
          <Link className="adsw-link" href="/history">My Videos</Link>
        </div>
        {newError ? <p className="adsw-err" role="alert">{newError}</p> : null}
      </div>
    )
  } else {
    // Estado incoerente (ex.: roteiro perdido): volta ao primeiro passo que falta.
    content = (
      <div className="card adsw-panel">
        <p className="adsw-lead">Let’s pick up where you left off.</p>
        <button type="button" className="adsw-btn" onClick={() => setView(STEPS[Math.min(reach, 5)].id)}>Continue</button>
      </div>
    )
  }

  const showSteps = boot.kind === 'ready' && stepIndex >= 0 && !(autoOn && mode === 'ai')

  return (
    <div className="stu adsw" data-step={view} ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ADS_WIZARD_CSS + ADS_WIZARD_THEME_CSS }} />
      <header className="adsw-header">
        <h1>Studio Ads</h1>
        <p className="sub">Your photos, your logo, your offer — a narrated vertical ad you can download and post.</p>
      </header>
      {showSteps ? (
        <nav className="adsw-steps" aria-label="Steps">
          <ol>
            {STEPS.map((s, i) => {
              const cls = i === stepIndex ? 'on' : i <= reach ? 'done' : ''
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={cls}
                    disabled={i > reach || i === stepIndex}
                    aria-current={i === stepIndex ? 'step' : undefined}
                    onClick={() => setView(s.id)}
                  >
                    <span className="sn" aria-hidden="true">{i + 1}</span>
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}
      {autoOn ? (
        <div className="row adsw-mode" role="group" aria-label="How do you want to make this ad?">
          <button type="button" className="pill" aria-pressed={mode === 'ai'} onClick={() => setMode('ai')}>AI makes it</button>
          <button type="button" className="pill" aria-pressed={mode === 'steps'} onClick={toSteps}>Step by step</button>
        </div>
      ) : null}
      {content}
    </div>
  )
}

/** KINEO-ADS-KIT-MARCA-2026-09-26 — o "kit da marca" sem tabela nova: a marca do anúncio mais recente que tem logo e
 *  contato. Os pedidos já guardam brief e mídia no servidor; o kit é só reaproveitar (item 4 da pesquisa de concorrentes). */
function lastBrandFrom(orders: AdsOrder[]): { brief: AdsBrief; logo: AdsMediaItem } | null {
  for (const o of orders) {
    const logo = orderMedia(o).find((m) => m.isLogo)
    if (logo && o.brief && o.brief.business?.trim() && o.brief.contact?.trim()) return { brief: o.brief, logo }
  }
  return null
}

/** Frase inicial a partir da marca salva: a pessoa só troca a oferta. */
function brandSentence(brief: AdsBrief): string {
  const [name, sells] = splitBusiness(brief.business)
  return [sells ? `${name}, ${sells}.` : `${name}.`, brief.offer ? `${brief.offer}.` : '', `Contact: ${brief.contact}.`].filter(Boolean).join(' ')
}

// ─── modo "a IA faz o anúncio" ──────────────────────────────────────────────────
// KINEO-ADS-IA-FAZ-2026-09-26 — fundador (25/09 à noite): "a pessoa manda uma foto, um vídeo, e ela quer uma IA ... ela
// não vai precisar fazer muita coisa". Uma tela: logo + fotos/vídeos + UMA frase. A IA (/api/ads/auto-brief) monta o
// brief e escolhe o formato; a pessoa CONFIRMA nome, oferta e contato (o roteiro trata o brief como fato — painel de
// 25/09) e aperta um botão. Daí em diante tudo é automático e usa os mesmos caminhos do passo a passo: roteiro
// (/api/ads/script, 1ª versão aprovada pelo validador), voz padrão, storyboard automático, cartão final desenhado sem
// clique e o mesmo /api/ads/render. O pedido fica no servidor: a pessoa pode trocar para o passo a passo a qualquer hora
// e continuar do mesmo ponto.

type AutoProposal = {
  brief: AdsBrief
  needs: string[]
  template: AdsModelId | null
  eligible: AdsModelId[]
  missing_media: string[]
}

const AUTO_PLACEHOLDER = 'Example: Pão Dourado bakery in Pinheiros. Fresh French bread at R$1 until Friday. Order on WhatsApp +55 11 98765-4321.'
const AUTO_STAGES = ['Writing your script…', 'Choosing the voice and the scenes…', 'Drawing your end card…', 'Starting the render…'] as const

function AdsAutoPanel({
  order,
  localUrls,
  addLocalUrl,
  sessionUploads,
  onOrder,
  onStarted,
  onSteps,
  onFresh,
  remix,
  onRemixUsed,
}: {
  order: AdsOrder | null
  localUrls: Record<string, string>
  addLocalUrl: (id: string, url: string) => void
  sessionUploads: React.MutableRefObject<Set<string>>
  onOrder: (o: AdsOrder) => void
  onStarted: (s: AdsRenderStarted, model: AdsModel, beats: string[], storyboard: Storyboard, card: CardInfo) => void
  onSteps: () => void
  onFresh: () => void
  remix: Remix | null
  onRemixUsed: () => void
}) {
  const [phase, setPhase] = useState<'input' | 'thinking' | 'confirm' | 'making'>('input')
  const [text, setText] = useState('')
  const [consent, setConsent] = useState(Boolean(order?.consent_at))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outOfCredits, setOutOfCredits] = useState<{ needed: number | null; balance: number | null } | null>(null)
  const [proposal, setProposal] = useState<AutoProposal | null>(null)
  const [business, setBusiness] = useState('')
  const [offer, setOffer] = useState('')
  const [contact, setContact] = useState('')
  const [language, setLanguage] = useState(defaultLanguage())
  const [template, setTemplate] = useState<AdsModelId | null>(null)
  const [captions, setCaptions] = useState(true) // KINEO-ADS-SEM-LEGENDA-2026-09-26
  // KINEO-ADS-ESTILO-2026-09-26 — formato, estilo da legenda e clima da trilha (padrões = o anúncio de sempre)
  const [format, setFormat] = useState<AdFormat>('9:16')
  const [captionStyle, setCaptionStyle] = useState<AdCaptionStyle>('bold')
  const [music, setMusic] = useState<AdMusicMood>('auto')
  const [stage, setStage] = useState(0)
  const orderLocal = useRef<AdsOrder | null>(order)
  orderLocal.current = order ?? orderLocal.current
  const mediaRef = useRef<AdsMediaItem[]>(orderMedia(order))
  // KINEO-ADS-IA-UPLOAD-2026-09-26 — relatório do Cowork: /ads/new abria o modo IA com o logo de um rascunho de outro
  // dia, sem avisar. O pedido de rascunho continua sendo retomado (o estado vive no servidor), mas a tela diz de quando
  // ele é e oferece começar do zero.
  const createdHere = useRef(false)
  // KINEO-ADS-KIT-MARCA-2026-09-26 — marca do último anúncio (logo + nome + contato), oferecida quando o pedido é novo.
  const [brand, setBrand] = useState<{ brief: AdsBrief; logo: AdsMediaItem } | null>(null)
  const [link, setLink] = useState('') // KINEO-ADS-LINK-2026-09-26
  const [linkNote, setLinkNote] = useState<string | null>(null)
  // KINEO-ADS-VERSOES-2026-09-26 — abertura a evitar numa versão A/B (o ângulo do anúncio de origem).
  const [avoidAngle, setAvoidAngle] = useState<string | null>(null)
  const remixDone = useRef(false)
  useEffect(() => {
    if (!remix || remixDone.current) return
    remixDone.current = true
    const base = remix.base
    const baseModel = adsModelById(base.template)
    if (!base.brief || !baseModel) { onRemixUsed(); return }
    const brief: AdsBrief = { ...base.brief, language: remix.language ?? base.brief.language }
    void (async () => {
      setPhase('thinking')
      const created = await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ brief }) })
      if (!created.ok) { setPhase('input'); onRemixUsed(); return setError(errorText(created)) }
      // A mesma mídia que a pessoa já declarou ser dela no anúncio de origem; o consentimento vale para esses arquivos.
      const withMedia = await patchOrder(created.data.order.id, { media: orderMedia(base).map(stripItem), consent: true, template: baseModel.id })
      if (!withMedia.ok) { setPhase('input'); onRemixUsed(); return setError(errorText(withMedia)) }
      const o = withMedia.data.order
      orderLocal.current = o
      mediaRef.current = orderMedia(o)
      createdHere.current = true
      onOrder(o)
      setConsent(true)
      setProposal({ brief, needs: [], template: baseModel.id, eligible: [baseModel.id], missing_media: [] })
      const [name, sells] = splitBusiness(brief.business)
      setBusiness(sells ? `${name}${BUSINESS_SEP}${sells}` : name)
      setOffer(brief.offer)
      setContact(brief.contact)
      setLanguage(brief.language)
      setTemplate(baseModel.id)
      if (remix.format) setFormat(remix.format)
      setAvoidAngle(remix.kind === 'opening' ? angleOf(base.script_angle).replace(/_edited$/, '') : null)
      void trackEvent('ads_auto_started', { order_id: o.id, remix: remix.kind, from_order: base.id, language: brief.language, format: remix.format ?? null })
      setPhase('confirm')
      onRemixUsed()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remix])
  useEffect(() => {
    if (order) return
    let alive = true
    void callJson<{ orders?: AdsOrder[] }>('/api/ads/orders').then((r) => {
      if (alive && r.ok && Array.isArray(r.data.orders)) setBrand(lastBrandFrom(r.data.orders))
    })
    return () => { alive = false }
  }, [order])
  const media = orderMedia(order)
  const { logo, rest } = mediaSummary(media)
  const srcOf = (m: AdsMediaItem) => localUrls[m.footageId] ?? m.url
  const chosenModel = adsModelById(template)
  const logoInput = useRef<HTMLInputElement>(null)
  const mediaInput = useRef<HTMLInputElement>(null)

  async function ensureOrder(): Promise<AdsOrder | null> {
    if (orderLocal.current) return orderLocal.current
    const r = await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) })
    if (!r.ok) {
      if (r.status === 401) goLogin()
      setError(errorText(r))
      return null
    }
    orderLocal.current = r.data.order
    createdHere.current = true
    onOrder(r.data.order)
    void trackEvent('ads_auto_started', { order_id: r.data.order.id })
    return r.data.order
  }

  // KINEO-ADS-IA-UPLOAD-2026-09-26 — DEFEITO (achado pelo Cowork): a lista vinha como FileList VIVA e só era copiada
  // depois do `await ensureOrder()`; o onChange zera o input logo em seguida (`value = ''`), então a lista chegava
  // vazia e nada subia, sem erro. Agora o onChange copia os arquivos ANTES de zerar, e lista vazia vira mensagem.
  async function addFiles(files: File[], isLogo: boolean) {
    if (busy) return setError('Wait for the current upload to finish.')
    if (!files.length) return setError('No file was received. Pick the file again.')
    setError(null)
    const o = await ensureOrder()
    if (!o) return
    let queue = isLogo ? files.slice(0, 1) : files
    const room = MAX_MEDIA - mediaRef.current.filter((m) => !m.isLogo).length
    if (!isLogo && room <= 0) return setError(`You already have ${MAX_MEDIA} photos and videos.`)
    if (!isLogo) queue = queue.slice(0, room)
    for (let i = 0; i < queue.length; i++) {
      setBusy(isLogo ? 'Uploading your logo…' : queue.length > 1 ? `Uploading ${i + 1} of ${queue.length}…` : 'Uploading…')
      try {
        const up = await uploadFootage(queue[i], { isLogo })
        sessionUploads.current.add(up.footageId)
        if (up.localUrl) addLocalUrl(up.footageId, up.localUrl)
        const item = stripItem(up)
        void trackEvent('ads_media_uploaded', { order_id: o.id, kind: item.kind, bytes: item.bytes, is_logo: isLogo, mode: 'auto' })
        const current = mediaRef.current
        const next = isLogo ? [item, ...current.filter((m) => !m.isLogo)] : [...current, item]
        const r = await patchOrder(o.id, { media: next.map(stripItem) })
        if (!r.ok) {
          if (r.status === 401) return goLogin()
          setError(errorText(r))
          break
        }
        mediaRef.current = orderMedia(r.data.order)
        orderLocal.current = r.data.order
        onOrder(r.data.order)
        setConsent(false)
      } catch (e) {
        const reason = e instanceof AdsUploadError ? e.reason : 'upload_failed'
        void trackEvent('ads_media_refused', { order_id: o.id, reason, is_logo: isLogo, mode: 'auto' })
        if (reason === 'unauthenticated') return goLogin()
        setError(`${queue[i].name || 'File'}: ${e instanceof Error ? e.message : 'The upload did not finish.'}`)
        break
      }
    }
    setBusy(null)
  }

  async function applyBrand() {
    if (!brand || busy) return
    setError(null)
    setBusy('Loading your brand…')
    const created = await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ brief: brand.brief }) })
    if (!created.ok) {
      setBusy(null)
      if (created.status === 401) return goLogin()
      return setError(errorText(created))
    }
    const withLogo = await patchOrder(created.data.order.id, { media: [stripItem(brand.logo)] })
    setBusy(null)
    const o = withLogo.ok ? withLogo.data.order : created.data.order
    orderLocal.current = o
    mediaRef.current = orderMedia(o)
    createdHere.current = true
    onOrder(o)
    setText(brandSentence(brand.brief))
    void trackEvent('ads_auto_started', { order_id: o.id, brand_kit: true, logo_reused: withLogo.ok })
    if (!withLogo.ok) setError('Your saved logo could not be reused. Upload it again below.')
  }

  // KINEO-ADS-LINK-2026-09-26 — o servidor lê a página, salva as imagens na conta e devolve a frase; aqui só juntamos.
  async function readLink() {
    if (busy) return
    setError(null)
    setLinkNote(null)
    if (!link.trim()) return setError('Paste your website or product link first.')
    const o = await ensureOrder()
    if (!o) return
    setBusy('Reading your page…')
    const r = await callJson<{ text: string; media: AdsMediaItem[]; logo: AdsMediaItem | null; skipped: number; facts: { host: string; price: string | null } }>('/api/ads/from-link', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ order_id: o.id, url: link }) })
    if (!r.ok) {
      setBusy(null)
      if (r.status === 401) return goLogin()
      if (r.code === 'daily_limit') return setError('You read enough links for today. Paste your text and photos instead.')
      return setError(typeof r.body.message === 'string' ? r.body.message : errorText(r))
    }
    const current = mediaRef.current
    const hasLogo = current.some((m) => m.isLogo)
    const room = MAX_MEDIA - current.filter((m) => !m.isLogo).length
    const next = [
      ...(!hasLogo && r.data.logo ? [r.data.logo] : []),
      ...current,
      ...r.data.media.slice(0, Math.max(0, room)),
    ]
    const saved = await patchOrder(o.id, { media: next.map(stripItem) })
    setBusy(null)
    if (!saved.ok) return setError(errorText(saved))
    mediaRef.current = orderMedia(saved.data.order)
    orderLocal.current = saved.data.order
    onOrder(saved.data.order)
    setConsent(false)
    setText(r.data.text)
    const got = r.data.media.length + (!hasLogo && r.data.logo ? 1 : 0)
    setLinkNote(got ? `Read ${r.data.facts.host}: ${r.data.media.length} photo(s)${!hasLogo && r.data.logo ? ' and the logo' : ''}. Check the text below and add anything missing.` : `Read ${r.data.facts.host}, but it had no usable photos. Add at least 2 photos or videos below.`)
  }

  function startFresh() {
    orderLocal.current = null
    mediaRef.current = []
    createdHere.current = false
    setConsent(false)
    setText('')
    setError(null)
    onFresh()
  }

  async function removeItem(item: AdsMediaItem) {
    const o = orderLocal.current
    if (!o || busy) return
    setBusy('Removing…')
    const r = await patchOrder(o.id, { media: mediaRef.current.filter((m) => m.footageId !== item.footageId).map(stripItem) })
    setBusy(null)
    if (!r.ok) return setError(errorText(r))
    mediaRef.current = orderMedia(r.data.order)
    orderLocal.current = r.data.order
    onOrder(r.data.order)
    setConsent(false)
  }

  async function analyze() {
    setError(null)
    if (!logo) return setError('Add your logo — it closes the ad.')
    // KINEO-ADS-IA-1FOTO-1VIDEO-2026-09-26 — foto e vídeo contam igual no modo IA; o piso é 2 itens.
    if (rest.length < ADS_AUTO_MIN_ITEMS) return setError(`Add at least ${ADS_AUTO_MIN_ITEMS} photos or videos — for example one photo and one video.`)
    if (text.trim().length < 12) return setError('Write one or two sentences: what you sell, the offer, and how customers reach you.')
    if (!consent) return setError('Confirm you own these photos and videos, or have permission to use them.')
    const o = orderLocal.current
    if (!o) return
    setPhase('thinking')
    const c = await patchOrder(o.id, { media: mediaRef.current.map(stripItem), consent: true })
    if (!c.ok) {
      setPhase('input')
      if (c.status === 401) return goLogin()
      return setError(errorText(c))
    }
    orderLocal.current = c.data.order
    onOrder(c.data.order)
    const r = await callJson<AutoProposal>('/api/ads/auto-brief', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ order_id: o.id, text, language }) })
    if (!r.ok) {
      setPhase('input')
      if (r.status === 401) return goLogin()
      if (r.code === 'daily_limit') return setError('You reached today’s limit for AI ads. Try again tomorrow, or build this one step by step.')
      return setError(errorText(r))
    }
    const p = r.data
    if (!p.template) {
      setPhase('input')
      return setError(p.missing_media.length ? `To make an ad we still need: ${p.missing_media.join(', ')}.` : 'We could not pick a format for these photos. Try step by step.')
    }
    const [name, sells] = splitBusiness(p.brief.business)
    setProposal(p)
    setBusiness(sells ? `${name}${BUSINESS_SEP}${sells}` : name)
    setOffer(p.brief.offer)
    setContact(p.brief.contact)
    setLanguage(p.brief.language || language)
    setTemplate(p.template)
    setPhase('confirm')
  }

  async function make() {
    const o = orderLocal.current
    const model = chosenModel
    if (!o || !model || !proposal) return
    setError(null)
    setOutOfCredits(null)
    if (!business.trim()) return setError('Add the name of your business.')
    if (!contact.trim()) return setError('Add how customers reach you: phone, WhatsApp, address or link.')
    const brief: AdsBrief = { ...proposal.brief, business: business.trim(), offer: offer.trim(), contact: contact.trim(), language }
    setPhase('making')
    setStage(0)
    void trackEvent('ads_auto_confirmed', { order_id: o.id, template: model.id, credits: model.credits, edited: brief.business !== proposal.brief.business || brief.offer !== proposal.brief.offer || brief.contact !== proposal.brief.contact })
    const fail = (msg: string) => { setPhase('confirm'); setError(msg) }

    const saved = await patchOrder(o.id, { brief, template: model.id })
    if (!saved.ok) return saved.status === 401 ? goLogin() : fail(errorText(saved))
    onOrder(saved.data.order)

    // 1. roteiro: a 1ª versão que o validador aprovou (nenhum número fora do brief, contato na última batida).
    const s = await callJson<{ versions: AdsScriptVersion[] }>('/api/ads/script', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ order_id: o.id }) })
    if (!s.ok || !Array.isArray(s.data.versions) || !s.data.versions.length) {
      if (!s.ok && s.status === 401) return goLogin()
      return fail(!s.ok && s.code === 'no_script' ? 'The AI could not write a script with these facts. Add one more detail about your offer and try again.' : errorText(s.ok ? { status: 502, code: 'no_script', message: null } : s))
    }
    // KINEO-ADS-VERSOES-2026-09-26 — versão A/B: a primeira abertura DIFERENTE da do anúncio de origem.
    const v = s.data.versions.find((x) => x.angle !== avoidAngle) ?? s.data.versions[0]
    setStage(1)
    const withScript = await patchOrder(o.id, { script: v.beats.join('\n\n'), script_angle: scriptAngleFor(v.angle, model.id), voice: ADS_DEFAULT_VOICE })
    if (!withScript.ok) return fail(errorText(withScript))
    onOrder(withScript.data.order)
    const m = orderMedia(withScript.data.order)
    const sb = defaultStoryboard(model, m)

    // 2. cartão final: o mesmo desenho do passo a passo, sem clique.
    setStage(2)
    const logoItem = m.find((x) => x.isLogo)
    if (!logoItem) return fail('Your logo is missing. Add it and try again.')
    let cardId: string
    try {
      const img = await loadLogoImage(srcOf(logoItem))
      const canvas = document.createElement('canvas')
      const [bizName] = splitBusiness(brief.business)
      drawEndCard(canvas, { logo: img, business: bizName, offer: brief.offer, ctaLabel: endCardCtaLabel(brief.cta, brief.language), contact: brief.contact })
      const size = adFormatSize(format)
      const file = await toPngFile(fitCardToFormat(canvas, size.width, size.height))
      const up = await uploadFootage(file, { isLogo: false })
      if (up.localUrl) URL.revokeObjectURL(up.localUrl)
      cardId = up.footageId
      void trackEvent('ads_card_rendered', { order_id: o.id, mode: 'auto' })
    } catch (e) {
      if (e instanceof AdsUploadError && e.reason === 'unauthenticated') return goLogin()
      return fail('Your logo could not be placed on the end card. Upload it again as PNG or JPG.')
    }

    // 3. render: o mesmo corpo do passo "Render".
    setStage(3)
    const n = model.beats.length
    const body: AdsRenderRequest = {
      order_id: o.id,
      voice: ADS_DEFAULT_VOICE,
      beats: v.beats.map((b) => b.replace(/\s+/g, ' ').trim()),
      storyboard: Array.from({ length: n - 1 }, (_, i) => ({ beatIndex: i, footageIds: (sb[i] ?? []).slice(0, ADS_MAX_MEDIA_PER_BEAT) })),
      card_footage_id: cardId,
      captions,
      aspect: format,
      captionStyle,
      music,
    }
    void trackEvent('ads_preview_confirmed', { order_id: o.id, credits: model.credits, scenes: n, user_media_scenes: n - 1, stock_scenes: 0, mode: 'auto', captions })
    const r = await callJson<AdsRenderStarted>('/api/ads/render', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
    if (r.ok) return onStarted(r.data, model, v.beats, sb, { id: cardId, sig: 'auto' })
    if (r.status === 401) return goLogin()
    if (r.status === 402 || r.code === 'out_of_credits') {
      setPhase('confirm')
      return setOutOfCredits({ needed: typeof r.body.needed === 'number' ? r.body.needed : model.credits, balance: typeof r.body.balance === 'number' ? r.body.balance : null })
    }
    return fail(errorText(r))
  }

  if (phase === 'thinking') {
    return (
      <div className="card adsw-panel" aria-busy="true">
        <h2 tabIndex={-1} data-step-heading>Reading your business…</h2>
        <p className="adsw-lead">The AI is turning your sentence into an ad plan and picking the best format for your photos.</p>
      </div>
    )
  }

  if (phase === 'making') {
    return (
      <div className="card adsw-panel" aria-busy="true">
        <h2 tabIndex={-1} data-step-heading>Making your ad</h2>
        <ol className="adsw-auto-stages">
          {AUTO_STAGES.map((label, i) => (
            <li key={label} data-state={i < stage ? 'done' : i === stage ? 'on' : 'todo'}>{label}</li>
          ))}
        </ol>
        <p className="adsw-hint">Keep this tab open for a few seconds. After the render starts you can close it — the ad lands in My Videos.</p>
      </div>
    )
  }

  if (phase === 'confirm' && proposal && chosenModel) {
    const alternatives = proposal.eligible.map((id) => adsModelById(id)).filter((x): x is AdsModel => Boolean(x))
    return (
      <div className="card adsw-panel">
        <h2 tabIndex={-1} data-step-heading>Check the facts, then we make it</h2>
        <p className="adsw-lead">The ad only says what is written here. Fix anything that is not exactly right.</p>
        <label className="adsw-f">
          <span>Business <b className="adsw-req">required</b></span>
          <input value={business} maxLength={200} onChange={(e) => setBusiness(e.target.value)} />
        </label>
        <label className="adsw-f">
          <span>Offer</span>
          <small>Price, discount or deadline. Leave empty if there is no offer.</small>
          <input value={offer} maxLength={300} onChange={(e) => setOffer(e.target.value)} />
        </label>
        <label className="adsw-f">
          <span>How customers reach you <b className="adsw-req">required</b></span>
          <small>Said at the end of the ad and printed on the last frame, exactly as written.</small>
          <input value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
        </label>
        <label className="adsw-f">
          <span>Narration language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
          </select>
        </label>
        <div className="adsw-f">
          <span>Format the AI picked for your photos</span>
          <div className="row">
            {alternatives.map((alt) => (
              <button key={alt.id} type="button" className="pill" aria-pressed={alt.id === template} onClick={() => setTemplate(alt.id)}>
                {alt.name} · {alt.seconds}s
              </button>
            ))}
          </div>
          <small>{chosenModel.goal}. {chosenModel.seconds} seconds · {chosenModel.credits} credits.</small>
        </div>
        <div className="adsw-f">
          <span>Format</span>
          <div className="row" role="group" aria-label="Format">
            {AD_FORMATS.map((f) => (
              <button key={f.id} type="button" className="pill" aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>{f.label}</button>
            ))}
          </div>
          <small>{AD_FORMATS.find((f) => f.id === format)?.hint}</small>
        </div>
        <div className="adsw-f">
          <span>Captions on screen</span>
          <div className="row" role="group" aria-label="Captions on screen">
            {AD_CAPTION_STYLES.map((cs) => (
              <button key={cs.id} type="button" className="pill" aria-pressed={captions && captionStyle === cs.id} onClick={() => { setCaptions(true); setCaptionStyle(cs.id) }}>{cs.label}</button>
            ))}
            <button type="button" className="pill" aria-pressed={!captions} onClick={() => setCaptions(false)}>No captions</button>
          </div>
          <small>{captions ? AD_CAPTION_STYLES.find((cs) => cs.id === captionStyle)?.hint : 'The voice narrates the ad either way.'}</small>
        </div>
        <div className="adsw-f">
          <span>Music</span>
          <div className="row" role="group" aria-label="Music">
            {AD_MUSIC_MOODS.map((m) => (
              <button key={m.id} type="button" className="pill" aria-pressed={music === m.id} onClick={() => setMusic(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>
        {outOfCredits ? (
          <p className="adsw-warn" role="alert">
            This ad needs {outOfCredits.needed ?? chosenModel.credits} credits{outOfCredits.balance !== null ? ` and you have ${outOfCredits.balance}` : ''}. <Link href="/pricing">Get credits</Link> and come back — everything here is saved.
          </p>
        ) : null}
        {error ? <p className="adsw-err" role="alert">{error}</p> : null}
        <div className="adsw-actions">
          <button type="button" className="adsw-btn" onClick={() => void make()}>Make my ad · {chosenModel.credits} credits</button>
          <button type="button" className="adsw-btn ghost" onClick={() => { setPhase('input'); setError(null) }}>Back</button>
          <button type="button" className="adsw-link" onClick={onSteps}>Edit every detail step by step</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card adsw-panel">
      <h2 tabIndex={-1} data-step-heading>Let the AI make your ad</h2>
      <p className="adsw-lead">Add your logo and a few photos or videos, tell us about your business in one or two sentences, and the AI writes, narrates and edits the ad.</p>
      {!order && brand ? (
        <div className="adsw-f" role="group" aria-label="Your brand">
          <span>Your brand</span>
          <div className="adsw-logo">
            <div className="adsw-tile"><MediaThumb item={brand.logo} src={srcOf(brand.logo)} /></div>
            <div>
              <b>{splitBusiness(brand.brief.business)[0]}</b>
              <small style={{ display: 'block' }}>{brand.brief.contact}</small>
            </div>
            <button type="button" className="adsw-btn" disabled={Boolean(busy)} onClick={() => void applyBrand()}>Use my brand</button>
          </div>
          <small>Logo, name and contact from your last ad. You only add photos and the new offer.</small>
        </div>
      ) : null}
      {order && !createdHere.current && (media.length > 0 || order.brief) ? (
        <p className="adsw-warn" role="status">
          Continuing your unfinished ad from {new Date(order.created_at).toLocaleDateString()} — its logo and photos are below.{' '}
          <button type="button" className="adsw-link" disabled={Boolean(busy)} onClick={startFresh}>Start a new ad instead</button>
        </p>
      ) : null}
      <div className="adsw-f">
        <span>Start from your website or product link <small style={{ fontWeight: 400 }}>(optional)</small></span>
        <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <input type="url" inputMode="url" placeholder="https://yourshop.com/product" value={link} onChange={(e) => setLink(e.target.value)} disabled={Boolean(busy)} style={{ flex: 1, minWidth: 0 }} />
          <button type="button" className="adsw-btn ghost" disabled={Boolean(busy) || !link.trim()} onClick={() => void readLink()}>Read my page</button>
        </div>
        <small>We read the title, description, price and photos from the page. You check everything before the ad is made.</small>
        {linkNote ? <p className="adsw-hint" role="status" style={{ margin: '6px 0 0' }}>{linkNote}</p> : null}
      </div>
      <div className="adsw-f">
        <span>Your logo <b className="adsw-req">required</b></span>
        <div className="adsw-logo">
          {logo ? (
            <div className="adsw-tile">
              <MediaThumb item={logo} src={srcOf(logo)} />
              <button type="button" className="adsw-x" aria-label="Remove logo" disabled={Boolean(busy)} onClick={() => void removeItem(logo)}>✕</button>
            </div>
          ) : null}
          <button type="button" className="adsw-btn ghost" disabled={Boolean(busy)} onClick={() => logoInput.current?.click()}>{logo ? 'Change logo' : 'Upload logo'}</button>
          <input ref={logoInput} type="file" accept={ADS_UPLOAD_ACCEPT_LOGO} hidden onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(picked, true) }} />
        </div>
      </div>
      <div className="adsw-f">
        <span>Photos and videos <b className="adsw-req">at least {ADS_AUTO_MIN_ITEMS}, photos or videos</b></span>
        <small>Your product, place, team or work. One photo and one video is enough; more give the AI more to show.</small>
        <div className="adsw-media">
          {rest.map((m, i) => (
            <div className="adsw-tile" key={m.footageId}>
              <MediaThumb item={m} src={srcOf(m)} />
              <span className="adsw-tag">{m.kind === 'video' ? 'Video' : `Photo ${i + 1}`}</span>
              <button type="button" className="adsw-x" aria-label={`Remove ${m.kind} ${i + 1}`} disabled={Boolean(busy)} onClick={() => void removeItem(m)}>✕</button>
            </div>
          ))}
          {rest.length < MAX_MEDIA ? (
            <button type="button" className="adsw-add" disabled={Boolean(busy)} onClick={() => mediaInput.current?.click()}>
              <span className="plus" aria-hidden="true">+</span>
              Add photos or videos
            </button>
          ) : null}
          <input ref={mediaInput} type="file" accept={ADS_UPLOAD_ACCEPT_MEDIA} multiple hidden onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(picked, false) }} />
        </div>
      </div>
      <label className="adsw-f">
        <span>About your business <b className="adsw-req">required</b></span>
        <small>What you sell, the offer (if any), and how customers reach you. Only what you write here goes in the ad.</small>
        <textarea className="adsw-ta" rows={4} maxLength={1500} value={text} placeholder={AUTO_PLACEHOLDER} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="adsw-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I own these photos and videos, or have permission to use them in an ad.</span>
      </label>
      {busy ? <p className="adsw-hint" role="status">{busy}</p> : null}
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={Boolean(busy)} onClick={() => void analyze()}>Make the plan</button>
        <button type="button" className="adsw-link" onClick={onSteps}>I prefer step by step</button>
      </div>
    </div>
  )
}

// ─── passo 1: brief ─────────────────────────────────────────────────────────────────────────

function BriefStep({ order, onSaved }: { order: AdsOrder | null; onSaved: (o: AdsOrder) => void }) {
  const initial = order?.brief ?? null
  const [nameInit, sellsInit] = splitBusiness(initial?.business ?? '')
  const [name, setName] = useState(nameInit)
  const [sells, setSells] = useState(sellsInit)
  const [offer, setOffer] = useState(initial?.offer ?? '')
  const [cta, setCta] = useState<AdsBrief['cta']>(initial?.cta ?? 'call')
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [language, setLanguage] = useState(() => {
    const l = (initial?.language ?? '').slice(0, 2)
    return NARRATION_LANGUAGES.some((x) => x.code === l) ? l : defaultLanguage()
  })
  const [tone, setTone] = useState<AdsBrief['tone']>(initial?.tone ?? 'warm')
  const [audience, setAudience] = useState(initial?.audience ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const ctaOpt = CTA_OPTIONS.find((c) => c.id === cta) ?? CTA_OPTIONS[0]

  const missing = {
    name: !name.trim(),
    sells: !sells.trim(),
    contact: !contact.trim(),
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setTouched(true)
    if (missing.name || missing.sells) return setError('Tell us your business name and what you sell.')
    if (missing.contact) return setError(`Add your ${ctaOpt.contact.toLowerCase()} so customers can reach you.`)
    setError(null)
    setSaving(true)
    const brief: AdsBrief = {
      business: `${name.trim()}${BUSINESS_SEP}${sells.trim()}`,
      offer: offer.trim(),
      cta,
      contact: contact.trim(),
      language,
      tone,
      audience: audience.trim(),
      extra: initial?.extra ?? {},
    }
    const r = order
      ? await patchOrder(order.id, { brief })
      : await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ brief }) })
    setSaving(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      return setError(r.status === 429 ? 'You have too many unfinished ads. Finish one first, or write to hello@usekineo.com.' : errorText(r))
    }
    onSaved(r.data.order)
  }

  return (
    <form className="card" onSubmit={save} noValidate>
      <h2 tabIndex={-1} data-step-heading>Tell us about your business</h2>
      <p className="adsw-lead">Six quick answers. Numbers in your ad (prices, ratings, dates) come only from what you write here.</p>
      <div className="adsw-2">
        <label className="adsw-f">
          <span>Business name<b className="adsw-req" aria-hidden="true">*</b></span>
          <input type="text" value={name} maxLength={60} required autoComplete="organization" aria-invalid={touched && missing.name} placeholder="e.g. Sunrise Bakery" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="adsw-f">
          <span>What you sell<b className="adsw-req" aria-hidden="true">*</b></span>
          <input type="text" value={sells} maxLength={130} required aria-invalid={touched && missing.sells} placeholder="e.g. fresh bread, cakes and coffee" onChange={(e) => setSells(e.target.value)} />
        </label>
      </div>
      <label className="adsw-f">
        <span>Offer, price or deadline</span>
        <small>Optional. Write it exactly as you want it said.</small>
        <input type="text" value={offer} maxLength={300} placeholder="e.g. 2 croissants and a coffee for 5 dollars, until Sunday" onChange={(e) => setOffer(e.target.value)} />
      </label>
      <fieldset className="adsw-f" style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
        <legend className="adsw-legend">What should people do?<b className="adsw-req" aria-hidden="true">*</b></legend>
        <div className="row" role="group" aria-label="Call to action">
          {CTA_OPTIONS.map((c) => (
            <button key={c.id} type="button" aria-pressed={cta === c.id} className={`pill ${cta === c.id ? 'on' : ''}`} onClick={() => setCta(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="adsw-f">
        <span>{ctaOpt.contact}<b className="adsw-req" aria-hidden="true">*</b></span>
        <small>It appears on the last frame of the ad and is said in the narration.</small>
        <input type="text" value={contact} maxLength={200} required aria-invalid={touched && missing.contact} placeholder={ctaOpt.placeholder} onChange={(e) => setContact(e.target.value)} />
      </label>
      <div className="adsw-2">
        <label className="adsw-f">
          <span>Narration language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {NARRATION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </label>
        <label className="adsw-f">
          <span>Who it is for</span>
          <input type="text" value={audience} maxLength={200} placeholder="e.g. families in the neighborhood" onChange={(e) => setAudience(e.target.value)} />
        </label>
      </div>
      <fieldset className="adsw-f" style={{ border: 0, padding: 0, margin: '0 0 6px' }}>
        <legend className="adsw-legend">Tone</legend>
        <div className="row" role="group" aria-label="Tone">
          {TONES.map((t) => (
            <button key={t.id} type="button" aria-pressed={tone === t.id} className={`pill ${tone === t.id ? 'on' : ''}`} onClick={() => setTone(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="submit" className="adsw-btn" disabled={saving}>{saving ? 'Saving…' : 'Save and continue'}</button>
      </div>
    </form>
  )
}

// ─── passo 2: fotos, vídeos e logo ─────────────────────────────────────────────────────────

function MediaThumb({ item, src }: { item: AdsMediaItem; src: string }) {
  if (item.kind === 'video') {
    return <video src={src.startsWith('blob:') ? src : `${src}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" crossOrigin={src.startsWith('blob:') ? undefined : 'anonymous'} />
}

function MediaStep({
  order,
  model,
  localUrls,
  addLocalUrl,
  sessionUploads,
  onOrder,
  onBack,
  onContinue,
}: {
  order: AdsOrder
  model: AdsModel | null
  localUrls: Record<string, string>
  addLocalUrl: (id: string, url: string) => void
  sessionUploads: React.MutableRefObject<Set<string>>
  onOrder: (o: AdsOrder) => void
  onBack: () => void
  onContinue: (o: AdsOrder) => void
}) {
  const media = orderMedia(order)
  const mediaRef = useRef<AdsMediaItem[]>(media)
  mediaRef.current = media
  const { logo, rest, photos } = mediaSummary(media)
  const [consent, setConsent] = useState(Boolean(order.consent_at))
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [contError, setContError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const mediaInput = useRef<HTMLInputElement>(null)
  const srcOf = (m: AdsMediaItem) => localUrls[m.footageId] ?? m.url

  async function saveMedia(next: AdsMediaItem[]): Promise<string | null> {
    const r = await patchOrder(order.id, { media: next.map(stripItem) })
    if (!r.ok) {
      if (r.status === 401) goLogin()
      return errorText(r)
    }
    mediaRef.current = orderMedia(r.data.order)
    onOrder(r.data.order)
    setConsent(false)
    return null
  }

  async function removeFile(id: string) {
    const r = await callJson<{ ok: boolean }>(`/api/footage?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (r.ok) sessionUploads.current.delete(id)
  }

  async function addFiles(list: FileList | null, isLogo: boolean) {
    if (!list || !list.length || busy) return
    const files = Array.from(list)
    const errs: string[] = []
    setErrors([])
    setContError(null)
    let queue = isLogo ? files.slice(0, 1) : files
    if (!isLogo) {
      const room = MAX_MEDIA - mediaRef.current.filter((m) => !m.isLogo).length
      if (room <= 0) {
        void trackEvent('ads_media_refused', { order_id: order.id, reason: 'too_many' })
        setErrors([`You already have ${MAX_MEDIA} photos and videos. Remove one to add another.`])
        return
      }
      if (files.length > room) {
        void trackEvent('ads_media_refused', { order_id: order.id, reason: 'too_many' })
        errs.push(`Only ${room} more ${room === 1 ? 'file fits' : 'files fit'} — up to ${MAX_MEDIA} photos and videos per ad.`)
        queue = files.slice(0, room)
      }
    }
    for (let i = 0; i < queue.length; i++) {
      const f = queue[i]
      setBusy(isLogo ? 'Uploading your logo…' : queue.length > 1 ? `Uploading ${i + 1} of ${queue.length}…` : 'Uploading…')
      try {
        const up = await uploadFootage(f, { isLogo })
        sessionUploads.current.add(up.footageId)
        if (up.localUrl) addLocalUrl(up.footageId, up.localUrl)
        const item = stripItem(up)
        void trackEvent('ads_media_uploaded', { order_id: order.id, kind: item.kind, bytes: item.bytes, is_logo: isLogo })
        const current = mediaRef.current
        const prevLogo = isLogo ? current.find((m) => m.isLogo) ?? null : null
        const next = isLogo ? [item, ...current.filter((m) => !m.isLogo)] : [...current, item]
        const fail = await saveMedia(next)
        if (fail) {
          errs.push(fail)
          break
        }
        if (prevLogo && sessionUploads.current.has(prevLogo.footageId)) void removeFile(prevLogo.footageId)
      } catch (e) {
        const reason = e instanceof AdsUploadError ? e.reason : 'upload_failed'
        void trackEvent('ads_media_refused', { order_id: order.id, reason, is_logo: isLogo })
        if (reason === 'unauthenticated') {
          goLogin()
          return
        }
        errs.push(`${f.name || 'File'}: ${e instanceof Error ? e.message : 'The upload did not finish.'}`)
      }
      setErrors([...errs])
    }
    setErrors([...errs])
    setBusy(null)
  }

  async function remove(item: AdsMediaItem) {
    if (busy) return
    setBusy('Removing…')
    setContError(null)
    const fail = await saveMedia(mediaRef.current.filter((m) => m.footageId !== item.footageId))
    if (fail) setErrors([fail])
    else if (sessionUploads.current.has(item.footageId)) void removeFile(item.footageId)
    setBusy(null)
  }

  async function next() {
    if (saving || busy) return
    if (!logo) return setContError('Upload your logo — it goes on the last frame of the ad.')
    // Vídeo não conta: todo modelo pede fotos (o menor mínimo é MIN_PHOTOS_ANY_MODEL). Só vídeo = 8 modelos trancados.
    if (photos < MIN_PHOTOS_ANY_MODEL) return setContError(PHOTOS_NEEDED_LINE)
    if (!consent) return setContError('Confirm you own these photos and videos, or have permission to use them.')
    setSaving(true)
    const r = await patchOrder(order.id, { media: mediaRef.current.map(stripItem), consent: true })
    setSaving(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      return setContError(errorText(r))
    }
    onContinue(r.data.order)
  }

  const minPhotos = model?.inputs.minPhotos ?? null
  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Your logo, photos and videos</h2>
      <p className="adsw-lead">Everything in the ad comes from here. JPG or PNG photos, MP4, MOV or WebM videos, up to 50 MB each.</p>

      <h3>Logo</h3>
      <div className="adsw-logo">
        {logo ? (
          <div className="adsw-tile">
            <MediaThumb item={logo} src={srcOf(logo)} />
          </div>
        ) : null}
        <div>
          <button type="button" className={`adsw-btn ${logo ? 'ghost small' : ''}`} disabled={Boolean(busy)} onClick={() => logoInput.current?.click()}>
            {logo ? 'Replace logo' : 'Upload your logo'}
          </button>
          <p className="adsw-hint">PNG with a transparent background looks best. JPG works too.</p>
        </div>
        <input
          ref={logoInput}
          type="file"
          accept={ADS_UPLOAD_ACCEPT_LOGO}
          hidden
          onChange={(e) => {
            const fl = e.target.files
            void addFiles(fl, true)
            e.target.value = ''
          }}
        />
      </div>

      <h3 style={{ marginTop: 20 }}>Photos and videos</h3>
      <p className="adsw-count" aria-live="polite">
        {rest.length} of {MAX_MEDIA} files · {photos} {photos === 1 ? 'photo' : 'photos'}
        {minPhotos !== null && model ? ` · ${model.name} needs at least ${minPhotos} photos` : ' · most models need 3 to 6 photos'}
      </p>
      {photos < MIN_PHOTOS_ANY_MODEL ? (
        <p className={rest.length ? 'adsw-warn' : 'adsw-hint'} style={{ margin: '0 0 10px' }}>{PHOTOS_NEEDED_LINE}</p>
      ) : null}
      <div className="adsw-media">
        {rest.map((m, i) => (
          <div className="adsw-tile" key={m.footageId}>
            <MediaThumb item={m} src={srcOf(m)} />
            <span className="adsw-tag">{m.kind === 'video' ? `Video${m.seconds ? ` · ${Math.round(m.seconds)} s` : ''}` : `Photo ${i + 1}`}</span>
            <button type="button" className="adsw-x" aria-label={`Remove ${m.kind === 'video' ? 'video' : 'photo'} ${i + 1}`} disabled={Boolean(busy)} onClick={() => void remove(m)}>
              ✕
            </button>
          </div>
        ))}
        {rest.length < MAX_MEDIA ? (
          <button type="button" className="adsw-add" disabled={Boolean(busy)} onClick={() => mediaInput.current?.click()}>
            <span className="plus" aria-hidden="true">+</span>
            Add photos or videos
          </button>
        ) : null}
        <input
          ref={mediaInput}
          type="file"
          accept={ADS_UPLOAD_ACCEPT_MEDIA}
          multiple
          hidden
          onChange={(e) => {
            const fl = e.target.files
            void addFiles(fl, false)
            e.target.value = ''
          }}
        />
      </div>
      <p className="adsw-hint">Your video’s own sound is replaced by the narration.</p>
      {busy ? <p className="adsw-hint" role="status">{busy}</p> : null}
      {errors.length ? (
        <div role="alert">
          {errors.map((m, i) => (
            <p className="adsw-err" key={i}>{m}</p>
          ))}
        </div>
      ) : null}

      <label className="adsw-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I own these photos/videos or have permission to use them in ads.</span>
      </label>
      {contError ? <p className="adsw-err" role="alert">{contError}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={saving || Boolean(busy)} onClick={() => void next()}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
        <button type="button" className="adsw-btn ghost" disabled={Boolean(busy)} onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

// ─── passo 3: modelo ────────────────────────────────────────────────────────────────────────

function ModelStep({ order, onBack, onSaved }: { order: AdsOrder; onBack: () => void; onSaved: (o: AdsOrder, changed: boolean) => void }) {
  const sum = mediaSummary(orderMedia(order))
  const have = { photos: sum.photos, videos: sum.videos, logo: Boolean(sum.logo) }
  const brief = order.brief
  const [selected, setSelected] = useState<AdsModelId | null>(() => {
    const m = adsModelById(order.template)
    return m && !adsModelMissingInputs(m, have).length ? m.id : null
  })
  const [extras, setExtras] = useState<Record<string, string>>(() => ({ ...(brief?.extra ?? {}), offer: brief?.offer ?? '' }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const model = adsModelById(selected)
  const rtl = isRtl(brief?.language)

  async function save() {
    if (saving) return
    if (!model) return setError('Choose a model.')
    const missing = adsModelMissingInputs(model, have)
    if (missing.length) return setError(`This model needs: ${missing.join(', ')}.`)
    const fields = model.inputs.extraFields
    const empty = fields.filter((f) => !(extras[f] ?? '').trim())
    if (empty.length) return setError(`Fill in: ${empty.map((f) => (EXTRA_FIELDS[f]?.label ?? f.replace(/_/g, ' ')).toLowerCase()).join(', ')}.`)
    setError(null)
    setSaving(true)
    const body: Record<string, unknown> = { template: model.id }
    if (brief && fields.length) {
      const extra: Record<string, string> = {}
      for (const f of fields) if (f !== 'offer') extra[f] = (extras[f] ?? '').trim()
      body.brief = { ...brief, offer: fields.includes('offer') ? (extras.offer ?? '').trim() : brief.offer, extra }
    }
    const r = await patchOrder(order.id, body)
    setSaving(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      return setError(errorText(r))
    }
    onSaved(r.data.order, order.template !== model.id)
  }

  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Choose the kind of ad</h2>
      <p className="adsw-lead">Each model is a proven structure. The script is written from your brief to fit it.</p>
      <div className="cams" role="group" aria-label="Ad model">
        {ADS_MODELS.map((m) => {
          const missing = adsModelMissingInputs(m, have)
          const on = selected === m.id
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              className={`cam adsw-model ${on ? 'on' : ''}`}
              disabled={missing.length > 0}
              onClick={() => { setSelected(m.id); setError(null) }}
            >
              <b>{m.name}</b>
              <span className="m-meta">{m.seconds} s · {m.credits} credits</span>
              <span className="m-seg">{m.goal}</span>
              <span className="m-seg">For {m.segment}</span>
              {missing.length ? <span className="m-miss">Needs: {missing.join(', ')}</span> : null}
            </button>
          )
        })}
      </div>
      {model ? (
        <div style={{ marginTop: 18 }}>
          <p className="camline">{model.note}</p>
          {model.inputs.extraFields.length ? (
            <div style={{ marginTop: 16 }}>
              <h3>A few details for this model</h3>
              <p className="adsw-hint" style={{ marginTop: 0 }}>Write only true facts — the script never invents a number or a quote.</p>
              {model.inputs.extraFields.map((f) => {
                const spec = EXTRA_FIELDS[f] ?? { label: f.replace(/_/g, ' '), placeholder: '' }
                const value = extras[f] ?? ''
                const set = (v: string) => setExtras((x) => ({ ...x, [f]: v }))
                return (
                  <label className="adsw-f" key={f}>
                    <span>{spec.label}<b className="adsw-req" aria-hidden="true">*</b></span>
                    {spec.multiline ? (
                      <textarea className="adsw-ta" rows={3} maxLength={300} value={value} placeholder={spec.placeholder} dir={rtl ? 'rtl' : undefined} onChange={(e) => set(e.target.value)} />
                    ) : (
                      <input type="text" maxLength={300} value={value} placeholder={spec.placeholder} dir={rtl ? 'rtl' : undefined} onChange={(e) => set(e.target.value)} />
                    )}
                  </label>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={saving || !model} onClick={() => void save()}>{saving ? 'Saving…' : 'Continue'}</button>
        <button type="button" className="adsw-btn ghost" onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

// ─── passo 4: roteiro ───────────────────────────────────────────────────────────────────────

function ScriptStep({
  order,
  model,
  initialBeats,
  onBack,
  onSaved,
}: {
  order: AdsOrder
  model: AdsModel
  initialBeats: string[] | null
  onBack: () => void
  onSaved: (o: AdsOrder, beats: string[]) => void
}) {
  // Só o roteiro escrito para ESTE modelo conta ("<ângulo>@<modelo>"); o de outro modelo não pré-seleciona nada.
  const savedAngle = scriptWrittenFor(order, model.id) ? angleOf(order.script_angle) : ''
  const versionsKey = `ads_versions:${order.id}:${model.id}:${shortHash(JSON.stringify(order.brief ?? null))}`
  const [versions, setVersions] = useState<AdsScriptVersion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[] | null>(initialBeats)
  const [angle, setAngle] = useState<string>(savedAngle.replace(/_edited$/, '') || 'own')
  const [base, setBase] = useState<string[] | null>(initialBeats && savedAngle && !savedAngle.endsWith('_edited') && savedAngle !== 'own' ? initialBeats : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoRan = useRef(false)
  const rtl = isRtl(order.brief?.language)
  const [lo, hi] = adsRenderWordRange(model)
  const words = draft ? countWords(draft.join(' ')) : 0
  const n = model.beats.length

  const generate = useCallback(async () => {
    setLoading(true)
    setGenError(null)
    const r = await callJson<{ versions: AdsScriptVersion[] }>('/api/ads/script', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ order_id: order.id }) })
    setLoading(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      if (r.status === 429) return setGenError('You reached today’s limit of new script versions. Edit a version below, write your own, or try again tomorrow.')
      if (r.code === 'no_script') {
        const hint = typeof r.body.hint === 'string' ? r.body.hint : 'Add the missing facts to your brief and try again.'
        return setGenError(`We could not write a version that uses only your facts. ${hint}`)
      }
      return setGenError(errorText(r))
    }
    const list = Array.isArray(r.data.versions) ? r.data.versions.filter((v) => Array.isArray(v.beats) && v.beats.length === n) : []
    if (!list.length) return setGenError('We could not write a version that uses only your facts. Add the missing facts to your brief and try again.')
    setVersions(list)
    writeVersions(versionsKey, list)
  }, [order.id, n, versionsKey])

  // Ao abrir: devolve as versões já escritas nesta aba (mesmo pedido, modelo e brief); só escreve versões novas
  // sozinho quando nada voltou E não há roteiro salvo para este modelo.
  useEffect(() => {
    if (autoRan.current) return
    autoRan.current = true
    const restored = readVersions(versionsKey, n)
    if (restored) {
      setVersions(restored)
      return
    }
    if (!initialBeats) void generate()
  }, [initialBeats, generate, versionsKey, n])

  function pick(v: AdsScriptVersion) {
    setDraft([...v.beats])
    setBase([...v.beats])
    setAngle(v.angle)
    setError(null)
  }

  function writeOwn() {
    setDraft(model.beats.map(() => ''))
    setBase(null)
    setAngle('own')
    setError(null)
  }

  async function save() {
    if (!draft || saving) return
    const clean = draft.map((b) => b.replace(/\s+/g, ' ').trim())
    const empty = clean.findIndex((b) => !b)
    if (empty >= 0) return setError(`Part ${empty + 1} is empty.`)
    const w = countWords(clean.join(' '))
    if (w < lo) return setError(adsRenderErrorMessage('script_too_short'))
    if (w > hi) return setError(adsRenderErrorMessage('script_too_long'))
    const edited = !base || clean.some((b, i) => b !== (base[i] ?? '').replace(/\s+/g, ' ').trim())
    const scriptAngle = angle === 'own' ? 'own' : edited ? `${angle}_edited` : angle
    setError(null)
    setSaving(true)
    const r = await patchOrder(order.id, { script: clean.join('\n\n'), script_angle: scriptAngleFor(scriptAngle, model.id) })
    setSaving(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      return setError(errorText(r))
    }
    void trackEvent('ads_script_chosen', { order_id: order.id, angle, edited })
    onSaved(r.data.order, clean)
  }

  const contact = order.brief?.contact ?? ''
  const lastBeat = draft ? draft[n - 1] ?? '' : ''
  const contactMissing = Boolean(draft && contact && lastBeat.trim() && !normContact(lastBeat).includes(normContact(contact)))
  const lengthNote = !draft ? null : words < lo ? 'Too short for this model — add a little more.' : words > hi ? 'Too long — trim it a little.' : 'Good length.'

  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Pick your script</h2>
      <p className="adsw-lead">Three versions written from your brief for “{model.name}”. Pick one and edit anything you like.</p>
      <div className="adsw-actions" style={{ marginTop: 0, marginBottom: 14 }}>
        <button type="button" className="adsw-btn ghost small" disabled={loading} onClick={() => void generate()}>
          {loading ? 'Writing…' : versions ? 'Write new versions' : 'Write versions'}
        </button>
        <button type="button" className="adsw-btn ghost small" disabled={loading} onClick={writeOwn}>Write it yourself</button>
      </div>
      {loading ? <p className="adsw-hint" role="status">Writing three versions from your brief… about 10 seconds.</p> : null}
      {genError ? <p className="adsw-warn" role="alert">{genError}</p> : null}
      {versions ? (
        <div className="adsw-vers">
          {versions.map((v) => {
            const on = base !== null && angle === v.angle && draft !== null
            return (
              <div className={`adsw-ver ${on ? 'on' : ''}`} key={v.angle}>
                <div className="adsw-ver-h">
                  <b>{ANGLE_LABEL[v.angle] ?? v.angle}</b>
                  <span>{v.words} words</span>
                </div>
                <p dir={rtl ? 'rtl' : undefined}>{v.beats.join(' ')}</p>
                <button type="button" className="adsw-btn ghost small" aria-pressed={on} onClick={() => pick(v)}>
                  {on ? 'Selected' : 'Use this version'}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {draft ? (
        <div style={{ marginTop: 20 }}>
          <h3>Edit the narration</h3>
          {model.beats.map((b, i) => (
            <label className="adsw-f" key={i}>
              <span>{i === n - 1 ? `Part ${i + 1} · end card · ${b.seconds} s` : `Part ${i + 1} · ${b.seconds} s`}</span>
              <small>On screen: {b.screen}</small>
              <textarea
                className="adsw-ta"
                rows={3}
                maxLength={ADS_BEAT_MAX_CHARS}
                value={draft[i] ?? ''}
                placeholder={b.speech}
                dir={rtl ? 'rtl' : undefined}
                onChange={(e) => {
                  const v = e.target.value.replace(/[<>]/g, '')
                  setDraft((d) => (d ? d.map((x, j) => (j === i ? v : x)) : d))
                }}
              />
            </label>
          ))}
          <p className={`adsw-words ${words >= lo && words <= hi ? 'adsw-good' : 'adsw-warn'}`} aria-live="polite">
            {words} words · aim for {model.words[0]}–{model.words[1]} ({model.seconds} s). {lengthNote}
          </p>
          {contactMissing ? <p className="adsw-warn">Tip: say your contact in the last part ({contact}).</p> : null}
        </div>
      ) : null}
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={!draft || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Use this script'}</button>
        <button type="button" className="adsw-btn ghost" onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

// ─── passo 5: voz ───────────────────────────────────────────────────────────────────────────

function VoiceStep({ order, firstBeat, onBack, onSaved }: { order: AdsOrder; firstBeat: string; onBack: () => void; onSaved: (o: AdsOrder) => void }) {
  const [voice, setVoice] = useState<AdsVoiceId>(isAdsVoice(order.voice) ? order.voice : ADS_DEFAULT_VOICE)
  const [playing, setPlaying] = useState<AdsVoiceId | null>(null)
  const [loadingVoice, setLoadingVoice] = useState<AdsVoiceId | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // UM <audio> para a tela inteira, destravado DENTRO do toque (iPhone só deixa tocar som depois de um await se o
  // elemento já tocou no gesto). As prévias ficam num cache voz+texto → blob: tocar de novo não gasta o teto diário.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cacheRef = useRef<Map<string, string>>(new Map())
  const reqRef = useRef(0)
  const aliveRef = useRef(true)

  const stop = useCallback(() => {
    reqRef.current++
    const a = audioRef.current
    if (a) {
      try {
        a.pause()
      } catch {
        /* ignore */
      }
    }
    setPlaying(null)
    setLoadingVoice(null)
  }, [])

  useEffect(() => {
    const cache = cacheRef.current
    aliveRef.current = true
    return () => {
      // Saiu do passo (barra de passos, recarga): nenhuma prévia pendente toca depois disto.
      aliveRef.current = false
      reqRef.current++
      const a = audioRef.current
      if (a) {
        try {
          a.pause()
          a.removeAttribute('src')
          a.load()
        } catch {
          /* ignore */
        }
      }
      audioRef.current = null
      cache.forEach((u) => {
        try {
          URL.revokeObjectURL(u)
        } catch {
          /* ignore */
        }
      })
      cache.clear()
    }
  }, [])

  function audioEl(): HTMLAudioElement {
    if (!audioRef.current) audioRef.current = new Audio()
    return audioRef.current
  }

  function remember(key: string, url: string) {
    const cache = cacheRef.current
    cache.set(key, url)
    while (cache.size > VOICE_CACHE_MAX) {
      const oldest = cache.keys().next().value as string | undefined
      if (oldest === undefined || oldest === key) break
      const old = cache.get(oldest)
      cache.delete(oldest)
      if (old && audioRef.current?.src !== old) {
        try {
          URL.revokeObjectURL(old)
        } catch {
          /* ignore */
        }
      }
    }
  }

  /** Toca uma URL no elemento destravado. Chamado de dentro do toque (cache) roda play() sem await antes. */
  async function playUrl(a: HTMLAudioElement, url: string, v: AdsVoiceId, token: number) {
    try {
      a.onended = () => {
        if (reqRef.current === token) setPlaying(null)
      }
      a.src = url
      setLoadingVoice(null)
      setPlaying(v)
      await a.play()
    } catch {
      if (reqRef.current !== token) return
      setPlaying(null)
      setPreviewError('The preview could not play. Tap it again.')
    }
  }

  function preview(v: AdsVoiceId) {
    if (playing === v || loadingVoice === v) return stop()
    stop()
    const token = reqRef.current
    setPreviewError(null)
    void trackEvent('ads_voice_previewed', { order_id: order.id, voice: v })
    const text = previewText(firstBeat || order.brief?.business || 'Hello! This is how your ad will sound.', ADS_VOICE_PREVIEW_MAX_CHARS)
    const key = `${v}\u0000${text}`
    const a = audioEl()
    const cached = cacheRef.current.get(key)
    if (cached) {
      void playUrl(a, cached, v, token)
      return
    }
    // Destrava o elemento no gesto, antes de qualquer await: toca o silêncio e pausa.
    try {
      a.onended = null
      a.src = SILENT_AUDIO
      const p = a.play()
      if (p) {
        p.then(() => {
          if (a.src === SILENT_AUDIO) a.pause()
        }).catch(() => {})
      }
    } catch {
      /* navegador sem áudio: a prévia falha abaixo com mensagem */
    }
    setLoadingVoice(v)
    void fetchAndPlay(a, v, text, key, token)
  }

  async function fetchAndPlay(a: HTMLAudioElement, v: AdsVoiceId, text: string, key: string, token: number) {
    let res: Response
    try {
      res = await fetch('/api/ads/voice', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ voice: v, text }) })
    } catch {
      if (reqRef.current !== token) return
      setLoadingVoice(null)
      return setPreviewError(ORDER_ERRORS.network)
    }
    if (!res.ok) {
      if (res.status === 401) return goLogin()
      let code: string | null = null
      let message: string | null = null
      try {
        const j = (await res.json()) as { error?: unknown; message?: unknown }
        code = typeof j.error === 'string' ? j.error : null
        message = typeof j.message === 'string' ? j.message : null
      } catch {
        /* ignore */
      }
      if (reqRef.current !== token) return
      setLoadingVoice(null)
      return setPreviewError(code && Object.prototype.hasOwnProperty.call(ADS_RENDER_ERROR_MESSAGES, code) ? adsRenderErrorMessage(code) : message || 'The preview is not available right now. You can still pick a voice.')
    }
    let url: string
    try {
      url = URL.createObjectURL(await res.blob())
    } catch {
      if (reqRef.current !== token) return
      setLoadingVoice(null)
      return setPreviewError('The preview is not available right now. You can still pick a voice.')
    }
    if (!aliveRef.current) {
      URL.revokeObjectURL(url)
      return
    }
    // Guarda mesmo se a pessoa já tocou em outra voz: o próximo toque nesta sai do cache, sem nova síntese.
    remember(key, url)
    if (reqRef.current !== token) return
    await playUrl(a, url, v, token)
  }

  async function save() {
    if (saving) return
    stop()
    setSaving(true)
    setError(null)
    const r = await patchOrder(order.id, { voice })
    setSaving(false)
    if (!r.ok) {
      if (r.status === 401) return goLogin()
      return setError(errorText(r))
    }
    onSaved(r.data.order)
  }

  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Choose the voice</h2>
      <p className="adsw-lead">The narrator reads your script in {languageLabel(order.brief?.language)}. Tap ▶ to hear the opening of your ad.</p>
      <div className="adsw-voices" role="group" aria-label="Voice">
        {ADS_VOICES.map((v) => (
          <div className={`adsw-voice ${voice === v.id ? 'on' : ''}`} key={v.id}>
            <button type="button" aria-pressed={voice === v.id} className={`pill ${voice === v.id ? 'on' : ''}`} onClick={() => setVoice(v.id)}>
              {v.label}
            </button>
            <button type="button" className="adsw-btn ghost small" disabled={loadingVoice !== null && loadingVoice !== v.id} onClick={() => void preview(v.id)} aria-label={`${playing === v.id ? 'Stop' : 'Preview'} ${v.label}`}>
              {loadingVoice === v.id ? 'Loading…' : playing === v.id ? '■ Stop' : '▶ Preview'}
            </button>
          </div>
        ))}
      </div>
      {previewError ? <p className="adsw-warn" role="alert">{previewError}</p> : null}
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Continue'}</button>
        <button type="button" className="adsw-btn ghost" onClick={() => { stop(); onBack() }}>Back</button>
      </div>
    </div>
  )
}

// ─── passo 6: storyboard + cartão final ────────────────────────────────────────────────────

function StoryboardStep({
  order,
  model,
  beats,
  storyboard,
  setStoryboard,
  localUrls,
  card,
  onCard,
  onBack,
  onContinue,
}: {
  order: AdsOrder
  model: AdsModel
  beats: string[]
  storyboard: Storyboard
  setStoryboard: (s: Storyboard) => void
  localUrls: Record<string, string>
  card: CardInfo | null
  onCard: (c: CardInfo) => void
  onBack: () => void
  onContinue: () => void
}) {
  const media = orderMedia(order)
  const { logo, rest } = mediaSummary(media)
  const n = model.beats.length
  const brief = order.brief
  const [bizName] = splitBusiness(brief?.business ?? '')
  const [headline, setHeadline] = useState(bizName)
  const [offerLine, setOfferLine] = useState(brief?.offer ?? '')
  const [button, setButton] = useState(() => endCardCtaLabel(brief?.cta ?? 'call', brief?.language))
  const [contact, setContact] = useState(brief?.contact ?? '')
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rtl = isRtl(brief?.language)
  const srcOf = (m: AdsMediaItem) => localUrls[m.footageId] ?? m.url

  // Cartão recuperado do pedido (sig null): mostra o PNG salvo e o reaproveita sem novo envio, até a pessoa editar o
  // texto ou tocar em Redraw. Se o arquivo não for achado na conta, desenha um novo como antes.
  const restoredId = card && (card.sig === null || card.savedUrl) ? card.id : null
  const [useSaved, setUseSaved] = useState(Boolean(restoredId))
  const [savedUrl, setSavedUrl] = useState<string | null>(card?.savedUrl ?? null)
  const needsLookup = Boolean(card && card.sig === null && !card.savedUrl)
  useEffect(() => {
    if (!restoredId || !needsLookup) return
    let alive = true
    void callJson<{ items?: unknown }>('/api/footage').then((r) => {
      if (!alive) return
      const items = r.ok && Array.isArray(r.data.items) ? (r.data.items as { id?: unknown; url?: unknown }[]) : []
      const hit = items.find((x) => x && x.id === restoredId && typeof x.url === 'string')
      if (hit && typeof hit.url === 'string') setSavedUrl(hit.url)
      else setUseSaved(false)
    })
    return () => { alive = false }
  }, [restoredId, needsLookup])
  const showSaved = useSaved && Boolean(restoredId) && Boolean(savedUrl)

  const valid = storyboardValid(storyboard, model, rest)
  useEffect(() => {
    if (!valid && rest.length) setStoryboard(defaultStoryboard(model, media))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, model.id, rest.length])

  const logoId = logo?.footageId ?? null
  const logoSrc = logo ? srcOf(logo) : null
  useEffect(() => {
    let alive = true
    setLogoFailed(false)
    if (!logoSrc) {
      setLogoImg(null)
      return
    }
    loadLogoImage(logoSrc)
      .then((img) => { if (alive) setLogoImg(img) })
      .catch(() => { if (alive) { setLogoImg(null); setLogoFailed(true) } })
    return () => { alive = false }
  }, [logoSrc])

  const redraw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    try {
      drawEndCard(c, { logo: logoImg, business: headline, offer: offerLine, ctaLabel: button, contact })
    } catch {
      /* canvas indisponível: o botão de continuar mostra o erro */
    }
  }, [logoImg, headline, offerLine, button, contact])
  useEffect(() => { redraw() }, [redraw])

  const sig = JSON.stringify([headline.trim(), offerLine.trim(), button.trim(), contact.trim(), logoId, logoImg ? 1 : 0])

  function toggle(beat: number, id: string) {
    const cur = storyboard[beat] ?? []
    setNotice(null)
    if (cur.includes(id)) {
      if (cur.length <= 1) return setNotice('Each part needs at least one photo or video.')
      setStoryboard({ ...storyboard, [beat]: cur.filter((x) => x !== id) })
    } else {
      if (cur.length >= ADS_MAX_MEDIA_PER_BEAT) return setNotice(`Up to ${ADS_MAX_MEDIA_PER_BEAT} per part. Remove one first.`)
      setStoryboard({ ...storyboard, [beat]: [...cur, id] })
    }
  }

  async function next() {
    if (busy) return
    setError(null)
    for (let i = 0; i < n - 1; i++) {
      if (!(storyboard[i] ?? []).length) return setError(`Pick at least one photo or video for part ${i + 1}.`)
    }
    if (card && showSaved) {
      // A pessoa viu o cartão salvo e seguiu: ele passa a valer nesta sessão, com a prévia presa ao PNG salvo.
      onCard({ id: card.id, sig, savedUrl })
      return onContinue()
    }
    if (!logoImg) return setError(logoFailed ? 'Your logo could not be loaded. Go back to step 2 and upload it again as PNG or JPG.' : 'The logo is still loading. Wait a second and try again.')
    // Cartão desenhado nesta sessão e texto igual: reaproveita. Cartão salvo cuja prévia saiu (editou/Redraw): novo.
    if (card && card.sig !== null && !card.savedUrl && card.sig === sig) return onContinue()
    const c = canvasRef.current
    if (!c) return setError('The end card could not be drawn in this browser.')
    setBusy(true)
    try {
      drawEndCard(c, { logo: logoImg, business: headline, offer: offerLine, ctaLabel: button, contact })
      const file = await toPngFile(c)
      const up = await uploadFootage(file, { isLogo: false })
      if (up.localUrl) URL.revokeObjectURL(up.localUrl)
      onCard({ id: up.footageId, sig })
      void trackEvent('ads_card_rendered', { order_id: order.id })
      onContinue()
    } catch (e) {
      if (e instanceof AdsUploadError) {
        if (e.reason === 'unauthenticated') return goLogin()
        setError(e.message)
      } else if (e instanceof Error && e.name === 'SecurityError') {
        setError('Your logo could not be placed on the card. Go back to step 2 and upload it again as PNG or JPG.')
      } else {
        setError('The end card could not be saved. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Storyboard</h2>
      <p className="adsw-lead">Pick what shows while each part is narrated — 1 to {ADS_MAX_MEDIA_PER_BEAT} per part, in the order you tap them.</p>
      {model.beats.slice(0, -1).map((b, i) => {
        const chosen = storyboard[i] ?? []
        return (
          <section className="adsw-beat" key={i} aria-label={`Part ${i + 1}`}>
            <h3>Part {i + 1} · {b.seconds} s</h3>
            <p className="adsw-say" dir={rtl ? 'rtl' : undefined}>“{beats[i]}”</p>
            <p className="adsw-hint">Best here: {b.screen}</p>
            <div className="adsw-media" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(76px,1fr))' }}>
              {rest.map((m, j) => {
                const pos = chosen.indexOf(m.footageId)
                const on = pos >= 0
                return (
                  <button
                    type="button"
                    key={m.footageId}
                    className={`adsw-tile adsw-pick ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    aria-label={`${m.kind === 'video' ? 'Video' : 'Photo'} ${j + 1}${on ? `, shown ${pos + 1}` : ''}`}
                    onClick={() => toggle(i, m.footageId)}
                  >
                    <MediaThumb item={m} src={srcOf(m)} />
                    {on ? <span className="adsw-num" aria-hidden="true">{pos + 1}</span> : null}
                    {m.kind === 'video' ? <span className="adsw-tag" aria-hidden="true">Video</span> : null}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      {notice ? <p className="adsw-warn" role="status">{notice}</p> : null}

      <section className="adsw-beat" aria-label="End card">
        <h3>Part {n} · end card · {model.beats[n - 1].seconds} s</h3>
        <p className="adsw-say" dir={rtl ? 'rtl' : undefined}>“{beats[n - 1]}”</p>
        <div className="adsw-cardwrap">
          {showSaved && savedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="adsw-canvas" src={savedUrl} alt="Your saved end card with your logo, name, offer and contact" />
          ) : null}
          <canvas ref={canvasRef} className="adsw-canvas" width={1080} height={1920} role="img" aria-label="End card preview with your logo, name, offer and contact" style={showSaved ? { display: 'none' } : undefined} />
          <div className="adsw-cardside">
            <p className="adsw-hint" style={{ marginTop: 0 }}>
              {showSaved
                ? 'Your saved end card from last time. Edit the text or tap Redraw to make a new one.'
                : 'The last frame of your ad. Text stays inside the safe area so captions and zoom never cover it.'}
            </p>
            {logoFailed ? <p className="adsw-warn">Your logo could not be loaded. Go back to step 2 and upload it again.</p> : null}
            <details>
              <summary>Edit the card text</summary>
              <label className="adsw-f">
                <span>Name</span>
                <input type="text" value={headline} maxLength={60} dir={rtl ? 'rtl' : undefined} onChange={(e) => { setUseSaved(false); setHeadline(e.target.value) }} />
              </label>
              <label className="adsw-f">
                <span>Offer line</span>
                <input type="text" value={offerLine} maxLength={120} dir={rtl ? 'rtl' : undefined} onChange={(e) => { setUseSaved(false); setOfferLine(e.target.value) }} />
              </label>
              <label className="adsw-f">
                <span>Button text</span>
                <input type="text" value={button} maxLength={40} dir={rtl ? 'rtl' : undefined} onChange={(e) => { setUseSaved(false); setButton(e.target.value) }} />
              </label>
              <label className="adsw-f">
                <span>Contact</span>
                <input type="text" value={contact} maxLength={80} onChange={(e) => { setUseSaved(false); setContact(e.target.value) }} />
              </label>
            </details>
            <button type="button" className="adsw-btn ghost small" onClick={() => { setUseSaved(false); redraw() }}>Redraw</button>
          </div>
        </div>
      </section>
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn" disabled={busy} onClick={() => void next()}>{busy ? 'Saving the end card…' : 'Continue'}</button>
        <button type="button" className="adsw-btn ghost" disabled={busy} onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

// ─── passo 7: render ────────────────────────────────────────────────────────────────────────

const RENDER_WAIT_LINES = ['Recording the narration…', 'Matching your photos to the script…', 'Sending your ad to the editor…']

function RenderStep({
  order,
  model,
  beats,
  storyboard,
  card,
  onBack,
  onStarted,
  onState,
}: {
  order: AdsOrder
  model: AdsModel
  beats: string[]
  storyboard: Storyboard
  card: CardInfo
  onBack: () => void
  onStarted: (s: AdsRenderStarted) => void
  onState: (s: AdsRenderState) => void
}) {
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [line, setLine] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [outOfCredits, setOutOfCredits] = useState<{ needed: number | null; balance: number | null } | null>(null)
  const [captions, setCaptions] = useState(true) // KINEO-ADS-SEM-LEGENDA-2026-09-26
  const [captionStyle, setCaptionStyle] = useState<AdCaptionStyle>('bold') // KINEO-ADS-ESTILO-2026-09-26
  const [music, setMusic] = useState<AdMusicMood>('auto')
  const voice: AdsVoiceId = isAdsVoice(order.voice) ? order.voice : ADS_DEFAULT_VOICE
  const n = model.beats.length

  useEffect(() => {
    let alive = true
    void callJson<{ credits?: unknown }>('/api/credits').then((r) => {
      if (alive && r.ok && typeof r.data.credits === 'number') setBalance(r.data.credits)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setLine((x) => (x + 1) % RENDER_WAIT_LINES.length), 7000)
    return () => clearInterval(t)
  }, [busy])

  async function recover(): Promise<boolean> {
    const st = await fetchRenderState(order.id)
    if (st && st.status !== 'draft') {
      onState(st)
      return true
    }
    return false
  }

  async function start() {
    if (busy) return
    setError(null)
    setOutOfCredits(null)
    setLine(0)
    setBusy(true)
    const body: AdsRenderRequest = {
      order_id: order.id,
      voice,
      beats: beats.map((b) => b.replace(/\s+/g, ' ').trim()),
      storyboard: Array.from({ length: n - 1 }, (_, i) => ({ beatIndex: i, footageIds: (storyboard[i] ?? []).slice(0, ADS_MAX_MEDIA_PER_BEAT) })),
      card_footage_id: card.id,
      captions,
      captionStyle,
      music,
    }
    void trackEvent('ads_preview_confirmed', { order_id: order.id, credits: model.credits, scenes: n, user_media_scenes: n - 1, stock_scenes: 0, captions })
    const r = await callJson<AdsRenderStarted>('/api/ads/render', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
    if (r.ok && typeof r.data.render_id === 'string') {
      setBusy(false)
      return onStarted(r.data)
    }
    if (r.ok) {
      // Começou sem devolver o id do render: acompanha pelo pedido.
      setBusy(false)
      if (await recover()) return
      return onState({
        order_id: order.id,
        status: 'rendering',
        render_id: null,
        seconds: r.data.seconds === 60 ? 60 : model.seconds,
        video_id: null,
        final_video_url: null,
        failure: null,
        topic: typeof r.data.topic === 'string' ? r.data.topic : null,
      })
    }
    if (!r.ok && r.status === 401) return goLogin()
    if (!r.ok && (r.status === 402 || r.code === 'out_of_credits')) {
      setBusy(false)
      const needed = typeof r.body.needed === 'number' ? r.body.needed : null
      const bal = typeof r.body.balance === 'number' ? r.body.balance : null
      if (bal !== null) setBalance(bal)
      return setOutOfCredits({ needed, balance: bal })
    }
    // Resposta perdida (rede, 504) ou pedido já em andamento: o servidor sabe se o anúncio começou.
    if (!r.ok && (r.status === 0 || r.status >= 500 || r.code === 'not_renderable' || r.code === 'pending')) {
      if (r.code === 'pending') await new Promise((res) => setTimeout(res, 5000))
      if (await recover()) {
        setBusy(false)
        return
      }
    }
    setBusy(false)
    setError(r.status === 0 ? 'The connection dropped. Check your internet and try again — if the ad already started, it shows up here.' : errorText(r))
  }

  const credits = model.credits
  const short = balance !== null && balance < credits
  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Render your ad</h2>
      <p className="adsw-lead">Check the summary and start. Your ad is narrated, edited with your photos, captioned and scored with original music.</p>
      <div className="cost">
        <p className="sum">Summary</p>
        <dl className="adsw-sum">
          <dt>Model</dt>
          <dd>{model.name}</dd>
          <dt>Length</dt>
          <dd>about {model.seconds} s</dd>
          <dt>Voice</dt>
          <dd>{voiceLabel(voice)} · {languageLabel(order.brief?.language)}</dd>
          <dt>Parts</dt>
          <dd>{n - 1} with your media + end card</dd>
          {balance !== null ? (
            <>
              <dt>Your balance</dt>
              <dd>{balance} credits</dd>
            </>
          ) : null}
        </dl>
        <div className="val">
          <span>Cost</span>
          <b>{credits} credits</b>
        </div>
        <button type="button" className={`go ${busy ? 'no' : 'ok'}`} disabled={busy} onClick={() => void start()}>
          {busy ? RENDER_WAIT_LINES[line] : `Render my ad · ${credits} credits`}
        </button>
        <p className="gnote">{busy ? 'Keep this page open for a moment — this step takes 20 to 60 seconds.' : 'Credits are settled when the ad is delivered. A failed render does not use them.'}</p>
      </div>
      {short && !outOfCredits ? <p className="adsw-warn">Your balance is below the cost of this ad.</p> : null}
      {outOfCredits || short ? (
        <div role={outOfCredits ? 'alert' : undefined} style={{ marginTop: 12 }}>
          {outOfCredits ? (
            <p className="adsw-err">
              {adsRenderErrorMessage('out_of_credits')}
              {outOfCredits.needed !== null ? ` This ad needs ${outOfCredits.needed}` : ''}
              {outOfCredits.needed !== null && outOfCredits.balance !== null ? `, you have ${outOfCredits.balance}.` : outOfCredits.needed !== null ? '.' : ''}
            </p>
          ) : null}
          <div className="adsw-actions">
            {adsPassLive() ? (
              <a
                className="adsw-btn"
                href="/api/stripe/checkout?pack=ads_pass"
                onClick={() => { void trackEvent('ads_cta_clicked', { source: 'wizard_out_of_credits', order_id: order.id }) }}
              >
                Get {ADS_PASS_CREDITS} more credits · {adsPassPriceLabel()}
              </a>
            ) : null}
            <Link className="adsw-link" href="/pricing">See plans</Link>
          </div>
        </div>
      ) : null}
      <div className="adsw-f" style={{ marginTop: 14 }}>
        <span>Captions on screen</span>
        <div className="row" role="group" aria-label="Captions on screen">
          {AD_CAPTION_STYLES.map((cs) => (
            <button key={cs.id} type="button" className="pill" aria-pressed={captions && captionStyle === cs.id} disabled={busy} onClick={() => { setCaptions(true); setCaptionStyle(cs.id) }}>{cs.label}</button>
          ))}
          <button type="button" className="pill" aria-pressed={!captions} disabled={busy} onClick={() => setCaptions(false)}>No captions</button>
        </div>
      </div>
      <div className="adsw-f">
        <span>Music</span>
        <div className="row" role="group" aria-label="Music">
          {AD_MUSIC_MOODS.map((m) => (
            <button key={m.id} type="button" className="pill" aria-pressed={music === m.id} disabled={busy} onClick={() => setMusic(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adsw-actions">
        <button type="button" className="adsw-btn ghost" disabled={busy} onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

// ─── progresso do render ───────────────────────────────────────────────────────────────────

function ProgressView({
  orderId,
  render,
  busyNew,
  newError,
  onStartNew,
  onDone,
  onFailed,
  onDraft,
}: {
  orderId: string
  render: RenderInfo
  busyNew: boolean
  newError: string | null
  onStartNew: () => void
  onDone: (s: AdsRenderState) => void
  onFailed: (s: AdsRenderState) => void
  onDraft: (s: AdsRenderState) => void
}) {
  const [progress, setProgress] = useState(0)
  const [trouble, setTrouble] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [round, setRound] = useState(0)
  const renderRef = useRef<RenderInfo>(render)
  const doneRef = useRef(onDone)
  const failRef = useRef(onFailed)
  const draftRef = useRef(onDraft)
  doneRef.current = onDone
  failRef.current = onFailed
  draftRef.current = onDraft

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const deadline = Date.now() + POLL_CAP_MS
    let failures = 0
    let composeDead = false
    // Desde quando o pedido aparece 'rendering' SEM render_id (o POST morreu antes de gravar o id do compose).
    let noRenderSince: number | null = null
    setTimedOut(false)

    const soft = () => {
      failures++
      setTrouble(failures >= 6)
    }
    const schedule = () => {
      if (stopped) return
      if (Date.now() > deadline) return setTimedOut(true)
      timer = setTimeout(() => void tick(), POLL_MS)
    }
    const fallbackState = (extra: Partial<AdsRenderState>): AdsRenderState => ({
      order_id: orderId,
      status: 'rendering',
      render_id: renderRef.current.renderId,
      seconds: renderRef.current.seconds === 60 ? 60 : 35,
      video_id: null,
      final_video_url: null,
      failure: null,
      topic: renderRef.current.topic || null,
      ...extra,
    })

    async function pollOrder() {
      const st = await fetchRenderState(orderId)
      if (stopped) return
      if (!st) {
        soft()
        return schedule()
      }
      failures = 0
      setTrouble(false)
      if (st.status === 'delivered' || st.status === 'reviewed' || st.final_video_url) return doneRef.current(st)
      if (st.status === 'failed' || st.status === 'cancelled') return failRef.current(st)
      // O servidor devolveu o pedido a rascunho (ex.: compose sem saldo): sai do progresso, volta ao passo de render.
      if (st.status === 'draft') return draftRef.current(st)
      if (st.status === 'rendering' && !st.render_id) {
        if (noRenderSince === null) noRenderSince = Date.now()
        else if (Date.now() - noRenderSince > STUCK_NO_RENDER_MS) setStuck(true)
      } else {
        noRenderSince = null
        setStuck(false)
      }
      if (st.render_id && !composeDead && !renderRef.current.renderId) {
        renderRef.current = { renderId: st.render_id, seconds: st.seconds ?? renderRef.current.seconds, topic: st.topic ?? renderRef.current.topic }
      }
      schedule()
    }

    async function tick() {
      if (stopped) return
      const rid = renderRef.current.renderId
      if (!rid || composeDead) return pollOrder()
      const { seconds, topic } = renderRef.current
      const url = `/api/compose/status/${encodeURIComponent(rid)}?quality=fast&duration=${seconds}&topic=${encodeURIComponent(topic)}&resume=1`
      let res: Response | null = null
      try {
        res = await fetch(url, { cache: 'no-store' })
      } catch {
        res = null
      }
      if (stopped) return
      if (!res) {
        soft()
        return schedule()
      }
      if (res.status === 401) return goLogin()
      if ([400, 403, 404, 410, 422].includes(res.status)) {
        // O status do compose não sabe retomar este render: o pedido passa a ser a fonte.
        composeDead = true
        return pollOrder()
      }
      let body: Record<string, unknown> | null = null
      try {
        body = (await res.json()) as Record<string, unknown>
      } catch {
        body = null
      }
      if (stopped) return
      if (!res.ok || !body) {
        soft()
        return schedule()
      }
      failures = 0
      setTrouble(false)
      if (body.phase === 'done') {
        const st = await fetchRenderState(orderId)
        if (stopped) return
        const finalUrl = typeof body.final_video_url === 'string' ? body.final_video_url : null
        const videoId = typeof body.video_id === 'string' ? body.video_id : null
        return doneRef.current(
          st
            ? { ...st, final_video_url: st.final_video_url ?? finalUrl, video_id: st.video_id ?? videoId }
            : fallbackState({ status: 'delivered', final_video_url: finalUrl, video_id: videoId }),
        )
      }
      if (body.phase === 'failed') {
        const st = await fetchRenderState(orderId)
        if (stopped) return
        // Só o CÓDIGO viaja (failure_reason); a frase do compose fala de outro produto e nunca vai para a tela.
        const code =
          (typeof body.failure_reason === 'string' && failureCode(body.failure_reason)) ||
          (typeof body.error === 'string' && failureCode(body.error)) ||
          'render_failed'
        const failure = st && failureCode(st.failure) ? st.failure : code
        return failRef.current(st ? { ...st, status: 'failed', failure } : fallbackState({ status: 'failed', failure }))
      }
      const p = typeof body.progress === 'number' && Number.isFinite(body.progress) ? body.progress : null
      if (p !== null) setProgress((old) => Math.max(old, Math.min(99, Math.round(p))))
      schedule()
    }

    void tick()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [orderId, round])

  const stage = progress < 20 ? 'Recording the narration' : progress < 60 ? 'Placing your photos and clips' : progress < 90 ? 'Adding captions and music' : 'Finishing'
  const late = timedOut || stuck
  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Your ad is being made</h2>
      <p className="adsw-lead" aria-live="polite">{late ? 'This is taking longer than usual.' : `${stage}…`}</p>
      <div className={`adsw-bar ${progress === 0 && !late ? 'pulse' : ''}`} role="progressbar" aria-label="Render progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <i style={{ width: `${Math.max(4, progress)}%` }} />
      </div>
      <p className="adsw-hint">{progress > 0 ? `${progress}% · ` : ''}This usually takes 3 to 7 minutes. You can close this page — the ad will also be in your library.</p>
      {trouble && !late ? <p className="adsw-warn" role="status">Connection trouble — still checking…</p> : null}
      {late ? (
        <p className="adsw-hint">If it does not finish, start a new ad with the same brief, photos, script and voice.</p>
      ) : null}
      <div className="adsw-actions">
        {late ? (
          <button type="button" className="adsw-btn" disabled={busyNew} onClick={onStartNew}>
            {busyNew ? 'Preparing…' : 'Start a new ad'}
          </button>
        ) : null}
        {timedOut ? (
          <button type="button" className="adsw-btn ghost" onClick={() => setRound((x) => x + 1)}>Check again</button>
        ) : null}
        <Link className="adsw-link" href="/history">Open My Videos</Link>
      </div>
      {late ? (
        <p className="adsw-hint">
          Write to <a className="adsw-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Studio Ads · ${orderId.slice(0, 8)}`)}`}>{SUPPORT_EMAIL}</a> with this code: {orderId.slice(0, 8)}
        </p>
      ) : null}
      {newError ? <p className="adsw-err" role="alert">{newError}</p> : null}
    </div>
  )
}

// ─── entrega ────────────────────────────────────────────────────────────────────────────────

function DeliveryView({
  order,
  state,
  busyNew,
  newError,
  onAnother,
  onRemix,
}: {
  order: AdsOrder
  state: AdsRenderState | null
  busyNew: boolean
  newError: string | null
  onAnother: () => void
  /** KINEO-ADS-VERSOES-2026-09-26 — só vem quando o modo IA está liberado para a conta. */
  onRemix?: (r: Omit<Remix, 'base'>) => void
}) {
  const [remixLang, setRemixLang] = useState(() => (order.brief?.language === 'en' ? 'es' : 'en'))
  const [remixFormat, setRemixFormat] = useState<AdFormat>('1:1')
  const remixCredits = adsModelById(order.template)?.credits ?? null
  const url = state?.final_video_url ?? null
  const videoId = state?.video_id ?? order.video_id ?? null
  const [downloading, setDownloading] = useState(false)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const [change, setChange] = useState('')
  const [sent, setSent] = useState(false)
  const [bizName] = splitBusiness(order.brief?.business ?? '')
  const historyHref = videoId ? `/history#v-${videoId}` : '/history'

  async function download() {
    if (!url || downloading) return
    setDownloading(true)
    setDownloadNote(null)
    void trackEvent('ads_download_clicked', { order_id: order.id, video_id: videoId })
    try {
      const outcome = await downloadVideoFile({
        url,
        filename: `${slug(bizName) || 'studio-ads'}-ad.mp4`,
        exportType: 'clean',
        surface: 'ads',
        videoId,
        extra: { order_id: order.id },
      })
      if (outcome === 'popup_blocked' || outcome === 'unavailable') {
        setDownloadNote('The download did not start. Open the video in My Videos and download it there.')
      }
    } catch {
      setDownloadNote('The download did not start. Open the video in My Videos and download it there.')
    } finally {
      setDownloading(false)
    }
  }

  function requestChange() {
    const text = change.trim()
    if (!text) return
    void trackEvent('ads_revision_requested', { order_id: order.id, text_len: text.length })
    const subject = `Studio Ads change request · ${order.id}`
    const body = `Order: ${order.id}\n${videoId ? `Video: ${videoId}\n` : ''}\nWhat should change:\n${text}\n`
    setSent(true)
    window.location.href = `mailto:hello@usekineo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="card">
      <h2 tabIndex={-1} data-step-heading>Your ad is ready</h2>
      {url ? (
        <video className="adsw-video" src={url} controls playsInline preload="metadata" />
      ) : (
        <p className="adsw-lead">Your ad is in your library. <Link className="adsw-link" href={historyHref}>Open My Videos</Link></p>
      )}
      <div className="adsw-actions">
        {url ? (
          <button type="button" className="adsw-btn" disabled={downloading} onClick={() => void download()}>
            {downloading ? 'Downloading…' : 'Download the ad'}
          </button>
        ) : null}
        <Link className="adsw-link" href={historyHref}>Open in My Videos</Link>
      </div>
      {downloadNote ? <p className="adsw-warn" role="status">{downloadNote}</p> : null}
      <p className="adsw-review">{REVIEW_LINE}</p>

      <div style={{ marginTop: 20 }}>
        <label className="adsw-f">
          <span>Request a change</span>
          <small>Tell the editor what to fix: a word, a photo, the contact. Your email app opens with the request ready to send.</small>
          <textarea className="adsw-ta" rows={3} maxLength={1000} value={change} onChange={(e) => { setChange(e.target.value); setSent(false) }} placeholder="e.g. The phone number on the last frame is wrong — it is 555 010 2031." />
        </label>
        <div className="adsw-actions" style={{ marginTop: 0 }}>
          <button type="button" className="adsw-btn ghost" disabled={!change.trim()} onClick={requestChange}>Email the change request</button>
        </div>
        {sent ? <p className="adsw-hint" role="status">If your email app did not open, write to hello@usekineo.com with your order number: {order.id}</p> : null}
      </div>

      {onRemix ? (
        <div className="card" style={{ marginTop: 20 }} role="group" aria-label="More versions of this ad">
          <h3 style={{ margin: '0 0 6px' }}>More versions of this ad</h3>
          <p className="adsw-hint" style={{ margin: '0 0 12px' }}>Same photos, facts and logo. {remixCredits ? `${remixCredits} credits each.` : ''}</p>
          <div className="adsw-actions" style={{ marginTop: 0 }}>
            <button type="button" className="adsw-btn ghost" onClick={() => onRemix({ kind: 'opening' })}>Different opening (A/B test)</button>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8, alignItems: 'center' }}>
            <select aria-label="Language" value={remixLang} onChange={(e) => setRemixLang(e.target.value)}>
              {NARRATION_LANGUAGES.filter((l) => l.code !== order.brief?.language).map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
            </select>
            <button type="button" className="adsw-btn ghost" onClick={() => onRemix({ kind: 'language', language: remixLang })}>Translate</button>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8, alignItems: 'center' }}>
            <select aria-label="Format" value={remixFormat} onChange={(e) => setRemixFormat(e.target.value as AdFormat)}>
              {AD_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button type="button" className="adsw-btn ghost" onClick={() => onRemix({ kind: 'format', format: remixFormat })}>Make it in this format</button>
          </div>
        </div>
      ) : null}
      <div className="adsw-actions" style={{ marginTop: 24 }}>
        <button type="button" className="adsw-btn" disabled={busyNew} onClick={onAnother}>{busyNew ? 'Preparing…' : 'Make another ad'}</button>
      </div>
      {newError ? <p className="adsw-err" role="alert">{newError}</p> : null}
    </div>
  )
}
