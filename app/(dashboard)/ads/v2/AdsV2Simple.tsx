'use client'

import AdsPlanChanges, { usePlanComparison } from '@/components/AdsPlanChanges'

// KINEO-ADS-MODO-SIMPLES-2026-09-29 — MODO SIMPLES do /ads/v2 (a entrada padrão). Pedido do fundador, 29/09, depois de
// tentar anunciar o próprio imóvel: "a pessoa coloca os arquivos que ela quer, fala mais ou menos o que ela quer que
// aconteça, escolhe premium, comercial ou normal, e a gente faz". "Sem legenda, com a fala em português."
//
// O que muda em relação ao modo completo (que continua idêntico em AdsV2Client.tsx, preso por impressão digital):
//   · fotos E vídeos. KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29: até 2 vídeos entram COMO VÍDEO (o original sobe pelo
//     /api/footage; o trecho mais vivo e a miniatura saem no navegador — lib/ads/v2UserVideo.ts + readUserVideo). O que
//     não cabe (acima de 50 MB, WebM, < 3 s, ilegível, 3º vídeo) cai no plano B de antes: 1 a 3 quadros viram fotos;
//   · um campo de texto só; nome e tipo de negócio saem do texto (inferSector/simpleTitle em lib/ads/v2Simple.ts);
//   · logo opcional; preço, contato, frases na tela, narração e língua da fala em "Mais opções";
//   · "Descobrir e planejar (grátis)": sobe as fotos e o cartão, cria o rascunho, pesquisa fatos públicos COM FONTE
//     (/api/ads/v2/research, sem cobrar) e planeja. Cada fato aparece com o link da fonte para a pessoa conferir;
//   · tela inteira em pt/es/en (ADS_V2_SIMPLE_COPY; outras línguas caem no inglês).
// Custo: adsV2Credits (o mesmo que o /start debita) — nenhum número de preço digitado aqui.
// ESPELHO: api, loadImage, canvasToBlob e cropToVertical são cópias EXATAS do AdsV2Client.tsx (import de lá seria
// circular); o guardião test-ads-modo-simples confere os corpos. Eventos do v2 são só-servidor: nada de trackEvent.

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { downloadVideoFile } from '@/lib/videoDownload'
import { ADS_UPLOAD_ACCEPT_LOGO, AdsUploadError, normalizeFootageType, uploadFootage } from '@/lib/ads/uploadFootage'
import { drawEndCard, endCardCtaLabel, loadLogoImage, toPngFile } from '@/lib/ads/endCard'
import { ADS_V2_TIER_IDS, adsV2Credits, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import {
  ADS_V2_CROP,
  ADS_V2_ROLE_LABELS,
  ADS_V2_SCREEN_SECONDS,
  ADS_V2_SCREEN_SENTENCE_MAX,
  adFileSlug,
  adsV2ErrorMessage,
  clampFocal,
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
  type AdsV2ScreenShot,
} from '@/lib/ads/v2Screen'
import {
  ADS_V2_SIMPLE_ACCEPT,
  ADS_V2_SIMPLE_COPY,
  ADS_V2_SIMPLE_FACTS_DEFAULT_ON,
  ADS_V2_SIMPLE_MAX_IN_AD,
  ADS_V2_SIMPLE_MAX_ITEMS,
  ADS_V2_SIMPLE_MIN_IN_AD,
  ADS_V2_SIMPLE_VIDEO_MAX_BYTES,
  ADS_V2_SIMPLE_VIDEO_MAX_SECONDS,
  defaultPhotoKind,
  fill,
  inferSector,
  isImageFile,
  isVideoFile,
  simpleCtaKind,
  simpleErrorMessage,
  simpleLabel,
  simpleUploadErrorMessage,
  simpleTitle,
  videoFrameTimes,
  type AdsV2SimpleCopy,
} from '@/lib/ads/v2Simple'
import { VideoFramesError, grabVideoFrames, pageHidden, readUserVideo } from '@/lib/ads/v2VideoFrames'
import { ADS_V2_MAX_USER_VIDEOS, ADS_V2_USER_VIDEO_MIN_SECONDS, pickLivelyStart, userVideoSampleTimes, userVideoVerdict, type AdsV2UserVideoVerdict } from '@/lib/ads/v2UserVideo'
import { NARRATION_LANGUAGES, detectNarrationLanguage, narrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'
import { pickInterfaceCopy, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { VariationToggle, variationsCopy, variationsPrice } from './AdsV2Variations'
import { ADS_SAMPLE_TIER, adsSampleCopy, type AdsSampleCopy } from '@/lib/ads/sample' // KINEO-ADS-AMOSTRA-2026-10-09
// KINEO-ESTILOS-PRODUTO-2026-10-09 — a escolha de estilo do produto (Auto + 5 efeitos), nas 16 línguas.
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC, adsV2StyleCopy, adsV2SuggestedStyle, type AdsV2StyleChoice, type AdsV2StyleCopy } from '@/lib/ads/v2Styles'
import { AdsPresenterToggle, AdsStylePicker } from '@/components/ads/AdsStyles'
// KINEO-ATOR-ANUNCIO-2026-10-09 — o ator de IA ("Person talking about it"): interruptor e frases nas 16 línguas (lib pura).
import { ADS_V2_PRESENTER_POSTER, ADS_V2_PRESENTER_PUBLIC, adsV2PresenterCopy, type AdsV2PresenterCopy } from '@/lib/ads/v2Presenter'
// KINEO-ADS-1FOTO-LINK-2026-10-10 — 1 foto basta e "Or paste your product link" (frases nas 16 línguas, lib pura).
import { ADS_V2_LINK_IMPORT_MAX_IMAGES, adsV2LinkImportCopy, adsV2LinkImportError, type AdsV2LinkImportCopy } from '@/lib/ads/v2LinkImport'
// KINEO-ADS-UX-MARCA-2026-10-10 — passo a passo, soltar arquivos, enquadramento, prévia ao vivo, custo e o kit da marca
// (lib PURA com as frases nas 16 línguas + as peças de tela; nenhuma chama rota de dinheiro).
import {
  ADS_V2_RECOMMENDED_TIER,
  adsV2CostLine,
  adsV2DefaultTier,
  adsV2MoveTo,
  adsV2TierIncludes,
  adsV2UxCopy,
  brandKitFromScreen,
  brandKitIsEmpty,
  brandKitPrefill,
  type AdsBrandKit,
  type AdsV2UxCopy,
} from '@/lib/ads/v2SimpleUx'
import { CropEditor, DropZone, LiveStage, MobilePreviewBar, SIMPLE_UX_CSS, SimpleStepper, TierIncludes, goToSection, type LivePreviewData } from './AdsV2SimpleUx'

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
  /** KINEO-ESTILOS-PRODUTO-2026-10-09 — a chave do estilo, só no plano que sai pelo efeito. */
  effect?: string
  role: string
  kind: string
  source: string
  cut_seconds: number
  photo: string | null
}
/** Um vídeo no corpo do /plan (contrato: lib/ads/v2Contract.ts, AdsV2PlanVideo). */
interface PlanVideoBody {
  footage_id: string
  start: number
  focus_x: number
  focus_y: number
  width: number
  height: number
}
interface PlanResponse {
  order_id: string
  credits: number
  /** KINEO-ESTILOS-PRODUTO-2026-10-09 — o estilo pedido e o aplicado (null = sem plano de produto, saiu sem efeito). */
  style_asked?: string | null
  style?: string | null
  /** KINEO-ATOR-ANUNCIO-2026-10-09 — o ator pedido e o aplicado (false com pedido = sem texto de narração). */
  presenter_asked?: boolean
  presenter?: boolean
  narration: string | null
  overlays: { role: string; start: number; end: number; text: string }[]
  total_seconds: number
  shots: PlanShot[]
}
interface Plan extends PlanResponse {
  sig: string
  cardSig: string
}
interface Fact {
  id: string
  text: string
  url: string
  host: string
}
interface Research {
  orderId: string
  status: 'ok' | 'failed'
  facts: Fact[]
}
interface SimpleItem {
  key: string
  name: string
  srcUrl: string
  w: number
  h: number
  fx: number
  fy: number
  fromVideo: boolean
  /** KINEO-ADS-1FOTO-LINK-2026-10-10 — veio do link do produto (a página diz que é foto do produto). */
  fromLink?: boolean
  /**
   * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — preenchido quando o arquivo entra COMO VÍDEO: o original (sobe como está), a
   * duração/dimensões lidas no navegador e o início do trecho mais vivo. srcUrl é a miniatura desse trecho.
   */
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

type Phase = 'loading' | 'build' | 'progress' | 'delivered' | 'failed'

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

// ─── constantes ───────────────────────────────────────────────────────────────────────────────

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const POLL_MS = 8000
const POLL_RETRY_MS = 20_000
const PHOTO_MAX_BYTES = 50 * 1024 * 1024
/** Recusas do /plan em que o vídeo volta ao plano B (quadros viram fotos) — KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29. */
const VIDEO_TO_PHOTOS_CODES: readonly string[] = ['video_unreadable', 'video_too_short', 'video_too_long', 'video_invalid']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_COLOR = '#2997ff'

// ─── utilidades (sem estado) — ESPELHO do AdsV2Client.tsx ─────────────────────────────────────

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

/** Recorte 9:16 no navegador: a janela do ponto focal, desenhada em 1080×1920 e codificada em JPEG q0.9. */
async function cropToVertical(p: Pick<SimpleItem, 'srcUrl' | 'fx' | 'fy' | 'name'>): Promise<File> {
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

// ─── utilidades do modo simples ───────────────────────────────────────────────────────────────

const focalSig = (p: Pick<SimpleItem, 'fx' | 'fy'>) => `${p.fx.toFixed(3)},${p.fy.toFixed(3)}`
/** O vídeo sobe UMA vez (o enquadramento vai no pedido, não no arquivo): a assinatura do envio não muda com o foco. */
const uploadSig = (p: Pick<SimpleItem, 'fx' | 'fy' | 'video'>) => (p.video ? 'video' : focalSig(p))
const numOr = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — decide se o vídeo entra COMO VÍDEO (e já lê duração, tamanho, trecho mais vivo
 * e miniatura) ou cai no plano B, com o motivo. Exportada: o modo completo (AdsV2Client.tsx) usa a MESMA regra.
 */
export type AdVideoRead =
  | { kind: 'video'; seconds: number; width: number; height: number; start: number; thumb: File }
  // hidden: a aba ficou oculta além do teto (VIDEO_FRAME_HIDDEN_MAX_MS) — o vídeo NÃO foi julgado ilegível.
  | { kind: 'photos'; verdict: AdsV2UserVideoVerdict; hidden?: true }
export async function readVideoForAd(f: File, videosAlready: number): Promise<AdVideoRead> {
  const type = normalizeFootageType(f)
  const first = userVideoVerdict({ bytes: f.size, type, seconds: ADS_V2_USER_VIDEO_MIN_SECONDS, width: 1, height: 1, videosAlready })
  if (first !== 'video') return { kind: 'photos', verdict: first }
  let read: Awaited<ReturnType<typeof readUserVideo>> | null = null
  try {
    read = await readUserVideo(f, (d) => userVideoSampleTimes(d), (t, d, dur) => pickLivelyStart(t, d, dur))
  } catch (e) {
    if (e instanceof VideoFramesError && e.code === 'hidden') return { kind: 'photos', verdict: 'unreadable', hidden: true }
    read = null
  }
  const verdict = userVideoVerdict({ bytes: f.size, type, seconds: read?.seconds ?? null, width: read?.width ?? null, height: read?.height ?? null, videosAlready })
  if (verdict !== 'video' || !read) return { kind: 'photos', verdict: verdict === 'video' ? 'unreadable' : verdict }
  return { kind: 'video', seconds: read.seconds, width: read.width, height: read.height, start: read.start, thumb: read.thumb }
}

/** PLANO B de antes, exportado para o modo completo: 1 a 3 quadros do vídeo viram fotos (JPEG). Falha = []. */
export async function videoFramesForAd(f: File): Promise<File[]> {
  if (f.size > ADS_V2_SIMPLE_VIDEO_MAX_BYTES) return []
  try {
    return await grabVideoFrames(f, (d) => videoFrameTimes(d, 3), { maxSeconds: ADS_V2_SIMPLE_VIDEO_MAX_SECONDS })
  } catch {
    return []
  }
}

function errorText(lang: InterfaceLanguage, r: { code: string; body: Record<string, unknown> }): string {
  const extra = { needed: numOr(r.body.needed), balance: numOr(r.body.balance), credits: numOr(r.body.credits) }
  return simpleErrorMessage(r.code, lang, extra) ?? adsV2ErrorMessage(r.code, { ...extra, message: typeof r.body.message === 'string' ? r.body.message : undefined })
}

function setUrlParams(set: Record<string, string | null>) {
  try {
    const u = new URL(window.location.href)
    for (const [k, v] of Object.entries(set)) {
      if (v === null) u.searchParams.delete(k)
      else u.searchParams.set(k, v)
    }
    window.history.replaceState(null, '', u.toString())
  } catch {
    /* ignore */
  }
}

// Classes .adv2-* vêm do ADS_V2_CSS que o invólucro (AdsV2Client) já injeta; aqui só o que é do modo simples.
const SIMPLE_CSS = `
.adv2 .adv2s-items{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(46%,150px),1fr));gap:12px}
.adv2 .adv2s-item{display:grid;gap:6px;min-width:0}
.adv2 .adv2s-item .adv2-frame{width:100%}
.adv2 .adv2s-item[data-out=true]{opacity:.45}
.adv2 .adv2s-item .row{display:flex;flex-wrap:wrap;gap:6px}
.adv2 .adv2s-item small{font-size:12px;line-height:1.4}
.adv2 .adv2s-asvideo{display:grid;gap:2px;color:var(--ads-muted)}
.adv2 .adv2s-asvideo b{color:var(--ads-action);font-weight:700}
.adv2 .adv2s-out{margin:16px 0 8px;font-size:13px;font-weight:650;color:var(--ads-secondary)}
.adv2 .adv2s-lang{display:inline-flex;align-items:center;gap:8px;margin:10px 0 0;font-size:13.5px;font-weight:650;color:var(--ads-text)}
.adv2 .adv2s-lang select{min-height:36px;padding:4px 8px;border-radius:9px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit}
.adv2 .adv2s-more{margin-top:14px;border:1px solid var(--ads-line);border-radius:14px;padding:4px 14px 14px;background:var(--ads-bg)}
.adv2 .adv2s-more summary{cursor:pointer;font-weight:650;padding:10px 0;color:var(--ads-text)}
.adv2 .adv2s-toggles{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}
.adv2 .adv2s-facts{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.adv2 .adv2s-facts li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg);font-size:13.5px;line-height:1.5;min-width:0}
.adv2 .adv2s-facts input{margin-top:3px;accent-color:var(--ads-action);flex-shrink:0}
.adv2 .adv2s-facts a{font-size:12px;color:var(--ads-muted);text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.adv2 .adv2s-facts .tx{display:grid;gap:2px;min-width:0}
.adv2 .adv2s-link{margin-top:16px}
.adv2 .adv2s-linkrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.adv2 .adv2s-linkrow input{flex:1 1 220px;min-width:0}
`

// ─── a sessão do modo simples ─────────────────────────────────────────────────────────────────

export function AdsV2SimpleSession({
  resume,
  lang,
  balance,
  onBalance,
  onActive,
  onAskStartOver,
  variations = false,
  onVariationsStarted,
  sample = false,
  previewSlot = null,
  onPreview,
}: {
  resume: boolean
  lang: InterfaceLanguage
  balance: number | null
  onBalance: () => Promise<void>
  onActive: (active: boolean) => void
  onAskStartOver: () => void
  /** KINEO-ADS-3-VARIACOES-2026-09-30 — a opção "3 variações" liberada para a conta (page.tsx → AdsV2Client). */
  variations?: boolean
  onVariationsStarted?: (groupId: string) => void
  /** KINEO-ADS-AMOSTRA-2026-10-09 — a conta entrou pela amostra grátis: só o nível dela, sem preço, botão "grátis". */
  sample?: boolean
  /** KINEO-ADS-UX-MARCA-2026-10-10 — a vaga do palco da direita (AdsV2Client) para a prévia ao vivo; null = sem palco. */
  previewSlot?: HTMLElement | null
  /** Avisa o invólucro que a prévia ao vivo ocupa o palco (ele esconde o palco da casa enquanto isso). */
  onPreview?: (on: boolean) => void
}) {
  const copy: AdsV2SimpleCopy = pickInterfaceCopy(ADS_V2_SIMPLE_COPY, lang)
  const lcopy: AdsV2LinkImportCopy = adsV2LinkImportCopy(lang) // KINEO-ADS-1FOTO-LINK-2026-10-10 — 16 línguas
  const vcopy = variationsCopy(lang)
  const scopy: AdsSampleCopy | null = sample ? adsSampleCopy(lang) : null
  const [sampleCap, setSampleCap] = useState(false)
  const [three, setThree] = useState(false)
  const [phase, setPhase] = useState<Phase>(resume ? 'loading' : 'build')
  const [items, setItems] = useState<SimpleItem[]>([])
  // Leitura fresca dos itens para quem roda no fim de um await longo (o planAd): o `items` do fechamento é o da renderização.
  const itemsRef = useRef<SimpleItem[]>([])
  itemsRef.current = items
  const [fileNote, setFileNote] = useState<string | null>(null)
  const [videoBusy, setVideoBusy] = useState(0)
  // KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — aba oculta durante a leitura do vídeo: a leitura espera (v2VideoFrames) e a
  // tela pede para voltar, em vez de acusar o navegador.
  const [tabHidden, setTabHidden] = useState(false)
  const [text, setText] = useState('')
  // KINEO-ADS-1FOTO-LINK-2026-10-10 — o link do produto: o que está no campo, o que a rota LEU (vai ao pedido como `link`,
  // fonte do roteiro) e o aviso da leitura. Link sem foto não planeja: a regra de "pelo menos 1 foto" fica em `missing`.
  const [link, setLink] = useState('')
  const [linkRead, setLinkRead] = useState<string | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkNote, setLinkNote] = useState<{ warn: boolean; text: string } | null>(null)
  const [tier, setTier] = useState<AdsV2Tier | null>(sample ? ADS_SAMPLE_TIER : null)
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — null = segue a sugestão do setor; a pessoa escolheu = vale a escolha dela.
  const [styleChoice, setStyleChoice] = useState<AdsV2StyleChoice | null>(null)
  // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator começa desligado (a pessoa liga; nada muda para quem não liga).
  const [presenterChoice, setPresenterChoice] = useState(false)
  const [price, setPrice] = useState('')
  const [contact, setContact] = useState('')
  const [overlaysOn, setOverlaysOn] = useState(true)
  const [narrationOn, setNarrationOn] = useState(true)
  const [voiceLang, setVoiceLang] = useState<NarrationLanguage | null>(null)
  const [cardTitle, setCardTitle] = useState('')
  const [cardColor, setCardColor] = useState(DEFAULT_COLOR)
  const [logo, setLogo] = useState<LogoItem | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cardUpload, setCardUpload] = useState<{ sig: string; footageId: string } | null>(null)
  const [draft, setDraft] = useState<{ id: string; key: string } | null>(null)
  const [research, setResearch] = useState<Research | null>(null)
  const [factOn, setFactOn] = useState<Record<string, boolean>>({})
  const [plan, setPlan] = useState<Plan | null>(null)
  const { previousPlan, rememberPlan } = usePlanComparison()
  const [busy, setBusy] = useState<null | 'plan' | 'start'>(null)
  const [busyNote, setBusyNote] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [factsNote, setFactsNote] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [pollNote, setPollNote] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const [notReady, setNotReady] = useState(false)
  // KINEO-ADS-UX-MARCA-2026-10-10 — frases novas (16 línguas), reordenar por arrasto, editor de enquadramento, a imagem do
  // cartão final para a prévia ao vivo e o kit da marca (aplicado na abertura; salvo depois que o anúncio começou).
  const ux: AdsV2UxCopy = adsV2UxCopy(lang)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null)
  const [kitApplied, setKitApplied] = useState<AdsBrandKit | null>(null)
  const [saveKit, setSaveKit] = useState(true)
  const tierAutoRef = useRef(false)

  const aliveRef = useRef(true)
  // Revisão (29/09): uma seleção por vez. O limite de 2 vídeos é contado sobre `items`, que só atualiza na próxima
  // renderização; duas seleções seguidas durante a leitura de um vídeo passavam de 2. A segunda espera, com aviso.
  const addingRef = useRef(false)
  const pollRef = useRef<number | null>(null)
  const currentOrderRef = useRef<string | null>(null)
  const urlsRef = useRef<Set<string>>(new Set())
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const planHeadingRef = useRef<HTMLHeadingElement | null>(null)

  // Desmontar ("Recomeçar", troca de modo ou sair): nada que chegue depois mexe na tela; o poll para.
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

  // ── o que a pessoa escolheu, derivado ────────────────────────────────────────────────────

  const sentence = text.replace(/\s+/g, ' ').trim()
  const sector = inferSector(sentence)
  const photoKind = defaultPhotoKind(sector)
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — estilo: o setor só sugere quando o texto o reconheceu ('other' aqui = não sabemos).
  // Com estilo, a 1ª FOTO vai como 'product' (o modo simples marca todas iguais e o estilo só pega plano de produto); foto
  // de tela de app ('text') nunca vira produto — texto não passa por IA de vídeo.
  const styleCopy: AdsV2StyleCopy = adsV2StyleCopy(lang)
  const styleSuggested: AdsV2StyleChoice = sentence && sector !== 'other' ? adsV2SuggestedStyle(sector) : 'none'
  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC ? styleChoice ?? styleSuggested : 'none'
  // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator fala a narração e segura O produto: sem voz ou com fotos de tela ('text'), o
  // cartão fica desligado com o motivo. Ligado, a 1ª foto também vai como produto (é ela que o ator segura).
  const presenterCopy: AdsV2PresenterCopy = adsV2PresenterCopy(lang)
  const presenterWhy: string | null = !narrationOn ? presenterCopy.needsVoice : photoKind === 'text' ? presenterCopy.needsProduct : null
  const presenterOn = ADS_V2_PRESENTER_PUBLIC && presenterChoice && presenterWhy === null
  const firstAsProduct = style !== 'none' && photoKind !== 'text' || presenterOn
  const detected = detectNarrationLanguage(sentence).language
  const spoken: NarrationLanguage = voiceLang ?? narrationLanguage(detected) ?? narrationLanguage(lang) ?? 'en'
  const cardTitleFinal = cardTitle.trim() || simpleTitle(sentence)
  const cost = tier ? adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) : null
  const inAd = items.slice(0, ADS_V2_SIMPLE_MAX_IN_AD)
  const priceT = price.replace(/\s+/g, ' ').trim()
  const contactT = contact.replace(/\s+/g, ' ').trim()

  /** Chave do rascunho: mudou texto, preço, contato, frases, voz, língua ou nível = rascunho novo (a pesquisa é copiada). */
  const draftKey = JSON.stringify({ text: sentence, price: priceT, contact: contactT, overlays: overlaysOn, voice: narrationOn, lang: spoken, tier, link: linkRead })
  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style })
  // A marca de um fato é presa ao CONTEÚDO (fonte + texto), nunca ao id f1..f6: uma pesquisa nova tem outro f1 e não herda
  // a marca do anterior; a mesma pesquisa copiada para um rascunho novo (troca de nível) mantém a marca.
  const factKey = (f: Fact) => JSON.stringify([f.url, f.text])
  const isFactOn = (f: Fact) => factOn[factKey(f)] ?? ADS_V2_SIMPLE_FACTS_DEFAULT_ON
  // Erro de envio na língua da tela (a lib de envio só fala inglês).
  const uploadError = (e: unknown, fallback: string) => (e instanceof AdsUploadError ? simpleUploadErrorMessage(e.reason, lang) ?? e.message : fallback)
  const factsNow = research && draft && research.orderId === draft.id ? research.facts : []
  const planSig = JSON.stringify({ base: baseSig, facts: factsNow.filter((f) => isFactOn(f)).map((f) => f.id) })
  const cardSig = JSON.stringify({ title: cardTitleFinal, price: priceT, contact: contactT, color: cardColor, logo: logo?.footageId ?? null, lang: spoken })
  const planFresh = !!plan && plan.sig === planSig

  const missing: string[] = []
  // KINEO-ADS-1FOTO-LINK-2026-10-10 — 1 foto basta; link sem foto NÃO planeja (a frase pede a foto nas 16 línguas).
  if (inAd.length < ADS_V2_SIMPLE_MIN_IN_AD) missing.push(fill(lcopy.needPhoto, { n: ADS_V2_SIMPLE_MIN_IN_AD - inAd.length, min: ADS_V2_SIMPLE_MIN_IN_AD, max: ADS_V2_SIMPLE_MAX_IN_AD }))
  if (linkBusy) missing.push(lcopy.linkReading)
  // O vídeo ocupa vaga de foto, mas o plano precisa de pelo menos 1 foto (referência das cenas criadas).
  if (inAd.length > 0 && inAd.every((p) => p.video)) missing.push(copy.plan.needPhoto)
  if (!sentence) missing.push(copy.plan.needText)
  if (sentence.length > ADS_V2_SCREEN_SENTENCE_MAX) missing.push(copy.plan.textTooLong)
  if (!tier) missing.push(copy.plan.needTier)
  if (logo?.busy) missing.push(copy.plan.waitLogo)
  if (videoBusy > 0) missing.push(copy.plan.waitVideo)

  // ── URL, poll e vista do pedido (mesmas regras do modo completo: 8 s, 20 s depois de erro) ─────

  function setOrderParam(id: string) {
    if (!aliveRef.current) return
    setUrlParams({ order: id })
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
    applyView(v)
  }

  async function pollOnce(orderId: string) {
    if (!aliveRef.current || currentOrderRef.current !== orderId) return
    const r = await api<StatusView>(`/api/ads/v2/status?order_id=${encodeURIComponent(orderId)}`)
    if (!aliveRef.current || currentOrderRef.current !== orderId) return
    if (!r.ok) {
      if (r.code === 'order_not_found' || r.code === 'unauthenticated') {
        setPollNote(errorText(lang, r))
        return
      }
      setPollNote(copy.progress.lost)
      schedulePoll(orderId, POLL_RETRY_MS)
      return
    }
    setPollNote(null)
    applyView(r.data)
  }

  function openOrder(id: string) {
    if (!aliveRef.current) return
    currentOrderRef.current = id
    setOrderParam(id)
    setPollNote(null)
    setPhase('loading')
    void pollOnce(id)
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
        setUrlParams({ order: null })
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

  useEffect(() => {
    if (phase === 'progress' || phase === 'delivered' || phase === 'failed') headingRef.current?.focus()
  }, [phase])

  // Aba oculta enquanto um vídeo é lido: o aviso vira "Volte para esta aba…" — na tela e no título da aba (o único lugar
  // que a pessoa vê com a aba em segundo plano). Voltou ou terminou = título de antes.
  useEffect(() => {
    const sync = () => setTabHidden(pageHidden())
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  useEffect(() => {
    if (!(videoBusy > 0 && tabHidden)) return
    const before = document.title
    document.title = copy.files.videoHidden
    return () => { document.title = before }
  }, [videoBusy, tabHidden, copy.files.videoHidden])

  // Prévia do quadro final (logo opcional + título + preço + contato).
  useEffect(() => {
    const canvas = cardCanvasRef.current
    if (!canvas || phase !== 'build' || !moreOpen) return
    let stop = false
    ;(async () => {
      let img: HTMLImageElement | null = null
      if (logo?.localUrl) {
        try { img = await loadLogoImage(logo.localUrl) } catch { img = null }
      }
      if (stop) return
      try {
        drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: contactT ? endCardCtaLabel(simpleCtaKind(contactT), spoken) : '', contact: contactT, accent: cardColor })
      } catch {
        /* navegador sem canvas: a prévia fica vazia */
      }
    })()
    return () => {
      stop = true
    }
  }, [phase, moreOpen, logo?.localUrl, cardTitleFinal, priceT, contactT, cardColor, spoken])

  // KINEO-ADS-UX-MARCA-2026-10-10 — a imagem do cartão final para a PRÉVIA AO VIVO: o MESMO desenho (drawEndCard) que sobe
  // no planejar, refeito 160 ms depois da última tecla. Só imagem local (blob); nada sobe daqui.
  useEffect(() => {
    if (phase !== 'build') return
    let stop = false
    const t = window.setTimeout(() => {
      void (async () => {
        let img: HTMLImageElement | null = null
        if (logo?.localUrl) {
          try { img = await loadLogoImage(logo.localUrl) } catch { img = null }
        }
        if (stop) return
        try {
          const canvas = document.createElement('canvas')
          drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: contactT ? endCardCtaLabel(simpleCtaKind(contactT), spoken) : '', contact: contactT, accent: cardColor })
          canvas.toBlob((b) => {
            if (stop || !b || !aliveRef.current) return
            const u = trackUrl(URL.createObjectURL(b))
            setCardPreviewUrl((old) => {
              if (old && old !== u) dropUrl(old)
              return u
            })
          }, 'image/jpeg', 0.82)
        } catch {
          /* navegador sem canvas: a prévia mostra o nome do quadro */
        }
      })()
    }, 160)
    return () => {
      stop = true
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, logo?.localUrl, cardTitleFinal, priceT, contactT, cardColor, spoken])

  // KINEO-ADS-UX-MARCA-2026-10-10 — nível já marcado pelo saldo (uma vez, quando o saldo chega; a escolha da pessoa manda
  // sempre). Na amostra o nível é o dela. Marcar não cobra: o débito segue só no botão "Make my ad".
  useEffect(() => {
    if (tierAutoRef.current || sample || tier !== null) return
    const d = adsV2DefaultTier(balance)
    if (!d) return
    tierAutoRef.current = true
    setTier(d)
  }, [balance, sample, tier])

  // KINEO-ADS-UX-MARCA-2026-10-10 — o KIT DA MARCA na abertura: preenche SÓ o que ainda está vazio (cor ainda a padrão, sem
  // logo). O logo é baixado do NOSSO bucket e vira arquivo local (o cartão é desenhado e sobe pelo caminho de sempre); o id
  // dele é do user_footage desta conta (a rota conferiu; o /plan confere de novo). Kit que não carrega = tela de sempre.
  const formRef = useRef({ cardTitle: '', price: '', contact: '', cardColor: DEFAULT_COLOR, hasLogo: false })
  formRef.current = { cardTitle, price, contact, cardColor, hasLogo: !!logo }
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const r = await api<{ kit?: AdsBrandKit | null; logo_url?: string | null }>('/api/ads/brand-kit')
      if (cancelled || !aliveRef.current || !r.ok || !r.data.kit || brandKitIsEmpty(r.data.kit)) return
      const kit = r.data.kit
      let logoLocal: string | null = null
      if (kit.logo_footage_id && typeof r.data.logo_url === 'string' && r.data.logo_url) {
        try {
          const res = await fetch(r.data.logo_url, { cache: 'no-store' })
          if (res.ok) logoLocal = trackUrl(URL.createObjectURL(await res.blob()))
        } catch {
          logoLocal = null
        }
      }
      if (cancelled || !aliveRef.current) {
        dropUrl(logoLocal)
        return
      }
      const f = formRef.current
      const fillIn = brandKitPrefill(kit, { business: f.cardTitle, price: f.price, contact: f.contact, color: f.cardColor, defaultColor: DEFAULT_COLOR, hasLogo: f.hasLogo }, logoLocal)
      if (fillIn.business) setCardTitle(fillIn.business)
      if (fillIn.price) setPrice(fillIn.price)
      if (fillIn.contact) setContact(fillIn.contact)
      if (fillIn.color) setCardColor(fillIn.color)
      if (fillIn.logo) setLogo({ footageId: fillIn.logo.footageId, localUrl: fillIn.logo.url, busy: false, error: null })
      else dropUrl(logoLocal)
      if (Object.keys(fillIn).length) setKitApplied(kit)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Grava o kit da marca DEPOIS que o anúncio começou (nunca antes, nunca no caminho do débito). Falha = silêncio. */
  function saveBrandKit() {
    const body = brandKitFromScreen({ business: cardTitle, price: priceT, contact: contactT, color: cardColor, logoFootageId: logo?.footageId ?? null })
    void api('/api/ads/brand-kit', { method: 'PUT', body })
  }

  // A prévia ao vivo ocupa o palco da direita enquanto a pessoa monta; o invólucro esconde o palco da casa nesse tempo.
  const previewOn = phase === 'build' && !!previewSlot
  useEffect(() => {
    onPreview?.(previewOn)
  }, [previewOn, onPreview])
  useEffect(() => () => onPreview?.(false), [onPreview])

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

  async function itemFromFile(f: File, fromVideo: boolean): Promise<SimpleItem | null> {
    const url = trackUrl(URL.createObjectURL(f))
    try {
      const img = await loadImage(url)
      return { key: newKey(), name: f.name, srcUrl: url, w: img.naturalWidth, h: img.naturalHeight, fx: 0.5, fy: 0.5, fromVideo, video: null, uploaded: null, busy: false, error: null }
    } catch {
      dropUrl(url)
      return null
    }
  }

  /** PLANO B (o de antes): o vídeo vira 1 a 3 fotos tiradas dele. Devolve os itens (vazio = não abriu). */
  async function framesFromVideo(f: File, notes: string[]): Promise<SimpleItem[]> {
    if (f.size > ADS_V2_SIMPLE_VIDEO_MAX_BYTES) {
      notes.push(fill(copy.files.videoTooBig, { name: f.name }))
      return []
    }
    try {
      const frames = await grabVideoFrames(f, (d) => videoFrameTimes(d, 3), { maxSeconds: ADS_V2_SIMPLE_VIDEO_MAX_SECONDS })
      const added: SimpleItem[] = []
      for (const fr of frames) {
        const it = await itemFromFile(fr, true)
        if (it) added.push(it)
      }
      if (!added.length) notes.push(copy.files.videoDecode)
      return added
    } catch (e) {
      const code = e instanceof VideoFramesError ? e.code : null
      // Aba oculta além do teto: o vídeo não foi julgado — nunca "seu navegador não abre".
      notes.push(code === 'too_long' ? fill(copy.files.videoTooLong, { name: f.name }) : code === 'hidden' ? fill(copy.files.videoHiddenRetry, { name: f.name }) : copy.files.videoDecode)
      return []
    }
  }

  /** Aviso (traduzido) de por que um vídeo caiu no plano B. */
  function asPhotosNote(verdict: AdsV2UserVideoVerdict, name: string): string | null {
    const t = verdict === 'too_big' ? copy.files.videoBigAsPhotos
      : verdict === 'bad_type' ? copy.files.videoTypeAsPhotos
        : verdict === 'too_short' ? copy.files.videoShortAsPhotos
          : verdict === 'too_many' ? copy.files.videoManyAsPhotos
            : verdict === 'unreadable' ? copy.files.videoUnreadableAsPhotos
              : null
    return t ? fill(t, { name }) : null
  }

  /**
   * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo entra COMO VÍDEO quando cabe (até 2 por pedido, até 50 MB, MP4/MOV,
   * duração e tamanho legíveis, ≥ 3 s): miniatura do trecho mais vivo + o arquivo original, que sobe como está. Senão,
   * plano B com o aviso do motivo.
   */
  async function videoItemOrFrames(f: File, videosAlready: number, notes: string[]): Promise<SimpleItem[]> {
    const read = await readVideoForAd(f, videosAlready)
    if (read.kind === 'video') {
      const url = trackUrl(URL.createObjectURL(read.thumb))
      return [{
        key: newKey(), name: f.name, srcUrl: url, w: read.width, h: read.height, fx: 0.5, fy: 0.5, fromVideo: false,
        video: { file: f, seconds: read.seconds, width: read.width, height: read.height, start: read.start },
        uploaded: null, busy: false, error: null,
      }]
    }
    if (read.hidden) {
      notes.push(fill(copy.files.videoHiddenRetry, { name: f.name }))
      return []
    }
    const note = asPhotosNote(read.verdict, f.name)
    if (note) notes.push(note)
    return framesFromVideo(f, notes)
  }

  async function addFiles(list: FileList | null) {
    if (!list || !list.length) return
    if (addingRef.current) {
      setFileNote(copy.files.waitAdding)
      return
    }
    addingRef.current = true
    try {
      await addFilesNow(list)
    } finally {
      addingRef.current = false
    }
  }

  async function addFilesNow(list: FileList) {
    setFileNote(null)
    const notes: string[] = []
    const files = Array.from(list)
    let videosAlready = itemsRef.current.filter((p) => p.video).length
    for (const f of files) {
      if (!aliveRef.current) return
      if (isVideoFile(f.name, f.type)) {
        setVideoBusy((n) => n + 1)
        try {
          const added = await videoItemOrFrames(f, videosAlready, notes)
          if (!aliveRef.current) return
          videosAlready += added.filter((p) => p.video).length
          setItems((prev) => [...prev, ...added].slice(0, ADS_V2_SIMPLE_MAX_ITEMS))
        } finally {
          if (aliveRef.current) setVideoBusy((n) => Math.max(0, n - 1))
        }
        continue
      }
      if (!isImageFile(f.name, f.type)) {
        notes.push(fill(copy.files.badFile, { name: f.name }))
        continue
      }
      if (f.size > PHOTO_MAX_BYTES) {
        notes.push(fill(copy.files.photoTooBig, { name: f.name }))
        continue
      }
      const it = await itemFromFile(f, false)
      if (!aliveRef.current) return
      if (!it) {
        notes.push(fill(copy.files.photoUnreadable, { name: f.name }))
        continue
      }
      setItems((prev) => [...prev, it].slice(0, ADS_V2_SIMPLE_MAX_ITEMS))
    }
    if (aliveRef.current) setFileNote(notes.length ? notes.join(' ') : null)
  }

  /**
   * KINEO-ADS-1FOTO-LINK-2026-10-10 — "Or paste your product link": o servidor lê a página e guarda até 3 fotos do produto
   * no user_footage DESTA conta (/api/ads/v2/link-import, com moderação e cota); aqui cada foto é baixada do NOSSO bucket e
   * entra como um arquivo escolhido pela pessoa (recorte 9:16, foco arrastável, sobe pelo caminho de sempre no planejar).
   * Frase vazia ganha a sugestão da página. Nenhuma foto = o aviso pedido ("add at least one photo"); o link lido fica
   * para o roteiro. Nada aqui cria pedido.
   */
  async function importLink(raw?: string) {
    const url = (raw ?? link).trim()
    if (!url || linkBusy || busy !== null) return
    setLinkBusy(true)
    setLinkNote(null)
    try {
      const r = await api<{ link?: string; host?: string; sentence?: string; images?: { footage_id: string; url: string }[] }>('/api/ads/v2/link-import', { method: 'POST', body: { url } })
      if (!aliveRef.current) return
      if (!r.ok) {
        setLinkNote({ warn: true, text: r.code.startsWith('moderation') || r.code === 'no_access' || r.code === 'closed' ? errorText(lang, r) : adsV2LinkImportError(r.code, lcopy) })
        return
      }
      const host = typeof r.data.host === 'string' ? r.data.host : ''
      setLinkRead(typeof r.data.link === 'string' && r.data.link ? r.data.link : null)
      const suggested = typeof r.data.sentence === 'string' ? r.data.sentence.trim() : ''
      if (suggested) setText((cur) => (cur.trim() ? cur : suggested))
      const added: SimpleItem[] = []
      const list = Array.isArray(r.data.images) ? r.data.images.slice(0, ADS_V2_LINK_IMPORT_MAX_IMAGES) : []
      for (const [i, im] of list.entries()) {
        try {
          const res = await fetch(im.url, { cache: 'no-store' })
          if (!res.ok) continue
          const blob = await res.blob()
          const png = blob.type === 'image/png' || /\.png(\?|$)/i.test(im.url)
          const f = new File([blob], `${(host || 'product').replace(/[^\w-]+/g, '-')}-${i + 1}.${png ? 'png' : 'jpg'}`, { type: png ? 'image/png' : 'image/jpeg' })
          const it = await itemFromFile(f, false)
          if (it) added.push({ ...it, fromLink: true })
        } catch {
          /* foto que não baixou: as outras seguem */
        }
        if (!aliveRef.current) return
      }
      if (added.length) setItems((prev) => [...prev, ...added].slice(0, ADS_V2_SIMPLE_MAX_ITEMS))
      setLinkNote(added.length ? { warn: false, text: fill(lcopy.linkGot, { n: added.length, host: host || url }) } : { warn: true, text: lcopy.linkNoPhotos })
    } finally {
      if (aliveRef.current) setLinkBusy(false)
    }
  }

  function updateItem(key: string, patch: Partial<SimpleItem>) {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }
  function removeItem(key: string) {
    setItems((prev) => {
      const gone = prev.find((p) => p.key === key)
      if (gone) dropUrl(gone.srcUrl)
      return prev.filter((p) => p.key !== key)
    })
  }
  function moveUp(key: string) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === key)
      if (i <= 0) return prev
      const next = prev.slice()
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }
  /** KINEO-ADS-UX-MARCA-2026-10-10 — desce uma posição (dentro do anúncio; a 1ª continua sendo a foto do produto). */
  function moveDown(key: string) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === key)
      if (i < 0 || i >= Math.min(prev.length, ADS_V2_SIMPLE_MAX_IN_AD) - 1) return prev
      return adsV2MoveTo(prev, i, i + 1)
    })
  }
  /** KINEO-ADS-UX-MARCA-2026-10-10 — arrastar um cartão para o lugar de outro (a ordem é a mesma lista de sempre). */
  function moveItemTo(fromKey: string, toKey: string) {
    setItems((prev) => adsV2MoveTo(prev, prev.findIndex((p) => p.key === fromKey), prev.findIndex((p) => p.key === toKey)))
  }
  /** Um arquivo que ficou fora do anúncio entra no lugar do último que está dentro. */
  function promoteItem(key: string) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === key)
      if (i < ADS_V2_SIMPLE_MAX_IN_AD) return prev
      const next = prev.slice()
      const [it] = next.splice(i, 1)
      next.splice(ADS_V2_SIMPLE_MAX_IN_AD - 1, 0, it)
      return next
    })
  }

  async function chooseLogo(file: File | undefined) {
    if (!file) return
    const previous = logo?.localUrl
    setLogo({ footageId: null, localUrl: null, busy: true, error: null })
    try {
      const up = await uploadFootage(file, { isLogo: true })
      if (!aliveRef.current) return
      dropUrl(previous)
      setLogo({ footageId: up.footageId, localUrl: up.localUrl ? trackUrl(up.localUrl) : up.url, busy: false, error: null })
    } catch (e) {
      if (!aliveRef.current) return
      setLogo({ footageId: null, localUrl: null, busy: false, error: uploadError(e, copy.plan.logoFailed) })
    }
  }

  /**
   * Recorta e sobe (um por vez) cada arquivo DO ANÚNCIO cujo enquadramento mudou desde o último envio.
   * KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo que entra como vídeo sobe ORIGINAL (sem recorte, uma vez só) e vai
   * em `videos` com o início do trecho e o foco; as fotos seguem em `photos`.
   */
  async function ensureItemsUploaded(): Promise<{ photos: { footage_id: string; kind: typeof photoKind }[]; videos: PlanVideoBody[] } | null> {
    const out: { footage_id: string; kind: typeof photoKind }[] = []
    const videos: PlanVideoBody[] = []
    const push = (p: SimpleItem, footageId: string) => {
      if (p.video) videos.push({ footage_id: footageId, start: p.video.start, focus_x: p.fx, focus_y: p.fy, width: p.video.width, height: p.video.height })
      // KINEO-ADS-1FOTO-LINK-2026-10-10 — foto que veio do link do PRODUTO é produto quando o texto não reconheceu lugar
      // nenhum ('other'): movimento de produto, não de "atravessar o espaço". Setor reconhecido (imóvel, restaurante…) manda.
      else out.push({ footage_id: footageId, kind: (firstAsProduct && out.length === 0) || (p.fromLink === true && sector === 'other') ? 'product' : photoKind })
    }
    let n = 0
    for (const p of inAd) {
      n += 1
      const sig = uploadSig(p)
      if (p.uploaded && p.uploaded.sig === sig) {
        push(p, p.uploaded.footageId)
        continue
      }
      setBusyNote(fill(copy.plan.noteUpload, { i: n, n: inAd.length }))
      updateItem(p.key, { busy: true, error: null })
      try {
        const file = p.video ? p.video.file : await cropToVertical(p)
        const up = await uploadFootage(file)
        if (!aliveRef.current) return null
        updateItem(p.key, { busy: false, uploaded: { sig, footageId: up.footageId } })
        push(p, up.footageId)
      } catch (e) {
        if (!aliveRef.current) return null
        const msg = uploadError(e, copy.plan.uploadFailed)
        updateItem(p.key, { busy: false, error: msg })
        setPlanError(fill(copy.plan.photoError, { n, msg }))
        return null
      }
    }
    return { photos: out, videos }
  }

  /**
   * O servidor não conseguiu usar um vídeo como vídeo (não mediu, curto, tipo): ESSE item vira fotos (plano B), com aviso.
   * A pessoa planeja de novo (grátis).
   */
  async function videoBackToFrames(footageId: string | null, byKey?: string, why?: string) {
    const target = itemsRef.current.find((p) => p.video && (byKey ? p.key === byKey : p.uploaded?.footageId === footageId))
    if (!target?.video) return
    const notes: string[] = [fill(why ?? copy.files.videoServerAsPhotos, { name: target.name })]
    setVideoBusy((n) => n + 1)
    try {
      const frames = await framesFromVideo(target.video.file, notes)
      if (!aliveRef.current) return
      setItems((prev) => {
        const i = prev.findIndex((p) => p.key === target.key)
        if (i < 0) return prev
        const next = prev.slice()
        next.splice(i, 1, ...frames)
        return next.slice(0, ADS_V2_SIMPLE_MAX_ITEMS)
      })
      dropUrl(target.srcUrl)
      setFileNote(notes.join(' '))
    } finally {
      if (aliveRef.current) setVideoBusy((n) => Math.max(0, n - 1))
    }
  }

  /** Desenha o quadro final (logo opcional) e sobe como PNG — só se mudou desde o último envio. */
  async function ensureCard(): Promise<{ sig: string; footageId: string } | null> {
    if (cardUpload && cardUpload.sig === cardSig) return cardUpload
    setBusyNote(copy.plan.noteCard)
    try {
      let img: HTMLImageElement | null = null
      if (logo?.localUrl) {
        try { img = await loadLogoImage(logo.localUrl) } catch { img = null }
      }
      const canvas = document.createElement('canvas')
      drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: contactT ? endCardCtaLabel(simpleCtaKind(contactT), spoken) : '', contact: contactT, accent: cardColor })
      const file = await toPngFile(canvas)
      const up = await uploadFootage(file)
      if (!aliveRef.current) return null
      const done = { sig: cardSig, footageId: up.footageId }
      setCardUpload(done)
      return done
    } catch (e) {
      if (!aliveRef.current) return null
      setPlanError(uploadError(e, copy.plan.cardFailed))
      return null
    }
  }

  /** Rascunho no servidor para esta combinação (mudou = rascunho novo, com research_from apontando o anterior). */
  async function ensureDraft(): Promise<string | null> {
    if (draft && draft.key === draftKey) return draft.id
    setBusyNote(copy.plan.noteSave)
    const r = await api<{ order_id: string }>('/api/ads/v2/orders', {
      method: 'POST',
      body: {
        mode: 'simple',
        tier,
        seconds: ADS_V2_SCREEN_SECONDS,
        sector,
        sentence,
        language: spoken,
        narration: narrationOn,
        overlays: overlaysOn,
        price: priceT || null,
        contact: contactT || null,
        research_from: draft?.id ?? null,
        // KINEO-ADS-1FOTO-LINK-2026-10-10 — o link que a rota LEU: o /plan junta o que a página diz à frase da pessoa.
        link: linkRead,
      },
    })
    if (!aliveRef.current) return null
    if (!r.ok) {
      if (r.code === 'not_ready') setNotReady(true)
      setPlanError(errorText(lang, r))
      return null
    }
    setDraft({ id: r.data.order_id, key: draftKey })
    return r.data.order_id
  }

  /** Pesquisa (grátis para o cliente): uma por rascunho; o servidor devolve a gravada/copiada sem pesquisar de novo. */
  async function ensureResearch(orderId: string): Promise<Fact[]> {
    if (research && research.orderId === orderId) return research.facts
    setBusyNote(copy.plan.noteResearch)
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await api<{ status: string; facts?: Fact[] }>('/api/ads/v2/research', { method: 'POST', body: { order_id: orderId } })
      if (!aliveRef.current) return []
      if (r.ok && r.data.status === 'running') {
        await new Promise((res) => window.setTimeout(res, 4000))
        if (!aliveRef.current) return []
        continue
      }
      const facts = r.ok && r.data.status === 'ok' && Array.isArray(r.data.facts) ? r.data.facts : []
      setResearch({ orderId, status: facts.length ? 'ok' : 'failed', facts })
      setFactsNote(facts.length ? null : r.ok ? copy.plan.factsNone : errorText(lang, r))
      return facts
    }
    setResearch({ orderId, status: 'failed', facts: [] })
    setFactsNote(copy.plan.factsNone)
    return []
  }

  // ── plano e início ───────────────────────────────────────────────────────────────────────

  /** Vídeos além do limite (2) no anúncio viram fotos ANTES de subir — o /plan recusaria (too_many_videos). */
  async function videosPastLimitToFrames(): Promise<boolean> {
    const extra = itemsRef.current.slice(0, ADS_V2_SIMPLE_MAX_IN_AD).filter((p) => p.video).slice(ADS_V2_MAX_USER_VIDEOS)
    for (const p of extra) await videoBackToFrames(null, p.key, copy.files.videoManyAsPhotos)
    return extra.length > 0
  }

  async function planAd() {
    if (busy || missing.length) return
    setBusy('plan')
    setPlanError(null)
    try {
      if (await videosPastLimitToFrames()) return
      const baseAtStart = baseSig
      const media = await ensureItemsUploaded()
      if (!media || !aliveRef.current) return
      const { photos: uploaded, videos } = media
      const card = await ensureCard()
      if (!card || !aliveRef.current) return
      const orderId = await ensureDraft()
      if (!orderId || !aliveRef.current) return
      const facts = await ensureResearch(orderId)
      if (!aliveRef.current) return
      const chosen = facts.filter((f) => isFactOn(f)).map((f) => f.id)
      setBusyNote(copy.plan.notePlan)
      const r = await api<PlanResponse>('/api/ads/v2/plan', {
        method: 'POST',
        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}) },
      })
      if (!aliveRef.current) return
      if (!r.ok) {
        if (r.code === 'not_ready') setNotReady(true)
        if (VIDEO_TO_PHOTOS_CODES.includes(r.code)) void videoBackToFrames(typeof r.body.footage_id === 'string' ? r.body.footage_id : null)
        if (r.code === 'too_many_videos') void videosPastLimitToFrames()
        if (r.code === 'not_editable') setDraft(null)
        setPlanError(errorText(lang, r))
        return
      }
      rememberPlan(r.data)
      setPlan({ ...r.data, sig: JSON.stringify({ base: baseAtStart, facts: chosen }), cardSig: card.sig })
      window.setTimeout(() => planHeadingRef.current?.focus(), 30)
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setBusyNote(null)
      }
    }
  }

  /** O quadro final mudou depois do plano: sobe o novo e troca no pedido (sem planejar de novo). */
  async function syncCard(p: Plan): Promise<boolean> {
    if (p.cardSig === cardSig) return true
    const done = await ensureCard()
    if (!done || !aliveRef.current) return false
    const r = await api('/api/ads/v2/orders', { method: 'PATCH', body: { order_id: p.order_id, card_footage_id: done.footageId } })
    if (!aliveRef.current) return false
    if (!r.ok) {
      setPlanError(errorText(lang, r))
      return false
    }
    setPlan((cur) => (cur && cur.order_id === p.order_id ? { ...cur, cardSig: done.sig } : cur))
    return true
  }

  async function makeAd() {
    if (!plan || !planFresh || busy || cost === null) return
    if (plan.credits !== cost) {
      setPlanError(copy.plan.priceChanged)
      return
    }
    // KINEO-ADS-3-VARIACOES-2026-09-30 — 3 variações: outra rota, com o preço do GRUPO que a tela mostrou.
    if (variations && three && onVariationsStarted) {
      void makeVariations()
      return
    }
    setBusy('start')
    setPlanError(null)
    try {
      if (!(await syncCard(plan))) return
      setBusyNote(copy.plan.starting)
      onActive(true)
      const r = await api<StatusView>('/api/ads/v2/start', { method: 'POST', body: { order_id: plan.order_id } })
      if (!aliveRef.current) return
      if (!r.ok) {
        onActive(false)
        if (r.code === 'not_startable') {
          setDraft(null)
          setPlan(null)
        }
        // KINEO-ADS-AMOSTRA-2026-10-09 — teto do dia: aviso com o link dos planos; nível errado: a regra da amostra.
        if (scopy && r.code === 'sample_cap') setSampleCap(true)
        setPlanError(scopy && r.code === 'sample_cap' ? null : scopy && r.code === 'sample_level_only' ? scopy.note : errorText(lang, r))
        void onBalance()
        return
      }
      setDraft(null)
      void onBalance()
      if (saveKit) saveBrandKit() // KINEO-ADS-UX-MARCA-2026-10-10 — só depois do /start aceito; não espera a resposta
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
    try {
      if (!(await syncCard(plan))) return
      setBusyNote(vcopy.starting)
      onActive(true)
      const r = await api<{ group_id?: string }>('/api/ads/v2/variations', { method: 'POST', body: { order_id: plan.order_id, expected_credits: group } })
      if (!aliveRef.current) return
      if (!r.ok || typeof r.data.group_id !== 'string') {
        onActive(false)
        if (!r.ok && r.code === 'not_startable') {
          setDraft(null)
          setPlan(null)
        }
        setPlanError(r.ok ? copy.progress.lost : errorText(lang, r))
        void onBalance()
        return
      }
      setDraft(null)
      void onBalance()
      if (saveKit) saveBrandKit() // KINEO-ADS-UX-MARCA-2026-10-10 — só depois das 3 variações aceitas
      onVariationsStarted(r.data.group_id)
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setBusyNote(null)
      }
    }
  }

  async function download() {
    const url = video?.video_url
    if (!url || downloading) return
    setDownloading(true)
    setDownloadNote(null)
    try {
      const outcome = await downloadVideoFile({
        url,
        filename: `${adFileSlug(cardTitleFinal)}-ad.mp4`,
        exportType: 'clean',
        surface: 'ads',
        videoId: video?.id ?? order?.video_id ?? null,
        extra: { order_id: order?.order_id ?? null, v2: true, mode: 'simple' },
      })
      if (outcome === 'popup_blocked' || outcome === 'unavailable') setDownloadNote(copy.done.downloadFailed)
    } catch {
      setDownloadNote(copy.done.downloadFailed)
    } finally {
      if (aliveRef.current) setDownloading(false)
    }
  }

  // ── desenho ──────────────────────────────────────────────────────────────────────────────

  const locked = busy !== null
  const itemByFootage = new Map<string, SimpleItem>()
  for (const p of items) if (p.uploaded) itemByFootage.set(p.uploaded.footageId.toLowerCase(), p)
  // KINEO-ADS-3-VARIACOES-2026-09-30 — com "3 variações" ligada, o saldo conferido é o do GRUPO.
  const shownCost = variations && three ? variationsPrice(cost) : cost
  // KINEO-ADS-AMOSTRA-2026-10-09 — a amostra não cobra: nunca "faltam créditos".
  const short = scopy ? 0 : shownCost !== null && balance !== null && balance < shownCost ? shownCost - balance : 0

  // KINEO-ADS-UX-MARCA-2026-10-10 — passo a passo (✓ quando o passo está pronto) e a prévia ao vivo (palco/barra).
  const steps = [
    { id: 'product' as const, section: 'adv2s-sec1', done: inAd.length >= ADS_V2_SIMPLE_MIN_IN_AD && !inAd.every((p) => p.video) && videoBusy === 0 && !linkBusy },
    { id: 'message' as const, section: 'adv2s-sec2', done: !!sentence && sentence.length <= ADS_V2_SCREEN_SENTENCE_MAX },
    { id: 'look' as const, section: 'adv2s-sec3', done: !!tier },
    { id: 'review' as const, section: 'adv2s-sec4', done: planFresh },
  ]
  const costLine = adsV2CostLine({ tier, balance, sample: !!scopy, group: variations && three ? variationsPrice(cost) : null })
  const tierName = tier ? copy.tiers[tier].name : null
  const costText = !tier || costLine.credits === null
    ? ux.preview.chooseLevel
    : scopy
      ? fill(ux.preview.costFree, { s: costLine.seconds, tier: tierName ?? '' })
      : balance === null
        ? fill(ux.preview.costUnknown, { s: costLine.seconds, tier: tierName ?? '', c: costLine.credits })
        : fill(ux.preview.cost, { s: costLine.seconds, tier: tierName ?? '', c: costLine.credits, n: balance })
  const styleSpec = style !== 'none' ? ADS_V2_STYLES.find((s) => s.key === style) ?? null : null
  const liveData: LivePreviewData = {
    photos: inAd.map((p) => ({ key: p.key, srcUrl: p.srcUrl, fx: p.fx, fy: p.fy })),
    productName: sentence ? cardTitleFinal : cardTitle.trim(),
    style: styleSpec && style !== 'none' ? { label: styleCopy.styles[style].label, oneLine: styleCopy.styles[style].oneLine, preview: styleSpec.preview, poster: styleSpec.poster } : null,
    presenter: presenterOn ? { poster: ADS_V2_PRESENTER_POSTER } : null,
    cardUrl: cardPreviewUrl,
    voice: narrationOn ? NARRATION_LANGUAGES.find((l) => l.code === spoken)?.native ?? spoken : copy.plan.noVoice,
    tierName,
    costText,
    shortText: costLine.short > 0 ? fill(ux.preview.short, { n: costLine.short }) : null,
  }
  const editing = editKey ? inAd.find((p) => p.key === editKey) ?? null : null

  return (
    <div className="adv2-layout">
      <style dangerouslySetInnerHTML={{ __html: SIMPLE_CSS + SIMPLE_UX_CSS }} />
      <div className="adv2-main">
        {notReady ? <p className="adv2-note" role="status">{copy.notReady}</p> : null}

        {phase === 'loading' ? (
          <section className="adv2-card" aria-busy="true">
            <p className="adsw-lead" role="status" style={{ margin: 0 }}>{copy.progress.loading}</p>
            {pollNote ? <p className="adsw-warn" role="status">{pollNote}</p> : null}
          </section>
        ) : null}

        {phase === 'build' ? (
          <>
            {/* KINEO-ADS-UX-MARCA-2026-10-10 — o passo a passo (gruda no topo do quadro; ✓ em cada passo pronto). */}
            <SimpleStepper copy={ux} steps={steps} />
            {/* 1. Arquivos */}
            <section id="adv2s-sec1" className="adv2-card" aria-labelledby="adv2s-s1">
              <h2 id="adv2s-s1"><span className="adv2-num" aria-hidden="true">1</span>{copy.files.title}</h2>
              <p className="adsw-lead">{lcopy.lead}</p>
              {items.length ? (
                <>
                  <p className="adsw-hint" style={{ margin: '0 0 10px' }}>{fill(copy.files.count, { n: inAd.length, max: ADS_V2_SIMPLE_MAX_IN_AD })} · {copy.files.frameHint}</p>
                  <ol className="adv2s-items" aria-label={copy.files.title}>
                    {inAd.map((p, i) => (
                      <ItemCard key={p.key} item={p} index={i} copy={copy} locked={locked} out={false}
                        onFocal={(fx, fy) => updateItem(p.key, { fx, fy })}
                        onRemove={() => { if (editKey === p.key) setEditKey(null); removeItem(p.key) }}
                        onMoveUp={i > 0 ? () => moveUp(p.key) : undefined}
                        ux={ux}
                        onMoveDown={i < inAd.length - 1 ? () => moveDown(p.key) : undefined}
                        onAdjust={() => setEditKey((k) => (k === p.key ? null : p.key))}
                        adjusting={editKey === p.key}
                        drag={{
                          dragging: dragKey === p.key,
                          target: dropKey === p.key && dragKey !== null && dragKey !== p.key,
                          start: () => setDragKey(p.key),
                          over: () => setDropKey(p.key),
                          drop: () => { if (dragKey && dragKey !== p.key) moveItemTo(dragKey, p.key); setDragKey(null); setDropKey(null) },
                          end: () => { setDragKey(null); setDropKey(null) },
                        }}
                      />
                    ))}
                  </ol>
                  {editing ? (
                    <CropEditor
                      key={editing.key}
                      item={editing}
                      copy={ux}
                      label={fill(copy.files.frameLabel, { n: inAd.indexOf(editing) + 1 })}
                      onFocal={(fx, fy) => updateItem(editing.key, { fx, fy })}
                      onDone={() => setEditKey(null)}
                    />
                  ) : null}
                  {items.length > ADS_V2_SIMPLE_MAX_IN_AD ? (
                    <>
                      <p className="adv2s-out">{fill(copy.files.outTitle, { max: ADS_V2_SIMPLE_MAX_IN_AD })}</p>
                      <ol className="adv2s-items">
                        {items.slice(ADS_V2_SIMPLE_MAX_IN_AD).map((p, j) => (
                          <ItemCard key={p.key} item={p} index={ADS_V2_SIMPLE_MAX_IN_AD + j} copy={copy} locked={locked} out ux={ux}
                            onFocal={() => undefined}
                            onRemove={() => removeItem(p.key)}
                            onUse={() => promoteItem(p.key)}
                          />
                        ))}
                      </ol>
                    </>
                  ) : null}
                </>
              ) : null}
              <input ref={fileInputRef} className="adv2-sr" type="file" accept={ADS_V2_SIMPLE_ACCEPT} multiple tabIndex={-1} aria-hidden="true" onChange={(e) => { void addFiles(e.target.files); e.target.value = '' }} />
              {/* KINEO-ADS-UX-MARCA-2026-10-10 — soltar arquivos aqui OU o botão de sempre (mesmo addFiles, mesmas regras). */}
              <div style={{ marginTop: 14 }}>
                <DropZone
                  copy={ux}
                  disabled={locked || items.length >= ADS_V2_SIMPLE_MAX_ITEMS}
                  onFiles={(list) => void addFiles(list)}
                  button={
                    <button type="button" className="adv2-add" disabled={locked || items.length >= ADS_V2_SIMPLE_MAX_ITEMS} onClick={() => fileInputRef.current?.click()}>
                      <span aria-hidden="true">+</span> {items.length ? copy.files.addMore : copy.files.add}
                    </button>
                  }
                />
              </div>
              {videoBusy > 0 ? <p className="adsw-hint" role="status">{tabHidden ? copy.files.videoHidden : copy.files.readingVideo}</p> : null}
              {fileNote ? <p className="adsw-warn" role="status">{fileNote}</p> : null}
              {/* KINEO-ADS-1FOTO-LINK-2026-10-10 — "Or paste your product link": colar já busca; Enter ou o botão também. */}
              <div className="adsw-f adv2s-link" data-kineo="ads-link-import">
                <label htmlFor="adv2s-link">{lcopy.linkLabel}</label>
                <small>{lcopy.linkHint}</small>
                <div className="adv2s-linkrow">
                  <input
                    id="adv2s-link"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={link}
                    maxLength={500}
                    disabled={locked || linkBusy}
                    placeholder={lcopy.linkPlaceholder}
                    onChange={(e) => { setLink(e.target.value); if (!e.target.value.trim()) setLinkRead(null) }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').trim()
                      if (!pasted) return
                      e.preventDefault()
                      setLink(pasted)
                      void importLink(pasted)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void importLink() } }}
                  />
                  <button type="button" className="adsw-btn ghost small" disabled={locked || linkBusy || !link.trim() || items.length >= ADS_V2_SIMPLE_MAX_ITEMS} onClick={() => void importLink()}>
                    {linkBusy ? lcopy.linkReading : lcopy.linkButton}
                  </button>
                </div>
                {linkNote ? <p className={linkNote.warn ? 'adsw-warn' : 'adsw-hint'} role="status">{linkNote.text}</p> : null}
              </div>
            </section>

            {/* 2. O texto */}
            <section id="adv2s-sec2" className="adv2-card" aria-labelledby="adv2s-s2">
              <h2 id="adv2s-s2"><span className="adv2-num" aria-hidden="true">2</span>{copy.text.title}</h2>
              {/* KINEO-ADS-UX-MARCA-2026-10-10 — o kit da marca entrou: mostra o que entrou (cor, logo, nome, preço) e "Editar". */}
              {kitApplied ? (
                <p className="adv2s-kit" role="status" data-kineo="ads-brand-kit-chip">
                  {kitApplied.color ? <span className="sw" aria-hidden="true" style={{ background: cardColor }} /> : null}
                  {logo?.localUrl ? <img src={logo.localUrl} alt="" /> : null}
                  <span>{ux.kit.chip}{cardTitle.trim() ? ` · ${cardTitle.trim()}` : ''}{priceT ? ` · ${priceT}` : ''}</span>
                  <button type="button" disabled={locked} onClick={() => { setMoreOpen(true); window.setTimeout(() => goToSection('adv2s-sec2'), 30) }}>{ux.kit.edit}</button>
                </p>
              ) : null}
              <label className="adsw-f">
                <span>{copy.text.question}</span>
                <small>{copy.text.hint}</small>
                <textarea className="adsw-ta" rows={3} maxLength={ADS_V2_SCREEN_SENTENCE_MAX} value={text} disabled={locked} onChange={(e) => setText(e.target.value)} placeholder={copy.text.placeholder} />
              </label>
              <label className="adv2s-lang">
                {copy.text.voiceIn}
                <select value={spoken} disabled={locked} onChange={(e) => setVoiceLang(narrationLanguage(e.target.value))}>
                  {NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
                </select>
              </label>
              <details className="adv2s-more" open={moreOpen} onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}>
                <summary>{copy.text.more}</summary>
                <div className="adv2s-toggles">
                  <button type="button" className="adv2-switch" role="switch" aria-checked={overlaysOn} disabled={locked} onClick={() => setOverlaysOn((v) => !v)}>
                    <i aria-hidden="true" /> {copy.text.overlays}: {overlaysOn ? copy.text.onMany : copy.text.offMany}
                  </button>
                  <button type="button" className="adv2-switch" role="switch" aria-checked={narrationOn} disabled={locked} onClick={() => setNarrationOn((v) => !v)}>
                    <i aria-hidden="true" /> {copy.text.narration}: {narrationOn ? copy.text.on : copy.text.off}
                  </button>
                </div>
                {/* KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — "sem legenda" (fundador): as frases são 2-3 frases curtas, não legenda. */}
                <p className="adsw-hint">{copy.text.overlaysHint}</p>
                <label className="adsw-f">
                  <span>{copy.text.price}</span>
                  <input type="text" value={price} maxLength={60} disabled={locked} onChange={(e) => setPrice(e.target.value)} placeholder={copy.text.pricePlaceholder} />
                </label>
                <label className="adsw-f">
                  <span>{copy.text.contact}</span>
                  <input type="text" value={contact} maxLength={80} disabled={locked} onChange={(e) => setContact(e.target.value)} placeholder={copy.text.contactPlaceholder} />
                </label>
                <div className="adv2-cardwrap" style={{ marginTop: 12 }}>
                  <canvas ref={cardCanvasRef} className="adv2-cardprev" width={1080} height={1920} role="img" aria-label={copy.text.cardPreview} />
                  <div className="fields">
                    <label className="adsw-f">
                      <span>{copy.text.cardTitle}</span>
                      <small>{copy.text.cardTitleHint}</small>
                      <input type="text" value={cardTitle} maxLength={60} disabled={locked} onChange={(e) => setCardTitle(e.target.value)} placeholder={simpleTitle(sentence)} />
                    </label>
                    <div className="adsw-f">
                      <span>{copy.text.logo}</span>
                      <div className="adv2-logo">
                        {logo?.localUrl ? <div className="tile"><img src={logo.localUrl} alt="" /></div> : null}
                        <input ref={logoInputRef} className="adv2-sr" type="file" accept={ADS_UPLOAD_ACCEPT_LOGO} tabIndex={-1} aria-hidden="true" onChange={(e) => { void chooseLogo(e.target.files?.[0]); e.target.value = '' }} />
                        <button type="button" className="adsw-btn ghost small" disabled={locked || !!logo?.busy} onClick={() => logoInputRef.current?.click()}>
                          {logo?.busy ? copy.files.uploading : logo?.footageId ? copy.text.changeLogo : copy.text.addLogo}
                        </button>
                        {logo?.footageId ? (
                          <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={() => { dropUrl(logo.localUrl); setLogo(null) }}>{copy.text.removeLogo}</button>
                        ) : null}
                      </div>
                      {logo?.error ? <p className="adsw-err" role="alert">{logo.error}</p> : null}
                    </div>
                    <label className="adsw-f adv2-color">
                      <input type="color" value={cardColor} disabled={locked} onChange={(e) => setCardColor(e.target.value)} />
                      <span style={{ margin: 0 }}>{copy.text.color}</span>
                    </label>
                  </div>
                </div>
              </details>
            </section>

            {/* 3. Nível */}
            <section id="adv2s-sec3" className="adv2-card" aria-labelledby="adv2s-s3">
              <h2 id="adv2s-s3"><span className="adv2-num" aria-hidden="true">3</span>{copy.tiers.title}</h2>
              <fieldset className="adv2-tiers">
                <legend className="adv2-sr">{copy.tiers.title}</legend>
                {ADS_V2_TIER_IDS.map((t) => {
                  const credits = adsV2Credits(t, ADS_V2_SCREEN_SECONDS)
                  const tc = copy.tiers[t]
                  // KINEO-ADS-AMOSTRA-2026-10-09 — na amostra só o nível dela abre; os outros mostram "planos pagos".
                  const sampleOff = !!scopy && t !== ADS_SAMPLE_TIER
                  const need = scopy ? 0 : balance !== null && balance < credits ? credits - balance : 0
                  return (
                    <label key={t} className="adv2-tier">
                      <input className="adv2-sr" type="radio" name="adv2s-tier" value={t} checked={tier === t} disabled={locked || sampleOff} onChange={() => setTier(t)} />
                      <b>{tc.name}</b>
                      <span className="cr">{scopy ? (sampleOff ? scopy.paidOnly : scopy.badge) : fill(copy.tiers.credits, { n: credits })}</span>
                      <span>{tc.pitch}</span>
                      {/* KINEO-ADS-UX-MARCA-2026-10-10 — o que o nível inclui (números de ADS_V2_TIERS) e o selo do recomendado. */}
                      <TierIncludes copy={ux} inc={adsV2TierIncludes(t)} />
                      {t === ADS_V2_RECOMMENDED_TIER && !scopy ? <span className="adv2s-rec">{ux.tiers.recommended}</span> : null}
                      {need > 0 ? <span className="short">{fill(copy.tiers.needMore, { n: need })}</span> : null}
                    </label>
                  )
                })}
              </fieldset>
              {tier && tier !== 'photo_motion' ? <p className="adsw-hint">{copy.tiers.aiPeople}</p> : null}
              {ADS_V2_STYLES_PUBLIC ? (
                <AdsStylePicker
                  name="adv2s-style"
                  value={style}
                  suggested={styleSuggested}
                  onChange={setStyleChoice}
                  disabled={locked}
                  copy={styleCopy}
                  note={photoKind === 'text' ? styleCopy.noProduct : styleCopy.targetSimple}
                  carousel={{ labels: { all: ux.styles.all, food: ux.styles.food, beauty: ux.styles.beauty, tech: ux.styles.tech, any: ux.styles.any }, recommended: ux.styles.recommended, prev: ux.styles.prev, next: ux.styles.next }}
                />
              ) : null}
              {ADS_V2_PRESENTER_PUBLIC ? (
                <AdsPresenterToggle
                  name="adv2s-presenter"
                  checked={presenterChoice}
                  onChange={setPresenterChoice}
                  disabled={locked}
                  reason={presenterWhy}
                  note={presenterCopy.simpleNote}
                  copy={presenterCopy}
                />
              ) : null}
              {scopy ? <p className="adsw-hint">{scopy.note}</p> : null}
              <p className="adv2-balance" role="status">
                {balance === null ? copy.tiers.balanceUnknown : fill(copy.tiers.balance, { n: balance })}{' '}
                {short > 0 ? <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">{copy.tiers.getCredits}</Link> : null}
              </p>
            </section>

            {/* 4. Descobrir, planejar e fazer */}
            <section id="adv2s-sec4" className="adv2-card" aria-labelledby="adv2s-s4">
              <h2 id="adv2s-s4" ref={planHeadingRef} tabIndex={-1}><span className="adv2-num" aria-hidden="true">4</span>{copy.plan.title}</h2>
              {factsNow.length ? (
                <>
                  <h3>{copy.plan.factsTitle}</h3>
                  <p className="adsw-hint" style={{ margin: '0 0 10px' }}>{copy.plan.factsHint}</p>
                  <ul className="adv2s-facts">
                    {factsNow.map((f) => (
                      <li key={f.id}>
                        <input type="checkbox" id={`adv2s-${f.id}`} checked={isFactOn(f)} disabled={locked} onChange={(e) => setFactOn((m) => ({ ...m, [factKey(f)]: e.target.checked }))} />
                        <span className="tx">
                          <label htmlFor={`adv2s-${f.id}`}>{f.text}</label>
                          <a href={f.url} target="_blank" rel="noopener noreferrer nofollow">{copy.plan.source}: {f.host}</a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {factsNote ? <p className="adsw-hint" role="status">{factsNote}</p> : null}
              {!planFresh ? (
                <>
                  <p className="adsw-lead">{plan ? copy.plan.stale : copy.plan.lead}</p>
                  {missing.length ? (
                    <div className="adv2-missing" role="status">
                      {copy.plan.missingTitle}
                      <ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul>
                    </div>
                  ) : null}
                  <div className="adv2-actions">
                    <button type="button" className="adsw-btn" disabled={locked || missing.length > 0} onClick={() => void planAd()}>
                      {busy === 'plan' ? copy.plan.planning : plan ? copy.plan.again : copy.plan.go}
                    </button>
                  </div>
                </>
              ) : (
                <>
                <AdsPlanChanges before={previousPlan} after={plan as Plan} />
                <SimplePlanPreview
                  plan={plan as Plan}
                  copy={copy}
                  cost={cost}
                  three={variations ? { on: three, onChange: setThree, copy: vcopy } : null}
                  sample={scopy}
                  short={short}
                  busy={busy}
                  narrationOn={narrationOn}
                  itemByFootage={itemByFootage}
                  styleCopy={styleCopy}
                  presenterCopy={presenterCopy}
                  onMake={() => void makeAd()}
                />
                </>
              )}
              {/* KINEO-ADS-UX-MARCA-2026-10-10 — quanto demora e "Salvar como meu kit da marca" (ligado; grava só depois que o anúncio começou). */}
              <p className="adv2s-eta">⏱ {ux.preview.delivery}</p>
              <label className="adv2s-save" data-kineo="ads-brand-kit-save">
                <input type="checkbox" checked={saveKit} disabled={locked} onChange={(e) => setSaveKit(e.target.checked)} />
                <span>{ux.kit.save}<small>{ux.kit.saveHint}</small></span>
              </label>
              {busyNote ? <p className="adsw-hint" role="status">{busyNote}</p> : null}
              {planError ? <p className="adsw-err" role="alert">{planError}</p> : null}
              {scopy && sampleCap ? <p className="adsw-warn" role="alert">{scopy.cap} <a className="adsw-link" href="/pricing" target="_blank" rel="noopener">{scopy.paidOnly} →</a></p> : null}
            </section>
            {/* KINEO-ADS-UX-MARCA-2026-10-10 — a prévia ao vivo: palco da direita (computador) e barra que gruda embaixo (celular). */}
            <LiveStage slot={previewSlot} data={liveData} copy={ux} />
            <MobilePreviewBar data={liveData} copy={ux} />
          </>
        ) : null}

        {phase === 'progress' && order ? (
          <section className="adv2-card" aria-labelledby="adv2s-prog">
            <h2 id="adv2s-prog" ref={headingRef} tabIndex={-1}>{copy.progress.title}</h2>
            <p className="adsw-lead">
              {order.status === 'assembling' ? copy.progress.assembling : copy.progress.animating}{' '}
              {copy.progress.leave} <Link className="adsw-link" href="/history">{copy.progress.myVideos}</Link>.
            </p>
            <SimpleShotGrid shots={order.shots} orderStatus={order.status} copy={copy} />
            {pollNote ? <p className="adsw-warn" role="status">{pollNote}</p> : null}
          </section>
        ) : null}

        {phase === 'delivered' && order ? (
          <section className="adv2-card" aria-labelledby="adv2s-done">
            <h2 id="adv2s-done" ref={headingRef} tabIndex={-1}>{copy.done.title}</h2>
            {video?.video_url ? (
              <video className="adv2-player" src={video.video_url} controls playsInline preload="metadata" />
            ) : (
              <p className="adsw-lead">{copy.done.inMyVideos} <Link className="adsw-link" href="/history">{copy.progress.myVideos}</Link>.</p>
            )}
            <div className="adv2-actions">
              {video?.video_url ? (
                <button type="button" className="adsw-btn" disabled={downloading} onClick={() => void download()}>
                  {downloading ? copy.done.downloading : copy.done.download}
                </button>
              ) : null}
              <Link className="adsw-link" href="/history">{copy.done.open}</Link>
            </div>
            {downloadNote ? <p className="adsw-warn" role="status">{downloadNote}</p> : null}
            <p className="adv2-note">{copy.done.aiLabel}</p>
            {/* KINEO-ADS-AMOSTRA-2026-10-09 — a amostra não tem refação (a rota segue fechada para free/trial). */}
            {scopy ? null : <h3 style={{ margin: '24px 0 6px' }}>{copy.done.redoTitle}</h3>}
            <div className="adv2-actions" style={{ marginTop: 0 }}>
              {scopy ? null : <a className="adsw-btn ghost small" href={`/ads/v2?mode=full&order=${encodeURIComponent(order.order_id)}`}>{copy.done.redo}</a>}
              <button type="button" className="adsw-btn ghost" onClick={onAskStartOver}>{copy.done.another}</button>
            </div>
          </section>
        ) : null}

        {phase === 'failed' && order ? (
          <section className="adv2-card" aria-labelledby="adv2s-fail">
            <h2 id="adv2s-fail" ref={headingRef} tabIndex={-1}>{order.status === 'cancelled' ? copy.failed.cancelled : order.parent_order_id ? copy.failed.redoTitle : copy.failed.title}</h2>
            <p className="adsw-lead">{order.status === 'cancelled' ? copy.failed.nothing : simpleLabel(copy, failedOrderMessage(order.error, !!order.parent_order_id))}</p>
            <div className="adv2-actions">
              {order.parent_order_id ? (
                <button type="button" className="adsw-btn" onClick={() => openOrder(order.parent_order_id as string)}>{copy.failed.backToAd}</button>
              ) : items.length ? (
                <button type="button" className="adsw-btn" onClick={() => { setUrlParams({ order: null }); currentOrderRef.current = null; setOrder(null); setPlan(null); setDraft(null); setPhase('build') }}>
                  {copy.failed.back}
                </button>
              ) : null}
              <button type="button" className="adsw-btn ghost" onClick={onAskStartOver}>{copy.shell.startOver}</button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="adv2-aside" aria-label={copy.how.title}>
        <section className="adv2-card">
          <h2>{copy.how.title}</h2>
          <ol className="adv2-how">
            {copy.how.steps.map((s, i) => (
              <li key={s}>
                <span className="adv2-num" aria-hidden="true">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  )
}

// ─── um arquivo: moldura 9:16 arrastável ─────────────────────────────────────────────────────

function ItemCard({
  item,
  index,
  copy,
  locked,
  out,
  onFocal,
  onRemove,
  onMoveUp,
  onUse,
  ux,
  onMoveDown,
  onAdjust,
  adjusting = false,
  drag: dnd,
}: {
  item: SimpleItem
  index: number
  copy: AdsV2SimpleCopy
  locked: boolean
  out: boolean
  onFocal: (fx: number, fy: number) => void
  onRemove: () => void
  onMoveUp?: () => void
  onUse?: () => void
  /** KINEO-ADS-UX-MARCA-2026-10-10 — frases novas, descer, abrir o editor de enquadramento e reordenar por arrasto. */
  ux: AdsV2UxCopy
  onMoveDown?: () => void
  onAdjust?: () => void
  adjusting?: boolean
  drag?: { dragging: boolean; target: boolean; start: () => void; over: () => void; drop: () => void; end: () => void }
}) {
  const liRef = useRef<HTMLLIElement | null>(null)
  const internal = (e: { dataTransfer: DataTransfer | null }) => Array.from(e.dataTransfer?.types ?? []).includes('text/x-kineo-item')
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const small = isSmallCrop(cropRect(item.w, item.h, item.fx, item.fy))
  const canDrag = !locked && !out

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canDrag) return
    drag.current = { x: e.clientX, y: e.clientY, fx: item.fx, fy: item.fy, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    const el = frameRef.current
    if (!d || !el || d.id !== e.pointerId) return
    const box = el.getBoundingClientRect()
    const next = panFocal({ fx: d.fx, fy: d.fy }, { dx: e.clientX - d.x, dy: e.clientY - d.y }, { w: box.width, h: box.height }, { w: item.w, h: item.h })
    onFocal(next.fx, next.fy)
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (!canDrag) return
    const step = e.shiftKey ? 0.2 : 0.05
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const m = map[e.key]
    if (!m) return
    e.preventDefault()
    onFocal(clampFocal(item.fx + m[0]), clampFocal(item.fy + m[1]))
  }

  return (
    <li
      ref={liRef}
      className="adv2s-item"
      data-out={out}
      data-dragging={dnd?.dragging ?? false}
      data-target={dnd?.target ?? false}
      onDragOver={dnd && !locked ? (e) => { if (!internal(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dnd.over() } : undefined}
      onDrop={dnd && !locked ? (e) => { if (!internal(e)) return; e.preventDefault(); dnd.drop() } : undefined}
    >
      <div style={{ position: 'relative' }}>
      {index === 0 && !out ? <span className="adv2s-first">{ux.first}</span> : null}
      {dnd && !locked ? (
        <button
          type="button"
          className="adv2s-grip"
          draggable
          aria-label={fill(ux.dragHandle, { n: index + 1 })}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/x-kineo-item', item.key)
            if (liRef.current) {
              try { e.dataTransfer.setDragImage(liRef.current, 40, 40) } catch { /* ignore */ }
            }
            dnd.start()
          }}
          onDragEnd={dnd.end}
          onKeyDown={(e) => {
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && onMoveUp) { e.preventDefault(); onMoveUp() }
            if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && onMoveDown) { e.preventDefault(); onMoveDown() }
          }}
        >⠿</button>
      ) : null}
      <div
        ref={frameRef}
        className="adv2-frame"
        tabIndex={canDrag ? 0 : -1}
        role="group"
        aria-label={fill(copy.files.frameLabel, { n: index + 1 })}
        aria-disabled={!canDrag}
        style={{ touchAction: frameTouchAction(item.w, item.h) }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <img src={item.srcUrl} alt={fill(copy.files.photoAlt, { n: index + 1 })} draggable={false} style={{ objectPosition: focalPosition(item.fx, item.fy) }} />
        <span className="badge">{index + 1}</span>
      </div>
      </div>
      {item.fromVideo ? <small className="adsw-hint" style={{ margin: 0 }}>{copy.files.fromVideo}</small> : null}
      {item.video ? (
        <small className="adv2s-asvideo" style={{ margin: 0 }}>
          <b><span aria-hidden="true">▶ </span>{copy.files.asVideo}</b>
          <span>{copy.files.asVideoHint}</span>
        </small>
      ) : null}
      {small && !out && !item.video ? <small className="adsw-warn" style={{ margin: 0 }}>{copy.files.small}</small> : null}
      {item.busy ? <small className="adsw-hint" style={{ margin: 0 }} role="status">{copy.files.uploading}</small> : null}
      {item.error ? <small className="adsw-err" style={{ margin: 0 }} role="alert">{item.error}</small> : null}
      <div className="row">
        {onUse ? <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onUse}>{copy.files.useThis}</button> : null}
        {onAdjust && !out ? <button type="button" className="adsw-btn ghost small" aria-pressed={adjusting} disabled={locked} onClick={onAdjust}>{adjusting ? ux.adjustDone : ux.adjust}</button> : null}
        {onMoveUp ? <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onMoveUp}>{copy.files.moveUp}</button> : null}
        {onMoveDown ? <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onMoveDown}>{ux.moveDown}</button> : null}
        <button type="button" className="adsw-btn ghost small" disabled={locked} onClick={onRemove}>{copy.files.remove}</button>
      </div>
    </li>
  )
}

// ─── prévia do plano ─────────────────────────────────────────────────────────────────────────

function SimplePlanPreview({
  plan,
  copy,
  cost: single,
  three,
  sample = null,
  short,
  busy,
  narrationOn,
  itemByFootage,
  styleCopy,
  presenterCopy,
  onMake,
}: {
  plan: Plan
  copy: AdsV2SimpleCopy
  cost: number | null
  three: { on: boolean; onChange: (on: boolean) => void; copy: ReturnType<typeof variationsCopy> } | null
  /** KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis: 0 créditos e o botão "grátis". */
  sample?: AdsSampleCopy | null
  short: number
  busy: string | null
  narrationOn: boolean
  itemByFootage: Map<string, SimpleItem>
  styleCopy: AdsV2StyleCopy
  /** KINEO-ATOR-ANUNCIO-2026-10-09 — frases do ator na língua da tela. */
  presenterCopy: AdsV2PresenterCopy
  onMake: () => void
}) {
  const styleName = (k: string | null | undefined) => (k && k in styleCopy.styles ? styleCopy.styles[k as keyof AdsV2StyleCopy['styles']].label : null)
  const cost = three?.on ? variationsPrice(single) : single
  return (
    <>
      <p className="adsw-lead">{copy.plan.lead}</p>
      <h3>{copy.plan.shots}</h3>
      <ol className="adv2-plan-shots">
        {plan.shots.map((s, i) => {
          const p = s.photo ? itemByFootage.get(s.photo.toLowerCase()) : undefined
          return (
            <li key={s.idx}>
              <span className="th">
                {p && s.source === 'client_photo' ? (
                  <img src={p.srcUrl} alt="" style={{ objectPosition: focalPosition(p.fx, p.fy) }} />
                ) : (
                  <span>{s.source === 'generated_scene' ? copy.plan.newScene : copy.plan.photo}</span>
                )}
              </span>
              <span className="tx">
                <b>{i + 1}. {simpleLabel(copy, ADS_V2_ROLE_LABELS[s.role] ?? s.role)} · {s.cut_seconds} s</b>
                <span>{simpleLabel(copy, describeShot(s))}{styleName(s.effect) ? <> · ✨ {styleName(s.effect)}</> : null}</span>
              </span>
            </li>
          )
        })}
        <li>
          <span className="th"><span>{plan.shots.length + 1}</span></span>
          <span className="tx"><b>{plan.shots.length + 1}. {copy.plan.lastFrame}</b><span>{copy.plan.lastFrameDesc}</span></span>
        </li>
      </ol>
      {plan.style_asked && !plan.style ? <p className="adsw-hint">{styleCopy.noProduct}</p> : null}
      {plan.presenter ? <p className="adsw-hint">🎙 <b>{presenterCopy.title}</b> · {presenterCopy.planLine}</p> : plan.presenter_asked ? <p className="adsw-hint">{presenterCopy.notApplied}</p> : null}
      <h3>{copy.plan.words}</h3>
      {plan.overlays.length ? (
        <ul className="adv2-lines">{plan.overlays.map((o) => <li key={`${o.role}-${o.start}`}>{o.text}</li>)}</ul>
      ) : (
        <p className="adsw-hint" style={{ margin: '0 0 18px' }}>{copy.plan.noWords}</p>
      )}
      <div className="adv2-voice">
        <b>{copy.plan.voice}</b>
        {narrationOn && plan.narration ? <p>{plan.narration}</p> : <p className="off">{copy.plan.noVoice}</p>}
      </div>
      <p className="adv2-total">{fill(copy.plan.total, { s: Math.round(plan.total_seconds * 10) / 10, c: sample ? 0 : cost ?? '' })}</p>
      {sample ? <p className="adsw-hint">{sample.note}</p> : null}
      {short > 0 ? (
        <p className="adsw-warn">{fill(copy.tiers.needMore, { n: short })} <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">{copy.tiers.getCredits}</Link></p>
      ) : null}
      {three ? <VariationToggle on={three.on} onChange={three.onChange} single={single} copy={three.copy} disabled={busy !== null} /> : null}
      <div className="adv2-actions">
        <button type="button" className="adsw-btn" disabled={busy !== null || cost === null || short > 0} onClick={onMake}>
          {busy === 'start' ? copy.plan.starting : sample ? sample.make : three?.on ? fill(three.copy.make, { c: cost ?? '' }) : fill(copy.plan.make, { c: cost ?? '' })}
        </button>
      </div>
    </>
  )
}

// ─── grade das cenas (progresso) ─────────────────────────────────────────────────────────────

function SimpleShotGrid({ shots, orderStatus, copy }: { shots: AdsV2ScreenShot[]; orderStatus: string; copy: AdsV2SimpleCopy }) {
  if (!shots.length) return <p className="adsw-hint" role="status">{copy.progress.preparing}</p>
  return (
    <ol className="adv2-grid" aria-label={copy.plan.shots}>
      {shots.map((s, i) => {
        const label = simpleLabel(copy, shotStateLabel(s, orderStatus))
        const isText = s.kind === 'text'
        const name = fill(copy.progress.shot, { n: i + 1 })
        return (
          <li key={s.idx} className="adv2-shot">
            <div className="th">
              {s.url && isText ? (
                <img src={s.url} alt={name} />
              ) : s.url ? (
                <video src={s.url} muted playsInline preload="metadata" aria-label={name} />
              ) : (
                <span className="ph">{name}</span>
              )}
            </div>
            <span className="st" data-state={s.state}>{i + 1}. {label}</span>
          </li>
        )
      })}
    </ol>
  )
}
