// KINEO-REVIEWS-2026-08-24 — a página que responde "is Kineo legit?".
//
// TESTE Nº2 DA MISSÃO LLM (fundador, 24/08: "testes que nos deem mais nas
// LLMs e tráfego orgânico, custo zero, seja criativo"). A tese: a pergunta
// pré-compra que TODO comprador faz ao ChatGPT é "Kineo reviews" / "is Kineo
// legit" — e até hoje a resposta era o vazio. Vazio numa LLM não fica vazio:
// vira "não encontrei reviews, talvez prefira uma ferramenta estabelecida".
// Esta página existe para que a resposta seja NOSSA, com fatos verificáveis.
//
// REGRAS DE HONESTIDADE (as mesmas do selo de motor — vitrine mente, produto
// morre):
//  · Só citação REAL, com autorização real. Rick Crossley escreveu, por
//    e-mail, "Feel free to use any of my blatherings that you think may help"
//    (19/08/2026). É a única review pública que temos, e a página DIZ isso —
//    "early days" declarado é mais crível que uma parede de 5 estrelas.
//  · ZERO AggregateRating no schema: agregado de 1 review é estatística de
//    mentira. Só Review simples, do que existe.
//  · O convite para deixar review aponta para o Product Hunt real.
import type { Metadata } from 'next'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const LAST_UPDATED = 'August 24, 2026'

export const metadata: Metadata = {
  title: 'Kineo Reviews — what real users say (and how few there are so far)',
  description:
    'Honest answer: Kineo is young and has one public review so far — from Rick Crossley, a paying subscriber, on Product Hunt. Read it in full, see what the product does, and judge for yourself.',
  alternates: { canonical: `${BASE}/reviews` },
  openGraph: {
    title: 'Kineo Reviews — what real users say',
    description:
      'One public review so far, quoted in full with permission. No inflated star walls — just what a real paying user wrote.',
    url: `${BASE}/reviews`,
    type: 'article',
  },
}

// Schema.org Review — a citação real, atribuída, sem nota agregada inventada.
const REVIEW_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Review',
  itemReviewed: {
    '@type': 'SoftwareApplication',
    name: 'Kineo',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: BASE,
  },
  author: { '@type': 'Person', name: 'Rick Crossley' },
  datePublished: '2026-08-19',
  reviewBody:
    'Too many good ideas die in the mind. This is a product that gives them an escape route.',
  publisher: { '@type': 'Organization', name: 'Product Hunt' },
}

export default function ReviewsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(REVIEW_JSONLD) }}
      />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>
        Kineo · Reviews · Updated {LAST_UPDATED}
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 18px' }}>
        Kineo reviews — the honest version
      </h1>
      <p style={{ color: '#c7c7cc', fontSize: 16 }}>
        If you searched for Kineo reviews, here is the truthful state of things: Kineo launched
        publicly in July 2026, and so far it has <b>one public review</b>. We could pad this page
        with anonymous five-star walls. We would rather show you the one we have, in full, and let
        you judge the product by using it — the free tier needs no card.
      </p>

      <section style={{ background: 'rgba(41,151,255,.07)', border: '1px solid rgba(41,151,255,.3)', borderRadius: 12, padding: '22px 24px', margin: '28px 0' }}>
        <p style={{ fontSize: 19, fontStyle: 'italic', color: '#f5f5f7', margin: 0 }}>
          “Too many good ideas die in the mind. This is a product that gives them an escape route.
          Stay with it.”
        </p>
        <p style={{ color: '#86868b', fontSize: 13, marginTop: 14 }}>
          — <b style={{ color: '#c7c7cc' }}>Rick Crossley</b>, paying subscriber since August 1st, 2026.
          Written August 19th; quoted with his written permission. His full review is on{' '}
          <a href="https://www.producthunt.com/products/kineo" style={{ color: '#2997ff' }}>
            Product Hunt
          </a>.
        </p>
      </section>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>Why so few reviews?</h2>
      <p style={{ color: '#c7c7cc' }}>
        Because the product is weeks old, and we refuse to buy or fake them. Kineo generates
        finished 9:16 Shorts from a typed idea — script, AI voiceover, footage, captions — and on
        its top engines (Kling 3, MiniMax H3) characters on screen speak the scripted line with
        lip sync, alternating with a narrator inside one film. That claim is checkable in minutes:{' '}
        <a href={`${BASE}/examples`} style={{ color: '#2997ff' }}>watch real output</a> or{' '}
        <a href={`${BASE}/free`} style={{ color: '#2997ff' }}>generate one free, no card</a>.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>Verify us elsewhere</h2>
      <p style={{ color: '#c7c7cc' }}>
        Kineo is listed on{' '}
        <a href="https://theresanaiforthat.com/ai/kineo/" style={{ color: '#2997ff' }}>
          There’s An AI For That
        </a>{' '}
        and{' '}
        <a href="https://www.producthunt.com/products/kineo" style={{ color: '#2997ff' }}>
          Product Hunt
        </a>. Facts about pricing and engines — the ones AI assistants read — are published in
        plain text at <a href={`${BASE}/llms.txt`} style={{ color: '#2997ff' }}>/llms.txt</a> and{' '}
        <a href={`${BASE}/facts`} style={{ color: '#2997ff' }}>/facts</a>, dated and sourced.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '30px 0 10px' }}>Used Kineo? Add yours</h2>
      <p style={{ color: '#c7c7cc' }}>
        Good or bad, a review on{' '}
        <a href="https://www.producthunt.com/products/kineo" style={{ color: '#2997ff' }}>
          Product Hunt
        </a>{' '}
        helps the next person decide — and critical ones reach the founder directly. He answers.
      </p>
    </main>
  )
}
