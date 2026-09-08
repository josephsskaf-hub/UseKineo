import type { WallVideo } from '@/lib/engineWall'
import { heroOpeningPoster } from './heroOpening'

// KINEO-CARDS-ENQUADRADOS-2026-09-08 — todo motor usa o preview largo (500:280)
// recortado do master. Os 12 aprovados de 07/09 tinham preview -h com
// preenchimento lateral desfocado ("aquele nas laterais", fundador 08/09);
// foram recortados de novo em public/previews/curation-sep07/*-h.mp4, com a
// janela escolhida por video (rosto/ombros nos apresentadores). O Omni deixa de
// ser caso especial: mesmo card, mesma fonte, mesmo poster que os outros.
export function heroFrame(video: WallVideo) {
  return {
    natural: false,
    src: video.previewUrl ?? video.videoUrl,
    poster: heroOpeningPoster(video) ?? video.posterUrl,
  }
}
