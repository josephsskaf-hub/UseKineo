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
// CURADORIA DO FUNDADOR: em 06/10 só o 2.5; em 30/10 o fundador pediu "alguma coisa legal dentro dos cards pequenininhos" dos motores —
// KINEO-MOTOR-CARD-VIDEO-3110: cada card ganha um vídeo REAL feito naquele motor (clipe da casa; Veo 3.1 e MiniMax H3 = trecho do filme
// da casa feito no motor, que é o que existe deles). Nenhum render novo.
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
  // KINEO-MOTOR-CARD-VIDEO-3110 — Seedance 1.5: o surfista da galeria (clipe de texto da conta da casa, lib/homeGaleria.ts GALERIA_TEXT_CLIPS).
  seedance: { video: '/previews/promo-clips-surf.mp4', poster: '/posters/promo-clips-surf.webp', seconds: 5, clipId: 'galeria-text-surf', focus: '50% 50%' },
  // KINEO-MOTOR-CARD-VIDEO-3110 — Kling 2.5: a tempestade atrás da pessoa (clipe 8d9a0bde, o mesmo da prévia do efeito Storm).
  kling: { video: '/previews/efeito-storm_behind.mp4', poster: '/posters/efeito-storm_behind.webp', seconds: 5, clipId: '8d9a0bde-012a-4fe7-b1d9-488964b6c587', focus: '50% 45%' },
  // KINEO-MOTOR-CARD-VIDEO-3110 — Kling 3: o leão que anda até a câmera (clipe f9c85460, galeria Made with Kineo).
  hollywood: { video: '/previews/galeria/lion.mp4', poster: '/posters/galeria/lion.webp', seconds: 5, clipId: 'f9c85460-3cff-4512-a115-4c1852cb8a4a', focus: '50% 45%' },
  // KINEO-MOTOR-CARD-VIDEO-3110 — Veo 3.1: trecho do filme da casa "Titanic" (videos d16781b8, Veo 3.1).
  veo: { video: '/previews/door-d16781b8-0557-4c7e-b339-3bf048ff700c.mp4', poster: '/posters/door-d16781b8-0557-4c7e-b339-3bf048ff700c.webp', seconds: 7, clipId: 'd16781b8-0557-4c7e-b339-3bf048ff700c', focus: '50% 40%' },
  // KINEO-MOTOR-CARD-VIDEO-3110 — MiniMax H3: trecho do filme da casa "Shazam over the city" (videos 8aabb05a, MiniMax H3).
  h3: { video: '/previews/8aabb05a-2492-48de-a96a-0a7875c0c8d3.mp4', poster: '/posters/8aabb05a-2492-48de-a96a-0a7875c0c8d3.jpg', seconds: 8, clipId: '8aabb05a-2492-48de-a96a-0a7875c0c8d3', focus: '50% 40%' },
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
