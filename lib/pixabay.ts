// Push #353 — Pixabay Video API integration as primary B-roll source.
//
// Pixabay replaces Pexels as the live stock footage provider. Key advantages
// over the old Pexels integration:
//   1. Category filter (nature/places/business/science) tightens results at
//      the API level, reducing lifestyle pollution before it reaches our code.
//   2. Tag-based post-filter rejects lifestyle/portrait clips using the
//      structured tags Pixabay returns — more reliable than Pexels slug inspection.
//   3. Free tier supports 100 req/min, more than enough for the pipeline.
//
// Fallback hierarchy (unchanged from #351):
//   Pixabay HIT  →  use it
//   Pixabay MISS →  FALLBACK-A (cycling, #352) → FALLBACK-B (stockLibrary)
//
// Toggle: set ENABLE_PIXABAY=false to disable and fall straight to FALLBACK-A/B.
// Never throws — all helpers return null/[] on error so the pipeline stays alive.

// KINEO-FAST-V4 — picked clips are copied into our own library (fire-and-forget).
import { vaultClipAsync } from './clipVault'
// ═══ KINEO-MULTIFORMATO-2026-09-02 ════════════════════════════════════════
// O ranker deste arquivo assumia Short em dois lugares (bônus de retrato e
// penalidade de resolução). Com 16:9/1:1/4:5 no produto, essa suposição vira
// defeito: escolheria justamente o clipe que o corte vai destruir.
//
// Igual ao compose: variável de módulo fixada na primeira linha da entrada
// pública (`getPixabayClipsForScene`). O caminho entre a fixação e o uso é
// assíncrono (há `await` de rede), MAS o valor é o mesmo para toda a cena e
// para todo o vídeo — um render inteiro tem UM enquadramento. Duas cenas
// concorrentes do MESMO vídeo carregam o mesmo valor; de vídeos diferentes,
// a única forma de intercalar seria dois renders de aspectos diferentes na
// mesma instância de lambda, cenário em que o pior caso é escolher um clipe
// com a orientação do outro formato — degradação estética, nunca falha de
// render nem cobrança errada. Se um dia isso incomodar, vira parâmetro
// explícito em collectCandidates/searchAndFilter.
import { aspectSpec, type AspectSpec } from '@/lib/aspect'

let ACTIVE_FRAME: AspectSpec = aspectSpec('9:16')
function setActiveFrame(raw?: unknown): AspectSpec {
  ACTIVE_FRAME = aspectSpec(raw)
  return ACTIVE_FRAME
}
// PUSH #96 — aesthetic re-ranker: scores how good a candidate is likely to LOOK
// (resolution / framing / duration / style vocabulary / fps / crowd proxy) from
// metadata Pixabay already returns. Strictly a secondary term — see the score
// composition in collectCandidates.
import {
  scoreAesthetics,
  formatAestheticBreakdown,
  AESTHETIC_MAX_SWING,
} from './broll/aesthetic-score'

const PIXABAY_API = 'https://pixabay.com/api/videos/'

// ── Types ──────────────────────────────────────────────────────────────────

interface PixabayResolution {
  url: string
  width: number
  height: number
  size: number
  thumbnail: string
}

interface PixabayVideo {
  id: number
  pageURL: string
  type: string
  /** Comma-separated tags from Pixabay */
  tags: string
  duration: number
  videos: {
    large: PixabayResolution
    medium: PixabayResolution
    small: PixabayResolution
    tiny: PixabayResolution
  }
  // PUSH #96 — engagement counters. These ARE part of the documented Pixabay
  // video hit (views / downloads / likes / comments); they were simply never
  // declared here. Optional so a malformed hit can never break parsing — the
  // aesthetic scorer treats a missing counter as unknown, not as zero.
  views?: number
  downloads?: number
  likes?: number
  comments?: number
}

// ── Category inference ─────────────────────────────────────────────────────
// Maps query keywords → Pixabay category param.
// Category narrows Pixabay's index for tighter results; omit for generic queries.

const KEYWORD_TO_CATEGORY: ReadonlyArray<[RegExp, string]> = [
  [/\b(mountain|volcano|glacier|desert|ocean|forest|river|waterfall|landscape|nature|wildlife|animal)\b/i, 'nature'],
  [/\b(city|cities|skyline|street|building|monument|landmark|temple|mosque|cathedral|architecture)\b/i, 'places'],
  [/\b(travel|tourism|country|village|town|destination|explore)\b/i, 'travel'],
  [/\b(money|finance|stock|market|bank|economy|wealth|business|office|corporate|luxury|jet)\b/i, 'business'],
  [/\b(science|history|ancient|medieval|artifact|museum|lab|experiment|space|cosmos|universe)\b/i, 'science'],
]

function inferCategory(query: string): string | undefined {
  for (const [pattern, cat] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(query)) return cat
  }
  return undefined
}

// ── Lifestyle tag filter ───────────────────────────────────────────────────
// Pixabay returns comma-separated tags per video. We reject any clip whose
// tags match lifestyle/portrait vocabulary when the scene doesn't need people.

const LIFESTYLE_TAG_SET = new Set([
  'lifestyle', 'portrait', 'fashion', 'model', 'influencer', 'selfie',
  'dancing', 'dance', 'party', 'celebration', 'fitness', 'yoga', 'gym',
  'workout', 'teenager', 'teen', 'couple', 'romance', 'wedding',
  'street fashion', 'urban lifestyle', 'content creator',
  // Push #437 — generic lifestyle clips that leaked into a finance video.
  'couch', 'sofa', 'walking', 'pedestrian', 'casual', 'relaxing', 'vlog', 'vlogger',
])

// Push #437 — HARD lifestyle tags: rejected for EVERY scene, even ones that do
// reference a person. "Mark Cuban lived like a broke student" should never pull
// a kid doing homework in a classroom. These are never the right subject for a
// billionaire / money / mystery / facts channel.
const HARD_LIFESTYLE_TAGS = new Set([
  'homework', 'classroom', 'school', 'student', 'students', 'pupil',
  'child', 'children', 'kid', 'kids', 'baby', 'toddler', 'kindergarten',
])

// Push #451 — HARD off-topic / kitsch blacklist. Pixabay surfaces these for
// money/wealth/fortune queries (the recurring "lucky cat" / maneki-neko that
// ruined money videos), plus generic non-photoreal junk. NONE of these fit a
// finance / geography / mystery / learning channel, so they're rejected for
// EVERY scene — even when the clip ALSO carries a 'money' tag.
const HARD_OFFTOPIC_TAGS = new Set([
  'cat', 'kitten', 'kitty', 'figurine', 'ornament', 'talisman', 'amulet',
  'trinket', 'doll', 'toy', 'plastic', 'clipart', 'cartoon', 'illustration',
  'animation', 'animated', 'vector', 'graphic', 'render', 'drawing', 'emoji',
])
// Multi-word kitsch that appears as a single Pixabay tag (Set exact-match misses these).
const HARD_OFFTOPIC_SUBSTRINGS = ['maneki', 'feng shui', 'lucky cat', 'fortune cat', '3d render']

function hasLifestylePollution(video: PixabayVideo, sceneNeedsPeople: boolean): boolean {
  const tags = video.tags
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
  // Push #451 — kitsch / off-topic offenders are ALWAYS rejected (lucky cat etc.).
  if (tags.some((t) => HARD_OFFTOPIC_TAGS.has(t))) return true
  const blob = video.tags.toLowerCase()
  if (HARD_OFFTOPIC_SUBSTRINGS.some((s) => blob.includes(s))) return true
  // Hard offenders are always rejected.
  if (tags.some((t) => HARD_LIFESTYLE_TAGS.has(t))) return true
  // Soft lifestyle tags only matter when the scene isn't about people.
  if (sceneNeedsPeople) return false
  return tags.some((t) => LIFESTYLE_TAG_SET.has(t))
}

// ── Positive relevance gate (Push #403 — kill the "cat video") ──────────────
// Pixabay's search can return loosely-related clips, especially after we
// broaden the query (first-3-tokens / no-category). Without a positive check we
// accepted the first non-lifestyle clip even if its tags had NOTHING to do with
// the narration (e.g. a cat clip for an "ocean search" beat). This gate requires
// at least one meaningful query word to appear in the clip's tags; otherwise the
// clip is rejected and the pipeline tries the next query / repeats a relevant
// prior clip instead of showing something off-topic.
// PUSH #93 — the old single list conflated GENERIC filler ("the", "video",
// "clip") with STYLE/framing words ("golden hour", "aerial", "macro"). Both
// were stripped before the relevance test, so a query made only of style words
// ("golden hour", "wide establishing low angle") ended up with ZERO judge-able
// tokens and tagsRelevantToQuery returned true for EVERY clip — no gate at all,
// which is how style-suffixed queries pulled in completely off-topic footage.
// The two lists are now separate: STYLE_TOKENS are never relevance evidence
// (they are not topic), but they ARE a small ranking bonus (styleAlignScore),
// so a clip that genuinely matches the requested look still gets credit.
const RELEVANCE_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'over', 'under',
  'video', 'footage', 'clip', 'shot', 'scene', 'background',
])

// 02/07 (validação com vídeo Fast real, logs de prod) — sufixos de ESTILO que o
// BrollPlan anexa às queries ("golden hour", "close-up macro", "wide establishing",
// "POV", "low angle") estavam contando como matches de RELEVÂNCIA: um clipe
// "ocean palm golden hour" (matches=2 em golden+hour) venceu o clipe real de
// cratera de enxofre (matches=1 em volcano) na cena do Danakil. Palavras de
// enquadramento/luz não são TÓPICO — fora do score de relevância; a busca do
// Pixabay ainda as usa na query normal.
const STYLE_TOKENS = new Set([
  'cinematic', 'closeup', 'close', 'aerial', 'drone', 'vertical', 'style',
  'golden', 'hour', 'macro', 'establishing', 'pov', 'medium', 'wide', 'angle',
  'low', 'slow', 'motion', 'timelapse', '4k', 'uhd',
])

/** CONTENT tokens only — style/framing words are excluded on purpose (#93).
 *  PUSH #93 — de-duplicated: a query that repeats a word ("money money moves")
 *  must not count as two matches, either for the gate's 2-hit threshold or for
 *  the ranking's matches×4. */
function meaningfulTokens(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !RELEVANCE_STOPWORDS.has(t) && !STYLE_TOKENS.has(t)),
    ),
  )
}

/** PUSH #93 — clip tags as discrete words, so matching is word-level not blob-level. */
function tagWordsOf(video: PixabayVideo): string[] {
  return video.tags.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

// PUSH #93 — the old test was a raw substring search over the whole tag blob,
// so short tokens matched INSIDE unrelated words ("ice" → "office"/"price",
// "art" → "particle", "sea" → "research") and one such accident was enough to
// pass the relevance gate. Now: an exact tag-word match always counts, and the
// useful loose cases ("ocean" → "oceanic", "plane" → "airplane") are still
// allowed but only for tokens of 5+ chars, where an accidental hit is unlikely.
function tokenHitsTags(token: string, tagWords: string[]): boolean {
  for (const w of tagWords) if (w === token) return true
  if (token.length < 5) return false
  for (const w of tagWords) {
    if (w.includes(token)) return true
    if (w.length >= 5 && token.includes(w)) return true
  }
  return false
}

function tagsRelevantToQuery(video: PixabayVideo, query: string): boolean {
  const qTokens = meaningfulTokens(query)
  // If the query has no judge-able CONTENT tokens, don't block (can't assess).
  if (qTokens.length === 0) return true
  const tagWords = tagWordsOf(video)
  let hits = 0
  for (const t of qTokens) if (tokenHitsTags(t, tagWords)) hits++
  // PUSH #93 — long, specific queries carry enough signal that a single token
  // hit shouldn't be enough (that's how one shared word let an unrelated clip
  // through). Require 2 hits from 4+ content tokens; keep the ≥1 rule for short
  // queries so the pool never empties — an empty pool means FALLBACK-A repeats
  // a clip, which is a worse user-visible outcome than a slightly loose match.
  // The broadening tiers (first-3 / first-2 tokens) shrink the query, so the
  // threshold drops back to 1 automatically if 2 proved too strict.
  const needed = qTokens.length >= 4 ? 2 : 1
  return hits >= needed
}

// PUSH #93 — style/framing words are a RANKING bonus, never relevance evidence:
// a clip that IS shot golden-hour/aerial when the query asked for it should win
// a tie, but must never be the reason an off-topic clip is accepted.
function styleAlignScore(video: PixabayVideo, query: string): number {
  const qStyle = new Set(
    query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => STYLE_TOKENS.has(t)),
  )
  if (qStyle.size === 0) return 0
  const tagWords = new Set(tagWordsOf(video))
  let n = 0
  for (const t of qStyle) if (tagWords.has(t)) n++
  return Math.min(2, n)
}

// Push #483 (02/07) — count HOW MANY meaningful query tokens the clip's tags
// share with the query. tagsRelevantToQuery is a pass/fail gate (≥1 token);
// this count feeds the candidate RANKING so a clip matching "volcano"+"lava"
// +"eruption" beats one matching only "volcano".
function tagMatchCount(video: PixabayVideo, query: string): number {
  const qTokens = meaningfulTokens(query)
  if (qTokens.length === 0) return 0
  // PUSH #93 — same word-level matcher as the gate, so the ranking can't reward
  // an accidental substring hit ("ice" inside "office") the gate now rejects.
  const tagWords = tagWordsOf(video)
  return qTokens.filter((t) => tokenHitsTags(t, tagWords)).length
}

// ── KINEO-FAST-CINEMA-2026-07-10 — "AI Gen look" ranking signals ────────────
// Fast Mode is the top-of-funnel demo: the closer its stock picks look to the
// AI Generated engine (dark, cinematic, aerial, high production value), the
// higher the free→paid conversion. Three additive ranking signals:
//
//   1. CINEMATIC STYLE BONUS — clips tagged aerial/drone/night/fog/storm/etc.
//      read as "produced" footage; daylight handheld home-video reads cheap.
//   2. RESOLUTION BONUS/PENALTY — a real 1080p+ "large" rendition crops to
//      9:16 crisply; clips that only ship small/tiny renditions look soft.
//   3. STYLE COHERENCE — a per-video style context accumulates the style tags
//      of clips already picked, and later scenes get a bonus for matching
//      them. One video stays "night aerial moody" instead of patchworking a
//      bright beach clip between two night skylines (the single biggest
//      "stock patchwork" tell vs AI Gen's consistent art direction).
const CINEMATIC_STYLE_TAGS = [
  'aerial', 'drone', 'night', 'dark', 'sunset', 'sunrise', 'dusk', 'dawn',
  'fog', 'mist', 'storm', 'dramatic', 'cinematic', 'slow motion', 'silhouette',
  'moody', 'rain', 'clouds', 'timelapse', 'time lapse', 'fire', 'neon', 'smoke',
  'epic', 'skyline',
] as const

/** Style tags present on a clip (used for both the bonus and the coherence ctx). */
function styleTagsOf(video: PixabayVideo): string[] {
  const blob = video.tags.toLowerCase()
  return CINEMATIC_STYLE_TAGS.filter((t) => blob.includes(t))
}

// PUSH #96 — `cinematicScore` (+1 per cinematic style tag, cap +3) and
// `resolutionScore` (+2 for a 1080p+ master, -2 for small/tiny only) were
// REMOVED here and folded into lib/broll/aesthetic-score.ts. They were two
// coarse, ad-hoc looks at exactly the two dimensions the new scorer measures
// properly (style vocabulary; true resolution vs the 1080x1920 output), and
// keeping both would have double-counted them. Net effect on the score scale:
// the old pair could move a candidate by up to 5 points, the aesthetic term is
// bounded at 3 — so the topic term (matches x 4) is now MORE dominant than
// before, not less. `styleTagsOf` stays: the coherence context still needs it.

/** Per-video style memory — created once per generation by the caller. */
export type StyleContext = { tags: Set<string> }

/** +1 per style tag shared with clips already picked this video, capped at +2. */
function coherenceScore(styleTags: string[], ctx?: StyleContext): number {
  if (!ctx || ctx.tags.size === 0 || styleTags.length === 0) return 0
  let shared = 0
  for (const t of styleTags) if (ctx.tags.has(t)) shared++
  return Math.min(2, shared)
}

// ── URL picker ─────────────────────────────────────────────────────────────
// Prefer large (1080p+); fall back down. Returns null if no URL exists.

function pickBestUrl(video: PixabayVideo): string | null {
  return (
    video.videos?.large?.url ||
    video.videos?.medium?.url ||
    video.videos?.small?.url ||
    video.videos?.tiny?.url ||
    null
  )
}

// ── Core search ───────────────────────────────────────────────────────────

// PUSH #93 (FIX 2) — Pixabay's terms require API results to be CACHED (24h)
// rather than re-requested, and the vertical-preferred pass below adds a second
// request per search. This tiny in-process memo keeps both facts comfortable:
// an identical query+category+orientation search inside one warm instance costs
// ONE request, so the extra vertical pass does not push us toward the 100 req /
// 60s limit (concept-map queries in particular repeat across scenes and videos).
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const SEARCH_CACHE_MAX = 300
const searchCache = new Map<string, { at: number; hits: PixabayVideo[] }>()

// KINEO-CAPACITY-2026-08-08 — Pixabay é o MESMO buraco que a OpenAI tinha em
// 05/08, e ainda está aberto. O `fetch` abaixo não tinha timeout nenhum, então
// um Pixabay lento segurava a lambda até a Vercel matá-la: 61 timeouts de 120s
// medidos em /api/generate-video-fast (20 pessoas) e 134 `fast_dispatch_not_ok`
// em 41 pessoas, o pico deles exatamente na janela 05/08 15:18–16:47Z em que o
// Pixabay devolveu 500/503/504 em série. Quando o gateway mata a lambda o nosso
// catch NUNCA roda — nem o fallback de stockLibrary, nem uma mensagem honesta.
// A pessoa fica 2 minutos olhando um spinner e recebe um erro genérico.
//
// Três travas, todas atrás de env var e todas fail-open (na dúvida, devolve []
// como sempre devolveu — nenhuma delas pode derrubar uma geração que hoje passa):
//
//  1. TIMEOUT por request. Tem de caber MUITO abaixo do orçamento da rota (120s)
//     para o erro ser capturável enquanto ainda somos donos da resposta.
//  2. UMA retentativa só em falha TRANSIENTE (rede, 429, 5xx). 429/5xx é o sinal
//     que mais merece retry e era o único tratado como "zero resultados".
//     Pior caso limitado: 2 × timeout + backoff.
//  3. DISJUNTOR de instância. Sem ele o pior caso seria 9 cenas × 12,3s = 110s,
//     ou seja o timeout de 120s de volta pela porta dos fundos. Depois de N
//     falhas transientes CONSECUTIVAS a instância para de chamar o Pixabay por
//     um tempo e cai direto no fallback — a pessoa recebe um vídeo com b-roll
//     genérico em segundos em vez de nada em dois minutos.
function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt((process.env[name] ?? '').trim(), 10)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}

/** Orçamento de UMA chamada ao Pixabay. Resposta saudável é <1s. */
const PIXABAY_TIMEOUT_MS = envInt('PIXABAY_TIMEOUT_MS', 6_000, 1_000, 30_000)
/** Total de tentativas (1 = sem retentativa). Pior caso = timeout × tentativas. */
const PIXABAY_MAX_ATTEMPTS = envInt('PIXABAY_MAX_ATTEMPTS', 2, 1, 3)
const PIXABAY_RETRY_BACKOFF_MS = envInt('PIXABAY_RETRY_BACKOFF_MS', 300, 0, 5_000)
/** Falhas transientes consecutivas que abrem o disjuntor da instância. */
const PIXABAY_BREAKER_THRESHOLD = envInt('PIXABAY_BREAKER_THRESHOLD', 4, 1, 100)
/** Quanto tempo o disjuntor fica aberto antes de deixar UMA sonda passar. */
const PIXABAY_BREAKER_COOLDOWN_MS = envInt('PIXABAY_BREAKER_COOLDOWN_MS', 60_000, 1_000, 600_000)

let consecutiveTransientFailures = 0
let breakerOpenUntil = 0

/** Contadores da instância — leitura barata para log/diagnóstico. Nunca lançam. */
const pixabayHealth = { ok: 0, transient: 0, hard: 0, timeout: 0, shortCircuited: 0 }

/**
 * Fotografia do estado do Pixabay NESTA instância de lambda. Serve para o
 * caminho de geração registrar, numa linha só, que o vídeo saiu degradado —
 * hoje a degradação é 100% silenciosa (o `[]` de um 503 é indistinguível do
 * `[]` de "não achei nada"). Não zera os contadores: é diagnóstico, não fila.
 */
export function readPixabayHealth(): Readonly<typeof pixabayHealth> & { breakerOpen: boolean } {
  return { ...pixabayHealth, breakerOpen: Date.now() < breakerOpenUntil }
}

function noteTransientFailure(): void {
  consecutiveTransientFailures += 1
  if (consecutiveTransientFailures >= PIXABAY_BREAKER_THRESHOLD && Date.now() >= breakerOpenUntil) {
    breakerOpenUntil = Date.now() + PIXABAY_BREAKER_COOLDOWN_MS
    console.error(
      `[pixabay] BREAKER OPEN — ${consecutiveTransientFailures} falhas transientes consecutivas; ` +
        `pulando o Pixabay por ${PIXABAY_BREAKER_COOLDOWN_MS}ms e caindo no fallback de stock`,
    )
  }
}

async function searchPixabay(
  query: string,
  perPage = 5,
  category?: string,
  /** PUSH #93 — vertical-preferred secondary pass (see below). */
  verticalPreferred = false,
): Promise<PixabayVideo[]> {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    console.warn('[pixabay] PIXABAY_API_KEY not set — skipping')
    return []
  }

  const cacheKey = `${query}|${perPage}|${category ?? ''}|${verticalPreferred ? 'v' : 'a'}`
  const cachedEntry = searchCache.get(cacheKey)
  if (cachedEntry && Date.now() - cachedEntry.at < SEARCH_CACHE_TTL_MS) {
    return cachedEntry.hits
  }

  // Push #438 — DROP the hard orientation=vertical filter. It was starving the
  // results: most premium stock (stock-market charts, bank vaults, Wall Street,
  // gold) is shot HORIZONTAL, so a vertical-only search MISSED ~90% of the good
  // footage → the pipeline fell back to the same clip over and over (the "same
  // guy held for 35 seconds" bug) and to generic/off-topic clips. Compose renders
  // every clip with fit:'cover' (center-crop to 9:16), so landscape footage looks
  // great vertical. Searching ALL orientations multiplies the on-topic hit rate.
  let url =
    `${PIXABAY_API}?key=${apiKey}` +
    `&q=${encodeURIComponent(query)}` +
    `&video_type=film` +
    `&safesearch=true` +
    `&per_page=${perPage}`

  if (category) url += `&category=${encodeURIComponent(category)}`

  // PUSH #93 (FIX 2) — #438 was right that a HARD vertical filter starves the
  // pool, but wrong that fit:'cover' makes landscape safe: center-cropping a
  // 16:9 master to 9:16 discards ~72% of the frame with NO subject tracking, so
  // the subject is routinely cropped out of shot. So we keep the main search
  // all-orientation and add this SECONDARY vertical-preferred pass, merged ahead
  // of it. Pixabay's VIDEO endpoint has no `orientation` param (that one belongs
  // to the image endpoint — #438 removed something the video API was likely
  // ignoring), but min_height IS documented for videos: a 1080x1920 vertical
  // master clears min_height=1200 while a 1920x1080 landscape does not.
  // KINEO-MULTIFORMATO-2026-09-02 — o passe "preferido" continua existindo,
  // mas o filtro segue o enquadramento: num Short queremos altura (retrato
  // nativo passa de 1200px); num filme 16:9 queremos LARGURA (um master de
  // 2560+ recorta/escala sem perder nitidez). `min_width` é documentado para
  // vídeo pelo Pixabay, igual ao `min_height`.
  if (verticalPreferred) url += ACTIVE_FRAME.vertical ? `&min_height=1200` : `&min_width=1920`

  // KINEO-CAPACITY-2026-08-08 — disjuntor da instância. O cache acima já foi
  // consultado, então isto só pula a REDE, nunca um resultado que já temos.
  if (Date.now() < breakerOpenUntil) {
    pixabayHealth.shortCircuited += 1
    return []
  }

  let res: Response | null = null
  for (let attempt = 1; attempt <= PIXABAY_MAX_ATTEMPTS; attempt += 1) {
    const isLastAttempt = attempt === PIXABAY_MAX_ATTEMPTS
    try {
      res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(PIXABAY_TIMEOUT_MS) })
    } catch (err) {
      // Rede caiu ou o timeout abortou. Ambos são transientes por definição.
      const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
      if (timedOut) pixabayHealth.timeout += 1
      pixabayHealth.transient += 1
      console.error(
        `[pixabay] fetch ${timedOut ? `timed out after ${PIXABAY_TIMEOUT_MS}ms` : 'threw'} ` +
          `(tentativa ${attempt}/${PIXABAY_MAX_ATTEMPTS}) query="${query}": ` +
          (err instanceof Error ? err.message : String(err)),
      )
      res = null
      if (isLastAttempt) {
        noteTransientFailure()
        return []
      }
      if (PIXABAY_RETRY_BACKOFF_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, PIXABAY_RETRY_BACKOFF_MS))
      }
      continue
    }

    if (res.ok) break

    // 429 e 5xx são transientes — merecem retentativa. 4xx que não seja 429
    // (chave inválida, query malformada) é permanente: repetir só queima tempo
    // do orçamento da rota, e NÃO conta para o disjuntor, porque o Pixabay está
    // de pé e a culpa é nossa.
    const transient = res.status === 429 || res.status >= 500
    console.error(
      `[pixabay] non-ok status=${res.status} (${transient ? 'transiente' : 'permanente'}, ` +
        `tentativa ${attempt}/${PIXABAY_MAX_ATTEMPTS}) for query="${query}"`,
    )
    if (!transient) {
      pixabayHealth.hard += 1
      consecutiveTransientFailures = 0
      return []
    }
    pixabayHealth.transient += 1
    res = null
    if (isLastAttempt) {
      noteTransientFailure()
      return []
    }
    if (PIXABAY_RETRY_BACKOFF_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, PIXABAY_RETRY_BACKOFF_MS))
    }
  }

  // Defensivo: o laço só sai com `res.ok`, mas o tipo não sabe disso.
  if (!res || !res.ok) {
    noteTransientFailure()
    return []
  }

  pixabayHealth.ok += 1
  consecutiveTransientFailures = 0

  let data: { hits?: PixabayVideo[] }
  try {
    data = (await res.json()) as { hits?: PixabayVideo[] }
  } catch {
    return []
  }

  const hits = data.hits ?? []
  // PUSH #93 — cache successful responses only (a transient error must not be
  // memoised for 24h). Bounded so a long-lived instance can't grow unbounded.
  if (searchCache.size >= SEARCH_CACHE_MAX) searchCache.clear()
  searchCache.set(cacheKey, { at: Date.now(), hits })
  return hits
}

// ── searchAndFilter ────────────────────────────────────────────────────────
// Runs one Pixabay search, rejects lifestyle-polluted clips, RANKS the clean
// candidates and returns the best one.
//
// Push #483 (02/07) — candidate RANKING replaces "first clean clip wins".
// Before: we returned the first portrait clip that passed the gates, even if it
// was 3s long (freeze/loop on an 8s scene) and matched only 1 query word, while
// a 15s strong-match clip sat 2 positions later. Now every clean candidate is
// scored and the best wins:
//   +4 per query token found in the clip's tags   (topic strength dominates)
//   +3 if clip duration covers the scene           (no freeze/loop padding)
//  +10 if portrait/vertical                        (PUSH #93 — was +2, which on
//        a ~20-point scale never decided anything; a 16:9 master loses ~72% of
//        its frame to compose's untracked 9:16 center-crop, so native vertical
//        must reliably win when it exists. Still not an absolute trump card:
//        a clearly stronger on-topic landscape (matches×4) can outscore it.)
// Ties break toward Pixabay's own relevance order. Same inputs, same fallback
// behavior (null on no clean candidate) — only the pick among survivors changed.

// Fast Mode v2 (02/07) — candidate type shared by searchAndFilter (best-of-pool
// single pick) and getPixabayClipsForScene (multi-clip scene pools for rhythm cuts).
type PixabayCandidate = {
  url: string
  score: number
  order: number
  id: number
  /** KINEO-FAST-CINEMA — style tags for the per-video coherence context. */
  styleTags: string[]
  /** KINEO-FAST-V4 — full provider tags + duration, for the clip vault index. */
  tags: string
  durationSec?: number
  /** PUSH #93 (FIX 1) — true when this candidate came from a CONCEPT_VISUAL_MAP
   *  generic query rather than the scene's own narration-derived query. Generic
   *  candidates are ranked strictly below grounded ones (see the pool sort). */
  generic?: boolean
}

// Fast Mode v2 (02/07) — collection extracted from searchAndFilter so the new
// multi-clip scene pool reuses the EXACT same gates + scoring (#483/#484).
// searchAndFilter's observable behavior is unchanged.
async function collectCandidates(
  query: string,
  sceneNeedsPeople: boolean,
  category: string | undefined,
  label: string,
  exclude?: Set<string>,
  minDurationSec?: number,
  styleCtx?: StyleContext,
): Promise<PixabayCandidate[]> {
  // Push #484 (02/07) — pool 7 → 20. The #483 ranker only beats "first clean
  // clip wins" if it has real candidates to rank; 7 hits often left 1-2 clean
  // survivors after the lifestyle/relevance gates. Same single API call.
  // KINEO-FAST-CINEMA (10/07) — 20 → 30: the cinematic/resolution/coherence
  // signals need a deeper pool to find the premium pick. Still ONE API call.
  // PUSH #93 (FIX 2) — TWO searches issued in PARALLEL (so zero added latency):
  // a small vertical-preferred pass and the normal all-orientation pass. The
  // vertical hits are merged FIRST, so they take the lowest `order` values and
  // win every score tie; the all-orientation pool still backs them up, so the
  // pool never starves the way a hard orientation filter did (#438). Two
  // concurrent, memoised requests per query stays well inside 100 req / 60s.
  const [verticalHits, anyHits] = await Promise.all([
    searchPixabay(query, 8, category, true),
    searchPixabay(query, 30, category),
  ])
  const seenHitIds = new Set<number>()
  const hits: PixabayVideo[] = []
  for (const v of [...verticalHits, ...anyHits]) {
    if (!v || seenHitIds.has(v.id)) continue
    seenHitIds.add(v.id)
    hits.push(v)
  }

  // Scene coverage target: planned scene duration when known (BrollPlan),
  // else 6s — a sane floor for Shorts pacing.
  const neededSec = typeof minDurationSec === 'number' && minDurationSec > 0
    ? Math.min(minDurationSec, 15)
    : 6

  const candidates: PixabayCandidate[] = []

  for (let order = 0; order < hits.length; order++) {
    const video = hits[order]
    if (hasLifestylePollution(video, sceneNeedsPeople)) {
      console.log(
        `[pixabay] ${label} rejected id=${video.id} tags="${video.tags.slice(0, 60)}" reason=lifestyle`,
      )
      continue
    }
    // Push #403 — positive relevance gate: the clip's tags must share a word
    // with the query, else it's off-topic ("cat video") → reject.
    if (!tagsRelevantToQuery(video, query)) {
      console.log(
        `[pixabay] ${label} rejected id=${video.id} tags="${video.tags.slice(0, 60)}" reason=irrelevant query="${query.slice(0, 50)}"`,
      )
      continue
    }
    const url = pickBestUrl(video)
    // Dedup (12/06): never hand back a clip another scene already used — this
    // is what made the same Dubai aerial carry 4+ scenes of one video.
    if (url && exclude?.has(url)) {
      console.log(`[pixabay] ${label} rejected id=${video.id} reason=already_used_in_video`)
      continue
    }
    if (!url) continue

    // PUSH #93 (FIX 2) — orientation was read from the `large` rendition only,
    // so a clip that ships no large master was silently scored as landscape.
    // Use the first rendition that actually reports dimensions.
    const rez =
      video.videos?.large?.width ? video.videos.large
      : video.videos?.medium?.width ? video.videos.medium
      : video.videos?.small?.width ? video.videos.small
      : undefined
    const portrait = !!rez && rez.height >= rez.width
    const coversScene = typeof video.duration === 'number' && video.duration >= neededSec
    // Push #484 — clips under 3s force a visible freeze/loop on any Short scene;
    // losing the +3 coverage bonus wasn't enough (a 2s strong-tag clip still won).
    // Explicit penalty, NOT a reject: on thin queries a short on-topic clip still
    // beats FALLBACK-A/B repetition.
    const tooShort = typeof video.duration === 'number' && video.duration > 0 && video.duration < 3
    const matches = tagMatchCount(video, query)
    // KINEO-FAST-CINEMA (10/07) — production-value signals added to the score.
    // Topic strength (×4) still dominates: style/res/coherence only decide
    // between clips that are EQUALLY on-topic.
    const sTags = styleTagsOf(video)
    const cohere = coherenceScore(sTags, styleCtx)
    // PUSH #96 — AESTHETIC RE-RANK. Until now nothing scored whether a clip
    // actually LOOKS good, so two equally-relevant candidates were a coin flip.
    // Everything fed in is metadata this search response already returned — no
    // extra request, no dependency. `rez` is the first rendition that reports
    // real dimensions (same accessor the portrait test uses), so the geometry
    // signals are never read off a missing `large` master.
    const aesthetic = scoreAesthetics({
      widthPx: rez?.width,
      heightPx: rez?.height,
      durationSec: video.duration,
      sceneDurationSec: neededSec,
      text: video.tags,
      mediaType: video.type,
      downloads: video.downloads,
      likes: video.likes,
      // fps: Pixabay does not expose it — left unset so it scores as unknown.
    })
    // PUSH #93 (FIX 4) — style/framing words asked for by the query are a
    // ranking bonus now that they no longer count as relevance evidence.
    const styleAlign = styleAlignScore(video, query)
    // PUSH #93 (FIX 2) — portrait +2 → +10. On a ~20-point scale +2 never
    // decided anything, so landscape clips won constantly and then lost ~72% of
    // their frame to the 9:16 center-crop (subject frequently cropped out).
    // +10 makes a native 9:16 clip win whenever one exists, while a clearly
    // stronger on-topic landscape (matches×4 + coverage + production signals)
    // can still beat a weakly-matching vertical — topic never gets trumped
    // outright, it just stops losing to nothing.
    // PUSH #96 — RELEVANCE DOMINATES, BY CONSTRUCTION. `aesthetic.points` lands
    // in [-1.5, +1.5], so the largest possible aesthetic gap between any two
    // candidates is AESTHETIC_MAX_SWING (3) — strictly less than the 4 points a
    // single extra topic-token match is worth. A clip that matches the query
    // better therefore can NEVER be outranked because a rival looks prettier;
    // aesthetics only separates clips that are already equally on-topic.
    // KINEO-1-CINEMA-2026-09-02 — NITIDEZ E UM SINAL DURO, nao so peso. O
    // compose recorta todo clipe em 9:16 com fit 'cover': um master 16:9 de
    // 1920×1080 vira ~608×1080 utilizaveis e e ESTICADO 1,78× para 1080×1920
    // — sai borrado ao lado de um Seedance. Um master 16:9 de 3840×2160 recorta
    // em 1215×2160 e sai nitido; um 9:16 nativo de 1080×1920 tambem. Penaliza
    // o que vai sair mole: paisagem abaixo de 2560 de largura −2, retrato
    // abaixo de 1080 de altura −3. Explicito como o tooShort (penalidade, nao
    // rejeicao): num tema magro, um clipe certo e mole ainda vence o FALLBACK.
    // KINEO-MULTIFORMATO-2026-09-02 — os dois sinais de geometria abaixo
    // deixam de assumir Short. Num filme 16:9 quem sofre o corte é o clipe
    // RETRATO (um 1080×1920 vira 1080×608 úteis, esticado 1,78×), e quem já
    // nasce certo é a paisagem — o espelho exato do raciocínio original.
    // Em 9:16 os números são idênticos aos de antes: +10 retrato, −2 paisagem
    // com menos de 2560 de largura, −3 retrato com menos de 1080 de altura.
    const wantsPortrait = ACTIVE_FRAME.vertical
    const orientationBonus = portrait === wantsPortrait ? 10 : 0
    const lowRes = !rez
      ? 0
      : wantsPortrait
        ? portrait ? (rez.height < 1080 ? 3 : 0) : (rez.width < 2560 ? 2 : 0)
        : portrait ? (rez.height < 2560 ? 2 : 0) : (rez.width < 1920 ? 3 : 0)
    const score =
      matches * 4 + (coversScene ? 3 : 0) + orientationBonus - (tooShort ? 2 : 0) - lowRes +
      cohere + styleAlign + aesthetic.points
    candidates.push({
      url, score, order, id: video.id, styleTags: sTags,
      tags: video.tags, durationSec: typeof video.duration === 'number' ? video.duration : undefined,
    })
    console.log(
      `[pixabay] ${label} candidate id=${video.id} score=${score.toFixed(2)} (matches=${matches} dur=${video.duration ?? '?'}s/${neededSec}s portrait=${portrait} tooShort=${tooShort} lowRes=${lowRes} cohere=${cohere} styleAlign=${styleAlign} aesthetic=${aesthetic.score.toFixed(2)}→${aesthetic.points.toFixed(2)}pts/${AESTHETIC_MAX_SWING} [${formatAestheticBreakdown(aesthetic)}]) tags="${video.tags.slice(0, 60)}"`,
    )
  }

  return candidates
}

async function searchAndFilter(
  query: string,
  sceneNeedsPeople: boolean,
  category: string | undefined,
  label: string,
  exclude?: Set<string>,
  minDurationSec?: number,
): Promise<string | null> {
  const candidates = await collectCandidates(query, sceneNeedsPeople, category, label, exclude, minDurationSec)

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.score - a.score || a.order - b.order)
  const best = candidates[0]
  console.log(
    `[pixabay] ${label} ACCEPTED id=${best.id} score=${best.score.toFixed(2)} of ${candidates.length} candidate(s) url="${best.url.slice(0, 60)}"`,
  )
  return best.url
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve a Pixabay clip for a single query.
 * Tries: exact query → first-3-tokens broadening → no-category fallback.
 */
export async function getPixabayVideoForExactQuery(
  query: string,
  sceneNeedsPeople = false,
  exclude?: Set<string>,
  minDurationSec?: number, // Push #483 — planned scene duration for ranking
): Promise<string | null> {
  const q = (query ?? '').trim()
  if (!q) return null

  const category = inferCategory(q)

  // 1) Exact query with inferred category
  const direct = await searchAndFilter(q, sceneNeedsPeople, category, 'exact', exclude, minDurationSec)
  if (direct) return direct

  // 2) First 3 tokens (broadened) — same semantic topic
  const broad = q.split(/\s+/).slice(0, 3).join(' ')
  if (broad.length > 0 && broad !== q) {
    const broadUrl = await searchAndFilter(broad, sceneNeedsPeople, category, 'broad', exclude, minDurationSec)
    if (broadUrl) return broadUrl
  }

  // 2b) First 2 tokens — last semantic broadening before giving up (helps
  // 4-word hand-picked queries like "man reading book penthouse" → "man reading").
  const broad2 = q.split(/\s+/).slice(0, 2).join(' ')
  if (broad2.length > 0 && broad2 !== broad && broad2 !== q) {
    const broad2Url = await searchAndFilter(broad2, sceneNeedsPeople, category, 'broad2', exclude, minDurationSec)
    if (broad2Url) return broad2Url
  }

  // 3) Remove category constraint — may have been over-narrowing
  if (category) {
    const noCat = await searchAndFilter(q, sceneNeedsPeople, undefined, 'no_cat', exclude, minDurationSec)
    if (noCat) return noCat
  }

  console.log(`[pixabay] ALL attempts failed for query="${q.slice(0, 60)}"`)
  return null
}

/**
 * Try a list of queries in order and return the first Pixabay hit.
 * Primary entry point for the generate-video-fast pipeline.
 *
 * @param queries         Ordered queries (most specific first — from BrollPlan).
 * @param sceneNeedsPeople True when the scene's narration/description references people.
 * @param hint            Short narration snippet for log context only.
 */
// Push #437 — CONCEPT → CONCRETE VISUAL MAP (ported to the REAL B-roll source).
// Abstract finance/wealth narration has no literal stock footage, so the search
// fell to random lifestyle clips (kid doing homework) or the library (fish!).
// This maps each abstract concept to concrete, FILMABLE, cinematic queries that
// Pixabay has real inventory for, tried FIRST so a scene about "assets" shows a
// rising market chart, not a kid studying.
const CONCEPT_VISUAL_MAP: ReadonlyArray<{ test: RegExp; queries: string[] }> = [
  { test: /\b(asset|assets|invest|investing|investment|portfolio|stocks?|shares|equit)/i,
    queries: ['stock market chart', 'trading floor', 'financial graph'] },
  { test: /\b(luxur|mansion|penthouse|yacht|supercar|opulent|dubai|skyline|city)/i,
    // #450b — Joseph: add aspirational luxury cities (Dubai etc.) — Pixabay has
    // deep inventory of Dubai/skyline/skyscraper aerials, great for wealth-mindset vibe.
    queries: ['Dubai skyline aerial', 'luxury city skyline night', 'penthouse city view night', 'luxury mansion', 'supercar'] },
  { test: /\b(wealth|wealthy|rich|fortune|billionaire|millionaire|affluent)/i,
    // (12/06) LUXURY-first, aligned with the wealth aesthetic pack: Joseph's
    // audience-tested verdict is that coins/cash closeups read as cheap clichés
    // in billionaire content ("nao teve jatinho... moeda ficou ruim"). Cash is
    // kept only as the last-resort tail.
    queries: ['private jet', 'Dubai skyline aerial', 'luxury city skyline night', 'luxury mansion', 'penthouse city view night', 'dollar bills cash'] },
  { test: /\b(debt|loan|loans|borrow|borrowing|mortgage|credit|lending|leverage)/i,
    queries: ['bank building', 'bank vault', 'counting money'] },
  { test: /\b(save|saving|savings|budget|frugal)/i,
    queries: ['coins stacking', 'savings jar coins', 'piggy bank'] },
  { test: /\b(bank|banking|vault)/i,
    queries: ['bank vault', 'gold bars', 'bank building'] },
  { test: /\b(tax|taxes|irs)/i,
    queries: ['financial documents', 'calculator money', 'paperwork desk'] },
  { test: /\b(automat|payday|paycheck|salary|income|deposit)/i,
    queries: ['mobile banking app', 'online payment phone', 'money transfer'] },
  { test: /\b(retire|retirement|401k|401\(k\)|pension|nest egg|ira|fund|funds)/i,
    // #451 — "401k / the retirement" was hitting a lucky cat; anchor it on real money.
    queries: ['retirement savings money', 'coins jar savings', 'financial chart growth', 'dollar bills cash'] },
  { test: /\b(cash|money|dollars?|currency|coins)/i,
    queries: ['counting money cash', 'dollar bills', 'money stack'] },
  { test: /\b(car|cars|vehicle|automobile)/i,
    queries: ['luxury car', 'car showroom', 'sports car'] },
  { test: /\b(student|broke|poor|cheap|ramen)/i,
    queries: ['instant noodles', 'small apartment', 'desk lamp night'] },
  { test: /\b(success|discipline|habit|mindset|grind|focus|productiv|control|limit|spend|overspend)/i,
    // (12/06) Aligned with the aesthetic packs: aspirational visuals first
    // (skyline, businessman, watch), coin-stacking demoted to last resort —
    // it was landing as the cliché shot in billionaire-mindset videos.
    queries: ['city skyline sunrise', 'businessman walking city', 'luxury watch', 'stacking coins money'] },
  { test: /\b(wall street|stock exchange|nasdaq|nyse|market crash)/i,
    queries: ['wall street', 'stock exchange', 'financial district'] },
  // Push #482 (02/07) — GEO/EXTREME-PLACES concept map. The channel's strongest
  // vertical (extreme places / geography / mystery) had ZERO entries here, so
  // niche proper-noun queries ("La Rinconada Peru", "Oymyakon village") missed
  // Pixabay and the scene fell to FALLBACK-A/B (repeated clip / off-topic
  // library clip). These map extreme-place concepts to concrete, filmable
  // queries Pixabay has deep inventory for. Purely additive: boosted queries
  // are APPENDED after the original ones (see concretizeQueries), so specific
  // queries still win when they hit.
  { test: /\b(volcano|volcanic|lava|eruption|magma|crater)/i,
    queries: ['volcano lava eruption', 'lava flow night', 'volcanic crater aerial'] },
  { test: /\b(glacier|frozen|arctic|siberia|permafrost|coldest|blizzard|subzero|icy|iceberg)/i,
    queries: ['glacier aerial', 'frozen landscape winter', 'snowstorm blizzard village', 'ice cave'] },
  { test: /\b(desert|dunes?|sahara|arid|salt flat|wasteland)/i,
    queries: ['desert dunes aerial', 'salt flat landscape', 'desert heat haze'] },
  { test: /\b(mountain|peak|summit|altitude|everest|andes|himalaya|climber|climbing)/i,
    queries: ['mountain peak aerial', 'snowy mountain summit clouds', 'mountaineer climbing snow'] },
  { test: /\b(mine|miner|mining|tunnel|cave|cavern|underground)/i,
    queries: ['mine tunnel underground', 'cave interior dark', 'miner headlamp dark'] },
  { test: /\b(deep sea|trench|abyss|underwater|seabed|submarine|diver)/i,
    queries: ['deep ocean underwater dark', 'underwater diver', 'ocean waves storm aerial'] },
  { test: /\b(jungle|rainforest|amazon|swamp|canopy)/i,
    queries: ['rainforest aerial', 'jungle canopy mist', 'tropical river aerial'] },
  { test: /\b(island|archipelago|isolated|remote|uninhabited)/i,
    queries: ['remote island aerial', 'rocky island ocean waves', 'coastline cliffs aerial'] },
  { test: /\b(abandoned|ruins?|ghost town|derelict|ancient city|lost city)/i,
    queries: ['abandoned building interior decay', 'ancient ruins stone', 'empty street fog'] },
  { test: /\b(mystery|mysterious|unexplained|eerie|haunted|creepy|vanish|disappear)/i,
    queries: ['dark foggy forest', 'fog night empty street', 'abandoned house eerie'] },
  { test: /\b(storm|lightning|hurricane|tornado|monsoon|flood)/i,
    queries: ['lightning storm night', 'storm clouds timelapse', 'huge waves storm ocean'] },
  { test: /\b(village|town|settlement|inhabitants?|locals)/i,
    queries: ['mountain village aerial', 'remote village houses', 'small town aerial drone'] },
  { test: /\b(acid|acidic|toxic|sulfur|sulphur|geothermal|hot spring|geyser)/i,
    queries: ['geothermal hot spring aerial', 'sulfur volcanic vent steam', 'colorful mineral lake aerial'] },
  { test: /\b(cliff|ravine|canyon|gorge|dangerous road|winding road)/i,
    queries: ['mountain road winding aerial', 'cliff edge ocean', 'canyon aerial drone'] },
  { test: /\b(snake|spider|scorpion|crocodile|shark|predator|venom)/i,
    queries: ['snake close up', 'crocodile water', 'shark underwater'] },
]

// PUSH #93 (FIX 1) — the concept map is the single biggest source of off-topic
// footage: it appends hardcoded generics ('private jet', 'Dubai skyline aerial',
// 'volcano lava eruption') to EVERY non-verbatim scene, and those generics then
// score brilliantly against their own query ("Dubai skyline aerial" = 3 tokens
// × 4) and beat the narration-grounded clip that matched only 1-2 words. The map
// is kept (it genuinely rescues scenes Pixabay has no inventory for), but it is
// now LAST RESORT: this function reports where the generic queries begin so the
// callers can (a) only reach for them when the scene's own queries came back
// thin and (b) never let one outrank a narration-grounded candidate.
function concretizeQueries(
  originalQueries: string[],
  hint?: string,
): { queries: string[]; genericStart: number } {
  const haystack = `${originalQueries.join(' ')} ${hint ?? ''}`.toLowerCase()
  const boosted: string[] = []
  for (const entry of CONCEPT_VISUAL_MAP) {
    if (entry.test.test(haystack)) for (const q of entry.queries) boosted.push(q)
  }
  const seen = new Set<string>()
  const grounded: string[] = []
  const generic: string[] = []
  for (const q of originalQueries) {
    const k = q.toLowerCase().trim()
    if (k && !seen.has(k)) { seen.add(k); grounded.push(q) }
  }
  for (const q of boosted) {
    const k = q.toLowerCase().trim()
    if (k && !seen.has(k)) { seen.add(k); generic.push(q) }
  }
  return { queries: [...grounded, ...generic], genericStart: grounded.length }
}

/** PUSH #93 — verbatim mode: the user's queries are sovereign, zero generics. */
function verbatimQueries(rawCleaned: string[]): { queries: string[]; genericStart: number } {
  return { queries: rawCleaned, genericStart: rawCleaned.length }
}

export async function getPixabayVideoForQueries(
  queries: string[],
  sceneNeedsPeople = false,
  hint?: string,
  opts?: {
    /** true → user hand-picked these queries ([Pexels: ...] verbatim mode).
     *  NEVER concretize: the concept map was prepending its own queries
     *  ("Dubai skyline aerial", "dollar bills cash") BEFORE the user's, so
     *  every hand-picked scene rendered the same map clip (12/06 gift video). */
    exact?: boolean
    /** URLs already used by other scenes of this video — skip them. */
    exclude?: Set<string>
    /** Push #483 — planned scene duration (s); clips covering it rank higher. */
    minDurationSec?: number
  },
): Promise<string | null> {
  const rawCleaned = (queries ?? [])
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    .map((q) => q.trim())

  // Push #437 — concrete cinematic queries for any abstract concept detected in
  // the scene, so a scene with no literal stock inventory still finds something.
  // (12/06) Skipped entirely in exact mode — the user's query is sovereign.
  // PUSH #93 (FIX 1) — generics are APPENDED after the scene's own queries and
  // this loop returns on the FIRST hit, so a generic is only ever reached once
  // every narration-grounded query has missed outright. genericStart is tracked
  // purely so the logs say which kind of query produced the clip.
  const { queries: cleaned, genericStart } = opts?.exact
    ? verbatimQueries(rawCleaned)
    : concretizeQueries(rawCleaned, hint)

  if (cleaned.length === 0) return null

  const hintLabel = (hint ?? '').slice(0, 50)
  const failed: string[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const q = cleaned[i]
    const url = await getPixabayVideoForExactQuery(q, sceneNeedsPeople, opts?.exclude, opts?.minDurationSec)
    if (url) {
      console.log(
        `[pixabay-multi] HIT query[${i + 1}/${cleaned.length}]="${q}"` +
          (i >= genericStart ? ' kind=GENERIC_CONCEPT_MAP(last-resort)' : ' kind=grounded') +
          (failed.length ? ` (after misses: ${failed.slice(0, 3).map((f) => `"${f}"`).join(', ')})` : '') +
          (hintLabel ? ` for="${hintLabel}"` : ''),
      )
      return url
    }
    failed.push(q)
    console.log(`[pixabay-multi] MISS query[${i + 1}/${cleaned.length}]="${q}"`)
  }

  console.log(
    `[pixabay-multi] ALL ${cleaned.length} queries exhausted` +
      (hintLabel ? ` for="${hintLabel}"` : '') +
      ' — caller uses FALLBACK-A/B',
  )
  return null
}

// ── Fast Mode v2 (02/07) — multi-clip scene pools ──────────────────────────

// Max queries pooled per scene — each pool query is exactly ONE Pixabay API call
// (no broadening tiers), so a scene costs at most 3 calls before falling back.
const SCENE_POOL_QUERY_CAP = 3
// Earlier queries are more SPECIFIC (BrollPlan orders them that way) — a small
// score bonus keeps a specific query's clip ahead of a generic query's on ties.
const SCENE_POOL_PRIORITY_BONUS = 2

// PUSH #93 (FIX 3) — the GPT SCENE DIRECTOR ran behind a 1.5s abort budget,
// which a gpt-4o-mini round-trip clears only on a good day, and its failure was
// swallowed by a completely empty `catch {}`. Net effect: it timed out routinely
// and the pipeline silently degraded to raw heuristic order with NOTHING in the
// logs to say so. 1.5s → 5s is a realistic budget for a 20-token completion.
// Because the director runs PER SCENE, a bigger budget could otherwise cost
// 9 × 5s on a bad OpenAI minute and blow the route's 60s Vercel budget — so
// consecutive failures trip a short cooldown that skips the director entirely.
// Everything here stays strictly non-blocking: every failure path leaves the
// heuristic order in place and the render continues.
const GPT_DIRECTOR_TIMEOUT_MS = 5000
const GPT_DIRECTOR_MAX_CONSECUTIVE_FAILURES = 2
const GPT_DIRECTOR_COOLDOWN_MS = 60_000
let gptDirectorFailures = 0
let gptDirectorCooldownUntil = 0

/** PUSH #93 — structured, diagnosable failure logging + the cooldown breaker. */
function noteGptDirectorFailure(reason: string, startedAt: number): void {
  gptDirectorFailures++
  let breaker = ''
  if (gptDirectorFailures >= GPT_DIRECTOR_MAX_CONSECUTIVE_FAILURES) {
    gptDirectorCooldownUntil = Date.now() + GPT_DIRECTOR_COOLDOWN_MS
    gptDirectorFailures = 0
    breaker = ` — ${GPT_DIRECTOR_MAX_CONSECUTIVE_FAILURES} consecutive failures, director paused for ${GPT_DIRECTOR_COOLDOWN_MS}ms to protect the render budget`
  }
  console.warn(
    `[gpt-director] FAILED reason=${reason} elapsed=${Date.now() - startedAt}ms — heuristic order stands${breaker}`,
  )
}

/**
 * Fast Mode v2 (02/07) — return up to `maxClips` RANKED clip URLs for one scene,
 * strongest first, pooled across the scene's query list.
 *
 * Why: one clip per scene forced compose to hold a single static clip for 6-9s.
 * With 2+ ranked clips per scene, compose can cut every ~2.5-4s INSIDE the scene
 * (rhythm) — and because the pool is score-sorted, the scene's LEAD clip is the
 * strongest of its whole candidate pool (the visual hook for scene 1).
 *
 * Fallback: if the pooled searches find nothing, delegates to the classic
 * single-clip chain (getPixabayVideoForQueries, with query broadening) so v2
 * never sources FEWER clips than v1 did. Never throws.
 */
export async function getPixabayClipsForScene(
  queries: string[],
  sceneNeedsPeople = false,
  hint?: string,
  opts?: {
    /** true → user hand-picked queries (verbatim mode): never concretize. */
    exact?: boolean
    /** URLs already used by other scenes of this video — skip them. */
    exclude?: Set<string>
    /** Planned scene duration (s); clips covering it rank higher (#483). */
    minDurationSec?: number
    /** How many ranked clips to return (default 2). */
    maxClips?: number
    /** KINEO-FAST-CINEMA — per-video style memory: scenes prefer clips whose
     *  style tags match what's already in the timeline (visual coherence). */
    styleCtx?: StyleContext
    /**
     * KINEO-MULTIFORMATO-2026-09-02 — enquadramento do filme. Ausente = 9:16.
     * Muda o SINAL da preferência de orientação: num Short, clipe retrato vale
     * +10 (e paisagem 1080p perde nitidez ao ser recortado); num filme 16:9 é
     * o inverso exato — clipe retrato é que seria destruído pelo corte.
     */
    aspect?: string | null
  },
): Promise<string[]> {
  const rawCleaned = (queries ?? [])
    .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    .map((q) => q.trim())
  const { queries: cleaned, genericStart } = opts?.exact
    ? verbatimQueries(rawCleaned)
    : concretizeQueries(rawCleaned, hint)
  if (cleaned.length === 0) return []

  const maxClips = Math.max(1, opts?.maxClips ?? 2)
  const hintLabel = (hint ?? '').slice(0, 50)
  // KINEO-MULTIFORMATO-2026-09-02 — fixa o enquadramento desta cena antes de
  // qualquer busca. Sem `aspect` resolve para 9:16 e o ranker se comporta
  // exatamente como sempre (+10 retrato). Ver a nota de concorrência em
  // ACTIVE_FRAME.
  setActiveFrame(opts?.aspect)

  const pool: PixabayCandidate[] = []
  // Superset of the caller's exclude set: also blocks intra-pool duplicates.
  const seenUrls = new Set<string>(opts?.exclude ?? [])

  for (let i = 0; i < Math.min(cleaned.length, SCENE_POOL_QUERY_CAP); i++) {
    const q = cleaned[i]
    // PUSH #93 (FIX 1) — a CONCEPT_VISUAL_MAP generic is only searched when the
    // scene's OWN queries left the pool short of what the scene needs. (The
    // short-circuit below already stops on a healthy pool; this makes the
    // last-resort rule explicit and logged rather than incidental.)
    const isGeneric = i >= genericStart
    if (isGeneric && pool.length >= maxClips) break
    if (isGeneric) {
      console.log(
        `[pixabay-pool] grounded queries yielded only ${pool.length}/${maxClips} clip(s) — falling back to concept-map generic "${q}"`,
      )
    }
    const cands = await collectCandidates(
      q,
      sceneNeedsPeople,
      inferCategory(q),
      `pool${i + 1}`,
      seenUrls,
      opts?.minDurationSec,
      opts?.styleCtx,
    )
    for (const c of cands) {
      if (seenUrls.has(c.url)) continue
      seenUrls.add(c.url)
      // PUSH #93 (FIX 1) — the specificity bonus rewards EARLIER (more specific)
      // queries; a generic concept-map query is by definition not specific, so
      // it gets none, and it is tagged so the sort below can keep it beneath
      // every narration-grounded candidate.
      pool.push({
        ...c,
        generic: isGeneric,
        score: c.score + (isGeneric ? 0 : Math.max(0, SCENE_POOL_PRIORITY_BONUS - i)),
      })
    }
    // HOTFIX (02/07) — SHORT-CIRCUIT: once the pool already holds enough
    // eligible candidates to fill the scene (>= maxClips, i.e. pool1 alone
    // when it's healthy), take the top picks from what we have and SKIP the
    // remaining pool queries. The previous threshold (maxClips + 2) kept
    // fetching pool2+pool3 per scene even when pool1 returned 19 eligible
    // candidates — 3x the Pixabay round-trips on 60s scripts (6-9 scenes),
    // which blew the route's 60s Vercel budget (504). Fallbacks are intact:
    // pool2/pool3 still run when pool1 comes back thin (< maxClips), and the
    // classic single-clip chain below still covers a fully dry pool.
    if (pool.length >= maxClips) {
      if (i + 1 < Math.min(cleaned.length, SCENE_POOL_QUERY_CAP)) {
        console.log(
          `[pixabay-pool] short-circuit after pool${i + 1}: ${pool.length} eligible >= ${maxClips} — skipping remaining pool queries`,
        )
      }
      break
    }
  }

  if (pool.length === 0) {
    // Pool dry (niche query) — classic chain with broadening finds SOMETHING.
    const single = await getPixabayVideoForQueries(queries, sceneNeedsPeople, hint, opts)
    return single ? [single] : []
  }

  // PUSH #93 (FIX 1) — GROUNDED FIRST, unconditionally. A generic concept-map
  // clip scores brilliantly against its own generic query (its tags ARE that
  // query), which is exactly how a scene about a Peruvian mining town ended up
  // leading with a Dubai skyline aerial. A generic can now only ever fill the
  // TAIL of a thin pool; it can never take the scene's lead clip away from a
  // narration-grounded candidate.
  pool.sort(
    (a, b) =>
      (a.generic ? 1 : 0) - (b.generic ? 1 : 0) || b.score - a.score || a.order - b.order,
  )

  // KINEO-FAST-V4 — GPT SCENE DIRECTOR. Tag heuristics can't tell that a
  // "volcano, iceland, tourists" clip is worse than "volcano, lava, night" for
  // a Darvaza scene — a tiny LLM call can. When the pool has real choice
  // (4+ candidates), gpt-4o-mini picks the best clips for the NARRATION from
  // the top 8 by score; on timeout or any error the heuristic order stands.
  // ~$0.0002 per scene. Toggle: FAST_GPT_DIRECTOR=false.
  let ranked = pool
  // PUSH #93 (FIX 3) — eligibility split out so the SKIP reasons (missing key,
  // cooldown) are logged instead of vanishing into a silent falsy condition.
  const directorEligible =
    pool.length >= 4 &&
    (hint ?? '').length > 8 &&
    process.env.FAST_GPT_DIRECTOR !== 'false'
  if (directorEligible && !process.env.OPENAI_API_KEY) {
    console.warn(
      '[gpt-director] SKIPPED reason=missing_key (OPENAI_API_KEY unset) — heuristic order stands',
    )
  } else if (directorEligible && Date.now() < gptDirectorCooldownUntil) {
    console.warn(
      `[gpt-director] SKIPPED reason=cooldown remaining=${gptDirectorCooldownUntil - Date.now()}ms — heuristic order stands`,
    )
  } else if (directorEligible) {
    const startedAt = Date.now()
    try {
      // PUSH #93 (FIX 1) — keep the director inside the grounded set when there
      // is one: it must not be the back door that promotes a concept-map
      // generic over a narration-grounded clip.
      const grounded = pool.filter((c) => !c.generic)
      const finalists = (grounded.length >= 4 ? grounded : pool).slice(0, 8)
      const listing = finalists
        .map((c, i) => `${i + 1}. tags: ${c.tags.slice(0, 90)}`)
        .join('\n')
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), GPT_DIRECTOR_TIMEOUT_MS)
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 20,
          messages: [
            {
              role: 'user',
              content: `Narration: "${(hint ?? '').slice(0, 120)}"\nStock clips (by tags):\n${listing}\nReply ONLY with the numbers of the ${Math.min(maxClips, finalists.length)} clips that best match the narration's subject and a dark cinematic documentary look, comma-separated, best first.`,
            },
          ],
        }),
        // PUSH #93 (FIX 3) — clear the abort timer on the REJECTED path too;
        // the old trailing clearTimeout was skipped whenever fetch threw, so a
        // pending abort timer outlived the call (worse now the budget is 5s).
      }).finally(() => clearTimeout(timer))
      if (!res.ok) {
        // PUSH #93 (FIX 3) — a non-2xx (401 bad key, 429 rate limit, 5xx) used
        // to be discarded without a single line of log. Now it is diagnosable.
        const body = await res.text().catch(() => '')
        noteGptDirectorFailure(
          `api_error status=${res.status} body="${body.slice(0, 140).replace(/\s+/g, ' ')}"`,
          startedAt,
        )
      } else {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const reply = data.choices?.[0]?.message?.content ?? ''
        const nums = reply
          .match(/\d+/g)
          ?.map((n) => parseInt(n, 10) - 1)
          .filter((n) => n >= 0 && n < finalists.length) ?? []
        if (nums.length > 0) {
          const chosen = Array.from(new Set(nums)).map((n) => finalists[n])
          const rest = pool.filter((c) => !chosen.includes(c))
          ranked = [...chosen, ...rest]
          gptDirectorFailures = 0 // PUSH #93 — a success clears the breaker.
          console.log(
            `[gpt-director] reordered: picks=[${nums.map((n) => n + 1).join(',')}] of ${finalists.length} elapsed=${Date.now() - startedAt}ms`,
          )
        } else {
          // PUSH #93 (FIX 3) — 200 OK but nothing usable in the reply is still a
          // silent degradation; name it so it can be told apart from a timeout.
          noteGptDirectorFailure(
            `unusable_reply reply="${reply.slice(0, 60).replace(/\s+/g, ' ')}"`,
            startedAt,
          )
        }
      }
    } catch (err) {
      // PUSH #93 (FIX 3) — was `catch {}`: the abort (by far the most common
      // outcome at the old 1.5s budget) left zero trace. Non-blocking either
      // way — `ranked` is still the heuristic order.
      const name = err instanceof Error ? err.name : ''
      const reason =
        name === 'AbortError' || name === 'TimeoutError'
          ? `timeout budget=${GPT_DIRECTOR_TIMEOUT_MS}ms`
          : `fetch_error ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`
      noteGptDirectorFailure(reason, startedAt)
    }
  }

  const pickedCands = ranked.slice(0, maxClips)
  // KINEO-FAST-CINEMA — feed the picked clips' style tags back into the
  // per-video context so LATER scenes bias toward the same look.
  if (opts?.styleCtx) {
    for (const c of pickedCands) for (const t of c.styleTags) opts.styleCtx.tags.add(t)
  }
  // KINEO-FAST-V4 — vault the winners (fire-and-forget: zero added latency).
  // Every picked clip enriches our own library; future videos on similar
  // topics hit the vault before any external API.
  for (const c of pickedCands) {
    void vaultClipAsync({
      sourceUrl: c.url,
      provider: 'pixabay',
      query: cleaned[0],
      tags: c.tags,
      score: c.score,
      durationSec: c.durationSec,
    })
  }
  const picked = pickedCands.map((c) => c.url)
  console.log(
    `[pixabay-pool] ${pool.length} candidate(s) → ${picked.length} clip(s), top score=${pool[0].score.toFixed(2)}` +
      (opts?.styleCtx && opts.styleCtx.tags.size > 0 ? ` styleCtx=[${Array.from(opts.styleCtx.tags).slice(0, 6).join(',')}]` : '') +
      (hintLabel ? ` for="${hintLabel}"` : ''),
  )
  return picked
}
