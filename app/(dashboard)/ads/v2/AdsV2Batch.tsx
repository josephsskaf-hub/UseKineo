'use client'

// KINEO-ADS-LOTE-1310 — o MODO LOTE do /ads/v2 (?mode=batch). Fundador 13/10: "manda fazer … lote agora".
//
// O anunciante põe vários anúncios na fila de uma vez — vários produtos (foto ou link) ou o mesmo produto em vários
// níveis/estilos/ator (botão "Duplicate"). Três passos, nada é cobrado antes do 3º:
//   1. cada linha: fotos (ou o link do produto, pelo /api/ads/v2/link-import de sempre), o que é, nível, estilo, ator;
//   2. "Write all scripts": cada linha sobe as fotos e o quadro final, vira rascunho (/api/ads/v2/orders) e o lote escreve
//      os roteiros (POST /api/ads/v2/batch action 'plan' = N × o /plan de sempre). A tela mostra cada roteiro e o custo;
//   3. "Generate N ads": o total EXATO (soma do preço de cada linha — adsV2Credits, a mesma função que o /start debita) vai
//      junto; o servidor recusa se mudou. Os anúncios saem EM FILA (um por vez — é a regra da conta), cada um cobrado só
//      quando começa. A fila para na 1ª recusa e a tela diz quais começaram e quais não.
// Conta free/trial (amostra grátis): o lote é do Business — a tela mostra a oferta com os números do servidor
// (page.tsx → lib/businessPlan.ts businessAdsOffer), nunca digitados aqui. Eventos: só no servidor.

import { useCallback, useEffect, useRef, useState } from 'react'
import { downloadVideoFile } from '@/lib/videoDownload'
import { AdsUploadError, uploadFootage } from '@/lib/ads/uploadFootage'
import { drawEndCard, endCardCtaLabel, loadLogoImage, toPngFile } from '@/lib/ads/endCard'
import { ADS_V2_TIER_IDS, adsV2Credits, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import { ADS_V2_CROP, ADS_V2_SCREEN_SECONDS, adFileSlug, adsV2ErrorMessage, cropRect, failedOrderMessage } from '@/lib/ads/v2Screen'
import { ADS_V2_SIMPLE_COPY, defaultPhotoKind, inferSector, simpleTitle } from '@/lib/ads/v2Simple'
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC, type AdsV2StyleChoice } from '@/lib/ads/v2Styles'
import { ADS_V2_PRESENTER_COPY, ADS_V2_PRESENTER_PUBLIC } from '@/lib/ads/v2Presenter'
import { adsV2AiLabelNotice } from '@/lib/ads/v2AiLabel'
import { adsV2LinkImportError, adsV2LinkImportCopy, ADS_V2_LINK_IMPORT_MAX_IMAGES } from '@/lib/ads/v2LinkImport'
import { adsV2LinkHost } from '@/lib/ads/v2SimpleUx'
import { detectNarrationLanguage, narrationLanguage } from '@/lib/textLanguage'
import { ADS_V2_BATCH_MAX_ROWS } from '@/lib/ads/v2BatchRules'
import { ADS_V2_LINK_MAX_CHARS, ADS_V2_SENTENCE_MAX_CHARS } from '@/lib/ads/v2Contract'
import type { AdsBusinessOffer } from '@/lib/ads/afterSample'

// ─── tipos ────────────────────────────────────────────────────────────────────────────────────

interface BatchPhoto {
  key: string
  name: string
  srcUrl: string
  footageId: string | null
}
interface PlanOutcome {
  ok: boolean
  code?: string
  message?: string
  hint?: string
  credits?: number
  narration?: string | null
  overlays?: { text: string }[]
  style?: string | null
  style_asked?: string | null
  presenter?: boolean
  presenter_asked?: boolean
}
interface BatchRow {
  key: string
  text: string
  link: string
  linkRead: string | null
  linkBusy: boolean
  linkNote: string | null
  photos: BatchPhoto[]
  tier: AdsV2Tier
  style: AdsV2StyleChoice
  presenter: boolean
  orderId: string | null
  /** assinatura do que gerou o rascunho e o plano (mudou = rascunho e roteiro novos). */
  planSig: string | null
  plan: PlanOutcome | null
  error: string | null
}
interface ViewRow {
  row: number
  order_id: string
  status: string
  tier: string
  seconds: number
  credits: number | null
  charged: number
  queued: boolean
  sentence: string | null
  business: string | null
  narration: string | null
  presenter: boolean
  video_id: string | null
  error: string | null
}
interface BatchView {
  batch_id: string
  rows: ViewRow[]
  stopped: { code: string; row: number } | null
  active: boolean
  queued_left: number
  credits_queued: number
}
interface OrderLive {
  ready: number
  total: number
  videoUrl: string | null
  videoId: string | null
}

type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

// ─── constantes ───────────────────────────────────────────────────────────────────────────────

const POLL_MS = 10_000
const MAX_PHOTOS_PER_ROW = 3
const DEFAULT_TIER: AdsV2Tier = 'commercial'
const TIER_NAMES = ADS_V2_SIMPLE_COPY.en.tiers
const PRESENTER = ADS_V2_PRESENTER_COPY.en
const LINK_COPY = adsV2LinkImportCopy('en')
const BATCH_CSS = `
.adv2 .adv2b-rows{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.adv2 .adv2b-row{border:1px solid var(--ads-line);border-radius:14px;padding:14px;background:var(--ads-bg);display:grid;gap:10px;min-width:0}
.adv2 .adv2b-row h3{margin:0;font-size:15px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}
.adv2 .adv2b-row textarea,.adv2 .adv2b-row input[type=url],.adv2 .adv2b-row select{width:100%;min-width:0;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit}
.adv2 .adv2b-row textarea{min-height:64px;resize:vertical}
.adv2 .adv2b-linkrow{display:flex;gap:8px;flex-wrap:wrap}
.adv2 .adv2b-linkrow input{flex:1 1 200px}
.adv2 .adv2b-photos{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.adv2 .adv2b-photo{position:relative;width:64px;aspect-ratio:9/16;border-radius:8px;overflow:hidden;border:1px solid var(--ads-line);background:#0b1018}
.adv2 .adv2b-photo img{width:100%;height:100%;object-fit:cover;display:block}
.adv2 .adv2b-photo button{position:absolute;top:2px;right:2px;min-height:0;padding:0 6px;border-radius:6px;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:12px;line-height:20px;cursor:pointer}
.adv2 .adv2b-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}
.adv2 .adv2b-opts label{display:grid;gap:4px;font-size:13px;font-weight:650;color:var(--ads-text)}
.adv2 .adv2b-check{display:flex !important;gap:8px;align-items:center;font-weight:600 !important}
.adv2 .adv2b-total{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;margin:16px 0 0;font-size:14px}
.adv2 .adv2b-total b{font-size:18px}
.adv2 .adv2b-script{margin:0;padding:10px 12px;border-radius:10px;background:var(--ads-card);border:1px solid var(--ads-line);font-size:13.5px;line-height:1.55;white-space:pre-wrap}
.adv2 .adv2b-state{font-size:13px;font-weight:650}
.adv2 .adv2b-state[data-tone=ok]{color:var(--ads-action)}
.adv2 .adv2b-state[data-tone=bad]{color:var(--ads-error)}
.adv2 .adv2b-state[data-tone=wait]{color:var(--ads-muted)}
.adv2 .adv2b-upsell{display:grid;gap:10px}
@media(max-width:640px){.adv2 .adv2b-row{padding:12px}.adv2 .adv2b-photo{width:56px}}
`

// ─── utilidades ───────────────────────────────────────────────────────────────────────────────

async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
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

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const errText = (r: { code: string; body: Record<string, unknown> }) =>
  adsV2ErrorMessage(r.code, { needed: num(r.body.needed), balance: num(r.body.balance), credits: num(r.body.credits), message: typeof r.body.message === 'string' ? r.body.message : undefined })
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}

/** Recorte 9:16 ao centro, 1080×1920 JPEG (a mesma régua do modo simples: ADS_V2_CROP + cropRect). */
async function cropCenter(p: BatchPhoto): Promise<File> {
  const img = await loadImage(p.srcUrl)
  const r = cropRect(img.naturalWidth, img.naturalHeight, 0.5, 0.5)
  const canvas = document.createElement('canvas')
  canvas.width = ADS_V2_CROP.width
  canvas.height = ADS_V2_CROP.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ADS_V2_CROP.width, ADS_V2_CROP.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, ADS_V2_CROP.width, ADS_V2_CROP.height)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), ADS_V2_CROP.type, ADS_V2_CROP.quality))
  const base = (p.name || 'photo').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'photo'
  return new File([blob], `${base}-9x16.jpg`, { type: ADS_V2_CROP.type })
}

function emptyRow(): BatchRow {
  return { key: newKey(), text: '', link: '', linkRead: null, linkBusy: false, linkNote: null, photos: [], tier: DEFAULT_TIER, style: 'none', presenter: false, orderId: null, planSig: null, plan: null, error: null }
}
const rowCost = (r: Pick<BatchRow, 'tier'>) => adsV2Credits(r.tier, ADS_V2_SCREEN_SECONDS)
const rowSig = (r: BatchRow) => JSON.stringify({ t: r.text.replace(/\s+/g, ' ').trim(), l: r.linkRead, tier: r.tier, s: r.style, p: r.presenter, ph: r.photos.map((p) => p.key) })
const rowTitle = (text: string) => simpleTitle(text.replace(/\s+/g, ' ').trim()) || 'Product'

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

// ─── a oferta do Business (conta sem o Studio Ads) ────────────────────────────────────────────

export function AdsBatchUpsell({ business }: { business: AdsBusinessOffer | null }) {
  return (
    <section className="adv2-card adv2b-upsell" data-kineo="ads-batch-upsell">
      <h2>Batch mode is part of Business</h2>
      {business ? (
        <p className="adsw-lead">
          Queue many product ads at once and they render one after another while you do something else. Business is {business.price}/month with {business.credits} credits — about {business.ads} ads of {business.seconds} s.
        </p>
      ) : (
        <p className="adsw-lead">Queue many product ads at once and they render one after another while you do something else.</p>
      )}
      <div className="adv2-actions">
        <a className="adsw-btn" href={business?.checkoutHref ?? '/pricing#business'}>Get Business</a>
        <a className="adsw-btn ghost" href={business?.pageHref ?? '/pricing#business'}>See what is included</a>
        <a className="adsw-btn ghost" href="/ads/v2">Make one ad instead</a>
      </div>
    </section>
  )
}

// ─── a sessão do lote ─────────────────────────────────────────────────────────────────────────

export function AdsV2BatchSession({ balance, onBalance, sample = false, business = null }: { balance: number | null; onBalance: () => void | Promise<void>; sample?: boolean; business?: AdsBusinessOffer | null }) {
  const [phase, setPhase] = useState<'loading' | 'build' | 'progress'>('loading')
  const [rows, setRows] = useState<BatchRow[]>(() => [emptyRow()])
  const [busy, setBusy] = useState<null | 'plan' | 'start'>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsPlan, setNeedsPlan] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [view, setView] = useState<BatchView | null>(null)
  const [live, setLive] = useState<Record<string, OrderLive>>({})
  const [progressNote, setProgressNote] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  /** Recomeça a consulta depois de retomar/parar a fila (o laço para sozinho quando o lote termina). */
  const [pollKey, setPollKey] = useState(0)
  const aliveRef = useRef(true)
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const liveRef = useRef(live)
  liveRef.current = live
  const urlsRef = useRef<Set<string>>(new Set())
  /** Foto já enviada (chave → footage): a linha duplicada não sobe a mesma foto duas vezes. */
  const uploadedRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    aliveRef.current = true
    const urls = urlsRef.current
    return () => {
      aliveRef.current = false
      for (const u of urls) {
        try { URL.revokeObjectURL(u) } catch { /* ignore */ }
      }
      urls.clear()
    }
  }, [])

  // Retomar: ?batch=<id>, ou o lote mais novo com fila/andamento.
  useEffect(() => {
    if (sample) return
    let cancelled = false
    ;(async () => {
      let wanted: string | null = null
      try {
        const b = new URLSearchParams(window.location.search).get('batch')
        if (b && /^[0-9a-f-]{36}$/i.test(b)) wanted = b.toLowerCase()
      } catch {
        wanted = null
      }
      if (!wanted) {
        const r = await api<{ batch?: BatchView | null }>('/api/ads/v2/batch?latest=1')
        const b = r.ok ? r.data.batch : null
        if (b && (b.active || b.queued_left > 0)) wanted = b.batch_id
      }
      if (cancelled) return
      if (wanted) {
        setBatchId(wanted)
        setPhase('progress')
      } else setPhase('build')
    })()
    return () => {
      cancelled = true
    }
  }, [sample])

  // ── o que a pessoa montou, derivado ──
  const total = rows.reduce((s, r) => s + rowCost(r), 0)
  const planned = rows.filter((r) => r.plan?.ok && r.orderId && r.planSig === rowSig(r))
  const plannedTotal = planned.reduce((s, r) => s + (r.plan?.credits ?? rowCost(r)), 0)
  const canAdd = rows.length < ADS_V2_BATCH_MAX_ROWS && (balance === null || total + adsV2Credits(DEFAULT_TIER, ADS_V2_SCREEN_SECONDS) <= balance)
  const overBalance = balance !== null && total > balance
  const allPlanned = rows.length > 0 && planned.length === rows.length
  // KINEO-ADS-FLUXO-2026-10-13 — a conta do lote antes de gerar ("3 products × 2 styles = 6 ads · N credits"): produtos = textos/links
  // diferentes, estilos = estilos diferentes; o "×…=" só aparece quando a grade fecha de verdade. O total é o MESMO `total` de cima.
  const mathProducts = new Set(rows.map((r) => r.linkRead ?? (r.text.replace(/\s+/g, ' ').trim().toLowerCase() || r.key))).size
  const mathStyles = new Set(rows.map((r) => r.style)).size
  const mathGrid = rows.length > 1 && mathProducts * mathStyles === rows.length && mathProducts > 1 && mathStyles > 1

  function updateRow(key: string, patch: Partial<BatchRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function trackUrl(u: string) {
    urlsRef.current.add(u)
    return u
  }
  function addRow() {
    if (!canAdd) return
    setRows((prev) => [...prev, emptyRow()])
  }
  function duplicateRow(key: string) {
    if (!canAdd) return
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key)
      if (i < 0) return prev
      const src = prev[i]
      const copy: BatchRow = { ...src, key: newKey(), linkBusy: false, linkNote: null, orderId: null, planSig: null, plan: null, error: null, photos: src.photos.map((p) => ({ ...p })) }
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      return next
    })
  }
  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }
  function addPhotos(key: string, list: FileList | null) {
    if (!list) return
    const row = rowsRef.current.find((r) => r.key === key)
    if (!row) return
    const room = MAX_PHOTOS_PER_ROW - row.photos.length
    const files = Array.from(list).filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type)).slice(0, Math.max(0, room))
    if (!files.length) return
    const added = files.map((f) => ({ key: newKey(), name: f.name, srcUrl: trackUrl(URL.createObjectURL(f)), footageId: null }))
    updateRow(key, { photos: [...row.photos, ...added] })
  }
  function removePhoto(key: string, photoKey: string) {
    const row = rowsRef.current.find((r) => r.key === key)
    if (row) updateRow(key, { photos: row.photos.filter((p) => p.key !== photoKey) })
  }

  /** O link do produto: a rota de sempre guarda até 3 fotos no NOSSO bucket; aqui elas entram como fotos da linha. */
  async function importLink(key: string) {
    const row = rowsRef.current.find((r) => r.key === key)
    if (!row || row.linkBusy) return
    const url = row.link.trim()
    if (!url) {
      updateRow(key, { linkNote: 'Paste the product page link first.' })
      return
    }
    updateRow(key, { linkBusy: true, linkNote: null })
    const r = await api<{ link?: string; host?: string; sentence?: string; images?: { footage_id: string; url: string }[] }>('/api/ads/v2/link-import', { method: 'POST', body: { url } })
    if (!aliveRef.current) return
    if (!r.ok) {
      updateRow(key, { linkBusy: false, linkNote: r.code.startsWith('moderation') || r.code === 'no_access' || r.code === 'closed' ? errText(r) : adsV2LinkImportError(r.code, LINK_COPY) })
      return
    }
    const host = typeof r.data.host === 'string' ? r.data.host : ''
    const added: BatchPhoto[] = []
    const cur = rowsRef.current.find((x) => x.key === key)
    const room = MAX_PHOTOS_PER_ROW - (cur?.photos.length ?? 0)
    for (const [i, im] of (Array.isArray(r.data.images) ? r.data.images.slice(0, Math.min(ADS_V2_LINK_IMPORT_MAX_IMAGES, room)) : []).entries()) {
      try {
        const res = await fetch(im.url, { cache: 'no-store' })
        if (!res.ok) continue
        const blob = await res.blob()
        added.push({ key: newKey(), name: `${(host || 'product').replace(/[^\w-]+/g, '-')}-${i + 1}.jpg`, srcUrl: trackUrl(URL.createObjectURL(blob)), footageId: null })
      } catch {
        /* foto que não baixou: as outras seguem */
      }
    }
    if (!aliveRef.current) return
    const now = rowsRef.current.find((x) => x.key === key)
    const suggested = typeof r.data.sentence === 'string' ? r.data.sentence.trim() : ''
    updateRow(key, {
      linkBusy: false,
      linkRead: typeof r.data.link === 'string' && r.data.link ? r.data.link : null,
      text: now && now.text.trim() ? now.text : suggested,
      photos: [...(now?.photos ?? []), ...added].slice(0, MAX_PHOTOS_PER_ROW),
      linkNote: added.length ? `Got ${added.length} photo${added.length === 1 ? '' : 's'} from ${host || url}.` : LINK_COPY.linkNoPhotos,
    })
  }

  /** Fotos recortadas, quadro final e rascunho de UMA linha; devolve o corpo do /plan (ou null com o erro na linha). */
  async function prepareRow(row: BatchRow): Promise<Record<string, unknown> | null> {
    const sentence = row.text.replace(/\s+/g, ' ').trim()
    if (!row.photos.length) {
      updateRow(row.key, { error: 'Add at least one photo, or paste the product link and press "Get photos".' })
      return null
    }
    if (!sentence && !row.linkRead) {
      updateRow(row.key, { error: 'Say what you sell in one sentence.' })
      return null
    }
    try {
      const photos: BatchPhoto[] = []
      for (const p of row.photos) {
        const known = p.footageId ?? uploadedRef.current.get(p.key) ?? null
        if (known) {
          photos.push({ ...p, footageId: known })
          continue
        }
        const up = await uploadFootage(await cropCenter(p))
        uploadedRef.current.set(p.key, up.footageId)
        photos.push({ ...p, footageId: up.footageId })
      }
      // Duplicadas reaproveitam a foto já enviada (mesma chave): grava o id em todas as linhas que a usam.
      setRows((prev) => prev.map((r) => ({ ...r, photos: r.photos.map((p) => photos.find((x) => x.key === p.key) ?? p) })))
      const language = narrationLanguage(detectNarrationLanguage(sentence).language) ?? 'en'
      const host = adsV2LinkHost(row.linkRead)
      // KINEO-ADS-CONSERTOS-TELA-1410 — a 1ª foto da linha (URL local blob:) entra no cartão final; não carregou = cartão sem a foto.
      let productImage: HTMLImageElement | null = null
      try { productImage = row.photos[0] ? await loadLogoImage(row.photos[0].srcUrl) : null } catch { productImage = null }
      const canvas = document.createElement('canvas')
      drawEndCard(canvas, { logo: null, business: rowTitle(sentence || host), offer: '', ctaLabel: host ? endCardCtaLabel('buy', language) : '', contact: host, brandBg: true, productImage })
      const card = await uploadFootage(await toPngFile(canvas))
      const sector = inferSector(sentence)
      const d = await api<{ order_id: string }>('/api/ads/v2/orders', {
        method: 'POST',
        body: { mode: 'simple', tier: row.tier, seconds: ADS_V2_SCREEN_SECONDS, sector, sentence: sentence || null, language, narration: true, overlays: true, price: null, contact: null, link: row.linkRead },
      })
      if (!d.ok) {
        updateRow(row.key, { error: errText(d) })
        return null
      }
      // A 1ª foto é o produto (o lote é de anúncio de produto; estilo e ator só pegam foto de produto). Tela de app nunca.
      const kind = defaultPhotoKind(sector)
      const firstKind = kind === 'text' ? 'text' : 'product'
      const presenterOn = ADS_V2_PRESENTER_PUBLIC && row.presenter && firstKind === 'product'
      updateRow(row.key, { orderId: d.data.order_id })
      return {
        order_id: d.data.order_id,
        mode: 'simple',
        sector,
        logo_footage_id: null,
        photos: photos.map((p, i) => ({ footage_id: p.footageId, kind: i === 0 ? firstKind : kind })),
        card_footage_id: card.footageId,
        facts: [],
        ...(ADS_V2_STYLES_PUBLIC && row.style !== 'none' ? { style: row.style } : {}),
        ...(presenterOn ? { presenter: true } : {}),
        scripts: false, // KINEO-ADS-FLUXO-2026-10-13 — o lote não pede os 2–3 roteiros (contrato codex/ads-roteiros-1310): um roteiro por linha
      }
    } catch (e) {
      updateRow(row.key, { error: e instanceof AdsUploadError ? e.message : 'A photo could not be prepared. Try another photo.' })
      return null
    }
  }

  async function writeScripts() {
    if (busy) return
    setBusy('plan')
    setError(null)
    setNeedsPlan(false)
    try {
      const todo = rowsRef.current.filter((r) => !(r.plan?.ok && r.orderId && r.planSig === rowSig(r)))
      const bodies: { key: string; sig: string; body: Record<string, unknown> }[] = []
      for (const [i, r] of todo.entries()) {
        setNote(`Preparing product ${i + 1} of ${todo.length}…`)
        updateRow(r.key, { error: null, plan: null, planSig: null })
        const body = await prepareRow(r)
        if (!aliveRef.current) return
        if (body) bodies.push({ key: r.key, sig: rowSig(r), body })
      }
      if (!bodies.length) return
      setNote(`Writing ${bodies.length} script${bodies.length === 1 ? '' : 's'}… (about 10 seconds each)`)
      const res = await api<{ rows: (PlanOutcome & { order_id: string })[] }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'plan', rows: bodies.map((b) => b.body) } })
      if (!aliveRef.current) return
      if (!res.ok) {
        if (res.code === 'no_access') setNeedsPlan(true)
        setError(errText(res))
        return
      }
      for (const b of bodies) {
        const o = res.data.rows.find((x) => x.order_id === b.body.order_id)
        if (!o) continue
        updateRow(b.key, o.ok ? { plan: o, planSig: b.sig, error: null } : { plan: o, planSig: null, error: o.code === 'skipped' ? 'Not written: the batch stopped before this product (see the message above).' : o.code === 'time_budget' ? 'Not written yet: press "Write all scripts" again.' : adsV2ErrorMessage(o.code ?? null, { message: o.message }) + (o.hint ? ` ${o.hint}` : '') })
      }
      const stop = res.data.rows.find((x) => !x.ok && x.code && x.code !== 'skipped' && x.code !== 'time_budget' && ['daily_limit', 'no_access', 'closed', 'v2_closed', 'unavailable', 'not_ready'].includes(x.code))
      if (stop) setError(adsV2ErrorMessage(stop.code ?? null, { message: stop.message }))
    } finally {
      if (aliveRef.current) {
        setBusy(null)
        setNote(null)
      }
    }
  }

  async function generate() {
    if (busy || !allPlanned || overBalance) return
    setBusy('start')
    setError(null)
    try {
      const orderIds = planned.map((r) => r.orderId as string)
      const r = await api<{ batch_id: string; credits_total: number; tick?: { state: string; code?: string } }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'start', batch_id: batchId, order_ids: orderIds, expected_credits: plannedTotal } })
      if (!aliveRef.current) return
      void onBalance()
      if (!r.ok) {
        setError(r.code === 'price_changed' ? `The total changed to ${num(r.body.credits) ?? '?'} credits. Write the scripts again to see the new price.` : errText(r))
        return
      }
      setBatchId(r.data.batch_id)
      setUrlParams({ batch: r.data.batch_id })
      setView(null)
      setPhase('progress')
    } finally {
      if (aliveRef.current) setBusy(null)
    }
  }

  // ── progresso: o estado do lote + o /status de cada pedido em andamento (é ele que avança o anúncio) ──
  const refresh = useCallback(async (id: string): Promise<BatchView | null> => {
    const r = await api<{ batch?: BatchView | null }>(`/api/ads/v2/batch?batch=${encodeURIComponent(id)}`)
    if (!r.ok || !r.data.batch) return null
    let v = r.data.batch
    const next: Record<string, OrderLive> = { ...liveRef.current }
    for (const row of v.rows) {
      const known = next[row.order_id]
      const active = row.status === 'generating' || row.status === 'assembling'
      if (!active && !(row.status === 'delivered' && !known?.videoUrl)) continue
      const s = await api<{ status?: string; shots?: { state: string }[]; video?: { id: string; video_url: string | null } | null }>(`/api/ads/v2/status?order_id=${encodeURIComponent(row.order_id)}`)
      if (!s.ok) continue
      const shots = Array.isArray(s.data.shots) ? s.data.shots : []
      next[row.order_id] = { ready: shots.filter((x) => x.state === 'ready').length, total: shots.length, videoUrl: s.data.video?.video_url ?? null, videoId: s.data.video?.id ?? null }
    }
    if (aliveRef.current) setLive(next)
    // A fila anda: nada em andamento e ainda há linha esperando = o próximo da fila começa (pelo /start de sempre).
    if (!v.active && v.queued_left > 0 && !v.stopped) {
      const t = await api<{ tick?: { state: string } }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'tick', batch_id: id } })
      if (t.ok && t.data.tick && (t.data.tick.state === 'started' || t.data.tick.state === 'stopped')) {
        void onBalance()
        const again = await api<{ batch?: BatchView | null }>(`/api/ads/v2/batch?batch=${encodeURIComponent(id)}`)
        if (again.ok && again.data.batch) v = again.data.batch
      }
    }
    return v
  }, [onBalance])

  useEffect(() => {
    if (phase !== 'progress' || !batchId) return
    let timer: number | null = null
    let stop = false
    const loop = async () => {
      const v = await refresh(batchId)
      if (stop || !aliveRef.current) return
      if (v) {
        setView(v)
        setProgressNote(null)
      } else setProgressNote('Could not read the batch right now. Retrying…')
      const finished = v && !v.active && (v.queued_left === 0 || !!v.stopped)
      if (!finished) timer = window.setTimeout(loop, POLL_MS)
    }
    void loop()
    return () => {
      stop = true
      if (timer) window.clearTimeout(timer)
    }
  }, [phase, batchId, refresh, pollKey])

  async function stopQueue() {
    if (!batchId) return
    const r = await api('/api/ads/v2/batch', { method: 'POST', body: { action: 'cancel', batch_id: batchId } })
    if (!r.ok) setProgressNote(errText(r))
    setPollKey((k) => k + 1)
  }

  async function resume() {
    if (!batchId || !view) return
    const left = view.rows.filter((r) => r.status === 'planned')
    if (!left.length) return
    const credits = left.reduce((s, r) => s + (r.credits ?? 0), 0)
    const r = await api<{ batch_id: string }>('/api/ads/v2/batch', { method: 'POST', body: { action: 'start', batch_id: batchId, order_ids: left.map((x) => x.order_id), expected_credits: credits } })
    void onBalance()
    if (!r.ok) {
      setProgressNote(errText(r))
      return
    }
    setProgressNote(null)
    setPollKey((k) => k + 1)
  }

  async function downloadAll() {
    if (!view || downloading) return
    setDownloading(true)
    try {
      for (const row of view.rows) {
        const l = live[row.order_id]
        if (row.status !== 'delivered' || !l?.videoUrl) continue
        await downloadVideoFile({ url: l.videoUrl, filename: `${adFileSlug(row.business || rowTitle(row.sentence ?? ''))}-ad-${row.row + 1}.mp4`, exportType: 'clean', surface: 'ads', videoId: l.videoId, extra: { order_id: row.order_id, v2: true, mode: 'batch' } })
      }
    } catch {
      setProgressNote('Some downloads did not start. Use the Download button on each ad.')
    } finally {
      if (aliveRef.current) setDownloading(false)
    }
  }

  function newBatch() {
    setUrlParams({ batch: null })
    setBatchId(null)
    setView(null)
    setLive({})
    setRows([emptyRow()])
    setPhase('build')
  }

  // ── tela ──
  if (sample || needsPlan) return (<><style dangerouslySetInnerHTML={{ __html: BATCH_CSS }} /><AdsBatchUpsell business={business} /></>)
  if (phase === 'loading') return <section className="adv2-card"><p className="adsw-lead">Loading…</p></section>

  if (phase === 'progress') {
    const delivered = view ? view.rows.filter((r) => r.status === 'delivered' && live[r.order_id]?.videoUrl) : []
    return (
      <section className="adv2-card" data-kineo="ads-batch-progress">
        <style dangerouslySetInnerHTML={{ __html: BATCH_CSS }} />
        <h2>Your batch</h2>
        <p className="adsw-lead">Ads are made one after another. You can close this page — the queue keeps going and each ad appears in your library when it is ready. Each ad is charged only when it starts.</p>
        {!view ? <p className="adsw-hint">{progressNote ?? 'Loading…'}</p> : (
          <>
            <ol className="adv2b-rows">
              {view.rows.map((r) => {
                const l = live[r.order_id]
                const [label, tone] = rowState(r, view, l)
                return (
                  <li key={r.order_id} className="adv2b-row">
                    <h3>
                      <span>{r.row + 1}. {r.business || rowTitle(r.sentence ?? '')}</span>
                      <span className="adv2b-state" data-tone={tone}>{label}</span>
                    </h3>
                    <span className="adsw-hint" style={{ margin: 0 }}>{TIER_NAMES[r.tier as AdsV2Tier]?.name ?? r.tier} · {r.seconds} s · {r.credits ?? '?'} credits{r.presenter ? ` · ${PRESENTER.title}` : ''}</span>
                    {r.status === 'failed' ? <span className="adsw-err">{failedOrderMessage(r.error)}</span> : null}
                    {r.status === 'delivered' && l?.videoUrl ? (
                      <div className="adv2-actions" style={{ marginTop: 0 }}>
                        <a className="adsw-btn small ghost" href={l.videoUrl} target="_blank" rel="noopener noreferrer">Watch</a>
                        <button type="button" className="adsw-btn small" onClick={() => void downloadVideoFile({ url: l.videoUrl as string, filename: `${adFileSlug(r.business || rowTitle(r.sentence ?? ''))}-ad-${r.row + 1}.mp4`, exportType: 'clean', surface: 'ads', videoId: l.videoId, extra: { order_id: r.order_id, v2: true, mode: 'batch' } })}>Download</button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
            {view.stopped ? (
              <p className="adv2-note" role="alert">
                {view.stopped.code === 'cancelled' ? 'You stopped the queue. The ads that had not started were not charged.' : `The queue stopped at ad ${view.stopped.row + 1}: ${adsV2ErrorMessage(view.stopped.code)} Ads that had not started were not charged.`}
              </p>
            ) : null}
            {delivered.length ? <p className="adv2-note" role="note">{adsV2AiLabelNotice('en')}</p> : null}
            {progressNote ? <p className="adsw-err" role="alert">{progressNote}</p> : null}
            <div className="adv2-actions">
              {delivered.length > 1 ? <button type="button" className="adsw-btn" disabled={downloading} onClick={() => void downloadAll()}>{downloading ? 'Downloading…' : `Download all (${delivered.length})`}</button> : null}
              {view.stopped && view.rows.some((r) => r.status === 'planned') ? (
                <button type="button" className="adsw-btn" onClick={() => void resume()}>
                  Resume · {view.rows.filter((r) => r.status === 'planned').reduce((s, r) => s + (r.credits ?? 0), 0)} credits
                </button>
              ) : null}
              {view.stopped && view.stopped.code === 'out_of_credits' ? <a className="adsw-btn ghost" href="/pricing" target="_blank" rel="noopener noreferrer">Get credits</a> : null}
              {!view.stopped && view.queued_left > 0 ? <button type="button" className="adsw-btn ghost" onClick={() => void stopQueue()}>Stop the queue</button> : null}
              <button type="button" className="adsw-btn ghost" onClick={newBatch}>New batch</button>
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <section className="adv2-card" data-kineo="ads-batch-build">
      <style dangerouslySetInnerHTML={{ __html: BATCH_CSS }} />
      <h2>Make many ads at once</h2>
      <p className="adsw-lead">
        Add up to {ADS_V2_BATCH_MAX_ROWS} ads — different products, or the same product in different levels and styles. First we write every script (free); then you generate them all and they render one after another.
      </p>
      <ol className="adv2b-rows">
        {rows.map((r, i) => {
          const fresh = r.plan?.ok && r.planSig === rowSig(r)
          return (
            <li key={r.key} className="adv2b-row">
              <h3>
                <span>Ad {i + 1}</span>
                <span className="adv2-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="adsw-btn small ghost" disabled={!canAdd || busy !== null} onClick={() => duplicateRow(r.key)}>Duplicate</button>
                  {rows.length > 1 ? <button type="button" className="adsw-btn small ghost" disabled={busy !== null} onClick={() => removeRow(r.key)}>Remove</button> : null}
                </span>
              </h3>
              <label className="adv2b-opts" style={{ display: 'grid' }}>
                <span style={{ fontSize: 13, fontWeight: 650 }}>What do you sell?</span>
                <textarea value={r.text} maxLength={ADS_V2_SENTENCE_MAX_CHARS} disabled={busy !== null} placeholder="LUME eau de parfum, a light floral scent that lasts all day" onChange={(e) => updateRow(r.key, { text: e.target.value })} />
              </label>
              <div className="adv2b-linkrow">
                <input type="url" inputMode="url" value={r.link} maxLength={ADS_V2_LINK_MAX_CHARS} disabled={busy !== null || r.linkBusy} placeholder="Or paste the product link (https://…)" onChange={(e) => updateRow(r.key, { link: e.target.value })} />
                <button type="button" className="adsw-btn small ghost" disabled={busy !== null || r.linkBusy || r.photos.length >= MAX_PHOTOS_PER_ROW} onClick={() => void importLink(r.key)}>{r.linkBusy ? 'Reading…' : 'Get photos'}</button>
              </div>
              {r.linkNote ? <span className="adsw-hint" style={{ margin: 0 }}>{r.linkNote}</span> : null}
              <div className="adv2b-photos">
                {r.photos.map((p) => (
                  <span key={p.key} className="adv2b-photo">
                    <img src={p.srcUrl} alt="" />
                    <button type="button" aria-label="Remove photo" disabled={busy !== null} onClick={() => removePhoto(r.key, p.key)}>×</button>
                  </span>
                ))}
                {r.photos.length < MAX_PHOTOS_PER_ROW ? (
                  <label className="adsw-btn small ghost" style={{ cursor: 'pointer' }}>
                    {r.photos.length ? 'Add photo' : 'Add product photos'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy !== null} onChange={(e) => { addPhotos(r.key, e.target.files); e.target.value = '' }} />
                  </label>
                ) : null}
              </div>
              <div className="adv2b-opts">
                <label>
                  Level
                  <select value={r.tier} disabled={busy !== null} onChange={(e) => updateRow(r.key, { tier: e.target.value as AdsV2Tier })}>
                    {ADS_V2_TIER_IDS.map((t) => <option key={t} value={t}>{TIER_NAMES[t].name} · {adsV2Credits(t, ADS_V2_SCREEN_SECONDS)} credits</option>)}
                  </select>
                </label>
                {ADS_V2_STYLES_PUBLIC ? (
                  <label>
                    Style
                    <select value={r.style} disabled={busy !== null} onChange={(e) => updateRow(r.key, { style: e.target.value as AdsV2StyleChoice })}>
                      <option value="none">No special effect</option>
                      {/* KINEO-ESTILOS-DIA1-2026-10-13 — o estilo de época leva o selo no nome da opção. */}
                      {ADS_V2_STYLES.map((s) => <option key={s.key} value={s.key}>{s.season === 'holiday' ? `${s.label} · Holiday` : s.label}</option>)}
                    </select>
                  </label>
                ) : null}
                {ADS_V2_PRESENTER_PUBLIC ? (
                  <label className="adv2b-check">
                    <input type="checkbox" checked={r.presenter} disabled={busy !== null} onChange={(e) => updateRow(r.key, { presenter: e.target.checked })} />
                    {PRESENTER.title} (optional)
                  </label>
                ) : null}
              </div>
              {r.error ? <span className="adsw-err" role="alert">{r.error}</span> : null}
              {fresh && r.plan ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <span className="adsw-hint" style={{ margin: 0 }}>Script · {r.plan.credits} credits{r.plan.style ? ' · with style' : r.plan.style_asked ? ' · style needs a product photo (left out)' : ''}{r.plan.presenter ? ` · ${PRESENTER.planLine}` : r.plan.presenter_asked ? ` · ${PRESENTER.notApplied}` : ''}</span>
                  <p className="adv2b-script">{r.plan.narration || (r.plan.overlays ?? []).map((o) => o.text).join(' · ') || 'No voice-over.'}</p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="adv2-actions">
        <button type="button" className="adsw-btn ghost" disabled={!canAdd || busy !== null} onClick={addRow}>+ Add another ad</button>
      </div>
      <p className="adv2b-total" aria-live="polite">
        {/* KINEO-ADS-FLUXO-2026-10-13 — a conta do lote, à vista antes de gerar. */}
        <span data-kineo="ads-batch-math">{mathProducts} product{mathProducts === 1 ? '' : 's'} {mathGrid ? '×' : '·'} {mathStyles} style{mathStyles === 1 ? '' : 's'} {mathGrid ? '=' : '·'} {rows.length} ad{rows.length === 1 ? '' : 's'} · {total} credits</span>
        <span>Total: <b>{total} credits</b> for {rows.length} ad{rows.length === 1 ? '' : 's'}</span>
        {balance !== null ? <span>You have {balance} credits · {Math.max(0, balance - total)} left after this batch</span> : null}
      </p>
      {overBalance ? <p className="adsw-err" role="alert">This batch needs {total} credits and you have {balance}. Remove an ad or pick a lower level — or <a href="/pricing" target="_blank" rel="noopener noreferrer">get credits</a>.</p> : null}
      {!canAdd && rows.length < ADS_V2_BATCH_MAX_ROWS && !overBalance ? <p className="adsw-hint">Your balance covers {rows.length} ad{rows.length === 1 ? '' : 's'} at these levels.</p> : null}
      {note ? <p className="adsw-hint" role="status">{note}</p> : null}
      {error ? <p className="adsw-err" role="alert">{error}</p> : null}
      <div className="adv2-actions">
        <button type="button" className={allPlanned ? 'adsw-btn ghost' : 'adsw-btn'} disabled={busy !== null || allPlanned} onClick={() => void writeScripts()}>
          {busy === 'plan' ? 'Writing scripts…' : allPlanned ? 'Scripts written' : 'Write all scripts (free)'}
        </button>
        <button type="button" className="adsw-btn" disabled={busy !== null || !allPlanned || overBalance} onClick={() => void generate()}>
          {busy === 'start' ? 'Starting…' : `Generate ${planned.length || rows.length} ad${(planned.length || rows.length) === 1 ? '' : 's'} · ${allPlanned ? plannedTotal : total} credits`}
        </button>
      </div>
      <p className="adsw-hint">Nothing is charged until you press Generate. Each ad is charged only when it starts; if one is refused (credits, daily limit, content check), the queue stops there and nothing after it is charged.</p>
    </section>
  )
}

function rowState(r: ViewRow, v: BatchView, l: OrderLive | undefined): [string, 'ok' | 'bad' | 'wait'] {
  if (r.status === 'delivered') return ['Ready', 'ok']
  if (r.status === 'failed') return ['Failed — credits returned', 'bad']
  if (r.status === 'cancelled') return ['Cancelled', 'bad']
  if (r.status === 'generating' || r.status === 'assembling') return [r.status === 'assembling' ? 'Editing the ad…' : l && l.total ? `Making… ${l.ready}/${l.total} shots` : 'Making…', 'wait']
  if (r.status === 'planned' && v.stopped) return ['Not started — not charged', 'bad']
  if (r.status === 'planned' && r.queued) return ['In the queue', 'wait']
  return ['Not in the queue', 'wait']
}
