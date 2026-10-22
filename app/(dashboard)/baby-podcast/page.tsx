// KINEO-BEBE-QUE-FALA-2010 — /baby-podcast: a tela do "AI Baby Podcast" (o 2º modo). Portas: sem login → /login?redirect=/baby-podcast;
// modo desligado (BABY_PODCAST_LIVE=false) e conta de fora → 404. Nunca indexada (a página pública é /ai-baby-podcast-videos).
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { BABY_PODCAST_LIVE, BABY_PODCAST_TEMPLATE_PATH, babyPodcastOn } from '@/lib/kidsCartoon/babyPodcast'
import BabyPodcastTemplate from '@/components/kidsCartoon/BabyPodcastTemplate'

export const metadata = { title: 'AI Baby Podcast — Kineo', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function BabyPodcastPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(BABY_PODCAST_TEMPLATE_PATH)}`)
  if (!babyPodcastOn(BABY_PODCAST_LIVE, isInternalEmail(user.email))) notFound()
  return <BabyPodcastTemplate />
}
