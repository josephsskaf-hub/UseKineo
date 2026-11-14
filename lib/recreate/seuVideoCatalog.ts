// KINEO-RECREATE-SEU-VIDEO-CATALOGO-1311 — public videos offered only as references for the new flow.
// These entries do not grant access, assert legacy swap approval, or promise the same generated result.
// Source: lib/clipesNos2Lugares.ts CLIPES_NOVOS (and the archived duelo-de-danca),
// plus the publicly launched Friday Groove in lib/clips/faceRemix.ts. Originals remain unchanged.
// This flow uses dedicated 720x1280 derivatives in /previews/galeria/seu-video-720p/;
// preserve the original frame rate, frame count and duration (verified with local ffprobe by the catalog guard).
// Do not copy legacy recipe durations here: the selected public MP4 is measured by the client and checked by the server.
export type SeuVideoCatalogItem = {
  id: string
  title: string
  src: string
  poster?: string
  seconds?: number
}

export const SEU_VIDEO_CATALOG: readonly SeuVideoCatalogItem[] = Object.freeze([
  { id: 'selfie-confete', title: 'Selfie with the crowd', src: '/previews/galeria/seu-video-720p/selfie-confete.mp4', poster: '/posters/galeria/selfie-confete.webp' },
  { id: 'sueter-aconchegante', title: 'Cozy sweater flip', src: '/previews/galeria/seu-video-720p/sueter-aconchegante.mp4', poster: '/posters/galeria/sueter-aconchegante.webp' },
  { id: 'passarela', title: 'Fashion catwalk', src: '/previews/galeria/seu-video-720p/passarela.mp4', poster: '/posters/galeria/passarela.webp' },
  { id: 'escolha-o-favorito', title: 'Pick your favorite', src: '/previews/galeria/seu-video-720p/escolha-o-favorito.mp4', poster: '/posters/galeria/escolha-o-favorito.webp' },
  { id: 'duelo-de-danca', title: 'Parking lot dance-off', src: '/previews/galeria/seu-video-720p/duelo-de-danca.mp4', poster: '/posters/galeria/duelo-de-danca.webp' },
  { id: 'outfit-morph', title: 'Outfit morph', src: '/previews/galeria/seu-video-720p/outfit-morph.mp4', poster: '/posters/galeria/outfit-morph.webp' },
  { id: 'danca-corredor', title: 'Dance in the hallway', src: '/previews/galeria/seu-video-720p/danca-corredor.mp4', poster: '/posters/galeria/danca-corredor.webp' },
  { id: 'friday-groove', title: 'Friday Groove', src: '/previews/galeria/seu-video-720p/friday-groove.mp4', poster: '/posters/galeria/friday-groove.webp' },
].map(item => Object.freeze(item)))

/** Exact allowlist lookup: never accepts a URL, an object, or an uncurated identifier. */
export function seuVideoCatalogItem(id: unknown): SeuVideoCatalogItem | null {
  if (typeof id !== 'string') return null
  return SEU_VIDEO_CATALOG.find(item => item.id === id) ?? null
}
