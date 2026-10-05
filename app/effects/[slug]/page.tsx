import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { effectMetadata, effectPage } from '@/lib/clips/clipEffectPages'
import EffectPage from '../EffectPage'

export const dynamic = 'force-dynamic'
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const effect = effectPage(params.slug)
  if (!effect) notFound()
  return effectMetadata(effect, 'en')
}
export default function Page({ params }: { params: { slug: string } }) { return <EffectPage slug={params.slug} /> }

