// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// A casca nova (v1): recebe, mostra exemplos e o primeiro passo, e ENTREGA ao gerador que já existe. Nada aqui gera, cobra ou modera.
// Cada destino usa SÓ o que ele já lê hoje (o guardião scripts/test-tela-nova-1011.mjs prova lendo o arquivo do destino):
//   Film    → /studio?intent_campaign=…&ideia=…  (app/(dashboard)/studio/page.tsx: usarCaixaUnica + ideiaDoLink + campanhaDaCaixa)
//   Cartoon → /kids-cartoon, com a ideia no rascunho que o template já relê (lib/ads/rascunhoDoVisitante.ts → lerRascunhoDoDesenho)
//   Ads     → /ads/new?utm_source=create_ads     (o mesmo destino do menu "Product ads"; app/(dashboard)/ads/new/page.tsx lê utm_*)
// MÓDULO PURO: sem e-mail, sem rede, sem preço.
import { CLIPES_NOVOS, CRIAR_ANUNCIO_HREF, clipeNovoAnuncio, clipeNovoAbreStudio, clipeNovoPoster, clipeNovoVideo } from '@/lib/clipesNos2Lugares'
import { viaSignup } from '@/lib/homeGaleria'
import { KIDS_CARTOON_TEMPLATE_PATH, KIDS_IDEA_MAX_CHARS } from '@/lib/kidsCartoon/kidsCartoon'

export const CREATE_TABS = ['film', 'cartoon', 'ads'] as const
export type CreateTab = (typeof CREATE_TABS)[number]
export const isCreateTab = (tab: string): tab is CreateTab => (CREATE_TABS as readonly string[]).includes(tab)
export const createTabHref = (tab: CreateTab): string => `/create/${tab}`
export const RECREATE_TAB_HREF = '/recreate'

/** A barra de abas, na ordem do fundador: Film · Cartoon · Ads · Recreate. */
export const CREATE_TAB_LINKS: readonly { id: CreateTab | 'recreate'; label: string; href: string }[] = [
  { id: 'film', label: 'Film', href: createTabHref('film') },
  { id: 'cartoon', label: 'Cartoon', href: createTabHref('cartoon') },
  { id: 'ads', label: 'Ads', href: createTabHref('ads') },
  { id: 'recreate', label: 'Recreate', href: RECREATE_TAB_HREF },
]

/** Limite real de cada destino: Film = ideiaDoLink (lib/growth/ideiaDaPagina.ts, 2.000); Cartoon = KIDS_IDEA_MAX_CHARS (300). */
export const FILM_IDEA_MAX_CHARS = 2000
export const CARTOON_IDEA_MAX_CHARS = KIDS_IDEA_MAX_CHARS

/** Campanhas/origens que os destinos já leem (campanhaDaCaixa aceita [a-z0-9_-]{1,64}; cleanUtmQuery aceita [A-Za-z0-9._~-]{1,100}). */
export const CREATE_FILM_CAMPAIGN = 'create_film'
export const CREATE_ADS_UTM = 'create_ads'

/** Eventos de cliente (sem dado pessoal, sem o texto da ideia). O /api/events aceita todo nome que não é SERVER_ONLY. */
export const CREATE_EVENTS = { tabViewed: 'create_tab_viewed', exampleClicked: 'create_example_clicked', continueClicked: 'create_continue_clicked' } as const

export interface CreateExample { id: string; title: string; idea: string | null; video: string; poster: string }

type Clipe = (typeof CLIPES_NOVOS)[number]
const galeria = (c: Clipe, idea: string | null): CreateExample => ({ id: c.id, title: c.title, idea, video: clipeNovoVideo(c), poster: clipeNovoPoster(c) })
const clipe = (id: string): Clipe => {
  const c = CLIPES_NOVOS.find(x => x.id === id)
  if (!c) throw new Error(`Missing showcase clip: ${id}`)
  return c
}
// KINEO-TELA-NOVA-ACABAMENTO-1011 — arquivos que JÁ estão no site (nada novo, nada renderizado): a ideia do clique é o título.
const filmeDaCasa = (asset: string, title: string): CreateExample => ({ id: asset, title, idea: title, video: `/previews/examples-hd-sep24/${asset}.mp4`, poster: `/posters/examples-hd-sep24/${asset}.webp` })
const cardDaHome = (asset: string, title: string): CreateExample => ({ id: `home-${asset}`, title, idea: title, video: `/previews/home-card-novo-${asset}.mp4`, poster: `/posters/home-card-novo-${asset}.webp` })
/** Mínimo de exemplos por aba: a fileira tem até 8 colunas (create.css), então 8 enchem a linha mais larga sem buraco. */
export const CREATE_EXAMPLES_MIN = 8

/** Nenhum exemplo traz texto/prompt próprio nas listas: a ideia que o clique põe no passo 1 é o TÍTULO real do vídeo. */
export const CREATE_EXAMPLES: Readonly<Record<CreateTab, readonly CreateExample[]>> = {
  film: [
    ...CLIPES_NOVOS.filter(clipeNovoAbreStudio).map(c => galeria(c, c.title)), // Mary Celeste · Anticítera · Porta do Inferno (selo 'Narrated film')
    // Filmes da casa de lib/ui/examplesSelectionSep24.ts (mesmos arquivos, mesmos títulos).
    { id: 'tunguska-h3', title: 'Tunguska: the fireball over Siberia', idea: 'Tunguska: the fireball over Siberia', video: '/previews/examples-hd-sep24/tunguska-h3.mp4', poster: '/posters/examples-hd-sep24/tunguska-h3.webp' },
    { id: 'lituya-h3', title: 'Lituya Bay: the tallest wave', idea: 'Lituya Bay: the tallest wave', video: '/previews/examples-hd-sep24/lituya-h3.mp4', poster: '/posters/examples-hd-sep24/lituya-h3.webp' },
    { id: 'plane-1942', title: 'The lost plane of 1942', idea: 'The lost plane of 1942', video: '/previews/examples-hd-sep24/plane-1942.mp4', poster: '/posters/examples-hd-sep24/plane-1942.webp' },
    // KINEO-TELA-NOVA-ACABAMENTO-1011 [fundador 10/11: "completar os quadros com vídeos"] — o resto da MESMA seleção da casa
    // (lib/ui/examplesSelectionSep24.ts: arquivos e títulos de lá, 1080×1920). O Tunguska do Omni fica fora: o tema já está acima.
    filmeDaCasa('lighthouse-selected', "The lighthouse keeper's notebook"),
    filmeDaCasa('train-selected', 'The night train and the red suitcase'),
    filmeDaCasa('volcano-selected', 'The volcano watcher'),
    filmeDaCasa('robot-collision', 'The robot rising from the harbor'),
    filmeDaCasa('castle', 'The castle hiding inside a university building'),
  ],
  cartoon: [
    galeria(clipe('dragaozinho'), clipe('dragaozinho').title),
    galeria(clipe('boneco-de-neve'), clipe('boneco-de-neve').title),
    // O curta "Meet Leo…" do card de Cartoon da home (lib/ui/homeKidsCard.ts, render 4f6c8a40).
    { id: 'kids-cartoon-leo', title: 'Meet Leo', idea: 'Meet Leo', video: '/previews/home-card-kids-cartoon-leo.mp4', poster: '/posters/home-card-kids-cartoon-leo.webp' },
    // KINEO-TELA-NOVA-ACABAMENTO-1011 — os desenhos 3D que já giram no card de Cartoon da home (lib/ui/homeThreeCards.ts kids_cartoon) e a
    // raposa do quadro de entrada (lib/authVitrine.ts); pinguim e skatedog vieram do mesmo lote (KINEO-CARDS-NOVOS-2610). Os de Halloween
    // (abóbora, lobisomem) ficam fora: lib/clipesNos2Lugares.ts FORA_DE_ESTACAO. Título = o que a cena mostra (conferido no quadro).
    cardDaHome('baby_puppy', 'The baby and the puppy'),
    cardDaHome('knight_kitten', 'The kitten knight'),
    cardDaHome('fox', 'Cartoon fox among fireflies'),
    cardDaHome('penguin', 'The penguin on the snowy hill'),
    cardDaHome('skatedog', 'The skateboarding puppy'),
  ],
  // Os 6 'Ad example': só convidam. Ads não tem caixa de texto no passo 1, então o clique só troca o vídeo grande.
  // KINEO-TELA-NOVA-ACABAMENTO-1011 — depois deles, os 3 anúncios de produto que giram no card "AI Product Ads" da home
  // (lib/ui/homeThreeCards.ts product_ads). Também só trocam o vídeo grande.
  ads: [
    ...CLIPES_NOVOS.filter(clipeNovoAnuncio).map(c => galeria(c, null)),
    { ...cardDaHome('smartwatch', 'The watch that builds itself'), idea: null },
    { ...cardDaHome('iced_coffee', 'Iced coffee by the window'), idea: null },
    { ...cardDaHome('headphones', 'Headphones taking shape'), idea: null },
  ],
}

/** Film: o Studio na caixa única, já com a ideia (o mesmo caminho de hrefDaCaixa/voltaParaCaixa da home). */
export function filmContinueHref(idea: string, signedIn: boolean): string {
  const q = new URLSearchParams({ intent_campaign: CREATE_FILM_CAMPAIGN })
  const texto = idea.trim()
  if (texto) q.set('ideia', texto.slice(0, FILM_IDEA_MAX_CHARS))
  return viaSignup(`/studio?${q.toString()}`, signedIn)
}
/** Cartoon: o template de sempre. A ideia vai pelo rascunho que ele já relê (cartoonDraft), não pela URL (o template não lê URL). */
export function cartoonContinueHref(signedIn: boolean): string {
  return viaSignup(KIDS_CARTOON_TEMPLATE_PATH, signedIn)
}
/** Rascunho para guardarRascunhoDoDesenho: personagem, língua e duração vazios = o template mantém os padrões dele. */
export function cartoonDraft(idea: string): { character: string; idea: string; ideaId: null; language: string; duration: number } {
  return { character: '', idea: idea.trim().slice(0, CARTOON_IDEA_MAX_CHARS), ideaId: null, language: '', duration: 0 }
}
/** Ads: o mesmo destino do menu "Product ads", com a origem que o /ads/new já repassa ao montador. */
export function adsContinueHref(signedIn: boolean): string {
  return viaSignup(`${CRIAR_ANUNCIO_HREF}?${new URLSearchParams({ utm_source: CREATE_ADS_UTM }).toString()}`, signedIn)
}

/** Por que o botão está desabilitado (uma linha) — null = pronto. */
export function continueBlocker(tab: CreateTab, idea: string): string | null {
  if (tab === 'ads') return null
  const texto = idea.trim()
  if (!texto) return tab === 'film' ? 'Write your idea to continue.' : 'Write your story idea to continue.'
  if (tab === 'film' && /^https?:\/\//i.test(texto)) return 'Describe your idea in words, not a link.'
  return null
}

/** Texto de cada aba (inglês; sem motor, sem preço, sem urgência). */
export const CREATE_COPY: Readonly<Record<CreateTab, {
  eyebrow: string; title: string; subtitle: string
  step1: string; step1Hint: string; placeholder: string | null
  step2: string; step2Text: string
  step3: string; button: string; note: string
  stageTag: string; galleryTitle: string; galleryHint: string; useLabel: string
}>> = {
  film: {
    eyebrow: 'FILM', title: 'Your idea. A world in motion.', subtitle: 'Start with a story. Make it your own.',
    step1: 'Your idea', step1Hint: 'What story would you like to tell?', placeholder: 'A ship found adrift with dinner still on the table…',
    step2: 'Details', step2Text: 'You choose length, voice and format on the next screen.',
    step3: 'Create', button: 'Continue', note: 'Nothing starts until you press Generate on the next screen.',
    stageTag: 'FILM EXAMPLE', galleryTitle: 'Film examples', galleryHint: 'Choose an idea. Nothing starts automatically.', useLabel: 'Use idea ↗',
  },
  cartoon: {
    eyebrow: 'CARTOON', title: 'Your story. A cartoon to watch.', subtitle: 'Start with a story idea. Pick the hero next.',
    step1: 'Story idea', step1Hint: 'What happens in your cartoon?', placeholder: 'A little dragon who is afraid of fire…',
    step2: 'Character', step2Text: 'You pick the character, language and length on the next screen.',
    step3: 'Create', button: 'Continue', note: 'Cartoons are made with a paid plan. The next screen shows your options.',
    stageTag: 'CARTOON EXAMPLE', galleryTitle: 'Cartoon examples', galleryHint: 'Choose an idea. Nothing starts automatically.', useLabel: 'Use idea ↗',
  },
  ads: {
    eyebrow: 'ADS', title: 'Your product. An ad that moves.', subtitle: 'Start with your product. Choose the look next.',
    step1: 'Your product', step1Hint: 'On the next screen you send a photo or a link of your product.', placeholder: null,
    step2: 'Style', step2Text: 'You choose the format and the scene on the next screen.',
    step3: 'Make your ad', button: 'Make your ad', note: 'Nothing starts until you confirm on the next screen.',
    stageTag: 'AD EXAMPLE', galleryTitle: 'Ad examples', galleryHint: 'Ideas for your product. Nothing starts automatically.', useLabel: 'View ↗',
  },
}
