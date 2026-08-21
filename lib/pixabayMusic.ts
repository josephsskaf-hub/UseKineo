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

// ⚠ REDE DE SEGURANÇA, e SÓ isso. Hoje MOOD_TRACKS cobre os 6 climas, então o
// `?? FALLBACK_TRACKS` lá embaixo é inalcançável. Ele existe para o dia em que
// alguém adicionar um clima novo e esquecer de preencher o catálogo.
// KINEO-TRILHA-59-2026-08-21 — as 8 faixas antigas saíram DAQUI TAMBÉM. Três
// delas (`phonk-song`, `voodoo-tribal`, `dark-trap-time`) carregam vocal e
// cantoria: é o que o fundador ouviu como "letras que não reconhecemos". Vocal
// disputa com a narração e some com a inteligibilidade — cama de narração é
// instrumental, sem exceção. Os arquivos continuam no bucket; só não são mais
// escolhidos por ninguém.
const FALLBACK_TRACKS = [
  `${SUPABASE_MUSIC_BASE}/suspense-01.mp3`,
  `${SUPABASE_MUSIC_BASE}/epic-01.mp3`,
  `${SUPABASE_MUSIC_BASE}/emotional-01.mp3`,
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
// KINEO-TRILHA-59-2026-08-21 — eram 4 climas e 8 arquivos, com 'dark'
// repetindo as MESMAS faixas de 'suspense'. Na prática a maioria dos filmes
// ouvia 3 músicas. O fundador: "assisto vídeos da nossa plataforma e vejo
// sempre os mesmos". Não era impressão — era o catálogo.
// Agora 6 climas e 59 faixas, ZERO repetida entre grupos.
export type MusicMood = 'suspense' | 'epic' | 'hustle' | 'tech' | 'emotional' | 'nature'

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
// 59 faixas CC0 (Openverse), colhidas e CURADAS em 21/08 — não sorteadas em
// tempo de render, que foi o erro de 09/07 que fez desligarem a busca dinâmica.
// O funil de curadoria reprovou 17 de 76: efeito sonoro, gravação de campo,
// alarme, ringtone, faixa com silêncio no meio, e tudo abaixo de -35 dB médio
// (esparso demais para servir de cama). As sobreviventes foram RECLASSIFICADAS
// pelo título real, não pela busca que as encontrou — a busca "peaceful
// documentary" trazia "Street Thriller" para o balde de natureza, que é
// exatamente o tipo de erro que produz trilha sem sinergia.
// TODAS normalizadas a -23 LUFS: sem isso uma faixa a -8 dB e outra a -30 dB
// fazem a música saltar de vídeo para vídeo, e metade da sensação de amadorismo
// vem daí.
const MOOD_TRACKS: Record<MusicMood, string[]> = {
  suspense: [
    `${SUPABASE_MUSIC_BASE}/suspense-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-06.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-07.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-08.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-09.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-10.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-11.mp3`,
    `${SUPABASE_MUSIC_BASE}/suspense-12.mp3`,
  ],
  epic: [
    `${SUPABASE_MUSIC_BASE}/epic-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-06.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-07.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-08.mp3`,
    `${SUPABASE_MUSIC_BASE}/epic-09.mp3`,
  ],
  hustle: [
    `${SUPABASE_MUSIC_BASE}/hustle-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-06.mp3`,
    `${SUPABASE_MUSIC_BASE}/hustle-07.mp3`,
  ],
  tech: [
    `${SUPABASE_MUSIC_BASE}/tech-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/tech-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/tech-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/tech-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/tech-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/tech-06.mp3`,
  ],
  emotional: [
    `${SUPABASE_MUSIC_BASE}/emotional-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-06.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-07.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-08.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-09.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-10.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-11.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-12.mp3`,
    `${SUPABASE_MUSIC_BASE}/emotional-13.mp3`,
  ],
  nature: [
    `${SUPABASE_MUSIC_BASE}/nature-01.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-02.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-03.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-04.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-05.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-06.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-07.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-08.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-09.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-10.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-11.mp3`,
    `${SUPABASE_MUSIC_BASE}/nature-12.mp3`,
  ],
}

// ContentNiche (lib/narration/niche-mapping) → balde de humor. Espelha o
// agrupamento das personas de voz: quem narra com voz de suspense ganha
// trilha de suspense.
const NICHE_TO_MOOD: Record<string, MusicMood> = {
  mystery: 'suspense',
  conspiracy: 'suspense',
  dark_history: 'suspense',
  horror: 'suspense',
  history: 'epic',
  geography: 'epic',
  travel: 'epic',
  adventure: 'epic',
  finance: 'hustle',
  billionaire: 'hustle',
  money: 'hustle',
  luxury: 'hustle',
  business: 'hustle',
  // KINEO-TRILHA-59-2026-08-21 — ai/technology/science saíram do 'hustle'.
  // Batida de trap sob uma história de inteligência artificial era o mesmo
  // erro de sinergia que o fundador ouviu: o clima certo é eletrônico.
  ai: 'tech',
  technology: 'tech',
  science: 'tech',
  // Histórias de pessoa, psicologia e criador pedem piano, não orquestra épica.
  psychology: 'emotional',
  people: 'emotional',
  creator: 'emotional',
  // Natureza/documentário: o pedido de curadoria do fundador (raios, chuva,
  // mar, aventura) tem clima próprio em vez de cair no genérico.
  nature: 'nature',
  documentary: 'nature',
  // 'facts' é o FALLBACK do detectNiche, ou seja, o caso MAIS frequente do
  // produto. O canal é curiosidade/mistério — suspense é o tom certo.
  facts: 'suspense',
  learning: 'suspense',
  curiosities: 'suspense',
}

export function resolveMusicMood(niche: string | null | undefined): MusicMood {
  // 'dark' morreu junto com o catálogo antigo. Sem sinal de tema o produto é
  // canal de curiosidade, então suspense é o padrão honesto — nunca uma batida
  // de dinheiro sob uma história de mistério.
  if (!niche) return 'suspense'
  return NICHE_TO_MOOD[niche.toLowerCase()] ?? 'suspense'
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
  const pool = MOOD_TRACKS[mood ?? 'suspense'] ?? FALLBACK_TRACKS
  const fallback = pool[pickIndex(pool.length, seed, 'fallback')]
  console.log(`[music] faixa curada (clima=${mood ?? 'suspense'}, ${pool.length} disponíveis): ${fallback}`)
  return fallback

  // LAYER 3 (no music) is the caller's try/catch in /api/compose — it logs
  // "[compose] music fetch failed, continuing without music".
}
