// SEO — /how-much-do-youtube-shorts-pay: money-intent page targeting
// "how much do youtube shorts pay" and long-tails ("per 1000 views",
// "for 1 million views", "shorts CPM/RPM"). Server component — o "zero client
// JS" que este cabeçalho dizia caiu em 14/08 (CalculatorClient) e em 15/08
// (TopicGeneratorForm): DUAS ilhas de cliente, resto server e `force-static`.
// dark theme matching /state-of-ai-shorts-2026 and /facts. Every payout figure
// is labelled as an ESTIMATED TYPICAL RANGE, never a guarantee — Shorts payouts
// vary widely by niche and geography. FAQPage + BreadcrumbList + Article JSON-LD
// mirror the visible page so the markup can never drift from what a human reads.

import type { Metadata } from 'next'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — o MESMO componente da home/#70, nunca
// uma cópia. Ver o bloco de comentário no corpo. Client island; o resto da
// página segue server e `force-static` continua valendo.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
// KINEO-FERRAMENTA-NA-PAGINA-2026-08-14 — ver o bloco de comentário no corpo.
// A calculadora não é duplicada: é O MESMO componente que /shorts-money-calculator
// renderiza, importado. Uma cópia teria duas RPMs para manter e elas divergiriam.
import CalculatorClient from '@/app/shorts-money-calculator/CalculatorClient'

// ── KINEO-SEO-SEM-PORTA-2026-08-14 ──────────────────────────────────────────
// MEDIDO no banco (30 dias, eventos por página de entrada): esta página teve
// 27 sessões e emitiu UM ÚNICO tipo de evento — `landing_session_started`.
// Nada mais. A causa não era falta de instrumentação: era falta de SAÍDA.
// O grep por `href="/signup"`, `href="/generate"` e por qualquer CTA nas 442
// linhas do arquivo voltou VAZIO.
//
// A seção "Keep going" no fim linkava para outras QUATRO páginas de SEO, que
// por sua vez linkam entre si. O interlinking existia e funcionava — só que
// como um circuito FECHADO: o visitante circula pelo labirinto de conteúdo e
// nunca encontra o produto. É a lição de 13/08 ("110 baixaram, 41 nunca viram
// um preço") aplicada um degrau antes: aqui a pergunta não foi feita nem uma
// vez. Uma taxa de conversão de 0% e uma oferta que nunca aparece produzem o
// mesmo número e pedem consertos opostos.
//
// Somadas, esta página e /state-of-ai-shorts-2026 receberam 55 sessões em 30
// dias sem nenhuma porta para o produto. O padrão que CONVERTE já existe na
// casa: /free-script-generator fez 6 cliques de CTA em 9 sessões usando
// exatamente o componente abaixo. Não falta página nova — falta a porta nas
// que já têm tráfego.
//
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — `CTA_CAMPAIGN`/`CTA_HREF`
// (`seo_shorts_pay` → `/signup?next=/generate&utm_source=seo&utm_campaign=shorts_pay`)
// saíram daqui junto com a porta que os usava. O starter carrega a mesma
// intenção com create_intent=fast e o tema do leitor junto; deixar as duas
// constantes órfãs no topo seria a próxima leitura errada de quem chegar aqui.
//
// UM nome para o `source` e UM para o id da âncora, porque os dois aparecem em
// lugares diferentes do arquivo e duas cópias divergem (foi assim que o estudo
// vivo envelheceu: número chumbado em dois lugares).
const STARTER_SOURCE = 'starter_shorts_pay'
const PAYOUT_STARTER_ID = 'payout-start-a-short'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const UPDATED = 'August 29, 2026'
const DATE_PUBLISHED = '2026-07-24'
const DATE_MODIFIED = '2026-08-29'
const CANONICAL_URL = 'https://www.usekineo.com/how-much-do-youtube-shorts-pay'
const YOUTUBE_SHORTS_POLICY_URL = 'https://support.google.com/youtube/answer/12504220?hl=en'
const YOUTUBE_YPP_URL = 'https://support.google.com/youtube/answer/72851?hl=en'
const YOUTUBE_YPP_2027_URL = 'https://support.google.com/youtube/answer/12843009?hl=en'

export const metadata: Metadata = {
  title: 'How Much Do YouTube Shorts Pay in 2026? (Per 1K & 1M Views)',
  description:
    'How much do YouTube Shorts pay? Estimated payouts per 1K and 1M views, the official 45% revenue share, current YPP rules, and the February 2027 changes.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: 'How Much Do YouTube Shorts Pay in 2026? (Per 1K & 1M Views)',
    description:
      'Estimated Shorts payouts per 1K and 1M views, what YouTube officially confirms, current YPP requirements, and the February 2027 changes.',
    url: CANONICAL_URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Much Do YouTube Shorts Pay in 2026?',
    description:
      'Estimated Shorts payouts per 1K and 1M views, the official 45% revenue share, current YPP rules, and the February 2027 changes.',
  },
}

// Estimated typical Shorts RPM band (USD per 1,000 Shorts views), after
// YouTube's revenue split. NOT a guarantee — real RPM swings hard by niche
// and audience geography. Low/mid/high are illustrative ends of a common band.
const RPM_LOW = 0.03
const RPM_MID = 0.05
const RPM_HIGH = 0.1

const VIEW_TIERS: { label: string; views: number }[] = [
  { label: '1,000', views: 1_000 },
  { label: '10,000', views: 10_000 },
  { label: '100,000', views: 100_000 },
  { label: '1,000,000', views: 1_000_000 },
  { label: '10,000,000', views: 10_000_000 },
]

function money(views: number, rpm: number): string {
  const usd = (views / 1000) * rpm
  if (usd < 1) return `$${usd.toFixed(2)}`
  if (usd < 1000) return `$${usd.toFixed(0)}`
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const RPM_FACTORS: { title: string; detail: string }[] = [
  {
    title: 'Niche & advertiser demand',
    detail:
      'Finance, business and tech attract advertisers who pay far more per impression than entertainment or meme content. The same 1M views can pay several times more in a high-CPM niche.',
  },
  {
    title: 'Audience geography',
    detail:
      'Views from the US, UK, Canada and Australia monetize at a much higher rate than views from most of Asia, Africa and Latin America. A channel with a Tier-1 audience earns a multiple of one with the same view count elsewhere.',
  },
  {
    title: 'Watch time & retention',
    detail:
      'The Shorts revenue pool is split by views, but the platform rewards content that holds attention with more distribution — more views at the same RPM still means more dollars.',
  },
  {
    title: 'Season & ad spend cycles',
    detail:
      'RPM rises in Q4 (holiday ad budgets) and dips in January. The exact same video can pay noticeably more in December than in the new year.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much do YouTube Shorts pay per 1,000 views?',
    a: 'Most monetized Shorts channels earn an estimated $0.03 to $0.10 per 1,000 views, with roughly $0.05 as a common midpoint after YouTube takes its share. This is a typical range, not a guarantee: a high-CPM niche with a US audience can beat it, while broad entertainment content with a global audience often lands at the low end.',
  },
  {
    q: 'How much do YouTube Shorts pay for 1 million views?',
    a: 'Using a typical Shorts RPM band of about $0.03 to $0.10 per 1,000 views, 1,000,000 views works out to roughly $30 to $100, with around $50 as a common midpoint. Long-form videos with the same view count usually pay several times more, which is why Shorts creators rely on volume.',
  },
  {
    q: 'Why do Shorts pay less than long videos?',
    a: 'Shorts are monetized from a shared ad pool that is split across all Shorts views and then divided with creators, rather than earning from ads placed directly in one video. Short clips also carry fewer and lighter ad formats than a multi-minute video with mid-rolls. The result is a much lower RPM per 1,000 views than long-form, which typically earns dollars rather than cents per 1,000 views.',
  },
  {
    q: 'What are the current requirements to monetize Shorts?',
    a: 'Until January 31, 2027, the full ad-revenue entry threshold is 1,000 subscribers plus either 10 million qualified public Shorts views in the last 90 days, or 4,000 qualified public watch hours from long-form videos in the last 12 months. Meeting the numbers does not guarantee acceptance: YouTube still reviews the channel and its policy compliance.',
  },
  {
    q: 'How do YouTube monetization requirements change in 2027?',
    a: 'YouTube says that starting February 1, 2027, new creators will need 1,000 subscribers plus either 20 million qualified Shorts views in 90 days or 8,000 qualified long-form watch hours in 365 days to enter ad and Premium monetization. Existing YPP members are not removed by the new entry threshold, but Shorts Creator Pool earnings will require maintaining 10 million qualified Shorts views over the previous 90 days.',
  },
  {
    q: 'Is CPM the same as RPM for Shorts?',
    a: 'No. CPM is what advertisers pay per 1,000 ad impressions before YouTube takes its cut. RPM is what actually lands in your account per 1,000 video views after the platform split and after accounting for views that were never monetized. RPM is the number that matters for estimating your take-home earnings.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function HowMuchDoYouTubeShortsPayPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.usekineo.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'How Much Do YouTube Shorts Pay',
        item: 'https://www.usekineo.com/how-much-do-youtube-shorts-pay',
      },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Much Do YouTube Shorts Pay? (2026)',
    description: metadata.description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    mainEntityOfPage: CANONICAL_URL,
    author: {
      '@type': 'Organization',
      name: 'Kineo',
      url: 'https://www.usekineo.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kineo',
      url: 'https://www.usekineo.com',
    },
    about: [
      'YouTube Shorts earnings',
      'YouTube Partner Program',
      'Shorts revenue sharing',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <a href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>
            Home
          </a>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>How Much Do YouTube Shorts Pay</span>
        </nav>

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
          Creator earnings guide — updated {UPDATED}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          How Much Do YouTube Shorts Pay? (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          The honest answer: YouTube Shorts pay an estimated $0.03 to $0.10 per 1,000
          views for most monetized channels — roughly $0.05 on average — which means
          about $30 to $100 per 1,000,000 views. Those are typical estimated ranges,
          not guarantees. Your real number depends heavily on your niche and where your
          audience lives. Here is exactly how the payout math works, and what moves it.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 18px' }}>
          No figure on this page is a promise of earnings. Shorts RPM varies widely and
          YouTube does not publish per-view rates.
        </p>

        <section
          aria-labelledby="verified-answer"
          style={{
            ...CARD,
            padding: '20px',
            margin: '0 0 40px',
            borderColor: '#264f73',
            background: 'linear-gradient(135deg, #111b25 0%, #161618 68%)',
          }}
        >
          <p
            style={{
              color: ACCENT,
              fontWeight: 700,
              fontSize: '0.76rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Verified against YouTube Help · August 29, 2026
          </p>
          <h2 id="verified-answer" style={{ fontSize: '1.25rem', fontWeight: 750, margin: '0 0 14px' }}>
            What YouTube confirms — and what remains an estimate
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Official:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Shorts Feed ad revenue is pooled. Eligible creators receive 45% of the
                revenue allocated to them from the Creator Pool.{' '}
                <a
                  href={YOUTUBE_SHORTS_POLICY_URL}
                  rel="noopener noreferrer"
                  style={{ color: ACCENT, textDecoration: 'none' }}
                >
                  YouTube&rsquo;s policy
                </a>
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Estimated:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                YouTube publishes no universal RPM. The $0.03–$0.10 per 1,000-view
                range on this page is planning guidance, not an official rate.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Already announced:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                New YPP entry thresholds change on February 1, 2027. The current and
                upcoming rules are separated below.{' '}
                <a
                  href={YOUTUBE_YPP_2027_URL}
                  rel="noopener noreferrer"
                  style={{ color: ACCENT, textDecoration: 'none' }}
                >
                  Official 2027 update
                </a>
              </span>
            </div>
          </div>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How the Shorts payout model actually works
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Long-form YouTube videos earn from ads placed inside the video itself — the
          more (and longer) the video, the more mid-roll ad slots it carries. Shorts
          work differently. Ads run in the Shorts feed between clips, and all of that ad
          money goes into a single shared pool. YouTube first sets aside a portion to
          cover music licensing, then divides the rest among Shorts creators based on
          their share of total Shorts views, and finally splits that with each creator
          (creators keep 45% of their allocated revenue). You are being paid a slice of
          a communal pool, not the ads on your specific clip.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          That structure is the entire reason Shorts pay less per view than long-form.
          There is no getting around it with a &ldquo;trick&rdquo; — the lever is volume
          and niche, not a hidden setting.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          RPM vs CPM — the two numbers people confuse
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 20px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              CPM (cost per mille)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              What an advertiser pays per 1,000 ad impressions, before YouTube takes its
              cut. It is an advertiser-side number and is always higher than what you
              actually receive.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              RPM (revenue per mille)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              What actually lands in your account per 1,000 video views, after the
              revenue split and after the many views that were never monetized. RPM is
              the honest number to plan with — and for Shorts it is low, typically a few
              cents per 1,000 views rather than the dollars long-form can earn.
            </p>
          </section>
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          When someone says &ldquo;my Shorts CPM is $4&rdquo;, that is the advertiser
          number — it does not mean $4 per 1,000 views in your pocket. Your Shorts RPM is
          the figure the table below is built on.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Current Shorts monetization requirements
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          You earn $0 from Shorts until you are accepted into the YouTube Partner
          Program and accept the Shorts Monetization Module. Through January 31, 2027,
          the full ad-revenue entry threshold is:
        </p>
        <ul style={{ color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.98rem', paddingLeft: 20, margin: '0 0 14px' }}>
          <li>
            <strong>1,000 subscribers</strong>, plus
          </li>
          <li>
            <strong>10 million qualified public Shorts views in the last 90 days</strong>,{' '}
            <em>or</em>
          </li>
          <li>
            <strong>4,000 qualified public watch hours in the last 12 months</strong>{' '}
            from long-form videos.
          </li>
        </ul>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 14px' }}>
          You also need to live in an eligible country and follow YouTube&rsquo;s
          monetization policies. Reaching the numbers starts a channel review; it does
          not guarantee acceptance.{' '}
          <a href={YOUTUBE_YPP_URL} rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
            See the current official YPP requirements
          </a>
        </p>
        <section style={{ ...CARD, padding: '18px', margin: '0 0 32px', borderColor: '#5b4720' }}>
          <p
            style={{
              color: '#ffcc66',
              fontWeight: 700,
              fontSize: '0.76rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Effective February 1, 2027
          </p>
          <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 10px' }}>
            For new creators, YouTube says the ad and Premium entry threshold becomes
            1,000 subscribers plus either <strong>20 million qualified Shorts views in
            90 days</strong> or <strong>8,000 qualified long-form watch hours in 365
            days</strong>. Existing YPP members are not removed by this new entry rule.
          </p>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
            Separately, monthly Shorts Creator Pool earnings will require maintaining
            10 million qualified Shorts views over the previous 90 days. Existing
            creators must accept the updated terms by January 31, 2027 to keep earning
            from the relevant modules.
          </p>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          YouTube Shorts payout table (estimated)
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Based on a typical estimated Shorts RPM band of{' '}
          <strong style={{ color: '#d2d2d7' }}>
            ${RPM_LOW.toFixed(2)}–${RPM_HIGH.toFixed(2)} per 1,000 views
          </strong>{' '}
          (about <strong style={{ color: '#d2d2d7' }}>${RPM_MID.toFixed(2)}</strong> at
          the midpoint). These are illustrative ranges, not guaranteed rates — a
          high-CPM niche with a US audience can exceed the &ldquo;high&rdquo; column,
          while a broad global audience often sits at the &ldquo;low&rdquo; column.
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Views
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Low (${RPM_LOW.toFixed(2)})
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: ACCENT, fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mid (${RPM_MID.toFixed(2)})
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  High (${RPM_HIGH.toFixed(2)})
                </th>
              </tr>
            </thead>
            <tbody>
              {VIEW_TIERS.map((t, i) => (
                <tr key={t.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>{t.label} views</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, RPM_LOW)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>
                    {money(t.views, RPM_MID)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, RPM_HIGH)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Read the table as &ldquo;this is roughly the range a typical monetized channel
          might see,&rdquo; not &ldquo;this is what you will be paid.&rdquo; It also
          excludes any income from brand deals, affiliate links or memberships, which for
          most Shorts creators end up larger than ad-share revenue.
        </p>

        {/* ═══ KINEO-FERRAMENTA-NA-PAGINA-2026-08-14 ═══════════════════════════
            A CALCULADORA VEM ATÉ O TRÁFEGO, EM VEZ DE ESPERAR UM LINK.

            O que a medição diz, e é o motivo desta mudança existir:
              · esta página          → 27 sessões / 30 dias, 0 cliques de CTA
              · /shorts-money-calculator → **0 sessões / 30 dias**

            O bloco "Keep going" abaixo LINKA para a calculadora há semanas e
            entregou zero visitas. Ou seja: o problema nunca foi a casa não ter
            a ferramenta certa para esta página — é a ferramenta estar em OUTRA
            URL, e um link no rodapé de um artigo não move ninguém.

            E o formato importa, não o link: as duas únicas páginas de SEO que
            convertem nesta casa são FERRAMENTAS (67% e 41%); TODA página de
            artigo acima de 10 sessões converte 0% (8 páginas, 316 sessões,
            zero cliques). A variável medida é a pessoa FAZER alguma coisa
            antes de qualquer pedido — e é isso, não mais um botão, que entra
            aqui.

            POSIÇÃO ESCOLHIDA: logo depois da tabela de payout, que é onde a
            pergunta do leitor deixa de ser "quanto paga?" e vira "quanto EU
            ganharia?". A porta da calculadora já nasce carregando o nicho que
            ele escolheu (toolActivationHref, 13h de hoje) — não é um anúncio,
            é a continuação do que ele acabou de fazer.

            ⚠️ O CARD DE CTA ESTÁTICO LÁ EMBAIXO **NÃO** FOI REMOVIDO, embora
            fosse tentador: ele entrou em produção HOJE às ~09:22Z e ainda não
            teve um dia de leitura. Matá-lo agora destruiria a medição em curso
            e mexeria em duas variáveis no mesmo diff. Ele fica longe daqui, no
            fecho da página, e a comparação entre os dois formatos NESTA MESMA
            página passa a ser possível pela primeira vez.

            Client island: o resto da página segue server e `force-static`
            continua valendo (só este nó hidrata), exatamente como
            OrganicCtaLink já fazia. */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What would <em>you</em> earn?
        </h2>
        <p style={{ color: MUTED, lineHeight: 1.7, fontSize: '0.95rem', margin: '0 0 16px' }}>
          The table above is the typical range. Put your own numbers in and the
          estimate below updates for your views, your posting rate and your niche.
        </p>
        <div style={{ margin: '0 0 36px' }}>
          <CalculatorClient />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What actually moves your Shorts RPM
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 32px' }}>
          {RPM_FACTORS.map((f, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {f.detail}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The honest takeaway
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Shorts pay less per view than long-form videos, and no amount of optimization
          changes the underlying model. What you <em>can</em> control is the two levers
          that actually matter: <strong>niche</strong> (pick one advertisers pay for, and
          ideally one with a Tier-1 audience) and <strong>volume</strong> (post
          consistently so the shared pool math works in your favor). A channel posting one
          Short a week in a low-CPM niche will earn cents. A channel posting daily in a
          high-value niche can turn the same platform into a real income stream — mostly
          because volume also opens the door to brand deals and affiliate revenue that
          dwarf ad share.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          The bottleneck for most people is not the payout rate — it is producing enough
          good Shorts consistently. That is the problem worth solving first.
        </p>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 40px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Post enough Shorts to reach monetization — for free
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Volume is the whole game, and volume is exactly what an AI generator gives you.
            Kineo turns one typed idea into a finished faceless Short — script, AI
            voiceover, visuals and captions — in about 3–7 minutes. {ft(OFFER, 'Generate up to 3 watermarked videos every 24 hours with no credit card, in a high-RPM niche of your choice.', OFFER.copy.headline + ' Pick a high-RPM niche of your choice.')}
          </p>
          {/* KINEO-STARTER-EM-ARTIGO-2026-08-15 — este `<a>` era CRU e apontava
              para `/free-ai-shorts-generator`: zero `organic_cta_clicked` e
              destino em OUTRA página de SEO. Sozinho ele já era o circuito
              fechado de 14/08; com o starter agora no fim da página, ele virava
              pior que isso — uma porta INVISÍVEL que tirava o leitor daqui
              antes do starter e não registrava nada, contaminando a leitura de
              `starter_shorts_pay` com uma fuga que o banco não veria.
              Agora é âncora para o starter DESTA página, pelo componente da
              casa (mesmo padrão de FORM_ANCHOR em /faceless-video-generator).
              `placement` separa a âncora do starter em si. */}
          <OrganicCtaLink
            href={`#${PAYOUT_STARTER_ID}`}
            source={STARTER_SOURCE}
            placement="anchor_mid_page"
            style={{
              display: 'inline-block',
              background: ACCENT,
              color: '#000',
              fontWeight: 700,
              padding: '12px 22px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            Generate a free Short →
          </OrganicCtaLink>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          {FAQ.map((item, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {item.a}
              </p>
            </section>
          ))}
        </div>

        {/* KINEO-SEO-SEM-PORTA-2026-08-14 — a porta que faltava. Fica ANTES do
            "Keep going" de propósito: aquele bloco é o circuito fechado que
            mandava o leitor para mais quatro páginas de SEO. A oferta tem de
            aparecer antes do desvio, não depois dele. */}
        <div style={{ ...CARD, padding: 22, margin: '0 0 32px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            The payout math only starts once you post
          </h2>
          <p style={{ color: MUTED, lineHeight: 1.7, fontSize: '0.95rem', margin: '0 0 4px' }}>
            Every number on this page assumes one thing: that you publish enough Shorts
            for the RPM to matter. That is the part most channels never get past. Kineo
            turns a topic into a finished vertical Short — AI voiceover, matched footage
            and captions — usually in a few minutes, so volume stops being the bottleneck.
          </p>
          {/* KINEO-STARTER-EM-ARTIGO-2026-08-15 — aqui havia a porta de 14/08
              (`OrganicCtaLink`, source `seo_shorts_pay`, placement
              `after_payout_table`, texto "Turn a topic into a Short →").
              Ela consertou a ausência de saída. A medição de 15/08 16h mostrou
              que a saída não era a variável: 316 sessões de artigo COM porta
              instrumentada = 0 cliques, contra 278 pessoas e 68% de ativação nos
              one-click starters da home. O que a home faz e o artigo não fazia é
              deixar a pessoa APERTAR UM BOTÃO e ver o próprio tema virar vídeo
              antes de pedir qualquer coisa.

              Então a porta virou o starter — o MESMO componente da home/#70,
              nunca uma cópia — com três temas de nicho ALTO RPM, que é
              exatamente a intenção de quem chega a esta URL. Uma variável
              trocada; destino, `create_intent=fast` e a herança de campanha
              seguem os de sempre. A promessa de QUANTIDADE continua fora do
              botão de propósito: a troca do free tier (`lib/freeTierOffer`) não
              ganha mais uma superfície para lembrar de visitar. */}
          <TopicGeneratorForm
            campaign={STARTER_SOURCE}
            source={STARTER_SOURCE}
            formId={PAYOUT_STARTER_ID}
            examples={[
              'The compound interest mistake that costs 20 years of savings',
              'How much a small YouTube channel really earns in year one',
              'The one expense quietly eating a third of your paycheck',
            ]}
            copy={{
              label: 'Start a high-RPM Short — free, no card',
              placeholder: 'Type one topic — e.g. why your savings account is losing money',
              submit: 'Turn this topic into a Short →',
              examplesLabel: 'High-RPM topic starters',
              note: 'Your topic stays attached through signup. No card required for the free Fast workflow.',
            }}
          />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep going
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts RPM by niche
            </a>{' '}
            — which niches actually pay the most per 1,000 views.
          </li>
          {/* KINEO-FERRAMENTA-NA-PAGINA-2026-08-14 — o item "Shorts money
              calculator" SAIU daqui porque a calculadora agora está NESTA
              página, acima. Mandar quem acabou de usá-la para uma URL que
              renderiza a mesma coisa é o circuito fechado que a sprint das 10h
              nomeou, só que agora com uma volta a mais. O link entregou 0
              sessões em 30 dias — não se está perdendo tráfego, está se
              deixando de perder o leitor. */}
          <li>
            <a href="/best-ai-shorts-generators" style={{ color: ACCENT, textDecoration: 'none' }}>
              Best AI Shorts generators
            </a>{' '}
            — tools to produce the volume monetization needs.
          </li>
          <li>
            <a href="/free-ai-shorts" style={{ color: ACCENT, textDecoration: 'none' }}>
              Free AI Shorts by niche
            </a>{' '}
            — pick a high-value niche and start generating.
          </li>
        </ul>

        <section style={{ ...CARD, padding: '18px', margin: '0 0 24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px' }}>
            Primary sources checked
          </h2>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 10px' }}>
            Official YouTube Help pages checked on August 29, 2026. YouTube can change
            program terms; these links are the authority when a rule changes.
          </p>
          <ul style={{ color: MUTED, lineHeight: 1.8, fontSize: '0.9rem', paddingLeft: 20, margin: 0 }}>
            <li>
              <a href={YOUTUBE_SHORTS_POLICY_URL} rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
                YouTube Shorts monetization policies
              </a>{' '}
              — Creator Pool, eligible views, music allocation and the 45% share.
            </li>
            <li>
              <a href={YOUTUBE_YPP_URL} rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
                Current YouTube Partner Program eligibility
              </a>{' '}
              — current entry thresholds and channel review.
            </li>
            <li>
              <a href={YOUTUBE_YPP_2027_URL} rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
                Official February 2027 YPP changes
              </a>{' '}
              — new entry, activity and Shorts Creator Pool requirements.
            </li>
          </ul>
        </section>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          All payout figures on this page are estimated typical ranges for illustration,
          updated {UPDATED}. They are not guarantees of income. Actual YouTube Shorts
          earnings depend on niche, audience geography, season and YouTube&rsquo;s own
          revenue-sharing terms, which can change at any time.
        </p>
      </div>
    </main>
  )
}
