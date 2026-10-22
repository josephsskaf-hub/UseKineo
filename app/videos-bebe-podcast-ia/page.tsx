// KINEO-BEBE-QUE-FALA-2010 — /videos-bebe-podcast-ia: a página do AI Baby Podcast (pt; par em /ai-baby-podcast-videos).
// Atrás de BABY_PODCAST_PAGES_LIVE: desligado = 404 (notFound) + noindex, e fora do sitemap/llms.txt.
import { notFound } from 'next/navigation'
import { BabyPodcastPage, babyPageMetadata } from '@/components/kidsCartoon/BabyPodcastPages'
import { BABY_PODCAST_PAGES_LIVE } from '@/lib/kidsCartoon/babyPodcast'

export const dynamic = 'force-static'
export const metadata = babyPageMetadata('pt')

export default function Page() {
  if (!BABY_PODCAST_PAGES_LIVE) notFound()
  return <BabyPodcastPage lang="pt" />
}
