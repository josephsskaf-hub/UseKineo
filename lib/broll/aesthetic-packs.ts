// Aesthetic Packs (13/06) — "Fast Mode 100%".
// Root cause of Joseph's recurring complaint: the auto visual layer picked
// SEMANTICALLY related but AESTHETICALLY wrong stock ("billionaire habits" →
// coins spinning / worn dollar bills) because nothing told the model what the
// niche's audience expects to SEE. Each pack defines the approved visual
// universe + audience-tested rejects for a niche. Used two ways:
//   1. injected into the broll-engine GPT prompt (steer generation)
//   2. enforcePackOnQueries() post-filters whatever came back (hard guarantee)
import type {} from './types'

export interface AestheticPack {
  id: string
  /** Approved 2-4 word Pexels-friendly visual building blocks. */
  vocab: string[]
  /** Niche-specific banned substrings (lowercase). */
  banned: string[]
}

// Visuals no niche should ever pull for these channels' content.
export const UNIVERSAL_BANNED = [
  'dancing', 'dance', 'party club', 'nightclub', 'selfie', 'tiktok',
  'influencer posing', 'twerk',
]

// PUSH #93 — KEEP THIS FILE IN SYNC WITH THE BLACKLISTS THAT JUDGE IT.
// Every `vocab` entry below is a query this module can inject on its own, with
// NO narration behind it. Two downstream filters reject people/lifestyle
// footage:
//   1. the "HARD NEGATIVE BLACKLIST" section of VISUAL_DIRECTOR_SYSTEM_PROMPT
//      in lib/broll/broll-engine.ts (people walking / portrait / lifestyle /
//      fashion / teen / smiling people / urban lifestyle / influencer)
//   2. PEOPLE_LIFESTYLE_RE in app/api/generate-video-fast/route.ts:
//      /\b(people|person|lifestyle|portrait|fashion|influencer|teenager|teen|
//        walking|smiling|model|woman|man|girl|boy|human)\b/i
// The default pack used to contain the literal 'people walking street' — the
// exact phrase both filters exist to kill — so the fallback vocabulary was
// injecting the "random stock person walking" footage the system is built to
// reject. Any new vocab term MUST pass both filters; use objects, places and
// silhouettes instead of named human subjects.
const PEOPLE_LIFESTYLE_WORDS = [
  'people', 'person', 'lifestyle', 'portrait', 'fashion', 'influencer',
  'teenager', 'teen', 'walking', 'smiling', 'model', 'woman', 'man', 'girl',
  'boy', 'human',
]

const PACKS: AestheticPack[] = [
  {
    id: 'wealth',
    vocab: [
      'private jet interior', 'penthouse city view', 'luxury watch closeup',
      // PUSH #93 — 'man suit skyline' tripped PEOPLE_LIFESTYLE_RE (\bman\b).
      'supercar night city', 'yacht deck ocean', 'silhouette skyline window',
      'trading screens office', 'modern glass office', 'mansion estate aerial',
      // PUSH #93 — 'businessman walking city' tripped the blacklist (\bwalking\b).
      'financial district aerial', 'luxury hotel lobby', 'helicopter city aerial',
      'champagne celebration luxury', 'private library reading',
    ],
    banned: [
      'coins', 'coin spinning', 'dollar bills', 'cash closeup', 'money stack',
      'piggy bank', 'wallet', 'counting money hands',
    ],
  },
  {
    id: 'psychology',
    vocab: [
      'eye closeup dramatic', 'brain neurons abstract', 'chess pieces dark',
      // PUSH #93 — was 'silhouette person shadow' (\bperson\b) and
      // 'crowd walking slow motion' (\bwalking\b): both tripped the blacklist.
      'silhouette shadow doorway', 'crowd blur slow motion',
      // PUSH #93 — was 'man thinking dark room' (\bman\b).
      'silhouette dark room window', 'mirror reflection face', 'hands gesture talking',
      'maze aerial view', 'puppet strings concept',
    ],
    banned: ['smiling stock photo', 'thumbs up'],
  },
  {
    id: 'stoic',
    vocab: [
      // PUSH #93 — 'man looking horizon' tripped PEOPLE_LIFESTYLE_RE (\bman\b).
      'roman statue marble', 'mountain sunrise mist', 'lone silhouette horizon',
      'candle dark room', 'journal writing pen', 'storm clouds timelapse',
      'lone runner dawn', 'ancient ruins columns', 'ocean cliff waves',
      'cold shower water face',
    ],
    banned: ['gym mirror selfie'],
  },
  {
    id: 'dark_mystery',
    vocab: [
      'foggy forest dark', 'old documents archive', 'abandoned building interior',
      'candle flicker darkness', 'stormy coast cliff', 'vintage photographs box',
      'dark corridor flashlight', 'full moon clouds', 'old map closeup',
      'rain window night',
    ],
    banned: ['halloween costume', 'horror makeup'],
  },
  {
    id: 'facts_science',
    vocab: [
      'space stars galaxy', 'microscope laboratory', 'ocean underwater deep',
      'library books shelves', 'lightning storm slow motion', 'dna strand abstract',
      'telescope night sky', 'pyramids desert egypt', 'glacier aerial drone',
      'octopus underwater closeup',
    ],
    banned: [],
  },
]

const PACK_TRIGGERS: Array<{ pack: string; triggers: string[] }> = [
  { pack: 'wealth', triggers: ['billionaire', 'money', 'wealth', 'luxury', 'finance', 'rich', 'millionaire', 'invest', 'old money'] },
  { pack: 'psychology', triggers: ['psychology', 'psych', 'dark psychology', 'mind', 'manipulation', 'behavior'] },
  { pack: 'stoic', triggers: ['stoic', 'stoicism', 'mindset', 'discipline', 'philosophy', 'motivation'] },
  { pack: 'dark_mystery', triggers: ['mystery', 'misterio', 'dark history', 'unsolved', 'creepy', 'paranormal', 'crime', 'history'] },
  { pack: 'facts_science', triggers: ['fact', 'science', 'space', 'learning', 'curiosidade', 'educational', 'geography', 'country'] },
]

const DEFAULT_PACK: AestheticPack = {
  id: 'default',
  vocab: [
    // PUSH #93 — 'people walking street' was here: the exact phrase on the
    // hard-negative blacklist in broll-engine.ts AND a PEOPLE_LIFESTYLE_RE
    // match. As the DEFAULT pack it was the most-used fallback in the app, so
    // it was actively manufacturing the "random stock person walking" bug.
    // Replaced with a people-free equivalent.
    'cinematic city aerial', 'nature landscape drone', 'empty street night rain',
    'ocean waves aerial', 'sunset timelapse sky', 'hands typing laptop',
  ],
  banned: [],
}

/** Pick the aesthetic pack for a niche string (substring match, EN/PT). */
export function packForNiche(niche: string): AestheticPack {
  const n = (niche ?? '').toLowerCase()
  for (const { pack, triggers } of PACK_TRIGGERS) {
    if (triggers.some((t) => n.includes(t))) {
      return PACKS.find((p) => p.id === pack) ?? DEFAULT_PACK
    }
  }
  return DEFAULT_PACK
}

function isBanned(query: string, pack: AestheticPack): boolean {
  const q = query.toLowerCase()
  return [...UNIVERSAL_BANNED, ...pack.banned].some((b) => q.includes(b))
}

// PUSH #93 — function words stripped when deriving a fallback query from the
// scene's own narration. Short list on purpose: anything left over is a noun or
// a name, which is exactly what a stock search wants.
const NARRATION_STOPWORDS = new Set([
  'the', 'this', 'that', 'these', 'those', 'there', 'their', 'them', 'they',
  'with', 'from', 'into', 'onto', 'over', 'under', 'about', 'after', 'before',
  'when', 'what', 'which', 'while', 'where', 'because', 'been', 'being', 'have',
  'has', 'had', 'was', 'were', 'will', 'would', 'could', 'should', 'your',
  'you', 'his', 'her', 'its', 'our', 'and', 'but', 'not', 'never', 'ever',
  'just', 'only', 'more', 'most', 'than', 'then', 'every', 'some', 'any',
  'each', 'much', 'many', 'like', 'here', 'know', 'knows', 'said', 'says',
  'make', 'makes', 'made', 'take', 'takes', 'want', 'wants', 'need', 'needs',
  'thing', 'things', 'something', 'nothing', 'everything', 'anyone', 'someone',
  'down', 'through', 'around', 'across', 'against', 'without', 'within',
  'also', 'even', 'very', 'still', 'other', 'another', 'same', 'back', 'once',
  'para', 'que', 'com', 'uma', 'dos', 'das', 'por', 'mais', 'isso',
])

/**
 * PUSH #93 — derive a stock query from the scene's OWN narration.
 *
 * Defect this fixes: when every GPT query for a scene was banned, the fallback
 * was `pack.vocab[sceneIndex % vocab.length]` — a term chosen by scene POSITION,
 * with zero relation to what the scene says. That is how a scene about one
 * topic ends up showing footage of something completely unrelated.
 *
 * Returns null when the narration yields nothing usable, so the caller can fall
 * back to positional rotation as a genuine last resort.
 */
function groundedFallbackQuery(sceneText: string, pack: AestheticPack): string | null {
  const text = (sceneText ?? '').trim()
  if (!text) return null

  // Proper nouns first: named places/objects/events carry the scene's meaning.
  const proper = (text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? []).map((w) => w.toLowerCase())
  const rest = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const picked: string[] = []
  for (const w of [...proper, ...rest]) {
    if (w.length < 4) continue
    if (/^\d+$/.test(w)) continue // bare years/numbers are useless stock terms
    if (NARRATION_STOPWORDS.has(w)) continue
    // Never rebuild a people/lifestyle query — see the sync note at the top.
    if (PEOPLE_LIFESTYLE_WORDS.includes(w)) continue
    if (picked.includes(w)) continue
    picked.push(w)
    if (picked.length === 3) break
  }

  // 1 word is too thin to beat a curated vocab term — let the caller rotate.
  if (picked.length < 2) return null

  const query = picked.join(' ')
  return isBanned(query, pack) ? null : query
}

/**
 * Hard guarantee: drop banned queries; if a scene ends up with none, derive a
 * substitute from the scene's own narration (PUSH #93) and only fall back to a
 * positionally-rotated vocab term when the narration yields nothing usable.
 */
export function enforcePackOnQueries(
  queries: string[],
  pack: AestheticPack,
  sceneIndex: number,
  /** PUSH #93 — the scene's narration/description; optional so old callers still compile. */
  sceneText?: string,
): string[] {
  const ok = queries.filter((q) => !isBanned(q, pack))
  if (ok.length > 0) return ok

  // PUSH #93 — content-aware substitute before positional rotation.
  const grounded = groundedFallbackQuery(sceneText ?? '', pack)
  if (grounded) {
    console.warn(
      `[aesthetic-packs] scene ${sceneIndex + 1}: all queries banned — using narration-grounded fallback "${grounded}"`,
    )
    return [grounded]
  }

  // Last resort only: unrelated-but-safe vocab term, rotated so consecutive
  // fallbacks differ.
  const rotated = pack.vocab[sceneIndex % pack.vocab.length]
  console.warn(
    `[aesthetic-packs] scene ${sceneIndex + 1}: all queries banned and narration unusable — falling back to pack vocab "${rotated}"`,
  )
  return [rotated]
}
