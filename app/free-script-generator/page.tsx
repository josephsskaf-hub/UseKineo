// #484 — Free lead-magnet tool page. Targets high-intent searches like
// "free youtube short script generator", "ai faceless script generator no signup".
// Reuses the existing public, rate-limited /api/demo-script endpoint (no new
// backend, no auth) and funnels the result into signup. This is the #1
// replacement for the suspended Google Ads: a free tool that ranks in search,
// gives instant value, and converts the problem-aware visitor. Server component
// exports the SEO metadata; the interactive tool is the client child.
import type { Metadata } from 'next'
import FreeScriptClient from './FreeScriptClient'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Free YouTube Short Script Generator (AI, No Signup) — Kineo',
  description:
    'Generate a viral, hook-driven YouTube Short script free with AI — no signup. Type a topic, get a 45-60s faceless script (hook, facts, payoff) instantly. Then turn it into a finished video, usually in 3–7 minutes.',
  alternates: { canonical: 'https://www.usekineo.com/free-script-generator' },
  openGraph: {
    title: 'Free AI YouTube Short Script Generator — No Signup',
    description:
      'Type a topic, get a viral faceless Short script (hook → facts → payoff) free, instantly. Then make it a finished video, usually in 3–7 minutes.',
    url: 'https://www.usekineo.com/free-script-generator',
    type: 'website',
  },
}

// AEO (02/08, ordem C do fundador): LLMs (ChatGPT via Bing) citam ferramentas
// grátis quando conseguem LER que são ferramentas grátis. SoftwareApplication
// com price 0 é o formato que Bing/Copilot entendem. Nada inventado: sem
// aggregateRating (temos 2 reviews — número real vive no TAAFT, não aqui).
const TOOL_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Free YouTube Shorts Script Generator',
  alternateName: 'Kineo Free Script Generator',
  url: 'https://www.usekineo.com/free-script-generator',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  description:
    'Free AI YouTube Shorts script generator — no signup. Type a topic, get a 45-60s faceless script (hook, 3 facts, payoff) instantly.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  creator: { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' },
}

export default function FreeScriptGeneratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOL_JSON_LD) }}
      />
      <FreeScriptClient />
      <Footer />
    </>
  )
}
