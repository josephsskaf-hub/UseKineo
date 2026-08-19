/**
 * lib/pixabayMusic.ts
 * Push #488 — Background music: layered fallback + deterministic rotation.
 *
 * ROOT CAUSE OF THE ORIGINAL BUG (push #294): the code called
 * `pixabay.com/api/music/?key=...`, an endpoint that DOES NOT EXIST.
 * Pixabay's public API only covers images and videos — re-confirmed live
 * 03/07/2026: `/api/music/` returns an HTML 404 with a key that returns
 * 200 on `/api/` (images). Music therefore never played since #294
 * shipped ("[music] Pixabay API error: 404" on every Fast Mode render).
 *
 * LAYERED STRATEGY (03/07/2026):
 *   LAYER 1 — Openverse Audio API (api.openverse.org). Open API, no key
 *   (anon limits 20/min, 200/day; we do 1 call per render). CC0-only +
 *   mp3-only + 30s-4min so tracks are attribution-free and
 *   Creatomate-compatible.
 *
 *   LAYER 2 — Curated CC0 tracks self-hosted on OUR Supabase Storage
 *   (public bucket `music`, project cqqukkvjjrguayiyjvhh). 8 phonk /
 *   dark-cinematic tracks originally from Freesound (CC0), downloaded,
 *   byte-verified against origin Content-Length, uploaded 03/07/2026 and
 *   validated anonymously (HEAD 200 + content-type audio/mpeg). These
 *   URLs are under our control — they cannot 404 unless we delete them.
 *
 *   LAYER 3 — no music (handled by the caller's try/catch in
 *   /api/compose), with a clear "[music]" warning in the logs.
 *
 * DETERMINISTIC ROTATION: pass a `seed` (any per-render string — compose
 * uses the voiceover upload URL, unique per render). The seed is FNV-1a
 * hashed to pick the query and the track, so the same render always gets
 * the same track while different renders rotate through the catalog.
 * Without a seed it falls back to Math.random() (old behavior).
 *
 * All tracks are CC0 (public domain) — safe for monetized YouTube
 * content, no attribution required.
 */

const OPENVERSE_API = 'https://api.openverse.org/v1/audio/'

// Dark/cinematic/phonk-adjacent searches matching the channel's style.
const SEARCH_QUERIES = [
  'phonk',
  'dark beat',
  'dark trap beat',
  'cinematic tension',
  'dark ambient loop',
]

// LAYER 2 — curated CC0 tracks on our own Supabase Storage (bucket `music`,
// public). Uploaded + validated 03/07/2026: every URL returned HTTP 200 with
// content-type audio/mpeg and a byte size matching the Freesound original.
const SUPABASE_MUSIC_BASE =
  'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/music'

const FALLBACK_TRACKS = [
  // "Phonk Song" by Seth_Makes_Sounds (Freesound 704410, CC0) — 81s
  `${SUPABASE_MUSIC_BASE}/phonk-song.mp3`,
  // "Dark Beat Synth Electro Atmo Cinematic" by szegvari (611374, CC0) — 48s
  `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-a.mp3`,
  // "Dark Beat Synth Electro Atmo Slow Cinematic" by szegvari (611373, CC0) — 48s
  `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-b.mp3`,
  // "Dark Beat Loop" by BenDerhover (686772, CC0) — 48s
  `${SUPABASE_MUSIC_BASE}/dark-beat-loop.mp3`,
  // "Black Magick Voodoo Tribal" by memz (325143, CC0) — 53s
  `${SUPABASE_MUSIC_BASE}/voodoo-tribal.mp3`,
  // "TRAP Type Beat - Dark Time" by Diamond_Tunes (703568, CC0) — 125s
  `${SUPABASE_MUSIC_BASE}/dark-trap-time.mp3`,
  // "Scary Dark Cinematic For Suspenseful Moments" (711663, CC0) — 73s
  `${SUPABASE_MUSIC_BASE}/scary-dark-cinematic.mp3`,
  // "Orchestral trap music" by Migfus20 (524313, CC0) — 46s
  `${SUPABASE_MUSIC_BASE}/orchestral-trap.mp3`,
]

// ---------------------------------------------------------------------------
// KINEO-MUSIC-MOOD-2026-08-17 — trilha combinando com o TEMA do vídeo.
//
// Flagrante do fundador 17/08: um vídeo de mistério (Farol de Flannan, Veo)
// recebeu uma faixa phonk/trap — a rotação era determinística mas CEGA ao
// tema. O render de Seedance da MESMA história caiu por sorte na faixa de
// suspense e "saiu perfeito". Sorte não é sistema: agora o nicho do script
// (detectNiche — a mesma inteligência que escolhe a VOZ) escolhe primeiro o
// BALDE de humor, e a rotação determinística continua, só que dentro do balde
// certo. Todo mistério recebe trilha de mistério, sempre.
//
// Os baldes reutilizam APENAS as 8 faixas vetadas à mão (lição de 09/07: CC0
// aleatório é roleta de qualidade). Expandir o catálogo = baixar + ouvir +
// aprovar com o fundador antes de entrar aqui.
// ---------------------------------------------------------------------------
export type MusicMood = 'suspense' | 'epic' | 'hustle' | 'dark'

// KINEO-MUSIC-SINERGIA-2026-08-19 (fundador: "a trilha precisa ter sinergia
// com o vídeo, em TODOS os motores"). Três defeitos consertados aqui, sem
// faixa nova (expandir catálogo exige audição + aprovação — ver regra acima):
//   1. `voodoo-tribal` estava em suspense E em epic. Faixa tribal não é
//      épico-orquestral; agora vive só no suspense, onde funciona.
//   2. O balde `dark` (fallback) sorteava entre as 8 faixas — ou seja, um
//      vídeo de mistério podia receber PHONK DE DINHEIRO. Phonk/trap agora
//      são exclusivos do `hustle`; o fallback só tem cinematográfico neutro.
//   3. `facts`/`learning`/`curiosities` (o fallback do detectNiche, e portanto
//      o caso MAIS COMUM) caía nessa roleta. Agora mapeia para suspense — o
//      tom real do canal de curiosidade.
const MOOD_TRACKS: Record<MusicMood, string[]> = {
  // Mistério / conspiração / dark history / curiosidade — tensão, zero festa.
  suspense: [
    `${SUPABASE_MUSIC_BASE}/scary-dark-cinematic.mp3`,
    `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-b.mp3`,
    `${SUPABASE_MUSIC_BASE}/voodoo-tribal.mp3`,
  ],
  // História / geografia / ciência — peso cinematográfico, orquestral.
  epic: [
    `${SUPABASE_MUSIC_BASE}/orchestral-trap.mp3`,
    `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-a.mp3`,
  ],
  // Dinheiro / billionaire / luxo / tech — a batida phonk/trap que JÁ era a
  // identidade do canal de finanças; aqui ela é acerto, não acidente.
  hustle: [
    `${SUPABASE_MUSIC_BASE}/phonk-song.mp3`,
    `${SUPABASE_MUSIC_BASE}/dark-trap-time.mp3`,
    `${SUPABASE_MUSIC_BASE}/dark-beat-loop.mp3`,
  ],
  // Sem sinal de tema — SÓ cinematográfico neutro. Nunca phonk/trap: uma
  // batida de dinheiro sob uma história de mistério é o que o fundador ouviu
  // como "sem sinergia".
  dark: [
    `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-a.mp3`,
    `${SUPABASE_MUSIC_BASE}/dark-beat-cinematic-b.mp3`,
    `${SUPABASE_MUSIC_BASE}/scary-dark-cinematic.mp3`,
  ],
}

// ContentNiche (lib/narration/niche-mapping) → balde de humor. Espelha o
// agrupamento das personas de voz: quem narra com voz de suspense ganha
// trilha de suspense.
const NICHE_TO_MOOD: Record<string, MusicMood> = {
  mystery: 'suspense',
  conspiracy: 'suspense',
  dark_history: 'suspense',
  history: 'epic',
  geography: 'epic',
  travel: 'epic',
  science: 'epic',
  finance: 'hustle',
  billionaire: 'hustle',
  money: 'hustle',
  luxury: 'hustle',
  ai: 'hustle',
  technology: 'hustle',
  // KINEO-MUSIC-SINERGIA-2026-08-19 — estes três eram o buraco: 'facts' é o
  // FALLBACK do detectNiche (o caso mais frequente do produto) e caía na
  // roleta. O canal é curiosidade/mistério — suspense é o tom certo.
  facts: 'suspense',
  learning: 'suspense',
  curiosities: 'suspense',
}

export function resolveMusicMood(niche: string | null | undefined): MusicMood {
  if (!niche) return 'dark'
  return NICHE_TO_MOOD[niche.toLowerCase()] ?? 'dark'
}

type OpenverseHit = {
  url?: string
  duration?: number // milliseconds
  category?: string | null
  title?: string
}

// ---------------------------------------------------------------------------
// FNV-1a 32-bit hash — deterministic seed → index mapping.
// ---------------------------------------------------------------------------
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Pick an index in [0, len). Seeded = deterministic; unseeded = random. */
function pickIndex(len: number, seed: string | undefined, salt: string): number {
  if (len <= 0) return 0
  if (seed && seed.length > 0) return fnv1a(`${salt}:${seed}`) % len
  return Math.floor(Math.random() * len)
}

// ---------------------------------------------------------------------------
// LAYER 1 — Openverse Audio API search. CC0 only, mp3 only, 30s-4min.
// ---------------------------------------------------------------------------
async function fetchTrackFromOpenverse(seed?: string): Promise<string | null> {
  try {
    const query = SEARCH_QUERIES[pickIndex(SEARCH_QUERIES.length, seed, 'query')]
    const url = `${OPENVERSE_API}?q=${encodeURIComponent(query)}&license=cc0&page_size=20`

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.warn(`[music] Openverse API error: ${res.status} — falling back to curated tracks`)
      return null
    }

    const data = (await res.json()) as { results?: OpenverseHit[] }

    const hits = (data.results ?? []).filter(
      (h) =>
        typeof h.url === 'string' &&
        /\.mp3(\?|$)/i.test(h.url) && // Creatomate-safe format
        typeof h.duration === 'number' &&
        h.duration >= 30_000 &&
        h.duration <= 240_000 &&
        h.category !== 'pronunciation', // Openverse indexes speech clips too
    )

    if (hits.length === 0) return null

    const picked = hits[pickIndex(hits.length, seed, 'track')]
    console.log(
      `[music] Openverse selected: "${picked.title}" (${Math.round((picked.duration ?? 0) / 1000)}s, query "${query}")`,
    )
    return picked.url ?? null
  } catch (err) {
    console.warn(
      '[music] Openverse fetch failed — falling back to curated tracks:',
      err instanceof Error ? err.message : String(err),
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Main export — call once per video render to get a music URL.
// `seed`: any per-render string (compose passes the voiceover upload URL) so
// track choice is deterministic per render but rotates across renders.
// Never returns null in practice: LAYER 2 is self-hosted and always resolves.
// ---------------------------------------------------------------------------
export async function getBackgroundMusicUrl(seed?: string, mood?: MusicMood): Promise<string | null> {
  // KINEO-MUSIC-CURATED-2026-07-09 — Openverse (LAYER 1) DISABLED by default.
  // Real-world failure 09/07: a random Openverse "phonk/dark beat" hit turned
  // out to be a track that flips into upbeat club music mid-file — the loop
  // put party music under the last 5s of a Battle of Waterloo video sent to a
  // client. Random CC0 search = quality roulette; the 8 curated tracks below
  // are hand-vetted dark/cinematic and always on-brand. Re-enable the live
  // search only via env flag after adding a genre-consistency check.
  if (process.env.MUSIC_OPENVERSE_ENABLED === '1') {
    const fromApi = await fetchTrackFromOpenverse(seed)
    if (fromApi) return fromApi
  }

  // LAYER 2 (now primary) — curated self-hosted CC0 tracks, mood-matched
  // (KINEO-MUSIC-MOOD-2026-08-17) + deterministic rotation dentro do balde.
  const pool = MOOD_TRACKS[mood ?? 'dark'] ?? FALLBACK_TRACKS
  const fallback = pool[pickIndex(pool.length, seed, 'fallback')]
  console.log(`[music] Using curated self-hosted CC0 track (mood=${mood ?? 'dark'}): ${fallback}`)
  return fallback

  // LAYER 3 (no music) is the caller's try/catch in /api/compose — it logs
  // "[compose] music fetch failed, continuing without music".
}
