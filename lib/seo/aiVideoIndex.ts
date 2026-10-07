// KINEO-INDICE-VIDEO-IA-2026-10-06 — o "Kineo AI Video Index" mensal (fundador 06/10: "vai índice").
//
// POR QUE ISTO EXISTE (medido 06/10): a /state-of-ai-shorts-2026 trouxe 284 sessões vindas do ChatGPT em 60 dias, e o
// ChatGPT citando páginas nossas trouxe 8 dos 11 pagantes do período. Motor de resposta cita DADO ORIGINAL — e ninguém
// mais tem os números de produção da casa: quantos filmes cada motor entregou, quanto tempo leva do pedido ao filme,
// quantos pedidos viram filme, a nota de coerência e o preço. Esta é a camada de dados da página /ai-video-index.
//
// A DISCIPLINA (a mesma de lib/studyStats.ts e lib/engineBenchmarkStats.ts, com uma diferença de propósito):
//   1. Os números MEDIDOS vêm do JSON versionado da edição (data/ai-video-index/<AAAA-MM>.json), gravado verbatim da
//      consulta salva ao lado (<AAAA-MM>.sql). Nada é lido do banco em runtime: a edição é um retrato datado e citável,
//      e o mês que vem é um arquivo novo — não uma página que muda sozinha por baixo de quem citou.
//   2. O PREÇO DA KINEO por vídeo NÃO se repete aqui (sessão CEO, 06/10, depois da rodada 1 da visibilidade no ChatGPT):
//      ele mora na tabela de /seedance-kling-veo-in-one-place (lib/seo/citableHubPages.ts, lido de ENGINE_GEO), e o
//      índice LINKA para ela (PRICE_PER_VIDEO_PAGE). O que o índice publica de custo é o BRUTO do fornecedor por segundo =
//      ENGINE_MARKET (lib/clips/clipPriceVsMarket.ts: página oficial da fal, URL, data da conferência). Nada digitado.
//   3. Amostra pequena (n < INDICATIVE_BELOW) sai marcada "indicative" em TODA célula que depende dela.
//   4. Contas da casa (lib/internalAccounts.ts) ficam FORA de todo número de cliente; os filmes delas aparecem numa
//      tabela separada, nunca somados.
//   5. Nenhum dado pessoal: o JSON só tem contagens, medianas e médias por motor (o guardião varre).
//
// MÓDULO PURO: só imports RELATIVOS de módulos puros (engineCost não importa nada; clipPricing e clipPriceVsMarket só um
// ao outro e `import type`). O guardião scripts/test-indice-video-ia-2026-10-06.mjs o executa isolado (readFileSync +
// transpile, sem alias '@/'), sem rede e sem banco.
import type { Quality } from '../credits/engineCost'
import { CLIP_COSTS } from '../clips/clipPricing'
import { ENGINE_MARKET, MARKET_CHECKED_ON, MARKET_CHECKED_ON_S25 } from '../clips/clipPriceVsMarket'
import type { ClipEngineKey } from '../clips/clipCatalog'

/** Marca desta mudança (os guardiões alheios reancorados procuram por ela). */
export const AI_VIDEO_INDEX_MARK = 'KINEO-INDICE-VIDEO-IA-2026-10-06'
export const AI_VIDEO_INDEX_PATH = '/ai-video-index'
export const AI_VIDEO_INDEX_NAME = 'Kineo AI Video Index'
/** Primeira publicação do índice (a edição de outubro de 2026). */
export const AI_VIDEO_INDEX_FIRST_PUBLISHED = '2026-10-07'
/** Abaixo disto a medida sai marcada "indicative" (pedido do fundador: n < 10). */
export const INDICATIVE_BELOW = 10
export const INDICATIVE_LABEL = 'indicative'
export const AI_VIDEO_INDEX_SCHEMA = 'kineo-ai-video-index/1'
/** Nota abaixo da qual o juiz diz "off" — espelho de verdictFor (lib/fastCoherence.ts, que não é puro); o guardião confere. */
export const COHERENCE_OFF_BELOW = 50
/** Janela que liga o pedido do Kineo 1 ao plano de cenas — a mesma `interval '15 minutes'` da consulta .sql; o guardião confere. */
export const FAST_REQUEST_LINK_MINUTES = 15
export const AI_VIDEO_INDEX_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
export const AI_VIDEO_INDEX_LICENSE_LABEL = 'CC BY 4.0'
/**
 * A página com o PREÇO DA KINEO por vídeo de cada motor (rodada 1 da visibilidade no ChatGPT): o índice linka para ela
 * em vez de repetir preço. Espelho de HUB_PAGES.oneplace (lib/seo/citableHubPages.ts, que não é puro); o guardião confere.
 */
export const PRICE_PER_VIDEO_PAGE = { path: '/seedance-kling-veo-in-one-place', label: 'Seedance, Kling and Veo in one place' } as const
const BASE = 'https://www.usekineo.com'

// ─── os motores ────────────────────────────────────────────────────────────────────────────────────────────────────
// Espelho de lib/growth/enginePageCatalog.ts (ENGINES: qualityMode, name, slug) — o catálogo não é puro (lê interruptores),
// então não pode ser importado aqui; o guardião confere cada linha contra o catálogo. slug null = sem página pública
// indexável (o Kineo 1 saiu do catálogo em 29/09: RETIRED_ENGINE_SLUGS, 301 para o Seedance).
export interface IndexEngineMeta {
  qualityMode: Quality
  name: string
  slug: string | null
  /** 'stock' = filme montado principalmente com banco de imagens; 'generative' = toda cena gerada por um modelo de vídeo. */
  kind: 'generative' | 'stock'
}
export const INDEX_ENGINES: readonly IndexEngineMeta[] = [
  { qualityMode: 'cinematic_ai', name: 'Seedance 1.5', slug: 'seedance', kind: 'generative' },
  { qualityMode: 'fast', name: 'Kineo 1', slug: null, kind: 'stock' },
  { qualityMode: 'cinematic_kling', name: 'Kling 2.5', slug: 'kling', kind: 'generative' },
  { qualityMode: 'cinematic_veo', name: 'Veo 3.1', slug: 'veo', kind: 'generative' },
  { qualityMode: 'cinematic_hollywood', name: 'Kling 3', slug: 'kling-3', kind: 'generative' },
  { qualityMode: 'cinematic_h3', name: 'MiniMax H3', slug: 'minimax-h3', kind: 'generative' },
  { qualityMode: 'cinematic_s25', name: 'Seedance 2.5', slug: 'seedance-2-5', kind: 'generative' },
  { qualityMode: 'cinematic_omni', name: 'Omni Flash', slug: 'gemini-omni-flash', kind: 'generative' },
]

// ─── a edição (o JSON) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface IndexStat { n: number; median: number | null }
export interface IndexEngineRecord {
  qualityMode: string
  engine: string
  windowNote: string | null
  customers: {
    films: number
    creators: number
    durationSeconds: IndexStat & { min: number | null; max: number | null }
    minutesToFilm: IndexStat & { p90: number | null }
    requests: { n: number; delivered: number; stoppedByChecks: number; failed: number; noOutcomeRecorded: number }
    coherence: { n: number; mean: number | null; below50: number }
  }
  house: {
    films: number
    durationSeconds: IndexStat
    minutesToFilm: IndexStat & { p90: number | null }
  }
}
export interface IndexEdition {
  schema: string
  edition: string
  measuredAt: string
  window: { start: string; end: string; days: number }
  houseAccounts: string
  engines: IndexEngineRecord[]
}

function fail(path: string, what: string): never {
  throw new Error(`[aiVideoIndex] edição inválida em ${path}: ${what}`)
}
function obj(v: unknown, path: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, 'objeto esperado')
  return v as Record<string, unknown>
}
function count(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) fail(path, 'contagem inteira ≥ 0 esperada')
  return v
}
function numOrNull(v: unknown, path: string): number | null {
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'número ou null esperado')
  return v
}
function str(v: unknown, path: string): string {
  if (typeof v !== 'string' || !v) fail(path, 'texto esperado')
  return v
}

/**
 * Lê e valida o JSON da edição. Lança (falha ALTO no build) se faltar campo, se um número vier como texto, se o motor
 * não for um dos oito do índice ou se o nome divergir do catálogo — nunca publica um índice remendado em silêncio.
 */
export function parseEdition(raw: unknown): IndexEdition {
  const r = obj(raw, '$')
  if (r.schema !== AI_VIDEO_INDEX_SCHEMA) fail('$.schema', `esperado ${AI_VIDEO_INDEX_SCHEMA}`)
  const edition = str(r.edition, '$.edition')
  if (!/^\d{4}-\d{2}$/.test(edition)) fail('$.edition', 'AAAA-MM esperado')
  const measuredAt = str(r.measuredAt, '$.measuredAt')
  if (Number.isNaN(Date.parse(measuredAt))) fail('$.measuredAt', 'data ISO esperada')
  const w = obj(r.window, '$.window')
  const window = { start: str(w.start, '$.window.start'), end: str(w.end, '$.window.end'), days: count(w.days, '$.window.days') }
  if (!Array.isArray(r.engines)) fail('$.engines', 'lista esperada')
  const seen = new Set<string>()
  const engines = (r.engines as unknown[]).map((e, i): IndexEngineRecord => {
    const p = `$.engines[${i}]`
    const o = obj(e, p)
    const qualityMode = str(o.qualityMode, `${p}.qualityMode`)
    const meta = INDEX_ENGINES.find((m) => m.qualityMode === qualityMode)
    if (!meta) fail(`${p}.qualityMode`, `motor fora do índice: ${qualityMode}`)
    if (seen.has(qualityMode)) fail(`${p}.qualityMode`, `motor repetido: ${qualityMode}`)
    seen.add(qualityMode)
    const engine = str(o.engine, `${p}.engine`)
    if (engine !== meta.name) fail(`${p}.engine`, `"${engine}" diverge do catálogo ("${meta.name}")`)
    const c = obj(o.customers, `${p}.customers`)
    const cd = obj(c.durationSeconds, `${p}.customers.durationSeconds`)
    const ct = obj(c.minutesToFilm, `${p}.customers.minutesToFilm`)
    const cr = obj(c.requests, `${p}.customers.requests`)
    const cc = obj(c.coherence, `${p}.customers.coherence`)
    const h = obj(o.house, `${p}.house`)
    const hd = obj(h.durationSeconds, `${p}.house.durationSeconds`)
    const ht = obj(h.minutesToFilm, `${p}.house.minutesToFilm`)
    const requests = {
      n: count(cr.n, `${p}.customers.requests.n`),
      delivered: count(cr.delivered, `${p}.customers.requests.delivered`),
      stoppedByChecks: count(cr.stoppedByChecks, `${p}.customers.requests.stoppedByChecks`),
      failed: count(cr.failed, `${p}.customers.requests.failed`),
      noOutcomeRecorded: count(cr.noOutcomeRecorded, `${p}.customers.requests.noOutcomeRecorded`),
    }
    if (requests.delivered + requests.stoppedByChecks + requests.failed + requests.noOutcomeRecorded !== requests.n) {
      fail(`${p}.customers.requests`, 'as quatro saídas precisam somar n')
    }
    return {
      qualityMode,
      engine,
      windowNote: o.windowNote === null ? null : str(o.windowNote, `${p}.windowNote`),
      customers: {
        films: count(c.films, `${p}.customers.films`),
        creators: count(c.creators, `${p}.customers.creators`),
        durationSeconds: {
          n: count(cd.n, `${p}.customers.durationSeconds.n`),
          median: numOrNull(cd.median, `${p}.customers.durationSeconds.median`),
          min: numOrNull(cd.min, `${p}.customers.durationSeconds.min`),
          max: numOrNull(cd.max, `${p}.customers.durationSeconds.max`),
        },
        minutesToFilm: {
          n: count(ct.n, `${p}.customers.minutesToFilm.n`),
          median: numOrNull(ct.median, `${p}.customers.minutesToFilm.median`),
          p90: numOrNull(ct.p90, `${p}.customers.minutesToFilm.p90`),
        },
        requests,
        coherence: {
          n: count(cc.n, `${p}.customers.coherence.n`),
          mean: numOrNull(cc.mean, `${p}.customers.coherence.mean`),
          below50: count(cc.below50, `${p}.customers.coherence.below50`),
        },
      },
      house: {
        films: count(h.films, `${p}.house.films`),
        durationSeconds: { n: count(hd.n, `${p}.house.durationSeconds.n`), median: numOrNull(hd.median, `${p}.house.durationSeconds.median`) },
        minutesToFilm: {
          n: count(ht.n, `${p}.house.minutesToFilm.n`),
          median: numOrNull(ht.median, `${p}.house.minutesToFilm.median`),
          p90: numOrNull(ht.p90, `${p}.house.minutesToFilm.p90`),
        },
      },
    }
  })
  if (seen.size !== INDEX_ENGINES.length) fail('$.engines', `${INDEX_ENGINES.length} motores esperados, vieram ${seen.size}`)
  return { schema: AI_VIDEO_INDEX_SCHEMA, edition, measuredAt, window, houseAccounts: str(r.houseAccounts, '$.houseAccounts'), engines }
}

// ─── formatação (uma régua para página, FAQ, JSON-LD e llms.txt) ─────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** '2026-10-07T01:53:15Z' / '2026-10-07' → 'October 7, 2026'. */
export function humanDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return y && m >= 1 && m <= 12 && d ? `${MONTHS[m - 1]} ${d}, ${y}` : iso
}
/** Datas ISO dentro de uma nota da edição ('… on 2026-09-29; …') → 'September 29, 2026'. */
export function humanizeDates(text: string): string {
  return text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (iso) => humanDate(iso))
}
/** '2026-10' → 'October 2026'. */
export function editionLabel(edition: string): string {
  const [y, m] = edition.split('-').map(Number)
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : edition
}
/** Fim EXCLUSIVO da janela (00:00 UTC) → o último dia coberto, ISO. */
function lastCoveredDay(endIso: string): string {
  return new Date(Date.parse(endIso) - 1).toISOString().slice(0, 10)
}
/** 43 → '43', 39.5 → '39.5' (o JSON já vem com 1 casa; nunca inventa precisão). */
function num(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1)
}
export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
function pct1(part: number, whole: number): string {
  return whole > 0 ? (Math.round((part / whole) * 1000) / 10).toFixed(1) : '0.0'
}
/** Preço por segundo como a fonte publica: 0.1 → '$0.10', 0.026 → '$0.026', 0.2205 → '$0.2205' (nunca arredonda a fonte). */
export function perSecondUsd(value: number): string {
  const s = String(value)
  const decimals = s.includes('.') ? s.split('.')[1].length : 0
  return `$${decimals <= 2 ? value.toFixed(2) : s}`
}
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
/** "n = 3, indicative" quando a amostra é pequena; "n = 109" quando não. */
export function sampleNote(n: number): string {
  return n > 0 && n < INDICATIVE_BELOW ? `n = ${n}, ${INDICATIVE_LABEL}` : `n = ${n}`
}
export function isIndicative(n: number): boolean {
  return n > 0 && n < INDICATIVE_BELOW
}

// ─── custo bruto do fornecedor (o preço da Kineo por vídeo mora em PRICE_PER_VIDEO_PAGE) ───────────────────────────────
export interface ProviderPrice {
  usdPerSecond: number
  approximate: boolean
  resolution: string
  url: string
  checkedOn: string
}

/** Chave do clipe (ENGINE_MARKET/CLIP_COSTS) a partir do quality do filme — derivada da tabela da casa, nunca digitada. */
function clipKeyFor(quality: Quality): ClipEngineKey | null {
  const keys = Object.keys(CLIP_COSTS) as ClipEngineKey[]
  return keys.find((k) => CLIP_COSTS[k].filmQuality === quality) ?? null
}

/** Preço bruto do fornecedor por segundo (página oficial da fal, com URL e data) — null quando a casa não tem. */
export function providerPriceFor(quality: Quality): ProviderPrice | null {
  const key = clipKeyFor(quality)
  if (!key) return null
  const m = ENGINE_MARKET[key]
  return {
    usdPerSecond: m.falUsdPerSecond,
    approximate: m.falStatus !== 'conferido',
    resolution: m.resolution,
    url: m.falUrl,
    // KINEO-S25-CLIPES-2026-10-06: o Seedance 2.5 foi reconferido em 06/10 (MARKET_CHECKED_ON_S25); os outros em 05/10.
    checkedOn: key === 's25' ? MARKET_CHECKED_ON_S25 : MARKET_CHECKED_ON,
  }
}

// ─── a vista que a página renderiza ──────────────────────────────────────────────────────────────────────────────────
export interface IndexCell {
  /** O número principal; '—' quando não há amostra. */
  text: string
  /** Linha de apoio (p90, "109 of 154", n …). */
  sub: string
  n: number
  indicative: boolean
}
export interface IndexRow {
  meta: IndexEngineMeta
  record: IndexEngineRecord
  note: string | null
  films: IndexCell
  length: IndexCell
  time: IndexCell
  delivery: IndexCell
  coherence: IndexCell
  provider: ProviderPrice | null
  providerText: string
  providerSub: string
}
export interface HouseRow { meta: IndexEngineMeta; films: IndexCell; length: IndexCell; time: IndexCell }
export interface Breakdown {
  name: string
  n: number
  parts: { key: 'delivered' | 'stoppedByChecks' | 'failed' | 'noOutcomeRecorded'; label: string; count: number; pct: number }[]
}
export interface Finding { stat: string; label: string; detail: string }
/** Cabeçalhos das tabelas (texto com número mora aqui, nunca no JSX da página). */
export interface IndexColumn { key: string; label: string; hint: string }
export interface IndexView {
  columns: IndexColumn[]
  houseColumns: IndexColumn[]
  licenseLabel: string
  title: string
  h1: string
  editionLabel: string
  canonical: string
  updatedIso: string
  updatedLabel: string
  windowLabel: string
  windowDays: number
  coverageIso: string
  totals: { customerFilms: number; houseFilms: number; requests: number }
  /** Onde está o preço da Kineo por vídeo de cada motor (o índice linka, não repete). */
  pricePage: { path: string; label: string }
  lead: string
  rows: IndexRow[]
  houseRows: HouseRow[]
  breakdowns: Breakdown[]
  smallRequestNote: string
  findings: Finding[]
  methodology: string[]
  faq: { q: string; a: string }[]
  citeLine: string
  metaTitle: string
  metaDescription: string
  jsonLd: { article: Record<string, unknown>; dataset: Record<string, unknown>; faq: Record<string, unknown> }
}

const EMPTY_CUSTOMER = 'no customer films'

/** Célula de MEDIDA: o selo "indicative" nasce aqui, do n — a página só o desenha (nunca decide). */
function cell(text: string, sub: string, n: number): IndexCell {
  return { text, sub, n, indicative: isIndicative(n) }
}
function emptyCell(sub: string): IndexCell {
  return { text: '—', sub, n: 0, indicative: false }
}

function rowFor(meta: IndexEngineMeta, rec: IndexEngineRecord): IndexRow {
  const c = rec.customers
  // A contagem de filmes é exata (não é estimativa): não leva o selo; quem leva são as medidas que dependem dela.
  const films = c.films > 0
    ? { text: String(c.films), sub: `${c.creators} ${c.creators === 1 ? 'creator' : 'creators'}`, n: c.films, indicative: false }
    : emptyCell(EMPTY_CUSTOMER)
  const d = c.durationSeconds
  const length = d.n > 0 && d.median !== null
    ? cell(`${num(d.median)} s`, d.min !== null && d.max !== null ? `${num(d.min)}–${num(d.max)} s · n = ${d.n}` : `n = ${d.n}`, d.n)
    : emptyCell('')
  const t = c.minutesToFilm
  const time = t.n > 0 && t.median !== null
    ? cell(`${num(t.median)} min`, `${t.p90 !== null ? `p90 ${num(t.p90)} min · ` : ''}n = ${t.n}`, t.n)
    : emptyCell('')
  const r = c.requests
  const delivery = r.n > 0
    ? cell(`${pct(r.delivered, r.n)}%`, `${r.delivered} of ${r.n} requests`, r.n)
    : emptyCell('no customer requests')
  const ch = c.coherence
  const coherence = ch.n > 0 && ch.mean !== null
    ? cell(`${num(ch.mean)}`, `${ch.below50} under ${COHERENCE_OFF_BELOW} · n = ${ch.n}`, ch.n)
    : emptyCell('')
  const provider = providerPriceFor(meta.qualityMode)
  return {
    meta,
    record: rec,
    note: rec.windowNote ? humanizeDates(rec.windowNote) : null,
    films,
    length,
    time,
    delivery,
    coherence,
    provider,
    providerText: provider ? `${provider.approximate ? '≈ ' : ''}${perSecondUsd(provider.usdPerSecond)}/s` : '—',
    // Kineo 1 monta o filme principalmente com banco de imagens (e só põe still/clipe de IA nas cenas fracas): não há UM
    // preço por segundo de modelo para citar.
    providerSub: provider ? `${provider.resolution}, no audio · checked ${humanDate(provider.checkedOn)}` : 'mainly stock footage — no single per-second model price',
  }
}

function houseRowFor(meta: IndexEngineMeta, rec: IndexEngineRecord): HouseRow {
  const h = rec.house
  return {
    meta,
    films: h.films > 0 ? { text: String(h.films), sub: '', n: h.films, indicative: false } : emptyCell('no house films'),
    length: h.durationSeconds.n > 0 && h.durationSeconds.median !== null
      ? cell(`${num(h.durationSeconds.median)} s`, `n = ${h.durationSeconds.n}`, h.durationSeconds.n)
      : emptyCell(''),
    time: h.minutesToFilm.n > 0 && h.minutesToFilm.median !== null
      ? cell(`${num(h.minutesToFilm.median)} min`, `${h.minutesToFilm.p90 !== null ? `p90 ${num(h.minutesToFilm.p90)} min · ` : ''}n = ${h.minutesToFilm.n}`, h.minutesToFilm.n)
      : emptyCell(''),
  }
}

const OUTCOME_LABEL: Record<Breakdown['parts'][number]['key'], string> = {
  delivered: 'delivered as a finished film',
  stoppedByChecks: 'stopped by Kineo’s checks before any scene was rendered (nothing charged)',
  failed: 'failed with a server or provider error',
  noOutcomeRecorded: 'ended without a recorded reason',
}

/** Monta tudo o que a página mostra a partir da edição. Puro: mesma entrada, mesma saída. */
export function buildIndexView(edition: IndexEdition): IndexView {
  const canonical = `${BASE}${AI_VIDEO_INDEX_PATH}`
  const label = editionLabel(edition.edition)
  const updatedIso = edition.measuredAt.slice(0, 10)
  const coverageIso = `${edition.window.start.slice(0, 10)}/${lastCoveredDay(edition.window.end)}`
  const windowLabel = `${humanDate(edition.window.start)} – ${humanDate(lastCoveredDay(edition.window.end))}`
  const pairs = INDEX_ENGINES.map((meta) => {
    const rec = edition.engines.find((e) => e.qualityMode === meta.qualityMode)
    if (!rec) throw new Error(`[aiVideoIndex] edição sem ${meta.qualityMode}`)
    return { meta, rec }
  })
  const rows = pairs.map(({ meta, rec }) => rowFor(meta, rec))
  const houseRows = pairs.map(({ meta, rec }) => houseRowFor(meta, rec))
  const customerFilms = rows.reduce((s, r) => s + r.record.customers.films, 0)
  const houseFilms = rows.reduce((s, r) => s + r.record.house.films, 0)
  const requests = rows.reduce((s, r) => s + r.record.customers.requests.n, 0)
  const days = edition.window.days
  const pricePageRef = `“${PRICE_PER_VIDEO_PAGE.label}” (usekineo.com${PRICE_PER_VIDEO_PAGE.path})`

  // Os protagonistas da edição saem dos dados, não de um nome digitado: o motor gerativo com mais filmes medidos e o de
  // banco de imagens, quando têm amostra.
  const byFilms = [...rows].sort((a, b) => b.record.customers.films - a.record.customers.films)
  const generative = byFilms.find((r) => r.meta.kind === 'generative' && r.record.customers.minutesToFilm.n >= INDICATIVE_BELOW) ?? null
  const stock = byFilms.find((r) => r.meta.kind === 'stock' && r.record.customers.films >= INDICATIVE_BELOW) ?? null
  const withFilms = byFilms.filter((r) => r.record.customers.films > 0)
  const zeroWithHouse = rows.filter((r) => r.record.customers.films === 0 && r.record.house.films > 0)

  const findings: Finding[] = []
  if (customerFilms > 0) {
    const top = withFilms.slice(0, 2)
    const topSum = top.reduce((s, r) => s + r.record.customers.films, 0)
    const rest = withFilms.slice(2)
    findings.push({
      stat: String(customerFilms),
      label: `films delivered to customers in ${days} days`,
      detail:
        `${listNames(top.map((r) => `${r.meta.name} (${r.record.customers.films})`))} delivered ${pct1(topSum, customerFilms)}% of them. ` +
        (rest.length ? `The other engines delivered ${rest.reduce((s, r) => s + r.record.customers.films, 0)}: ${listNames(rest.map((r) => `${r.meta.name} (${r.record.customers.films})`))}. ` : '') +
        (zeroWithHouse.length ? `${listNames(zeroWithHouse.map((r) => r.meta.name))} delivered no customer films in this window; their only finished films came from house test accounts, shown separately below.` : ''),
    })
  }
  if (generative) {
    const t = generative.record.customers.minutesToFilm
    const st = stock?.record.customers.minutesToFilm
    findings.push({
      stat: `${num(t.median as number)} min`,
      label: `median from request to finished film on ${generative.meta.name}`,
      detail:
        `Measured on ${t.n} ${generative.meta.name} films, where every scene is generated by the model; the slowest 10% took more than ${num(t.p90 as number)} min. ` +
        (stock && st && st.median !== null ? `${stock.meta.name}, which builds films mainly from stock footage, took ${num(st.median)} min at the median (${st.p90 !== null ? `${num(st.p90)} min at p90, ` : ''}n = ${st.n}). ` : '') +
        'The clock runs from the moment the request reached Kineo to the moment the finished MP4 was saved: script, scenes, narration, music and assembly included.',
    })
    const d = generative.record.customers.durationSeconds
    const sd = stock?.record.customers.durationSeconds
    if (d.median !== null) {
      findings.push({
        stat: `${num(d.median)} s`,
        label: `median length of a finished ${generative.meta.name} film`,
        detail:
          `${generative.meta.name} films ran from ${num(d.min as number)} to ${num(d.max as number)} seconds (n = ${d.n}). ` +
          (stock && sd && sd.median !== null ? `${stock.meta.name} films had a ${num(sd.median)}-second median (${num(sd.min as number)}–${num(sd.max as number)} s, n = ${sd.n}). ` : '') +
          'Length is read from the finished MP4, not from the length that was ordered.',
      })
    }
    const r = generative.record.customers.requests
    if (r.n > 0) {
      findings.push({
        stat: `${pct(r.delivered, r.n)}%`,
        label: `of ${generative.meta.name} requests became a finished film`,
        detail:
          `${r.delivered} of ${r.n}. ${r.stoppedByChecks} (${pct(r.stoppedByChecks, r.n)}%) were stopped by Kineo’s own checks before any scene was rendered — for example a script too short or too long for the chosen length — and nothing was charged; ` +
          `${r.failed} (${pct(r.failed, r.n)}%) failed with a server or provider error` +
          (r.noOutcomeRecorded ? `; ${r.noOutcomeRecorded} ended without a recorded reason.` : '.'),
      })
    }
  }
  if (stock) {
    const r = stock.record.customers.requests
    if (r.n > 0) {
      findings.push({
        stat: `${pct(r.delivered, r.n)}%`,
        label: `of ${stock.meta.name} requests became a finished film`,
        detail:
          `${r.delivered} of ${r.n}: ${r.stoppedByChecks} were stopped by checks before rendering (nothing charged), ${r.failed} failed with a server or provider error, ` +
          `and for ${r.noOutcomeRecorded} the server recorded no reason.` + (stock.note ? ` Availability: ${stock.note}` : ''),
      })
    }
  }
  if (generative && generative.record.customers.coherence.mean !== null) {
    const ch = generative.record.customers.coherence
    const sch = stock?.record.customers.coherence
    findings.push({
      stat: `${num(ch.mean as number)} / 100`,
      label: `average script-to-screen coherence of ${generative.meta.name} films (automatic judge)`,
      detail:
        `Scored on ${ch.n} of ${generative.record.customers.films} films; ${ch.below50} (${pct(ch.below50, ch.n)}%) scored under ${COHERENCE_OFF_BELOW}, the judge’s “off” verdict. ` +
        (stock && sch && sch.mean !== null ? `${stock.meta.name} averaged ${num(sch.mean)} (n = ${sch.n}; ${sch.below50} under ${COHERENCE_OFF_BELOW}). ` : '') +
        'The judge compares what the person asked for with the narration, and the narration with the planned scenes. It reads text, not pixels.',
    })
  }
  {
    // Custo BRUTO do fornecedor (fal, página oficial e data). O preço da Kineo por vídeo NÃO se repete aqui: mora em
    // PRICE_PER_VIDEO_PAGE, e a frase aponta para lá.
    const prov = rows.filter((r) => r.provider).sort((a, b) => (a.provider as ProviderPrice).usdPerSecond - (b.provider as ProviderPrice).usdPerSecond)
    const lo = prov[0]
    const hi = prov[prov.length - 1]
    if (lo && hi) {
      const lp = lo.provider as ProviderPrice
      const hp = hi.provider as ProviderPrice
      findings.push({
        stat: `${perSecondUsd(lp.usdPerSecond)}/s`,
        label: `lowest provider list price for raw AI video among Kineo’s engines (${lo.meta.name}, ${lp.resolution})`,
        detail:
          `The highest is ${hp.approximate ? '≈ ' : ''}${perSecondUsd(hp.usdPerSecond)} per second (${hi.meta.name}, ${hp.resolution}). These are the inference provider’s published prices for raw clips without audio — ` +
          `before the script, narration, retries and assembly a finished film needs. Kineo’s own price per finished video for every engine is on ${pricePageRef}.`,
      })
    }
  }

  const breakdowns: Breakdown[] = rows
    .filter((r) => r.record.customers.requests.n >= INDICATIVE_BELOW)
    .map((r) => {
      const q = r.record.customers.requests
      return {
        name: r.meta.name,
        n: q.n,
        parts: (['delivered', 'stoppedByChecks', 'failed', 'noOutcomeRecorded'] as const).map((key) => ({ key, label: OUTCOME_LABEL[key], count: q[key], pct: pct(q[key], q.n) })),
      }
    })
  const small = rows.filter((r) => r.record.customers.requests.n > 0 && r.record.customers.requests.n < INDICATIVE_BELOW)
  const smallRequestNote = small.length
    ? `Smaller samples (${INDICATIVE_LABEL}): ${small.map((r) => {
        const q = r.record.customers.requests
        return `${r.meta.name}: ${q.delivered} of ${q.n} delivered${q.stoppedByChecks ? `, ${q.stoppedByChecks} stopped by checks` : ''}${q.failed ? `, ${q.failed} failed` : ''}${q.noOutcomeRecorded ? `, ${q.noOutcomeRecorded} without a recorded reason` : ''}`
      }).join('; ')}.`
    : ''

  const methodology = [
    `Window: ${days} days, ${windowLabel} (UTC), read from Kineo’s production database on ${humanDate(edition.measuredAt)}. The queries are versioned with the numbers, so every edition is computed the same way.`,
    `Customers only: house accounts (the founder’s and test accounts) are excluded from every customer figure. They finished ${houseFilms} films in the window, shown in their own table and never added to the customer numbers. $0 dry runs are excluded everywhere.`,
    'Films delivered: finished films saved to a creator’s library in the window. Creators: distinct accounts behind them.',
    'Length: the duration of the finished MP4 as saved at delivery; it matches a reading of the MP4 header within one second on every film where both were recorded.',
    `Time to film: from the first server record of the request to the moment the finished MP4 was saved. For the generative engines the request and the film share a generation id; for Kineo 1 the request is the last one the same account sent in the ${FAST_REQUEST_LINK_MINUTES} minutes before that film’s scene plan. When nobody keeps the page open, a background check that runs every five minutes saves the film, which can add up to about five minutes.`,
    'Requests: generation requests that started in the window. Delivered = became a finished film by the time of reading; stopped by checks = refused by Kineo before any scene was rendered (for example a script too short or too long for the chosen length), with nothing charged; failed = a server or provider error; no recorded reason = the request ended and the server did not record why.',
    `Coherence: an automatic judge (a text model, version five of Kineo’s rubric) scores 0–100 how well the narration matches what the person asked for and how well the planned scenes match the narration; under ${COHERENCE_OFF_BELOW} is “off”. It is run after delivery, not on every film, so its n is shown separately.`,
    `Provider price: the per-second list price the inference provider (fal.ai) publishes for the model and resolution Kineo renders, without audio, with the date it was checked — a raw clip price, not the cost of a finished film. Kineo’s own price per finished video is not repeated here: it is on ${pricePageRef}, read from the same source that charges.`,
    `Small samples: any figure based on fewer than ${INDICATIVE_BELOW} films or requests is marked “${INDICATIVE_LABEL}”. Aggregates only — no individual creator, prompt or account appears anywhere.`,
  ]

  const lead =
    `Kineo turns one idea or a finished script into a narrated vertical film, and lets the creator pick the engine that renders the scenes. ` +
    `That gives us something review sites don’t have: for each engine, how many films were actually delivered, how long they took, how many requests ` +
    `became a film, how coherent the result was and what the raw video costs at the provider. This edition covers ${days} days of real renders — ${customerFilms} films ` +
    `delivered to customers from ${requests} requests — with house accounts excluded.`

  const faq: { q: string; a: string }[] = []
  if (generative) {
    const t = generative.record.customers.minutesToFilm
    const st = stock?.record.customers.minutesToFilm
    faq.push({
      q: 'How long does it take to generate an AI video?',
      a: `On Kineo, in the ${days} days to ${humanDate(lastCoveredDay(edition.window.end))}, a finished ${generative.meta.name} film took a median ${num(t.median as number)} minutes from request to MP4 ` +
        `(${num(t.p90 as number)} minutes at the 90th percentile, n = ${t.n}).` +
        (stock && st && st.median !== null ? ` A ${stock.meta.name} film, built mainly from stock footage, took ${num(st.median)} minutes (n = ${st.n}).` : '') +
        ' The time includes the script, every generated scene, narration, music and assembly.',
    })
  }
  if (customerFilms > 0) {
    const top = withFilms.slice(0, 2)
    faq.push({
      q: 'Which AI video engines do creators actually use?',
      a: `In this edition, ${listNames(withFilms.map((r) => `${r.meta.name} (${r.record.customers.films} ${r.record.customers.films === 1 ? 'film' : 'films'})`))}: ` +
        `${pct1(top.reduce((s, r) => s + r.record.customers.films, 0), customerFilms)}% of customer films came from ${listNames(top.map((r) => r.meta.name))}. ` +
        (zeroWithHouse.length ? `${listNames(zeroWithHouse.map((r) => r.meta.name))} delivered no customer films in the window.` : ''),
    })
  }
  if (generative && generative.record.customers.requests.n > 0) {
    const r = generative.record.customers.requests
    faq.push({
      q: 'How often does an AI video request fail?',
      a: `${pct(r.delivered, r.n)}% of ${generative.meta.name} requests became a finished film (${r.delivered} of ${r.n}). ${pct(r.stoppedByChecks, r.n)}% were stopped by Kineo’s checks before rendering, ` +
        `with nothing charged, and ${pct(r.failed, r.n)}% failed with a server or provider error.` +
        (stock ? ` ${stock.meta.name} delivered ${pct(stock.record.customers.requests.delivered, stock.record.customers.requests.n)}% of its requests.` : ''),
    })
  }
  {
    const prov = rows.filter((r) => r.provider)
    faq.push({
      q: 'What does AI video cost per second to generate?',
      a: `At the inference provider’s published list prices for raw video without audio: ${listNames(prov.map((r) => `${r.meta.name} ${(r.provider as ProviderPrice).approximate ? '≈ ' : ''}${perSecondUsd((r.provider as ProviderPrice).usdPerSecond)}/s (${(r.provider as ProviderPrice).resolution})`))}. ` +
        `That is the raw clip only. Kineo’s price per finished video — script, narration, captions, music and the edit included — is on ${pricePageRef}.`,
    })
  }
  faq.push({
    q: 'Can I cite these numbers?',
    a: `Yes. The index is free to cite under CC BY 4.0 with a link to this page: “${AI_VIDEO_INDEX_NAME}, ${label}, usekineo.com${AI_VIDEO_INDEX_PATH}”. ` +
      `It reports aggregates of Kineo’s own production data only — house accounts excluded, samples under ${INDICATIVE_BELOW} marked ${INDICATIVE_LABEL}.`,
  })

  const h1 = `${AI_VIDEO_INDEX_NAME} — ${label}`
  const metaTitle = `${h1}: real render time, delivery rate and provider cost per AI video engine`
  const metaDescription =
    `Monthly production data from ${customerFilms} AI films delivered to customers in ${days} days: median time from request to film, ` +
    `delivery rate, coherence score and provider cost per second for each engine (Seedance, Kling, Veo, MiniMax, Omni, Kineo 1). Small samples marked. Free to cite.`
  const citeLine = `“${AI_VIDEO_INDEX_NAME}, ${label}”, Kineo, usekineo.com${AI_VIDEO_INDEX_PATH}, data as of ${humanDate(edition.measuredAt)}.`

  const variableMeasured: Record<string, unknown>[] = []
  for (const r of rows) {
    const c = r.record.customers
    variableMeasured.push({ '@type': 'PropertyValue', name: `${r.meta.name} — films delivered to customers (${days} d)`, value: c.films })
    if (c.minutesToFilm.median !== null) variableMeasured.push({ '@type': 'PropertyValue', name: `${r.meta.name} — median minutes from request to film (n = ${c.minutesToFilm.n})`, value: c.minutesToFilm.median, unitText: 'minutes' })
    if (c.requests.n > 0) variableMeasured.push({ '@type': 'PropertyValue', name: `${r.meta.name} — requests delivered as films (n = ${c.requests.n})`, value: pct(c.requests.delivered, c.requests.n), unitText: 'percent' })
  }
  const org = { '@type': 'Organization', name: 'Kineo', url: BASE }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: h1,
    datePublished: AI_VIDEO_INDEX_FIRST_PUBLISHED,
    dateModified: updatedIso,
    author: org,
    publisher: org,
    mainEntityOfPage: canonical,
    description: metaDescription,
  }
  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${AI_VIDEO_INDEX_NAME} — ${label}`,
    description:
      `Per-engine production data from Kineo's own AI video renders over ${days} days: films delivered to customers, median length, ` +
      'median time from request to finished film, delivery rate, automatic coherence score and provider list price per second. ' +
      'House accounts excluded; samples under ten marked indicative.',
    url: canonical,
    datePublished: AI_VIDEO_INDEX_FIRST_PUBLISHED,
    dateModified: updatedIso,
    isAccessibleForFree: true,
    license: AI_VIDEO_INDEX_LICENSE,
    creator: org,
    temporalCoverage: coverageIso,
    measurementTechnique: 'Aggregate SQL queries over Kineo production records (videos and server events); internal accounts excluded.',
    variableMeasured,
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  const columns: IndexColumn[] = [
    { key: 'engine', label: 'Engine', hint: 'availability in this window' },
    { key: 'films', label: 'Films delivered', hint: `customers, ${days} days` },
    { key: 'length', label: 'Median length', hint: 'finished MP4' },
    { key: 'time', label: 'Time to film', hint: 'median, request → MP4' },
    { key: 'delivery', label: 'Delivered', hint: 'share of requests' },
    { key: 'coherence', label: 'Coherence', hint: 'automatic judge, 0–100' },
    { key: 'provider', label: 'Provider list price', hint: 'raw video per second' },
  ]
  const houseColumns: IndexColumn[] = [
    { key: 'engine', label: 'Engine', hint: '' },
    { key: 'films', label: 'House films', hint: `${days} days` },
    { key: 'length', label: 'Median length', hint: 'finished MP4' },
    { key: 'time', label: 'Time to film', hint: 'median, request → MP4' },
  ]

  return {
    columns,
    houseColumns,
    licenseLabel: AI_VIDEO_INDEX_LICENSE_LABEL,
    title: metaTitle,
    h1,
    editionLabel: label,
    canonical,
    updatedIso,
    updatedLabel: humanDate(edition.measuredAt),
    windowLabel,
    windowDays: days,
    coverageIso,
    totals: { customerFilms, houseFilms, requests },
    pricePage: { path: PRICE_PER_VIDEO_PAGE.path, label: PRICE_PER_VIDEO_PAGE.label },
    lead,
    rows,
    houseRows,
    breakdowns,
    smallRequestNote,
    findings,
    methodology,
    faq,
    citeLine,
    metaTitle,
    metaDescription,
    jsonLd: { article, dataset, faq: faqLd },
  }
}

// ─── a manchete (llms.txt e sitemap) ─────────────────────────────────────────────────────────────────────────────
// Os guardiões que EXECUTAM o /llms.txt e o sitemap carregam só módulos .ts de lib/ (vários carregadores, nenhum lê
// .json): por isso essas duas superfícies leem a MANCHETE da edição num espelho TS (lib/seo/aiVideoIndexHeadline.ts),
// e o guardião scripts/test-indice-video-ia-2026-10-06.mjs exige que o espelho seja IGUAL a headlineFromEdition(JSON).
// A página lê o JSON inteiro (lib/seo/aiVideoIndexEdition.ts).
export interface IndexHeadline {
  edition: string
  measuredAt: string
  windowDays: number
  customerFilms: number
  /** O motor gerativo com mais filmes medidos (mediana com n ≥ INDICATIVE_BELOW); null quando nenhum tem amostra. */
  lead: { engine: string; medianMinutes: number; timedFilms: number; delivered: number; requests: number } | null
}

/** A manchete derivada da edição — a mesma regra de escolha dos achados (o espelho TS tem de ser igual a isto). */
export function headlineFromEdition(edition: IndexEdition): IndexHeadline {
  const rows = INDEX_ENGINES.map((meta) => ({ meta, rec: edition.engines.find((e) => e.qualityMode === meta.qualityMode) }))
  const customerFilms = rows.reduce((s, r) => s + (r.rec?.customers.films ?? 0), 0)
  const gen = rows
    .filter((r) => r.meta.kind === 'generative' && r.rec && r.rec.customers.minutesToFilm.n >= INDICATIVE_BELOW && r.rec.customers.minutesToFilm.median !== null)
    .sort((a, b) => (b.rec as IndexEngineRecord).customers.films - (a.rec as IndexEngineRecord).customers.films)[0]
  const lead = gen?.rec
    ? {
        engine: gen.meta.name,
        medianMinutes: gen.rec.customers.minutesToFilm.median as number,
        timedFilms: gen.rec.customers.minutesToFilm.n,
        delivered: gen.rec.customers.requests.delivered,
        requests: gen.rec.customers.requests.n,
      }
    : null
  return { edition: edition.edition, measuredAt: edition.measuredAt, windowDays: edition.window.days, customerFilms, lead }
}

/** A linha do llms.txt: 2–3 números da edição (filmes, mediana do pedido ao filme, entrega) + o link. */
export function indexLlmsLine(h: IndexHeadline): string {
  const parts = [`${h.customerFilms} films delivered to customers in ${h.windowDays} days`]
  if (h.lead) {
    parts.push(`a ${num(h.lead.medianMinutes)}-minute median from request to finished film on ${h.lead.engine}`)
    if (h.lead.requests > 0) parts.push(`${pct(h.lead.delivered, h.lead.requests)}% of ${h.lead.engine} requests delivered`)
  }
  return `- [${AI_VIDEO_INDEX_NAME} — ${editionLabel(h.edition)}](${BASE}${AI_VIDEO_INDEX_PATH}): monthly per-engine production data from Kineo’s own renders, house accounts excluded — ${listNames(parts)}. Render time, delivery rate, coherence score and provider cost per second for every engine, with small samples marked ${INDICATIVE_LABEL}. Free to cite.`
}
