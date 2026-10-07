// KINEO-INDICE-VIDEO-IA-2026-10-06 — o "Kineo AI Video Index" mensal (fundador 06/10: "vai índice").
//
// POR QUE ISTO EXISTE (medido 06/10): a /state-of-ai-shorts-2026 trouxe 284 sessões vindas do ChatGPT em 60 dias, e o
// ChatGPT citando páginas nossas trouxe 8 dos 11 pagantes do período. Motor de resposta cita DADO ORIGINAL — e ninguém
// mais tem os números de produção da casa: quanto tempo cada motor leva do pedido ao filme, que duração sai, quão
// confiável é o render e quão coerente é o resultado. Esta é a camada de dados da página /ai-video-index.
//
// V2 (sessão CEO, 06/10, antes de publicar) — o que vira público:
//   1. SEM VOLUME ABSOLUTO (página, llms.txt e JSON): nada de contagem de filmes, pedidos ou pessoas, nem participação de
//      uso. O tamanho da amostra aparece SÓ como faixa, e SÓ na metodologia (SAMPLE_BANDS: n ≥ 100 · n 10–99 · n < 10 —
//      indicative). parseEdition recusa chave desconhecida: uma contagem que volte no JSON derruba o build.
//   2. CONFIABILIDADE no lugar de "taxa de entrega" (gate de negócio não é falha de motor): entregues ÷ (entregues +
//      falhas com erro registrado), só entre renders que começaram de fato. Pedido barrado pela checagem da conta (cota,
//      plano, saldo) ou do roteiro não entra; render sem desfecho registrado não vira falha (desconhecido não vira zero) —
//      e se passar de UNKNOWN_SHARE_MAX% dos renders, a página diz NOT_ENOUGH_DATA (a consulta e esta lib, as duas).
//   3. KINEO 1 FORA: montagem de banco de imagens, não motor gerativo. Só a linha NOT_COVERED_LINE na metodologia;
//      nenhum número dele no JSON (parseEdition recusa o motor).
//   4. Motor sem INDICATIVE_BELOW+ renders de CLIENTE na janela aparece só pelos renders de teste da casa, rotulados
//      TEST_RENDERS_LABEL: tempo até o filme pronto e duração — nenhuma taxa.
//   5. Achados do topo: tempo (mediana e p90), duração mediana, coerência média (com a régua), custo bruto do fornecedor
//      por segundo (fonte e data) e o link do preço por filme (PRICE_PER_VIDEO_PAGE).
//
// A DISCIPLINA:
//   · os números MEDIDOS vêm do JSON versionado da edição (data/ai-video-index/<AAAA-MM>.json), gravado verbatim da
//     consulta salva ao lado (<AAAA-MM>.sql) — nada é lido do banco em runtime: a edição é um retrato datado e citável;
//   · o custo bruto do fornecedor por segundo = ENGINE_MARKET (lib/clips/clipPriceVsMarket.ts: página oficial da fal,
//     URL, data da conferência); o PREÇO DA KINEO por vídeo não se repete aqui — mora em PRICE_PER_VIDEO_PAGE;
//   · contas da casa (lib/internalAccounts.ts) ficam fora de todo número de cliente, num bloco à parte, nunca somadas;
//   · nenhum dado pessoal: o JSON só tem medianas, percentis, médias, percentuais e faixas por motor (o guardião varre).
//
// MÓDULO PURO: só imports RELATIVOS de módulos puros (engineCost só por tipo; clipPricing e clipPriceVsMarket só um ao
// outro e `import type`). O guardião scripts/test-indice-video-ia-2026-10-06.mjs o executa isolado (readFileSync +
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
export const AI_VIDEO_INDEX_SCHEMA = 'kineo-ai-video-index/2'
/** Abaixo disto a amostra é "indicative" — e um motor sem esse tanto de renders de CLIENTE não ganha bloco de cliente. */
export const INDICATIVE_BELOW = 10
export const INDICATIVE_LABEL = 'indicative'
/** O rótulo da tabela dos motores medidos só pela casa (decisão da sessão CEO, texto exato). */
export const TEST_RENDERS_LABEL = 'Kineo internal test renders, indicative'
/** Acima desta % de renders sem desfecho registrado, a confiabilidade vira NOT_ENOUGH_DATA (a consulta usa o mesmo corte). */
export const UNKNOWN_SHARE_MAX = 20
export const NOT_ENOUGH_DATA = 'not enough data'
/** Notas do juiz — espelho de verdictFor (lib/fastCoherence.ts, que não é puro); o guardião confere. */
export const COHERENCE_OFF_BELOW = 50
export const COHERENCE_COHERENT_FROM = 75
export const AI_VIDEO_INDEX_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
export const AI_VIDEO_INDEX_LICENSE_LABEL = 'CC BY 4.0'
/** A única linha sobre o Kineo 1 (decisão da sessão CEO, texto exato): nenhum número dele sai no índice. */
export const NOT_COVERED_LINE = 'Kineo 1 (stock-footage assembly) is not a generative engine and is not covered.'
/**
 * A página com o PREÇO DA KINEO por vídeo de cada motor (rodada 1 da visibilidade no ChatGPT): o índice linka para ela
 * em vez de repetir preço. Espelho de HUB_PAGES.oneplace (lib/seo/citableHubPages.ts, que não é puro); o guardião confere.
 */
export const PRICE_PER_VIDEO_PAGE = { path: '/seedance-kling-veo-in-one-place', label: 'Seedance, Kling and Veo in one place' } as const
/** Âncora da tabela de preço do fornecedor (o achado do custo por segundo aponta para ela). */
export const PROVIDER_TABLE_ID = 'avi-provider-title'
const BASE = 'https://www.usekineo.com'

/**
 * As faixas de amostra (a ÚNICA forma em que o tamanho da amostra aparece, e só na metodologia). As chaves são os rótulos
 * que a consulta grava (tabela `bands` da .sql); o corte de baixo vem de INDICATIVE_BELOW (o guardião confere os dois).
 */
export type SampleBand = '100+' | '10-99' | '<10'
export const SAMPLE_BANDS: Record<SampleBand, string> = {
  '100+': 'n ≥ 100',
  '10-99': `n ${INDICATIVE_BELOW}–99`,
  '<10': `n < ${INDICATIVE_BELOW} — ${INDICATIVE_LABEL}`,
}
export function isIndicative(band: SampleBand | null | undefined): boolean {
  return band === '<10'
}

// ─── os motores (só os GERATIVOS) ──────────────────────────────────────────────────────────────────────────────────
// Espelho de lib/growth/enginePageCatalog.ts (ENGINES: qualityMode, name, slug) — o catálogo não é puro (lê interruptores),
// então não pode ser importado aqui; o guardião confere cada linha contra o catálogo. O Kineo 1 não entra (NOT_COVERED_LINE).
export interface IndexEngineMeta {
  qualityMode: Quality
  name: string
  slug: string
}
export const INDEX_ENGINES: readonly IndexEngineMeta[] = [
  { qualityMode: 'cinematic_ai', name: 'Seedance 1.5', slug: 'seedance' },
  { qualityMode: 'cinematic_kling', name: 'Kling 2.5', slug: 'kling' },
  { qualityMode: 'cinematic_veo', name: 'Veo 3.1', slug: 'veo' },
  { qualityMode: 'cinematic_hollywood', name: 'Kling 3', slug: 'kling-3' },
  { qualityMode: 'cinematic_h3', name: 'MiniMax H3', slug: 'minimax-h3' },
  { qualityMode: 'cinematic_s25', name: 'Seedance 2.5', slug: 'seedance-2-5' },
  { qualityMode: 'cinematic_omni', name: 'Omni Flash', slug: 'gemini-omni-flash' },
]

// ─── a edição (o JSON) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface MedianStat { median: number; sample: SampleBand }
export interface TimeStat extends MedianStat { p90: number }
export interface ReliabilityStat {
  /** null = a consulta zerou (desconhecido acima do corte, ou nada com desfecho). */
  pct: number | null
  /** % dos renders que começaram e terminaram sem desfecho registrado. */
  unknownPct: number
  sample: SampleBand
}
export interface CoherenceStat { mean: number; offPct: number; sample: SampleBand }
export interface CustomerBlock {
  minutesToFilm: TimeStat
  durationSeconds: MedianStat
  reliability: ReliabilityStat | null
  coherence: CoherenceStat | null
}
export interface HouseBlock { minutesToFilm: TimeStat; durationSeconds: MedianStat }
export interface IndexEngineRecord {
  qualityMode: string
  engine: string
  windowNote: string | null
  customers: CustomerBlock | null
  house: HouseBlock | null
}
export interface IndexEdition {
  schema: string
  edition: string
  measuredAt: string
  window: { start: string; end: string; days: number }
  engines: IndexEngineRecord[]
}

function fail(path: string, what: string): never {
  throw new Error(`[aiVideoIndex] edição inválida em ${path}: ${what}`)
}
/** Objeto com EXATAMENTE as chaves permitidas: contagem (films, n, requests…) ou campo novo derruba o build. */
function obj(v: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, 'objeto esperado')
  const o = v as Record<string, unknown>
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${path}.${k}`, 'chave fora do contrato da edição (o índice não publica contagem nem campo novo sem revisão)')
  for (const k of keys) if (!(k in o)) fail(`${path}.${k}`, 'chave ausente')
  return o
}
function numero(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'número esperado')
  return v
}
function pct(v: unknown, path: string): number {
  const n = numero(v, path)
  if (n < 0 || n > 100) fail(path, 'percentual entre 0 e 100 esperado')
  return n
}
function str(v: unknown, path: string): string {
  if (typeof v !== 'string' || !v) fail(path, 'texto esperado')
  return v
}
function faixa(v: unknown, path: string): SampleBand {
  if (v !== '100+' && v !== '10-99' && v !== '<10') fail(path, 'faixa de amostra esperada ("100+", "10-99" ou "<10"), nunca contagem')
  return v
}
function tempo(v: unknown, path: string): TimeStat {
  const o = obj(v, path, ['median', 'p90', 'sample'])
  return { median: numero(o.median, `${path}.median`), p90: numero(o.p90, `${path}.p90`), sample: faixa(o.sample, `${path}.sample`) }
}
function mediana(v: unknown, path: string): MedianStat {
  const o = obj(v, path, ['median', 'sample'])
  return { median: numero(o.median, `${path}.median`), sample: faixa(o.sample, `${path}.sample`) }
}

/**
 * Lê e valida o JSON da edição. Lança (falha ALTO no build) se faltar campo, se aparecer chave fora do contrato (uma
 * contagem, por exemplo), se a amostra vier como número em vez de faixa, se o motor não for um dos gerativos do índice
 * (o Kineo 1 cai aqui) ou se o nome divergir do catálogo.
 */
export function parseEdition(raw: unknown): IndexEdition {
  const r = obj(raw, '$', ['schema', 'edition', 'measuredAt', 'window', 'engines'])
  if (r.schema !== AI_VIDEO_INDEX_SCHEMA) fail('$.schema', `esperado ${AI_VIDEO_INDEX_SCHEMA}`)
  const edition = str(r.edition, '$.edition')
  if (!/^\d{4}-\d{2}$/.test(edition)) fail('$.edition', 'AAAA-MM esperado')
  const measuredAt = str(r.measuredAt, '$.measuredAt')
  if (Number.isNaN(Date.parse(measuredAt))) fail('$.measuredAt', 'data ISO esperada')
  const w = obj(r.window, '$.window', ['start', 'end', 'days'])
  const window = { start: str(w.start, '$.window.start'), end: str(w.end, '$.window.end'), days: numero(w.days, '$.window.days') }
  if (!Array.isArray(r.engines)) fail('$.engines', 'lista esperada')
  const seen = new Set<string>()
  const engines = (r.engines as unknown[]).map((e, i): IndexEngineRecord => {
    const p = `$.engines[${i}]`
    const o = obj(e, p, ['qualityMode', 'engine', 'windowNote', 'customers', 'house'])
    const qualityMode = str(o.qualityMode, `${p}.qualityMode`)
    const meta = INDEX_ENGINES.find((m) => m.qualityMode === qualityMode)
    if (!meta) fail(`${p}.qualityMode`, `motor fora do índice (só os gerativos entram): ${qualityMode}`)
    if (seen.has(qualityMode)) fail(`${p}.qualityMode`, `motor repetido: ${qualityMode}`)
    seen.add(qualityMode)
    const engine = str(o.engine, `${p}.engine`)
    if (engine !== meta.name) fail(`${p}.engine`, `"${engine}" diverge do catálogo ("${meta.name}")`)
    let customers: CustomerBlock | null = null
    if (o.customers !== null) {
      const cp = `${p}.customers`
      const c = obj(o.customers, cp, ['minutesToFilm', 'durationSeconds', 'reliability', 'coherence'])
      let reliability: ReliabilityStat | null = null
      if (c.reliability !== null) {
        const rel = obj(c.reliability, `${cp}.reliability`, ['pct', 'unknownPct', 'sample'])
        reliability = {
          pct: rel.pct === null ? null : pct(rel.pct, `${cp}.reliability.pct`),
          unknownPct: pct(rel.unknownPct, `${cp}.reliability.unknownPct`),
          sample: faixa(rel.sample, `${cp}.reliability.sample`),
        }
      }
      let coherence: CoherenceStat | null = null
      if (c.coherence !== null) {
        const coh = obj(c.coherence, `${cp}.coherence`, ['mean', 'offPct', 'sample'])
        coherence = { mean: numero(coh.mean, `${cp}.coherence.mean`), offPct: pct(coh.offPct, `${cp}.coherence.offPct`), sample: faixa(coh.sample, `${cp}.coherence.sample`) }
      }
      customers = { minutesToFilm: tempo(c.minutesToFilm, `${cp}.minutesToFilm`), durationSeconds: mediana(c.durationSeconds, `${cp}.durationSeconds`), reliability, coherence }
    }
    let house: HouseBlock | null = null
    if (o.house !== null) {
      const h = obj(o.house, `${p}.house`, ['minutesToFilm', 'durationSeconds'])
      house = { minutesToFilm: tempo(h.minutesToFilm, `${p}.house.minutesToFilm`), durationSeconds: mediana(h.durationSeconds, `${p}.house.durationSeconds`) }
    }
    return { qualityMode, engine, windowNote: o.windowNote === null ? null : str(o.windowNote, `${p}.windowNote`), customers, house }
  })
  if (seen.size !== INDEX_ENGINES.length) fail('$.engines', `${INDEX_ENGINES.length} motores esperados, vieram ${seen.size}`)
  return { schema: AI_VIDEO_INDEX_SCHEMA, edition, measuredAt, window, engines }
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

/**
 * A confiabilidade que pode ser publicada: null quando não há dado OU quando o desconhecido passa de UNKNOWN_SHARE_MAX%
 * (a consulta já zera o pct nesse caso; esta regra repete a trava do lado da página — desconhecido nunca vira número).
 */
export function publishableReliability(rel: ReliabilityStat | null): number | null {
  if (!rel || rel.pct === null) return null
  return rel.unknownPct > UNKNOWN_SHARE_MAX ? null : rel.pct
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
  /** O número principal; '—' quando não há medida; NOT_ENOUGH_DATA quando o desconhecido passa do corte. */
  text: string
  /** Linha de apoio (p90, régua…). Nunca contagem. */
  sub: string
  /** Amostra n < INDICATIVE_BELOW: a página desenha o selo "indicative". */
  indicative: boolean
}
export interface CustomerRow { meta: IndexEngineMeta; note: string | null; time: IndexCell; length: IndexCell; reliability: IndexCell; coherence: IndexCell }
export interface TestRow { meta: IndexEngineMeta; note: string | null; time: IndexCell; length: IndexCell }
export interface ProviderRow { meta: IndexEngineMeta; provider: ProviderPrice; text: string; sub: string }
export interface Finding { stat: string; label: string; detail: string; href?: string; linkLabel?: string }
/** Cabeçalhos das tabelas (texto com número mora aqui, nunca no JSX da página). */
export interface IndexColumn { key: string; label: string; hint: string }
export interface IndexView {
  columns: IndexColumn[]
  testColumns: IndexColumn[]
  providerColumns: IndexColumn[]
  providerTableId: string
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
  /** Onde está o preço da Kineo por vídeo de cada motor (o índice linka, não repete). */
  pricePage: { path: string; label: string }
  lead: string
  testLabel: string
  customerRows: CustomerRow[]
  testRows: TestRow[]
  providerRows: ProviderRow[]
  providerChecked: string
  findings: Finding[]
  methodology: string[]
  faq: { q: string; a: string }[]
  citeLine: string
  metaTitle: string
  metaDescription: string
  jsonLd: { article: Record<string, unknown>; dataset: Record<string, unknown>; faq: Record<string, unknown> }
}

function cell(text: string, sub: string, band: SampleBand): IndexCell {
  return { text, sub, indicative: isIndicative(band) }
}
function emptyCell(sub: string): IndexCell {
  return { text: '—', sub, indicative: false }
}
function timeCell(t: TimeStat): IndexCell {
  return cell(`${num(t.median)} min`, `p90 ${num(t.p90)} min`, t.sample)
}
function lengthCell(d: MedianStat): IndexCell {
  return cell(`${num(d.median)} s`, 'finished MP4', d.sample)
}
function reliabilityCell(rel: ReliabilityStat | null): IndexCell {
  if (!rel) return emptyCell('no render started')
  const value = publishableReliability(rel)
  if (value === null) return cell(NOT_ENOUGH_DATA, `${num(rel.unknownPct)}% of started renders have no recorded outcome (limit ${UNKNOWN_SHARE_MAX}%)`, rel.sample)
  return cell(`${num(value)}%`, 'finished ÷ (finished + recorded failures)', rel.sample)
}
function coherenceCell(coh: CoherenceStat | null): IndexCell {
  if (!coh) return emptyCell('not scored')
  return cell(num(coh.mean), `${num(coh.offPct)}% under ${COHERENCE_OFF_BELOW} (“off”)`, coh.sample)
}

/** Faixa única de um conjunto de medidas, ou a lista medida a medida quando divergem. */
function bandSummary(parts: [string, SampleBand][]): string {
  const bands = Array.from(new Set(parts.map(([, b]) => b)))
  if (bands.length === 1) return SAMPLE_BANDS[bands[0]]
  return parts.map(([name, b]) => `${name} ${SAMPLE_BANDS[b]}`).join(', ')
}

/** Monta tudo o que a página mostra a partir da edição. Puro: mesma entrada, mesma saída. */
export function buildIndexView(edition: IndexEdition): IndexView {
  const canonical = `${BASE}${AI_VIDEO_INDEX_PATH}`
  const label = editionLabel(edition.edition)
  const updatedIso = edition.measuredAt.slice(0, 10)
  const lastDay = lastCoveredDay(edition.window.end)
  const coverageIso = `${edition.window.start.slice(0, 10)}/${lastDay}`
  const windowLabel = `${humanDate(edition.window.start)} – ${humanDate(lastDay)}`
  const days = edition.window.days
  const pairs = INDEX_ENGINES.map((meta) => {
    const rec = edition.engines.find((e) => e.qualityMode === meta.qualityMode)
    if (!rec) throw new Error(`[aiVideoIndex] edição sem ${meta.qualityMode}`)
    return { meta, rec }
  })
  const customerPairs = pairs.filter(({ rec }) => rec.customers !== null)
  const testPairs = pairs.filter(({ rec }) => rec.customers === null)
  const customerRows: CustomerRow[] = customerPairs.map(({ meta, rec }) => {
    const c = rec.customers as CustomerBlock
    return {
      meta,
      note: rec.windowNote ? humanizeDates(rec.windowNote) : null,
      time: timeCell(c.minutesToFilm),
      length: lengthCell(c.durationSeconds),
      reliability: reliabilityCell(c.reliability),
      coherence: coherenceCell(c.coherence),
    }
  })
  const testRows: TestRow[] = testPairs.map(({ meta, rec }) => ({
    meta,
    note: rec.windowNote ? humanizeDates(rec.windowNote) : null,
    time: rec.house ? timeCell(rec.house.minutesToFilm) : emptyCell('no test render in this window'),
    length: rec.house ? lengthCell(rec.house.durationSeconds) : emptyCell(''),
  }))
  const providerRows: ProviderRow[] = pairs
    .map(({ meta }) => ({ meta, provider: providerPriceFor(meta.qualityMode) }))
    .filter((x): x is { meta: IndexEngineMeta; provider: ProviderPrice } => x.provider !== null)
    .map(({ meta, provider }) => ({
      meta,
      provider,
      text: `${provider.approximate ? '≈ ' : ''}${perSecondUsd(provider.usdPerSecond)}/s`,
      sub: `${provider.resolution}, no audio · checked ${humanDate(provider.checkedOn)}`,
    }))
  const checkedDates = Array.from(new Set(providerRows.map((r) => r.provider.checkedOn))).sort()
  const providerChecked = listNames(checkedDates.map(humanDate))
  const pricePageRef = `“${PRICE_PER_VIDEO_PAGE.label}” (usekineo.com${PRICE_PER_VIDEO_PAGE.path})`
  const lead1 = customerPairs[0] ?? null
  const c1 = lead1 ? (lead1.rec.customers as CustomerBlock) : null
  const testTimes = testRows.filter((r) => r.time.text !== '—')

  // ── os achados: tempo, duração, coerência, custo do fornecedor (os 4 com número) + o link do preço por filme ──
  const findings: Finding[] = []
  if (lead1 && c1) {
    const name = lead1.meta.name
    findings.push({
      stat: `${num(c1.minutesToFilm.median)} min`,
      label: `median from request to finished film — ${name}`,
      detail:
        `The slowest 10% took more than ${num(c1.minutesToFilm.p90)} min (p90). Customer renders. ` +
        'The clock runs from the moment the request reached Kineo to the moment the finished MP4 was saved: script, every generated scene, narration, music and assembly.',
    })
    findings.push({
      stat: `${num(c1.durationSeconds.median)} s`,
      label: `median length of a finished ${name} film`,
      detail: 'Read from the finished MP4, not from the length that was ordered. Customer renders.',
    })
    if (c1.coherence) {
      findings.push({
        stat: `${num(c1.coherence.mean)} / 100`,
        label: `average script-to-screen coherence — ${name}`,
        detail:
          'An automatic judge (a text model) rates every film 0–100 on two questions — does the narration tell what the person asked for, and do the planned scenes show what is being said — and averages them. ' +
          `${COHERENCE_COHERENT_FROM} or more reads as coherent, under ${COHERENCE_OFF_BELOW} as off: ${num(c1.coherence.offPct)}% of scored films were under ${COHERENCE_OFF_BELOW}. It reads text, not pixels.`,
      })
    }
  }
  const byPrice = [...providerRows].sort((a, b) => a.provider.usdPerSecond - b.provider.usdPerSecond)
  const lo = byPrice[0]
  const hi = byPrice[byPrice.length - 1]
  if (lo && hi) {
    findings.push({
      stat: `${perSecondUsd(lo.provider.usdPerSecond)}/s`,
      label: `lowest provider list price for raw AI video (${lo.meta.name}, ${lo.provider.resolution})`,
      detail:
        `The highest is ${hi.provider.approximate ? '≈ ' : ''}${perSecondUsd(hi.provider.usdPerSecond)} per second (${hi.meta.name}, ${hi.provider.resolution}). ` +
        `Source: the inference provider’s (fal.ai) official price pages, checked ${providerChecked} — raw clips without audio, before the script, narration, retries and assembly a finished film needs.`,
      href: `#${PROVIDER_TABLE_ID}`,
      linkLabel: 'Every engine and its source ↓',
    })
  }
  findings.push({
    stat: 'Price per film',
    label: 'Kineo’s price per finished video, on every engine',
    detail: 'Kept on one page and read from the same source that charges — not repeated here.',
    href: PRICE_PER_VIDEO_PAGE.path,
    linkLabel: `${PRICE_PER_VIDEO_PAGE.label} →`,
  })

  // ── metodologia (a faixa de amostra só aparece aqui) ──
  const sampleLines: string[] = []
  for (const { meta, rec } of customerPairs) {
    const c = rec.customers as CustomerBlock
    const parts: [string, SampleBand][] = [['time to film', c.minutesToFilm.sample], ['length', c.durationSeconds.sample]]
    if (c.reliability) parts.push(['reliability', c.reliability.sample])
    if (c.coherence) parts.push(['coherence', c.coherence.sample])
    sampleLines.push(`${meta.name}, customer renders: ${bandSummary(parts)}`)
  }
  const testByBand = new Map<string, string[]>()
  for (const { meta, rec } of testPairs) {
    if (!rec.house) continue
    const key = bandSummary([['time to film', rec.house.minutesToFilm.sample], ['length', rec.house.durationSeconds.sample]])
    testByBand.set(key, [...(testByBand.get(key) ?? []), meta.name])
  }
  testByBand.forEach((names, band) => sampleLines.push(`${listNames(names)}, Kineo internal test renders: ${band}`))

  const methodology = [
    `Window: ${days} days, ${windowLabel} (UTC), read from Kineo’s production database on ${humanDate(edition.measuredAt)}. The queries are versioned with the numbers, so every edition is computed the same way.`,
    `Who is measured: the customer table uses customer renders only; house accounts (the founder’s and test accounts) are kept apart and never added in. An engine without enough customer renders in the window (customer sample n < ${INDICATIVE_BELOW}) appears only under “${TEST_RENDERS_LABEL}”: time to film and length, no rates. $0 dry runs are excluded everywhere.`,
    NOT_COVERED_LINE,
    `Sample sizes are given as ranges, never as counts: ${SAMPLE_BANDS['100+']}, ${SAMPLE_BANDS['10-99']}, ${SAMPLE_BANDS['<10']} (an observation, not a benchmark). This edition — ${sampleLines.join('; ')}.`,
    'Time to film: from the first server record of the request to the moment the finished MP4 was saved to the library, matched by the generation id. When nobody keeps the page open, a background check that runs every five minutes saves the film, which can add up to about five minutes.',
    'Length: the duration of the finished MP4 as saved at delivery; it matches a reading of the MP4 header within one second on every film where both were recorded.',
    `Reliability: finished films ÷ (finished films + renders that failed with a recorded error), counting only renders that actually started (at least one scene sent to the model). Left out, and why: requests stopped before any scene was rendered — account checks (plan, quota, credit balance), Kineo’s script and length checks, and server errors before the first scene — because no engine render happened; and renders that ended without a recorded outcome, because an unknown outcome is not a failure. When those unknown outcomes exceed ${UNKNOWN_SHARE_MAX}% of an engine’s started renders, the table says “${NOT_ENOUGH_DATA}” instead of a rate.`,
    `Coherence: an automatic judge (a text model, version five of Kineo’s rubric) rates every delivered film 0–100 on two questions — does the narration tell what the person asked for, and do the planned scenes show what is being said — and averages them; ${COHERENCE_COHERENT_FROM}+ reads as coherent, under ${COHERENCE_OFF_BELOW} as off. It reads text (the request, the narration, the scene plan), not pixels.`,
    `Provider price: the per-second list price the inference provider (fal.ai) publishes for the model and resolution Kineo renders, without audio, with the date it was checked — a raw clip price, not the cost of a finished film. Kineo’s own price per finished video is not repeated here: it is on ${pricePageRef}, read from the same source that charges.`,
    'Aggregates only — no individual creator, prompt or account appears anywhere.',
  ]

  const lead =
    'Kineo turns one idea or a finished script into a narrated vertical film, and lets the creator pick the engine that renders the scenes. ' +
    'That gives us something review sites don’t have: how long each engine really takes from request to finished film, how long the films come out, ' +
    `how reliably renders finish, how coherent the result is and what the raw video costs at the provider — measured on real renders over ${days} days, with house accounts kept apart.`

  const faq: { q: string; a: string }[] = []
  if (lead1 && c1) {
    faq.push({
      q: 'How long does it take to generate an AI video?',
      a: `On Kineo, in the ${days} days to ${humanDate(lastDay)}, a finished ${lead1.meta.name} film took a median ${num(c1.minutesToFilm.median)} minutes from request to MP4, and ${num(c1.minutesToFilm.p90)} minutes at the 90th percentile (customer renders). ` +
        (testTimes.length ? `Kineo’s internal test renders on the other engines (${INDICATIVE_LABEL}): ${listNames(testTimes.map((r) => `${r.meta.name} ${r.time.text}`))}. ` : '') +
        'The time includes the script, every generated scene, narration, music and assembly.',
    })
    const rel = publishableReliability(c1.reliability)
    faq.push({
      q: 'How reliable is AI video generation?',
      a: (rel !== null
        ? `Of the ${lead1.meta.name} renders that started and have a recorded outcome, ${num(rel)}% finished as a film; the rest failed with a recorded error (customer renders). `
        : `For ${lead1.meta.name} there is ${NOT_ENOUGH_DATA} this month: too many started renders have no recorded outcome. `) +
        'Requests stopped before rendering (account or script checks) and renders without a recorded outcome are not counted as failures, and engines without enough customer renders get no rate.',
    })
  }
  faq.push({
    q: 'What does AI video cost per second to generate?',
    a: `At the inference provider’s published list prices for raw video without audio (fal.ai, checked ${providerChecked}): ${listNames(providerRows.map((r) => `${r.meta.name} ${r.text} (${r.provider.resolution})`))}. ` +
      `That is the raw clip only. Kineo’s price per finished video — script, narration, captions, music and the edit included — is on ${pricePageRef}.`,
  })
  faq.push({
    q: 'How is the coherence score calculated?',
    a: `An automatic judge (a text model) reads what the person asked for, the narration and the planned scenes, and rates two things from 0 to 100: whether the narration tells the story that was asked for, and whether the scenes show what is being said. The score is their average; ${COHERENCE_COHERENT_FROM} or more reads as coherent and under ${COHERENCE_OFF_BELOW} as off. It reads text, not pixels.`,
  })
  faq.push({
    q: 'Can I cite these numbers?',
    a: `Yes. The index is free to cite under ${AI_VIDEO_INDEX_LICENSE_LABEL} with a link to this page: “${AI_VIDEO_INDEX_NAME}, ${label}, usekineo.com${AI_VIDEO_INDEX_PATH}”. ` +
      `It reports aggregates of Kineo’s own production data only, with house accounts kept apart and small samples marked ${INDICATIVE_LABEL}.`,
  })

  const h1 = `${AI_VIDEO_INDEX_NAME} — ${label}`
  const metaTitle = `${h1}: render time, reliability and provider cost per AI video engine`
  const metaDescription =
    'Monthly data from Kineo’s own AI video renders: median time from request to finished film, film length, reliability, coherence score ' +
    'and provider cost per second for Seedance, Kling, Veo, MiniMax and Omni. House test renders kept apart and marked indicative. Free to cite.'
  const citeLine = `“${AI_VIDEO_INDEX_NAME}, ${label}”, Kineo, usekineo.com${AI_VIDEO_INDEX_PATH}, data as of ${humanDate(edition.measuredAt)}.`

  const variableMeasured: Record<string, unknown>[] = []
  for (const { meta, rec } of customerPairs) {
    const c = rec.customers as CustomerBlock
    variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — median minutes from request to finished film (customer renders)`, value: c.minutesToFilm.median, unitText: 'minutes' })
    variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — 90th percentile minutes from request to finished film (customer renders)`, value: c.minutesToFilm.p90, unitText: 'minutes' })
    variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — median film length (customer renders)`, value: c.durationSeconds.median, unitText: 'seconds' })
    const rel = publishableReliability(c.reliability)
    if (rel !== null) variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — reliability: finished ÷ (finished + recorded failures), started renders only`, value: rel, unitText: 'percent' })
    if (c.coherence) variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — mean coherence score, 0–100 (customer renders)`, value: c.coherence.mean })
  }
  for (const { meta, rec } of testPairs) {
    if (!rec.house) continue
    variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — median minutes from request to film (${TEST_RENDERS_LABEL})`, value: rec.house.minutesToFilm.median, unitText: 'minutes' })
    variableMeasured.push({ '@type': 'PropertyValue', name: `${meta.name} — median film length (${TEST_RENDERS_LABEL})`, value: rec.house.durationSeconds.median, unitText: 'seconds' })
  }
  for (const r of providerRows) {
    variableMeasured.push({ '@type': 'PropertyValue', name: `${r.meta.name} — provider list price per second of raw video (${r.provider.resolution}, checked ${r.provider.checkedOn})`, value: r.provider.usdPerSecond, unitText: 'USD per second' })
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
      `Per-engine data from Kineo’s own AI video renders over ${days} days: median and 90th-percentile time from request to finished film, median film length, ` +
      'reliability among started renders, automatic coherence score and provider list price per second. House accounts kept apart; sample sizes given only as ranges, in the methodology; small samples marked indicative.',
    url: canonical,
    datePublished: AI_VIDEO_INDEX_FIRST_PUBLISHED,
    dateModified: updatedIso,
    isAccessibleForFree: true,
    license: AI_VIDEO_INDEX_LICENSE,
    creator: org,
    temporalCoverage: coverageIso,
    measurementTechnique: 'Aggregate SQL queries over Kineo production records (videos and server events); internal accounts kept apart.',
    variableMeasured,
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  const columns: IndexColumn[] = [
    { key: 'engine', label: 'Engine', hint: 'availability in this window' },
    { key: 'time', label: 'Time to film', hint: 'median, request → MP4' },
    { key: 'length', label: 'Median length', hint: 'finished MP4' },
    { key: 'reliability', label: 'Reliability', hint: 'started renders that finished' },
    { key: 'coherence', label: 'Coherence', hint: 'automatic judge, 0–100' },
  ]
  const testColumns: IndexColumn[] = [
    { key: 'engine', label: 'Engine', hint: 'availability in this window' },
    { key: 'time', label: 'Time to film', hint: 'median, request → MP4' },
    { key: 'length', label: 'Median length', hint: 'finished MP4' },
  ]
  const providerColumns: IndexColumn[] = [
    { key: 'engine', label: 'Engine', hint: '' },
    { key: 'price', label: 'Provider list price', hint: 'raw video per second' },
    { key: 'source', label: 'Source', hint: 'official price page' },
  ]

  return {
    columns,
    testColumns,
    providerColumns,
    providerTableId: PROVIDER_TABLE_ID,
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
    pricePage: { path: PRICE_PER_VIDEO_PAGE.path, label: PRICE_PER_VIDEO_PAGE.label },
    lead,
    testLabel: TEST_RENDERS_LABEL,
    customerRows,
    testRows,
    providerRows,
    providerChecked,
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
// A página lê o JSON inteiro (lib/seo/aiVideoIndexEdition.ts). Sem volume: só medianas e a confiabilidade publicável.
export interface IndexHeadline {
  edition: string
  measuredAt: string
  windowDays: number
  /** O primeiro motor do índice com bloco de cliente; null quando nenhum tem amostra de cliente. */
  lead: { engine: string; medianMinutes: number; medianSeconds: number; reliabilityPct: number | null } | null
}

/** A manchete derivada da edição — a mesma regra de escolha dos achados (o espelho TS tem de ser igual a isto). */
export function headlineFromEdition(edition: IndexEdition): IndexHeadline {
  const first = INDEX_ENGINES.map((meta) => ({ meta, rec: edition.engines.find((e) => e.qualityMode === meta.qualityMode) }))
    .find((x) => x.rec?.customers)
  const c = first?.rec?.customers ?? null
  return {
    edition: edition.edition,
    measuredAt: edition.measuredAt,
    windowDays: edition.window.days,
    lead: first && c
      ? { engine: first.meta.name, medianMinutes: c.minutesToFilm.median, medianSeconds: c.durationSeconds.median, reliabilityPct: publishableReliability(c.reliability) }
      : null,
  }
}

/** A linha do llms.txt: até 3 números da edição (mediana do pedido ao filme, duração mediana, confiabilidade) + o link. */
export function indexLlmsLine(h: IndexHeadline): string {
  const parts: string[] = []
  if (h.lead) {
    parts.push(`a ${num(h.lead.medianMinutes)}-minute median from request to finished film on ${h.lead.engine}`)
    parts.push(`a ${num(h.lead.medianSeconds)}-second median film length`)
    if (h.lead.reliabilityPct !== null) parts.push(`${num(h.lead.reliabilityPct)}% reliability (finished ÷ finished + recorded failures)`)
  }
  return `- [${AI_VIDEO_INDEX_NAME} — ${editionLabel(h.edition)}](${BASE}${AI_VIDEO_INDEX_PATH}): monthly per-engine data from Kineo’s own AI video renders, house accounts kept apart${parts.length ? ` — ${listNames(parts)}` : ''}. Also coherence scores and provider cost per second; small samples marked ${INDICATIVE_LABEL}. Free to cite.`
}
