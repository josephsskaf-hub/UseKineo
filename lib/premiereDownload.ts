// KINEO-ESTREIA-DOWNLOAD-1911 [CEO 19/11: "a estreia pelo mesmo módulo, com o mesmo cuidado"] — o Download da estreia
// (components/premiere/Premiere.tsx) que recebia só um link (`downloadHref`: clipe do Studio, desenho, podcast) era um
// <a href download> direto: cross-origin o atributo download é ignorado, o iPhone abre o player e nada é medido. Agora o VÍDEO
// passa pelo módulo único (lib/videoDownload.ts: folha "Salvar vídeo" no iPhone, blob com nome no computador e no Android,
// eventos video_download_*). Imagem e áudio ficam no link de sempre, sem evento de vídeo.
import type { DownloadSurface } from '@/lib/videoDownload'

/** A tela da estreia → a superfície que o funil de download lê. */
const SUPERFICIE: Readonly<Record<string, DownloadSurface>> = {
  film: 'done_screen',
  clip: 'studio_clip',
  ads: 'ads',
  animate: 'animate',
  avatar: 'avatar',
  cartoon: 'cartoon',
  spaces: 'spaces',
  podcast: 'podcast',
}
export function superficieDaEstreia(surface: string): DownloadSurface {
  return SUPERFICIE[surface] ?? 'studio_clip'
}

/** Nome do arquivo: o título em minúsculas com hífens, sempre .mp4; sem título, kineo-<tela>.mp4. */
export function nomeDoVideoDaEstreia(title: string | null | undefined, surface: string): string {
  const base = String(title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return `${base || `kineo-${surface.replace(/[^a-z0-9]+/gi, '') || 'video'}`}.mp4`
}

/** Só o vídeo com link passa pelo módulo de vídeo; imagem e áudio nunca (nem evento de vídeo, nem folha "Save video"). */
export function estreiaBaixaPeloModulo(kind: string, downloadHref: string | null | undefined): boolean {
  return kind === 'video' && typeof downloadHref === 'string' && downloadHref.trim() !== ''
}
