import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { effectLanguage, effectMetadata, effectPage, effectPagePath } from '@/lib/clips/clipEffectPages'
import EffectPage from '../../EffectPage'

export const dynamic = 'force-dynamic'
export function generateMetadata({ params }: { params: { slug: string; lang: string } }): Metadata {
  const effect = effectPage(params.slug)
  const language = effectLanguage(params.lang)
  if (!effect || !language) notFound()
  return effectMetadata(effect, language)
}
export default function Page({ params }: { params: { slug: string; lang: string } }) {
  if (params.lang === 'en') permanentRedirect(effectPagePath(params.slug))
  return <EffectPage slug={params.slug} lang={params.lang} />
}

