// KINEO-LOGIN-QUADRO-0411 — fundador 04/11: "eu quero que o meu login volte a ser assim, esse quadro no meio"; "um vídeo e três fotos"; "com o motor embaixo e a barra de tempo em cima".
// A vitrine do quadro de entrada. Os quatro filmes são os que o fundador aprovou em 16/09 (lib/homeVideoCuration.ts, APPROVED_HOME_VIDEOS_SEP16); cada selo é o motor real do render.
// KINEO-LOGIN-4-VIDEOS-0411 — fundador 04/11: "os 4 vídeos muda e nem precisa colocar o motor... só coloca 4 vídeos passando, 4 vídeos melhores. Faz uma curadoria."
// Curadoria: aventura, mergulho, ficção e cartoon, para mostrar que cabe de tudo; só clipes limpos que já estão no site, sem fogo, sem legenda e sem marca.
export type SlideDaVitrine = {
  nome: string
  src: string
  poster: string
  /** Quanto tempo o slide fica na tela; os quatro clipes têm 5 s. */
  ms: number
}

export const VITRINE_ENTRADA: readonly SlideDaVitrine[] = [
  { nome: 'Surfer on a giant wave', src: '/previews/promo-clips-surf.mp4', poster: '/posters/promo-clips-surf.webp', ms: 5000 },
  { nome: 'Diver at a lost shipwreck', src: '/previews/home-card-novo-film_shipwreck.mp4', poster: '/posters/home-card-novo-film_shipwreck.webp', ms: 5000 },
  { nome: 'Astronaut at a door on Mars', src: '/previews/home-card-novo-film_mars_door.mp4', poster: '/posters/home-card-novo-film_mars_door.webp', ms: 5000 },
  { nome: 'Cartoon fox among fireflies', src: '/previews/home-card-novo-fox.mp4', poster: '/posters/home-card-novo-fox.webp', ms: 5000 },
]

const S16 = '/previews/curation-sep16/'
const S07 = '/previews/curation-sep07/'
const filme = (id: string) => ({ poster: `${S16}${id}-h.webp`, video: `${S16}${id}-h.mp4` })
const foto = (id: string) => ({ poster: `${S07}${id}-h.webp`, video: null })

/** KINEO-LOGIN-FUNDO-0411 — o fundo de /login e /signup: só filmes que o fundador aprovou (07/09 e 16/09), 4 deles em movimento. */
export const FUNDO_ENTRADA: ReadonlyArray<{ poster: string; video: string | null }> = [
  filme('6b9b363c-3185-4db7-a877-46b77e334f06'),
  foto('1b8e12f9-83e5-411c-8fda-0b277d289934'),
  foto('ca6c04df-6c08-48cb-b1ce-a43b1b171869'),
  filme('b5434412-62b9-48f5-9a10-c36e2e725c9f'),
  foto('f3de57b0-3486-4400-ba72-c9390774d426'),
  filme('d6d73a90-9bd7-46a3-826a-9a4a72549e05'),
  foto('a66e975a-3f6c-4bf4-9510-cd15b895b58b'),
  foto('cbd676d0-340a-4728-8a5f-439fd9dd64c5'),
  foto('a09706da-a79f-4029-b213-69f43d6a2775'),
  foto('7ffd064e-cb37-4a97-a207-70a202bc72b6'),
  filme('ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb'),
  foto('38158db0-f02e-4c6c-a4c8-3c65461413a9'),
]

/** O próximo slide, voltando ao primeiro no fim. */
export function proximoSlide(atual: number, total: number): number {
  return total > 0 ? (atual + 1) % total : 0
}

/** O estado de cada barra: cheia antes do slide atual, enchendo no atual, vazia depois. */
export function estadoDaBarra(indice: number, atual: number): 'cheia' | 'enchendo' | 'vazia' {
  return indice < atual ? 'cheia' : indice === atual ? 'enchendo' : 'vazia'
}
