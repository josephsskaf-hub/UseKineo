import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE } from '@/lib/publicExamples'

// Public, founder-owned cuts only. Deliberately separate from home/engineWall curation.
export const SHOWCASE_FILM_IDS = [
  '90bd8367-60c6-4811-8fdd-3a5b0200eec6',
  '4b12925e-16e6-4b56-af5a-7047f9ae7a28',
  'f3de57b0-3486-4400-ba72-c9390774d426',
  '16742e11-a2fc-4e0a-a49a-2862e0ee36b0',
  'ad6cb185-a0a2-46cf-a148-ea7503dfe6d3',
  '692a6e98-6ed5-4c8d-8fa5-89ab21fbbcff',
] as const

const ENGINE_NAMES = {
  fast: 'Kineo 1', cinematic_ai: 'Seedance 1.5', cinematic_kling: 'Kling 2.5',
  cinematic_veo: 'Veo 3.1', cinematic_hollywood: 'Kling 3', cinematic_h3: 'MiniMax H3',
  cinematic_omni: 'Omni Flash', presenter: 'Avatar',
} as const

export type ShowcaseItem = { id: string; badge: string; poster: string; video?: string; before?: string; after?: string }
export type ShowcaseSection = 'films' | 'images' | 'spaces' | 'ads'

export const SHOWCASE_FILMS: ShowcaseItem[] = SHOWCASE_FILM_IDS.map(id => {
  const example = [...ENGINE_PAGE_LEAD, ...FOUNDER_SHOWCASE].find(item => item.id === id)
  if (!example || example.ownershipEvidence !== 'founder_confirmed_owned' || !example.previewPath.startsWith('/previews/')) {
    throw new Error(`Showcase requires an approved local preview: ${id}`)
  }
  return { id, badge: ENGINE_NAMES[example.engine], poster: example.posterPath, video: example.previewPath }
})

export const SHOWCASE_MEDIA: Record<ShowcaseSection, ShowcaseItem[]> = {
  films: SHOWCASE_FILMS,
  images: [1, 2, 3].map(n => ({ id: `image-${n}`, badge: 'Nano Banana Pro', video: `/previews/promo-images-${n}.mp4`, poster: `/posters/promo-images-${n}.webp` })),
  spaces: [1, 2, 3].map(n => ({ id: `space-${n}`, badge: 'Nano Banana Pro', before: `/posters/spaces-demo-${n}-antes.webp`, after: `/posters/spaces-demo-${n}-depois.webp`, poster: `/posters/spaces-demo-${n}-depois.webp` })),
  ads: [1, 2, 3].map(n => ({ id: `ad-${n}`, badge: 'Nano Banana Pro + Kling 2.5', video: `/previews/promo-ads-3var-${n}.mp4`, poster: `/posters/promo-ads-3var-${n}.webp` })),
}

export const SHOWCASE_DESTINATIONS: Record<ShowcaseSection, string> = { films: '/studio', images: '/images', spaces: '/spaces', ads: '/ads' }
