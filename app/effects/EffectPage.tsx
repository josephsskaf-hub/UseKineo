import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { effectLanguage, effectPage, effectPageCard, publicEffectPages } from '@/lib/clips/clipEffectPages'
import EffectPageClient from './EffectPageClient'

export default async function EffectPage({ slug, lang = 'en' }: { slug: string; lang?: string }) {
  const effect = effectPage(slug)
  const language = effectLanguage(lang)
  if (!effect || !language) notFound()
  const { data: { user } } = await createClient().auth.getUser()
  return <EffectPageClient effect={effectPageCard(effect)} language={language} signedIn={!!user} measurementActor={user?.id ?? null} related={publicEffectPages().filter(item => item.key !== effect.key).map(effectPageCard)} />
}
