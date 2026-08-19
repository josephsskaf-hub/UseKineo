// /ai-avatar — public sales landing for the AI Avatar add-on (revenue page).
// Server component so we get SEO metadata + OG tags; renders the client landing.
import type { Metadata } from 'next'
import AvatarLandingClient from '@/components/AvatarLandingClient'
import Footer from '@/components/Footer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_PRICE } from '@/lib/marketingPrice'

export const metadata: Metadata = {
  title: 'AI Avatar Video — your face, speaking any script | Kineo',
  description:
    'Upload one photo and get a 720p lip-synced video of that person speaking your script — with footage, captions and music. No camera, no editing. From ' + STARTER_PRICE + '.',
  alternates: { canonical: 'https://www.usekineo.com/ai-avatar' },
  openGraph: {
    title: 'AI Avatar Video — your face, speaking any script',
    description:
      'Upload one photo → a 720p talking video, lip-synced, in about a minute. No camera, no editing. From ' + STARTER_PRICE + '.',
    url: 'https://www.usekineo.com/ai-avatar',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Avatar Video — your face, speaking any script',
    description: 'Upload one photo → a 720p talking video in about a minute. From ' + STARTER_PRICE + '.',
  },
}

export default function AiAvatarPage() {
  return (
    <>
      <AvatarLandingClient />
      <Footer />
    </>
  )
}
