// KINEO-GEO-RODADA2-2026-10-08 — filmes REAIS da casa, com a ideia que os fez, para a página do Seedance e as páginas de nicho.
//
// O PEDIDO (sessão CEO 08/10, itens 1 e 3 da rodada 2 de GEO): "exemplos reais feitos no Seedance dentro da Kineo
// (vitrine/curadoria existente — sem inventar)" na página do Seedance; e, nas páginas /free-ai-shorts/<nicho> que batem com
// vídeos reais da casa, "um exemplo real, um roteiro/prompt pronto e o CTA; nada de página fina ou números inventados".
//
// DE ONDE VEM CADA COISA:
//   · o FILME (id, título, motor, prévia e capa) vem SÓ da vitrine com posse do fundador confirmada (lib/publicExamples.ts
//     FOUNDER_SHOWCASE e ENGINE_PAGE_LEAD — a mesma lista da home, do /examples e das páginas de motor). Nenhum vídeo de
//     cliente. houseFilmSeedProblems() lista id fora da vitrine / motor divergente (o guardião exige lista vazia); em runtime
//     um filme que sumir da vitrine some do card (nunca um card com selo errado nem uma página quebrada);
//   · a IDEIA é o texto REAL que fez aquele filme, lido em videos.topic do filme do fundador em 08/10/2026 (só SELECT):
//       'exact_prompt'      — o filme saiu exatamente deste texto (o texto inteiro cabe no registro);
//       'prompt_opening'    — a 1ª frase desse prompt (quando o resto exagera um fato, a página não o repete);
//       'script_opening'    — a abertura do roteiro do filme (o registro guarda os primeiros 500 caracteres);
//       'translated_prompt' — o prompt foi digitado em português; aqui, a tradução fiel (o filme saiu em inglês).
//     A página diz qual é o caso em cada card — nunca "o prompt exato" quando é a abertura;
//   · o NICHO de cada filme foi conferido no próprio filme (assunto do roteiro), não no título.
//
// Por que horror tem um filme de "navio fantasma": a casa não tem filme de terror; o mais perto que existe de verdade é a
// história do navio encontrado com o jantar na mesa e ninguém a bordo (Kling 2.5). A página o chama de "ghost-ship story",
// não de terror. Nichos sem filme real da casa ficam como estão (sem bloco).
//
// MÓDULO PURO: só import relativo de lib/publicExamples.ts (puro, sem import), e NADA é calculado no carregamento: o sitemap
// importa daqui só as constantes, e há guardiões que o carregam com lib/publicExamples.ts simulado só com PUBLIC_EXAMPLES.
// O guardião scripts/test-geo-rodada2-2026-10-08.mjs confere cada id contra a vitrine e cada nicho contra as páginas que existem.
import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE, type FounderShowcaseExample, type PublicEngineExample } from '../publicExamples'

export const HOUSE_FILM_IDEAS_MARK = 'KINEO-GEO-RODADA2-2026-10-08'
/** Data da revisão desta rodada (o sitemap publica esta data como lastmod das páginas tocadas). */
export const GEO_RODADA2_REVIEWED_ISO = '2026-10-08'
/** Data em que as ideias foram lidas em videos.topic (filmes do fundador, só SELECT). */
export const HOUSE_FILM_IDEAS_READ_ON = '2026-10-08'

export type HouseFilmEngine = PublicEngineExample['engine']
/** Selo honesto: o motor que renderizou o filme (os mesmos nomes de lib/engineWall ENGINE_BADGES, em caixa normal). */
export const HOUSE_ENGINE_NAMES: Partial<Record<HouseFilmEngine, string>> = {
  cinematic_ai: 'Seedance 1.5',
  cinematic_kling: 'Kling 2.5',
  cinematic_veo: 'Veo 3.1',
  cinematic_hollywood: 'Kling 3',
  cinematic_h3: 'MiniMax H3',
  cinematic_omni: 'Omni Flash',
}
/** A página pública do motor (a mesma de lib/growth/engineLandingIntent ENGINE_LANDING_PUBLIC_PATHS, espelho sem import). */
export const HOUSE_ENGINE_PATHS: Partial<Record<HouseFilmEngine, string>> = {
  cinematic_ai: '/ai-video-generator/seedance',
  cinematic_kling: '/ai-video-generator/kling',
  cinematic_veo: '/ai-video-generator/veo',
  cinematic_hollywood: '/ai-video-generator/kling-3',
  cinematic_h3: '/ai-video-generator/minimax-h3',
  cinematic_omni: '/ai-video-generator/gemini-omni-flash',
}

export type IdeaSource = 'exact_prompt' | 'prompt_opening' | 'script_opening' | 'translated_prompt'
export const IDEA_SOURCE_LABELS: Record<IdeaSource, string> = {
  exact_prompt: 'The exact prompt that made this film',
  prompt_opening: 'How the prompt that made this film opens',
  script_opening: 'How this film’s script opens',
  translated_prompt: 'The prompt that made this film (typed in Portuguese, translated)',
}

interface IdeaSeed { id: string; engine: HouseFilmEngine; idea: string; source: IdeaSource }

// As ideias, verbatim de videos.topic (lidas em 08/10/2026). Ordem = ordem da galeria da página do Seedance.
const SEEDS: readonly IdeaSeed[] = [
  { id: '90bd8367-60c6-4811-8fdd-3a5b0200eec6', engine: 'cinematic_ai', source: 'script_opening', idea: 'For a hundred and fifty years, people walked past a medieval castle in Dublin that everyone believed was gone. It never left. It was hiding inside the walls.' },
  { id: 'cbd676d0-340a-4728-8a5f-439fd9dd64c5', engine: 'cinematic_ai', source: 'translated_prompt', idea: 'The Mary Celeste: a brigantine found drifting, completely abandoned, in the Atlantic Ocean in 1872 — in perfect condition, but with no sign of the crew.' },
  { id: '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff', engine: 'cinematic_ai', source: 'prompt_opening', idea: 'There is a lake in Africa that turns animals into stone.' },
  { id: 'fe055601-0668-4d33-be49-82c1cb033779', engine: 'cinematic_ai', source: 'script_opening', idea: 'Something is leaving our solar system right now, and nobody agrees on what it is. It\'s called 3I/ATLAS.' },
  { id: '83db8b63-b654-491e-a0aa-86ce1bc1f3d7', engine: 'cinematic_ai', source: 'script_opening', idea: 'On July 9th, 1958, an earthquake shook Lituya Bay in Alaska. A cliff face collapsed into the water — thirty million cubic meters of rock, falling all at once.' },
  { id: '1901f2bb-2b87-4e78-acb9-e850505b1cbf', engine: 'cinematic_ai', source: 'script_opening', idea: 'In 2012, a message appeared on the internet looking for highly intelligent individuals. Thousands tried. Almost nobody finished. It was signed 3301.' },
  { id: 'c53789d3-a1af-46a7-a2c6-7114204316de', engine: 'cinematic_ai', source: 'exact_prompt', idea: 'At night, some quiet coastlines begin to glow electric blue. The light comes from tiny plankton that store chemical energy during the day. When a wave moves them, they flash for only a fraction of a second. Millions of flashes together make every footprint, paddle, and ripple shine. The glow is not magic, and it is not permanent. Temperature, tides, and nutrients must align. That is why a beach can look ordinary one evening and become a field of stars the next.' },
  { id: '07208070-f6cc-40e1-8c82-4fb0fe53b583', engine: 'cinematic_ai', source: 'script_opening', idea: 'There is a door in India that nobody has opened for eight hundred years. It sits inside Padmanabhaswamy Temple, sealed with iron, and it has no lock, no bolt and no visible hinge.' },
  { id: '16742e11-a2fc-4e0a-a49a-2862e0ee36b0', engine: 'cinematic_veo', source: 'script_opening', idea: 'In 1971 a man jumped from a plane and vanished forever. He bought a ticket as Dan Cooper. Paid cash. Ordered a bourbon. Then handed the attendant a note saying he had a bomb.' },
  { id: '94d551a3-fe7a-4903-8c2b-f252bed39c4c', engine: 'cinematic_hollywood', source: 'script_opening', idea: 'A Romanian mathematician won the lottery fourteen times.' },
  { id: 'fbc5d391-316f-4757-aa54-0565f698cb9f', engine: 'cinematic_kling', source: 'exact_prompt', idea: 'The ship was found sailing perfectly. Dinner still warm on the table. But every single person on board was gone.' },
]

export interface HouseFilm {
  id: string
  title: string
  engine: HouseFilmEngine
  engineName: string
  enginePath: string
  previewPath: string
  posterPath: string
  idea: string
  ideaSource: IdeaSource
  ideaLabel: string
}

/** A vitrine do fundador (lida na hora do uso, nunca no carregamento do módulo). */
function showcase(): readonly FounderShowcaseExample[] {
  return [...(ENGINE_PAGE_LEAD ?? []), ...(FOUNDER_SHOWCASE ?? [])]
}

/** O que está errado nas sementes (id fora da vitrine, motor divergente, posse não confirmada, ideia fora da régua). [] = ok. */
export function houseFilmSeedProblems(): string[] {
  const out: string[] = []
  for (const seed of SEEDS) {
    try { resolveHouseFilm(seed) } catch (err) { out.push(err instanceof Error ? err.message : String(err)) }
  }
  return out
}

/** O filme da vitrine do fundador com a ideia dele. Lança se o id não estiver na vitrine ou se o motor divergir. */
export function resolveHouseFilm(seed: IdeaSeed): HouseFilm {
  const v = showcase().find((x) => x.id === seed.id)
  if (!v) throw new Error(`[houseFilmIdeas] ${seed.id} não está na vitrine do fundador (lib/publicExamples.ts)`)
  if (v.engine !== seed.engine) throw new Error(`[houseFilmIdeas] ${seed.id}: motor ${seed.engine} ≠ vitrine ${v.engine}`)
  if (v.ownershipEvidence !== 'founder_confirmed_owned') throw new Error(`[houseFilmIdeas] ${seed.id}: sem posse confirmada`)
  const engineName = HOUSE_ENGINE_NAMES[v.engine]
  const enginePath = HOUSE_ENGINE_PATHS[v.engine]
  if (!engineName || !enginePath) throw new Error(`[houseFilmIdeas] ${seed.id}: motor sem nome/página pública (${v.engine})`)
  const idea = seed.idea.trim()
  if (idea.split(/\s+/).length < 8 || idea.length > 600) throw new Error(`[houseFilmIdeas] ${seed.id}: ideia fora da régua (8+ palavras, até 600 caracteres)`)
  return {
    id: v.id,
    title: v.title,
    engine: v.engine,
    engineName,
    enginePath,
    previewPath: v.previewPath,
    posterPath: v.posterPath,
    idea,
    ideaSource: seed.source,
    ideaLabel: IDEA_SOURCE_LABELS[seed.source],
  }
}

/** Os filmes que resolvem na vitrine, na ordem das sementes (semente quebrada fica fora — o guardião a acusa). */
export function houseFilms(): HouseFilm[] {
  const out: HouseFilm[] = []
  for (const seed of SEEDS) {
    try { out.push(resolveHouseFilm(seed)) } catch { /* acusado por houseFilmSeedProblems no guardião */ }
  }
  return out
}

function film(id: string): HouseFilm | null {
  return houseFilms().find((x) => x.id === id) ?? null
}

/** A galeria da página do Seedance 1.5: só filmes renderizados no Seedance 1.5, na ordem das sementes. */
export function seedanceGalleryFilms(): HouseFilm[] {
  return houseFilms().filter((f) => f.engine === 'cinematic_ai')
}

/**
 * Nicho (slug de /free-ai-shorts/<slug>) → o filme real da casa daquele assunto. Os seis da sessão CEO (mistério, história,
 * true crime, fatos, dinheiro, ciência) + horror (a página de nicho que o ChatGPT mais cita). O guardião confere que cada
 * slug existe em NICHE_SLUGS.
 */
export const NICHE_HOUSE_FILM_IDS: Readonly<Record<string, string>> = {
  mystery: '07208070-f6cc-40e1-8c82-4fb0fe53b583',
  history: '90bd8367-60c6-4811-8fdd-3a5b0200eec6',
  truecrime: '16742e11-a2fc-4e0a-a49a-2862e0ee36b0',
  facts: '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff',
  money: '94d551a3-fe7a-4903-8c2b-f252bed39c4c',
  science: 'c53789d3-a1af-46a7-a2c6-7114204316de',
  horror: 'fbc5d391-316f-4757-aa54-0565f698cb9f',
}
/** Como cada página de nicho descreve o filme (o assunto conferido no filme, em uma frase curta). */
export const NICHE_HOUSE_FILM_KIND: Readonly<Record<string, string>> = {
  mystery: 'a real mystery Short',
  history: 'a real history Short',
  truecrime: 'a real true-crime Short',
  facts: 'a real facts Short',
  money: 'a real money Short',
  science: 'a real science Short',
  horror: 'a ghost-ship story',
}
export const NICHE_HOUSE_FILM_SLUGS: readonly string[] = Object.keys(NICHE_HOUSE_FILM_IDS)

/** O filme real da casa para a página de nicho; null = o nicho não tem filme real da casa (a página fica como estava). */
export function nicheHouseFilm(slug: string): (HouseFilm & { kind: string }) | null {
  const id = Object.prototype.hasOwnProperty.call(NICHE_HOUSE_FILM_IDS, slug) ? NICHE_HOUSE_FILM_IDS[slug] : null
  const f = id ? film(id) : null
  return f ? { ...f, kind: NICHE_HOUSE_FILM_KIND[slug] } : null
}

/**
 * O H1 de cada página de nicho com filme (espelho de app/free-ai-shorts/[niche]/page.tsx NICHES[slug].h1 — a página não é
 * importável aqui; o guardião confere a igualdade lendo a página). É o rótulo do link no /llms.txt.
 */
export const NICHE_PAGE_H1: Readonly<Record<string, string>> = {
  mystery: 'Free AI Mystery Shorts Generator',
  history: 'Free AI History Shorts Generator',
  truecrime: 'Free AI True Crime Shorts Generator',
  facts: 'Free AI Facts Shorts Generator',
  money: 'Free AI Money & Finance Shorts Generator',
  science: 'Free AI Science Shorts Generator',
  horror: 'Free AI Horror Shorts Generator',
}

/** As páginas de nicho com filme real (para o /llms.txt): só as que resolvem na vitrine, na ordem de NICHE_HOUSE_FILM_IDS. */
export function nicheFilmPages(): { slug: string; path: string; h1: string; film: HouseFilm & { kind: string } }[] {
  const out: { slug: string; path: string; h1: string; film: HouseFilm & { kind: string } }[] = []
  for (const slug of NICHE_HOUSE_FILM_SLUGS) {
    const f = nicheHouseFilm(slug)
    if (f && NICHE_PAGE_H1[slug]) out.push({ slug, path: `/free-ai-shorts/${slug}`, h1: NICHE_PAGE_H1[slug], film: f })
  }
  return out
}
