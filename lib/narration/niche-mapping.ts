/**
 * Dynamic AI Narration Engine — Niche → Voice Mapping
 * Phase 1: Auto-select the best persona for a given content vertical/script.
 *
 * detectVertical() analyses the script text + channel vertical string and
 * returns the most appropriate persona ID. selectVoiceForScript() is the
 * public entry-point used by generateTTS().
 */

import { VOICE_PERSONAS, type VoicePersona } from './personas'

// ─── Niche types ─────────────────────────────────────────────────────────────

export type ContentNiche =
  | 'mystery'
  | 'conspiracy'
  | 'dark_history'
  | 'finance'
  | 'billionaire'
  | 'money'
  | 'curiosities'
  | 'learning'
  | 'facts'
  | 'history'
  | 'geography'
  | 'science'
  | 'luxury'
  | 'travel'
  | 'technology'
  | 'ai'

// ─── Persona mapping per niche ────────────────────────────────────────────────

type NicheMapping = {
  /** Primary persona ID — used for premium/free if available */
  primary: string
  /** Secondary persona — used as fallback or for free-tier if primary is premium */
  secondary: string
  /** Cinematic tier upgrade */
  cinematic?: string
}

const NICHE_PERSONA_MAP: Record<ContentNiche, NicheMapping> = {
  // #282 — mystery/dark_history/history no tier cinematic caíam em
  // emotional-storyteller (nova, voz FEMININA) — o fundador ouviu num filme
  // de Pompeia e reprovou na hora. Documentário de mistério/história pede
  // voz masculina grave: dark-mystery (onyx) e documentary (echo).
  mystery:      { primary: 'dark-mystery',      secondary: 'conspiracy',        cinematic: 'dark-mystery' },
  conspiracy:   { primary: 'conspiracy',         secondary: 'dark-mystery',      cinematic: 'dark-mystery' },
  dark_history: { primary: 'documentary',        secondary: 'dark-mystery',      cinematic: 'dark-mystery' },
  finance:      { primary: 'finance-authority',  secondary: 'storyteller',       cinematic: 'luxury-narrator' },
  billionaire:  { primary: 'finance-authority',  secondary: 'luxury-narrator',   cinematic: 'luxury-narrator' },
  money:        { primary: 'finance-authority',  secondary: 'energetic-facts',   cinematic: 'luxury-narrator' },
  curiosities:  { primary: 'energetic-facts',    secondary: 'storyteller',       cinematic: 'emotional-storyteller' },
  learning:     { primary: 'storyteller',         secondary: 'energetic-facts',   cinematic: 'documentary' },
  facts:        { primary: 'energetic-facts',    secondary: 'storyteller',       cinematic: 'documentary' },
  history:      { primary: 'documentary',         secondary: 'emotional-storyteller', cinematic: 'documentary' },
  geography:    { primary: 'documentary',         secondary: 'storyteller',       cinematic: 'luxury-narrator' },
  science:      { primary: 'documentary',         secondary: 'futuristic-ai',     cinematic: 'futuristic-ai' },
  luxury:       { primary: 'luxury-narrator',    secondary: 'finance-authority', cinematic: 'luxury-narrator' },
  travel:       { primary: 'luxury-narrator',    secondary: 'documentary',       cinematic: 'luxury-narrator' },
  technology:   { primary: 'futuristic-ai',      secondary: 'energetic-facts',   cinematic: 'futuristic-ai' },
  ai:           { primary: 'futuristic-ai',       secondary: 'storyteller',       cinematic: 'futuristic-ai' },
}

// ─── Keyword-based niche detection ───────────────────────────────────────────

const NICHE_KEYWORDS: Array<{ niche: ContentNiche; keywords: string[] }> = [
  // mystery / conspiracy first — highest specificity
  { niche: 'conspiracy',   keywords: ['conspiracy', 'cover up', 'coverup', 'secret society', 'illuminati', 'deep state', 'cover-up', 'classified', 'government hid'] },
  { niche: 'mystery',      keywords: ['unsolved', 'mystery', 'disappear', 'vanish', 'haunted', 'paranormal', 'ufo', 'alien', 'unexplained', 'supernatural', 'ghost', 'weird', 'strange'] },
  { niche: 'dark_history', keywords: ['war crime', 'massacre', 'genocide', 'torture', 'execution', 'dark history', 'serial killer', 'murder', 'brutal', 'atrocity'] },
  // billionaire / luxury before generic finance
  { niche: 'billionaire',  keywords: ['billionaire', 'elon musk', 'jeff bezos', 'warren buffett', 'bill gates', 'zuckerberg', 'billion dollar', 'richest'] },
  { niche: 'luxury',       keywords: ['luxury', 'mansion', 'yacht', 'ferrari', 'lamborghini', 'rolex', 'private jet', 'penthouse', 'exclusive', 'ultra-rich', 'rolls royce'] },
  { niche: 'finance',      keywords: ['stock market', 'invest', 'compound interest', 'credit card', 'debt', 'savings', 'budget', 'inflation', 'recession', 'economy', 'crypto', 'bitcoin', 'money trap'] },
  { niche: 'money',        keywords: ['money habit', 'financial freedom', 'passive income', 'rich', 'wealth', 'salary', 'income', 'broke', 'afford'] },
  // ai / tech before science
  { niche: 'ai',           keywords: ['artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'robot', 'automation', 'neural network', ' ai '] },
  { niche: 'technology',   keywords: ['tech', 'software', 'computer', 'internet', 'smartphone', 'app', 'code', 'startup', 'silicon valley', 'quantum', 'space'] },
  { niche: 'science',      keywords: ['science', 'physics', 'chemistry', 'biology', 'experiment', 'discovery', 'nasa', 'universe', 'black hole', 'evolution', 'dna'] },
  // history / geography
  { niche: 'history',      keywords: ['ancient', 'roman', 'empire', 'medieval', 'century', 'centuries', 'world war', 'wwii', 'wwi', 'historical', 'civilization', 'pharaoh', 'viking', 'revolution', 'archaeolog', 'eyewitness account', 'scribes'] },
  { niche: 'geography',    keywords: ['country', 'capital', 'mountain', 'ocean', 'continent', 'nation', 'population', 'territory', 'island', 'border', 'flag', 'language spoken', 'city'] },
  { niche: 'travel',       keywords: ['travel', 'visit', 'beach', 'destination', 'tourism', 'backpack', 'hostel', 'wanderlust', 'explore', 'hidden gem'] },
  // generic learning / facts last — lowest specificity
  { niche: 'curiosities',  keywords: ['did you know', 'fun fact', 'actually', 'surprisingly', 'most people', 'no one knows', 'you won\'t believe'] },
  { niche: 'facts',        keywords: ['fact', 'truth about', 'real reason', 'real story'] },
]

// Channel vertical string → most likely niche (fast coarse detection)
const VERTICAL_TO_NICHE: Record<string, ContentNiche> = {
  mystery:    'mystery',
  finance:    'finance',
  billionaire: 'billionaire',
  learning:   'learning',
  geography:  'geography',
  country:    'geography',
  history:    'history',
  technology: 'technology',
  luxury:     'luxury',
  travel:     'travel',
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect the content niche from a combination of script text and channel
 * vertical label. Vertical is used as a strong prior, then keyword scanning
 * refines to the most specific sub-niche.
 */
export function detectNiche(script: string, vertical?: string): ContentNiche {
  const lower = script.toLowerCase()

  // #282 — KINEO-NICHO-POR-PESO-2026-08-23. Era "primeiro match ganha": o
  // roteiro de Pompeia dizia "scientists" (1 hit fraco em science, que vem
  // antes na lista) e perdia para "Roman history... centuries" (2+ hits em
  // history). Resultado medido: filme histórico narrado por futuristic-ai
  // (alloy, feminina) com trilha "tech" — o fundador ouviu e reprovou.
  // Agora CONTA-SE os hits por nicho; empate mantém a ordem da lista (que
  // continua most→least specific, preservando a semântica antiga).
  // E o match vira FRONTEIRA DE PALAVRA + prefixo (regex \bkw), não substring
  // solto: 'app' casava dentro de "h·app·ened" e 'science' dentro de
  // "scientists" — dois falsos positivos MEDIDOS neste mesmo roteiro. Prefixo
  // preserva plurais ('fact'→'facts', 'archaeolog'→'archaeologists').
  const hasKw = (kw: string): boolean =>
    new RegExp('\\b' + kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(lower)
  let best: ContentNiche | null = null
  let bestScore = 0
  for (const { niche, keywords } of NICHE_KEYWORDS) {
    const score = keywords.reduce((acc, kw) => acc + (hasKw(kw) ? 1 : 0), 0)
    if (score > bestScore) { best = niche; bestScore = score }
  }
  if (best) return best

  // 2. Fall back to channel vertical if no keyword matched
  if (vertical) {
    const vLower = vertical.toLowerCase()
    for (const [key, niche] of Object.entries(VERTICAL_TO_NICHE)) {
      if (vLower.includes(key)) return niche
    }
  }

  // 3. Last resort — generic facts
  return 'facts'
}

/**
 * Select the best VoicePersona for the given script + vertical.
 *
 * @param script    - The narration text (used for keyword detection)
 * @param vertical  - Channel vertical hint (e.g. 'mystery', 'finance', 'geography')
 * @param userTier  - User's subscription tier (free | premium | cinematic)
 * @param language  - Output language ('en' | 'pt' | 'es'). Non-English scripts
 *                    get a language override: 'fable' → 'nova' for pt/es since
 *                    fable is strongly English-accented; nova sounds most natural
 *                    in Brazilian Portuguese and Latin Spanish.
 * @returns The VoicePersona to use for TTS generation
 */
export function selectPersonaForScript(
  script: string,
  vertical?: string,
  userTier: 'free' | 'premium' | 'cinematic' = 'free',
  language: 'en' | 'pt' | 'es' = 'en',
): VoicePersona {
  const niche = detectNiche(script, vertical)
  const mapping = NICHE_PERSONA_MAP[niche]

  const getPersona = (id: string): VoicePersona | undefined =>
    VOICE_PERSONAS.find((p) => p.id === id)

  // Cinematic tier: try cinematic → primary → secondary
  if (userTier === 'cinematic' && mapping.cinematic) {
    const p = getPersona(mapping.cinematic)
    if (p) return applyLanguageOverride(p, language)
  }

  // Premium tier: primary persona regardless of its own tier
  if (userTier === 'premium' || userTier === 'cinematic') {
    const p = getPersona(mapping.primary)
    if (p) return applyLanguageOverride(p, language)
  }

  // Free tier: try primary if it's free, else fall back to secondary
  const primary = getPersona(mapping.primary)
  if (primary?.tier === 'free') return applyLanguageOverride(primary, language)

  const secondary = getPersona(mapping.secondary)
  if (secondary?.tier === 'free') return applyLanguageOverride(secondary, language)

  // Ultimate fallback — storyteller is always free
  return applyLanguageOverride(VOICE_PERSONAS.find((p) => p.id === 'storyteller')!, language)
}

/**
 * Phase 3 — Language-aware voice override.
 * 'fable' is strongly English-accented and sounds unnatural in Portuguese/Spanish.
 * We swap it to 'nova' which handles pt-BR and es-419 most naturally while
 * preserving all other persona settings (speed, multipliers, tier, etc.).
 */
function applyLanguageOverride(
  persona: VoicePersona,
  language: 'en' | 'pt' | 'es',
): VoicePersona {
  if (language === 'en') return persona
  // fable is the most English-accented voice — swap to nova for pt/es
  if (persona.voice === 'fable') {
    return { ...persona, voice: 'nova' }
  }
  return persona
}

/**
 * Log-friendly summary of the voice selection decision.
 * Used in compose/route.ts to log which persona was chosen and why.
 */
export function describeVoiceSelection(
  script: string,
  vertical?: string,
  userTier: 'free' | 'premium' | 'cinematic' = 'free',
  language: 'en' | 'pt' | 'es' = 'en',
): string {
  const niche = detectNiche(script, vertical)
  const persona = selectPersonaForScript(script, vertical, userTier, language)
  return `niche=${niche} vertical=${vertical ?? 'unknown'} tier=${userTier} lang=${language} → persona=${persona.id} voice=${persona.voice} speed=${persona.defaultSpeed}`
}
