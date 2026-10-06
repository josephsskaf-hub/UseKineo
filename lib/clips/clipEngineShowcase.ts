// KINEO-FAROL-VITRINE-2026-10-06 — a vitrine do card do motor no /clips. Ordem do fundador (06/10, "pode colocar"): o
// PRIMEIRO clipe Seedance 2.5 da Kineo vira o card do 2.5 no /clips — o card trancado de quem não paga ("NEW · paid plans",
// que leva aos planos) e o card livre de quem paga.
//
// SELO HONESTO: o vídeo é um clipe REAL do motor do próprio card — tabela clips, id fb1eeb41-48ca-4835-a93a-01d422a17aa4,
// fal-ai/seedance-2.5/text-to-video, texto (sem foto), 5 s, 9:16, 480×854, 24 fps, sem áudio, conta da casa, 06/10 12:47 UTC.
// Prompt: farol de pedra num penhasco ao anoitecer, tempestade, raio, chuva, ondas, aproximação lenta. O card diz "Feito com
// Seedance 2.5 · 5 s" (o nome do motor vem do catálogo do próprio card; os segundos, daqui — o guardião confere no MP4).
// CARTÃO SEM PREÇO (regra do mercado de 05/10: só motor + nome; o crédito mora no botão de gerar).
//
// MESMO PADRÃO de prévia/pôster da casa (lib/clips/clipEffects.ts `preview`, ENGINES do /studio): o MP4 copiado do bucket
// para public/previews BYTE A BYTE (já vem com o moov na frente: toca enquanto baixa) e o pôster WebP do quadro do raio
// (n = 21) em public/posters, gerado com ffmpeg (-c:v libwebp -quality 82). Nome = id do render, como os outros motores.
//
// CURADORIA DO FUNDADOR: só o 2.5 tem vitrine aqui. Acrescentar outro motor é decisão dele.
// Módulo PURO (só `import type`, apagado na transpilação): a tela e o guardião scripts/test-clipes-tres-2026-10-06.mjs.
import type { ClipEngineKey } from './clipCatalog'

export interface ClipEngineShowcase {
  /** MP4 em public/previews (servido como está). */
  video: string
  /** Pôster WebP em public/posters (o quadro que aparece antes de o vídeo tocar). */
  poster: string
  /** Duração real do clipe da vitrine (selo honesto). */
  seconds: number
  /** O clipe real de onde saiu (tabela clips) — auditoria do selo. */
  clipId: string
  /** Onde o assunto mora no quadro vertical: o card é deitado, o vídeo é em pé (object-position). */
  focus: string
}

export const CLIP_ENGINE_SHOWCASE: Readonly<Partial<Record<ClipEngineKey, ClipEngineShowcase>>> = {
  s25: {
    video: '/previews/fb1eeb41-48ca-4835-a93a-01d422a17aa4.mp4',
    poster: '/posters/fb1eeb41-48ca-4835-a93a-01d422a17aa4.webp',
    seconds: 5,
    clipId: 'fb1eeb41-48ca-4835-a93a-01d422a17aa4',
    // o farol e o raio ficam entre 25% e 55% da altura do quadro em pé
    focus: '50% 40%',
  },
}

/** A vitrine do card deste motor, ou null (os outros motores seguem como sempre). */
export function clipEngineShowcase(engine: string): ClipEngineShowcase | null {
  return Object.prototype.hasOwnProperty.call(CLIP_ENGINE_SHOWCASE, engine) ? CLIP_ENGINE_SHOWCASE[engine as ClipEngineKey] ?? null : null
}
