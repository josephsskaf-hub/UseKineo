// KINEO-SEO-2026-07-25 — /youtube-shorts-rpm-by-niche: the RPM-by-niche HUB.
// Targets "youtube shorts rpm by niche" / "highest rpm niches shorts". This is
// the internal-linking hub that points at every one of Kineo's real niche
// pages at /free-ai-shorts/<slug>. RPM numbers here are ESTIMATED typical
// ranges built from public creator knowledge (advertiser demand per niche),
// NOT guarantees and NOT Kineo platform data — labeled as such on the page.
// Server component, dark theme matching state-of-ai-shorts-2026. O "zero client
// JS" deste cabeçalho deixou de ser verdade em 14/08 (CalculatorClient) e em
// 15/08 (TopicGeneratorForm): são DUAS ilhas de cliente; o resto segue server e
// `force-static`. Cabeçalho que mente é a próxima decisão errada de alguém.

import type { Metadata } from 'next'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-FERRAMENTA-NA-PAGINA-2026-08-14 — ver o bloco no corpo. Client island;
// o resto da página segue server e `force-static` continua valendo.
import CalculatorClient from '@/app/shorts-money-calculator/CalculatorClient'
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — o MESMO componente da home/#70, nunca
// uma cópia. Ver o bloco no corpo. Client island; `force-static` segue valendo.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'YouTube Shorts RPM by Niche (2026) — Highest-Paying Niches Ranked',
  description:
    'Which YouTube Shorts niches pay the most in 2026? An honest, estimated RPM-by-niche ranking — finance and business at the top, entertainment and gaming at the bottom — with why advertiser demand drives it. Ranges are typical estimates, not guarantees.',
  alternates: { canonical: 'https://www.usekineo.com/youtube-shorts-rpm-by-niche' },
  openGraph: {
    title: 'YouTube Shorts RPM by Niche (2026) — Highest-Paying Niches Ranked',
    description:
      'An honest, estimated ranking of YouTube Shorts RPM by niche for 2026, and why advertiser demand — not luck — is the #1 lever on what you earn.',
    url: 'https://www.usekineo.com/youtube-shorts-rpm-by-niche',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Shorts RPM by Niche (2026)',
    description:
      'Highest-paying YouTube Shorts niches ranked by estimated RPM, and why niche is the #1 lever on earnings.',
  },
}

// tier: qualitative RPM band. rpm: ESTIMATED typical Shorts RPM range per 1,000
// monetized Shorts views. slug: the REAL Kineo niche page at /free-ai-shorts/<slug>.
const NICHES: {
  label: string
  slug: string
  tier: 'Top' | 'High' | 'Upper-mid' | 'Mid' | 'Lower'
  rpm: string
  why: string
}[] = [
  { label: 'Finance & make money', slug: 'money', tier: 'Top', rpm: '$0.15–$0.40+', why: 'Brokers, fintech apps and credit cards bid hardest for these viewers.' },
  { label: 'Business & entrepreneurship', slug: 'business', tier: 'Top', rpm: '$0.12–$0.30', why: 'B2B software and courses chase high-intent, high-income audiences.' },
  { label: 'Crypto & investing', slug: 'crypto', tier: 'High', rpm: '$0.10–$0.25', why: 'Exchanges and trading apps pay a premium when they can advertise.' },
  { label: 'Luxury & wealth', slug: 'luxury', tier: 'High', rpm: '$0.08–$0.20', why: 'Aspirational buyers attract high-ticket brand advertisers.' },
  { label: 'Health & wellness', slug: 'health', tier: 'High', rpm: '$0.08–$0.18', why: 'Supplements, telehealth and insurance keep demand steady.' },
  { label: 'Fitness', slug: 'fitness', tier: 'Upper-mid', rpm: '$0.06–$0.15', why: 'Apps, gear and coaching advertise, but competition is heavy.' },
  { label: 'Cars & automotive', slug: 'cars', tier: 'Upper-mid', rpm: '$0.05–$0.12', why: 'Dealers, insurance and parts brands lift automotive RPM.' },
  { label: 'Psychology & self-improvement', slug: 'psychology', tier: 'Upper-mid', rpm: '$0.05–$0.12', why: 'Courses and coaching advertise to an engaged, curious audience.' },
  { label: 'Relationships & dating', slug: 'relationships', tier: 'Upper-mid', rpm: '$0.05–$0.11', why: 'Dating apps and coaching keep demand reasonable.' },
  { label: 'Science & education', slug: 'science', tier: 'Mid', rpm: '$0.04–$0.10', why: 'Broad, safe and family-friendly, but lower purchase intent.' },
  { label: 'Travel', slug: 'travel', tier: 'Mid', rpm: '$0.04–$0.10', why: 'Booking sites and airlines advertise seasonally.' },
  { label: 'Facts & curiosities', slug: 'facts', tier: 'Mid', rpm: '$0.04–$0.09', why: 'Huge reach and cheap to make, but generic advertiser demand.' },
  { label: 'Food & recipes', slug: 'food', tier: 'Mid', rpm: '$0.03–$0.08', why: 'Grocery and delivery brands buy, but CPMs stay moderate.' },
  { label: 'Space', slug: 'space', tier: 'Mid', rpm: '$0.03–$0.08', why: 'Evergreen and clean, with mostly general advertisers.' },
  { label: 'Motivation', slug: 'motivation', tier: 'Mid', rpm: '$0.03–$0.08', why: 'Saturated; brand demand is broad rather than premium.' },
  { label: 'Geography & countries', slug: 'geography', tier: 'Mid', rpm: '$0.03–$0.07', why: 'Wide, watchable reach but low direct purchase intent.' },
  { label: 'History & empires', slug: 'history', tier: 'Mid', rpm: '$0.03–$0.07', why: 'Evergreen storytelling; general advertiser pool.' },
  { label: 'Stoicism & philosophy', slug: 'stoicism', tier: 'Mid', rpm: '$0.03–$0.07', why: 'Overlaps self-improvement but with thinner ad demand.' },
  { label: 'True crime', slug: 'truecrime', tier: 'Mid', rpm: '$0.03–$0.07', why: 'Strong retention, though some advertisers avoid the topic.' },
  { label: 'Mystery', slug: 'mystery', tier: 'Mid', rpm: '$0.03–$0.06', why: 'Great watch time, but broad and cautious advertiser mix.' },
  { label: 'Conspiracy', slug: 'conspiracy', tier: 'Lower', rpm: '$0.02–$0.06', why: 'Some advertisers exclude the category, softening RPM.' },
  { label: 'Sports', slug: 'sports', tier: 'Lower', rpm: '$0.02–$0.06', why: 'Big reach, but rights-heavy and price-competitive ads.' },
  { label: 'Celebrity & pop culture', slug: 'celebrity', tier: 'Lower', rpm: '$0.02–$0.06', why: 'High volume, low intent — RPM stays down.' },
  { label: 'Horror', slug: 'horror', tier: 'Lower', rpm: '$0.02–$0.05', why: 'Brand-safety caution keeps advertiser demand thin.' },
  { label: 'Movies & TV', slug: 'movies', tier: 'Lower', rpm: '$0.02–$0.05', why: 'Entertainment audiences convert poorly for advertisers.' },
  { label: 'Animals & nature', slug: 'animals', tier: 'Lower', rpm: '$0.02–$0.05', why: 'Massive, universal reach but very low purchase intent.' },
  { label: 'Gaming', slug: 'gaming', tier: 'Lower', rpm: '$0.02–$0.05', why: 'Young audience and price-sensitive advertisers cap RPM.' },
]

const QA: { q: string; a: string }[] = [
  {
    q: 'Which YouTube Shorts niche has the highest RPM?',
    a: 'Finance and make-money content typically has the highest Shorts RPM — often an estimated $0.15–$0.40+ per 1,000 monetized views — because brokers, fintech apps, credit cards and trading platforms bid aggressively for those viewers. Business, crypto and luxury follow closely. These are estimated typical ranges, not guarantees: your actual RPM depends on audience country, season and the specific advertisers YouTube matches to your videos.',
  },
  {
    q: 'Do faceless niches pay well on YouTube Shorts?',
    a: 'It depends entirely on the topic, not on whether a face is shown. A faceless finance, business or crypto channel can earn a high RPM, while a faceless animals, gaming or entertainment channel earns a low one — even with far more views. Faceless just describes the production style; advertiser demand for the niche is what sets the RPM.',
  },
  {
    q: 'Why is finance RPM higher than entertainment RPM?',
    a: 'RPM is driven by how much advertisers will pay to reach your audience. A finance viewer might be about to open a brokerage account or apply for a credit card, so financial advertisers bid a high CPM to reach them. An entertainment or gaming viewer is worth far less to most advertisers, so the winning bids — and your RPM — are much lower, even at identical view counts.',
  },
  {
    q: 'Can I just make videos in the highest-RPM niche to earn more?',
    a: 'Higher-RPM niches are also more competitive and harder to grow in, so total earnings are RPM multiplied by views. A lower-RPM niche with huge, reliable reach can out-earn a high-RPM niche you cannot grow. The best approach is picking a niche you can consistently publish in, then using RPM as a tie-breaker between options you could realistically sustain.',
  },
  {
    q: 'Are these Shorts RPM numbers guaranteed?',
    a: 'No. Every range on this page is an estimated typical band drawn from public creator knowledge about advertiser demand, not a promise and not Kineo platform data. Real Shorts RPM varies widely by audience geography, time of year, video length, brand-safety settings and the exact advertisers YouTube serves. Treat these as directional guidance for choosing a niche, not a forecast of your earnings.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const TIER_COLOR: Record<string, string> = {
  Top: '#30d158',
  High: '#64d2ff',
  'Upper-mid': '#2997ff',
  Mid: '#bf5af2',
  Lower: '#86868b',
}

export default function ShortsRpmByNichePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: QA.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.usekineo.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'YouTube Shorts RPM by Niche',
        item: 'https://www.usekineo.com/youtube-shorts-rpm-by-niche',
      },
    ],
  }

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Shorts monetization guide — 2026
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          YouTube Shorts RPM by Niche (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          Not all Shorts views are worth the same money. The single biggest lever
          on what you earn is your niche — because your niche decides which
          advertisers are willing to bid to reach your audience. Below is an
          honest, ranked estimate of YouTube Shorts RPM by niche for 2026, with a
          link to a ready-to-use content niche for every row.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          Every dollar range on this page is an <strong style={{ color: '#d2d2d7' }}>estimated
          typical band</strong>, not a guarantee and not Kineo platform data. Real
          RPM swings widely by country, season and audience. Treat these as
          directional guidance for choosing a niche.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          RPM vs CPM: what actually hits your bank account
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          These two numbers get mixed up constantly, and the difference matters
          when you compare niches. <strong>CPM</strong> (cost per mille) is what an
          advertiser pays YouTube for 1,000 ad impressions. <strong>RPM</strong>{' '}
          (revenue per mille) is what actually lands in{' '}
          <em>your</em> pocket per 1,000 <em>video views</em>, after YouTube takes
          its share and after accounting for the many views that never showed a
          monetizable ad at all. RPM is always the more honest number for a
          creator, because it already bakes in the gap between &ldquo;an ad was
          sold&rdquo; and &ldquo;you got paid.&rdquo;
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          Shorts monetization works differently from long-form. Instead of ads
          running on your individual video, ad revenue from the entire Shorts feed
          is pooled, used first to pay music licensing, and the remainder is shared
          out to creators based on views — and only then does your revenue share
          and the 45% creator split apply. The practical result is that Shorts RPM
          is much lower than long-form RPM across the board. But the{' '}
          <strong>relative</strong> ranking between niches still holds: a finance
          audience is worth far more to advertisers than a gaming audience, and
          that flows through the pool to you.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Why niche is the #1 RPM lever
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          You can improve retention, hook harder and post more often, and all of
          that grows your <em>views</em>. But your <em>RPM</em> is set almost
          entirely by advertiser demand for your audience, and advertiser demand
          is a function of what your viewers are about to buy. A viewer watching a
          finance Short may be minutes away from opening a brokerage account,
          applying for a credit card or downloading a trading app. Financial
          advertisers know this, so they bid high CPMs to appear next to that
          content. A viewer watching an animal compilation is delightful to have,
          but worth very little to most advertisers — so the winning bids, and your
          RPM, stay low even if the animal channel pulls ten times the views.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          This is also why the &ldquo;faceless&rdquo; label tells you nothing about
          pay. Faceless is a production style, not an economic category. A faceless
          finance or business channel sits at the top of the RPM table; a faceless
          gaming or entertainment channel sits at the bottom. The camera setup is
          irrelevant — the advertiser demand for the topic is everything.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 28px' }}>
          One honest caveat before the ranking: total earnings are RPM multiplied
          by views, and the highest-RPM niches are usually the most competitive and
          the hardest to grow in. A lower-RPM niche you can post in every single day
          — and actually grow — can out-earn a high-RPM niche where you stall at a
          few hundred views. Use RPM as a tie-breaker between niches you could
          realistically sustain, not as the only input.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          YouTube Shorts RPM by niche — ranked (estimated)
        </h2>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Estimated typical RPM per 1,000 monetized Shorts views, highest to
          lowest. Ranges are directional estimates from public creator knowledge,
          not guarantees. Each niche links to a ready-made Kineo content niche you
          can start generating today.
        </p>
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gap: 8 }}>
          {NICHES.map((n, i) => (
            <li
              key={n.slug}
              style={{ ...CARD, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ color: ACCENT, fontWeight: 800, minWidth: 28 }}>{i + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={`/free-ai-shorts/${n.slug}`}
                  style={{ color: '#f5f5f7', fontWeight: 700, fontSize: '0.98rem', textDecoration: 'none' }}
                >
                  {n.label} →
                </a>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: '3px 0 0', lineHeight: 1.5 }}>{n.why}</p>
              </div>
              <div style={{ textAlign: 'right', minWidth: 118 }}>
                <span style={{ color: '#d2d2d7', fontSize: '0.92rem', fontWeight: 700, display: 'block' }}>
                  {n.rpm}
                </span>
                <span
                  style={{
                    color: TIER_COLOR[n.tier],
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {n.tier}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 48px' }}>
          RPM ranges are estimated typical bands for planning purposes only — your
          real numbers depend on audience country, season, video length and the
          advertisers YouTube serves. See{' '}
          <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
            how much YouTube Shorts pay
          </a>
          .
        </p>

        {/* ═══ KINEO-FERRAMENTA-NA-PAGINA-2026-08-14 ═══════════════════════════
            Esta página é uma TABELA DE RPM POR NICHO e a calculadora da casa
            tem um SELETOR DE NICHO que aplica exatamente essas bandas. Era o
            par mais óbvio do site e estava resolvido com a frase "run your own
            scenario in the Shorts money calculator" — um link que, somado ao
            link igual em /how-much-do-youtube-shorts-pay, entregou **0 sessões
            em 30 dias** para aquela URL.
            A frase saiu (era o convite para sair da página), a ferramenta
            entrou. Mesmo componente importado, nunca uma cópia. */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Run the numbers for your niche
        </h2>
        <p style={{ color: MUTED, lineHeight: 1.7, fontSize: '0.95rem', margin: '0 0 16px' }}>
          Pick your niche below and add your own views and posting rate — the
          estimate uses the same RPM bands as the table above.
        </p>
        <div style={{ margin: '0 0 36px' }}>
          <CalculatorClient />
        </div>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 48px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Start in a high-RPM niche — free
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 4px' }}>
            Pick a niche from the ranking above and generate your first faceless
            Short in about 3–7 minutes. {ft(OFFER, 'Up to 3 watermarked videos every 24 hours, no credit card.', OFFER.copy.headline)}
          </p>
          {/* KINEO-STARTER-EM-ARTIGO-2026-08-15 — aqui havia um `<a>` CRU para
              `/free-ai-shorts-generator?utm_source=rpm-hub&…`. Dois defeitos, os
              mesmos que 14/08 já nomeou uma página adiante:

                1. `<a>` cru = ZERO `organic_cta_clicked`. A única leitura
                   possível era o silêncio: o banco não sabia dizer se ninguém
                   clicava ou se o instrumento não existia.
                2. Apontava para OUTRA PÁGINA DE SEO. "Generate a free Short →"
                   parecia a saída do labirinto e devolvia o leitor ao labirinto.

              E, medido em 15/08 16h, consertar só isso não bastaria: as páginas
              de artigo que JÁ ganharam porta instrumentada somam 316 sessões e
              0 cliques, enquanto os one-click starters da home levaram 278
              pessoas a 68% de ativação. A porta pergunta; o starter começa.
              Mesmo componente da home/#70, com temas dos nichos que ESTA tabela
              coloca no topo do RPM. */}
          <TopicGeneratorForm
            campaign="starter_rpm_by_niche"
            source="starter_rpm_by_niche"
            formId="rpm-start-a-short"
            examples={[
              'The tax rule high earners use that almost nobody knows about',
              'The software subscription quietly billing millions of people',
              'Why buying a first home got harder in exactly ten years',
            ]}
            copy={{
              label: 'Start in a top-RPM niche — free, no card',
              placeholder: 'Type one topic in your niche — e.g. the fee eating your index fund',
              submit: 'Turn this topic into a Short →',
              examplesLabel: 'Topics from the highest-RPM niches above',
              note: 'Your topic stays attached through signup. No card required for the free Fast workflow.',
            }}
          />
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 48px' }}>
          {QA.map((item, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {item.a}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep going
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
              How much do YouTube Shorts pay?
            </a>{' '}
            — the full breakdown of Shorts monetization and realistic earnings.
          </li>
          <li>
            <a href="/shorts-money-calculator" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts money calculator
            </a>{' '}
            — plug in views and RPM to estimate your revenue.
          </li>
          <li>
            <a href="/best-ai-shorts-generators" style={{ color: ACCENT, textDecoration: 'none' }}>
              Best AI Shorts generators
            </a>{' '}
            — tools compared for making faceless Shorts at scale.
          </li>
          <li>
            <a href="/free-ai-shorts" style={{ color: ACCENT, textDecoration: 'none' }}>
              All Kineo niches
            </a>{' '}
            — browse every ready-made faceless niche in one place.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.7 }}>
          RPM figures on this page are estimated typical ranges compiled from
          public creator knowledge about per-niche advertiser demand as of 2026.
          They are not guarantees, not financial advice and not measured Kineo
          platform data. YouTube Shorts revenue depends on many factors outside any
          creator&rsquo;s control. Questions: hello@usekineo.com.
        </p>
      </div>
    </main>
  )
}
