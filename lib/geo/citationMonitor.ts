// KINEO-GEO-CITACAO-SEMANAL-2026-10-08 — o monitor SEMANAL de citação no ChatGPT (aprovado pelo fundador em 08/10).
//
// POR QUÊ: o ChatGPT é o canal que paga — 46% dos cadastros e 100% dos pagantes dos últimos 28 dias. Até aqui a citação
// só era medida à mão (docs/citacoes-chatgpt/*: 20 perguntas lidas no navegador, uma vez). Agora, toda segunda, a rota
// app/api/cron/geo-citation-monitor faz as perguntas fixas abaixo ao modelo da OpenAI COM busca na web e grava, por
// pergunta, se a Kineo aparece na resposta e se usekineo.com é citado. Leitura: docs/queries/GEO-CITACOES.sql.
//
// LIB PURA (nenhum import): o guardião scripts/test-geo-citation-monitor-2026-10-08.mjs carrega este arquivo direto no
// Node. Quem chama o modelo e grava é a rota.
//
// O QUE CONTA COMO O QUÊ (analyzeCitationAnswer):
//   · mentions_kineo — a Kineo NOMEADA no texto que a pessoa lê ("Kineo", "KineoAI", "usekineo.com" escrito). O chip de
//     citação "([usekineo.com](url))" que a busca acrescenta NÃO conta como menção: ele é citação, e citação tem coluna
//     própria. O homônimo kineo.studio (outro produto — ver /kineo-vs-kineo-studio) e o domínio kineo.com nunca contam.
//   · cites_usekineo — algum link (anotação url_citation ou URL escrita no texto) cujo HOST é usekineo.com ou um
//     subdomínio dele. Host de verdade, não substring: "usekineo.com.evil.io" e "notusekineo.com" não contam.
//   · competitors_mentioned — concorrentes da lista fixa nomeados no texto OU citados pelo domínio, na ordem da lista.
//
// Mudou o TEXTO de uma pergunta? Troque o id também: a leitura semana a semana agrupa por id.

export const GEO_MONITOR_VERSION = 'geo_citation_v1'
export const GEO_CHECK_EVENT = 'geo_citation_check'
export const GEO_SUMMARY_EVENT = 'geo_citation_summary'
export const GEO_ROUTE_PATH = '/api/cron/geo-citation-monitor'

/**
 * Modelo barato COM busca na web — o mesmo do /ads/v2 (lib/ads/v2Research.ts), que já roda em produção com este SDK
 * (openai 4.104: só conhece a ferramenta `web_search_preview`).
 */
export const GEO_MODEL = 'gpt-4.1-mini'
/** Teto DURO de chamadas à OpenAI por execução (cada pergunta = 1 chamada; a rota chama com maxRetries 0). */
export const GEO_MAX_CALLS_PER_RUN = 12
/** Saída pequena: as instruções pedem até 200 palavras (~270 tokens); 600 é folga, não alvo. */
export const GEO_MAX_OUTPUT_TOKENS = 600
/** Timeout de CADA chamada. Com 3 em paralelo, o pior caso é ceil(12/3) × 40 s = 160 s — abaixo do orçamento. */
export const GEO_CALL_TIMEOUT_MS = 40_000
export const GEO_CONCURRENCY = 3
/** Passado isto, a rodada não começa pergunta nova: sobra tempo para gravar o resumo antes do maxDuration (300 s). */
export const GEO_RUN_BUDGET_MS = 200_000
/** Quanto da resposta vai para o evento (a resposta inteira cabe: 600 tokens ≈ 2.400 caracteres). */
export const GEO_ANSWER_MAX_CHARS = 2_400
/** Entrada assumida por chamada no custo MÁXIMO do ensaio (instruções + pergunta, com folga). */
export const GEO_ASSUMED_INPUT_TOKENS = 1_000
/**
 * Preços conferidos em developers.openai.com/api/docs/pricing em 08/10/2026: web_search_preview em modelo
 * não-raciocínio = US$ 25,00 por 1.000 chamadas (o conteúdo da busca é grátis); gpt-4.1-mini = US$ 0,40 / 1,60 por
 * milhão de tokens (entrada/saída). O evento grava buscas e tokens para medir o real.
 */
export const GEO_USD = { perSearch: 0.025, inputPerMillion: 0.4, outputPerMillion: 1.6 } as const

export interface GeoQuestion {
  id: string
  text: string
}

/**
 * As perguntas que nossos clientes fazem ao ChatGPT, em inglês, sem marca (salvo a da própria marca). As 8 primeiras
 * vieram do fundador; as 4 últimas cobrem páginas que já trazem gente: Veo (página de motor que vendeu), o comparativo
 * Seedance 1.5 × 2.5 (rodada 2 do GEO), o nicho de terror (niche_horror, 57 cadastros vindos do ChatGPT em 90 dias) e
 * a alternativa ao Sora (/sora-alternative).
 */
export const GEO_QUESTIONS: ReadonlyArray<GeoQuestion> = [
  { id: 'best-shorts', text: 'best AI video generator for YouTube Shorts' },
  { id: 'seedance-15-free', text: 'is Seedance 1.5 free' },
  { id: 'free-text-to-video', text: 'free AI video generator from text' },
  { id: 'faceless', text: 'faceless AI video generator' },
  { id: 'kling-3-online', text: 'Kling 3 online' },
  { id: 'seedance-25-online', text: 'Seedance 2.5 online' },
  { id: 'narration-captions', text: 'AI video generator with narration and captions' },
  { id: 'kineo-brand', text: 'kineo ai video' },
  { id: 'veo-31-online', text: 'Veo 3.1 online' },
  { id: 'seedance-15-vs-25', text: 'Seedance 1.5 vs Seedance 2.5' },
  { id: 'horror-story-video', text: 'AI horror story video generator' },
  { id: 'sora-alternative', text: 'best Sora alternative for AI video' },
]

/** O que a rodada pergunta: a lista fixa, cortada no teto. Nunca mais que GEO_MAX_CALLS_PER_RUN. */
export function geoPlan(questions: ReadonlyArray<GeoQuestion>): GeoQuestion[] {
  return questions.slice(0, GEO_MAX_CALLS_PER_RUN)
}

/**
 * Instruções NEUTRAS (sem marca nenhuma — o guardião confere): queremos a resposta que um assistente com busca daria,
 * não uma resposta empurrada para a Kineo.
 */
export const GEO_INSTRUCTIONS = [
  'You are a helpful assistant answering a question that a user typed into a chat app.',
  'Search the web first. Then answer the way a good chat assistant would: when the question asks for tools, apps or websites, recommend specific ones by name and cite your sources.',
  'Be concise: at most 200 words.',
].join('\n')

export interface GeoCompetitor {
  name: string
  /** Regex SEM a flag g (test() com g guarda estado entre chamadas). */
  patterns: ReadonlyArray<RegExp>
  /** Domínios: conta o próprio domínio e os subdomínios; o domínio mais específico vence (dreamina.capcut.com → Dreamina). */
  hosts: ReadonlyArray<string>
}

/** Lista fixa. Os 12 primeiros são os do fundador; depois, outros do mesmo tipo. */
export const GEO_COMPETITORS: ReadonlyArray<GeoCompetitor> = [
  { name: 'InVideo', patterns: [/\binvideo\b/i], hosts: ['invideo.io'] },
  { name: 'Pictory', patterns: [/\bpictory\b/i], hosts: ['pictory.ai'] },
  { name: 'CapCut', patterns: [/\bcapcut\b/i], hosts: ['capcut.com'] },
  { name: 'Revid', patterns: [/\brevid\b/i], hosts: ['revid.ai'] },
  { name: 'Fliki', patterns: [/\bfliki\b/i], hosts: ['fliki.ai'] },
  { name: 'Synthesia', patterns: [/\bsynthesia\b/i], hosts: ['synthesia.io'] },
  { name: 'HeyGen', patterns: [/\bhey\s?gen\b/i], hosts: ['heygen.com'] },
  { name: 'Higgsfield', patterns: [/\bhiggsfield\b/i], hosts: ['higgsfield.ai'] },
  { name: 'Pika', patterns: [/\bpika\b/i], hosts: ['pika.art'] },
  // "runway" minúsculo é palavra comum ("financial runway"); a marca vem com maiúscula ou como runwayml.
  { name: 'Runway', patterns: [/\bRunway\b/, /\brunwayml\b/i], hosts: ['runwayml.com'] },
  { name: 'Kling', patterns: [/\bkling\b/i], hosts: ['klingai.com'] },
  { name: 'Veo', patterns: [/\bveo\b/i], hosts: [] },
  // modelos de vídeo com app próprio
  { name: 'Sora', patterns: [/\bsora\b/i], hosts: ['sora.com', 'sora.chatgpt.com'] },
  { name: 'Seedance', patterns: [/\bseedance\b/i], hosts: ['seed.bytedance.com'] },
  { name: 'Dreamina', patterns: [/\bdreamina\b/i], hosts: ['dreamina.capcut.com'] },
  { name: 'Hailuo (MiniMax)', patterns: [/\bhailuo\b/i, /\bminimax\b/i], hosts: ['hailuoai.video', 'hailuoai.com'] },
  { name: 'Luma', patterns: [/\bLuma\b/, /\bdream\s?machine\b/i, /\blumalabs\b/i], hosts: ['lumalabs.ai'] },
  { name: 'Wan', patterns: [/\bwan\s?\d/i, /\bwan\s?ai\b/i], hosts: ['wan.video'] },
  { name: 'PixVerse', patterns: [/\bpixverse\b/i], hosts: ['pixverse.ai'] },
  { name: 'Vidu', patterns: [/\bvidu\b/i], hosts: ['vidu.com'] },
  // plataformas que revendem vários motores (a concorrência direta das nossas páginas de motor)
  { name: 'Krea', patterns: [/\bkrea\b/i], hosts: ['krea.ai'] },
  { name: 'Freepik', patterns: [/\bfreepik\b/i], hosts: ['freepik.com'] },
  { name: 'Pollo AI', patterns: [/\bpollo(?:\.ai|\s+ai)\b/i], hosts: ['pollo.ai'] },
  { name: 'OpenArt', patterns: [/\bopenart\b/i], hosts: ['openart.ai'] },
  { name: 'Leonardo AI', patterns: [/\bleonardo(?:\.ai|\s+ai)\b/i], hosts: ['leonardo.ai'] },
  // editores e geradores de Shorts / faceless / texto → vídeo
  { name: 'Canva', patterns: [/\bcanva\b/i], hosts: ['canva.com'] },
  { name: 'VEED', patterns: [/\bveed\b/i], hosts: ['veed.io'] },
  { name: 'Adobe Express/Firefly', patterns: [/\badobe\s+(?:express|firefly)\b/i, /\bfirefly\b/i], hosts: ['adobe.com'] },
  { name: 'Clipchamp', patterns: [/\bclipchamp\b/i], hosts: ['clipchamp.com'] },
  { name: 'Kapwing', patterns: [/\bkapwing\b/i], hosts: ['kapwing.com'] },
  { name: 'Descript', patterns: [/\bdescript\b/i], hosts: ['descript.com'] },
  { name: 'Lumen5', patterns: [/\blumen5\b/i], hosts: ['lumen5.com'] },
  { name: 'Opus Clip', patterns: [/\bopus\s?clip\b/i], hosts: ['opus.pro'] },
  { name: 'Vidnoz', patterns: [/\bvidnoz\b/i], hosts: ['vidnoz.com'] },
  { name: 'Zebracat', patterns: [/\bzebracat\b/i], hosts: ['zebracat.ai'] },
  { name: 'AutoShorts.ai', patterns: [/\bautoshorts\b/i], hosts: ['autoshorts.ai'] },
  { name: 'Faceless.video', patterns: [/\bfaceless\.video\b/i], hosts: ['faceless.video'] },
  { name: 'Crayo', patterns: [/\bcrayo\b/i], hosts: ['crayo.ai'] },
  { name: 'Vadoo', patterns: [/\bvadoo\b/i], hosts: ['vadoo.tv'] },
  { name: 'Captions.ai', patterns: [/\bcaptions\.ai\b/i], hosts: ['captions.ai'] },
  { name: 'D-ID', patterns: [/\bd-id\b/i], hosts: ['d-id.com'] },
  { name: 'Colossyan', patterns: [/\bcolossyan\b/i], hosts: ['colossyan.com'] },
  // o homônimo: outro produto chamado Kineo. Aparecer aqui NUNCA conta como menção nossa.
  { name: 'kineo.studio (homônimo)', patterns: [/\bkineo\.studio\b/i], hosts: ['kineo.studio'] },
]

export interface GeoCitationAnalysis {
  mentions_kineo: boolean
  cites_usekineo: boolean
  usekineo_urls: string[]
  competitors_mentioned: string[]
}

const MAX_USEKINEO_URLS = 10

/** Domínios que NÃO são a Kineo e têm "kineo" no nome: o homônimo (kineo.studio) e kineo.com. usekineo.com não casa. */
const KINEO_LOOKALIKE_DOMAIN_RE = /\b(?:[a-z0-9-]+\.)*kineo\.(?:com|studio)\b/gi
/** O mesmo, sem a flag g, para test() (com g o regex guarda estado entre chamadas). */
const KINEO_LOOKALIKE_DOMAIN_TEST = /\b(?:[a-z0-9-]+\.)*kineo\.(?:com|studio)\b/i
const KINEO_NAME_RE = /\bkineo(?:ai)?\b/i
const USEKINEO_RE = /usekineo/i
/** Chip de citação da busca: "([site](url))", com um ou mais links dentro dos parênteses. */
const CITATION_CHIP_RE = /\(\s*(?:\[[^\]]*\]\([^)\s]*\)[\s,;]*)+\)/g
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\([^)\s]*\)/g
const BARE_URL_RE = /https?:\/\/[^\s)\]>"'<]+/gi

/** URL normalizada (http/https; sem #fragmento e sem o ?utm_source=openai que a busca acrescenta). null = inválida. */
export function normalizeUrl(raw: unknown): { url: string; host: string } | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().replace(/[.,;:!?]+$/, '')
  if (!s) return null
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  if (!host) return null
  const utm = (u.searchParams.get('utm_source') ?? '').toLowerCase()
  if (utm === 'openai' || utm === 'chatgpt.com') u.searchParams.delete('utm_source')
  u.hash = ''
  return { url: u.toString().replace(/\?$/, ''), host }
}

/** usekineo.com ou subdomínio dele. Comparação de HOST, nunca de substring. */
export function isUsekineoHost(host: unknown): boolean {
  if (typeof host !== 'string') return false
  const h = host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  return h === 'usekineo.com' || h.endsWith('.usekineo.com')
}

/** kineo.studio (o homônimo) ou kineo.com, com subdomínios. usekineo.com NÃO é (não termina em ".kineo.com"). */
function isKineoLookalikeHost(host: string): boolean {
  return host === 'kineo.studio' || host.endsWith('.kineo.studio') || host === 'kineo.com' || host.endsWith('.kineo.com')
}

/** URLs escritas no próprio texto (links markdown e URLs soltas). */
export function urlsInText(text: unknown): string[] {
  if (typeof text !== 'string' || !text) return []
  return (text.match(BARE_URL_RE) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ''))
}

/** O texto que a pessoa LÊ: sem os chips de citação, link markdown vira só o rótulo, URL solta sai. */
export function readableText(text: unknown): string {
  if (typeof text !== 'string' || !text) return ''
  return text
    .replace(CITATION_CHIP_RE, ' ')
    .replace(MARKDOWN_LINK_RE, '$1')
    .replace(BARE_URL_RE, ' ')
}

function competitorForHost(host: string): GeoCompetitor | null {
  let best: GeoCompetitor | null = null
  let bestLen = 0
  for (const c of GEO_COMPETITORS) {
    for (const h of c.hosts) {
      if ((host === h || host.endsWith(`.${h}`)) && h.length > bestLen) {
        best = c
        bestLen = h.length
      }
    }
  }
  return best
}

/**
 * A FUNÇÃO PURA do monitor: recebe o texto da resposta e as URLs citadas e diz se a Kineo aparece, se usekineo.com é
 * citado (e por quais URLs) e quais concorrentes da lista fixa aparecem. Nunca lança; entrada inválida = tudo falso.
 */
export function analyzeCitationAnswer(text: unknown, citedUrls: unknown): GeoCitationAnalysis {
  const raw = typeof text === 'string' ? text : ''
  const cited = Array.isArray(citedUrls) ? citedUrls.filter((u): u is string => typeof u === 'string') : []
  const prose = readableText(raw)

  const usekineo: string[] = []
  const found = new Set<string>()
  let lookalikeCited = false
  for (const u of [...cited, ...urlsInText(raw)]) {
    const n = normalizeUrl(u)
    if (!n) continue
    if (isUsekineoHost(n.host)) {
      if (!usekineo.includes(n.url) && usekineo.length < MAX_USEKINEO_URLS) usekineo.push(n.url)
      continue
    }
    if (isKineoLookalikeHost(n.host)) lookalikeCited = true
    const c = competitorForHost(n.host)
    if (c) found.add(c.name)
  }
  for (const c of GEO_COMPETITORS) {
    if (c.patterns.some((re) => re.test(prose))) found.add(c.name)
  }

  // Menção: "usekineo" escrito é sempre nosso. O nome "Kineo" sozinho é ambíguo — quando a resposta o liga SÓ ao
  // homônimo (kineo.studio / kineo.com no texto ou nas fontes) e usekineo não aparece em lugar nenhum, o nome é do outro.
  const proseSemHomonimo = prose.replace(KINEO_LOOKALIKE_DOMAIN_RE, ' ')
  const homonimo = lookalikeCited || KINEO_LOOKALIKE_DOMAIN_TEST.test(raw)
  const usekineoEmAlgumLugar = usekineo.length > 0 || USEKINEO_RE.test(raw)
  const mentions_kineo = USEKINEO_RE.test(proseSemHomonimo) || (KINEO_NAME_RE.test(proseSemHomonimo) && !(homonimo && !usekineoEmAlgumLugar))
  return {
    mentions_kineo,
    cites_usekineo: usekineo.length > 0,
    usekineo_urls: usekineo,
    competitors_mentioned: GEO_COMPETITORS.map((c) => c.name).filter((name) => found.has(name)),
  }
}

/** Domínios citados (sem www, sem repetir, na ordem em que aparecem) — para ver quem o ChatGPT usa como fonte. */
export function citedHosts(urls: unknown, max = 20): string[] {
  const out: string[] = []
  if (!Array.isArray(urls)) return out
  for (const u of urls) {
    const n = normalizeUrl(u)
    if (n && !out.includes(n.host)) out.push(n.host)
    if (out.length >= max) break
  }
  return out
}

/**
 * Achata o `output` da Responses API: o texto das partes output_text (juntas por '\n'), as URLs das anotações
 * url_citation e quantas buscas o modelo fez (itens web_search_call). Pura; nunca lança.
 */
export function flattenResponseOutput(output: unknown): { text: string; urls: string[]; searches: number } {
  let text = ''
  const urls: string[] = []
  let searches = 0
  if (!Array.isArray(output)) return { text, urls, searches }
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const it = item as { type?: unknown; content?: unknown }
    if (it.type === 'web_search_call') {
      searches += 1
      continue
    }
    if (it.type !== 'message' || !Array.isArray(it.content)) continue
    for (const part of it.content) {
      if (!part || typeof part !== 'object') continue
      const p = part as { type?: unknown; text?: unknown; annotations?: unknown }
      if (p.type !== 'output_text' || typeof p.text !== 'string') continue
      text = text ? `${text}\n${p.text}` : p.text
      if (!Array.isArray(p.annotations)) continue
      for (const a of p.annotations) {
        if (!a || typeof a !== 'object') continue
        const an = a as { type?: unknown; url?: unknown }
        if (an.type === 'url_citation' && typeof an.url === 'string') urls.push(an.url)
      }
    }
  }
  return { text, urls, searches }
}

/** Custo estimado em US$ (4 casas) pelos preços de GEO_USD. */
export function estimateGeoUsd(u: { searches: number; inputTokens: number; outputTokens: number }): number {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)
  const usd = n(u.searches) * GEO_USD.perSearch + (n(u.inputTokens) * GEO_USD.inputPerMillion + n(u.outputTokens) * GEO_USD.outputPerMillion) / 1_000_000
  return Math.round(usd * 10_000) / 10_000
}

/** Teto de custo de uma rodada com `planned` perguntas (1 busca cada, saída no máximo, entrada assumida). */
export function geoCostCeilingUsd(planned: number): number {
  const n = Number.isFinite(planned) && planned > 0 ? Math.min(planned, GEO_MAX_CALLS_PER_RUN) : 0
  return estimateGeoUsd({ searches: n, inputTokens: n * GEO_ASSUMED_INPUT_TOKENS, outputTokens: n * GEO_MAX_OUTPUT_TOKENS })
}

/** Segunda-feira 00:00 UTC da semana de `ms`, em 'AAAA-MM-DD' — a mesma semana do date_trunc('week') do Postgres. */
export function geoWeekStart(ms: number): string {
  const d = new Date(Number.isFinite(ms) ? ms : 0)
  const back = (d.getUTCDay() + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10)
}
