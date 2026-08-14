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
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from '@/app/examples/ExampleLiveMedia'

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
      {/* AQUISICAO T3 (14/08) — prova viva na melhor porta da casa (67% de
          clique para o produto): quem acabou de gerar um roteiro ve TRES
          exports reais tocando — a distancia entre o texto que recebeu e o
          video pronto fica visivel antes do signup. Aditivo: nada do tool
          acima mudou. */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 20px 56px', background: '#000' }}>
        <p style={{ margin: '0 0 4px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
          Real Kineo output
        </p>
        <p style={{ margin: '0 0 16px', color: '#a1a1a8', fontSize: 14, textAlign: 'center' }}>
          Scripts like yours became these finished Shorts.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PUBLIC_EXAMPLES.slice(0, 3).map((ex) => (
            <a key={ex.slug} href={`/examples/${ex.slug}`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid #2a2a2d', display: 'block' }}>
              <ExampleLiveMedia videoPath={ex.videoPath} posterPath={posterWebpPath(ex.posterPath)} />
              <span style={{ position: 'absolute', left: 10, bottom: 10, right: 10, zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.7)' }}>{ex.shortTitle}</span>
            </a>
          ))}
        </div>
      </section>
      <Footer />
    </>
  )
}
