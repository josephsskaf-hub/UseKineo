// KINEO-GEO-RODADA2-2026-10-08 — "State of AI Shorts 2026", edição de OUTUBRO (sessão CEO 08/10, item 2 da rodada 2 de GEO).
//
// POR QUE ESTA PÁGINA VIROU EDIÇÃO MENSAL (e deixou de ler o banco a cada dia): a /state-of-ai-shorts-2026 é a 2ª página que
// o ChatGPT mais cita, e as sessões vindas dele caíram de 53 para 22 por semana. Em produção ela servia, havia dois meses,
// o FALLBACK de 05/08 de lib/studyStats.ts ("last read August 5, 2026", 472 vídeos, curva mensal até agosto) — as três
// RPCs de leitura diária tinham teto de 5 s e a página caía no fallback em silêncio. "Página que cai por envelhecer perde
// citação" (sessão CEO). Agora ela segue o desenho do Kineo AI Video Index (lib/seo/aiVideoIndex.ts): um JSON por edição
// (data/state-of-ai-shorts/<AAAA-MM>.json), gravado verbatim da consulta .sql ao lado, com data, janela e fonte na página.
//
// A REGRA DO ÍNDICE V2 (sessão CEO 06/10, repetida para esta página em 08/10): SEM VOLUME ABSOLUTO DE CLIENTE — nada de
// contagem de filmes, pedidos ou pessoas, nem participação de uso por motor. Só medianas, percentis e taxas; a amostra só
// como faixa, e só na metodologia. parseStateEdition recusa chave desconhecida: uma contagem que volte no JSON derruba o build.
// O que saiu da versão antiga por isso: "N AI-Generated Videos" do título, "N creators" do lead e do JSON-LD, a curva mensal
// (barras com contagem), o "mix de motor" ("89% Fast Mode" — participação de uso) e o ranking de nichos com "185 mentions".
//
// DUAS POPULAÇÕES (a .sql explica; a metodologia da página repete em inglês):
//   · P1 finished Shorts — todo Short entregue de cliente na janela, em qualquer motor de filme: DURAÇÃO e NICHOS;
//   · P2 scene-generating renders — só os motores que geram cada cena: TEMPO até o filme e CONFIABILIDADE (método do índice).
//     O Kineo 1 fica fora de P2: não é mais oferecido a conta nova (29/09) e o tempo dele seria uma promessa falsa a quem chega.
//
// MÓDULO PURO: só imports RELATIVOS de módulos puros. O guardião scripts/test-geo-rodada2-2026-10-08.mjs o executa isolado.
import { ENGINE_GEO_REWARDS_LINE } from './engineCitation'

/** Marca desta mudança (os guardiões alheios reancorados procuram por ela). */
export const STATE_MARK = 'KINEO-GEO-RODADA2-2026-10-08'
export const STATE_PATH = '/state-of-ai-shorts-2026'
export const STATE_CANONICAL = `https://www.usekineo.com${STATE_PATH}`
export const STATE_NAME = 'State of AI Shorts 2026'
/** A primeira publicação do estudo (24/07/2026) — o datePublished do Article não muda entre edições. */
export const STATE_FIRST_PUBLISHED = '2026-07-24'
export const STATE_SCHEMA = 'kineo-state-of-ai-shorts/1'
/** A consulta só publica um bloco com pelo menos isto de amostra (e a faixa '<10' nunca aparece num bloco publicado). */
export const STATE_MIN_SAMPLE = 10
/** Acima desta % de renders sem desfecho registrado, a confiabilidade vira NOT_ENOUGH_DATA (a consulta usa o mesmo corte). */
export const STATE_UNKNOWN_SHARE_MAX = 20
export const STATE_NOT_ENOUGH_DATA = 'not enough data'
/** Faixas de nicho (por PESSOAS distintas): 'most' = 10%+ dos criadores, 'common' = 5–10%, 'less' = abaixo de 5%. */
export const STATE_TIER_MOST_FROM = 10
export const STATE_TIER_COMMON_FROM = 5
export const STATE_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
export const STATE_LICENSE_LABEL = 'CC BY 4.0'
/** Os limites de duração da tabela de comprimento (a mesma régua da consulta: >= 60 s e < 30 s). */
export const STATE_LONG_FROM_SECONDS = 60
export const STATE_SHORT_BELOW_SECONDS = 30

export type SampleBand = '100+' | '10-99' | '<10'
export const STATE_SAMPLE_BANDS: Record<SampleBand, string> = {
  '100+': 'n ≥ 100',
  '10-99': `n ${STATE_MIN_SAMPLE}–99`,
  '<10': `n < ${STATE_MIN_SAMPLE}`,
}

// ─── os nichos (as chaves batem com a tabela `niches` da .sql; o guardião confere as duas listas) ────────────────────
export type NicheTier = 'most' | 'common' | 'less'
export interface StateNicheMeta {
  label: string
  /** O nome curto para frases corridas ("history comes first, with mystery second"). */
  short: string
  /** A página de nicho da casa (/free-ai-shorts/<slug>); null = não há página para este nicho. */
  path: string | null
  /** A ideia de exemplo do formulário do estudo quando o nicho está entre os três primeiros (texto da casa, sem número). */
  starterIdea: string
}
export const STATE_NICHES: Record<string, StateNicheMeta> = {
  history: { label: 'History & empires', short: 'history', path: '/free-ai-shorts/history', starterIdea: 'The empire that collapsed in a single generation' },
  mystery: { label: 'Mystery & unexplained', short: 'mystery', path: '/free-ai-shorts/mystery', starterIdea: 'The ship found drifting with no one on board' },
  geography: { label: 'Countries & places', short: 'countries & places', path: '/free-ai-shorts/geography', starterIdea: 'The country almost nobody is allowed to enter' },
  money: { label: 'Money & business', short: 'money & business', path: '/free-ai-shorts/money', starterIdea: 'The money habit that quietly keeps people broke' },
  facts: { label: 'Facts & curiosities', short: 'facts', path: '/free-ai-shorts/facts', starterIdea: 'The everyday object with a strange hidden history' },
  horror: { label: 'Scary stories & horror', short: 'scary stories', path: '/free-ai-shorts/horror', starterIdea: 'The 3 a.m. rule you should never break' },
  science: { label: 'Science', short: 'science', path: '/free-ai-shorts/science', starterIdea: 'Why your atoms are older than the Sun' },
  tech: { label: 'AI & tech', short: 'AI & tech', path: '/free-ai-shorts/ai', starterIdea: 'The AI tool that quietly replaced a whole job' },
  animals: { label: 'Animals & nature', short: 'animals & nature', path: '/free-ai-shorts/animals', starterIdea: 'The animal with a survival trick science still cannot explain' },
  kids: { label: 'Kids & animation', short: 'kids & animation', path: null, starterIdea: 'A tiny robot learns to share its last cookie' },
  motivation: { label: 'Motivation & mindset', short: 'motivation', path: '/free-ai-shorts/motivation', starterIdea: 'Why discipline beats motivation every time' },
  space: { label: 'Space', short: 'space', path: '/free-ai-shorts/space', starterIdea: 'The object leaving our solar system faster than anything we launched' },
  comedy: { label: 'Comedy & memes', short: 'comedy', path: null, starterIdea: 'The most relatable morning alarm disaster' },
  health: { label: 'Health & body', short: 'health', path: '/free-ai-shorts/health', starterIdea: 'What happens to your body when you walk every day' },
  faith: { label: 'Faith & devotional', short: 'faith', path: '/free-ai-shorts/faith', starterIdea: 'A short reflection on Psalm 23 for a hard week' },
  truecrime: { label: 'True crime', short: 'true crime', path: '/free-ai-shorts/truecrime', starterIdea: 'The man who jumped from a plane and was never found' },
}
export const STATE_TIER_LABELS: Record<NicheTier, { title: string; rule: string }> = {
  most: { title: 'Most common', rule: `chosen by ${STATE_TIER_MOST_FROM}% or more of creators` },
  common: { title: 'Common', rule: `chosen by ${STATE_TIER_COMMON_FROM}% to ${STATE_TIER_MOST_FROM}% of creators` },
  less: { title: 'Less common', rule: `chosen by under ${STATE_TIER_COMMON_FROM}% of creators` },
}

// ─── a edição (o JSON) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface StateEdition {
  schema: string
  edition: string
  measuredAt: string
  window: { start: string; end: string; days: number }
  length: { medianSeconds: number; pct60Plus: number; pctUnder30: number; sample: SampleBand } | null
  renderTime: { medianMinutes: number; p90Minutes: number; sample: SampleBand } | null
  reliability: { pct: number | null; unknownPct: number; sample: SampleBand } | null
  niches: { sample: SampleBand; ranking: { key: string; rank: number; tier: NicheTier }[] }
}

function fail(path: string, what: string): never {
  throw new Error(`[stateOfAiShorts] edição inválida em ${path}: ${what}`)
}
/** Objeto com EXATAMENTE as chaves permitidas: contagem (films, n, creators…) ou campo novo derruba o build. */
function obj(v: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, 'objeto esperado')
  const o = v as Record<string, unknown>
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${path}.${k}`, 'chave fora do contrato da edição (o estudo não publica contagem nem campo novo sem revisão)')
  for (const k of keys) if (!(k in o)) fail(`${path}.${k}`, 'chave ausente')
  return o
}
function numero(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'número esperado')
  return v
}
function positivo(v: unknown, path: string): number {
  const n = numero(v, path)
  if (n <= 0) fail(path, 'número positivo esperado (zero nunca vira achado público)')
  return n
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
  if (v !== '100+' && v !== '10-99') fail(path, 'faixa de amostra publicável esperada ("100+" ou "10-99"), nunca contagem')
  return v
}

/**
 * Lê e valida o JSON da edição. Lança (falha ALTO no build) se faltar campo, se aparecer chave fora do contrato (uma
 * contagem, por exemplo), se a amostra vier como número em vez de faixa, se um nicho não existir em STATE_NICHES ou se
 * o ranking vier fora de ordem.
 */
export function parseStateEdition(raw: unknown): StateEdition {
  const r = obj(raw, '$', ['schema', 'edition', 'measuredAt', 'window', 'length', 'renderTime', 'reliability', 'niches'])
  if (r.schema !== STATE_SCHEMA) fail('$.schema', `esperado ${STATE_SCHEMA}`)
  const edition = str(r.edition, '$.edition')
  if (!/^\d{4}-\d{2}$/.test(edition)) fail('$.edition', 'AAAA-MM esperado')
  const measuredAt = str(r.measuredAt, '$.measuredAt')
  if (Number.isNaN(Date.parse(measuredAt))) fail('$.measuredAt', 'data ISO esperada')
  const w = obj(r.window, '$.window', ['start', 'end', 'days'])
  const window = { start: str(w.start, '$.window.start'), end: str(w.end, '$.window.end'), days: positivo(w.days, '$.window.days') }
  if (Number.isNaN(Date.parse(window.start)) || Number.isNaN(Date.parse(window.end)) || Date.parse(window.end) <= Date.parse(window.start)) fail('$.window', 'janela inválida')

  let length: StateEdition['length'] = null
  if (r.length !== null) {
    const l = obj(r.length, '$.length', ['medianSeconds', 'pct60Plus', 'pctUnder30', 'sample'])
    length = { medianSeconds: positivo(l.medianSeconds, '$.length.medianSeconds'), pct60Plus: pct(l.pct60Plus, '$.length.pct60Plus'), pctUnder30: pct(l.pctUnder30, '$.length.pctUnder30'), sample: faixa(l.sample, '$.length.sample') }
    if (length.pct60Plus + length.pctUnder30 > 100) fail('$.length', 'faixas de duração somam mais de 100%')
  }
  let renderTime: StateEdition['renderTime'] = null
  if (r.renderTime !== null) {
    const t = obj(r.renderTime, '$.renderTime', ['medianMinutes', 'p90Minutes', 'sample'])
    renderTime = { medianMinutes: positivo(t.medianMinutes, '$.renderTime.medianMinutes'), p90Minutes: positivo(t.p90Minutes, '$.renderTime.p90Minutes'), sample: faixa(t.sample, '$.renderTime.sample') }
    if (renderTime.p90Minutes < renderTime.medianMinutes) fail('$.renderTime', 'p90 abaixo da mediana')
  }
  let reliability: StateEdition['reliability'] = null
  if (r.reliability !== null) {
    const rel = obj(r.reliability, '$.reliability', ['pct', 'unknownPct', 'sample'])
    reliability = { pct: rel.pct === null ? null : pct(rel.pct, '$.reliability.pct'), unknownPct: pct(rel.unknownPct, '$.reliability.unknownPct'), sample: faixa(rel.sample, '$.reliability.sample') }
  }
  const n = obj(r.niches, '$.niches', ['sample', 'ranking'])
  if (!Array.isArray(n.ranking) || n.ranking.length === 0) fail('$.niches.ranking', 'lista não vazia esperada')
  const seen = new Set<string>()
  let last = 0
  const ranking = (n.ranking as unknown[]).map((x, i) => {
    const p = `$.niches.ranking[${i}]`
    const o = obj(x, p, ['key', 'rank', 'tier'])
    const key = str(o.key, `${p}.key`)
    if (!Object.prototype.hasOwnProperty.call(STATE_NICHES, key)) fail(`${p}.key`, `nicho fora de STATE_NICHES: ${key}`)
    if (seen.has(key)) fail(`${p}.key`, `nicho repetido: ${key}`)
    seen.add(key)
    const rank = positivo(o.rank, `${p}.rank`)
    if (!Number.isInteger(rank) || rank < last) fail(`${p}.rank`, 'posição inteira em ordem crescente esperada')
    last = rank
    const tier = o.tier
    if (tier !== 'most' && tier !== 'common' && tier !== 'less') fail(`${p}.tier`, 'faixa de nicho esperada (most/common/less)')
    return { key, rank, tier: tier as NicheTier }
  })
  return { schema: STATE_SCHEMA, edition, measuredAt, window, length, renderTime, reliability, niches: { sample: faixa(n.sample, '$.niches.sample'), ranking } }
}

// ─── formatação ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** '2026-10-08T04:30:51Z' → 'October 8, 2026'. */
export function stateHumanDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return y && m >= 1 && m <= 12 && d ? `${MONTHS[m - 1]} ${d}, ${y}` : iso
}
/** '2026-10' → 'October 2026'. */
export function stateEditionLabel(edition: string): string {
  const [y, m] = edition.split('-').map(Number)
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : edition
}
/** Janela [início, fim EXCLUSIVO) → 'September 7 – October 6, 2026' (o ano aparece uma vez quando é o mesmo). */
export function stateWindowLabel(startIso: string, endIso: string): string {
  const a = stateHumanDate(startIso)
  const b = stateHumanDate(lastCoveredDay(endIso))
  const ya = startIso.slice(0, 4)
  return ya === lastCoveredDay(endIso).slice(0, 4) ? `${a.replace(`, ${ya}`, '')} – ${b}` : `${a} – ${b}`
}
/** Fim EXCLUSIVO da janela (00:00 UTC) → o último dia coberto, ISO. */
function lastCoveredDay(endIso: string): string {
  return new Date(Date.parse(endIso) - 1).toISOString().slice(0, 10)
}
/** 44 → '44', 5.9 → '5.9', 40.2 → '40.2' (o JSON já vem com 1 casa; nunca inventa precisão). */
function num(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1)
}
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
/** A confiabilidade publicável: null sem dado OU com o desconhecido acima do corte (desconhecido nunca vira número). */
export function stateReliability(rel: StateEdition['reliability']): number | null {
  if (!rel || rel.pct === null) return null
  return rel.unknownPct > STATE_UNKNOWN_SHARE_MAX ? null : rel.pct
}

// ─── a vista que a página, o JSON-LD e o llms.txt leem ───────────────────────────────────────────────────────────────
export interface StateFinding { stat: string; label: string; detail: string }
export interface StateNicheItem { key: string; rank: number; label: string; path: string | null }
export interface StateNicheTierView { tier: NicheTier; title: string; rule: string; items: StateNicheItem[] }
export interface StateView {
  metaTitle: string
  metaDescription: string
  /** O selo pedido pela sessão CEO: "Updated October 2026". */
  seal: string
  editionLabel: string
  updatedIso: string
  updatedLabel: string
  windowLabel: string
  sourceLine: string
  lead: string
  findings: StateFinding[]
  time: { median: string; p90: string; reliability: string; caption: string } | null
  length: { median: string; bars: { label: string; pct: number; text: string }[]; caption: string } | null
  nicheTiers: StateNicheTierView[]
  /** As três primeiras posições (ideias do formulário do estudo). */
  topNiches: StateNicheItem[]
  starterExamples: string[]
  insights: { title: string; body: string }[]
  methodology: string[]
  faq: { q: string; a: string }[]
  citeLine: string
  llmsLine: string
  jsonLd: { article: Record<string, unknown>; dataset: Record<string, unknown>; faq: Record<string, unknown> }
}

const SCENE_ENGINES_LABEL = 'Seedance, Kling, Veo, MiniMax and Omni'
/** 'history' → 'History' (início de frase). */
function capital(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

export function buildStateView(e: StateEdition): StateView {
  const editionLabel = stateEditionLabel(e.edition)
  const seal = `Updated ${editionLabel}`
  const updatedIso = e.measuredAt.slice(0, 10)
  const updatedLabel = stateHumanDate(e.measuredAt)
  const firstDay = stateHumanDate(e.window.start)
  const lastDay = stateHumanDate(lastCoveredDay(e.window.end))
  const windowLabel = stateWindowLabel(e.window.start, e.window.end)
  const sourceLine = `Source: Kineo production database, customer accounts only (internal and test accounts excluded), read ${updatedLabel}. Data window: ${windowLabel} (UTC).`
  const rel = stateReliability(e.reliability)

  // nichos: na ordem da posição; por faixa para a tabela
  const tierOf = (key: string): NicheTier => e.niches.ranking.find((r) => r.key === key)!.tier
  const items: StateNicheItem[] = e.niches.ranking.map((r) => ({ key: r.key, rank: r.rank, label: STATE_NICHES[r.key].label, path: STATE_NICHES[r.key].path }))
  const shortOf = (it: StateNicheItem) => STATE_NICHES[it.key].short
  const nicheTiers: StateNicheTierView[] = (['most', 'common', 'less'] as NicheTier[])
    .map((tier) => ({ tier, title: STATE_TIER_LABELS[tier].title, rule: STATE_TIER_LABELS[tier].rule, items: items.filter((it) => tierOf(it.key) === tier) }))
    .filter((t) => t.items.length > 0)
  const topNiches = items.slice(0, 3)
  const first = items[0]
  const tiedFirst = items.filter((it) => it.rank === first.rank)
  const second = tiedFirst.length > 1 ? null : items.find((it) => it.rank > first.rank) ?? null
  const leaders = tiedFirst.length > 1 ? tiedFirst : [first, ...(second ? [second] : [])]
  const leadNicheText = tiedFirst.length > 1
    ? `${listNames(tiedFirst.map(shortOf))} tie for the top spot`
    : `${shortOf(first)} comes first${second ? `, with ${shortOf(second)} second` : ''}`
  const restOfMost = items.filter((it) => tierOf(it.key) === 'most' && !leaders.some((l) => l.key === it.key))

  const findings: StateFinding[] = []
  if (e.renderTime) {
    findings.push({
      stat: `${num(e.renderTime.medianMinutes)} min`,
      label: 'median time from request to a finished AI-generated Short',
      detail: `Measured on the engines that generate every scene (${SCENE_ENGINES_LABEL}): ${num(e.renderTime.medianMinutes)} minutes at the median and ${num(e.renderTime.p90Minutes)} minutes at the 90th percentile, from the moment the request reaches the server to the finished film in the library.`,
    })
  }
  if (e.length) {
    findings.push({
      stat: `${num(e.length.pct60Plus)}%`,
      label: `of finished Shorts run ${STATE_LONG_FROM_SECONDS} seconds or longer`,
      detail: `The median finished Short runs ${num(e.length.medianSeconds)} seconds, and ${num(e.length.pctUnder30)}% are shorter than ${STATE_SHORT_BELOW_SECONDS} seconds. ${ENGINE_GEO_REWARDS_LINE}`,
    })
  }
  if (e.reliability) {
    findings.push({
      stat: rel === null ? STATE_NOT_ENOUGH_DATA : `${num(rel)}%`,
      label: 'of AI-generated renders that started were delivered',
      detail: rel === null
        ? 'Too many renders in this window ended without a recorded outcome to publish a rate; an unknown outcome is never counted as a success or a failure.'
        : 'Delivered films ÷ (delivered films + renders that failed with a recorded error), counting only renders where at least one scene reached the model. A failed render refunds its credits automatically.',
    })
  }
  findings.push({
    stat: tiedFirst.length > 1 ? listNames(tiedFirst.map((it) => it.label)) : first.label,
    label: tiedFirst.length > 1 ? 'tie for the most common niche' : 'is the most common niche',
    detail: `Ranked by the share of creators whose ideas match each niche’s keywords: ${leadNicheText}${restOfMost.length ? `; ${listNames(restOfMost.map(shortOf))} complete the most common tier` : ''}.`,
  })

  const middlePct = e.length ? Math.round((100 - e.length.pctUnder30 - e.length.pct60Plus) * 10) / 10 : 0
  const time = e.renderTime
    ? {
        median: `${num(e.renderTime.medianMinutes)} min`,
        p90: `${num(e.renderTime.p90Minutes)} min`,
        reliability: rel === null ? STATE_NOT_ENOUGH_DATA : `${num(rel)}%`,
        caption: `Plan for minutes, not seconds — and for a slow tail: one render in ten took ${num(e.renderTime.p90Minutes)} minutes or more. A tool promising a finished Short in one minute is measuring something else, or not measuring at all.`,
      }
    : null
  const length = e.length
    ? {
        median: `${num(e.length.medianSeconds)} s`,
        bars: [
          { label: `Under ${STATE_SHORT_BELOW_SECONDS} seconds`, pct: e.length.pctUnder30, text: `${num(e.length.pctUnder30)}%` },
          { label: `${STATE_SHORT_BELOW_SECONDS}–${STATE_LONG_FROM_SECONDS - 1} seconds`, pct: middlePct, text: `${num(middlePct)}%` },
          { label: `${STATE_LONG_FROM_SECONDS} seconds or longer`, pct: e.length.pct60Plus, text: `${num(e.length.pct60Plus)}%` },
        ],
        caption: `Share of finished Shorts by length; the median runs ${num(e.length.medianSeconds)} seconds. ${ENGINE_GEO_REWARDS_LINE}`,
      }
    : null

  const motivation = items.find((it) => it.key === 'motivation')
  const insights: { title: string; body: string }[] = [
    {
      title: `${capital(listNames(leaders.map(shortOf)))} lead — motivation is not where the demand is`,
      body: `Motivation — the niche everyone pictures for a faceless channel — ${motivation ? `ranked #${motivation.rank} this month, in the ${STATE_TIER_LABELS[tierOf('motivation')].title.toLowerCase()} tier` : 'did not register in this month’s ranking'}. ${capital(listNames(topNiches.map(shortOf)))} lead instead.`,
    },
  ]
  if (e.length) {
    insights.push({
      title: 'A one-minute Short is now normal',
      body: `${num(e.length.pct60Plus)}% of finished Shorts already run ${STATE_LONG_FROM_SECONDS} seconds or longer. Write for a full minute from the start instead of stretching a short script at the end.`,
    })
  }
  if (e.renderTime) {
    insights.push({
      title: 'Plan for minutes, not seconds',
      body: `At a ${num(e.renderTime.medianMinutes)}-minute median and ${num(e.renderTime.p90Minutes)} minutes at the 90th percentile, a daily posting habit costs minutes of machine time, not hours — but it is not instant, and a workflow built on instant output will break. The bottleneck is choosing the topic, not producing the video.`,
    })
  }

  const band = (s: SampleBand) => STATE_SAMPLE_BANDS[s]
  const methodology: string[] = [
    `Data window: ${windowLabel} (UTC), the same window as the ${editionLabel} edition of the Kineo AI Video Index. Read from Kineo’s production database on ${updatedLabel}; the query is versioned with the edition.`,
    'Customer accounts only: Kineo’s own internal and test accounts are excluded from every figure. Single clips are not Shorts and are excluded.',
    `Finished Shorts (length and niches): every Short delivered to a customer in the window, on any engine — stock-footage assembly and the engines that generate every scene.${e.length ? ` Sample: ${band(e.length.sample)}.` : ''}`,
    `Time to a finished Short: from the first server record of the request to the finished film saved in the library, on the engines that generate every scene (${SCENE_ENGINES_LABEL}). Kineo 1, the stock-footage engine, is excluded here because it is no longer offered to new accounts.${e.renderTime ? ` Sample: ${band(e.renderTime.sample)}.` : ''}`,
    `Delivery rate: delivered films ÷ (delivered films + renders that failed with a recorded error), among renders that started — at least one scene reached the model, or a film was delivered. A request stopped before rendering (plan, balance or script checks) is not counted; a render with no recorded outcome is not counted as a failure, and if such renders pass ${STATE_UNKNOWN_SHARE_MAX}% of the total the rate is reported as “${STATE_NOT_ENOUGH_DATA}”.${e.reliability ? ` Sample: ${band(e.reliability.sample)}.` : ''}`,
    `Niches: the idea text each creator typed is matched against a keyword list per niche (English, Portuguese, Spanish and French). Each creator counts once per niche, and one Short can count in more than one niche. Niches are ranked by the share of creators; neighbors a few creators apart are effectively tied, so read the tiers before the exact positions. Tiers: ${(['most', 'common', 'less'] as NicheTier[]).map((t) => `${STATE_TIER_LABELS[t].title.toLowerCase()} = ${STATE_TIER_LABELS[t].rule}`).join('; ')}. Sample (creators): ${band(e.niches.sample)}.`,
    'Only medians, percentiles and rates are published — no counts of videos, creators or customers. Earlier versions of this page (July–August 2026) published counts and measured only the stock-footage engine; this edition replaces them.',
  ]

  const faq: { q: string; a: string }[] = []
  if (e.renderTime) {
    faq.push({
      q: 'How long does it take to make an AI Short?',
      a: `In Kineo’s ${editionLabel} data, a Short whose scenes are all AI-generated took ${num(e.renderTime.medianMinutes)} minutes at the median from request to finished film, and ${num(e.renderTime.p90Minutes)} minutes at the 90th percentile (data window ${windowLabel}).`,
    })
  }
  if (e.length) {
    faq.push({
      q: 'How long are AI-generated Shorts?',
      a: `The median finished Short ran ${num(e.length.medianSeconds)} seconds; ${num(e.length.pct60Plus)}% ran ${STATE_LONG_FROM_SECONDS} seconds or longer and ${num(e.length.pctUnder30)}% were shorter than ${STATE_SHORT_BELOW_SECONDS} seconds (Kineo, ${editionLabel}).`,
    })
  }
  const otherMost = items.filter((it) => tierOf(it.key) === 'most' && !topNiches.some((tn) => tn.key === it.key))
  faq.push({
    q: 'What are the most popular faceless niches right now?',
    a: `Among Kineo creators (${windowLabel}): ${listNames(topNiches.map((it) => `${shortOf(it)} (#${it.rank})`))}${otherMost.length ? `; the most common tier also includes ${listNames(otherMost.map(shortOf))}` : ''}. Ranked by the share of creators whose ideas match each niche.`,
  })

  const headline = stateHeadlineFrom(e)
  const metaTitle = `${STATE_NAME} — Original Data, ${seal}`
  const metaDescription = `${editionLabel} edition, from Kineo’s production data: ${stateHeadlineParts(headline).join('; ')}. Medians and rates only, free to cite.`
  const lead = `What do people actually make when an AI can turn any idea into a finished faceless video — and how long does it really take? This ${editionLabel} edition is read from Kineo’s production database: Shorts finished for customers between ${firstDay} and ${lastDay}.`
  const citeLine = `“${STATE_NAME} — ${editionLabel} edition”, Kineo, usekineo.com${STATE_PATH}, data window ${windowLabel} (UTC).`

  const variableMeasured: Record<string, unknown>[] = []
  if (e.renderTime) {
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Median time to a finished AI-generated Short (minutes)', value: e.renderTime.medianMinutes })
    variableMeasured.push({ '@type': 'PropertyValue', name: 'P90 time to a finished AI-generated Short (minutes)', value: e.renderTime.p90Minutes })
  }
  if (rel !== null) variableMeasured.push({ '@type': 'PropertyValue', name: 'Delivery rate among AI-generated renders that started (%)', value: rel })
  if (e.length) {
    variableMeasured.push({ '@type': 'PropertyValue', name: 'Median finished Short length (seconds)', value: e.length.medianSeconds })
    variableMeasured.push({ '@type': 'PropertyValue', name: `Share of finished Shorts ${STATE_LONG_FROM_SECONDS} seconds or longer (%)`, value: e.length.pct60Plus })
    variableMeasured.push({ '@type': 'PropertyValue', name: `Share of finished Shorts under ${STATE_SHORT_BELOW_SECONDS} seconds (%)`, value: e.length.pctUnder30 })
  }
  const org = { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' }
  const jsonLd = {
    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: metaTitle,
      datePublished: STATE_FIRST_PUBLISHED,
      dateModified: updatedIso,
      author: org,
      publisher: org,
      mainEntityOfPage: STATE_CANONICAL,
      description: metaDescription,
    },
    dataset: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${STATE_NAME} — Kineo platform data, ${editionLabel} edition`,
      description: 'Medians and rates on AI short-form video production from Kineo’s production database: time from request to a finished AI-generated Short, delivery rate of renders that started, length of finished Shorts and the faceless niches creators choose. No counts are published.',
      url: STATE_CANONICAL,
      datePublished: STATE_FIRST_PUBLISHED,
      dateModified: updatedIso,
      isAccessibleForFree: true,
      license: STATE_LICENSE,
      creator: org,
      temporalCoverage: `${e.window.start.slice(0, 10)}/${lastCoveredDay(e.window.end)}`,
      variableMeasured,
    },
    faq: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  }

  return {
    metaTitle,
    metaDescription,
    seal,
    editionLabel,
    updatedIso,
    updatedLabel,
    windowLabel,
    sourceLine,
    lead,
    findings,
    time,
    length,
    nicheTiers,
    topNiches,
    starterExamples: topNiches.map((it) => STATE_NICHES[it.key].starterIdea),
    insights,
    methodology,
    faq,
    citeLine,
    llmsLine: stateLlmsLine(headline),
    jsonLd,
  }
}

/** A posição de um nicho na edição, pela página de nicho dele (/free-ai-shorts/<slug>) — para as páginas de nicho citarem o estudo. */
export function stateNicheRankForPath(e: StateEdition, path: string): { rank: number; tierTitle: string; editionLabel: string } | null {
  const hit = e.niches.ranking.find((r) => STATE_NICHES[r.key].path === path)
  return hit ? { rank: hit.rank, tierTitle: STATE_TIER_LABELS[hit.tier].title.toLowerCase(), editionLabel: stateEditionLabel(e.edition) } : null
}

// ─── a manchete (o espelho TS que o sitemap e o llms.txt leem) ───────────────────────────────────────────────────────
export interface StateHeadline {
  edition: string
  measuredAt: string
  windowStart: string
  windowEnd: string
  medianMinutes: number | null
  p90Minutes: number | null
  pct60Plus: number | null
  /** Os nichos que lideram (o 1º, e o 2º quando não há empate no topo; todos os empatados no topo). */
  leadNiches: string[]
}
/** A manchete de uma edição (o guardião exige STATE_HEADLINE === stateHeadlineFrom(<JSON vigente>), campo a campo). */
export function stateHeadlineFrom(e: StateEdition): StateHeadline {
  const r = e.niches.ranking
  const tied = r.filter((x) => x.rank === r[0].rank)
  const second = r.find((x) => x.rank > r[0].rank)
  return {
    edition: e.edition,
    measuredAt: e.measuredAt,
    windowStart: e.window.start,
    windowEnd: e.window.end,
    medianMinutes: e.renderTime ? e.renderTime.medianMinutes : null,
    p90Minutes: e.renderTime ? e.renderTime.p90Minutes : null,
    pct60Plus: e.length ? e.length.pct60Plus : null,
    leadNiches: tied.length > 1 ? tied.map((x) => x.key) : [r[0].key, ...(second ? [second.key] : [])],
  }
}
/** As três afirmações da manchete (descrição da página e linha do llms.txt — a MESMA régua). */
export function stateHeadlineParts(h: StateHeadline): string[] {
  const parts: string[] = []
  if (h.medianMinutes !== null && h.p90Minutes !== null) parts.push(`a fully AI-generated Short takes ${num(h.medianMinutes)} minutes at the median (${num(h.p90Minutes)} at the 90th percentile)`)
  if (h.pct60Plus !== null) parts.push(`${num(h.pct60Plus)}% of finished Shorts run ${STATE_LONG_FROM_SECONDS} seconds or longer`)
  const names = h.leadNiches.map((k) => STATE_NICHES[k]?.short).filter((x): x is string => Boolean(x))
  if (names.length) parts.push(`${listNames(names)} lead the niches`)
  return parts
}
/** A linha do /llms.txt a partir da manchete (sem ler JSON: os carregadores dos guardiões do llms.txt só leem .ts). */
/** O rótulo do link do /llms.txt ('State of AI Shorts 2026 — October 2026 edition'). */
export function stateLlmsLabel(h: StateHeadline): string {
  return `${STATE_NAME} — ${stateEditionLabel(h.edition)} edition`
}
/** O miolo da linha do /llms.txt (entre o link e o 'Cite this page for'). A rota monta o link literal em volta. */
export function stateLlmsBody(h: StateHeadline): string {
  return `original data read from Kineo’s production database (${stateWindowLabel(h.windowStart, h.windowEnd)}, customer accounts only) — ${stateHeadlineParts(h).join('; ')}. Medians and rates only, no counts; updated monthly and free to cite.`
}
export const STATE_LLMS_CITE = 'Cite this page for "how long an AI Short takes to render", "how long AI Shorts are" and "which faceless niches are most in demand".'
/** A linha inteira (a página e o guardião usam; a rota do /llms.txt escreve o mesmo texto com o link literal). */
export function stateLlmsLine(h: StateHeadline): string {
  return `- [${stateLlmsLabel(h)}](https://www.usekineo.com${STATE_PATH}): ${stateLlmsBody(h)} ${STATE_LLMS_CITE}`
}
