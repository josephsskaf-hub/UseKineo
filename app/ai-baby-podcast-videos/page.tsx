// KINEO-BEBE-QUE-FALA-2010 — /ai-baby-podcast-videos: a página do AI Baby Podcast (en; par em /videos-bebe-podcast-ia).
// Atrás de BABY_PODCAST_PAGES_LIVE: desligado = 404 (notFound) + noindex, e fora do sitemap/llms.txt.
import { notFound } from 'next/navigation'
import { BabyPodcastPage, babyPageMetadata } from '@/components/kidsCartoon/BabyPodcastPages'
import { BABY_PODCAST_PAGES_LIVE } from '@/lib/kidsCartoon/babyPodcast'

export const dynamic = 'force-static'
export const metadata = babyPageMetadata('en')

export default function Page() {
  if (!BABY_PODCAST_PAGES_LIVE) notFound()
  return <BabyPodcastPage lang="en" />
}
