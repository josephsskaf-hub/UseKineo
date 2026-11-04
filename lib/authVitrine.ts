// KINEO-LOGIN-QUADRO-0411 — fundador 04/11: "eu quero que o meu login volte a ser assim, esse quadro no meio"; "um vídeo e três fotos"; "com o motor embaixo e a barra de tempo em cima".
// A vitrine do quadro de entrada. Os quatro filmes são os que o fundador aprovou em 16/09 (lib/homeVideoCuration.ts, APPROVED_HOME_VIDEOS_SEP16); cada selo é o motor real do render.
export type SlideDaVitrine = {
  motor: string
  tipo: 'video' | 'foto'
  src: string
  /** Quanto tempo o slide fica na tela; o vídeo de prévia tem 6 s. */
  ms: number
  titulo: string
  texto: string
  etiqueta: string
}

export const VITRINE_ENTRADA: readonly SlideDaVitrine[] = [
  {
    motor: 'Seedance 1.5',
    tipo: 'video',
    src: '/previews/curation-sep16/b5434412-62b9-48f5-9a10-c36e2e725c9f-h.mp4',
    ms: 6000,
    titulo: 'SEEDANCE 1.5',
    texto: 'One idea becomes a narrated film, with script, voice, music and captions.',
    etiqueta: 'Made in Kineo',
  },
  {
    motor: 'Veo 3.1',
    tipo: 'foto',
    src: '/auth/veo-vulcao.webp',
    ms: 5000,
    titulo: 'VEO 3.1',
    texto: 'Cinematic scenes with scale, from a single sentence.',
    etiqueta: 'Made in Kineo',
  },
  {
    motor: 'Kling 3',
    tipo: 'foto',
    src: '/auth/kling3-relojoeiro.webp',
    ms: 5000,
    titulo: 'KLING 3',
    texto: 'Close-ups that hold a character across the story.',
    etiqueta: 'Made in Kineo',
  },
  {
    motor: 'Kling 2.5',
    tipo: 'foto',
    src: '/auth/kling25-trem.webp',
    ms: 5000,
    titulo: 'KLING 2.5',
    texto: 'Tension and emotion in short, dramatic shots.',
    etiqueta: 'Made in Kineo',
  },
]

/** O próximo slide, voltando ao primeiro no fim. */
export function proximoSlide(atual: number, total: number): number {
  return total > 0 ? (atual + 1) % total : 0
}

/** O estado de cada barra: cheia antes do slide atual, enchendo no atual, vazia depois. */
export function estadoDaBarra(indice: number, atual: number): 'cheia' | 'enchendo' | 'vazia' {
  return indice < atual ? 'cheia' : indice === atual ? 'enchendo' : 'vazia'
}
