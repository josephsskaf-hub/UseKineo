import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripScriptMarkers } from '@/lib/scriptParser'
import { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED } from '@/lib/publicSurfacePolicy'

// PUSH #96+ — Shared source of truth for the PUBLIC video surface (`/v/[id]`).
//
// Why this module exists: `/v/[id]` (the page) and `/video-sitemap.xml` (the
// crawler feed) must agree on EXACTLY which videos are public and indexable.
// If they disagree, Google gets a sitemap full of `noindex` pages — the single
// fastest way to lose trust in a sitemap. Both import from here, so the
// qualification rule can only ever be changed in one place.
//
// ── What the production data actually looks like (verified 2026-07-26) ───────
//   568 rows · 564 `status='completed'` with a playable URL
//   `thumbnail_url` / `thumb_url` .... NULL on 100% of rows
//   `duration_seconds` ............... NULL on 100% of rows (`duration` on 426)
//   `niche` .......................... NULL on 100% of rows
//   `prompt` ......................... EMPTY on 100% of completed rows
//   `script` ......................... present on only 13 rows, and on ALL 13 it
//                                      is a JSON render-job blob
//                                      (`{"task_ids":[…],"prompt":"…"}`) — i.e.
//                                      internal provider state, NOT narration.
//   `topic` .......................... the real content field: 548 non-empty,
//                                      488 ≥200 chars, 55 carry HOOK markers.
//
// Consequences encoded below:
//   1. The transcript is derived from `topic`, never from `script`. Publishing
//      `script` would leak internal task IDs and raw provider prompts.
//   2. `prompt` is never selected or rendered (the brief forbids it; it is also
//      empty everywhere).
//   3. `user_id` is never selected. Nothing from `profiles` is ever touched.

/** Canonical public host. Matches app/sitemap.ts and app/robots.ts. */
export const PUBLIC_BASE_URL = 'https://www.usekineo.com'

/**
 * Explicit column allow-list. Deliberately narrow: every column here is
 * rendered somewhere on `/v/[id]` or emitted in the video sitemap. Never widen
 * this to `*`, and never add `user_id`, `prompt` or `script`.
 */
export const PUBLIC_VIDEO_COLUMNS =
  'id, title, video_url, final_video_url, thumbnail_url, thumb_url, topic, status, duration, duration_seconds, quality, created_at, youtube_description, hashtags'

// ── Quality gate ────────────────────────────────────────────────────────────
// Google's scaled-content-abuse policy (updated 2026-05-15) applies "no matter
// how it's created" and has no user-generated carve-out. A player + a button,
// multiplied 564 times, is the exact pattern that gets a domain demoted. So a
// page only becomes indexable when it carries enough UNIQUE prose to stand on
// its own; everything else still renders (the owner shared the link and must
// see their video) but is emitted with `robots: { index: false }` and is kept
// out of the sitemap.

/** Minimum cleaned-title length for an indexable page. */
export const MIN_TITLE_CHARS = 20
/** Minimum cleaned-transcript length, in characters, for an indexable page. */
export const MIN_TRANSCRIPT_CHARS = 240
/** Minimum cleaned-transcript length, in words, for an indexable page. */
export const MIN_TRANSCRIPT_WORDS = 45
/** Hard cap on sitemap entries. A sitemap file may not exceed 50,000 URLs. */
export const SITEMAP_MAX_VIDEOS = 5000

// ── Durabilidade da URL de reprodução ───────────────────────────────────────
// KINEO-SEO-VIDEO-PAGES-2026-08-11 — o defeito mais caro encontrado nesta
// auditoria, e o único que estava servindo lixo a QUEM CHEGAVA DA BUSCA.
//
// Medição do sitemap DE PRODUÇÃO em 11/08/2026 (HEAD em todas as 40 entradas
// cujo `content_loc` não é o storage do Supabase):
//     6 exemplos em www.usekineo.com/videos/*.mp4 ..... 200  (6/6 vivos)
//    33 em f002.backblazeb2.com (bucket do Creatomate)  → 26 respondem 404
//     1 em dnznrvs05pmza.cloudfront.net (Runway, `?_jwt=`) → 401 (assinatura
//       expirada)
// E, para contraste, HEAD nas 12 MAIS ANTIGAS + 4 mais novas hospedadas no
// storage do Supabase: 16/16 responderam 200.
//
// Ou seja: 27 das 650 entradas do sitemap (4,2%) anunciavam ao Google um MP4
// MORTO — e as mesmas 27 páginas continuavam indexáveis, renderizando um
// `<video>` quebrado para qualquer humano que chegasse da busca. As únicas
// backblaze ainda vivas eram de 03–06/08, o que mostra que a retenção do
// bucket de entrega do Creatomate é de poucos dias: TODA URL backblaze morre,
// só não morreu ainda.
//
// A regra abaixo é, portanto, sobre DURABILIDADE, não sobre conteúdo: uma
// URL assinada (traz `_jwt`/`token`/`Expires`/assinatura) é temporária POR
// DEFINIÇÃO, e um host de entrega de terceiro não é nosso para prometer. Só o
// storage do Supabase (o destino canônico) e o próprio site são duráveis.
//
// Uma linha reprovada aqui continua RENDERIZANDO (o dono compartilhou o link),
// apenas sai do índice e do sitemap — o mesmo tratamento de qualquer outra
// reprovação. Consertar o pipeline para copiar todo render para o storage
// próprio é o conserto de raiz e está registrado como follow-up no doc; ele
// mexe no caminho de render e não cabe numa mudança de indexação.

/** Query params que denunciam uma URL assinada e, portanto, expirável. */
const SIGNED_URL_PARAM = /^(_jwt|token|expires|signature|sig|x-amz-signature|x-amz-credential|x-goog-signature)$/i

/**
 * Hosts cujo conteúdo consideramos permanente. Derivado do ambiente para que
 * uma troca de projeto Supabase não exija editar este arquivo.
 * Quando a env não existe (build sem credenciais), o allow-list de host é
 * IGNORADO e só a checagem de URL assinada roda — fail-open de propósito:
 * sem credenciais não há linha nenhuma para classificar, e um allow-list vazio
 * reprovaria tudo.
 */
function durableHosts(): Set<string> | null {
  const hosts = new Set<string>()
  try {
    hosts.add(new URL(PUBLIC_BASE_URL).host)
  } catch {
    /* impossível: PUBLIC_BASE_URL é uma constante literal */
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  try {
    hosts.add(new URL(supabaseUrl).host)
  } catch {
    return null
  }
  return hosts
}

/**
 * True quando a URL de reprodução pode ser oferecida a um buscador: https, sem
 * assinatura temporária e em um host durável.
 */
export function hasDurablePlayback(url: string | null | undefined): boolean {
  const value = (url ?? '').toString().trim()
  if (!value) return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  for (const key of parsed.searchParams.keys()) {
    if (SIGNED_URL_PARAM.test(key)) return false
  }
  const hosts = durableHosts()
  if (!hosts) return true
  return hosts.has(parsed.host)
}

export type PublicVideoRow = {
  id: string
  title: string | null
  video_url: string | null
  final_video_url: string | null
  thumbnail_url: string | null
  thumb_url: string | null
  topic: string | null
  status: string | null
  duration: number | null
  duration_seconds: number | null
  quality: string | null
  created_at: string | null
  youtube_description: string | null
  hashtags: unknown
}

export type PublicVideo = {
  id: string
  /** Cleaned, human-readable H1. Never a raw HOOK/markdown line. */
  title: string
  /** MP4 the <video> element plays. */
  playbackUrl: string | null
  /** Poster for the player, when the row happens to have one (none do today). */
  posterUrl: string | null
  /** Absolute canonical URL of the public page. */
  pageUrl: string
  /** Absolute thumbnail URL. Always the generated OG card (1200x630 PNG). */
  thumbnailUrl: string
  /** Narration/brief split into readable paragraphs. */
  paragraphs: string[]
  /** The same text joined — used for meta description + JSON-LD. */
  transcript: string
  /** True when HOOK/MICRO REWARD/PAYOFF beats were detected in `topic`. */
  isStructuredScript: boolean
  durationSeconds: number | null
  /** ISO-8601 duration for schema.org, e.g. "PT35S". Null when unknown. */
  isoDuration: string | null
  publishedAt: string
  youtubeDescription: string | null
  hashtags: string[]
  /** True only when the row clears the full quality gate. */
  isIndexable: boolean
  /** Human-readable reason the row failed the gate (for logs/debugging). */
  gateFailure: string | null
}

// ── Text cleaning ───────────────────────────────────────────────────────────

// Section markers used by the generator (EN) and by legacy PT rows. Splitting
// on these turns a stored script into readable beats instead of one blob.
// Mirrors the marker vocabulary of `parseViralScriptSections()` in
// app/api/analyze-idea/route.ts — see the note in the report: that function is
// a PRIVATE function inside an API route, not an exported lib helper, and
// importing a route module here would drag the OpenAI client into the render
// and sitemap paths. The canonical, EXPORTED cleaner from lib/scriptParser.ts
// (`stripScriptMarkers`, which already strips HOOK/ESCALATION headers, inline
// stage prefixes, `[Pexels: …]` markers, directive lines and metadata section
// bodies) does the actual cleaning of every chunk, so there is exactly one
// cleaning implementation in the codebase.
const SECTION_SPLIT =
  /\n(?=\s*(?:\*{0,2}|[—–-]{1,3}\s*|#{1,6}\s*)?(?:HOOK|GANCHO|MICRO\s+(?:REWARD|RECOMPENSA)|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA\s+FINAL|SCENE|CENA|BEAT)\b)/i

/** Detects the structured viral-script marker set (same test as the pipeline). */
export function hasViralMarkers(text: string): boolean {
  const hasHook = /\b(HOOK|GANCHO)\b/i.test(text)
  const hasMicroReward = /\b(MICRO REWARD|MICRO RECOMPENSA)\b/i.test(text)
  const hasPayoff = /\b(PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b/i.test(text)
  return hasHook && (hasMicroReward || hasPayoff)
}

// KINEO-SEO-VIDEO-PAGES-2026-08-11 ────────────────────────────────────────────
/**
 * A row whose `topic` is not a script at all but the GENERATOR'S OWN PROMPT,
 * stored verbatim by `lib/seriesContinuation.ts`:
 *   `Create the next episode in the same Short series about "<seed>". Keep the
 *    topic and format recognizable, but use a completely new hook, new facts,
 *    and a fresh payoff. Do not repeat the previous episode.`
 *
 * These are LONG and UNIQUE, so they sailed through the length gate below. The
 * consequence, measured against the live sitemap on 2026-08-11: 3 of the 650
 * entries carried an `<h1>` and a `<meta description>` that read
 * `Keep the topic and format recognizable, but use a completely new hook…` —
 * internal machinery published as the page's headline. The library
 * (lib/scriptLibrary.ts) already refused to card them; the sitemap did not.
 *
 * It is now a hard gate failure, for two reasons:
 *   1. There is no reading of "helpful content" under which a leaked system
 *      prompt is the best answer to any query. Offering it to Google is exactly
 *      the scaled-content signal the rest of this file exists to avoid.
 *   2. `/api/cron/autopilot-generate` runs HOURLY and writes this shape, so the
 *      count only ever grows. Gating at the source is the only fix that holds.
 *
 * The page still RENDERS for the owner who shared the link — as with every
 * other gate failure, it is simply `noindex` and out of the sitemap.
 *
 * This regex is the canonical one: lib/scriptLibrary.ts imports it from here
 * (it already imports this module, so the dependency direction is unchanged and
 * there is no cycle).
 */
const PROMPT_SCAFFOLDING =
  /(next episode in the same short series|keep the topic and format recognizable|completely new hook|do not repeat the previous episode)/i

/** True when the text is the generator's own prompt rather than a script. */
export function isPromptScaffolding(text: string | null | undefined): boolean {
  return PROMPT_SCAFFOLDING.test((text ?? '').toString())
}

/**
 * A line that is nothing but a label, e.g. "Visual style:", "Captions:",
 * "Theme:". `cleanNarration` in lib/scriptParser.ts only anchors on a fixed
 * leading keyword, so a QUALIFIED label ("Visual style:") slips through.
 */
const BARE_LABEL_LINE = /^\s*([A-Za-z][A-Za-z\s/-]{0,28}):\s*$/

/**
 * Labels whose BODY is production scaffolding, not content. The body under
 * "Visual style:" is keyword soup ("deep ocean, sonar screen, underwater
 * shadows…") — publishing it across hundreds of pages is precisely the
 * low-value-text pattern we are trying to avoid, so the label AND its body are
 * dropped. A label not on this list ("Theme:") keeps its body.
 */
const PRODUCTION_LABEL =
  /\b(style|caption|subtitle|legend|music|format|resolution|platform|orientation|editing|note|instruction|voice|voiceover|tone|language|duration|speed|aspect|ratio|prompt|footage|b-?roll)s?\b/i

/** Box-drawing / rule decoration ("──────"), which is NOT the em-dash that
 *  lib/scriptParser.ts's DASH_ONLY_LINE matches — different Unicode block. */
const RULE_LINE = /^[\s─-╿=_*~]+$/

/**
 * Pre-normalize a chunk before it reaches the canonical cleaner:
 *  - strip markdown bold/italic fences so "**HOOK (0-2s):**" is exposed as the
 *    stage prefix it is (the canonical cleaner anchors on "HOOK" at line start
 *    and never saw it behind the asterisks),
 *  - drop box-drawing rules,
 *  - drop bare labels, and the bodies of production-only labels.
 */
function preNormalize(text: string): string {
  const kept: string[] = []
  // `inBlock` = currently dropping a production label's body.
  // `pending`  = the label was seen but its body hasn't started yet, so an
  //              intervening blank line must NOT end the block. Production
  //              briefs routinely write "Style:\n\nUltra-realistic…".
  let inBlock = false
  let pending = false
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\*\*|__/g, '').replace(/^\s*[*+]\s+/, '')
    if (!line.trim()) {
      if (!pending) inBlock = false
      kept.push('')
      continue
    }
    if (RULE_LINE.test(line)) continue
    const label = BARE_LABEL_LINE.exec(line)
    if (label) {
      inBlock = PRODUCTION_LABEL.test(label[1])
      pending = inBlock
      continue
    }
    // "Visual style: deep ocean, sonar…" — label and body on the same line.
    const inline = /^\s*([A-Za-z][A-Za-z\s/-]{0,28}):\s+\S/.exec(line)
    if (inline && PRODUCTION_LABEL.test(inline[1])) {
      inBlock = false
      pending = false
      continue
    }
    if (inBlock) {
      pending = false
      continue
    }
    pending = false
    kept.push(line)
  }
  return kept.join('\n')
}

/**
 * `topic` is hard-truncated at 500 chars on 381 of the 564 production rows, so
 * the stored text routinely stops mid-word ("…Boat esca"). Cut back to the last
 * complete sentence; if that would gut the paragraph, drop only the partial
 * word and mark the elision.
 */
function trimTruncatedTail(paragraph: string): string {
  const p = paragraph.trim()
  if (/[.!?…"'”’)]$/.test(p)) return p
  const lastStop = Math.max(p.lastIndexOf('.'), p.lastIndexOf('!'), p.lastIndexOf('?'), p.lastIndexOf('…'))
  if (lastStop >= Math.floor(p.length * 0.6)) return p.slice(0, lastStop + 1)
  return p.replace(/\s+\S*$/, '') + '…'
}

/** A leftover beat name on its own at the head of a paragraph ("Hook", "Payoff"). */
const LEADING_BEAT_WORD =
  /^(?:hook|gancho|payoff|escalation|escalada|rhythm|ritmo|intro|outro|cta)\b[\s:–—-]*/i

/**
 * Split a stored script/brief into readable paragraphs of clean prose.
 * Each chunk goes through the canonical `stripScriptMarkers` cleaner, so stage
 * directions, `[Pexels: …]` markers and ALL-CAPS headers can never surface.
 */
export function transcriptParagraphs(raw: string | null | undefined): string[] {
  const raw0 = (raw ?? '').toString()
  if (!raw0.trim()) return []
  // Normalize the WHOLE text before chunking: a production label and its body
  // are frequently separated by a blank line, and splitting first would put
  // them in different chunks where the association is lost.
  const text = preNormalize(raw0)
  if (!text.trim()) return []

  // Split on section markers first; fall back to blank-line paragraphs.
  let chunks = text.split(SECTION_SPLIT)
  if (chunks.length < 2) chunks = text.split(/\n\s*\n/)

  const out: string[] = []
  for (const chunk of chunks) {
    const clean = stripScriptMarkers(chunk).replace(LEADING_BEAT_WORD, '').trim()
    // A one- to three-word residue is leftover scaffolding, not a paragraph.
    if (clean.split(/\s+/).filter(Boolean).length < 4) continue
    out.push(clean)
  }

  // Merge very short trailing fragments into the previous paragraph so the page
  // never renders a wall of one-line stubs.
  const merged: string[] = []
  for (const p of out) {
    if (merged.length > 0 && p.length < 60) merged[merged.length - 1] += ' ' + p
    else merged.push(p)
  }
  if (merged.length > 0) {
    merged[merged.length - 1] = trimTruncatedTail(merged[merged.length - 1])
    if (merged[merged.length - 1].split(/\s+/).filter(Boolean).length < 4) merged.pop()
  }
  return merged
}

/** Leading imperative that makes a brief read as a command instead of a title. */
const IMPERATIVE_PREFIX =
  /^(?:please\s+)?(?:create|make|generate|write|produce|build|do)\s+(?:me\s+)?(?:an?|the)?\s*[^.]{0,60}?\b(?:about|on|explaining|covering)\s+/i

/**
 * Clean a single line into an H1-safe title: strips markdown, ALL-CAPS stage
 * prefixes, wrapping quotes and a leading imperative, then truncates on a word
 * boundary. `title` in production is frequently a hard 60-char truncation that
 * ends mid-word, which is why the first transcript sentence is preferred when
 * it is available.
 */
export function cleanTitleLine(raw: string): string {
  let s = (raw ?? '').toString().split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? ''
  s = s.replace(/\*\*/g, '').replace(/^#+\s*/, '').replace(/[*_`>]/g, '').trim()
  // ALL-CAPS stage prefix: "HOOK (0-2s):", "MICRO REWARD 1:", "PAYOFF —".
  s = s
    .replace(
      /^(?:HOOK|GANCHO|INTRO|OUTRO|CTA|PAYOFF|PAGAMENTO|ESCALATION|ESCALADA|RHYTHM|RITMO|MICRO\s+(?:REWARD|RECOMPENSA)(?:\s*\d+)?|BEAT(?:\s*\d+)?|SCENE(?:\s*\d+)?|CENA(?:\s*\d+)?)\s*(?:\([^)]*\))?\s*[:\-–—]\s*/i,
      '',
    )
    .trim()
  s = s.replace(/\[[^\]]*\]/g, ' ').replace(/\s{2,}/g, ' ').trim()
  s = s.replace(/^["“”'']+/, '').replace(/["“”'']+$/, '').trim()
  s = s.replace(IMPERATIVE_PREFIX, '').trim()
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1)
  // Drop a trailing partial word left by an upstream hard truncation.
  if (s.length > 90) s = s.slice(0, 90).replace(/\s+\S*$/, '')
  s = s.replace(/[\s,;:—–-]+$/, '')
  return s
}

/**
 * First sentence of the transcript — usually the hook, the best H1 we have.
 * The terminator must be followed by end-of-string or a capitalised word, so a
 * dramatic ellipsis ("GTA 6 isn't just another game... it's a revolution.")
 * is not mistaken for a sentence break.
 */
const SENTENCE_END = /.{10,180}?[.!?…]["“”'']?(?=\s+["“”'']?[A-Z]|\s*$)/g

/**
 * A sentence that only restates the assignment ("Create a viral YouTube Shorts
 * video in English."). Six rows share that exact opener, so using it as the H1
 * would ship six pages with an identical title — the duplicate-title pattern we
 * are specifically trying to avoid. Skip it and take the next real sentence.
 */
const META_INSTRUCTION =
  /^(?:please\s+)?(?:create|make|generate|write|produce|build|do)\b[^.!?…]*\b(?:short|shorts|video|videos|clip|reel|script)\b/i

function firstSentence(paragraphs: string[]): string {
  const text = paragraphs.slice(0, 2).join(' ').trim()
  const sentences = text.match(SENTENCE_END) ?? []
  for (const s of sentences) {
    const t = s.trim()
    if (!META_INSTRUCTION.test(t)) return t
  }
  return (sentences[0] ?? text).trim()
}

// ── Qualification ───────────────────────────────────────────────────────────

/** Clean ISO-8601 instant, or the epoch when the stored timestamp is unusable. */
function toIsoDate(value: string | null): string {
  const t = value ? Date.parse(value) : NaN
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date(0).toISOString()
}

function toIsoDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const s = Math.round(seconds)
  // Google rejects video durations outside 1–28800 seconds.
  if (s < 1 || s > 28800) return null
  return `PT${s}S`
}

/** Normalize the jsonb `hashtags` column, which is sometimes an array, sometimes a string. */
function normalizeHashtags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\s,]+/)
      : []
  return raw
    .map((h) => String(h).trim())
    .filter((h) => h.length > 1 && h.length <= 40)
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .slice(0, 12)
}

/**
 * Turn a raw row into the public view model, applying the quality gate.
 * ALWAYS returns an object — a failing row still renders for the owner who
 * shared the link; it is simply marked `isIndexable: false`. We never serve a
 * soft-404 template.
 */
export function toPublicVideo(row: PublicVideoRow): PublicVideo {
  const playbackUrl = row.final_video_url || row.video_url || null
  const paragraphs = transcriptParagraphs(row.topic)
  const transcript = paragraphs.join(' ')
  const words = transcript.split(/\s+/).filter(Boolean).length

  const sentence = firstSentence(paragraphs)
  const fromSentence = cleanTitleLine(sentence)
  const fromTitle = cleanTitleLine(row.title ?? '')
  const fromTopic = cleanTitleLine(row.topic ?? '')
  // Prefer the first narration sentence: production `title` values are often a
  // hard 60-char cut that ends mid-word ("…about a strange ").
  const title =
    (fromSentence.length >= MIN_TITLE_CHARS && fromSentence) ||
    (fromTitle.length >= MIN_TITLE_CHARS && fromTitle) ||
    (fromTopic.length >= MIN_TITLE_CHARS && fromTopic) ||
    fromTitle ||
    'AI YouTube Short'

  // `duration_seconds` is NULL on every production row today; `duration` (int
  // seconds) is the working fallback. Anything outside Google's 1–28800 band is
  // treated as unknown rather than emitted and rejected.
  const rawDuration = row.duration_seconds ?? row.duration ?? null
  const durationSeconds =
    rawDuration != null && Number.isFinite(rawDuration) && rawDuration >= 1 && rawDuration <= 28800
      ? Math.round(rawDuration)
      : null

  let gateFailure: string | null = null
  if (row.status !== 'completed') gateFailure = `status=${row.status ?? 'null'}`
  else if (!playbackUrl) gateFailure = 'no playable video URL'
  else if (title.length < MIN_TITLE_CHARS) gateFailure = `title too short (${title.length} chars)`
  else if (transcript.length < MIN_TRANSCRIPT_CHARS)
    gateFailure = `transcript too short (${transcript.length} chars)`
  else if (words < MIN_TRANSCRIPT_WORDS) gateFailure = `transcript too short (${words} words)`
  // KINEO-SEO-VIDEO-PAGES-2026-08-11 — URL de reprodução expirável. Ver o bloco
  // de comentário em `hasDurablePlayback` para a medição: 27 das 650 entradas
  // do sitemap de produção apontavam para um MP4 que já respondia 404/401.
  else if (!hasDurablePlayback(playbackUrl))
    gateFailure = 'playback URL is not durable (signed or third-party delivery host)'
  // KINEO-SEO-VIDEO-PAGES-2026-08-11 — the leaked series-continuation prompt.
  // Tested against BOTH the derived title and the cleaned transcript: on the 3
  // rows that reached the live sitemap the phrase had been promoted into the
  // title, and on the other 10 it sat in the body.
  else if (isPromptScaffolding(title) || isPromptScaffolding(transcript))
    gateFailure = 'prompt scaffolding, not a script'

  return {
    id: row.id,
    title,
    playbackUrl,
    posterUrl: row.thumbnail_url || row.thumb_url || null,
    pageUrl: `${PUBLIC_BASE_URL}/v/${row.id}`,
    // ONDA4 #8 (14/08) — o comentario antigo dizia "no row has a stored
    // thumbnail", mas lib/renderAssets.ts persiste um JPG real do frame desde
    // entao. O preview do WhatsApp agora usa o FRAME DO VIDEO quando existe;
    // o card OG gerado (200 / image/png / 1200x630) vira o fallback.
    thumbnailUrl:
      (row.thumbnail_url ?? '').toString().trim() ||
      (row.thumb_url ?? '').toString().trim() ||
      `${PUBLIC_BASE_URL}/v/${row.id}/opengraph-image`,
    paragraphs,
    transcript,
    isStructuredScript: hasViralMarkers((row.topic ?? '').toString()),
    durationSeconds,
    isoDuration: toIsoDuration(durationSeconds),
    // Normalized to clean ISO-8601/W3C. Postgres hands back
    // "2026-07-21T23:54:41.61122+00:00" — 5 fractional digits and a "+00:00"
    // offset, which is riskier to feed to Google than a plain "…Z".
    publishedAt: toIsoDate(row.created_at),
    youtubeDescription: (row.youtube_description ?? '').toString().trim() || null,
    hashtags: normalizeHashtags(row.hashtags),
    isIndexable: gateFailure === null,
    gateFailure,
  }
}

/** A short, unique meta description built from the page's own prose. */
export function metaDescriptionFor(v: PublicVideo): string {
  // ONDA4 #10 (14/08) — mesmo filtro do titulo: se o transcript comeca com a
  // INSTRUCAO do gerador ("Create a viral YouTube Shorts video…"), isso nao
  // pode virar a descricao do preview no WhatsApp.
  const body = v.transcript.trim()
  if (body.length >= 80 && !META_INSTRUCTION.test(body.slice(0, 160))) {
    const cut = body.slice(0, 155)
    return (cut.length < body.length ? cut.replace(/\s+\S*$/, '') + '…' : cut)
  }
  return `${v.title} — a faceless AI Short made with Kineo. Watch it, read the full script, and generate your own free.`
}

// ── Data access ─────────────────────────────────────────────────────────────

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  // The `videos` table has RLS; the public page has no session, so the read
  // must use the service-role client. The column allow-list above is what keeps
  // that safe — never select `*` with this client.
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Result of a single-video lookup.
 *
 * `missing` and `unavailable` are deliberately distinct. A genuinely absent id
 * must return a hard 404 (a 200 "not available" template is a soft 404 and
 * Google treats a site full of them as low quality), but a Supabase outage must
 * NOT turn all 564 real pages into 404s — that would drop the whole surface out
 * of the index. So an outage renders the friendly, noindex fallback instead.
 */
export type PublicVideoResult =
  | { status: 'ok'; video: PublicVideo }
  | { status: 'missing' }
  | { status: 'unavailable' }

/** Postgrest code for ".single() matched no rows" — i.e. the id really is gone. */
const PGRST_NO_ROWS = 'PGRST116'

export async function getPublicVideoResult(id: string): Promise<PublicVideoResult> {
  // P0 PRIVACY CONTAINMENT (2026-08-27): a completed render has no versioned,
  // auditable publication consent. Fail before creating the service-role client.
  if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return { status: 'missing' }
  // Reject anything that is not a UUID before touching the database.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { status: 'missing' }
  }
  const admin = adminClient()
  if (!admin) return { status: 'unavailable' }
  try {
    const { data, error } = await admin
      .from('videos')
      .select(PUBLIC_VIDEO_COLUMNS)
      .eq('id', id)
      .single()
    if (error) return { status: error.code === PGRST_NO_ROWS ? 'missing' : 'unavailable' }
    if (!data) return { status: 'missing' }
    return { status: 'ok', video: toPublicVideo(data as unknown as PublicVideoRow) }
  } catch {
    return { status: 'unavailable' }
  }
}

/** Convenience wrapper: the video, or null for both missing and unavailable. */
export async function getPublicVideo(id: string): Promise<PublicVideo | null> {
  const r = await getPublicVideoResult(id)
  return r.status === 'ok' ? r.video : null
}

/**
 * Every video that clears the quality gate, newest first, de-duplicated.
 *
 * De-duplication matters: 564 completed rows contain only 508 distinct topics
 * (one brief was re-rendered 5 times). Shipping near-identical pages is exactly
 * the duplicate-content pattern the scaled-content policy penalises, so only
 * the newest row for a given transcript is offered to crawlers.
 *
 * NEVER throws — the sitemap must stay valid even when Supabase is unreachable.
 */
export async function listIndexablePublicVideos(
  limit: number = SITEMAP_MAX_VIDEOS,
): Promise<PublicVideo[]> {
  // The same gate owns libraries, rails, sitemaps and IndexNow. Most
  // importantly, it runs before `adminClient()` so private rows are not read.
  if (!CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED) return []
  const admin = adminClient()
  if (!admin) return []
  try {
    const { data, error } = await admin
      .from('videos')
      .select(PUBLIC_VIDEO_COLUMNS)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, SITEMAP_MAX_VIDEOS) * 2)
    if (error || !data) return []

    const seen = new Set<string>()
    // KINEO-SEO-VIDEO-PAGES-2026-08-11 — a SECOND fingerprint, on the title.
    // The transcript fingerprint above compares the first 400 characters, and
    // that is not tight enough: measured on the live sitemap of 2026-08-11,
    // 650 entries carried only 638 distinct `<video:title>` values and 643
    // distinct descriptions. Twelve pairs shipped with a byte-identical H1 and
    // meta description — the exact duplicate-title pattern Search Console flags
    // and the reason two near-identical URLs split each other's signal. The
    // older of each pair is dropped (rows arrive newest-first).
    const seenTitles = new Set<string>()
    const out: PublicVideo[] = []
    // KINEO-SEO-VIDEO-PAGES-2026-08-11 — alarme para o único jeito de a nova
    // regra de durabilidade dar errado em silêncio. Ela deriva o host permitido
    // de NEXT_PUBLIC_SUPABASE_URL; se algum dia as URLs de reprodução passarem
    // a sair por outro host (um CDN na frente do storage, um domínio próprio),
    // TODA linha reprovaria e o sitemap encolheria para os 4 exemplos sem que
    // nada quebrasse visivelmente. Contar e gritar custa nada e transforma um
    // colapso mudo em uma linha de log.
    let nonDurable = 0
    for (const row of data as unknown as PublicVideoRow[]) {
      const v = toPublicVideo(row)
      if (!v.isIndexable) {
        if (v.gateFailure?.startsWith('playback URL is not durable')) nonDurable++
        continue
      }
      const fingerprint = v.transcript.toLowerCase().replace(/\s+/g, ' ').slice(0, 400)
      if (seen.has(fingerprint)) continue
      const titleKey = v.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (titleKey && seenTitles.has(titleKey)) continue
      seen.add(fingerprint)
      if (titleKey) seenTitles.add(titleKey)
      out.push(v)
      if (out.length >= Math.min(limit, SITEMAP_MAX_VIDEOS)) {
        // Cap loudly rather than truncating in silence: a sitemap file may not
        // exceed 50,000 URLs / 50MB, so when the table grows past the cap we
        // need to know it is time to shard into a sitemap index.
        // eslint-disable-next-line no-console
        console.warn(
          `[video-sitemap] capped at ${out.length} videos (limit ${limit}); shard the sitemap if this persists`,
        )
        break
      }
    }
    // Baseline medido em 11/08/2026: 97 de 914 linhas completas (10,6%) tinham
    // URL não durável. Passar de metade significa que a regra parou de separar
    // exceções e começou a reprovar o caminho normal.
    if (nonDurable > data.length / 2) {
      // eslint-disable-next-line no-console
      console.error(
        `[video-sitemap] ${nonDurable} of ${data.length} rows rejected as non-durable playback — ` +
          'check that NEXT_PUBLIC_SUPABASE_URL still matches the host serving the MP4s',
      )
    }
    return out
  } catch {
    return []
  }
}
