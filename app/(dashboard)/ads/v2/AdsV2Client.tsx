'use client'

import AdsPlanChanges, { usePlanComparison } from '@/components/AdsPlanChanges'

// KINEO-ADS-V2-2026-09-28 — ETAPA 3: a tela do anúncio v2 (/ads/v2). O montador em primeiro plano, numa página só.
//
// Pedidos do fundador (28/09): a pessoa ENTRA direto na parte de fazer o anúncio; um botão "Start over" em todas as fases
// que começa do zero (o v1 reaproveitava o último pedido com fotos de testes antigos); e o que ensina ("How it works",
// a forma do anúncio, as dicas de foto) fica AO LADO do montador, não em outra página. No celular a coluna vai para baixo.
//
// START OVER = REMONTAGEM. Todo dado do pedido mora em <AdsV2Session>, que é desenhado com key={session}. "Start over"
// (com confirmação) soma 1 em session: o React desmonta a sessão velha e monta uma VAZIA — nenhum estado sobrevive.
// A sessão velha, ao desmontar, marca aliveRef=false: toda resposta que chegar depois (fetch, upload, poll) não mexe
// em URL, saldo nem aviso, e o poll para. Só a PRIMEIRA sessão retoma um anúncio em andamento (resume={session === 0}).
// O pedido que já estava sendo feito continua no servidor (o cron termina) e aparece em My Videos.
//
// Custo: o preço de cada nível e do botão "Make my ad" vem de adsV2Credits (lib/ads/v2Tiers.ts), o mesmo que o /start
// debita; o preço da refação vem do servidor (retake_credits = adsV2RetakeCredits) e é mandado de volta como
// expected_credits. Plano `text` ("Screen or text") nunca oferece "Redo" (canRedoShot em lib/ads/v2Screen.ts).
// Recorte 9:16 no navegador: 1080×1920 JPEG q0.9, ponto focal arrastado pela pessoa (cropRect = a mesma conta do
// object-fit:cover da prévia), enviado pelo uploadFootage (um arquivo por vez). O cartão final é desenhado com
// lib/ads/endCard.ts (logo real) e enviado como PNG, como no v1.
// Nenhum import de servidor aqui (o guardião confere a lista). Eventos do v2 são só-servidor: nada de trackEvent.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import BusinessVisualReferences from '@/components/BusinessVisualReferences'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { AdsV2SimpleSession, readVideoForAd, videoFramesForAd } from './AdsV2Simple'
import { ADS_V2_VARIATIONS_CSS, VariationToggle, VariationsBoard, variationsCopy, variationsPrice } from './AdsV2Variations'
import { ADS_V2_SIMPLE_COPY } from '@/lib/ads/v2Simple'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { ADS_WIZARD_THEME_CSS } from '../new/adsWizardTheme'
import { downloadVideoFile } from '@/lib/videoDownload'
import { ADS_UPLOAD_ACCEPT_LOGO, AdsUploadError, uploadFootage } from '@/lib/ads/uploadFootage'
import { drawEndCard, loadLogoImage, toPngFile } from '@/lib/ads/endCard'
import { ADS_V2_TIER_IDS, ADS_V2_TIERS, adsV2Credits, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS, ADS_V2_PLAN_MAX_VIDEOS, ADS_V2_SECTOR_SPECS } from '@/lib/ads/v2ShotLists'
import {
  ADS_V2_AD_SHAPE,
  ADS_V2_CROP,
  ADS_V2_GENERAL_PHOTO_TIPS,
  ADS_V2_HOW_IT_WORKS,
  ADS_V2_PHOTO_KIND_OPTIONS,
  ADS_V2_PHOTO_TIPS,
  ADS_V2_ROLE_LABELS,
  ADS_V2_SCREEN_SECONDS,
  ADS_V2_SCREEN_SENTENCE_MAX,
  ADS_V2_SECTOR_OPTIONS,
  ADS_V2_TIER_COPY,
  adFileSlug,
  adsV2ErrorMessage,
  canRedoShot,
  clampFocal,
  composeSentence,
  cropRect,
  describeShot,
  failedOrderMessage,
  focalPosition,
  frameTouchAction,
  isActiveOrderStatus,
  isSmallCrop,
  panFocal,
  shotStateLabel,
  type AdsV2ScreenOrderStatus,
  type AdsV2ScreenPhotoKind,
  type AdsV2ScreenSector,
  type AdsV2ScreenShot,
} from '@/lib/ads/v2Screen'

// ─── tipos ────────────────────────────────────────────────────────────────────────────────────

interface OrderView {
  order_id: string
  status: AdsV2ScreenOrderStatus
  tier: AdsV2Tier
  seconds: number
  credits: number
  video_id: string | null
  error: string | null
  parent_order_id: string | null
  shots: AdsV2ScreenShot[]
}
interface VideoInfo {
  id: string
  video_url: string | null
  thumbnail_url: string | null
}
type StatusView = OrderView & { video?: VideoInfo | null }

interface PlanShot {
  idx: number
  role: string
  beat: string
  kind: string
  source: string
  cut_seconds: number
  photo: string | null
}
interface PlanResponse {
  order_id: string
  credits: number
  narration: string | null
  overlays: { role: string; start: number; end: number; text: string }[]
  total_seconds: number
  shots: PlanShot[]
}
interface Plan extends PlanResponse {
  /** Assinatura das entradas com que o plano foi feito: mudou alguma → o plano fica velho e some. */
  sig: string
  /** Assinatura do cartão gravado no pedido (o cartão pode mudar depois, via PATCH, sem planejar de novo). */
  cardSig: string
}

interface PhotoItem {
  key: string
  name: string
  srcUrl: string
  w: number
  h: number
  fx: number
  fy: number
  kind: AdsV2ScreenPhotoKind | null
  /** KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o arquivo entra COMO VÍDEO (srcUrl = miniatura do trecho mais vivo). */
  video: { file: File; seconds: number; width: number; height: number; start: number } | null
  uploaded: { sig: string; footageId: string } | null
  busy: boolean
  error: string | null
}
interface LogoItem {
  footageId: string | null
  localUrl: string | null
  busy: boolean
  error: string | null
}
interface CardFields {
  offer: string
  cta: string
  contact: string
  color: string
}

type Phase = 'loading' | 'build' | 'progress' | 'delivered' | 'failed'

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

// ─── constantes ───────────────────────────────────────────────────────────────────────────────

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const POLL_MS = 8000
const POLL_RETRY_MS = 20_000
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov'
/** Recusas do /plan em que o vídeo volta a ser fotos (plano B) — KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29. */
const VIDEO_TO_PHOTOS_CODES: readonly string[] = ['video_unreadable', 'video_too_short', 'video_too_long', 'video_invalid']
/** Por que um vídeo NÃO entrou como vídeo (inglês do modo completo). */
const VIDEO_AS_PHOTOS_WHY: Readonly<Record<string, string>> = {
  too_big: 'videos over 50 MB go in as photos taken from them.',
  bad_type: 'only MP4 and MOV videos go in as video; this one goes in as photos taken from it.',
  too_short: 'videos shorter than 3 seconds go in as photos taken from them.',
  too_many: 'up to 2 videos go in as video; this one goes in as photos taken from it.',
  unreadable: "your browser could not read this video's length or size, so it goes in as photos taken from it.",
}
const PHOTO_MAX_BYTES = 50 * 1024 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_CARD: CardFields = { offer: '', cta: 'Visit us', contact: '', color: '#2997ff' }
const CTA_SUGGESTIONS = ['Visit us', 'Call us', 'Book now', 'Buy now', 'Message us on WhatsApp', 'Sign up']

// ─── utilidades (sem estado) ──────────────────────────────────────────────────────────────────

async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? JSON_HEADERS : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, code: 'network', body: {} }
  }
  let body: Record<string, unknown> = {}
  try {
    const j = await res.json()
    if (j && typeof j === 'object' && !Array.isArray(j)) body = j as Record<string, unknown>
  } catch {
    /* corpo vazio */
  }
  if (!res.ok) return { ok: false, status: res.status, code: typeof body.error === 'string' ? body.error : `http_${res.status}`, body }
  return { ok: true, status: res.status, data: body as T }
}

const numOr = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function apiError(r: { code: string; body: Record<string, unknown> }): string {
  return adsV2ErrorMessage(r.code, {
    needed: numOr(r.body.needed),
    balance: numOr(r.body.balance),
    credits: numOr(r.body.credits),
    message: typeof r.body.message === 'string' ? r.body.message : undefined,
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), type, quality)
    } catch (e) {
      reject(e instanceof Error ? e : new Error('encode_failed'))
    }
  })
}

const focalSig = (p: Pick<PhotoItem, 'fx' | 'fy'>) => `${p.fx.toFixed(3)},${p.fy.toFixed(3)}`
/** O vídeo sobe UMA vez (o enquadramento vai no pedido, não no arquivo). */
const uploadSig = (p: Pick<PhotoItem, 'fx' | 'fy' | 'video'>) => (p.video ? 'video' : focalSig(p))

function normalizeLink(raw: string): string {
  const l = raw.trim()
  if (!l) return ''
  return /^https?:\/\//i.test(l) ? l : `https://${l}`
}

/** Recorte 9:16 no navegador: a janela do ponto focal, desenhada em 1080×1920 e codificada em JPEG q0.9. */
async function cropToVertical(p: Pick<PhotoItem, 'srcUrl' | 'fx' | 'fy' | 'name'>): Promise<File> {
  const img = await loadImage(p.srcUrl)
  const r = cropRect(img.naturalWidth, img.naturalHeight, p.fx, p.fy)
  const canvas = document.createElement('canvas')
  canvas.width = ADS_V2_CROP.width
  canvas.height = ADS_V2_CROP.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ADS_V2_CROP.width, ADS_V2_CROP.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, ADS_V2_CROP.width, ADS_V2_CROP.height)
  const blob = await canvasToBlob(canvas, ADS_V2_CROP.type, ADS_V2_CROP.quality)
  const base = (p.name || 'photo').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo'
  return new File([blob], `${base}-9x16.jpg`, { type: ADS_V2_CROP.type })
}

function clearOrderParam() {
  try {
    const u = new URL(window.location.href)
    if (!u.searchParams.has('order')) return
    u.searchParams.delete('order')
    window.history.replaceState(null, '', u.toString())
  } catch {
    /* ignore */
  }
}

// ─── estilo (tokens do assistente atual: ADS_WIZARD_THEME_CSS) ────────────────────────────────

const ADS_V2_CSS = `
.adv2 .adsw-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid transparent;cursor:pointer;text-decoration:none;font-family:inherit;text-align:center;max-width:100%}
.adv2 .adsw-btn:disabled{cursor:not-allowed}
.adv2 .adsw-link{font-weight:650;text-decoration:none}.adv2 .adsw-link:hover{text-decoration:underline}
.adv2 .adsw-f{display:block;min-width:0}.adv2 .adsw-f>span{display:block}.adv2 .adsw-f small,.adv2 .adsw-hint{display:block}
.adv2 .adsw-err,.adv2 .adsw-warn,.adv2 .adsw-hint{font-size:13px;margin:8px 0 0}
.adv2 :is([tabindex],label):focus-visible{outline:2px solid var(--ads-accent);outline-offset:3px}
.adv2 .adv2-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.adv2 .adv2-head{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-start;justify-content:space-between;max-width:none}
.adv2 .adv2-head>div:first-child{min-width:0;flex:1 1 320px}
.adv2 .adv2-confirm{margin:0 0 20px;padding:18px 20px;border:1px solid var(--ads-accent);border-radius:14px;background:var(--ads-tint);color:var(--ads-text);display:grid;gap:10px}
.adv2 .adv2-confirm p{margin:0;line-height:1.6}
.adv2 .adv2-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,340px);gap:24px;align-items:start}
.adv2 .adv2-main{min-width:0;display:grid;gap:20px}
.adv2 .adv2-aside{min-width:0;display:grid;gap:16px;position:sticky;top:20px}
.adv2 .adv2-card{min-width:0;padding:clamp(18px,2.2vw,30px);border:1px solid var(--ads-line);border-radius:18px;background:var(--ads-card);overflow-wrap:anywhere}
.adv2 .adv2-card h2{margin:0 0 6px}
.adv2 .adv2-card .adsw-lead{margin:0 0 18px}
.adv2 .adv2-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:99px;background:var(--ads-tint);color:var(--ads-accent);font-size:13px;font-weight:700;margin-right:8px;flex-shrink:0}
.adv2 .adv2-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin:0;padding:0;border:0}
.adv2 .adv2-tier{position:relative;display:grid;gap:8px;align-content:start;padding:18px;border:1px solid var(--ads-line);border-radius:15px;background:var(--ads-bg);cursor:pointer;min-width:0}
.adv2 .adv2-tier:has(input:checked){border-color:var(--ads-accent);background:var(--ads-tint);box-shadow:0 0 0 1px var(--ads-accent)}
.adv2 .adv2-tier:has(input:focus-visible){outline:2px solid var(--ads-accent);outline-offset:3px}
.adv2 .adv2-tier b{font-size:16px}
.adv2 .adv2-tier .cr{font-size:15px;font-weight:700;color:var(--ads-accent)}
.adv2 .adv2-tier ul{margin:0;padding-left:18px;color:var(--ads-secondary);font-size:13px;line-height:1.55}
.adv2 .adv2-tier .short{font-size:12.5px;color:var(--ads-warning);line-height:1.5}
.adv2 .adv2-balance{margin:12px 0 0;font-size:13.5px;color:var(--ads-secondary)}
.adv2 .adv2-requests{margin:0 0 14px;padding:14px 16px;border-radius:12px;background:var(--ads-soft);color:var(--ads-text);font-size:13.5px;line-height:1.6}
.adv2 .adv2-requests ul{margin:6px 0 0;padding-left:18px}
.adv2 .adv2-photos{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.adv2 .adv2-photo{display:flex;flex-wrap:wrap;gap:14px;padding:14px;border:1px solid var(--ads-line);border-radius:14px;background:var(--ads-bg);min-width:0}
.adv2 .adv2-frame{position:relative;flex:0 0 auto;width:132px;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:#0b1018;touch-action:none;cursor:grab;user-select:none}
.adv2 .adv2-frame[aria-disabled=true]{cursor:default;opacity:.8}
.adv2 .adv2-frame img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.adv2 .adv2-frame .badge{position:absolute;left:6px;bottom:6px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px;background:rgba(0,0,0,.66);color:#fff}
.adv2 .adv2-pctl{flex:1 1 170px;min-width:0;display:grid;gap:8px;align-content:start}
.adv2 .adv2-pctl .nm{font-size:13px;font-weight:650;color:var(--ads-text)}
.adv2 .adv2-kinds{margin:0;padding:0;border:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;min-width:0}
.adv2 .adv2-kinds legend{font-size:12.5px;color:var(--ads-secondary);margin-bottom:6px;padding:0}
.adv2 .adv2-kinds label{display:flex;align-items:center;gap:6px;min-height:40px;padding:7px 9px;border:1px solid var(--ads-line);border-radius:10px;font-size:12.5px;font-weight:600;color:var(--ads-secondary);background:var(--ads-card);cursor:pointer;line-height:1.3;min-width:0}
.adv2 .adv2-kinds label:has(input:checked){border-color:var(--ads-accent);color:var(--ads-accent);background:var(--ads-tint)}
.adv2 .adv2-kinds label:has(input:focus-visible){outline:2px solid var(--ads-accent);outline-offset:2px}
.adv2 .adv2-kinds input{accent-color:var(--ads-action);margin:0;flex-shrink:0}
.adv2 .adv2-prow{display:flex;flex-wrap:wrap;gap:8px}
.adv2 .adv2-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:56px;padding:12px;border:1px dashed var(--ads-line-strong);border-radius:14px;background:var(--ads-bg);color:var(--ads-secondary);font-weight:650;cursor:pointer;font-family:inherit;font-size:14px}
.adv2 .adv2-add:hover:not(:disabled){border-color:var(--ads-accent);background:var(--ads-tint)}
.adv2 .adv2-add:disabled{opacity:.6;cursor:not-allowed}
.adv2 .adv2-logo{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.adv2 .adv2-logo .tile{width:96px;height:96px;border-radius:12px;border:1px solid var(--ads-line);background:repeating-conic-gradient(#1b2230 0 25%,#141922 0 50%) 50%/16px 16px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.adv2 .adv2-logo .tile img{max-width:100%;max-height:100%;object-fit:contain;padding:8px}
.adv2 .adv2-logo .tile .ph{font-size:12px;font-weight:600;color:#dbe4ef}
.adv2 .adv2-cardwrap{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.adv2 .adv2-cardwrap>.fields{flex:1 1 240px;min-width:0}
.adv2 .adv2-cardprev{width:120px;aspect-ratio:9/16;height:auto;border-radius:10px;border:1px solid var(--ads-line);background:#0b1018;flex:0 0 auto}
.adv2 .adv2-color{display:flex;align-items:center;gap:10px}
.adv2 .adv2-color input[type=color]{width:48px;height:40px;padding:2px;border:1px solid var(--ads-line);border-radius:8px;background:var(--ads-card)}
.adv2 .adv2-missing{margin:12px 0 0;padding:12px 14px;border-radius:12px;background:var(--ads-soft);font-size:13.5px;line-height:1.6;color:var(--ads-text)}
.adv2 .adv2-missing ul{margin:4px 0 0;padding-left:18px}
.adv2 .adv2-plan-shots{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:10px}
.adv2 .adv2-plan-shots li{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg);min-width:0}
.adv2 .adv2-plan-shots .th{width:48px;aspect-ratio:9/16;border-radius:7px;overflow:hidden;background:var(--ads-soft);flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ads-muted);text-align:center}
.adv2 .adv2-plan-shots .th img{width:100%;height:100%;object-fit:cover;display:block}
.adv2 .adv2-plan-shots .tx{min-width:0;display:grid;gap:2px;font-size:13.5px;line-height:1.5}
.adv2 .adv2-plan-shots .tx b{font-size:13px}
.adv2 .adv2-plan-shots .tx span{color:var(--ads-secondary)}
.adv2 .adv2-lines{margin:0 0 18px;padding-left:18px;line-height:1.7}
.adv2 .adv2-voice{margin:0 0 18px;padding:14px 16px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg)}
.adv2 .adv2-voice p{margin:8px 0 0;line-height:1.7}
.adv2 .adv2-voice p.off{color:var(--ads-muted);text-decoration:line-through}
.adv2 .adv2-switch{display:inline-flex;align-items:center;gap:10px;min-height:40px;padding:6px 12px;border:1px solid var(--ads-line-strong);border-radius:999px;background:var(--ads-card);color:var(--ads-text);font:inherit;font-size:13.5px;font-weight:650;cursor:pointer}
.adv2 .adv2-switch i{position:relative;width:34px;height:20px;border-radius:99px;background:var(--ads-line-strong);flex-shrink:0}
.adv2 .adv2-switch i::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:99px;background:#fff;transition:left .15s ease}
.adv2 .adv2-switch[aria-checked=true] i{background:var(--ads-action)}
.adv2 .adv2-switch[aria-checked=true] i::after{left:17px}
.adv2 .adv2-total{margin:0 0 6px;font-size:14px;color:var(--ads-secondary)}
.adv2 .adv2-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(46%,132px),1fr));gap:12px}
.adv2 .adv2-shot{display:grid;gap:6px;min-width:0}
.adv2 .adv2-shot .th{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;border:1px solid var(--ads-line);background:var(--ads-soft);display:flex;align-items:center;justify-content:center}
.adv2 .adv2-shot .th img,.adv2 .adv2-shot .th video{width:100%;height:100%;object-fit:cover;display:block}
.adv2 .adv2-shot .th .ph{font-size:12px;color:var(--ads-muted);padding:8px;text-align:center}
.adv2 .adv2-shot .st{font-size:12.5px;font-weight:650;color:var(--ads-secondary)}
.adv2 .adv2-shot .st[data-state=ready]{color:var(--ads-success)}
.adv2 .adv2-shot .st[data-state=failed]{color:var(--ads-warning)}
.adv2 .adv2-shot .adsw-btn{width:100%;font-size:12.5px}
.adv2 .adv2-player{display:block;width:min(100%,360px);aspect-ratio:9/16;height:auto;max-height:75dvh;border-radius:14px;border:1px solid var(--ads-line);background:#000;object-fit:contain}
.adv2 .adv2-note{margin:14px 0 0;padding:14px 16px;border-radius:12px;border:1px solid var(--ads-line);background:var(--ads-tint);color:var(--ads-text);line-height:1.6;font-size:14px}
.adv2 .adv2-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px}
.adv2 .adv2-aside h2{font-size:17px;margin:0 0 10px}
.adv2 .adv2-classic{margin:6px 0 0;font-size:13px;line-height:1.5}
.adv2 .adv2-classic a{color:var(--ads-muted);text-decoration:underline;text-underline-offset:3px}
.adv2 .adv2-classic a:hover{color:var(--ads-accent)}
.adv2 .adv2-how{margin:0;padding:0;list-style:none;display:grid;gap:12px}
.adv2 .adv2-how li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.6;color:var(--ads-secondary)}
.adv2 .adv2-how b{display:block;color:var(--ads-text)}
.adv2 .adv2-shape{margin:0 0 10px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.adv2 .adv2-shape li{padding:4px 10px;border-radius:99px;background:var(--ads-soft);font-size:12.5px;font-weight:600;color:var(--ads-text)}
.adv2 .adv2-tips{margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;color:var(--ads-secondary);display:grid;gap:4px}
@media(max-width:1000px){.adv2 .adv2-layout{grid-template-columns:minmax(0,1fr)}.adv2 .adv2-aside{position:static}}
@media(max-width:640px){.adv2 .adv2-frame{width:112px}.adv2 .adv2-card{border-radius:14px}.adv2 .adsw-actions .adsw-btn,.adv2 .adv2-actions .adsw-btn{flex:1 1 auto}}
@media(max-width:360px){.adv2 .adv2-kinds{grid-template-columns:minmax(0,1fr)}}
`

// ─── a página: cabeçalho com "Start over" + a sessão (remontada a cada Start over) ────────────

// KINEO-ADS-MODO-SIMPLES-2026-09-29 — o invólucro escolhe o MODO. Entrada padrão = SIMPLES (AdsV2Simple.tsx: arquivos,
// uma frase, nível, pesquisa com fonte, logo opcional, tela em pt/es/en). ?mode=full = o construtor completo, IDÊNTICO
// ao de antes (AdsV2Session daqui para baixo não mudou; o guardião test-ads-modo-simples prende a impressão digital).
// Os textos do cabeçalho vêm de ADS_V2_SIMPLE_COPY.shell: no modo completo, a tabela en (o inglês de sempre); no simples,
// a língua da interface. Trocar de modo é um link de página inteira (o anúncio em andamento é retomado na troca);
// "Start over" volta ao simples. O page.tsx não mudou.
function setModeParam(mode: 'full' | null) {
  try {
    const u = new URL(window.location.href)
    if (mode) u.searchParams.set('mode', mode)
    else u.searchParams.delete('mode')
    window.history.replaceState(null, '', u.toString())
  } catch {
    /* ignore */
  }
}

// KINEO-ADS-3-VARIACOES-2026-09-30 — ?group=<id> = o painel das 3 variações (retomado ao recarregar).
function setGroupParam(id: string | null) {
  try {
    const u = new URL(window.location.href)
    if (id) u.searchParams.set('group', id)
    else u.searchParams.delete('group')
    window.history.replaceState(null, '', u.toString())
  } catch {
    /* ignore */
  }
}

// KINEO-ADS-V2-VIRADA-2026-09-29 — classicCredits: o custo do anúncio clássico (KINEO1_35S_CREDITS) vem do servidor
// (page.tsx lê lib/ads/offer) — o cliente não ganha import novo e nunca digita o número.
// KINEO-ADS-3-VARIACOES-2026-09-30 — variations: a opção "3 variações" (adsVariationsVisible, decidido no page.tsx).
// Com ela, ?group=<id> (ou o grupo em andamento mais novo) abre o painel das 3 no lugar da sessão; sem ela, nada muda.
export default function AdsV2Client({ initialBalance, classicCredits = null, variations = false }: { initialBalance: number | null; classicCredits?: number | null; variations?: boolean }) {
  const [session, setSession] = useState(0)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupChecked, setGroupChecked] = useState(!variations)
  const [balance, setBalance] = useState<number | null>(initialBalance)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [activeWork, setActiveWork] = useState(false)
  const [mode, setMode] = useState<'simple' | 'full' | null>(null)
  const lang = useInterfaceLanguage()
  // Foco na opção SEGURA ("Keep working"): Enter segurado no "Start over" não apaga tudo por repetição de tecla.
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const resetBtnRef = useRef<HTMLButtonElement | null>(null)
  // Modo completo = o inglês de sempre; simples (e o instante antes de ler a URL) = a língua da interface.
  const shell = mode === 'full' ? ADS_V2_SIMPLE_COPY.en.shell : pickInterfaceCopy(ADS_V2_SIMPLE_COPY, lang).shell
  const nav = pickInterfaceCopy(ADS_V2_SIMPLE_COPY, lang).shell

  // ?mode=full abre o construtor completo; qualquer outra coisa, o simples.
  useEffect(() => {
    let m: 'simple' | 'full' = 'simple'
    try {
      if (new URLSearchParams(window.location.search).get('mode') === 'full') m = 'full'
    } catch {
      m = 'simple'
    }
    setMode(m)
  }, [])

  // KINEO-ADS-3-VARIACOES-2026-09-30 — retomar o painel das 3: ?group=<id>, ou (sem ?order=) o grupo em andamento mais novo.
  useEffect(() => {
    if (!variations) return
    let cancelled = false
    ;(async () => {
      let wanted: string | null = null
      let hasOrder = false
      try {
        const q = new URLSearchParams(window.location.search)
        const g = q.get('group')
        if (g && /^[0-9a-f-]{36}$/i.test(g)) wanted = g.toLowerCase()
        hasOrder = !!q.get('order')
      } catch {
        wanted = null
      }
      if (!wanted && !hasOrder) {
        const r = await api<{ group?: { group_id?: string } | null }>('/api/ads/v2/variations?latest=1')
        if (r.ok && r.data.group && typeof r.data.group.group_id === 'string') wanted = r.data.group.group_id
      }
      if (cancelled) return
      if (wanted) setGroupParam(wanted)
      setGroupId(wanted)
      setGroupChecked(true)
    })()
    return () => {
      cancelled = true
    }
  }, [variations])

  function openGroup(id: string) {
    clearOrderParam()
    setGroupParam(id)
    setGroupId(id)
    setActiveWork(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const refreshBalance = useCallback(async () => {
    const r = await api<{ credits?: unknown }>('/api/credits')
    if (r.ok && typeof r.data.credits === 'number' && Number.isFinite(r.data.credits)) setBalance(r.data.credits)
  }, [])

  useEffect(() => {
    if (confirmingReset) confirmRef.current?.focus()
  }, [confirmingReset])

  // "Get credits" abre /pricing em OUTRA aba (a página guarda fotos e plano só na memória): ao voltar, relê o saldo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshBalance()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshBalance])

  // Start over: a sessão velha é desmontada inteira (key muda) e a nova nasce vazia, sem retomar pedido nenhum — no modo simples.
  function startOver() {
    clearOrderParam()
    setModeParam(null)
    setGroupParam(null)
    setGroupId(null)
    setConfirmingReset(false)
    setActiveWork(false)
    setMode('simple')
    setSession((s) => s + 1)
    void refreshBalance()
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  return (
    <div className="stu adsw adv2">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ADS_WIZARD_THEME_CSS + ADS_V2_CSS + ADS_V2_VARIATIONS_CSS }} />
      <header className="adsw-header adv2-head">
        <div>
          <h1>{shell.title}</h1>
          <p className="sub">{mode === 'full' ? shell.sub : shell.subSimple}</p>
          {/* KINEO-ADS-V2-VIRADA-2026-09-29 — o assistente antigo continua existindo como opção clássica (discreto, <a> sem prefetch). */}
          {classicCredits !== null && mode === 'full' ? (
            <p className="adv2-classic">
              <a href="/ads/new?classic=1">Prefer a narrated 35-second ad? Use the classic maker ({classicCredits} credits)</a>
            </p>
          ) : null}
          {mode ? (
            <p className="adv2-classic">
              <a href={mode === 'simple' ? '/ads/v2?mode=full' : '/ads/v2'}>{mode === 'simple' ? nav.toFull : nav.toSimple}</a>
            </p>
          ) : null}
        </div>
        <button ref={resetBtnRef} type="button" className="adsw-btn ghost small" aria-expanded={confirmingReset} aria-controls="adv2-reset" onClick={() => setConfirmingReset(true)}>
          {shell.startOver}
        </button>
      </header>
      {confirmingReset ? (
        <div id="adv2-reset" className="adv2-confirm" role="alertdialog" aria-labelledby="adv2-reset-t" aria-describedby="adv2-reset-d">
          <p id="adv2-reset-t"><b>{shell.confirmTitle}</b></p>
          <p id="adv2-reset-d">
            {shell.confirmBody}
            {activeWork ? shell.activeNote : ''}
          </p>
          <div className="adv2-actions" style={{ marginTop: 0 }}>
            <button type="button" className="adsw-btn small" onClick={startOver}>{shell.yes}</button>
            <button ref={confirmRef} type="button" className="adsw-btn ghost small" onClick={() => { setConfirmingReset(false); resetBtnRef.current?.focus() }}>{shell.keep}</button>
          </div>
        </div>
      ) : null}
      {groupId && mode ? (
        <VariationsBoard key={groupId} groupId={groupId} lang={mode === 'full' ? 'en' : lang} onBalance={refreshBalance} onAnother={startOver} />
      ) : null}
      {groupId || !groupChecked ? null : (
      <>
      {mode === 'full' ? (
        <AdsV2Session
          key={session}
          resume={session === 0}
          balance={balance}
          onBalance={refreshBalance}
          onActive={setActiveWork}
          onAskStartOver={() => setConfirmingReset(true)}
          variations={variations}
          onVariationsStarted={openGroup}
        />
      ) : mode === 'simple' ? (
        <AdsV2SimpleSession
          key={session}
          resume={session === 0}
          lang={lang}
          balance={balance}
          onBalance={refreshBalance}
          onActive={setActiveWork}
          onAskStartOver={() => setConfirmingReset(true)}
          variations={variations}
          onVariationsStarted={openGroup}
        />
      ) : null}
      </>
      )}
    </div>
  )
}

// ─── a sessão: todo dado do anúncio mora aqui ────────────────────────────────────────────────

function AdsV2Session({
  resume,
  balance,
  onBalance,
  onActive,
  onAskStartOver,
  variations = false,
  onVariationsStarted,
}: {
  resume: boolean
  balance: number | null
  onBalance: () => Promise<void>
  onActive: (active: boolean) => void
  onAskStartOver: () => void
  variations?: boolean
  onVariationsStarted?: (groupId: string) => void
}) {
  const [phase, setPhase] = useState<Phase>(resume ? 'loading' : 'build')
  const [tier, setTier] = useState<AdsV2Tier | null>(null)
  // KINEO-ADS-3-VARIACOES-2026-09-30 — "3 variações" ligada (só aparece com a opção liberada para a conta).
  const [three, setThree] = useState(false)
  const [business, setBusiness] = useState('')
  const [sentence, setSentence] = useState('')
  const [link, setLink] = useState('')
  const [sector, setSector] = useState<AdsV2ScreenSector | null>(null)
  const [logo, setLogo] = useState<LogoItem | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  // Leitura fresca das fotos para quem roda no fim de um await longo (o planAd): `photos` do fechamento é o da renderização.
  const photosRef = useRef<PhotoItem[]>([])
  photosRef.current = photos
  const [previewPhotoKey, setPreviewPhotoKey] = useState<string | null>(null)
  const [photoNote, setPhotoNote] = useState<string | null>(null)
  const [card, setCard] = useState<CardFields>(DEFAULT_CARD)
  const [cardUpload, setCardUpload] = useState<{ sig: string; footageId: string } | null>(null)
  const [draft, setDraft] = useState<{ id: string; key: string } | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const { previousPlan, rememberPlan } = usePlanComparison()
  const [narrationOn, setNarrationOn] = useState(true)
  const [busy, setBusy] = useState<null | 'plan' | 'start' | 'check' | 'voice' | 'redo'>(null)
  const [busyNote, setBusyNote] = useState<string | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [checkNote, setCheckNote] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [pollNote, setPollNote] = useState<string | null>(null)
  const [redoAsk, setRedoAsk] = useState<number | null>(null)
  const [redoError, setRedoError] = useState<string | null>(null)
  const [redoNote, setRedoNote] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const [notReady, setNotReady] = useState(false)

  const aliveRef = useRef(true)
  // Revisão (29/09): uma seleção por vez — o limite de 2 vídeos é contado sobre `photos`, que só atualiza na próxima
  // renderização; duas seleções seguidas durante a leitura de um vídeo passavam de 2.
  const addingRef = useRef(false)
  const pollRef = useRef<number | null>(null)
  const currentOrderRef = useRef<string | null>(null)
  const urlsRef = useRef<Set<string>>(new Set())
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const planHeadingRef = useRef<HTMLHeadingElement | null>(null)

  // Desmontar (Start over ou sair da página): nada que chegue depois mexe na tela, na URL ou no saldo; o poll para.
  useEffect(() => {
    aliveRef.current = true
    const urls = urlsRef.current
    return () => {
      aliveRef.current = false
      currentOrderRef.current = null
      if (pollRef.current) window.clearTimeout(pollRef.current)
      pollRef.current = null
      for (const u of urls) {
        try { URL.revokeObjectURL(u) } catch { /* ignore */ }
      }
      urls.clear()
    }
  }, [])

  const cost = tier ? adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) : null
  const composed = composeSentence(business, sentence)
  const linkNorm = normalizeLink(link)

  const planSig = useMemo(
    () =>
      JSON.stringify({
        tier,
        composed,
        link: linkNorm,
        sector,
        logo: logo?.footageId ?? null,
        photos: photos.map((p) => [p.key, p.kind, focalSig(p)]),
      }),
    [tier, composed, linkNorm, sector, logo?.footageId, photos],
  )
  const cardSig = JSON.stringify({ business: business.trim(), ...card, logo: logo?.footageId ?? null })
  const planFresh = !!plan && plan.sig === planSig

  const missing: string[] = []
  if (!tier) missing.push('Choose a level.')
  if (!business.trim()) missing.push('Write your business name.')
  if (!composed && !linkNorm) missing.push('Write one sentence about your business, or paste its link.')
  if (composed === 'too_long') missing.push('Shorten your sentence (400 characters, business name included).')
  if (!sector) missing.push('Choose the kind of business.')
  if (!logo?.footageId) missing.push(logo?.busy ? 'Wait for your logo to finish uploading.' : 'Add your logo.')
  if (photos.length < ADS_V2_MIN_PHOTOS) missing.push(`Add ${ADS_V2_MIN_PHOTOS - photos.length} more photo${ADS_V2_MIN_PHOTOS - photos.length === 1 ? '' : 's'} (${ADS_V2_MIN_PHOTOS} to ${ADS_V2_MAX_PHOTOS}).`)
  if (photos.some((p) => !p.kind)) missing.push('Mark what each photo shows.')
  if (photos.length > 0 && photos.every((p) => p.video)) missing.push('Add at least 1 photo along with your videos.')

  // ── URL, poll e vista do pedido ──────────────────────────────────────────────────────────

  function setOrderParam(id: string) {
    if (!aliveRef.current) return
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('order', id)
      window.history.replaceState(null, '', u.toString())
    } catch {
      /* ignore */
    }
  }

  function schedulePoll(orderId: string, ms: number) {
    if (!aliveRef.current) return
    if (pollRef.current) window.clearTimeout(pollRef.current)
    pollRef.current = window.setTimeout(() => {
      void pollOnce(orderId)
    }, ms)
  }

  function applyView(v: StatusView) {
    if (!aliveRef.current || currentOrderRef.current !== v.order_id) return
    setOrder({
      order_id: v.order_id,
      status: v.status,
      tier: v.tier,
      seconds: v.seconds,
      credits: v.credits,
      video_id: v.video_id,
      error: v.error,
      parent_order_id: v.parent_order_id,
      shots: Array.isArray(v.shots) ? v.shots : [],
    })
    if ('video' in v) setVideo(v.video ?? null)
    if (isActiveOrderStatus(v.status)) {
      setPhase('progress')
      onActive(true)
      schedulePoll(v.order_id, POLL_MS)
    } else if (v.status === 'delivered') {
      setPhase('delivered')
      onActive(false)
      void onBalance()
    } else if (v.status === 'failed' || v.status === 'cancelled') {
      setPhase('failed')
      onActive(false)
      void onBalance()
    } else {
      setPhase('build')
    }
  }

  function adoptOrder(v: StatusView) {
    if (!aliveRef.current) return
    currentOrderRef.current = v.order_id
    setOrderParam(v.order_id)
    setRedoAsk(null)
    setRedoError(null)
    applyView(v)
  }

  async function pollOnce(orderId: string) {
    if (!aliveRef.current || currentOrderRef.current !== orderId) return
    const r = await api<StatusView>(`/api/ads/v2/status?order_id=${encodeURIComponent(orderId)}`)
    if (!aliveRef.current || currentOrderRef.current !== orderId) return
    if (!r.ok) {
      if (r.code === 'order_not_found' || r.code === 'unauthenticated') {
        setPollNote(apiError(r))
        return
      }
      setPollNote('We lost contact for a moment. Still checking: your ad keeps being made either way.')
      schedulePoll(orderId, POLL_RETRY_MS)
      return
    }
    setPollNote(null)
    applyView(r.data)
  }

  // Retomar (só a 1ª sessão): ?order=<id> ou o anúncio em andamento mais novo. Rascunho/plano velho NUNCA volta.
  useEffect(() => {
    if (!resume) return
    let cancelled = false
    ;(async () => {
      let wanted: string | null = null
      try {
        const q = new URLSearchParams(window.location.search).get('order')
        if (q && UUID_RE.test(q)) wanted = q.toLowerCase()
      } catch {
        wanted = null
      }
      if (!wanted) {
        const list = await api<{ orders?: { id: string; status: string }[] }>('/api/ads/v2/orders')
        if (cancelled || !aliveRef.current) return
        if (!list.ok) {
          if (list.code === 'not_ready') setNotReady(true)
          setPhase('build')
          return
        }
        const active = (list.data.orders ?? []).find((o) => isActiveOrderStatus(o.status))
        wanted = active ? active.id : null
      }
      if (!wanted) {
        setPhase('build')
        return
      }
      const one = await api<{ order?: StatusView }>(`/api/ads/v2/orders?id=${encodeURIComponent(wanted)}`)
      if (cancelled || !aliveRef.current) return
      const v = one.ok ? one.data.order : undefined
      if (!v || v.status === 'draft' || v.status === 'planned') {
        if (!one.ok && one.code === 'not_ready') setNotReady(true)
        clearOrderParam()
        setPhase('build')
        return
      }
      adoptOrder(v)
      if (!isActiveOrderStatus(v.status)) void pollOnce(v.order_id)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume])

  // Foco no título da fase nova (leitor de tela e teclado acompanham a troca).
  useEffect(() => {
    if (phase === 'progress' || phase === 'delivered' || phase === 'failed') headingRef.current?.focus()
  }, [phase])

  // Prévia do cartão final (logo real + o que a pessoa escreveu).
  useEffect(() => {
    const canvas = cardCanvasRef.current
    if (!canvas || phase !== 'build') return
    let stop = false
    ;(async () => {
      let img: HTMLImageElement | null = null
      if (logo?.localUrl) {
        try { img = await loadLogoImage(logo.localUrl) } catch { img = null }
      }
      if (stop) return
      try {
        drawEndCard(canvas, { logo: img, business: business.trim(), offer: card.offer.trim(), ctaLabel: card.cta.trim(), contact: card.contact.trim(), accent: card.color })
      } catch {
        /* navegador sem canvas: a prévia fica vazia; o envio mostra o erro */
      }
    })()
    return () => {
      stop = true
    }
  }, [phase, logo?.localUrl, business, card])

  // ── arquivos ─────────────────────────────────────────────────────────────────────────────

  function trackUrl(u: string) {
    urlsRef.current.add(u)
    return u
  }
  function dropUrl(u: string | null | undefined) {
    if (!u) return
    try { URL.revokeObjectURL(u) } catch { /* ignore */ }
    urlsRef.current.delete(u)
  }

  async function chooseLogo(file: File | undefined) {
    if (!file) return
    setBuildError(null)
    const previous = logo?.localUrl
    setLogo({ footageId: null, localUrl: null, busy: true, error: null })
    try {
      const up = await uploadFootage(file, { isLogo: true })
      if (!aliveRef.current) return
      dropUrl(previous)
      setLogo({ footageId: up.footageId, localUrl: up.localUrl ? trackUrl(up.localUrl) : up.url, busy: false, error: null })
    } catch (e) {
      if (!aliveRef.current) return
      setLogo({ footageId: null, localUrl: null, busy: false, error: e instanceof AdsUploadError ? e.message : 'The logo did not upload. Try again.' })
    }
  }

  async function addPhotos(list: FileList | null) {
    if (!list || !list.length) return
    if (addingRef.current) {
      setPhotoNote('Wait: we are still reading the files you just added. Then add these again.')
      return
    }
    addingRef.current = true
    try {
      await addPhotosNow(list)
    } finally {
      addingRef.current = false
    }
  }

  async function addPhotosNow(list: FileList) {
    setPhotoNote(null)
    const photos = photosRef.current
    const room = ADS_V2_MAX_PHOTOS - photos.length
    const files = Array.from(list).slice(0, Math.max(0, room))
    const notes: string[] = []
    if (list.length > room) notes.push(`Only ${ADS_V2_MAX_PHOTOS} photos fit in one ad; the extra ones were left out.`)
    const added: PhotoItem[] = []
    let videosAlready = photos.filter((p) => p.video).length
    for (const f of files) {
      // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — vídeo: entra COMO VÍDEO quando cabe (mesma regra do modo simples:
      // readVideoForAd); senão, plano B com o motivo: 1 a 3 quadros viram fotos (videoFramesForAd).
      if (f.type.toLowerCase().startsWith('video/') || /\.(mp4|mov|m4v|webm|qt)$/i.test(f.name)) {
        setBusyNote(`Reading ${f.name}…`)
        const read = await readVideoForAd(f, videosAlready)
        if (!aliveRef.current) return
        if (read.kind === 'photos' && read.verdict === 'too_long') {
          notes.push(`${f.name}: the video must be under 10 minutes.`)
          setBusyNote(null)
          continue
        }
        if (read.kind === 'video') {
          videosAlready += 1
          added.push({
            key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: f.name,
            srcUrl: trackUrl(URL.createObjectURL(read.thumb)),
            w: read.width,
            h: read.height,
            fx: 0.5,
            fy: 0.5,
            kind: 'place',
            video: { file: f, seconds: read.seconds, width: read.width, height: read.height, start: read.start },
            uploaded: null,
            busy: false,
            error: null,
          })
        } else {
          added.push(...(await framesAsPhotos(f, `${f.name}: ${VIDEO_AS_PHOTOS_WHY[read.verdict] ?? VIDEO_AS_PHOTOS_WHY.unreadable}`, notes)))
        }
        setBusyNote(null)
        continue
      }
      if (!/^image\/(jpeg|png|webp)$/i.test(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)) {
        notes.push(`${f.name}: use a JPG, PNG or WebP photo, or an MP4, MOV or WebM video.`)
        continue
      }
      if (f.size > PHOTO_MAX_BYTES) {
        notes.push(`${f.name}: the photo must be under 50 MB.`)
        continue
      }
      const url = trackUrl(URL.createObjectURL(f))
      try {
        const img = await loadImage(url)
        if (!aliveRef.current) return
        added.push({
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          srcUrl: url,
          w: img.naturalWidth,
          h: img.naturalHeight,
          fx: 0.5,
          fy: 0.5,
          kind: null,
          video: null,
          uploaded: null,
          busy: false,
          error: null,
        })
      } catch {
        dropUrl(url)
        notes.push(`${f.name}: your browser cannot open this photo. Save it as JPG (on iPhone: Settings → Camera → Formats → Most Compatible) and add it again.`)
      }
    }
    if (!aliveRef.current) return
    if (added.length) setPhotos((prev) => [...prev, ...added].slice(0, ADS_V2_MAX_PHOTOS))
    setPhotoNote(notes.length ? notes.join(' ') : null)
  }

  /** Plano B: o vídeo vira 1 a 3 fotos (cada uma a marcar), com o aviso do motivo. */
  async function framesAsPhotos(f: File, why: string, notes: string[]): Promise<PhotoItem[]> {
    const frames = await videoFramesForAd(f)
    const out: PhotoItem[] = []
    for (const fr of frames) {
      const url = trackUrl(URL.createObjectURL(fr))
      try {
        const img = await loadImage(url)
        out.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: fr.name, srcUrl: url, w: img.naturalWidth, h: img.naturalHeight, fx: 0.5, fy: 0.5, kind: null, video: null, uploaded: null, busy: false, error: null })
      } catch {
        dropUrl(url)
      }
    }
    notes.push(out.length ? why : `${f.name}: your browser cannot open this video. Record it in 'Most Compatible' or send photos.`)
    return out
  }

  /** O servidor não conseguiu usar um vídeo como vídeo: ESSE item vira fotos (plano B). Planejar de novo é grátis. */
  async function videoBackToPhotos(footageId: string | null, byKey?: string, why?: string) {
    const target = photosRef.current.find((p) => p.video && (byKey ? p.key === byKey : p.uploaded?.footageId === footageId))
    if (!target?.video) return
    const notes: string[] = []
    const frames = await framesAsPhotos(target.video.file, `${target.name}: ${why ?? 'we could not use this video as video on our side, so it now goes in as photos taken from it. Mark them and plan again (free).'}`, notes)
    if (!aliveRef.current) return
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.key === target.key)
      if (i < 0) return prev
      const next = prev.slice()
      next.splice(i, 1, ...frames)
      return next.slice(0, ADS_V2_MAX_PHOTOS)
    })
    dropUrl(target.srcUrl)
    setPhotoNote(notes.join(' '))
  }

  function updatePhoto(key: string, patch: Partial<PhotoItem>) {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }
  function removePhoto(key: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.key === key)
      if (gone) dropUrl(gone.srcUrl)
      return prev.filter((p) => p.key !== key)
    })
  }
  function movePhotoUp(key: string) {
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.key === key)
      if (i <= 0) return prev
      const next = prev.slice()
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  /**
   * Recorta e sobe (um por vez) toda foto cujo enquadramento mudou desde o último envio.
   * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo sobe ORIGINAL (uma vez) e vai em `videos` com o trecho e o foco.
   */
  async function ensurePhotosUploaded(): Promise<{ photos: { footage_id: string; kind: AdsV2ScreenPhotoKind }[]; videos: { footage_id: string; start: number; focus_x: number; focus_y: number; width: number; height: number }[] } | null> {
    const out: { footage_id: string; kind: AdsV2ScreenPhotoKind }[] = []
    const videos: { footage_id: string; start: number; focus_x: number; focus_y: number; width: number; height: number }[] = []
    const push = (p: PhotoItem, footageId: string) => {
      if (p.video) videos.push({ footage_id: footageId, start: p.video.start, focus_x: p.fx, focus_y: p.fy, width: p.video.width, height: p.video.height })
      else out.push({ footage_id: footageId, kind: p.kind as AdsV2ScreenPhotoKind })
    }
    let n = 0
    for (const p of photos) {
      n += 1
      const sig = uploadSig(p)
      if (p.uploaded && p.uploaded.sig === sig) {
        push(p, p.uploaded.footageId)
        continue
      }
      setBusyNote(p.video ? `Uploading video ${n} of ${photos.length}…` : `Framing and uploading photo ${n} of ${photos.length}…`)
      updatePhoto(p.key, { busy: true, error: null })
      try {
        const file = p.video ? p.video.file : await cropToVertical(p)
        const up = await uploadFootage(file)
        if (!aliveRef.current) return null
        updatePhoto(p.key, { busy: false, uploaded: { sig, footageId: up.footageId } })
        push(p, up.footageId)
      } catch (e) {
        if (!aliveRef.current) return null
        const msg = e instanceof AdsUploadError ? e.message : 'This photo could not be framed and uploaded. Try again, or add it again as JPG.'
        updatePhoto(p.key, { busy: false, error: msg })
        setPlanError(`Photo ${n}: ${msg}`)
        return null
      }
    }
    return { photos: out, videos }
  }

  /** Desenha o cartão final (logo real) e sobe como PNG — só se mudou desde o último envio. */
  async function ensureCard(): Promise<{ sig: string; footageId: string } | null> {
    if (cardUpload && cardUpload.sig === cardSig) return cardUpload
    if (!logo?.localUrl) {
      setPlanError('Add your logo again: we need it to draw your last frame.')
      return null
    }
    setBusyNote('Drawing your last frame…')
    try {
      const img = await loadLogoImage(logo.localUrl)
      const canvas = document.createElement('canvas')
      drawEndCard(canvas, { logo: img, business: business.trim(), offer: card.offer.trim(), ctaLabel: card.cta.trim(), contact: card.contact.trim(), accent: card.color })
      const file = await toPngFile(canvas)
      const up = await uploadFootage(file)
      if (!aliveRef.current) return null
      const done = { sig: cardSig, footageId: up.footageId }
      setCardUpload(done)
      return done
    } catch (e) {
      if (!aliveRef.current) return null
      setPlanError(e instanceof AdsUploadError ? e.message : 'We could not draw your last frame. Add the logo again as PNG or JPG and try again.')
      return null
    }
  }

  /**
   * Chave do rascunho: nível + frase + link + NARRAÇÃO. O /plan escreve a voz só se order.narration for true, e o
   * PATCH recusa religar a voz num plano feito sem ela (replan_needed): religar = rascunho novo com a voz ligada.
   */
  const draftKey = (voice: boolean) => JSON.stringify({ tier, composed, link: linkNorm, voice })

  /** Rascunho no servidor para esta combinação de nível + frase + link + narração (mudou = rascunho novo). */
  async function ensureDraft(): Promise<string | null> {
    const key = draftKey(narrationOn)
    if (draft && draft.key === key) return draft.id
    setBusyNote('Saving your ad…')
    const r = await api<{ order_id: string }>('/api/ads/v2/orders', {
      method: 'POST',
      body: { tier, seconds: ADS_V2_SCREEN_SECONDS, sector, sentence: composed && composed !== 'too_long' ? composed : null, link: linkNorm || null, narration: narrationOn },
    })
    if (!aliveRef.current) return null
    if (!r.ok) {
      if (r.code === 'not_ready') setNotReady(true)
      setPlanError(apiError(r))
      return null
    }
    setDraft({ id: r.data.order_id, key })
    return r.data.order_id
  }

  // ── plano, início, checagem grátis, narração ─────────────────────────────────────────────

  /** Vídeos além do limite (2) viram fotos ANTES de subir — o /plan recusaria (too_many_videos). */
  async function videosPastLimitToPhotos(): Promise<boolean> {
    const extra = photosRef.current.filter((p) => p.video).slice(ADS_V2_PLAN_MAX_VIDEOS)
    for (const p of extra) await videoBackToPhotos(null, p.key, 'up to 2 videos go in as video; this one now goes in as photos taken from it. Mark them and plan again (free).')
    return extra.length > 0
  }

  async function planAd() {
    if (busy || missing.length) return
    setBusy('plan')
    setPlanError(null)
    setCheckNote(null)
    try {
      if (await videosPastLimitToPhotos()) return
      const sigAtStart = planSig
      const media = await ensurePhotosUploaded()
      if (!media || !aliveRef.current) return
      const { photos: uploaded, videos } = media
      const cardDone = await ensureCard()
      if (!cardDone || !aliveRef.current) return
      const orderId = await ensureDraft()
      if (!orderId || !aliveRef.current) return
      setBusyNote('Planning your shots, the words on screen and the voice-over…')
      const r = await api<PlanResponse>('/api/ads/v2/plan', {
        method: 'POST',
        body: { order_id: orderId, sector, logo_footage_id: logo?.footageId, photos: uploaded, videos, card_footage_id: cardDone.footageId },
      })
      if (!aliveRef.current) return
      if (!r.ok) {
        if (r.code === 'not_ready') setNotReady(true)
        if (VIDEO_TO_PHOTOS_CODES.includes(r.code)) void videoBackToPhotos(typeof r.body.footage_id === 'string' ? r.body.footage_id : null)
        if (r.code === 'too_many_videos') void videosPastLimitToPhotos()
        if (r.code === 'not_editable') setDraft(null)
        setPlanError(apiError(r))
        return
      }
      rememberPlan(r.data)
      setPlan({ ...r.data, sig: sigAtStart, cardSig: cardDone.sig })
      window.setTimeout(() => planHeadingRef.current?.focus(), 30)
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setBusyNote(null)
      }
    }
  }

  async function toggleNarration() {
    if (!plan || busy) return
    setPlanError(null)
    const want = !narrationOn
    // Voz de volta num plano feito SEM narração: não há texto para falar (o PATCH devolveria replan_needed). O plano
    // fica velho e o próximo "Plan my ad" nasce num rascunho novo com a voz ligada (draftKey muda).
    if (want && !(typeof plan.narration === 'string' && plan.narration.trim())) {
      setNarrationOn(true)
      setPlan(null)
      setCheckNote('Voice-over on. Plan your ad again to write it: planning is free.')
      return
    }
    setBusy('voice')
    const r = await api<{ narration: boolean }>('/api/ads/v2/orders', { method: 'PATCH', body: { order_id: plan.order_id, narration: want } })
    if (!aliveRef.current) return
    setBusy(null)
    if (!r.ok) {
      setPlanError(apiError(r))
      return
    }
    const on = r.data.narration === true
    setNarrationOn(on)
    // O rascunho do servidor agora tem esta narração: a chave acompanha (replanejar reusa o mesmo rascunho).
    setDraft((d) => (d && d.id === plan.order_id ? { ...d, key: draftKey(on) } : d))
  }

  /** O cartão mudou depois do plano: sobe o novo e troca no pedido (sem planejar de novo). */
  async function syncCard(p: Plan): Promise<boolean> {
    if (p.cardSig === cardSig) return true
    const done = await ensureCard()
    if (!done || !aliveRef.current) return false
    const r = await api('/api/ads/v2/orders', { method: 'PATCH', body: { order_id: p.order_id, card_footage_id: done.footageId } })
    if (!aliveRef.current) return false
    if (!r.ok) {
      setPlanError(apiError(r))
      return false
    }
    setPlan((cur) => (cur && cur.order_id === p.order_id ? { ...cur, cardSig: done.sig } : cur))
    return true
  }

  async function freeCheck() {
    if (!plan || !planFresh || busy) return
    setBusy('check')
    setPlanError(null)
    setCheckNote(null)
    try {
      if (!(await syncCard(plan))) return
      const r = await api<{ credits: number; shots: unknown[] }>('/api/ads/v2/start', { method: 'POST', body: { order_id: plan.order_id, dry_run: true } })
      if (!aliveRef.current) return
      if (!r.ok) {
        setPlanError(apiError(r))
        return
      }
      setCheckNote(`Check passed: ${Array.isArray(r.data.shots) ? r.data.shots.length : plan.shots.length} shots, ${r.data.credits} credits. Nothing was charged and nothing was sent to production.`)
    } finally {
      if (aliveRef.current) setBusy(null)
    }
  }

  async function makeAd() {
    if (!plan || !planFresh || busy || cost === null) return
    if (plan.credits !== cost) {
      setPlanError('The price of this plan changed. Plan again to see the current price.')
      return
    }
    // KINEO-ADS-3-VARIACOES-2026-09-30 — 3 variações: outra rota, o preço do GRUPO que a tela mostrou vai junto.
    if (variations && three && onVariationsStarted) {
      void makeVariations()
      return
    }
    setBusy('start')
    setPlanError(null)
    setCheckNote(null)
    try {
      if (!(await syncCard(plan))) return
      setBusyNote('Starting your ad…')
      // Daqui em diante o servidor pode cobrar e começar mesmo que a pessoa aperte "Start over": a confirmação avisa.
      onActive(true)
      const r = await api<StatusView>('/api/ads/v2/start', { method: 'POST', body: { order_id: plan.order_id } })
      if (!aliveRef.current) return
      if (!r.ok) {
        onActive(false)
        if (r.code === 'not_startable') {
          setDraft(null)
          setPlan(null)
        }
        setPlanError(apiError(r))
        void onBalance()
        return
      }
      setDraft(null)
      void onBalance()
      const v = r.data.order_id ? r.data : ({ ...r.data, order_id: plan.order_id } as StatusView)
      adoptOrder({ ...v, shots: Array.isArray(v.shots) ? v.shots : [] })
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setBusyNote(null)
      }
    }
  }

  async function makeVariations() {
    const group = variationsPrice(cost)
    if (!plan || group === null || !onVariationsStarted) return
    setBusy('start')
    setPlanError(null)
    setCheckNote(null)
    try {
      if (!(await syncCard(plan))) return
      setBusyNote(variationsCopy('en').starting)
      onActive(true)
      const r = await api<{ group_id?: string }>('/api/ads/v2/variations', { method: 'POST', body: { order_id: plan.order_id, expected_credits: group } })
      if (!aliveRef.current) return
      if (!r.ok || typeof r.data.group_id !== 'string') {
        onActive(false)
        if (!r.ok && r.code === 'not_startable') {
          setDraft(null)
          setPlan(null)
        }
        setPlanError(r.ok ? 'Something went wrong. Please try again.' : apiError(r))
        void onBalance()
        return
      }
      setDraft(null)
      void onBalance()
      onVariationsStarted(r.data.group_id)
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setBusyNote(null)
      }
    }
  }

  // ── refazer um plano (cobrado à parte, preço mostrado antes do clique) ──────────────────

  async function redoShot(shot: AdsV2ScreenShot) {
    if (!order || busy || !canRedoShot(shot, order.status)) return
    setBusy('redo')
    setRedoError(null)
    const parent = order.order_id
    onActive(true)
    const r = await api<StatusView>('/api/ads/v2/retake', { method: 'POST', body: { order_id: parent, idx: shot.idx, expected_credits: shot.retake_credits } })
    if (!aliveRef.current) return
    setBusy(null)
    if (!r.ok) {
      onActive(false)
      setRedoError(apiError(r))
      if (r.code === 'price_changed') void pollOnce(parent)
      void onBalance()
      return
    }
    setRedoAsk(null)
    setVideo(null)
    setRedoNote(`Redoing shot ${shot.idx + 1}. The first version of your ad stays in My Videos.`)
    void onBalance()
    adoptOrder({ ...r.data, shots: Array.isArray(r.data.shots) ? r.data.shots : [] })
  }

  /** Mostra outro pedido desta conta (a refação que falhou volta ao anúncio do pai, que continua entregue). */
  function openOrder(id: string) {
    if (!aliveRef.current) return
    currentOrderRef.current = id
    setOrderParam(id)
    setRedoNote(null)
    setRedoError(null)
    setPollNote(null)
    setPhase('loading')
    void pollOnce(id)
  }

  async function download() {
    const url = video?.video_url
    if (!url || downloading) return
    setDownloading(true)
    setDownloadNote(null)
    try {
      const outcome = await downloadVideoFile({
        url,
        filename: `${adFileSlug(business)}-ad.mp4`,
        exportType: 'clean',
        surface: 'ads',
        videoId: video?.id ?? order?.video_id ?? null,
        extra: { order_id: order?.order_id ?? null, v2: true },
      })
      if (outcome === 'popup_blocked' || outcome === 'unavailable') setDownloadNote('The download did not start. Open the ad in My Videos and download it there.')
    } catch {
      setDownloadNote('The download did not start. Open the ad in My Videos and download it there.')
    } finally {
      if (aliveRef.current) setDownloading(false)
    }
  }

  // ── desenho ──────────────────────────────────────────────────────────────────────────────

  const photoByFootage = new Map<string, PhotoItem>()
  for (const p of photos) if (p.uploaded) photoByFootage.set(p.uploaded.footageId.toLowerCase(), p)
  const sectorSpec = sector ? ADS_V2_SECTOR_SPECS[sector] : ADS_V2_SECTOR_SPECS.other
  const locked = busy !== null

  return (
    <div className="adv2-layout">
      <div className="adv2-main">
        {notReady ? (
          <p className="adv2-note" role="status">The new ad maker is not switched on yet on our side, so planning will not work today. Nothing will be charged.</p>
        ) : null}

        {phase === 'loading' ? (
          <section className="adv2-card" aria-busy="true">
            <p className="adsw-lead" role="status" style={{ margin: 0 }}>Loading your ad…</p>
            {pollNote ? <p className="adsw-warn" role="status">{pollNote}</p> : null}
          </section>
        ) : null}

        {phase === 'build' ? (
          <>
            {/* 1. Nível */}
            <section className="adv2-card" aria-labelledby="adv2-s1">
              <h2 id="adv2-s1"><span className="adv2-num" aria-hidden="true">1</span>Choose your ad</h2>
              <p className="adsw-lead">A vertical ad of about {ADS_V2_SCREEN_SECONDS} seconds for TikTok, Reels and Shorts, made from your own photos.</p>
              <fieldset className="adv2-tiers">
                <legend className="adv2-sr">Level</legend>
                {ADS_V2_TIER_IDS.map((t) => {
                  const credits = adsV2Credits(t, ADS_V2_SCREEN_SECONDS)
                  const copy = ADS_V2_TIER_COPY[t]
                  const short = balance !== null && balance < credits ? credits - balance : 0
                  return (
                    <label key={t} className="adv2-tier">
                      <input className="adv2-sr" type="radio" name="adv2-tier" value={t} checked={tier === t} disabled={locked} onChange={() => setTier(t)} />
                      <b>{copy.name}</b>
                      <span className="cr">{credits} credits</span>
                      <span>{copy.pitch}</span>
                      <ul>
                        {copy.includes.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                      <span className="adsw-hint" style={{ margin: 0 }}>{ADS_V2_TIERS[t].shots} shots</span>
                      {short > 0 ? <span className="short">You need {short} more credits for this one.</span> : null}
                    </label>
                  )
                })}
              </fieldset>
              <p className="adv2-balance" role="status">
                {balance === null ? 'We could not read your credit balance right now.' : `You have ${balance} credits.`}{' '}
                {cost !== null && balance !== null && balance < cost ? <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">Get credits (opens a new tab)</Link> : null}
              </p>
            </section>

            {/* 2. O negócio */}
            <section className="adv2-card" aria-labelledby="adv2-s2">
              <h2 id="adv2-s2"><span className="adv2-num" aria-hidden="true">2</span>Your business</h2>
              <p className="adsw-lead">One sentence is enough. The ad only says what you write here: nothing is invented.</p>
              <label className="adsw-f">
                <span>Business name <span className="adsw-req" aria-hidden="true">*</span></span>
                <input type="text" value={business} maxLength={80} disabled={locked} autoComplete="organization" onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Casa Laila" />
              </label>
              <label className="adsw-f">
                <span>What you offer, in one sentence</span>
                <small>What you sell, what makes it good, and your offer or where to find you.</small>
                <textarea className="adsw-ta" rows={3} maxLength={ADS_V2_SCREEN_SENTENCE_MAX} value={sentence} disabled={locked} onChange={(e) => setSentence(e.target.value)} placeholder="e.g. Family grill in Amman with charcoal kebabs, open until midnight, 10% off lunch on weekdays." />
              </label>
              <label className="adsw-f">
                <span>Or your website or Instagram link (optional)</span>
                <small>Used only if you leave the sentence empty.</small>
                <input type="url" inputMode="url" value={link} maxLength={500} disabled={locked} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
              </label>
              <label className="adsw-f">
                <span>Kind of business <span className="adsw-req" aria-hidden="true">*</span></span>
                <select value={sector ?? ''} disabled={locked} onChange={(e) => setSector((e.target.value || null) as AdsV2ScreenSector | null)}>
                  <option value="">Choose…</option>
                  {ADS_V2_SECTOR_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            </section>

            {/* 3. Logo e fotos */}
            <section className="adv2-card" aria-labelledby="adv2-s3">
              <h2 id="adv2-s3"><span className="adv2-num" aria-hidden="true">3</span>Your logo and photos</h2>
              <p className="adsw-lead">Your ad will show YOUR place. Add {ADS_V2_MIN_PHOTOS} to {ADS_V2_MAX_PHOTOS} real photos, drag each one to choose what stays in the vertical frame, and mark what it shows.</p>

              <div className="adsw-f">
                <span>Logo <span className="adsw-req" aria-hidden="true">*</span></span>
                <div className="adv2-logo">
                  <div className="tile">{logo?.localUrl ? <img src={logo.localUrl} alt="Your logo" /> : <span className="ph">No logo</span>}</div>
                  <input ref={logoInputRef} className="adv2-sr" type="file" accept={ADS_UPLOAD_ACCEPT_LOGO} tabIndex={-1} aria-hidden="true" onChange={(e) => { void chooseLogo(e.target.files?.[0]); e.target.value = '' }} />
                  <button type="button" className="adsw-btn ghost small" disabled={locked || !!logo?.busy} onClick={() => logoInputRef.current?.click()}>
                    {logo?.busy ? 'Uploading…' : logo?.footageId ? 'Change logo' : 'Add logo'}
                  </button>
                </div>
                {logo?.error ? <p className="adsw-err" role="alert">{logo.error}</p> : null}
              </div>

              <div className="adv2-requests">
                <b>Photos that work best for {sector ? ADS_V2_SECTOR_OPTIONS.find((s) => s.id === sector)?.label.toLowerCase() : 'your business'}:</b>
                <ul>
                  {sectorSpec.photoRequests.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>

              <ol className="adv2-photos" aria-label="Your photos">
                {photos.map((p, i) => (
                  <PhotoRow
                    key={p.key}
                    photo={p}
                    index={i}
                    locked={locked}
                    onFocal={(fx, fy) => updatePhoto(p.key, { fx, fy })}
                    onKind={(kind) => updatePhoto(p.key, { kind })}
                    onRemove={() => removePhoto(p.key)}
                    onMoveUp={i > 0 ? () => movePhotoUp(p.key) : undefined}
                  />
                ))}
              </ol>
              <input ref={photoInputRef} className="adv2-sr" type="file" accept={PHOTO_ACCEPT} multiple tabIndex={-1} aria-hidden="true" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
              <div style={{ marginTop: 14 }}>
                <button type="button" className="adv2-add" disabled={locked || photos.length >= ADS_V2_MAX_PHOTOS} onClick={() => photoInputRef.current?.click()}>
                  <span aria-hidden="true">+</span> {photos.length ? 'Add more photos or videos' : 'Add photos or videos'} ({photos.length}/{ADS_V2_MAX_PHOTOS})
                </button>
              </div>
              {photoNote ? <p className="adsw-warn" role="status">{photoNote}</p> : null}
            </section>

            {/* 4. Cartão final */}
            <section className="adv2-card" aria-labelledby="adv2-s4">
              <h2 id="adv2-s4"><span className="adv2-num" aria-hidden="true">4</span>Your last frame</h2>
              <p className="adsw-lead">The ad ends on your real logo, your name and a button. Write it in the language of your ad.</p>
              <div className="adv2-cardwrap">
                <canvas ref={cardCanvasRef} className="adv2-cardprev" width={1080} height={1920} role="img" aria-label="Preview of your last frame" />
                <div className="fields">
                  <label className="adsw-f">
                    <span>Offer (optional)</span>
                    <input type="text" value={card.offer} maxLength={60} disabled={locked} onChange={(e) => setCard((c) => ({ ...c, offer: e.target.value }))} placeholder="e.g. 10% off lunch on weekdays" />
                  </label>
                  <label className="adsw-f">
                    <span>Button</span>
                    <input type="text" list="adv2-cta" value={card.cta} maxLength={40} disabled={locked} onChange={(e) => setCard((c) => ({ ...c, cta: e.target.value }))} />
                    <datalist id="adv2-cta">{CTA_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
                  </label>
                  <label className="adsw-f">
                    <span>Contact (optional)</span>
                    <input type="text" value={card.contact} maxLength={60} disabled={locked} onChange={(e) => setCard((c) => ({ ...c, contact: e.target.value }))} placeholder="Phone, website or @handle" />
                  </label>
                  <label className="adsw-f adv2-color">
                    <input type="color" value={card.color} disabled={locked} onChange={(e) => setCard((c) => ({ ...c, color: e.target.value }))} />
                    <span style={{ margin: 0 }}>Brand color</span>
                  </label>
                </div>
              </div>
            </section>

            {/* 5. Plano */}
            <section className="adv2-card" aria-labelledby="adv2-s5">
              <h2 id="adv2-s5" ref={planHeadingRef} tabIndex={-1}><span className="adv2-num" aria-hidden="true">5</span>Check the plan</h2>
              {!planFresh ? (
                <>
                  <p className="adsw-lead">
                    {plan ? 'You changed your ad after planning. Plan it again to see the new shots.' : 'See every shot, the words on screen and the voice-over before anything is charged. Planning is free.'}
                  </p>
                  {missing.length ? (
                    <div className="adv2-missing" role="status">
                      Before planning:
                      <ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul>
                    </div>
                  ) : null}
                  <div className="adv2-actions">
                    <button type="button" className="adsw-btn" disabled={locked || missing.length > 0} onClick={() => void planAd()}>
                      {busy === 'plan' ? 'Planning…' : 'Plan my ad (free)'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                <AdsPlanChanges before={previousPlan} after={plan as Plan} />
                <PlanPreview
                  plan={plan as Plan}
                  cost={cost}
                  three={variations ? { on: three, onChange: setThree } : null}
                  balance={balance}
                  narrationOn={narrationOn}
                  busy={busy}
                  photoByFootage={photoByFootage}
                  onToggleNarration={() => void toggleNarration()}
                  onMake={() => void makeAd()}
                  onCheck={() => void freeCheck()}
                />
                </>
              )}
              {busyNote ? <p className="adsw-hint" role="status">{busyNote}</p> : null}
              {checkNote ? <p className="adsw-good adsw-hint" role="status">{checkNote}</p> : null}
              {planError ? <p className="adsw-err" role="alert">{planError}</p> : null}
              {buildError ? <p className="adsw-err" role="alert">{buildError}</p> : null}
            </section>
          </>
        ) : null}

        {phase === 'progress' && order ? (
          <section className="adv2-card" aria-labelledby="adv2-prog">
            <h2 id="adv2-prog" ref={headingRef} tabIndex={-1}>Making your ad</h2>
            <p className="adsw-lead">
              {order.status === 'assembling'
                ? 'Every shot is ready. Now adding the music, the voice-over and your last frame.'
                : 'Your photos are being animated. Shots marked Still with zoom are already done.'}{' '}
              You can leave this page: the ad keeps being made and lands in <Link className="adsw-link" href="/history">My Videos</Link>.
            </p>
            {redoNote ? <p className="adv2-note" role="status" style={{ marginTop: 0, marginBottom: 16 }}>{redoNote}</p> : null}
            <ShotGrid shots={order.shots} orderStatus={order.status} />
            {pollNote ? <p className="adsw-warn" role="status">{pollNote}</p> : null}
          </section>
        ) : null}

        {phase === 'delivered' && order ? (
          <section className="adv2-card" aria-labelledby="adv2-done">
            <h2 id="adv2-done" ref={headingRef} tabIndex={-1}>Your ad is ready</h2>
            {video?.video_url ? (
              <video className="adv2-player" src={video.video_url} controls playsInline preload="metadata" />
            ) : (
              <p className="adsw-lead">Your ad is in <Link className="adsw-link" href="/history">My Videos</Link>.</p>
            )}
            <div className="adv2-actions">
              {video?.video_url ? (
                <button type="button" className="adsw-btn" disabled={downloading} onClick={() => void download()}>
                  {downloading ? 'Downloading…' : 'Download the ad'}
                </button>
              ) : null}
              <Link className="adsw-link" href="/history">Open in My Videos</Link>
            </div>
            {downloadNote ? <p className="adsw-warn" role="status">{downloadNote}</p> : null}
            <p className="adv2-note">Turn on the AI-generated label when you post on TikTok. Parts of this ad were made with AI from your photos.</p>

            <h3 style={{ margin: '24px 0 6px' }}>Not happy with a shot?</h3>
            <p className="adsw-hint" style={{ margin: '0 0 12px' }}>Redo one shot with a different camera move. The price shows before you confirm. Screen or text shots are stills and stay exactly as your photo.</p>
            <ShotGrid
              shots={order.shots}
              orderStatus={order.status}
              redo={{
                ask: redoAsk,
                busy: busy === 'redo',
                onAsk: (idx) => { setRedoAsk(idx); setRedoError(null) },
                onCancel: () => setRedoAsk(null),
                onConfirm: (shot) => void redoShot(shot),
              }}
            />
            {redoError ? <p className="adsw-err" role="alert">{redoError}</p> : null}
            <div className="adv2-actions">
              <button type="button" className="adsw-btn ghost" onClick={onAskStartOver}>Make another ad</button>
            </div>
          </section>
        ) : null}

        {phase === 'failed' && order ? (
          <section className="adv2-card" aria-labelledby="adv2-fail">
            <h2 id="adv2-fail" ref={headingRef} tabIndex={-1}>{order.status === 'cancelled' ? 'This was not started' : order.parent_order_id ? 'This shot could not be redone' : 'This ad did not work'}</h2>
            <p className="adsw-lead">{order.status === 'cancelled' ? 'Nothing was charged.' : failedOrderMessage(order.error, !!order.parent_order_id)}</p>
            <div className="adv2-actions">
              {order.parent_order_id ? (
                <button type="button" className="adsw-btn" onClick={() => openOrder(order.parent_order_id as string)}>
                  Back to my ad
                </button>
              ) : photos.length ? (
                <button type="button" className="adsw-btn" onClick={() => { clearOrderParam(); currentOrderRef.current = null; setOrder(null); setPlan(null); setDraft(null); setPhase('build') }}>
                  Back to my photos
                </button>
              ) : null}
              <button type="button" className="adsw-btn ghost" onClick={onAskStartOver}>Start over</button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="adv2-aside" aria-label="How Studio Ads works">
        {phase === 'build' && photos.length > 0 ? <section className="adv2-card adv2-live-preview">
          <h2><UiLabel>Framing preview</UiLabel></h2>
          <p><UiLabel>Your photo before animation.</UiLabel></p>
          {(() => { const photo = photos.find(p => p.key === previewPhotoKey) ?? photos[0]; return <div className="adv2-large-frame"><img src={photo.srcUrl} alt={photo.name} style={{ objectPosition: focalPosition(photo.fx, photo.fy) }} /></div> })()}
          <div className="adv2-preview-strip">{photos.map((photo, index) => <button type="button" key={photo.key} aria-pressed={photo.key === (photos.find(p => p.key === previewPhotoKey)?.key ?? photos[0].key)} aria-label={photo.name} onClick={() => setPreviewPhotoKey(photo.key)}><img src={photo.srcUrl} alt="" /><span>{index + 1}</span></button>)}</div>
        </section> : <BusinessVisualReferences compact />}
        <section className="adv2-card">
          <details className="adv2-guide" open><summary><UiLabel>How it works</UiLabel></summary>
          <ol className="adv2-how">
            {ADS_V2_HOW_IT_WORKS.map((s, i) => (
              <li key={s.title}>
                <span className="adv2-num" aria-hidden="true">{i + 1}</span>
                <span><b>{s.title}</b>{s.body}</span>
              </li>
            ))}
          </ol>
          </details>
        </section>
        <section className="adv2-card">
          <details className="adv2-guide"><summary><UiLabel>The shape of your ad</UiLabel></summary>
          <ol className="adv2-shape">{ADS_V2_AD_SHAPE.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="adsw-hint" style={{ margin: 0 }}>Vertical 9:16, about {ADS_V2_SCREEN_SECONDS} seconds, music under a short voice-over you can turn off, and 2 or 3 short lines of text on screen.</p></details>
        </section>
        <section className="adv2-card">
          <details className="adv2-guide"><summary><UiLabel>What makes a good photo</UiLabel></summary>
          {sector ? <p className="adsw-hint" style={{ margin: '0 0 8px' }}>For {ADS_V2_SECTOR_OPTIONS.find((s) => s.id === sector)?.label.toLowerCase()}:</p> : null}
          <ul className="adv2-tips">
            {ADS_V2_PHOTO_TIPS[sector ?? 'other'].map((t) => <li key={t}>{t}</li>)}
            {ADS_V2_GENERAL_PHOTO_TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul></details>
        </section>
      </aside>
    </div>
  )
}

// ─── uma foto: moldura 9:16 arrastável + o que ela mostra ─────────────────────────────────────

function PhotoRow({
  photo,
  index,
  locked,
  onFocal,
  onKind,
  onRemove,
  onMoveUp,
}: {
  photo: PhotoItem
  index: number
  locked: boolean
  onFocal: (fx: number, fy: number) => void
  onKind: (kind: AdsV2ScreenPhotoKind) => void
  onRemove: () => void
  onMoveUp?: () => void
}) {
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const rect = cropRect(photo.w, photo.h, photo.fx, photo.fy)
  const small = isSmallCrop(rect)
  const kindHint = ADS_V2_PHOTO_KIND_OPTIONS.find((o) => o.id === photo.kind)?.hint ?? null
  const status = photo.busy ? 'Uploading…' : photo.uploaded && photo.uploaded.sig === uploadSig(photo) ? 'Uploaded' : null
  const touchAction = frameTouchAction(photo.w, photo.h)

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked) return
    drag.current = { x: e.clientX, y: e.clientY, fx: photo.fx, fy: photo.fy, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    const el = frameRef.current
    if (!d || !el || d.id !== e.pointerId) return
    const box = el.getBoundingClientRect()
    const next = panFocal({ fx: d.fx, fy: d.fy }, { dx: e.clientX - d.x, dy: e.clientY - d.y }, { w: box.width, h: box.height }, { w: photo.w, h: photo.h })
    onFocal(next.fx, next.fy)
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (locked) return
    const step = e.shiftKey ? 0.2 : 0.05
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const m = map[e.key]
    if (!m) return
    e.preventDefault()
    onFocal(clampFocal(photo.fx + m[0]), clampFocal(photo.fy + m[1]))
  }

  return (
    <li className="adv2-photo">
      <div
        ref={frameRef}
        className="adv2-frame"
        tabIndex={locked ? -1 : 0}
        role="group"
        aria-label={`Framing of photo ${index + 1}. Drag the photo, or use the arrow keys, to choose what stays in the vertical frame.`}
        aria-disabled={locked}
        style={{ touchAction }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <img src={photo.srcUrl} alt={`Photo ${index + 1}: ${photo.name}`} draggable={false} style={{ objectPosition: focalPosition(photo.fx, photo.fy) }} />
        <span className="badge">{index + 1}</span>
      </div>
      <div className="adv2-pctl">
        <span className="nm">{photo.name}</span>
        {photo.video ? (
          <small className="adsw-hint" style={{ margin: 0 }}>
            <b><span aria-hidden="true">▶ </span>Goes in as video.</b> We use a short, lively part of it, muted: the music and the voice-over play over it. Drag it to choose what stays in the vertical frame.
          </small>
        ) : (
          <fieldset className="adv2-kinds">
            <legend>What this photo shows</legend>
            {ADS_V2_PHOTO_KIND_OPTIONS.map((o) => (
              <label key={o.id}>
                <input type="radio" name={`adv2-kind-${photo.key}`} value={o.id} checked={photo.kind === o.id} disabled={locked} onChange={() => onKind(o.id)} />
                {o.label}
              </label>
            ))}
          </fieldset>
        )}
        {kindHint && !photo.video ? <small className="adsw-hint" style={{ margin: 0 }}>{kindHint}</small> : null}
        {small && !photo.video ? <small className="adsw-warn" style={{ margin: 0 }}>This photo is small, so it may look soft in the ad. A bigger photo looks sharper.</small> : null}
        {status ? <small className="adsw-hint" style={{ margin: 0 }} role="status">{status}</small> : null}
        {photo.error ? <small className="adsw-err" style={{ margin: 0 }} role="alert">{photo.error}</small> : null}
        <div className="adv2-prow">
          {onMoveUp ? <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onMoveUp} aria-label={`Move photo ${index + 1} up`}>Move up</button> : null}
          <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onRemove} aria-label={`Remove photo ${index + 1}`}>Remove</button>
        </div>
      </div>
    </li>
  )
}

// ─── prévia do plano ─────────────────────────────────────────────────────────────────────────

function PlanPreview({
  plan,
  cost: single,
  three,
  balance,
  narrationOn,
  busy,
  photoByFootage,
  onToggleNarration,
  onMake,
  onCheck,
}: {
  plan: Plan
  cost: number | null
  three: { on: boolean; onChange: (on: boolean) => void } | null
  balance: number | null
  narrationOn: boolean
  busy: string | null
  photoByFootage: Map<string, PhotoItem>
  onToggleNarration: () => void
  onMake: () => void
  onCheck: () => void
}) {
  // KINEO-ADS-3-VARIACOES-2026-09-30 — com "3 variações" ligada, o preço mostrado e o saldo conferido são os do GRUPO.
  const cost = three?.on ? variationsPrice(single) : single
  const short = cost !== null && balance !== null && balance < cost ? cost - balance : 0
  return (
    <>
      <p className="adsw-lead">This is the ad we will make. Nothing has been charged yet.</p>
      <h3>Shots</h3>
      <ol className="adv2-plan-shots">
        {plan.shots.map((s, i) => {
          const p = s.photo ? photoByFootage.get(s.photo.toLowerCase()) : undefined
          return (
            <li key={s.idx}>
              <span className="th">
                {p && s.source === 'client_photo' ? (
                  <img src={p.srcUrl} alt="" style={{ objectPosition: focalPosition(p.fx, p.fy) }} />
                ) : (
                  <span>{s.source === 'generated_scene' ? 'New scene' : 'Photo'}</span>
                )}
              </span>
              <span className="tx">
                <b>{i + 1}. {ADS_V2_ROLE_LABELS[s.role] ?? s.role} · {s.cut_seconds} s</b>
                <span>{describeShot(s)}</span>
              </span>
            </li>
          )
        })}
        <li>
          <span className="th"><span>Logo</span></span>
          <span className="tx"><b>{plan.shots.length + 1}. Your last frame</b><span>Your logo, name and button</span></span>
        </li>
      </ol>
      {plan.overlays.length ? (
        <>
          <h3>Words on screen</h3>
          <ul className="adv2-lines">{plan.overlays.map((o) => <li key={`${o.role}-${o.start}`}>{o.text}</li>)}</ul>
        </>
      ) : null}
      <div className="adv2-voice">
        <button type="button" className="adv2-switch" role="switch" aria-checked={narrationOn} disabled={busy !== null} onClick={onToggleNarration}>
          <i aria-hidden="true" /> Voice-over {narrationOn ? 'on' : 'off'}
        </button>
        {plan.narration ? (
          <p className={narrationOn ? '' : 'off'}>{plan.narration}</p>
        ) : (
          <p className="off">No voice-over in this plan.</p>
        )}
        {!narrationOn ? <p className="adsw-hint" style={{ marginTop: 6 }}>The ad will play with music only.</p> : null}
      </div>
      <p className="adv2-total">About {Math.round(plan.total_seconds * 10) / 10} seconds · vertical 9:16{cost !== null ? ` · ${cost} credits` : ''}</p>
      {short > 0 ? (
        <p className="adsw-warn">You need {short} more credits for this ad. <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">Get credits (opens a new tab)</Link> and come back: your plan stays on this page.</p>
      ) : null}
      {three ? <VariationToggle on={three.on} onChange={three.onChange} single={single} copy={variationsCopy('en')} disabled={busy !== null} /> : null}
      <div className="adv2-actions">
        <button type="button" className="adsw-btn" disabled={busy !== null || cost === null || short > 0} onClick={onMake}>
          {busy === 'start' ? 'Starting…' : three?.on ? variationsCopy('en').make.replace('{c}', String(cost ?? '')) : `Make my ad · ${cost} credits`}
        </button>
        <button type="button" className="adsw-btn ghost small" disabled={busy !== null} onClick={onCheck}>
          {busy === 'check' ? 'Checking…' : 'Run a free check'}
        </button>
      </div>
    </>
  )
}

// ─── grade dos planos (progresso e entrega) ──────────────────────────────────────────────────

function ShotGrid({
  shots,
  orderStatus,
  redo,
}: {
  shots: AdsV2ScreenShot[]
  orderStatus: string
  redo?: {
    ask: number | null
    busy: boolean
    onAsk: (idx: number) => void
    onCancel: () => void
    onConfirm: (shot: AdsV2ScreenShot) => void
  }
}) {
  if (!shots.length) return <p className="adsw-hint" role="status">Preparing the shots…</p>
  return (
    <ol className="adv2-grid" aria-label="Shots">
      {shots.map((s, i) => {
        const label = shotStateLabel(s, orderStatus)
        const isText = s.kind === 'text'
        return (
          <li key={s.idx} className="adv2-shot">
            <div className="th">
              {s.url && isText ? (
                <img src={s.url} alt={`Shot ${i + 1}`} />
              ) : s.url ? (
                <video src={s.url} muted playsInline preload="metadata" aria-label={`Shot ${i + 1}`} />
              ) : (
                <span className="ph">Shot {i + 1}</span>
              )}
            </div>
            <span className="st" data-state={s.state}>{i + 1}. {label}</span>
            {redo && canRedoShot(s, orderStatus) ? (
              redo.ask === s.idx ? (
                <div role="group" aria-label={`Confirm redo of shot ${i + 1}`} style={{ display: 'grid', gap: 6 }}>
                  <span className="adsw-hint" style={{ margin: 0 }}>Redo shot {i + 1} for {s.retake_credits} credits?</span>
                  <button type="button" className="adsw-btn small" disabled={redo.busy} onClick={() => redo.onConfirm(s)}>{redo.busy ? 'Starting…' : 'Yes, redo it'}</button>
                  <button type="button" className="adsw-btn ghost small" disabled={redo.busy} onClick={redo.onCancel}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="adsw-btn ghost small" disabled={redo.busy} onClick={() => redo.onAsk(s.idx)}>
                  Redo this shot · {s.retake_credits} credits
                </button>
              )
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
