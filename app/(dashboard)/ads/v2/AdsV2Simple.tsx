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

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
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
  canRedoShot, // KINEO-ADS-MELHORIAS-1410 — a MESMA regra do botão do modo completo
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
  videoFrameTimes,
  type AdsV2SimpleCopy,
} from '@/lib/ads/v2Simple'
import { adsV2AutoPauseLifts, adsV2SentenceReady } from '@/lib/ads/v2AutoPlan' // KINEO-ADS-RETESTE-1510 — "a" não é frase: não planeja (nem sozinho)
import { VideoFramesError, grabVideoFrames, pageHidden, readUserVideo } from '@/lib/ads/v2VideoFrames'
import { ADS_V2_MAX_USER_VIDEOS, ADS_V2_USER_VIDEO_MIN_SECONDS, pickLivelyStart, userVideoSampleTimes, userVideoVerdict, type AdsV2UserVideoVerdict } from '@/lib/ads/v2UserVideo'
import { NARRATION_LANGUAGES, detectNarrationLanguage, narrationLanguage, type NarrationLanguage } from '@/lib/textLanguage'
import { detectShortTextLanguage } from '@/lib/shortTextLanguage' // KINEO-ADS-CONSERTOS-TELA-1410
import { adsV2TelaConsertosCopy } from '@/lib/ads/v2TelaConsertos' // KINEO-ADS-CONSERTOS-TELA-1410
import { adsV2LinkLanguageHint, adsV2SpokenLanguage } from '@/lib/ads/v2VoiceHint' // KINEO-ADS-DEMO-UNIVERSO-1410 — a língua que o link declara (página/domínio) quando a frase não decide
import { adsV2PronounceCopy, adsV2PronounceDefaultWord, sanitizeAdsV2Pronounce } from '@/lib/ads/v2Pronounce' // KINEO-ADS-DEMO-UNIVERSO-1410 — "como pronunciar a marca" (só a voz)
import { pickInterfaceCopy, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { VariationToggle, variationsCopy, variationsPrice } from './AdsV2Variations'
import { ADS_SAMPLE_TIER, adsSampleCopy, type AdsSampleCopy } from '@/lib/ads/sample' // KINEO-ADS-AMOSTRA-2026-10-09
// KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — depois da amostra: a oferta do Business (frases nas 16 línguas, números vindos do servidor).
import { adsAfterSampleCopy, fillAfterSample, type AdsBusinessOffer } from '@/lib/ads/afterSample'
// KINEO-ESTILOS-PRODUTO-2026-10-09 — a escolha de estilo do produto (Auto + 5 efeitos), nas 16 línguas.
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC, adsV2StyleCopy, adsV2SuggestedStyle, isAdsV2Style, type AdsV2StyleChoice, type AdsV2StyleCopy } from '@/lib/ads/v2Styles'
import { AdsPresenterToggle, AdsStylePicker } from '@/components/ads/AdsStyles'
// KINEO-ATOR-ANUNCIO-2026-10-09 — o ator de IA ("Person talking about it"): interruptor e frases nas 16 línguas (lib pura).
import { ADS_V2_PRESENTER_POSTER, ADS_V2_PRESENTER_PUBLIC, adsV2PresenterById, adsV2PresenterCopy, type AdsV2PresenterCopy } from '@/lib/ads/v2Presenter'
// KINEO-ATORES-IA-2026-10-13 — o seletor de apresentadores de IA e as frases dele (a biblioteca mora em v2Presenter).
import { AdsPresenterPicker } from '@/components/ads/AdsPresenterPicker'
import { adsV2PresenterPickerCopy } from '@/lib/ads/v2PresenterLibrary'
// KINEO-ATOR-FTC-2026-10-13 — aviso de rótulo de IA na entrega (16 línguas, lib pura; não é marca d'água).
import { adsV2AiLabelNotice } from '@/lib/ads/v2AiLabel'
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
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — os consertos dos anúncios de amostra (frases nas 16 línguas + regras puras).
  ADS_V2_EDIT_DEFAULT_LIMITS,
  ADS_V2_LINK_SMALL_WIDTH,
  ADS_V2_TIER_MEMORY_KEY,
  adsV2CountWords,
  adsV2DominantColor,
  adsV2FixCopy,
  adsV2LinkHost,
  adsV2RememberTier,
  adsV2RememberedTier,
  brandKitIsOtherBrand,
  type AdsV2FixCopy,
} from '@/lib/ads/v2SimpleUx'
import { CropEditor, DropZone, MobilePreviewBar, SIMPLE_UX_CSS, TierIncludes, goToSection, type LivePreviewData } from './AdsV2SimpleUx' // KINEO-ADS-QUADRO-STUDIO-1510 — sem o SimpleStepper (o quadro curto cabe na tela)
import { QuadroStyleRow } from './AdsV2Quadro' // KINEO-ADS-QUADRO-STUDIO-1510
import { adsV2QuadroCopy } from '@/lib/ads/v2QuadroCopy' // KINEO-ADS-QUADRO-STUDIO-1510
// KINEO-ADS-CENA-2026-10-13 — o campo da cena, os 4 climas prontos, produto x lugar e a frase que pede cena (16 línguas).
// KINEO-ADS-FLUXO-2026-10-13 — o fluxo novo no formato do Studio: link primeiro + "Lemos sua página", palco do estilo, cartão de
// revisão com "Gerar · N créditos", "Comece deste" e a vaga dos 2–3 roteiros (frases nas 16 línguas, lib pura).
import { ADS_V2_AUTO_PLAN_MS, ADS_V2_SCRIPT_CHOOSE_ROUTE, adsV2FlowCopy, adsV2FlowName, adsV2ScriptOptions, adsV2StartFromRecipe, adsV2StyleTint, type AdsV2FlowCopy, type AdsV2ScriptOption } from '@/lib/ads/v2Flow' // KINEO-ADS-FLUXO-2026-10-13
import { AdsReadCard, AdsStartFromRow, AdsStyleStage, type AdsStyleStageData } from '@/components/ads/AdsFlow' // KINEO-ADS-FLUXO-2026-10-13
import { ADS_V2_SCENE_MAX_CHARS, ADS_V2_SCENE_PRESETS, adsV2AdKind, adsV2ApplyScenePreset, adsV2ProductTitle, adsV2SceneAllowed, adsV2SceneCopy, adsV2SceneErrorText, adsV2SceneIssues, adsV2SceneRow, adsV2SplitSceneRequest, sanitizeAdsV2Scene, type AdsV2AdKind, type AdsV2SceneCopy } from '@/lib/ads/v2Scene'
import { adsV2PackshotCopy } from '@/lib/ads/v2Packshot' // KINEO-ADS-MELHORIAS-1410 — o rótulo do plano com a foto real do produto
import { adsV2FormatCopy } from '@/lib/ads/v2Formats' // KINEO-ADS-MELHORIAS-1410 — as frases do formato (16 línguas)
import { ADS_V2_FORMATS, ADS_V2_FORMAT_CROP, adsV2CropRectFor, adsV2FormatBlock, type AdsV2Format } from '@/lib/ads/v2ShotLists' // KINEO-ADS-MELHORIAS-1410 — 4:5 e 1:1 em "Mais opções"
import { adsV2RedoCopy, adsV2RedoFill, type AdsV2RedoCopy } from '@/lib/ads/v2Redo' // KINEO-ADS-MELHORIAS-1410 — refazer UMA cena aqui mesmo (frases nas 16 línguas)

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
  presenter_id?: string // KINEO-ATORES-IA-2026-10-13
  narration: string | null
  overlays: { role: string; start: number; end: number; text: string }[]
  /** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — os limites da edição do texto (palavras da voz, caracteres por frase). */
  edit_limits?: { narration_words: number; overlay_chars: number }
  total_seconds: number
  shots: PlanShot[]
  /** KINEO-ADS-CENA-2026-10-13 — a cena que entrou nas cenas criadas (null = sem cena) e se o anúncio é de produto ou lugar. */
  scene?: string | null
  ad_kind?: 'product' | 'place'
  /** KINEO-ADS-FLUXO-2026-10-13 — a vaga dos 2–3 roteiros (outra pista entrega no /plan); ausente = o roteiro único de hoje. */
  scripts?: unknown
  /** KINEO-ADS-FLUXO-2026-10-13 — o roteiro em vigor ('a' = a narration/overlays desta resposta). */
  script_id?: string
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

/**
 * KINEO-ANUNCIO-CONSERTOS-2026-10-12 — prospecção de 12/10: "o primeiro texto digitado logo depois de abrir a página se perde".
 * O link e a frase moram também aqui (memória da PÁGINA, não do componente): se a sessão for montada de novo na mesma visita
 * (retomada, troca de carregamento), o que a pessoa digitou volta. "Start over" (sessão nova, resume=false) começa vazio.
 */
const typedMemory = { link: '', text: '' }

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
/**
 * KINEO-ADS-CONSERTOS-TELA-1410 — a 1ª foto do produto para o cartão final (a MESMA URL local da prévia: blob:). Pelo
 * loadLogoImage (crossOrigin antes do src quando não é blob/data). Não carregou = null: o cartão sai sem a foto, nunca quebra.
 */
async function loadCardProductPhoto(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null
  try { return await loadLogoImage(url) } catch { return null }
}

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
/** KINEO-ADS-MELHORIAS-1410 — recorte no FORMATO do anúncio (4:5 = 1080×1350, 1:1 = 1080×1080), com o mesmo ponto focal; 9:16 = cropToVertical. */
async function cropToFormat(p: Pick<SimpleItem, 'srcUrl' | 'fx' | 'fy' | 'name'>, format: AdsV2Format): Promise<File> {
  if (format === '9:16') return cropToVertical(p)
  const img = await loadImage(p.srcUrl)
  const r = adsV2CropRectFor(img.naturalWidth, img.naturalHeight, p.fx, p.fy, format)
  const { width, height } = ADS_V2_FORMAT_CROP[format]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  ctx.fillStyle = '#fff' // KINEO-ADS-MELHORIAS-1410 — o mesmo branco do cropToVertical
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, width, height)
  const blob = await canvasToBlob(canvas, ADS_V2_CROP.type, ADS_V2_CROP.quality)
  const base = (p.name || 'photo').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo'
  return new File([blob], `${base}-${format.replace(':', 'x')}.jpg`, { type: ADS_V2_CROP.type })
}
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
.adv2 .adv2s-kind{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 10px;font-size:13px;color:var(--ads-muted)}
.adv2 .adv2s-kind button{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit;font-weight:650;cursor:pointer}
.adv2 .adv2s-kind button[aria-pressed=true]{background:var(--ads-action);border-color:var(--ads-action);color:#fff}
.adv2 .adv2s-scene input{width:100%}
.adv2 .adv2s-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0 0;font-size:13px;color:var(--ads-muted)}
.adv2 .adv2s-chips button{min-height:32px;padding:4px 10px;border-radius:999px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit;cursor:pointer}
.adv2 .adv2s-chips button:hover{border-color:var(--ads-accent)}
.adv2 .adv2s-movescene{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.adv2 .adv2s-lang select{min-height:36px;padding:4px 8px;border-radius:9px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit}
.adv2 .adv2s-more{margin-top:14px;border:1px solid var(--ads-line);border-radius:14px;padding:4px 14px 14px;background:var(--ads-bg)}
.adv2 .adv2s-more summary{cursor:pointer;font-weight:650;padding:10px 0;color:var(--ads-text)}
.adv2 .adv2s-toggles{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}
/* KINEO-ADS-MELHORIAS-1410 — seletor de formato */
.adv2 .adv2s-format{border:0;padding:0;margin:4px 0 12px;min-width:0}
.adv2 .adv2s-format legend{font-weight:650;font-size:13.5px;color:var(--ads-text);padding:0;margin:0 0 8px}
.adv2 .adv2s-format .opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.adv2 .adv2s-format .opt{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-card);cursor:pointer;min-width:0}
.adv2 .adv2s-format .opt[data-on]{border-color:var(--ads-accent,#2997ff);box-shadow:0 0 0 1px var(--ads-accent,#2997ff) inset}
.adv2 .adv2s-format .opt[data-off]{opacity:.5;cursor:not-allowed}
.adv2 .adv2s-format .opt input{position:absolute;opacity:0;pointer-events:none}
.adv2 .adv2s-format .opt:has(input:focus-visible){outline:2px solid var(--ads-accent,#2997ff);outline-offset:2px}
.adv2 .adv2s-format .shape{flex:none;box-sizing:border-box;border:2px solid currentColor;border-radius:4px;color:var(--ads-muted,#8a8f98)}
.adv2 .adv2s-format .opt[data-on] .shape{color:var(--ads-accent,#2997ff)}
.adv2 .adv2s-format .txt{display:grid;gap:2px;min-width:0}
.adv2 .adv2s-format .txt b{font-size:13px}
.adv2 .adv2s-format .txt small{font-size:11.5px;color:var(--ads-muted,#8a8f98);line-height:1.3}
@media (max-width:520px){.adv2 .adv2s-format .opts{grid-template-columns:1fr}}
.adv2 .adv2s-facts{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.adv2 .adv2s-facts li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg);font-size:13.5px;line-height:1.5;min-width:0}
.adv2 .adv2s-facts input{margin-top:3px;accent-color:var(--ads-action);flex-shrink:0}
.adv2 .adv2s-facts a{font-size:12px;color:var(--ads-muted);text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.adv2 .adv2s-facts .tx{display:grid;gap:2px;min-width:0}
.adv2 .adv2s-link{margin-top:16px}
.adv2 .adv2s-linkrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.adv2 .adv2s-linkrow input{flex:1 1 220px;min-width:0}
`

// ─── KINEO-ADS-CONSERTOS-TELA-1410 — QA de 14/10 no celular (390 px) ───────────────────────────────────────────────────
// O palco/prévia vinha ANTES do formulário (order:-1 do ProductStage e do AdsFlow): o formulário começava a 1,4 tela e o
// "Gerar" a 6,7. Só nesta tela (o ProductStage é compartilhado e fica intocado): no celular o formulário vem primeiro.
// Também: a seção do resultado para abaixo da barra do topo ao rolar, o seletor de voz em destaque quando a língua não é
// clara, o aviso do cartão sem chamada e os botões Baixar/Abrir acima do player (player limitado a 60svh no celular).
const TELA_CONSERTOS_CSS = `
@media(max-width:900px){.adv2.kps-page .kps-grid>.kps-stage,.adv2.kps-page .kps-grid>.adv2s-slot,.adv2.kps-page .kps-grid>.adv2s-slot:not(:empty){order:1}}
.adv2 .adv2s-result{scroll-margin-top:76px}
.adv2 .adv2s-done-actions{margin:6px 0 14px}
@media(max-width:900px){.adv2 .adv2s-result .adv2-player{max-height:60svh}}
.adv2 .adv2s-lang:has(+ .adv2s-voiceask) select{outline:2px solid var(--ads-accent,#2997ff);outline-offset:2px}
.adv2 .adv2s-voiceask{margin:6px 0 0}
.adv2 .adv2s-nocta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0 0}
`

// ─── KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a oferta do Business depois da amostra ───────────────────────────────────
// Mostrada (1) pelo invólucro AdsV2Client NO LUGAR da sessão quando a amostra já foi usada (403 'no_access' / 402 do envio), com
// o último anúncio ENTREGUE da conta (GET /api/ads/v2/orders → /api/ads/v2/status, as mesmas rotas da tela; nada cobra nada), e
// (2) compacta, logo abaixo da amostra entregue. Os números chegam prontos do servidor (lib/businessPlan.ts businessAdsOffer);
// as frases, das 16 línguas (lib/ads/sample.ts ADS_AFTER_SAMPLE_COPY). Sem anúncio achado = só o texto (nunca um vídeo inventado).
const AFTER_SAMPLE_CSS = `
.adv2 .adv2s-after .adv2s-after-row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.adv2 .adv2s-after .adv2s-after-ad{margin:0;flex:0 0 160px;max-width:160px}
.adv2 .adv2s-after video{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px;background:#000}
.adv2 .adv2s-after .adv2s-after-label{display:block;margin-top:6px;font-size:12px;color:var(--ads-muted)}
.adv2 .adv2s-after .adv2s-after-text{flex:1 1 240px;min-width:0}
.adv2 .adv2s-after.compact{margin:18px 0 0;padding:14px;border:1px solid var(--ads-line);border-radius:14px;background:var(--ads-tint)}
.adv2 .adv2s-after.compact h3{margin:0 0 6px;font-size:15px}
`

export function AdsAfterSampleOffer({ lang, business, compact = false }: { lang: InterfaceLanguage; business: AdsBusinessOffer; compact?: boolean }) {
  const c = adsAfterSampleCopy(lang)
  const [ad, setAd] = useState<{ url: string; poster: string | null } | null>(null)
  useEffect(() => {
    if (compact) return
    let alive = true
    void (async () => {
      const list = await api<{ orders?: { id: string; status: string; video_id: string | null }[] }>('/api/ads/v2/orders')
      if (!alive || !list.ok) return
      const last = (Array.isArray(list.data.orders) ? list.data.orders : []).find((o) => o.status === 'delivered' && !!o.video_id)
      if (!last) return
      const st = await api<{ video?: { video_url: string | null; thumbnail_url: string | null } | null }>(`/api/ads/v2/status?order_id=${encodeURIComponent(last.id)}`)
      if (!alive || !st.ok || !st.data.video?.video_url) return
      setAd({ url: st.data.video.video_url, poster: st.data.video.thumbnail_url ?? null })
    })()
    return () => {
      alive = false
    }
  }, [compact])
  const text = (
    <>
      <p className="adsw-lead">{fillAfterSample(c.body, business)}</p>
      <div className="adv2-actions">
        <a className="adsw-btn" href={business.checkoutHref}>{fillAfterSample(c.cta, business)} →</a>
        <a className="adsw-link" href={business.pageHref}>{c.more} →</a>
      </div>
    </>
  )
  if (compact) {
    return (
      <div className="adv2s-after compact" data-kineo="ads-after-sample-delivered">
        <style dangerouslySetInnerHTML={{ __html: AFTER_SAMPLE_CSS }} />
        <h3>{c.title}</h3>
        {text}
      </div>
    )
  }
  return (
    <section className="adv2-card adv2s-after" aria-labelledby="adv2s-after-h" data-kineo="ads-after-sample">
      <style dangerouslySetInnerHTML={{ __html: AFTER_SAMPLE_CSS }} />
      <h2 id="adv2s-after-h">{c.title}</h2>
      <div className="adv2s-after-row">
        {ad ? (
          <div className="adv2s-after-ad">
            <video src={ad.url} poster={ad.poster ?? undefined} controls playsInline muted preload="metadata" />
            <span className="adv2s-after-label">{c.yourAd}</span>
          </div>
        ) : null}
        <div className="adv2s-after-text">{text}</div>
      </div>
    </section>
  )
}

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
  business = null,
  onSampleGone,
  rowSlot = null, // KINEO-ADS-FLUXO-2026-10-13
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
  /** KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a oferta do Business (page.tsx → AdsV2Client); só chega com a amostra. */
  business?: AdsBusinessOffer | null
  /** KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a amostra já foi usada (403 'no_access' / 402 do envio): o invólucro troca a sessão pela oferta. */
  onSampleGone?: () => void
  /** KINEO-ADS-FLUXO-2026-10-13 — a vaga embaixo do quadro (AdsV2Client) para a fileira "Comece deste"; null = sem fileira. */
  rowSlot?: HTMLElement | null
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
  const [text, setText] = useState(() => (resume ? typedMemory.text : ''))
  // KINEO-ADS-CENA-2026-10-13 — "Where does your product appear?" (opcional) e a escolha produto/lugar (null = detectada).
  const [scene, setScene] = useState('')
  const [kindChoice, setKindChoice] = useState<AdsV2AdKind | null>(null)
  // KINEO-ADS-1FOTO-LINK-2026-10-10 — o link do produto: o que está no campo, o que a rota LEU (vai ao pedido como `link`,
  // fonte do roteiro) e o aviso da leitura. Link sem foto não planeja: a regra de "pelo menos 1 foto" fica em `missing`.
  const [link, setLink] = useState(() => (resume ? typedMemory.link : ''))
  const [linkRead, setLinkRead] = useState<string | null>(null)
  const [linkLang, setLinkLang] = useState<string | null>(null) // KINEO-ADS-DEMO-UNIVERSO-1410 — o <html lang> da página lida (a rota /link-import já devolvia; a tela ignorava)
  const [pronWord, setPronWord] = useState('') // KINEO-ADS-DEMO-UNIVERSO-1410 — o nome da marca como está escrito (vazio = o título do cartão até o travessão)
  const [pronSay, setPronSay] = useState('') // KINEO-ADS-DEMO-UNIVERSO-1410 — como a voz fala (vazio = sem troca)
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkNote, setLinkNote] = useState<{ warn: boolean; text: string } | null>(null)
  // KINEO-SHOPIFY-2026-10-13 — /ads/v2?from=shopify&link=… (o botão "Make a 15-second ad" do app da Shopify, via /shopify/open):
  // o link do produto entra no campo e as fotos são lidas UMA vez, pelo mesmo importLink do botão. Sem from=shopify, nada muda.
  const shopifyLinkDone = useRef(false)
  useEffect(() => {
    if (resume || shopifyLinkDone.current) return
    shopifyLinkDone.current = true
    let raw = ''
    try {
      const qs = new URLSearchParams(window.location.search)
      raw = qs.get('from') === 'shopify' ? (qs.get('link') ?? '').trim() : ''
    } catch {
      raw = ''
    }
    if (!/^https:\/\/\S{4,490}$/.test(raw)) return
    setLink(raw)
    void importLink(raw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [tier, setTier] = useState<AdsV2Tier | null>(sample ? ADS_SAMPLE_TIER : null)
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — null = segue a sugestão do setor; a pessoa escolheu = vale a escolha dela.
  const [styleChoice, setStyleChoice] = useState<AdsV2StyleChoice | null>(null)
  // KINEO-TRENDING-2026-10-13 — /ads/v2?style=<chave> (o "Make mine" do /trending) abre com o estilo já marcado. Só chave do
  // catálogo (isAdsV2Style) e só com os estilos ligados; qualquer outra coisa é ignorada e a tela segue a sugestão do setor.
  useEffect(() => {
    if (!ADS_V2_STYLES_PUBLIC) return
    let wanted: string | null = null
    try {
      wanted = new URLSearchParams(window.location.search).get('style')
    } catch {
      wanted = null
    }
    if (isAdsV2Style(wanted)) setStyleChoice(wanted)
  }, [])
  // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator começa desligado (a pessoa liga; nada muda para quem não liga).
  const [presenterChoice, setPresenterChoice] = useState(false)
  // KINEO-ADS-MELHORIAS-1410 — o formato escolhido em "Mais opções" (9:16 = o de sempre). Fora do 9:16 o estilo e o ator ficam de fora (só verticais).
  const [formatChoice, setFormatChoice] = useState<AdsV2Format>('9:16')
  // KINEO-ADS-MELHORIAS-1410 — estilo e ator são só verticais: escolher um estilo (seletor completo ou a fileira do quadro) ou ligar o ator volta o
  // KINEO-ADS-MELHORIAS-1410 — formato ao 9:16; escolher 4:5/1:1 tira o estilo e desliga o ator (o seletor de formato faz isso no clique).
  const formatSeenRef = useRef<{ style: AdsV2StyleChoice | null; presenter: boolean }>({ style: null, presenter: false }) // KINEO-ADS-MELHORIAS-1410
  useEffect(() => { // KINEO-ADS-MELHORIAS-1410
    const seen = formatSeenRef.current // KINEO-ADS-MELHORIAS-1410
    const picked = (styleChoice !== seen.style && !!styleChoice && styleChoice !== 'none') || (presenterChoice && !seen.presenter) // KINEO-ADS-MELHORIAS-1410
    formatSeenRef.current = { style: styleChoice, presenter: presenterChoice } // KINEO-ADS-MELHORIAS-1410
    if (picked) setFormatChoice('9:16') // KINEO-ADS-MELHORIAS-1410
  }, [styleChoice, presenterChoice]) // KINEO-ADS-MELHORIAS-1410
  // KINEO-ATORES-IA-2026-10-13 — o apresentador escolhido na biblioteca (null = "Surprise me", o sorteio de sempre).
  const [presenterPick, setPresenterPick] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [contact, setContact] = useState('')
  const [overlaysOn, setOverlaysOn] = useState(true)
  const [narrationOn, setNarrationOn] = useState(true)
  const [voiceLang, setVoiceLang] = useState<NarrationLanguage | null>(null)
  // KINEO-ADS-CONSERTOS-TELA-1410 — a língua do navegador é só uma PISTA (lida depois de montar, sem divergir do servidor).
  const [browserLang, setBrowserLang] = useState<NarrationLanguage | null>(null)
  useEffect(() => {
    try { setBrowserLang(narrationLanguage(String(navigator.language || '').slice(0, 2))) } catch { /* sem navigator */ }
  }, [])
  const contactInputRef = useRef<HTMLInputElement | null>(null) // KINEO-ADS-CONSERTOS-TELA-1410 — o aviso "sem chamada" leva ao campo
  const [cardTitle, setCardTitle] = useState('')
  const [cardColor, setCardColor] = useState(DEFAULT_COLOR)
  const [logo, setLogo] = useState<LogoItem | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  // KINEO-ADS-QUADRO-STUDIO-1510 — os cartões recolhidos do quadro (todos os estilos, nível, voz). Só tela: nada disso entra em pedido.
  const [stylesOpen, setStylesOpen] = useState(false) // KINEO-ADS-QUADRO-STUDIO-1510 — "Ver todos os N"
  const [levelOpen, setLevelOpen] = useState<boolean | null>(null) // KINEO-ADS-QUADRO-STUDIO-1510 — null = abre sozinho só sem nível marcado
  const [voiceOpen, setVoiceOpen] = useState<boolean | null>(null) // KINEO-ADS-QUADRO-STUDIO-1510 — null = abre sozinho só com a língua incerta
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
  // KINEO-ADS-MELHORIAS-1410 — refazer UMA cena no modo simples (a rota /api/ads/v2/retake de sempre: preço mostrado antes, débito
  // idempotente, estorno se falhar, um pedido ativo por conta). Estado próprio: não passa pelo `busy` do plano/início.
  const [redoAsk, setRedoAsk] = useState<number | null>(null)
  const [redoBusy, setRedoBusy] = useState(false)
  const [redoError, setRedoError] = useState<string | null>(null)
  const [redoNote, setRedoNote] = useState<string | null>(null)
  const rcopy = adsV2RedoCopy(lang)
  const [downloading, setDownloading] = useState(false)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const [notReady, setNotReady] = useState(false)
  // KINEO-ADS-UX-MARCA-2026-10-10 — frases novas (16 línguas), reordenar por arrasto, editor de enquadramento, a imagem do
  // cartão final para a prévia ao vivo e o kit da marca (aplicado na abertura; salvo depois que o anúncio começou).
  const ux: AdsV2UxCopy = adsV2UxCopy(lang)
  const qc = adsV2QuadroCopy(lang) // KINEO-ADS-QUADRO-STUDIO-1510
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null)
  const [kitApplied, setKitApplied] = useState<AdsBrandKit | null>(null)
  const [saveKit, setSaveKit] = useState(false) // KINEO-ADS-DEMO-UNIVERSO-1410 — era true: o kit salvo sem querer contaminava o anúncio seguinte (demo de 14/10). Só o clique da pessoa marca.
  const tierAutoRef = useRef(false)
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — os consertos dos anúncios de amostra (12/10): frases novas, o nome do kit salvo (o
  // "Save as my brand kit" desmarca sozinho para OUTRA marca; o clique da pessoa manda), a cor da foto do produto para o
  // cartão final, os campos lidos do DOM e a edição do texto do plano (grátis, sem o modelo).
  const fix: AdsV2FixCopy = adsV2FixCopy(lang)
  const [kitBusiness, setKitBusiness] = useState<string | null>(null)
  const saveKitTouchedRef = useRef(false)
  const [photoColor, setPhotoColor] = useState<string | null>(null)
  const linkInputRef = useRef<HTMLInputElement | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [copyEdit, setCopyEdit] = useState<{ narration: string; overlays: string[] } | null>(null)
  const [copyBusy, setCopyBusy] = useState(false)
  const [copyNote, setCopyNote] = useState<{ warn: boolean; text: string } | null>(null)
  // KINEO-ADS-FLUXO-2026-10-13 — o fluxo novo: frases (16 línguas), o que a página do link DISSE (cartão "Lemos sua página"),
  // o aviso do "Comece deste", o roteiro escolhido (quando o /plan trouxer 2–3) e o botão principal do cartão de revisão
  // (a barra do celular só repassa o clique a ele: o débito continua tendo uma porta só).
  const fc: AdsV2FlowCopy = adsV2FlowCopy(lang)
  const [linkFacts, setLinkFacts] = useState<{ host: string; priceFound: boolean } | null>(null)
  const [startNote, setStartNote] = useState<string | null>(null)
  const [scriptPick, setScriptPick] = useState<string | null>(null)
  const goBtnRef = useRef<HTMLButtonElement | null>(null)
  // KINEO-ADS-FLUXO-2026-10-13 — roteiro automático (sem o botão "Descobrir e planejar"): a última assinatura tentada sozinha
  // (nunca planeja de novo sem mudança de verdade) e a pausa depois de uma falha (teto diário, moderação…) até o clique manual.
  const [autoPaused, setAutoPaused] = useState(false)
  const autoRef = useRef<{ sig: string | null; running: boolean }>({ sig: null, running: false })
  useEffect(() => { setScriptPick(null) }, [plan?.order_id, plan?.sig]) // KINEO-ADS-FLUXO-2026-10-13 — plano novo = roteiros novos
  useEffect(() => { // KINEO-ADS-FLUXO-2026-10-13 — o aviso do "Comece deste" some sozinho
    if (!startNote) return
    const t = window.setTimeout(() => setStartNote(null), 6000)
    return () => window.clearTimeout(t)
  }, [startNote])

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
  // KINEO-ADS-CONSERTOS-TELA-1410 — a frase também vai: a palavra do produto refina a sugestão do setor (perfume → close-up).
  const styleSuggested: AdsV2StyleChoice = sentence && sector !== 'other' ? adsV2SuggestedStyle(sector, sentence) : 'none'
  const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC && formatChoice === '9:16' ? styleChoice ?? styleSuggested : 'none' // KINEO-ADS-MELHORIAS-1410 — estilo só em 9:16 (o efeito não tem outro formato)
  // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator fala a narração e segura O produto: sem voz ou com fotos de tela ('text'), o
  // cartão fica desligado com o motivo. Ligado, a 1ª foto também vai como produto (é ela que o ator segura).
  const presenterCopy: AdsV2PresenterCopy = adsV2PresenterCopy(lang)
  const fcopy = adsV2FormatCopy(lang) // KINEO-ADS-MELHORIAS-1410
  const presenterWhy: string | null = !narrationOn ? presenterCopy.needsVoice : photoKind === 'text' ? presenterCopy.needsProduct : null
  const presenterOn = ADS_V2_PRESENTER_PUBLIC && presenterChoice && presenterWhy === null
  const firstAsProduct = style !== 'none' && photoKind !== 'text' || presenterOn
  // KINEO-ADS-MELHORIAS-1410 — o formato que vai ao /plan: o escolhido, menos o 4:5 no Premium (o close-herói do Seedance não tem 4:5 — a tela diz).
  const format: AdsV2Format = adsV2FormatBlock({ format: formatChoice, tier, style: null, presenter: false }) ? '9:16' : formatChoice
  const detected = detectNarrationLanguage(sentence).language
  // KINEO-ADS-CONSERTOS-TELA-1410 — QA 14/10: "perfume num hotel com chuva" (5 palavras) saía com voz em inglês. Depois do
  // detector de sempre (null abaixo de 8 palavras — régua dos filmes, intocada), o da FRASE CURTA; só então a interface.
  // A CENA conta junto: depois de "Mover para o campo de cena" a frase vira só "Perfume" e a língua ("num hotel com chuva") mora na cena.
  const shortLang = detected ? null : detectShortTextLanguage(`${sentence} ${scene}`)
  const linkLangHint = adsV2LinkLanguageHint(linkLang, linkRead ?? (link.trim() || null)) // KINEO-ADS-DEMO-UNIVERSO-1410 — <html lang> da página lida, senão o domínio (.br → pt)
  const spoken: NarrationLanguage = adsV2SpokenLanguage({ chosen: voiceLang, detected, short: shortLang, text: `${sentence} ${scene}`, hint: linkLangHint, ui: lang }) // KINEO-ADS-DEMO-UNIVERSO-1410 — escolha → detector de sempre → frase curta → desempate pt×es → o LINK → interface → inglês
  /** Ninguém tem certeza da língua da frase: a linha ao lado do seletor "Voz em" diz em que língua a voz vai sair. */
  const voiceUnsure = !!sentence && narrationOn && voiceLang === null && !detected && !shortLang && browserLang !== spoken
  const tc = adsV2TelaConsertosCopy(lang) // KINEO-ADS-CONSERTOS-TELA-1410
  // KINEO-ADS-CENA-2026-10-13 — produto x lugar (a pergunta, o exemplo e a pesquisa mudam) e a CENA: o campo, ou a parte da
  // frase que pede cena ("…num hotel com uma chuva"), só em Comercial/Premium. A frase que pede cena nunca vira o título.
  const sc: AdsV2SceneCopy = adsV2SceneCopy(lang)
  const adKind: AdsV2AdKind = kindChoice ?? adsV2AdKind(sentence)
  const textAsk = adKind === 'product' ? sc.product : sc.place
  const sceneSplit = adKind === 'product' ? adsV2SplitSceneRequest(sentence) : { product: '', scene: null }
  const sceneTyped = sanitizeAdsV2Scene(scene)
  const sceneTierOk = tier === null || adsV2SceneAllowed(tier)
  const sceneFinal = adKind === 'product' && tier !== null && adsV2SceneAllowed(tier) ? sceneTyped || sceneSplit.scene || '' : ''
  const sceneProblem = adKind === 'product' && sceneTierOk ? adsV2SceneIssues(sceneTyped || sceneSplit.scene || '')[0] ?? null : null
  const cardTitleFinal = cardTitle.trim() || adsV2ProductTitle(sentence, adKind)
  const pcopy = adsV2PronounceCopy(lang) // KINEO-ADS-DEMO-UNIVERSO-1410
  const pronWordDefault = adsV2PronounceDefaultWord(cardTitleFinal) // KINEO-ADS-DEMO-UNIVERSO-1410
  const pronounce = narrationOn ? sanitizeAdsV2Pronounce({ word: pronWord.trim() || pronWordDefault, say: pronSay }) : null // KINEO-ADS-DEMO-UNIVERSO-1410 — só com voz; null = narração de sempre
  const cost = tier ? adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) : null
  const inAd = items.slice(0, ADS_V2_SIMPLE_MAX_IN_AD)
  const priceT = price.replace(/\s+/g, ' ').trim()
  const contactT = contact.replace(/\s+/g, ' ').trim()
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o cartão final sem kit deixa de ser o azul genérico: a cor da foto do produto (cor
  // escolhida pela pessoa ou pelo kit = vale a dela), fundo na cor da marca, e o site do link LIDO como contato quando a
  // pessoa não escreveu nenhum ("Buy now" + o domínio que ela mesma colou). Sem link e sem contato = sem botão (nada inventado).
  const cardAccent = cardColor !== DEFAULT_COLOR ? cardColor : photoColor ?? DEFAULT_COLOR
  const linkHost = adsV2LinkHost(linkRead)
  const cardContact = contactT || linkHost
  const cardCta = contactT ? endCardCtaLabel(simpleCtaKind(contactT), spoken) : linkHost ? endCardCtaLabel('buy', spoken) : ''
  const otherBrand = brandKitIsOtherBrand(kitBusiness, cardTitleFinal, sentence)
  const firstPhotoUrl = items.slice(0, ADS_V2_SIMPLE_MAX_IN_AD).find((p) => !p.video)?.srcUrl ?? null

  /** Chave do rascunho: mudou texto, preço, contato, frases, voz, língua ou nível = rascunho novo (a pesquisa é copiada). */
  const draftKey = JSON.stringify({ text: sentence, scene: sceneFinal, kind: adKind, price: priceT, contact: contactT, overlays: overlaysOn, voice: narrationOn, lang: spoken, tier, link: linkRead, ...(pronounce ? { pronounce } : {}) }) // KINEO-ADS-DEMO-UNIVERSO-1410 — mudou a pronúncia = rascunho novo
  const baseSig = JSON.stringify({ draftKey, sector, presenter: presenterOn, items: inAd.map((p) => [p.key, focalSig(p)]), style, ...(presenterOn && presenterPick ? { presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }) // KINEO-ADS-MELHORIAS-1410 — outro formato = planejar de novo
  // A marca de um fato é presa ao CONTEÚDO (fonte + texto), nunca ao id f1..f6: uma pesquisa nova tem outro f1 e não herda
  // a marca do anterior; a mesma pesquisa copiada para um rascunho novo (troca de nível) mantém a marca.
  const factKey = (f: Fact) => JSON.stringify([f.url, f.text])
  const isFactOn = (f: Fact) => factOn[factKey(f)] ?? ADS_V2_SIMPLE_FACTS_DEFAULT_ON
  // Erro de envio na língua da tela (a lib de envio só fala inglês).
  const uploadError = (e: unknown, fallback: string) => (e instanceof AdsUploadError ? simpleUploadErrorMessage(e.reason, lang) ?? e.message : fallback)
  // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — quem entrou pela amostra e já a usou recebe 403 'no_access' (rotas do v2) ou 402
  // 'paid_feature' (envio de foto): em vez do erro genérico, o invólucro mostra a oferta do Business. Assinante/passe/interna
  // nunca entram com sample=true, então o caminho pago não passa por aqui.
  const sampleGone = (code: string | null | undefined): boolean => {
    if (!sample || code !== 'no_access') return false
    onSampleGone?.()
    return true
  }
  const failText = (r: { code: string; body: Record<string, unknown> }): string | null => (sampleGone(r.code) ? null : errorText(lang, r))
  const uploadGone = (e: unknown): boolean => (e instanceof AdsUploadError && e.reason === 'paid_feature' ? sampleGone('no_access') : false)
  const acopy = adsAfterSampleCopy(lang)
  const factsNow = research && draft && research.orderId === draft.id ? research.facts : []
  const planSig = JSON.stringify({ base: baseSig, facts: factsNow.filter((f) => isFactOn(f)).map((f) => f.id) })
  // KINEO-ADS-CONSERTOS-TELA-1410 — a 1ª foto entra no cartão final: trocou a foto = cartão novo.
  const cardSig = JSON.stringify({ title: cardTitleFinal, price: priceT, contact: cardContact, cta: cardCta, color: cardAccent, logo: logo?.footageId ?? null, lang: spoken, photo: firstPhotoUrl })
  const planFresh = !!plan && plan.sig === planSig

  const missing: string[] = []
  // KINEO-ADS-1FOTO-LINK-2026-10-10 — 1 foto basta; link sem foto NÃO planeja (a frase pede a foto nas 16 línguas).
  if (inAd.length < ADS_V2_SIMPLE_MIN_IN_AD) missing.push(fill(lcopy.needPhoto, { n: ADS_V2_SIMPLE_MIN_IN_AD - inAd.length, min: ADS_V2_SIMPLE_MIN_IN_AD, max: ADS_V2_SIMPLE_MAX_IN_AD }))
  if (linkBusy) missing.push(lcopy.linkReading)
  // O vídeo ocupa vaga de foto, mas o plano precisa de pelo menos 1 foto (referência das cenas criadas).
  if (inAd.length > 0 && inAd.every((p) => p.video)) missing.push(copy.plan.needPhoto)
  if (!adsV2SentenceReady(sentence)) missing.push(copy.plan.needText) // KINEO-ADS-RETESTE-1510 — era `!sentence`: "a" planejava e voltava "We could not tell which business this is"
  if (sceneProblem) missing.push(adsV2SceneErrorText(sceneProblem, lang) ?? sc.errors.bad_scene) // KINEO-ADS-CENA-2026-10-13 — cena com alegação/depoimento não planeja
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

  // KINEO-ADS-MELHORIAS-1410 — "Refazer esta cena": manda o preço que a tela MOSTROU (expected_credits); preço mudou = 409 e a
  // grade relê o pedido (o botão passa a mostrar o novo). Aceita = a refação vira o pedido da tela (progresso → anúncio novo).
  async function redoShot(shot: AdsV2ScreenShot) {
    if (!order || redoBusy || !canRedoShot(shot, order.status)) return
    setRedoBusy(true)
    setRedoError(null)
    const parent = order.order_id
    onActive(true)
    const r = await api<StatusView>('/api/ads/v2/retake', { method: 'POST', body: { order_id: parent, idx: shot.idx, expected_credits: shot.retake_credits } })
    if (!aliveRef.current) return
    setRedoBusy(false)
    if (!r.ok) {
      onActive(false)
      setRedoError(failText(r))
      if (r.code === 'price_changed') void pollOnce(parent)
      void onBalance()
      return
    }
    setRedoAsk(null)
    setVideo(null)
    setRedoNote(adsV2RedoFill(rcopy.note, { n: order.shots.findIndex((x) => x.idx === shot.idx) + 1 }))
    void onBalance()
    adoptOrder({ ...r.data, shots: Array.isArray(r.data.shots) ? r.data.shots : [] })
  }

  function openOrder(id: string) {
    if (!aliveRef.current) return
    currentOrderRef.current = id
    setOrderParam(id)
    setPollNote(null)
    setRedoNote(null) // KINEO-ADS-MELHORIAS-1410
    setRedoError(null) // KINEO-ADS-MELHORIAS-1410
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
  // KINEO-ADS-CONSERTOS-TELA-1410 — pronto ou falhou: a seção do resultado sobe para o topo da tela (no celular ficava abaixo da dobra).
  useEffect(() => {
    if (phase !== 'delivered' && phase !== 'failed') return
    const t = window.setTimeout(() => {
      try { headingRef.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) } catch { /* navegador antigo */ }
    }, 60)
    return () => window.clearTimeout(t)
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
      const productImage = await loadCardProductPhoto(firstPhotoUrl) // KINEO-ADS-CONSERTOS-TELA-1410
      if (stop) return
      try {
        drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: cardCta, contact: cardContact, accent: cardAccent, brandBg: true, productImage })
      } catch {
        /* navegador sem canvas: a prévia fica vazia */
      }
    })()
    return () => {
      stop = true
    }
  }, [phase, moreOpen, logo?.localUrl, cardTitleFinal, priceT, cardContact, cardCta, cardAccent, spoken, firstPhotoUrl])

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
        const productImage = await loadCardProductPhoto(firstPhotoUrl) // KINEO-ADS-CONSERTOS-TELA-1410
        if (stop) return
        try {
          const canvas = document.createElement('canvas')
          drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: cardCta, contact: cardContact, accent: cardAccent, brandBg: true, productImage })
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
  }, [phase, logo?.localUrl, cardTitleFinal, priceT, cardContact, cardCta, cardAccent, spoken, firstPhotoUrl])

  // KINEO-ADS-UX-MARCA-2026-10-10 — nível já marcado pelo saldo (uma vez, quando o saldo chega; a escolha da pessoa manda
  // sempre). Na amostra o nível é o dela. Marcar não cobra: o débito segue só no botão "Make my ad".
  useEffect(() => {
    if (tierAutoRef.current || sample || tier !== null) return
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o nível escolhido da última vez (lembrado neste navegador) vem antes do saldo:
    // quem faz vários anúncios no Standard não troca de novo a cada um. Leitura que falha = a regra do saldo.
    const remembered = adsV2RememberedTier(() => window.localStorage.getItem(ADS_V2_TIER_MEMORY_KEY))
    if (remembered) {
      tierAutoRef.current = true
      setTier(remembered)
      return
    }
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
      setKitBusiness(typeof kit.business === 'string' && kit.business.trim() ? kit.business : null) // KINEO-ANUNCIO-CONSERTOS-2026-10-12
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

  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — "Save as my brand kit" NÃO vem marcado quando já existe um kit com OUTRO nome de marca
  // (prospecção de 12/10: quem anuncia para várias marcas sobrescrevia o próprio kit sem perceber). O clique da pessoa manda.
  useEffect(() => {
    if (saveKitTouchedRef.current) return
    if (otherBrand) setSaveKit(false) // KINEO-ADS-DEMO-UNIVERSO-1410 — nunca marca sozinho (era setSaveKit(!otherBrand))
  }, [otherBrand])

  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a cor dominante da 1ª foto (o produto), para o cartão final sem kit. Foto local
  // (blob:), sem rede; navegador sem canvas = a cor de sempre.
  useEffect(() => {
    if (!firstPhotoUrl) {
      setPhotoColor(null)
      return
    }
    let stop = false
    void (async () => {
      try {
        const img = await loadImage(firstPhotoUrl)
        if (stop) return
        const c = document.createElement('canvas')
        c.width = 48
        c.height = 48
        const ctx = c.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings)
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 48, 48)
        const col = adsV2DominantColor(ctx.getImageData(0, 0, 48, 48).data)
        if (!stop && aliveRef.current) setPhotoColor(col)
      } catch {
        if (!stop && aliveRef.current) setPhotoColor(null)
      }
    })()
    return () => {
      stop = true
    }
  }, [firstPhotoUrl])

  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o que foi digitado fica na memória da página (typedMemory) e, ao abrir o formulário,
  // o que já estiver escrito NOS CAMPOS (digitado antes do React assumir) é adotado em vez de apagado.
  useEffect(() => {
    typedMemory.link = link
    typedMemory.text = text
  }, [link, text])
  useEffect(() => {
    if (phase !== 'build') return
    const domLink = linkInputRef.current?.value ?? ''
    const domText = textAreaRef.current?.value ?? ''
    if (domLink && !link) setLink(domLink)
    if (domText && !text) setText(domText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — "Get photos" com o campo vazio avisava nada; agora diz o que fazer.
    if (!url) {
      setLinkNote({ warn: true, text: fix.linkEmpty })
      linkInputRef.current?.focus()
      return
    }
    if (linkBusy || busy !== null) return
    setLinkBusy(true)
    setLinkNote(null)
    setLinkFacts(null) // KINEO-ADS-FLUXO-2026-10-13
    try {
      const r = await api<{ link?: string; host?: string; sentence?: string; title?: string; price?: string | null; images?: { footage_id: string; url: string }[] }>('/api/ads/v2/link-import', { method: 'POST', body: { url } })
      if (!aliveRef.current) return
      if (!r.ok) {
        if (sampleGone(r.code)) return // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
        setLinkNote({ warn: true, text: r.code.startsWith('moderation') || r.code === 'no_access' || r.code === 'closed' ? errorText(lang, r) : r.code === 'link_unreachable' && r.body.why === 'blocked' ? fix.linkBlocked : r.code === 'link_unreachable' && r.body.why === 'not_found' ? fix.linkNotFound : adsV2LinkImportError(r.code, lcopy) }) // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o porquê da página que não abriu (bloqueou / não existe)
        return
      }
      const host = typeof r.data.host === 'string' ? r.data.host : ''
      setLinkRead(typeof r.data.link === 'string' && r.data.link ? r.data.link : null)
      setLinkLang(typeof (r.data as { lang?: unknown }).lang === 'string' ? String((r.data as { lang?: unknown }).lang) : null) // KINEO-ADS-DEMO-UNIVERSO-1410
      const suggested = typeof r.data.sentence === 'string' ? r.data.sentence.trim() : ''
      if (suggested) setText((cur) => (cur.trim() ? cur : suggested))
      // KINEO-ADS-FLUXO-2026-10-13 — "Lemos sua página": o nome e o preço que a página DIZ entram só no campo vazio (o cartão deixa corrigir).
      const pageName = adsV2FlowName(r.data.title) // KINEO-ADS-FLUXO-2026-10-13
      const pagePrice = typeof r.data.price === 'string' ? r.data.price.replace(/\s+/g, ' ').trim().slice(0, 60) : '' // KINEO-ADS-FLUXO-2026-10-13
      if (pageName) setCardTitle((cur) => (cur.trim() ? cur : pageName)) // KINEO-ADS-FLUXO-2026-10-13
      if (pagePrice) setPrice((cur) => (cur.trim() ? cur : pagePrice)) // KINEO-ADS-FLUXO-2026-10-13
      setLinkFacts({ host: host || url, priceFound: !!pagePrice }) // KINEO-ADS-FLUXO-2026-10-13
      const added: SimpleItem[] = []
      const list = Array.isArray(r.data.images) ? r.data.images.slice(0, ADS_V2_LINK_IMPORT_MAX_IMAGES) : []
      for (const [i, im] of list.entries()) {
        try {
          const res = await fetch(im.url, { cache: 'no-store' })
          if (!res.ok) continue
          const blob = await res.blob()
          const png = blob.type === 'image/png' || /\.png(\?|$)/i.test(im.url)
          // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — WebP chega embutido (data:): o navegador o lê e o recorte 9:16 sobe como JPG.
          const webp = blob.type === 'image/webp' || /^data:image\/webp/i.test(im.url)
          const f = new File([blob], `${(host || 'product').replace(/[^\w-]+/g, '-')}-${i + 1}.${webp ? 'webp' : png ? 'png' : 'jpg'}`, { type: webp ? 'image/webp' : png ? 'image/png' : 'image/jpeg' })
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

  /**
   * KINEO-ADS-FLUXO-2026-10-13 — o botão "Colar" da caixa do link: lê a área de transferência e segue pelo MESMO importLink
   * (o colar no campo continua funcionando igual). Navegador que bloqueia a leitura = o aviso de colar à mão.
   */
  async function pasteLink() {
    if (linkBusy || busy !== null) return
    let raw = ''
    try {
      raw = (await navigator.clipboard.readText()).trim()
    } catch {
      raw = ''
    }
    if (!aliveRef.current) return
    if (!raw) {
      setLinkNote({ warn: true, text: fc.link.pasteFail })
      linkInputRef.current?.focus()
      return
    }
    setLink(raw)
    void importLink(raw)
  }

  /**
   * KINEO-ADS-FLUXO-2026-10-13 — "Comece deste": o anúncio da casa copia SÓ o estilo, a cena (o clima pronto, nas 16 línguas) e a
   * pessoa. Fotos, texto, link, preço, nível e quadro final ficam como estão — nada aqui chama rota.
   */
  function startFrom(id: string) {
    const rec = adsV2StartFromRecipe(id)
    if (!rec || busy !== null) return
    setStyleChoice(rec.style)
    setKindChoice('product')
    setScene(rec.scene ? sc.presets[rec.scene].text : '')
    setPresenterChoice(rec.presenter !== null)
    setPresenterPick(rec.presenter)
    setStartNote(fc.start.applied)
    window.setTimeout(() => goToSection('adv2s-sec3'), 30)
  }

  /**
   * KINEO-ADS-FLUXO-2026-10-13 — os 2–3 roteiros (contrato codex/ads-roteiros-1310): escolher = POST /api/ads/v2/plan/choose
   * { order_id, script_id } (grátis; não cobra nem planeja de novo). A narração e as frases que VOLTAM passam a ser as do plano
   * — a edição de texto (PATCH /orders) parte delas. 400/404/409 = o aviso de sempre, o roteiro anterior fica.
   */
  async function chooseScript(opt: AdsV2ScriptOption) {
    if (!plan || busy !== null || copyBusy || copyEdit) return
    if (opt.key === (scriptPick ?? plan.script_id ?? 'a')) return
    const id = plan.order_id
    setCopyBusy(true)
    setCopyNote(null)
    try {
      const r = await api<{ script_id?: string; narration?: string | null; overlays?: Plan['overlays']; credits?: number }>(ADS_V2_SCRIPT_CHOOSE_ROUTE, { method: 'POST', body: { order_id: id, script_id: opt.key } })
      if (!aliveRef.current) return
      if (!r.ok) {
        setCopyNote({ warn: true, text: failText(r) ?? '' })
        return
      }
      const chosen = typeof r.data.script_id === 'string' ? r.data.script_id : opt.key
      setScriptPick(chosen)
      setPlan((cur) => (cur && cur.order_id === id ? {
        ...cur,
        script_id: chosen,
        narration: typeof r.data.narration === 'string' || r.data.narration === null ? r.data.narration : cur.narration,
        overlays: Array.isArray(r.data.overlays) ? r.data.overlays : cur.overlays,
        credits: typeof r.data.credits === 'number' ? r.data.credits : cur.credits,
      } : cur))
    } finally {
      if (aliveRef.current) setCopyBusy(false)
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
      if (uploadGone(e)) return // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
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
      const sig = uploadSig(p) + (format !== '9:16' && !p.video ? `@${format}` : '') // KINEO-ADS-MELHORIAS-1410 — outro formato = recortar e subir de novo
      if (p.uploaded && p.uploaded.sig === sig) {
        push(p, p.uploaded.footageId)
        continue
      }
      setBusyNote(fill(copy.plan.noteUpload, { i: n, n: inAd.length }))
      updateItem(p.key, { busy: true, error: null })
      try {
        const file = p.video ? p.video.file : await cropToFormat(p, format) // KINEO-ADS-MELHORIAS-1410 — 9:16 = cropToVertical (o de sempre)
        const up = await uploadFootage(file)
        if (!aliveRef.current) return null
        updateItem(p.key, { busy: false, uploaded: { sig, footageId: up.footageId } })
        push(p, up.footageId)
      } catch (e) {
        if (!aliveRef.current) return null
        if (uploadGone(e)) return null // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
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
      const productImage = await loadCardProductPhoto(firstPhotoUrl) // KINEO-ADS-CONSERTOS-TELA-1410 — a foto real no cartão
      const canvas = document.createElement('canvas')
      drawEndCard(canvas, { logo: img, business: cardTitleFinal, offer: priceT, ctaLabel: cardCta, contact: cardContact, accent: cardAccent, brandBg: true, productImage })
      const file = await toPngFile(canvas)
      const up = await uploadFootage(file)
      if (!aliveRef.current) return null
      const done = { sig: cardSig, footageId: up.footageId }
      setCardUpload(done)
      return done
    } catch (e) {
      if (!aliveRef.current) return null
      if (uploadGone(e)) return null // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
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
        // KINEO-ADS-CENA-2026-10-13 — a cena (só Comercial/Premium; o servidor limpa, confere e modera de novo) e produto/lugar.
        scene: sceneFinal || null,
        kind: adKind,
        ...(pronounce ? { pronounce } : {}), // KINEO-ADS-DEMO-UNIVERSO-1410 — vai para brief.pronounce; o servidor limpa e confere de novo
      },
    })
    if (!aliveRef.current) return null
    if (!r.ok) {
      if (r.code === 'not_ready') setNotReady(true)
      if (adsV2SceneErrorText(r.code, lang)) { setPlanError(adsV2SceneErrorText(r.code, lang)); return null } // KINEO-ADS-CENA-2026-10-13
      setPlanError(failText(r)) // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
      return null
    }
    setDraft({ id: r.data.order_id, key: draftKey })
    return r.data.order_id
  }

  /** Pesquisa (grátis para o cliente): uma por rascunho; o servidor devolve a gravada/copiada sem pesquisar de novo. */
  async function ensureResearch(orderId: string): Promise<Fact[]> {
    if (research && research.orderId === orderId) return research.facts
    setBusyNote(adKind === 'product' ? sc.research.noteProduct : copy.plan.noteResearch) // KINEO-ADS-CENA-2026-10-13 — produto lê só a página dele
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await api<{ status: string; facts?: Fact[]; why?: string }>('/api/ads/v2/research', { method: 'POST', body: { order_id: orderId } })
      if (!aliveRef.current) return []
      if (r.ok && r.data.status === 'running') {
        await new Promise((res) => window.setTimeout(res, 4000))
        if (!aliveRef.current) return []
        continue
      }
      const facts = r.ok && r.data.status === 'ok' && Array.isArray(r.data.facts) ? r.data.facts : []
      setResearch({ orderId, status: facts.length ? 'ok' : 'failed', facts })
      setFactsNote(facts.length ? null : r.ok ? copy.plan.factsNone : errorText(lang, r))
      // KINEO-ADS-CENA-2026-10-13 — produto sem link: nada da web (nunca outras marcas); a tela pede o link do produto.
      if (!facts.length && r.ok && (r.data.why === 'product_no_link' || (adKind === 'product' && !linkRead))) setFactsNote(sc.research.productNoLink)
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
        body: { mode: 'simple', order_id: orderId, sector, logo_footage_id: logo?.footageId ?? null, ...(presenterOn ? { presenter: true } : {}), photos: uploaded, videos, card_footage_id: card.footageId, facts: chosen, ...(style !== 'none' ? { style } : {}), ...(presenterOn && presenterPick ? { presenter_id: presenterPick } : {}), ...(format !== '9:16' ? { format } : {}) }, // KINEO-ADS-MELHORIAS-1410 — o formato só fora do 9:16
      })
      if (!aliveRef.current) return
      if (!r.ok) {
        if (r.code === 'not_ready') setNotReady(true)
        if (VIDEO_TO_PHOTOS_CODES.includes(r.code)) void videoBackToFrames(typeof r.body.footage_id === 'string' ? r.body.footage_id : null)
        if (r.code === 'too_many_videos') void videosPastLimitToFrames()
        if (r.code === 'not_editable') setDraft(null)
        setPlanError(failText(r)) // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
        return
      }
      rememberPlan(r.data)
      setPlan({ ...r.data, sig: JSON.stringify({ base: baseAtStart, facts: chosen }), cardSig: card.sig })
      setCopyEdit(null) // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — plano novo = texto novo (a edição do anterior não vale mais)
      setCopyNote(null) // KINEO-ANUNCIO-CONSERTOS-2026-10-12
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
      setPlanError(failText(r)) // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
      return false
    }
    setPlan((cur) => (cur && cur.order_id === p.order_id ? { ...cur, cardSig: done.sig } : cur))
    return true
  }

  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — editar o texto do plano (narração e frases de tela) antes de gerar: PATCH no pedido,
  // sem o modelo e sem custo. O limite de palavras é o da duração (o servidor confere de novo; o /start modera o texto).
  const editLimits = plan?.edit_limits ?? { narration_words: ADS_V2_EDIT_DEFAULT_LIMITS.narrationWords, overlay_chars: ADS_V2_EDIT_DEFAULT_LIMITS.overlayChars }
  const editVoiceOn = narrationOn && !!plan?.narration
  function startCopyEdit() {
    if (!plan || busy !== null) return
    setCopyNote(null)
    setCopyEdit({ narration: plan.narration ?? '', overlays: plan.overlays.map((o) => o.text) })
  }
  async function saveCopyEdit() {
    if (!plan || !copyEdit || copyBusy) return
    const narr = copyEdit.narration.replace(/\s+/g, ' ').trim()
    if (editVoiceOn && !narr) {
      setCopyNote({ warn: true, text: fix.emptyVoice })
      return
    }
    if (editVoiceOn && adsV2CountWords(narr) > editLimits.narration_words) {
      setCopyNote({ warn: true, text: fill(fix.tooLong, { max: editLimits.narration_words }) })
      return
    }
    const body: Record<string, unknown> = { order_id: plan.order_id }
    if (editVoiceOn) body.narration_text = narr
    if (plan.overlays.length) body.overlay_texts = copyEdit.overlays.map((o) => o.replace(/\s+/g, ' ').trim().slice(0, editLimits.overlay_chars))
    if (!('narration_text' in body) && !('overlay_texts' in body)) {
      setCopyEdit(null)
      return
    }
    setCopyBusy(true)
    setCopyNote(null)
    try {
      const r = await api<{ plan_narration?: string | null; plan_overlays?: Plan['overlays'] }>('/api/ads/v2/orders', { method: 'PATCH', body })
      if (!aliveRef.current) return
      if (!r.ok) {
        setCopyNote({ warn: true, text: r.code === 'narration_too_long' ? fill(fix.tooLong, { max: editLimits.narration_words }) : failText(r) ?? '' })
        return
      }
      const id = plan.order_id
      setPlan((cur) => (cur && cur.order_id === id ? { ...cur, narration: typeof r.data.plan_narration === 'string' ? r.data.plan_narration : cur.narration, overlays: Array.isArray(r.data.plan_overlays) ? r.data.plan_overlays : cur.overlays } : cur))
      setCopyEdit(null)
      setCopyNote({ warn: false, text: fix.saved })
    } finally {
      if (aliveRef.current) setCopyBusy(false)
    }
  }

  async function makeAd() {
    if (!plan || !planFresh || busy || cost === null) return
    if (copyEdit) {
      setPlanError(fix.saveFirst)
      return
    }
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
        setPlanError(scopy && r.code === 'sample_cap' ? null : scopy && r.code === 'sample_level_only' ? scopy.note : failText(r)) // KINEO-BUSINESS-POS-AMOSTRA-2026-10-12
        void onBalance()
        return
      }
      setDraft(null)
      void onBalance()
      if (saveKit) saveBrandKit() // KINEO-ADS-UX-MARCA-2026-10-10 — só depois do /start aceito; não espera a resposta
      typedMemory.link = '' // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o anúncio começou: o rascunho digitado não volta na próxima visita
      typedMemory.text = '' // KINEO-ANUNCIO-CONSERTOS-2026-10-12
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
    // KINEO-ADS-CENA-2026-10-13 — PRODUTO e CENA em linhas separadas: a frase que pede cena aparece como cena, nunca como nome.
    scene: adKind !== 'product' ? null
      : !sceneTierOk ? { label: sc.preview.scene, text: sc.scene.standard, muted: true }
      : sceneTyped ? { label: sc.preview.scene, text: sceneTyped, muted: false }
      : sceneSplit.scene ? { label: sc.preview.scene, text: `${sceneSplit.scene} ${sc.scene.fromText}`, muted: false }
      : { label: sc.preview.scene, text: sc.preview.sceneNone, muted: true },
    style: styleSpec && style !== 'none' ? { label: styleCopy.styles[style].label, oneLine: styleCopy.styles[style].oneLine, preview: styleSpec.preview, poster: styleSpec.poster } : null,
    presenter: presenterOn ? { poster: adsV2PresenterById(presenterPick)?.portrait ?? ADS_V2_PRESENTER_POSTER } : null, // KINEO-ATORES-IA-2026-10-13 — o rosto escolhido, se tiver retrato
    cardUrl: cardPreviewUrl,
    voice: narrationOn ? NARRATION_LANGUAGES.find((l) => l.code === spoken)?.native ?? spoken : copy.plan.noVoice,
    tierName,
    costText,
    shortText: costLine.short > 0 ? fill(ux.preview.short, { n: costLine.short }) : null,
  }
  const editing = editKey ? inAd.find((p) => p.key === editKey) ?? null : null
  // KINEO-ADS-FLUXO-2026-10-13 — o palco do estilo (cor do estilo no brilho), o cartão de revisão e o botão principal. O número
  // do botão é o MESMO `cost`/`shownCost` de sempre (adsV2Credits; variationsPrice no grupo das 3) — nada digitado.
  const styleTint = adsV2StyleTint(style)
  const stageData: AdsStyleStageData = {
    style,
    tint: styleTint,
    name: styleSpec && style !== 'none' ? styleCopy.styles[style].label : styleCopy.autoLabel,
    desc: styleSpec && style !== 'none' ? styleCopy.styles[style].oneLine : fc.stage.autoDesc,
    bestFor: styleSpec && style !== 'none' ? styleCopy.styles[style].bestFor : null,
    preview: styleSpec ? styleSpec.preview : null,
    poster: styleSpec ? styleSpec.poster : null,
    photo: inAd[0] ? { srcUrl: inAd[0].srcUrl, fx: inAd[0].fx, fy: inAd[0].fy } : null,
    cardUrl: cardPreviewUrl,
    presenterPoster: liveData.presenter?.poster ?? null,
    productName: liveData.productName,
    scene: liveData.scene ?? null,
    voice: liveData.voice,
    costText: liveData.costText,
    shortText: liveData.shortText,
  }
  const presenterAi = adsV2PresenterPickerCopy(lang).ai
  const presenterSummary = !presenterOn ? fc.review.noPerson : adsV2PresenterById(presenterPick)?.name ?? fc.review.surprise
  const goLabel = shownCost === null ? ux.preview.chooseLevel : scopy ? scopy.make : fill(fc.review.go, { c: shownCost })
  const scriptOptions = planFresh && plan ? adsV2ScriptOptions(plan.scripts) : null
  const goDisabled = planFresh ? busy !== null || cost === null || short > 0 || !!copyEdit : locked || missing.length > 0
  /** "Comece deste": o nome do anúncio da casa (estilo, ou a pessoa com o selo de IA) e as etiquetas da receita (cena, pessoa). */
  const startTitle = (id: string): string => {
    const r = adsV2StartFromRecipe(id)
    if (!r) return ''
    if (r.style !== 'none') return styleCopy.styles[r.style].label
    const p = adsV2PresenterById(r.presenter)
    return p ? `${p.name} · ${presenterAi}` : styleCopy.autoLabel
  }
  const startChips = (id: string): string[] => {
    const r = adsV2StartFromRecipe(id)
    if (!r) return []
    const out: string[] = []
    const preset = r.scene ? ADS_V2_SCENE_PRESETS.find((x) => x.id === r.scene) : null
    if (preset) out.push(`${preset.emoji} ${sc.presets[preset.id].label}`)
    const p = r.style !== 'none' ? adsV2PresenterById(r.presenter) : null
    if (p) out.push(`${p.name} · ${presenterAi}`)
    return out
  }
  // KINEO-ADS-FLUXO-2026-10-13 — ROTEIRO AUTOMÁTICO: com o produto e o texto prontos, ADS_V2_AUTO_PLAN_MS (1,2 s) depois da última
  // mudança, o MESMO planAd de sempre roda sozinho (grátis; o /plan tem teto diário por conta). Só com mudança de verdade (a
  // assinatura do plano mudou desde a última tentativa), nunca com o plano em dia, ocupado, editando o texto ou pausado.
  const planAdRef = useRef(planAd)
  planAdRef.current = planAd
  useEffect(() => {
    if (phase !== 'build' || autoPaused || busy !== null || copyEdit || linkBusy || missing.length > 0 || planFresh) return
    if (autoRef.current.sig === planSig) return
    const t = window.setTimeout(() => {
      autoRef.current = { sig: planSig, running: true }
      void planAdRef.current()
    }, ADS_V2_AUTO_PLAN_MS)
    return () => window.clearTimeout(t)
  }, [phase, autoPaused, busy, copyEdit, linkBusy, missing.length, planFresh, planSig])
  // A tentativa automática terminou com erro: pausa (nada de tentar de novo sozinho) até a pessoa tocar em "Atualizar roteiros".
  useEffect(() => {
    if (busy !== null || !autoRef.current.running) return
    autoRef.current.running = false
    if (planError) setAutoPaused(true)
  }, [busy, planError])
  // KINEO-ADS-RETESTE-1510 — a pausa vale só para a assinatura que falhou: a pessoa mudou o texto/foto/estilo depois da falha = o
  // automático volta sozinho (reteste 15/10: falhou com "a", ela escreveu a frase inteira e continuou "pausado").
  useEffect(() => { if (autoPaused && adsV2AutoPauseLifts(autoRef.current.sig, planSig)) setAutoPaused(false) }, [autoPaused, planSig]) // KINEO-ADS-RETESTE-1510
  /** O clique manual ("Atualizar roteiros"/"Escrever agora") tira a pausa e conta como a tentativa desta assinatura. */
  function manualPlan() {
    autoRef.current = { sig: planSig, running: false }
    setAutoPaused(false)
  }
  /** A barra do celular repassa ao botão do cartão (plano grátis ou "Gerar"); sem poder clicar, leva ao cartão (mostra o que falta). */
  function goFromBar() {
    const b = goBtnRef.current
    if (b && !b.disabled && !goDisabled) b.click()
    else goToSection('adv2s-sec4')
  }

  return (
    <div className="adv2-layout">
      <style dangerouslySetInnerHTML={{ __html: SIMPLE_CSS + SIMPLE_UX_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: TELA_CONSERTOS_CSS }} />{/* KINEO-ADS-CONSERTOS-TELA-1410 */}
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
            {/* KINEO-ADS-QUADRO-STUDIO-1510 — o QUADRO CURTO no formato do Studio de filmes (fundador 15/10: "o formulário longo"):
                1 Produto → 2 Seu anúncio → 3 Estilo → o botão principal, tudo na primeira tela; o resto (nível, todos os estilos,
                voz, frases, preço, contato, cartão final, logo, pessoa de IA) em cartões recolhidos embaixo do botão. O passo a passo
                de 4 botões saiu (o quadro inteiro cabe na tela; o ✓ de cada passo pronto mora no chip .n do rótulo). Só
                recomposição: os campos, os estados e as funções são os de sempre. */}
            <div className="adv2q-board" data-kineo="ads-quadro-studio">
            {/* 1. Arquivos */}
            <section id="adv2s-sec1" className="adv2q-step" aria-labelledby="adv2s-s1">
              <h2 id="adv2s-s1" className="lab"><span className="n" aria-hidden="true">{steps[0].done ? '✓' : 1}</span>{ux.steps.product}</h2>
              <div className="mdlbtn adv2q-box">{/* KINEO-ADS-QUADRO-STUDIO-1510 — a caixa do motor do Studio (.mdlbtn) guarda link + fotos */}
              {/* KINEO-ADS-FLUXO-2026-10-13 — LINK PRIMEIRO (Topview/Creatify): a caixa grande com "Colar"; colar já busca; Enter ou o
                  botão também (o MESMO importLink de sempre). Depois, "Lemos sua página" para corrigir; a foto vira a 2ª opção. */}
              <div className="adsw-f adv2s-link adv2f-link" data-kineo="ads-link-import">
                <label htmlFor="adv2s-link">{fc.link.title}</label>
                <p className="adv2f-stores">{fc.link.stores}</p>
                <div className="adv2s-linkrow">
                  <input
                    id="adv2s-link"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    ref={linkInputRef}
                    value={link}
                    maxLength={500}
                    disabled={locked || linkBusy}
                    placeholder={lcopy.linkPlaceholder}
                    onChange={(e) => { setLink(e.target.value); if (!e.target.value.trim()) { setLinkRead(null); setLinkFacts(null) } }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').trim()
                      if (!pasted) return
                      e.preventDefault()
                      setLink(pasted)
                      void importLink(pasted)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void importLink() } }}
                  />
                  {!link.trim() ? (
                    <button type="button" className="adsw-btn small" data-kineo="ads-link-paste" disabled={locked || linkBusy || items.length >= ADS_V2_SIMPLE_MAX_ITEMS} onClick={() => void pasteLink()}>
                      {linkBusy ? lcopy.linkReading : fc.link.paste}
                    </button>
                  ) : (
                    <button type="button" className="adsw-btn small" disabled={locked || linkBusy || items.length >= ADS_V2_SIMPLE_MAX_ITEMS} onClick={() => void importLink()}>
                      {linkBusy ? lcopy.linkReading : lcopy.linkButton}
                    </button>
                  )}
                </div>
                <small>{lcopy.linkHint}</small>
                {linkNote ? <p className={linkNote.warn ? 'adsw-warn' : 'adsw-hint'} role="status">{linkNote.text}</p> : null}
              </div>
              {linkFacts ? (
                <AdsReadCard
                  copy={fc}
                  host={linkFacts.host}
                  photos={items.filter((p) => p.fromLink).map((p) => p.srcUrl)}
                  name={cardTitle}
                  namePlaceholder={adsV2ProductTitle(sentence, adKind)}
                  onName={setCardTitle}
                  price={price}
                  onPrice={setPrice}
                  pricePlaceholder={copy.text.pricePlaceholder}
                  priceFound={linkFacts.priceFound}
                  disabled={locked}
                />
              ) : null}
              <p className="adv2f-or">{fc.link.orPhoto}</p>
              <p className="adsw-lead">{lcopy.lead}</p>
              {items.length ? (
                <>
                  <p className="adsw-hint" style={{ margin: '0 0 10px' }}>{fill(copy.files.count, { n: inAd.length, max: ADS_V2_SIMPLE_MAX_IN_AD })} · {copy.files.frameHint}</p>
                  <ol className="adv2s-items" aria-label={copy.files.title}>
                    {inAd.map((p, i) => (
                      <ItemCard key={p.key} item={p} index={i} copy={copy} locked={locked} out={false} fix={fix}
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
                      ratio={format !== '9:16' ? ADS_V2_FORMAT_CROP[format].width / ADS_V2_FORMAT_CROP[format].height : undefined} // KINEO-ADS-MELHORIAS-1410 — a janela clara no formato do anúncio
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
                          <ItemCard key={p.key} item={p} index={ADS_V2_SIMPLE_MAX_IN_AD + j} copy={copy} locked={locked} out ux={ux} fix={fix}
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
              <div className="adv2q-drop">{/* KINEO-ADS-QUADRO-STUDIO-1510 — a área de soltar compacta (uma linha) */}
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
              </div>
            </section>

            {/* 2. O texto */}
            <section id="adv2s-sec2" className="adv2q-step" aria-labelledby="adv2s-s2">
              {/* KINEO-ADS-QUADRO-STUDIO-1510 — "2 Seu anúncio" com as pílulas do tipo (produto/lugar: a única escolha de TIPO que o
                  /orders aceita, `kind`) na mesma linha, como "2 Your idea" + "Surprise me" no Studio. */}
              <div className="adv2q-head">
              <h2 id="adv2s-s2" className="lab"><span className="n" aria-hidden="true">{steps[1].done ? '✓' : 2}</span>{qc.yourAd}</h2>
              {/* KINEO-ADS-CENA-2026-10-13 — produto ou lugar: detectado pela frase; a pessoa troca com um toque. */}
              {/* KINEO-ADS-QUADRO-STUDIO-1510 — as pílulas do Studio (.pill / .pill.on), na linha do rótulo. */}
              <div className="adv2s-kind row" role="group" aria-label={sc.kindLabel} data-kineo="ads-kind">
                <span>{sc.kindLabel}</span>
                <button type="button" className={`pill${adKind === 'product' ? ' on' : ''}`} aria-pressed={adKind === 'product'} disabled={locked} onClick={() => setKindChoice('product')}>{sc.kindProduct}</button>
                <button type="button" className={`pill${adKind === 'place' ? ' on' : ''}`} aria-pressed={adKind === 'place'} disabled={locked} onClick={() => setKindChoice('place')}>{sc.kindPlace}</button>
              </div>
              </div>
              {/* KINEO-ADS-UX-MARCA-2026-10-10 — o kit da marca entrou: mostra o que entrou (cor, logo, nome, preço) e "Editar". */}
              {kitApplied ? (
                <p className="adv2s-kit" role="status" data-kineo="ads-brand-kit-chip">
                  {kitApplied.color ? <span className="sw" aria-hidden="true" style={{ background: cardColor }} /> : null}
                  {logo?.localUrl ? <img src={logo.localUrl} alt="" /> : null}
                  <span>{ux.kit.chip}{cardTitle.trim() ? ` · ${cardTitle.trim()}` : ''}{priceT ? ` · ${priceT}` : ''}</span>
                  <button type="button" disabled={locked} onClick={() => { setMoreOpen(true); window.setTimeout(() => goToSection('adv2s-sec2'), 30) }}>{ux.kit.edit}</button>
                </p>
              ) : null}
              {/* KINEO-ADS-QUADRO-STUDIO-1510 — a caixa de texto do Studio (sem o rótulo grande: a pergunta e a dica ficam para o leitor de
                  tela; o exemplo segue no placeholder). Mesmo estado, mesmo limite, mesma ref. */}
              <label className="adsw-f adv2q-text">
                <span>{textAsk.question}</span>
                <small>{textAsk.hint}</small>
                {/* KINEO-ADS-RETESTE-1510 — era disabled={locked}: o roteiro automático (busy 'plan', 1,2 s depois da 1ª letra) DESABILITAVA a
                    caixa e o navegador tirava o foco no meio da digitação (reteste 15/10: ficou só "a"). Só o débito ('start') trava. */}
                <textarea ref={textAreaRef} className="adv2q-prompt" rows={3} maxLength={ADS_V2_SCREEN_SENTENCE_MAX} value={text} disabled={busy === 'start'} onChange={(e) => setText(e.target.value)} placeholder={textAsk.placeholder} />
              </label>
              {/* KINEO-ADS-CENA-2026-10-13 — a frase pede cena ("…num hotel com uma chuva"): dizemos o que lemos e oferecemos mover. */}
              {adKind === 'product' && sceneSplit.scene && !sceneTyped ? (
                <p className="adsw-hint adv2s-movescene" role="status" data-kineo="ads-scene-from-text">
                  {fill(sc.scene.moveNote, { scene: sceneSplit.scene })}{' '}
                  {/* KINEO-ADS-CONSERTOS-TELA-1410 — sem disabled={locked}: o roteiro automático (1,2 s depois de cada mudança) deixava
                      o botão morto. Só mexe no estado local; o plano em voo nasce com a assinatura velha (baseAtStart) e o roteiro
                      automático replaneja com a nova. */}
                  <button type="button" className="adsw-btn ghost small" data-kineo="ads-scene-move" onClick={() => { setScene(sceneSplit.scene ?? ''); if (sceneSplit.product) setText(sceneSplit.product) }}>{sc.scene.move}</button>
                </p>
              ) : null}
              {/* KINEO-ADS-CENA-2026-10-13 — "Where does your product appear?" (opcional) + 4 climas prontos. Só cria cena em
                  Comercial/Premium: no Normal fica desligado com o porquê. */}
              {adKind === 'product' ? (
                <div className="adsw-f adv2s-scene" data-kineo="ads-scene">
                  <label htmlFor="adv2s-scene">{sc.scene.label}</label>
                  <small>{sceneTierOk ? sc.scene.hint : sc.scene.standard}</small>
                  <input id="adv2s-scene" type="text" value={scene} maxLength={ADS_V2_SCENE_MAX_CHARS} disabled={busy === 'start' || !sceneTierOk} onChange={(e) => setScene(e.target.value)} placeholder={sc.scene.placeholder} />{/* KINEO-ADS-RETESTE-1510 — o plano grátis não trava a digitação (era locked) */}
                  {sceneTierOk ? (
                    <p className="adv2s-chips">
                      <span>{sc.scene.tryLabel}</span>
                      {ADS_V2_SCENE_PRESETS.map((p) => (
                        <button key={p.id} type="button" data-preset={p.id} disabled={locked} onClick={() => setScene((cur) => adsV2ApplyScenePreset(cur, sc.presets[p.id].text))}>
                          <span aria-hidden="true">{p.emoji}</span> {sc.presets[p.id].label}
                        </button>
                      ))}
                    </p>
                  ) : null}
                  {sceneProblem ? <p className="adsw-warn" role="alert">{adsV2SceneErrorText(sceneProblem, lang)}</p> : null}
                </div>
              ) : null}
            </section>

            {/* 3. Estilo — KINEO-ADS-QUADRO-STUDIO-1510: uma fileira de 5 miniaturas (a sugerida primeiro) e "Ver todos os N", que abre a
                escolha completa de sempre (AdsStylePicker, no cartão recolhido abaixo). Os dois mexem no MESMO setStyleChoice. */}
            <section id="adv2s-sec3" className="adv2q-step" aria-labelledby="adv2s-s3">
              <div className="adv2q-head">
                <h2 id="adv2s-s3" className="lab"><span className="n" aria-hidden="true">3</span>{styleCopy.title}</h2>
                {ADS_V2_STYLES_PUBLIC ? (
                  <button type="button" className="pill" data-kineo="ads-quadro-see-all" aria-expanded={stylesOpen} aria-controls="adv2q-styles-all" onClick={() => { setStylesOpen(true); window.setTimeout(() => document.getElementById('adv2q-styles-all')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40) }}>
                    {fill(qc.seeAll, { n: ADS_V2_STYLES.length })}
                  </button>
                ) : null}
              </div>
              {ADS_V2_STYLES_PUBLIC ? (
                <QuadroStyleRow value={style} suggested={styleSuggested} onChange={setStyleChoice} disabled={locked} copy={styleCopy} labelledBy="adv2s-s3" />
              ) : null}
              {startNote ? <p className="adsw-hint" role="status" data-kineo="ads-start-from-note">✓ {startNote}</p> : null}
            </section>

            {/* KINEO-ADS-QUADRO-STUDIO-1510 — o BOTÃO PRINCIPAL na primeira tela, no estilo .go do Studio. É o MESMO botão da barra do
                celular (goFromBar → o botão do cartão de revisão): sem roteiro = "Roteiro (grátis)", que roda o MESMO planAd; com o
                roteiro em dia = "Gerar · N créditos", o MESMO makeAd. Sem poder clicar, leva ao cartão de revisão (mostra o que falta). */}
            <div className="adv2q-go" data-kineo="ads-quadro-go">
              <button type="button" className={`go ${goDisabled ? 'no' : 'ok'}`} aria-disabled={goDisabled} onClick={goFromBar}>
                {planFresh ? goLabel : busy === 'plan' ? copy.plan.planning : fc.review.planShort}
              </button>
              <p className="gnote" role="status">{busy === 'plan' ? copy.plan.planning : !planFresh && missing.length ? missing[0] : !planFresh ? fill(fc.review.then, { go: goLabel }) : ux.preview.delivery}</p>
            </div>
            </div>

            {/* KINEO-ADS-QUADRO-STUDIO-1510 — os cartões recolhidos (o "Your logo · optional" do Studio): nível, todos os estilos e "Mais
                opções". O nível abre sozinho só enquanto nenhum está marcado (o saldo ainda não chegou). */}
            <details className="adv2q-opt" data-kineo="ads-quadro-level" open={levelOpen ?? tier === null}>
              <summary onClick={(e) => { e.preventDefault(); setLevelOpen(!(levelOpen ?? tier === null)) }}>
                {copy.tiers.title}<span className="v">· {tierName ?? fc.review.none}{cost !== null && !scopy ? ` · ${fill(copy.tiers.credits, { n: cost })}` : ''}</span>
              </summary>
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
                      <input className="adv2-sr" type="radio" name="adv2s-tier" value={t} checked={tier === t} disabled={locked || sampleOff} onChange={() => { setTier(t); if (!scopy) adsV2RememberTier((v) => window.localStorage.setItem(ADS_V2_TIER_MEMORY_KEY, v), t) }} />
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
              {scopy ? <p className="adsw-hint">{scopy.note}</p> : null}
              <p className="adv2-balance" role="status">
                {balance === null ? copy.tiers.balanceUnknown : fill(copy.tiers.balance, { n: balance })}{' '}
                {short > 0 ? <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">{copy.tiers.getCredits}</Link> : null}
              </p>
            </details>
            {/* KINEO-ADS-QUADRO-STUDIO-1510 — a língua da voz num cartão recolhido que já MOSTRA a língua no título; abre sozinho quando
                ninguém tem certeza da língua da frase (o aviso de 14/10 continua ao lado do seletor). */}
            <details className="adv2q-opt" data-kineo="ads-quadro-voice" open={voiceOpen ?? voiceUnsure}>
              <summary onClick={(e) => { e.preventDefault(); setVoiceOpen(!(voiceOpen ?? voiceUnsure)) }}>
                {copy.text.voiceIn}<span className="v">· {liveData.voice}</span>
              </summary>
              <label className="adv2s-lang">
                {copy.text.voiceIn}
                <select value={spoken} disabled={locked} onChange={(e) => setVoiceLang(narrationLanguage(e.target.value))}>
                  {NARRATION_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
                </select>
              </label>
              {/* KINEO-ADS-CONSERTOS-TELA-1410 — a língua da frase não ficou clara: dizemos em que língua a voz sai, ao lado do seletor. */}
              {voiceUnsure ? (
                <p className="adsw-hint adv2s-voiceask" role="status" data-kineo="ads-voice-ask">
                  {fill(tc.voiceCheck, { lang: NARRATION_LANGUAGES.find((l) => l.code === spoken)?.native ?? spoken })}
                </p>
              ) : null}
            </details>
            {ADS_V2_STYLES_PUBLIC ? (
              <details id="adv2q-styles-all" className="adv2q-opt" data-kineo="ads-quadro-styles-all" open={stylesOpen}>
                <summary onClick={(e) => { e.preventDefault(); setStylesOpen((v) => !v) }}>
                  {styleCopy.title}<span className="v">· {stageData.name}</span>
                </summary>
                <AdsStylePicker
                  name="adv2s-style"
                  value={style}
                  suggested={styleSuggested}
                  onChange={setStyleChoice}
                  disabled={locked}
                  copy={styleCopy}
                  note={formatChoice !== '9:16' ? fcopy.blocked.style : photoKind === 'text' ? styleCopy.noProduct : styleCopy.targetSimple} // KINEO-ADS-MELHORIAS-1410
                  carousel={{ labels: { all: ux.styles.all, food: ux.styles.food, beauty: ux.styles.beauty, tech: ux.styles.tech, any: ux.styles.any }, recommended: ux.styles.recommended, prev: ux.styles.prev, next: ux.styles.next }}
                />
              </details>
            ) : null}
            <details className="adv2s-more" open={moreOpen} onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}>
              <summary>{copy.text.more}<span className="o">· {qc.optional}</span></summary>
              {/* KINEO-ADS-MELHORIAS-1410 — o formato: 9:16 (padrão), 4:5 e 1:1 para o feed. Mesmos créditos. Estilo e ator só em 9:16; Premium sem 4:5. */}
              <fieldset className="adv2s-format" data-kineo="ads-format" disabled={locked}>
                <legend>{fcopy.label}</legend>
                <div className="opts" role="radiogroup" aria-label={fcopy.label}>
                  {ADS_V2_FORMATS.map((fm) => {
                    const why = adsV2FormatBlock({ format: fm, tier, style: null, presenter: false })
                    const { width, height } = ADS_V2_FORMAT_CROP[fm]
                    return (
                      <label key={fm} className="opt" data-on={format === fm ? 'true' : undefined} data-off={why ? 'true' : undefined}>
                        <input type="radio" name="adv2s-format" value={fm} checked={format === fm} disabled={!!why} onChange={() => { setFormatChoice(fm); if (fm !== '9:16') { setPresenterChoice(false); if (styleChoice !== null) setStyleChoice(null) } }} />
                        <span className="shape" aria-hidden="true" style={{ width: Math.round((28 * width) / height), height: 28 }} />
                        <span className="txt"><b>{fcopy.options[fm].name}</b><small>{fcopy.options[fm].where}</small></span>
                      </label>
                    )
                  })}
                </div>
                <p className="adsw-hint" style={{ margin: '6px 0 0' }}>
                  {fcopy.sameCredits}
                  {formatChoice !== format ? <> {fcopy.blocked.premium_45}</> : null}
                  {format !== '9:16' && ADS_V2_STYLES_PUBLIC ? <> {fcopy.blocked.style}</> : null}
                  {format !== '9:16' && ADS_V2_PRESENTER_PUBLIC ? <> {fcopy.blocked.presenter}</> : null}
                </p>
              </fieldset>
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
                <input ref={contactInputRef} type="text" value={contact} maxLength={80} disabled={locked} onChange={(e) => setContact(e.target.value)} placeholder={copy.text.contactPlaceholder} />
              </label>
              {/* KINEO-ADS-DEMO-UNIVERSO-1410 — "como pronunciar a marca": só a VOZ muda; tela, frases e cartão ficam com a grafia real. Sem voz, escondido. */}
              {narrationOn ? (
                <div className="adsw-f" data-kineo="ads-pronounce">
                  <span>{pcopy.label}</span>
                  <small>{pcopy.hint}</small>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input type="text" aria-label={pcopy.word} value={pronWord} maxLength={40} disabled={locked} onChange={(e) => setPronWord(e.target.value)} placeholder={pronWordDefault || pcopy.word} style={{ flex: '1 1 140px', minWidth: 0 }} />
                    <input type="text" aria-label={pcopy.say} value={pronSay} maxLength={40} disabled={locked} onChange={(e) => setPronSay(e.target.value)} placeholder={pcopy.sayPlaceholder} style={{ flex: '1 1 140px', minWidth: 0 }} />
                  </div>
                </div>
              ) : null}
              <div className="adv2-cardwrap" style={{ marginTop: 12 }}>
                <canvas ref={cardCanvasRef} className="adv2-cardprev" width={1080} height={1920} role="img" aria-label={copy.text.cardPreview} />
                <div className="fields">
                  <label className="adsw-f">
                    <span>{copy.text.cardTitle}</span>
                    <small>{copy.text.cardTitleHint}</small>
                    <input type="text" value={cardTitle} maxLength={60} disabled={locked} onChange={(e) => setCardTitle(e.target.value)} placeholder={adsV2ProductTitle(sentence, adKind)} />
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
              {/* KINEO-ATORES-IA-2026-10-13 — com o ator ligado, a escolha do apresentador (padrão = o sorteio de sempre). */}
              {presenterOn ? <AdsPresenterPicker name="adv2s-presenter-pick" value={presenterPick} onChange={setPresenterPick} copy={adsV2PresenterPickerCopy(lang)} disabled={locked} /> : null}
            </details>

            {/* 4. Descobrir, planejar e fazer */}
            <section id="adv2s-sec4" className="adv2-card" aria-labelledby="adv2s-s4">
              {/* KINEO-ADS-RETESTE-1510 — o plano que chega (planAd foca este título) não rouba o foco de quem está digitando: o título só é
                  focável por código (tabIndex -1), então foco vindo de uma caixa de texto/campo volta para ela. */}
              <h2 id="adv2s-s4" ref={planHeadingRef} tabIndex={-1} onFocus={(e) => { const prev = e.relatedTarget; if (prev instanceof HTMLTextAreaElement || prev instanceof HTMLInputElement) prev.focus() }}><span className="adv2-num" aria-hidden="true">4</span>{fc.review.title}</h2>
              {/* KINEO-ADS-FLUXO-2026-10-13 — o cartão de revisão do Studio: produto, estilo, cena, pessoa, nível e voz num bloco só,
                  sempre à vista; o botão embaixo diz "Gerar · N créditos" (o número é o `cost` de sempre, de adsV2Credits). */}
              <dl className="adv2f-sum" data-kineo="ads-review-summary">
                <div><dt>{fc.review.product}</dt><dd className={liveData.productName ? undefined : 'muted'}>{liveData.productName || fc.review.none}{inAd.length ? ` · ${inAd.length} 📷` : ''}</dd></div>
                <div><dt>{fc.review.style}</dt><dd>{stageData.name}</dd></div>
                <div><dt>{fc.review.scene}</dt><dd className={liveData.scene && !liveData.scene.muted ? undefined : 'muted'}>{liveData.scene ? liveData.scene.text : fc.review.none}</dd></div>
                <div><dt>{fc.review.presenter}</dt><dd className={presenterOn ? undefined : 'muted'}>{presenterSummary}{presenterOn ? <span className="adv2f-ai">{presenterAi}</span> : null}</dd></div>
                <div><dt>{fc.review.level}</dt><dd className={tierName ? undefined : 'muted'}>{tierName ?? fc.review.none}</dd></div>
                <div><dt>{copy.plan.voice}</dt><dd className={narrationOn ? undefined : 'muted'}>{liveData.voice}</dd></div>
              </dl>
              {/* KINEO-ADS-CONSERTOS-TELA-1410 — sem contato e sem link, o cartão final saía só com o nome (QA 14/10: "Perfume" no
                  marrom, sem botão). O aviso abre "Mais" e põe o cursor no campo de contato. */}
              {cardCta === '' && sentence ? (
                <p className="adsw-warn adv2s-nocta" role="status" data-kineo="ads-no-cta">
                  {tc.noCta}{' '}
                  <button type="button" className="adsw-btn ghost small" onClick={() => { setMoreOpen(true); window.setTimeout(() => { contactInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); contactInputRef.current?.focus({ preventScroll: true }) }, 40) }}>{tc.noCtaAdd}</button>
                </p>
              ) : null}
              {factsNow.length ? (
                <>
                  <h3>{adKind === 'product' ? sc.research.factsTitle : copy.plan.factsTitle}</h3>
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
                  {/* KINEO-ADS-FLUXO-2026-10-13 — o roteiro sai SOZINHO (efeito do roteiro automático acima); o botão grande
                      "Descobrir e planejar" virou o link manual "Escrever agora"/"Atualizar roteiros" (que também tira a pausa). */}
                  <p className="adv2f-auto" role="status" data-kineo="ads-auto-plan">{busy === 'plan' ? copy.plan.planning : autoPaused ? fc.auto.paused : fc.auto.note}</p>
                  <div className="adv2-actions">
                    <button ref={goBtnRef} type="button" className="adsw-link adv2f-refresh" disabled={locked || missing.length > 0} onClick={() => void planAd()} onClickCapture={manualPlan}>
                      {busy === 'plan' ? copy.plan.planning : plan ? fc.auto.refresh : fc.auto.writeNow}
                    </button>
                  </div>
                  {/* KINEO-ADS-FLUXO-2026-10-13 — o "Gerar · N créditos" à vista ANTES do plano (o plano é grátis; o débito só no botão do roteiro). */}
                  <p className="adv2f-next" data-kineo="ads-review-next">{fill(fc.review.then, { go: goLabel })}</p>
                </>
              ) : (
                <>
                <AdsPlanChanges before={previousPlan} after={plan as Plan} />
                {/* KINEO-ADS-FLUXO-2026-10-13 — a VAGA dos 2–3 roteiros: só aparece quando o /plan devolver `scripts: [...]`
                    (outra pista). Escolher abre a edição de sempre com o texto dele; sem `scripts`, o roteiro único de hoje. */}
                {scriptOptions ? (
                  <fieldset className="adv2f-scripts" data-kineo="ads-script-options">
                    <legend>{fc.review.scripts}</legend>
                    <p className="adsw-hint" style={{ margin: 0 }}>{fc.review.scriptsHint}</p>
                    {scriptOptions.map((o) => (
                      <label key={o.key}>
                        <input className="adv2-sr" type="radio" name="adv2f-script" checked={(scriptPick ?? (plan as Plan).script_id ?? scriptOptions[0].key) === o.key} disabled={busy !== null || copyBusy || !!copyEdit} onChange={() => void chooseScript(o)} />
                        <b aria-hidden="true">{o.letter}</b>
                        <span>{o.tone || o.label ? <small>{o.tone ? fc.tones[o.tone] : o.label}</small> : null}{o.narration ?? o.overlays.join(' · ')}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                {/* KINEO-ADS-FLUXO-2026-10-13 — "Atualizar roteiros": o link manual (o automático nunca refaz sem mudança). */}
                <button type="button" className="adsw-link adv2f-refresh" data-kineo="ads-refresh-scripts" disabled={busy !== null || copyBusy || !!copyEdit || missing.length > 0} onClick={() => void planAd()} onClickCapture={manualPlan}>↻ {fc.auto.refresh}</button>
                <SimplePlanPreview
                  formatName={format !== '9:16' ? fcopy.options[format].name : null} // KINEO-ADS-MELHORIAS-1410
                  plan={plan as Plan}
                  copy={copy}
                  cost={cost}
                  three={variations ? { on: three, onChange: setThree, copy: vcopy } : null}
                  sample={scopy}
                  short={short}
                  busy={busy}
                  narrationOn={narrationOn}
                  editor={{
                    fix,
                    edit: copyEdit,
                    busy: copyBusy,
                    note: copyNote,
                    limits: editLimits,
                    voiceOn: editVoiceOn,
                    onStart: startCopyEdit,
                    onChange: setCopyEdit,
                    onSave: () => void saveCopyEdit(),
                    onCancel: () => { setCopyEdit(null); setCopyNote(null) },
                  }}
                  itemByFootage={itemByFootage}
                  styleCopy={styleCopy}
                  presenterCopy={presenterCopy}
                  presenterAiLabel={adsV2PresenterPickerCopy(lang).ai}
                  scenes={{ product: ((plan as Plan).ad_kind ?? adKind) === 'product', scene: (plan as Plan).scene ?? null, sc }}
                  onMake={() => void makeAd()}
                  makeLabel={scopy || (variations && three) ? null : goLabel}
                  makeRef={goBtnRef}
                />
                </>
              )}
              {/* KINEO-ADS-UX-MARCA-2026-10-10 — quanto demora e "Salvar como meu kit da marca" (desmarcado por padrão desde KINEO-ADS-DEMO-UNIVERSO-1410; grava só depois que o anúncio começou). */}
              <p className="adv2s-eta">⏱ {ux.preview.delivery}</p>
              <label className="adv2s-save" data-kineo="ads-brand-kit-save">
                <input type="checkbox" checked={saveKit} disabled={locked} onChange={(e) => { saveKitTouchedRef.current = true; setSaveKit(e.target.checked) }} />
                <span>{ux.kit.save}<small>{ux.kit.saveHint}</small></span>
              </label>
              {busyNote ? <p className="adsw-hint" role="status">{busyNote}</p> : null}
              {planError ? <p className="adsw-err" role="alert">{planError}</p> : null}
              {/* KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — teto do dia: "amostras cheias hoje, volte amanhã ou assine o Business" (com o link do checkout). */}
              {scopy && sampleCap ? <p className="adsw-warn" role="alert">{business ? acopy.cap : scopy.cap} {business ? <><a className="adsw-link" href={business.checkoutHref}>{fillAfterSample(acopy.cta, business)} →</a>{' · '}</> : null}<a className="adsw-link" href="/pricing" target="_blank" rel="noopener">{scopy.paidOnly} →</a></p> : null}
            </section>
            {/* KINEO-ADS-FLUXO-2026-10-13 — o PALCO DO ESTILO (no lugar da prévia ao vivo): o vídeo do estilo escolhido, a cor dele no
                brilho, e as miniaturas para ver a sua abertura e o quadro final. No celular ele vem primeiro, menor. */}
            <AdsStyleStage slot={previewSlot} data={stageData} copy={fc} labels={{ product: ux.preview.product, voice: ux.preview.voice, delivery: ux.preview.delivery, empty: ux.preview.empty, presenter: ux.preview.presenter }} />
            {/* KINEO-ADS-FLUXO-2026-10-13 — no celular, a barra que gruda embaixo leva o botão principal do cartão de revisão. */}
            <MobilePreviewBar data={liveData} copy={ux} go={{ label: planFresh ? goLabel : busy === 'plan' ? copy.plan.planning : fc.review.planShort, onClick: goFromBar, disabled: goDisabled }} />
            {/* KINEO-ADS-FLUXO-2026-10-13 — "Comece deste": anúncios da casa embaixo do quadro (copiam estilo, cena e pessoa). */}
            <AdsStartFromRow
              slot={rowSlot}
              copy={fc}
              titleOf={startTitle}
              chipsOf={startChips}
              tintOf={(id) => adsV2StyleTint(adsV2StartFromRecipe(id)?.style)[0]}
              onUse={startFrom}
              disabled={locked}
            />
          </>
        ) : null}

        {phase === 'progress' && order ? (
          <section className="adv2-card" aria-labelledby="adv2s-prog">
            <h2 id="adv2s-prog" ref={headingRef} tabIndex={-1}>{copy.progress.title}</h2>
            <p className="adsw-lead">
              {order.status === 'assembling' ? copy.progress.assembling : copy.progress.animating}{' '}
              {copy.progress.leave} <Link className="adsw-link" href="/history">{copy.progress.myVideos}</Link>.
            </p>
            {redoNote ? <p className="adv2-note" role="status" style={{ marginTop: 0, marginBottom: 16 }}>{redoNote}</p> : null}{/* KINEO-ADS-MELHORIAS-1410 */}
            <SimpleShotGrid shots={order.shots} orderStatus={order.status} copy={copy} packshotLabel={adsV2PackshotCopy(lang).label} />
            {pollNote ? <p className="adsw-warn" role="status">{pollNote}</p> : null}
          </section>
        ) : null}

        {phase === 'delivered' && order ? (
          <section className="adv2-card adv2s-result" aria-labelledby="adv2s-done">
            <h2 id="adv2s-done" ref={headingRef} tabIndex={-1}>{copy.done.title}</h2>
            {/* KINEO-ADS-CONSERTOS-TELA-1410 — Baixar/Abrir ACIMA do player: no celular (390 px) ficavam 2 telas abaixo do anúncio pronto. */}
            <div className="adv2-actions adv2s-done-actions" data-kineo="ads-done-actions">
              {video?.video_url ? (
                <button type="button" className="adsw-btn" disabled={downloading} onClick={() => void download()}>
                  {downloading ? copy.done.downloading : copy.done.download}
                </button>
              ) : null}
              <Link className="adsw-link" href="/history">{copy.done.open}</Link>
            </div>
            {downloadNote ? <p className="adsw-warn" role="status">{downloadNote}</p> : null}
            <p className="adv2-note" role="note">{adsV2AiLabelNotice(lang)}</p>
            {video?.video_url ? (
              <video className="adv2-player" src={video.video_url} controls playsInline preload="metadata" />
            ) : (
              <p className="adsw-lead">{copy.done.inMyVideos} <Link className="adsw-link" href="/history">{copy.progress.myVideos}</Link>.</p>
            )}
            {/* KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a amostra acabou de ser entregue (o pico da alegria): a oferta do Business logo abaixo. */}
            {scopy && business ? <AdsAfterSampleOffer lang={lang} business={business} compact /> : null}
            {/* KINEO-ADS-AMOSTRA-2026-10-09 — a amostra não tem refação (a rota segue fechada para free/trial). */}
            {/* KINEO-ADS-MELHORIAS-1410 — as cenas com miniatura e "Refazer esta cena · N créditos" AQUI (era um link para o modo completo). */}
            {scopy ? null : <h3 style={{ margin: '24px 0 6px' }}>{rcopy.title}</h3>}
            {scopy ? null : <p className="adsw-hint" style={{ margin: '0 0 12px' }}>{rcopy.hint}</p>}
            {scopy ? null : (
              <SimpleShotGrid
                shots={order.shots}
                orderStatus={order.status}
                copy={copy}
                packshotLabel={adsV2PackshotCopy(lang).label}
                redo={{ copy: rcopy, ask: redoAsk, busy: redoBusy, onAsk: (idx) => { setRedoAsk(idx); setRedoError(null) }, onCancel: () => setRedoAsk(null), onConfirm: (shot) => void redoShot(shot) }}
              />
            )}
            {redoError ? <p className="adsw-err" role="alert">{redoError}</p> : null}{/* KINEO-ADS-MELHORIAS-1410 */}
            <div className="adv2-actions" style={{ marginTop: 0 }}>
              <button type="button" className="adsw-btn ghost" onClick={onAskStartOver}>{copy.done.another}</button>
            </div>
          </section>
        ) : null}

        {phase === 'failed' && order ? (
          <section className="adv2-card adv2s-result" aria-labelledby="adv2s-fail">
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
  fix,
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
  /** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — frases dos consertos (o aviso neutro da foto do link). */
  fix?: AdsV2FixCopy
}) {
  const liRef = useRef<HTMLLIElement | null>(null)
  const internal = (e: { dataTransfer: DataTransfer | null }) => Array.from(e.dataTransfer?.types ?? []).includes('text/x-kineo-item')
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — foto que veio do LINK é do site da própria marca: nada de "cópia de app de conversa".
  // Ela só ganha um aviso neutro quando é pequena DE VERDADE para 1080×1920 (recorte abaixo de metade da largura).
  const crop = cropRect(item.w, item.h, item.fx, item.fy)
  const small = item.fromLink ? crop.sw < ADS_V2_LINK_SMALL_WIDTH : isSmallCrop(crop)
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
      {small && !out && !item.video ? <small className={item.fromLink ? 'adsw-hint' : 'adsw-warn'} style={{ margin: 0 }}>{item.fromLink ? fix?.linkSmall ?? copy.files.small : copy.files.small}</small> : null}
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
  presenterAiLabel = 'AI',
  onMake,
  editor = null,
  scenes = null,
  makeLabel = null,
  makeRef,
  formatName = null,
}: {
  /** KINEO-ADS-MELHORIAS-1410 — o nome do formato fora do 9:16 ("Portrait 4:5"); null = "vertical 9:16" de sempre. */
  formatName?: string | null
  /** KINEO-ADS-FLUXO-2026-10-13 — o rótulo do cartão de revisão ("Gerar · N créditos", do mesmo `cost`) e o ref do botão (a barra do celular repassa o clique). */
  makeLabel?: string | null
  makeRef?: Ref<HTMLButtonElement>
  /** KINEO-ADS-CENA-2026-10-13 — anúncio de produto: sem "Your place" (vira "Final look"); com cena, as cenas criadas dizem a cena. */
  scenes?: { product: boolean; scene: string | null; sc: AdsV2SceneCopy } | null
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
  /** KINEO-ATORES-IA-2026-10-13 — o selo "AI" ao lado do nome do apresentador escolhido, na língua da tela. */
  presenterAiLabel?: string
  onMake: () => void
  /** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — editar a narração e as frases de tela antes de gerar (grátis; PATCH no pedido). */
  editor?: {
    fix: AdsV2FixCopy
    edit: { narration: string; overlays: string[] } | null
    busy: boolean
    note: { warn: boolean; text: string } | null
    limits: { narration_words: number; overlay_chars: number }
    voiceOn: boolean
    onStart: () => void
    onChange: (next: { narration: string; overlays: string[] }) => void
    onSave: () => void
    onCancel: () => void
  } | null
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
                <b>{i + 1}. {scenes?.product && s.role === 'place' ? scenes.sc.plan.finalLook : simpleLabel(copy, ADS_V2_ROLE_LABELS[s.role] ?? s.role)} · {s.cut_seconds} s</b>
                <span>{scenes?.scene && s.source === 'generated_scene' ? adsV2SceneRow(scenes.sc, scenes.scene) : simpleLabel(copy, describeShot(s))}{styleName(s.effect) ? <> · ✨ {styleName(s.effect)}</> : null}</span>
              </span>
            </li>
          )
        })}
        <li>
          <span className="th"><span>{plan.shots.length + 1}</span></span>
          <span className="tx"><b>{plan.shots.length + 1}. {copy.plan.lastFrame}</b><span>{copy.plan.lastFrameDesc}</span></span>
        </li>
      </ol>
      {scenes?.scene ? <p className="adsw-hint" data-kineo="ads-plan-scene">🎬 <b>{scenes.sc.preview.scene}:</b> {scenes.scene}</p> : null}
      {plan.style_asked && !plan.style ? <p className="adsw-hint">{styleCopy.noProduct}</p> : null}
      {plan.presenter ? <p className="adsw-hint">🎙 <b>{presenterCopy.title}</b> · {presenterCopy.planLine}{adsV2PresenterById(plan.presenter_id) ? ` · ${adsV2PresenterById(plan.presenter_id)!.name} (${presenterAiLabel})` : ''}</p> : plan.presenter_asked ? <p className="adsw-hint">{presenterCopy.notApplied}</p> : null}
      <h3>{copy.plan.words}</h3>
      {editor?.edit ? (
        // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — prospecção de 12/10: no modo simples não dava para corrigir uma frase da voz
        // ("transforms your skin", "made in British") sem replanejar. Um campo por frase, com o limite da duração.
        <div className="adv2s-copyedit" data-kineo="ads-copy-edit">
          <p className="adsw-hint" style={{ margin: '0 0 10px' }}>{editor.fix.editTitle}</p>
          {plan.overlays.map((o, i) => (
            <label key={`${o.role}-${o.start}`} className="adsw-f">
              <span>{fill(editor.fix.line, { n: i + 1 })}</span>
              <small>{fill(editor.fix.lineHint, { max: editor.limits.overlay_chars })}</small>
              <input
                type="text"
                value={editor.edit?.overlays[i] ?? ''}
                maxLength={editor.limits.overlay_chars}
                disabled={editor.busy}
                onChange={(e) => {
                  const cur = editor.edit
                  if (!cur) return
                  const overlays = cur.overlays.slice()
                  overlays[i] = e.target.value
                  editor.onChange({ ...cur, overlays })
                }}
              />
            </label>
          ))}
          {editor.voiceOn ? (
            <label className="adsw-f">
              <span>{editor.fix.voice}</span>
              <small className={adsV2CountWords(editor.edit.narration) > editor.limits.narration_words ? 'adsw-warn' : undefined}>
                {fill(editor.fix.words, { n: adsV2CountWords(editor.edit.narration), max: editor.limits.narration_words })}
              </small>
              <textarea
                className="adsw-ta"
                rows={3}
                maxLength={400}
                value={editor.edit.narration}
                disabled={editor.busy}
                onChange={(e) => {
                  const cur = editor.edit
                  if (cur) editor.onChange({ ...cur, narration: e.target.value })
                }}
              />
            </label>
          ) : null}
          <div className="adv2-actions" style={{ marginTop: 6 }}>
            <button type="button" className="adsw-btn small" disabled={editor.busy} onClick={editor.onSave}>{editor.busy ? editor.fix.saving : editor.fix.save}</button>
            <button type="button" className="adsw-btn ghost small" disabled={editor.busy} onClick={editor.onCancel}>{editor.fix.cancel}</button>
          </div>
        </div>
      ) : (
        <>
          {plan.overlays.length ? (
            <ul className="adv2-lines">{plan.overlays.map((o) => <li key={`${o.role}-${o.start}`}>{o.text}</li>)}</ul>
          ) : (
            <p className="adsw-hint" style={{ margin: '0 0 18px' }}>{copy.plan.noWords}</p>
          )}
          <div className="adv2-voice">
            <b>{copy.plan.voice}</b>
            {narrationOn && plan.narration ? <p>{plan.narration}</p> : <p className="off">{copy.plan.noVoice}</p>}
          </div>
          {editor && (plan.overlays.length || editor.voiceOn) ? (
            <button type="button" className="adsw-btn ghost small" data-kineo="ads-copy-edit-open" disabled={busy !== null} onClick={editor.onStart} style={{ marginBottom: 12 }}>
              ✎ {editor.fix.edit}
            </button>
          ) : null}
        </>
      )}
      {editor?.note ? <p className={editor.note.warn ? 'adsw-warn' : 'adsw-hint'} role="status">{editor.note.text}</p> : null}
      <p className="adv2-total">{fill(copy.plan.total, { s: Math.round(plan.total_seconds * 10) / 10, c: sample ? 0 : cost ?? '' }).split('vertical 9:16').join(formatName ?? 'vertical 9:16')}</p>{/* KINEO-ADS-MELHORIAS-1410 — o formato do plano */}
      {sample ? <p className="adsw-hint">{sample.note}</p> : null}
      {short > 0 ? (
        <p className="adsw-warn">{fill(copy.tiers.needMore, { n: short })} <Link className="adsw-link" href="/pricing" target="_blank" rel="noopener">{copy.tiers.getCredits}</Link></p>
      ) : null}
      {three ? <VariationToggle on={three.on} onChange={three.onChange} single={single} copy={three.copy} disabled={busy !== null} /> : null}
      <div className="adv2-actions">
        <button ref={makeRef} type="button" className="adsw-btn" disabled={busy !== null || cost === null || short > 0 || !!editor?.edit} onClick={onMake}>
          {busy === 'start' ? copy.plan.starting : sample ? sample.make : three?.on ? fill(three.copy.make, { c: cost ?? '' }) : makeLabel ?? fill(copy.plan.make, { c: cost ?? '' })}
        </button>
      </div>
      {editor?.edit ? <p className="adsw-hint">{editor.fix.saveFirst}</p> : null}
    </>
  )
}

// ─── grade das cenas (progresso) ─────────────────────────────────────────────────────────────

function SimpleShotGrid({
  shots,
  orderStatus,
  copy,
  packshotLabel,
  redo,
}: {
  shots: AdsV2ScreenShot[]
  orderStatus: string
  copy: AdsV2SimpleCopy
  packshotLabel?: string
  /** KINEO-ADS-MELHORIAS-1410 — só na entrega: "Refazer esta cena" por cena (a regra é canRedoShot, a mesma do modo completo). */
  redo?: { copy: AdsV2RedoCopy; ask: number | null; busy: boolean; onAsk: (idx: number) => void; onCancel: () => void; onConfirm: (shot: AdsV2ScreenShot) => void }
}) {
  if (!shots.length) return <p className="adsw-hint" role="status">{copy.progress.preparing}</p>
  return (
    <ol className="adv2-grid" aria-label={copy.plan.shots}>
      {shots.map((s, i) => {
        const label = s.packshot && packshotLabel ? packshotLabel : simpleLabel(copy, shotStateLabel(s, orderStatus)) // KINEO-ADS-MELHORIAS-1410 — "Sua foto real" na língua da tela
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
            {redo && canRedoShot(s, orderStatus) ? (
              redo.ask === s.idx ? (
                <div role="group" aria-label={adsV2RedoFill(redo.copy.ask, { n: i + 1, c: s.retake_credits })} style={{ display: 'grid', gap: 6 }} data-kineo="ads-redo-confirm">
                  <span className="adsw-hint" style={{ margin: 0 }}>{adsV2RedoFill(redo.copy.ask, { n: i + 1, c: s.retake_credits })}</span>
                  <button type="button" className="adsw-btn small" disabled={redo.busy} onClick={() => redo.onConfirm(s)}>{redo.busy ? redo.copy.starting : redo.copy.yes}</button>
                  <button type="button" className="adsw-btn ghost small" disabled={redo.busy} onClick={redo.onCancel}>{redo.copy.cancel}</button>
                </div>
              ) : (
                <button type="button" className="adsw-btn ghost small" disabled={redo.busy} onClick={() => redo.onAsk(s.idx)} data-kineo="ads-redo-scene">
                  {adsV2RedoFill(redo.copy.button, { c: s.retake_credits })}
                </button>
              )
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
