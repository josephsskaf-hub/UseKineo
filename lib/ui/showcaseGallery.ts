import type { WallVideo } from '@/lib/engineWall'
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

// Only these versioned, founder-owned clips have a generated portrait poster.
const POSTER_IDS = new Set([
  "49d10f33-3877-42c1-82b8-c0b2cb881fc7",
  "cbd676d0-340a-4728-8a5f-439fd9dd64c5",
  "f3de57b0-3486-4400-ba72-c9390774d426",
  "9bbd5d98-33e5-423f-b9cb-82f7af6c67ba",
  "94d551a3-fe7a-4903-8c2b-f252bed39c4c",
  "b8c50f61-2843-41f3-a803-ac5a4bb509f5",
  "a66e975a-3f6c-4bf4-9510-cd15b895b58b",
  "c21c2456-98dc-4061-bee5-2f02a5180295",
  "0ab3e871-2c99-4f6e-9f3c-59773208b12e",
  "a09706da-a79f-4029-b213-69f43d6a2775",
  "98a5ac54-3c28-4a8f-8ba2-4071bc0388c4",
  "4b12925e-16e6-4b56-af5a-7047f9ae7a28",
  "8aabb05a-2492-48de-a96a-0a7875c0c8d3",
  "cc17475a-0707-4309-aa11-ac4b85918c78",
  "9aacaf46-49d9-46fb-8b7e-ef7d01d77592",
  "7ffd064e-cb37-4a97-a207-70a202bc72b6",
  "dc0fe3a6-f34d-40cb-91f4-da15841a2970",
  "216cbed2-b95f-47e7-98bc-e4c3fc3010a9",
  "1b8e12f9-83e5-411c-8fda-0b277d289934",
  "ca6c04df-6c08-48cb-b1ce-a43b1b171869",
  "38158db0-f02e-4c6c-a4c8-3c65461413a9",
  "36a04f7b-65f7-42d9-a2ab-198b5a7f115e"
])
export function showcasePoster(video: WallVideo): string | undefined {
  return POSTER_IDS.has(video.id) ? `/posters/showcase-sep07/${video.id}.webp` : video.posterUrl
}
export function showcaseEngines(videos: readonly WallVideo[]) {
  const engines = new Map<string, { engine: string; badge: string; count: number }>()
  for (const video of videos) {
    const item = engines.get(video.engine)
    if (item) item.count++
    else engines.set(video.engine, { engine: video.engine, badge: video.badge, count: 1 })
  }
  return [...engines.values()]
}
export function filterShowcase(videos: readonly WallVideo[], engine: string) {
  return engine === 'all' ? [...videos] : videos.filter(video => video.engine === engine)
}
export function showcaseScrollState(left: number, width: number, total: number) {
  return { back: left > 2, next: left + width < total - 2 }
}
export function shouldPlayShowcase(visible: boolean, paused: boolean, limited: boolean, failed: boolean) {
  return visible && !paused && !limited && !failed
}
export const SHOWCASE_COPY = {
  en: { filter: 'Filter by engine', all: 'All engines', gallery: 'Video examples', preview: 'Watch preview', previewLabel: 'Video preview', close: 'Close preview', create: 'Create with', pause: 'Pause previews', resume: 'Play previews', previous: 'Previous examples', next: 'Next examples', unavailable: 'Preview unavailable', fallback: 'You can still open the Studio for this engine.', count: 'examples', reduced: 'Previews paused for your device settings' },
  es: { filter: 'Filtrar por motor', all: 'Todos los motores', gallery: 'Ejemplos de vídeo', preview: 'Ver vista previa', previewLabel: 'Vista previa del vídeo', close: 'Cerrar vista previa', create: 'Crear con', pause: 'Pausar vistas previas', resume: 'Reproducir vistas previas', previous: 'Ejemplos anteriores', next: 'Ejemplos siguientes', unavailable: 'Vista previa no disponible', fallback: 'Aún puedes abrir el Studio para este motor.', count: 'ejemplos', reduced: 'Vistas previas pausadas por la configuración del dispositivo' },
  hi: { filter: 'इंजन के अनुसार फ़िल्टर करें', all: 'सभी इंजन', gallery: 'वीडियो उदाहरण', preview: 'प्रीव्यू देखें', previewLabel: 'वीडियो प्रीव्यू', close: 'प्रीव्यू बंद करें', create: 'इससे बनाएँ:', pause: 'प्रीव्यू रोकें', resume: 'प्रीव्यू चलाएँ', previous: 'पिछले उदाहरण', next: 'अगले उदाहरण', unavailable: 'प्रीव्यू उपलब्ध नहीं है', fallback: 'आप इस इंजन के लिए Studio अभी भी खोल सकते हैं।', count: 'उदाहरण', reduced: 'डिवाइस की सेटिंग के कारण प्रीव्यू रुके हुए हैं' },
} satisfies Record<InterfaceLanguage, Record<string, string>>

