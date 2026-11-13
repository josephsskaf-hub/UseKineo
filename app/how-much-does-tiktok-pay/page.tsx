// SEO / citacoes: /how-much-does-tiktok-pay responde "how much does TikTok pay
// per 1,000 views in 2026". Irma de /how-much-do-youtube-shorts-pay (mesmo
// molde: server component, force-static, tema escuro, FAQPage + BreadcrumbList
// + Article JSON-LD espelhando o texto visivel).
//
// REGRA DESTA PAGINA (13/11/2026): o TikTok NAO publica valor em dolar do RPM
// do Creator Rewards Program. Entao a pagina diz isso com todas as letras e
// separa tres camadas, cada uma com fonte e data de consulta:
//   1. oficial (TikTok Support, Creator Academy, Newsroom);
//   2. imprensa atribuindo a afirmacao ao TikTok (TechCrunch; texto do
//      reporter, nao fala de porta-voz);
//   3. estimativa de terceiro (ttcalculator.net), so para RPM dos EUA. O site
//      diz que se baseia em "creator-reported figures" mas nao mostra amostra
//      nem metodo; nunca aparece como valor pago pela plataforma.
// As duas paginas do Support foram lidas em portugues (o TikTok serve a lingua
// do navegador), entao NADA do Support vai entre aspas: e sempre parafrase.
// As negativas sao sempre "nao achamos nas paginas conferidas", nunca "nao
// existe".
// Nenhum numero entra sem estar na lista de fatos conferidos. O valor por view
// do antigo Creator Fund ficou DE FORA de proposito: a unica fonte (Fast
// Company) devolveu 403 na conferencia e so tinha sido lida em resumo de busca.
//
// Sem preco nem creditos da Kineo aqui (so o link para /pricing), sem nome de
// motor em botao, nenhum texto abaixo de 12 px, sem travessao.

import type { Metadata } from 'next'
import OrganicCtaLink from '@/components/OrganicCtaLink'
// O MESMO componente da home e da pagina irma, nunca uma copia.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

const STARTER_SOURCE = 'starter_tiktok_pay'
const PAYOUT_STARTER_ID = 'tiktok-pay-start-a-video'

export const dynamic = 'force-static'

const UPDATED = 'November 13, 2026'
const CHECKED = 'November 13, 2026'
const DATE_PUBLISHED = '2026-11-13'
const DATE_MODIFIED = '2026-11-13'
const CANONICAL_URL = 'https://www.usekineo.com/how-much-does-tiktok-pay'

const SUPPORT_PROGRAM_URL =
  'https://support.tiktok.com/en/business-and-creator/creator-rewards-program/creator-rewards-program'
const SUPPORT_REWARDS_URL =
  'https://support.tiktok.com/en/business-and-creator/creator-rewards-program/how-rewards-work'
const ACADEMY_URL = 'https://www.tiktok.com/creator-academy/en/article/creator-rewards-program'
const NEWSROOM_REWARDS_URL = 'https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program'
const NEWSROOM_FUND_URL = 'https://newsroom.tiktok.com/en-us/introducing-the-200-million-tiktok-creator-fund'
const SUPPORT_FUND_URL = 'https://support.tiktok.com/en/business-and-creator/creator-fund/tiktok-creator-fund'
const TECHCRUNCH_URL =
  'https://techcrunch.com/2023/11/07/tiktok-is-shutting-down-its-creator-fund-in-favor-of-its-newer-creativity-program/'
const THIRD_PARTY_URL = 'https://ttcalculator.net/learn/creator-rewards-program/'
const THIRD_PARTY_DATED = 'page dated February 17, 2026, updated July 10, 2026'

// Um titulo so para <title>, og, twitter, h1 e headline do Article.
const PAGE_TITLE = 'How Much Does TikTok Pay Per 1,000 Views in 2026?'
// O openGraph da pagina substitui o do layout inteiro (o Next nao funde), entao
// a imagem padrao do site precisa ser repetida aqui. Mesma do app/layout.tsx.
const OG_IMAGE = 'https://www.usekineo.com/og-card.png?v=claro-1001b'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description:
    'TikTok publishes no dollar rate per 1,000 views. See what the Creator Rewards Program officially confirms, the third-party estimates, and which views count.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: PAGE_TITLE,
    description:
      'TikTok publishes no dollar rate. What it confirms about the Creator Rewards Program, one third-party US RPM estimate, and which views actually count.',
    url: CANONICAL_URL,
    type: 'article',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Kineo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description:
      'TikTok publishes no dollar rate. What it confirms about the Creator Rewards Program, one third-party US RPM estimate, and which views count.',
    images: [OG_IMAGE],
  },
}

// Estimativa de TERCEIRO (ttcalculator.net, lida em 13/11/2026). Nao e valor
// oficial. O proprio site diz que e estimativa e que o TikTok nao publica RPM.
// A faixa e de RPM dos EUA ("US RPM", "qualified US views"), nao geral.
const THIRD_PARTY_RPM_LOW = 0.5
const THIRD_PARTY_RPM_HIGH = 2

const VIEW_TIERS: { label: string; views: number }[] = [
  { label: '1,000', views: 1_000 },
  { label: '10,000', views: 10_000 },
  { label: '100,000', views: 100_000 },
  { label: '1,000,000', views: 1_000_000 },
]

function money(views: number, rpm: number): string {
  const usd = (views / 1000) * rpm
  if (usd < 10) return `$${usd.toFixed(2)}`
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const OFFICIAL_ROWS: { item: string; value: string; sourceLabel: string; sourceUrl: string }[] = [
  {
    item: 'Dollar rate per 1,000 qualified views (RPM)',
    value: 'Not published. We found no official rate on the TikTok pages checked on November 13, 2026.',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_REWARDS_URL,
  },
  {
    item: 'How rewards are calculated',
    value:
      'From qualified views and RPM, the average rewards per 1,000 qualified views. An Additional Reward can be added on top.',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_PROGRAM_URL,
  },
  {
    item: 'Minimum video length',
    value:
      'Over 1 minute long (Creator Academy). TikTok Support words it as at least one minute. Shorter videos are not eligible.',
    sourceLabel: 'Creator Academy',
    sourceUrl: ACADEMY_URL,
  },
  {
    item: 'Followers needed to join',
    value: 'At least 10,000',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_PROGRAM_URL,
  },
  {
    item: 'Views needed to join',
    value: 'At least 100,000 video views in the last 30 days',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_PROGRAM_URL,
  },
  {
    item: 'Minimum age',
    value: '18 or older (19 in South Korea)',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_PROGRAM_URL,
  },
  {
    item: 'Countries where the program is open',
    value:
      '8: United States, United Kingdom, Germany, Japan, South Korea, France, Mexico and Brazil',
    sourceLabel: 'Creator Academy',
    sourceUrl: ACADEMY_URL,
  },
  {
    item: 'When a video starts earning',
    value: 'After 1,000 qualified views from the For You feed',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_REWARDS_URL,
  },
  {
    item: 'Shortest watch that counts',
    value:
      'At least 5 seconds (Creator Academy; TikTok Support says more than 5 seconds). Search views need at least 30 seconds (Creator Academy).',
    sourceLabel: 'Creator Academy',
    sourceUrl: ACADEMY_URL,
  },
  {
    item: 'Minimum payout',
    value: '$10 accumulated (or the local currency equivalent)',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_REWARDS_URL,
  },
  {
    item: 'Pay day',
    value: 'The 15th of each month',
    sourceLabel: 'TikTok Support',
    sourceUrl: SUPPORT_REWARDS_URL,
  },
  {
    item: 'Violations that make an account ineligible',
    value:
      '5 video violations in the past 30 days make the account ineligible. 5 total account violations make it permanently ineligible.',
    sourceLabel: 'Creator Academy',
    sourceUrl: ACADEMY_URL,
  },
]

const RPM_FACTORS: { title: string; detail: string }[] = [
  {
    title: 'Video performance',
    detail:
      'TikTok Support defines this as average watch time and completion rate. It does not say how much either one changes the RPM.',
  },
  {
    title: 'Search value',
    detail:
      'Defined as the amount of search traffic your content generates, including video views on the search page. The TikTok Newsroom also lists search value among the four core metrics of the formula announced on March 18, 2024.',
  },
  {
    title: 'Location',
    detail:
      'Defined as the region where you are and the region where your video is viewed. The pages we checked give no rate per country.',
  },
  {
    title: 'Engagement',
    detail:
      'Defined as how many viewers engage with your content. The page does not name specific actions or say how much weight they carry.',
  },
  {
    title: 'Advertising value',
    detail:
      'Defined as the time your viewers spend watching ads on TikTok. Our reading, not TikTok’s wording: this depends on your audience, so you cannot set it directly.',
  },
]

const NOT_COUNTED: string[] = [
  'Fraudulent, paid, promoted or artificial views',
  'Views with an "I\'m not interested" tap',
  'Views watched for less than 5 seconds',
  'Repeat views from the same account (each account counts once)',
  'Search views watched for less than 30 seconds',
  'Views from outside the 8 countries where the program is available',
]

const NOT_ELIGIBLE: string[] = [
  'Duets and Stitches',
  'Photo Mode posts',
  'Ads, paid promotions and sponsored content',
  'Videos linked to a Series',
  'TikTok One videos',
  'Videos published before your account was approved for the program',
]

const NOT_ORIGINAL: string[] = [
  'Content copied from others, including clips that carry someone else’s watermark',
  'Content reused with only minor changes, such as sped-up video, filters, fixed text or stickers',
  'Compilations of other people’s videos with no new idea added',
  'Looping videos, single photos or multiple photos, or text overlays only',
  'Lip-syncing or copyrighted music for more than 1 minute',
  'Split screens, meaningless reactions, low-quality images and slide videos (listed as low quality by the Creator Academy)',
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much does TikTok pay per 1,000 views in 2026?',
    a: 'TikTok does not publish a dollar rate. Its Creator Rewards Program pays based on qualified views and an RPM (average rewards per 1,000 qualified views) that TikTok calculates from several factors and does not publish as a dollar figure on the TikTok pages we checked on November 13, 2026. One third-party calculator site, ttcalculator.net (checked November 13, 2026), estimates US RPM at about $0.50 to $2.00 per 1,000 qualified US views and says the US, UK and other high-value ad markets pay more per view than most other regions. That figure is unverified and is not a rate paid or confirmed by TikTok.',
  },
  {
    q: 'How much does TikTok pay for 1 million views?',
    a: 'There is no official answer, because TikTok publishes no RPM and pays only for qualified views, which can be fewer than the total views shown on a video: TikTok Support lists several kinds of views it leaves out (checked November 13, 2026). Applying the unverified ttcalculator.net estimate of US RPM, about $0.50 to $2.00 per 1,000 qualified US views (checked November 13, 2026), 1,000,000 qualified US views would be roughly $500 to $2,000. Treat that as arithmetic on an outside estimate for US views, not as an expected payment.',
  },
  {
    q: 'Does TikTok pay for videos under 1 minute?',
    a: 'Not through the Creator Rewards Program. TikTok Support says eligible videos must be at least one minute long, and the Creator Academy says over 1 minute long, so aiming above 60 seconds satisfies both wordings.',
  },
  {
    q: 'What do you need to join the TikTok Creator Rewards Program?',
    a: 'According to TikTok Support, you must be 18 or older (19 in South Korea), have at least 10,000 followers, have at least 100,000 video views in the last 30 days, and use a personal account, since Business Accounts do not qualify. You must also be based in one of the 8 countries where the program is open and have your account registered there: the United States, United Kingdom, Germany, Japan, South Korea, France, Mexico or Brazil.',
  },
  {
    q: 'Which TikTok views do not count toward rewards?',
    a: 'TikTok Support excludes fraudulent, paid, promoted and artificial views, views from people who marked the video as not interesting, views watched for less than 5 seconds, and repeat views from the same account. TikTok Support describes qualified views as unique views from the For You feed; the Creator Academy also counts search views with at least 30 seconds of watch time and says a view must come from one of the 8 countries where the program is available. Both were checked on November 13, 2026.',
  },
  {
    q: 'When does TikTok pay creators?',
    a: 'TikTok Support says payments are made on the 15th of each month once your balance reaches the minimum payout threshold of $10 or the local currency equivalent. It calls PayPal currently the only payment method for creators in the United States, South Korea, Brazil, the United Kingdom, France and Germany, names Payoneer or bank transfer for Japan, and does not mention Mexico. The Creator Academy also mentions Pix and bank accounts. Both were checked on November 13, 2026.',
  },
  {
    q: 'Is the TikTok Creator Fund still paying?',
    a: 'Not in the United States, United Kingdom, France or Germany, according to TechCrunch (November 7, 2023), which reported that the Creator Fund would be discontinued in those four countries starting December 16; the article gives no year, and 2023 follows from its publication date. The fund had been announced on July 22, 2020 with $200 million in the US. Its replacement, the Creativity Program, was renamed the Creator Rewards Program on March 18, 2024. TikTok’s old Creator Fund support address no longer shows a Creator Fund page as of November 13, 2026.',
  },
  {
    q: 'Can AI-generated videos earn in the Creator Rewards Program?',
    a: 'The three Creator Rewards Program pages we checked on November 13, 2026 do not mention AI. TikTok has separate pages on AI-generated content and labeling, which we did not use as a source here, so this page gives no yes or no. What the program pages do require is original content that you filmed, designed and produced yourself, and they exclude photo posts, looping videos and lightly modified reposts. Read the current terms for your country before you count on it.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'
const LINK = { color: ACCENT, textDecoration: 'none' } as const
const TH = {
  textAlign: 'left',
  padding: '14px 16px',
  color: MUTED,
  fontWeight: 600,
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
} as const

export default function HowMuchDoesTikTokPayPage() {
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
        name: 'How Much Does TikTok Pay',
        item: CANONICAL_URL,
      },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: PAGE_TITLE,
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
      'TikTok Creator Rewards Program',
      'TikTok creator earnings',
      'TikTok RPM',
    ],
  }

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily: 'var(--font-sans), Arial, sans-serif',
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
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>How Much Does TikTok Pay</span>
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
          Creator earnings guide · updated {UPDATED}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          {PAGE_TITLE}
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          TikTok does not publish a dollar amount per 1,000 views: its Creator Rewards
          Program pays based on qualified views and an RPM (average rewards per 1,000
          qualified views) that TikTok calculates from several factors and does not
          publish as a dollar figure. The dollar figures in circulation are third-party
          estimates, such as a US RPM of about $0.50 to $2.00 per 1,000 qualified US
          views (
          <a href={THIRD_PARTY_URL} rel="noopener noreferrer nofollow" style={LINK}>
            ttcalculator.net
          </a>
          , checked {CHECKED}), and that estimate is not confirmed by TikTok.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 18px' }}>
          No figure on this page is a promise of earnings. Every number below carries
          its source and the date it was checked.
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
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Sources checked · {CHECKED}
          </p>
          <h2 id="verified-answer" style={{ fontSize: '1.25rem', fontWeight: 750, margin: '0 0 14px' }}>
            What TikTok confirms, and what is only an estimate
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Official:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Rewards are calculated from qualified views and the rewards per 1,000
                qualified views, also called RPM. Videos must be at least one minute
                long (
                <a href={SUPPORT_PROGRAM_URL} rel="noopener noreferrer" style={LINK}>
                  TikTok Support
                </a>
                ); the{' '}
                <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
                  Creator Academy
                </a>{' '}
                says over 1 minute.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Not published:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                The RPM in dollars. We found no official value, and no official rate
                per country, on the TikTok pages listed under &ldquo;Sources
                checked&rdquo; below.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Third-party estimate (not official):</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                One calculator site estimates <strong>US RPM</strong> at roughly $0.50
                to $2.00 per 1,000 qualified US views, and says the US, UK and other
                high-value ad markets pay more per view than most other regions. The
                site says the range is based on creator-reported figures, calls it an
                estimate and gives no sample or method.{' '}
                <a href={THIRD_PARTY_URL} rel="noopener noreferrer nofollow" style={LINK}>
                  ttcalculator.net
                </a>{' '}
                ({THIRD_PARTY_DATED}; checked {CHECKED}).
              </span>
            </div>
          </div>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How TikTok actually pays creators
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          The program that pays for views is the Creator Rewards Program. It is the
          former Creativity Program Beta, renamed on March 18, 2024. In{' '}
          <a href={NEWSROOM_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            the announcement
          </a>
          , TikTok said the program rewards original content over a minute long with a
          formula built on four core metrics: originality, play duration, search value
          and audience engagement. The announcement contains no dollar amount.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          The math has two parts. First TikTok counts your <strong>qualified views</strong>,
          which can be fewer than the view count you see on the video, because{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>{' '}
          lists kinds of views it leaves out (checked {CHECKED}). Then it applies your{' '}
          <strong>RPM</strong>, which TikTok Support defines as the average rewards per
          1,000 qualified views and says depends on several factors. Because both parts
          are set by TikTok and neither is public (only the total view count is),
          nobody outside your own dashboard can tell you what 1,000 views will pay.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          What TikTok officially publishes (and what it does not)
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Every row links to the TikTok page it comes from. All pages were checked on{' '}
          {CHECKED}. None of them showed us a readable publication or update date.
          The two TikTok Support pages were served to us in Portuguese, so Support
          rules here are our translation, not quotes.
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 32px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={TH}>Rule</th>
                <th style={TH}>What TikTok says</th>
                <th style={TH}>Source</th>
              </tr>
            </thead>
            <tbody>
              {OFFICIAL_ROWS.map((row, i) => (
                <tr key={row.item} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, verticalAlign: 'top' }}>{row.item}</td>
                  <td
                    style={{
                      padding: '14px 16px',
                      color: i === 0 ? '#ffcc66' : '#d2d2d7',
                      fontWeight: i === 0 ? 700 : 400,
                      lineHeight: 1.5,
                      verticalAlign: 'top',
                    }}
                  >
                    {row.value}
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <a href={row.sourceUrl} rel="noopener noreferrer" style={LINK}>
                      {row.sourceLabel}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          Third-party estimate: what the outside numbers would mean
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          This table is <strong style={{ color: '#d2d2d7' }}>not official</strong>. It
          is plain arithmetic on one unverified third-party estimate of{' '}
          <strong style={{ color: '#d2d2d7' }}>
            US RPM: ${THIRD_PARTY_RPM_LOW.toFixed(2)} to ${THIRD_PARTY_RPM_HIGH.toFixed(2)}{' '}
            per 1,000 qualified US views
          </strong>{' '}
          (
          <a href={THIRD_PARTY_URL} rel="noopener noreferrer nofollow" style={LINK}>
            ttcalculator.net
          </a>
          , {THIRD_PARTY_DATED}; checked {CHECKED}). That site says the range is based
          on creator-reported figures, calls it an estimate, shows no sample size or
          method, and states that TikTok does not publish a fixed RPM. It also says
          the US, UK and other high-value ad markets pay more per view than most
          other regions, so this range should not be applied to views from elsewhere.
          TikTok has not paid, published or confirmed these rates.
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={TH}>Qualified US views</th>
                <th style={{ ...TH, textAlign: 'right' }}>
                  At ${THIRD_PARTY_RPM_LOW.toFixed(2)} (unverified)
                </th>
                <th style={{ ...TH, textAlign: 'right' }}>
                  At ${THIRD_PARTY_RPM_HIGH.toFixed(2)} (unverified)
                </th>
              </tr>
            </thead>
            <tbody>
              {VIEW_TIERS.map((t) => (
                <tr key={t.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>{t.label}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, THIRD_PARTY_RPM_LOW)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, THIRD_PARTY_RPM_HIGH)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Two cautions. The left column is qualified US views, not the view count on
          the video: a video with 1,000,000 total views can have fewer than 1,000,000
          qualified ones, because{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>{' '}
          lists views it excludes (checked {CHECKED}). And the only RPM that matters is
          the one in your own TikTok dashboard after you are in the program.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Who can join the Creator Rewards Program
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          The program pays nothing until your account is accepted.{' '}
          <a href={SUPPORT_PROGRAM_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>{' '}
          lists these requirements:
        </p>
        <ul style={{ color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.98rem', paddingLeft: 20, margin: '0 0 14px' }}>
          <li>
            Be <strong>18 or older</strong> (19 in South Korea).
          </li>
          <li>
            Have at least <strong>10,000 followers</strong>.
          </li>
          <li>
            Have at least <strong>100,000 video views in the last 30 days</strong>.
          </li>
          <li>
            Use a <strong>personal account</strong>. Business Accounts do not qualify.
          </li>
          <li>
            Be based in a country where the program is open, with an account registered
            there.
          </li>
        </ul>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          The{' '}
          <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
            Creator Academy
          </a>{' '}
          names 8 countries: the United States, United Kingdom, Germany, Japan, South
          Korea, France, Mexico and Brazil. A creator living anywhere else cannot join
          today.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Which views count, and which do not
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          TikTok pays for qualified views only. According to{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>
          , those are unique video views from the For You feed, and an eligible video
          starts earning once it reaches 1,000 of them. These views are left out:
        </p>
        <ul style={{ color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.98rem', paddingLeft: 20, margin: '0 0 14px' }}>
          {NOT_COUNTED.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          The last two lines come from the{' '}
          <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
            Creator Academy FAQ
          </a>
          . The two official pages do not match word for word: TikTok Support speaks
          only of views from the For You feed and says a view must last more than 5
          seconds, while the Creator Academy says at least five seconds and also counts
          search views of 30 seconds or more. Our reading of the country rule: a video
          that goes viral with an audience outside those 8 countries can show a large
          view count and still have few qualified views.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Videos that earn nothing
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 14px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Formats outside the program
            </h3>
            <ul style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.95rem', paddingLeft: 20, margin: 0 }}>
              {NOT_ELIGIBLE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              Content TikTok treats as not original or low quality
            </h3>
            <ul style={{ color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.95rem', paddingLeft: 20, margin: 0 }}>
              {NOT_ORIGINAL.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Sources:{' '}
          <a href={SUPPORT_PROGRAM_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>
          ,{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support, how rewards work
          </a>{' '}
          (for TikTok One videos) and the{' '}
          <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
            Creator Academy
          </a>
          , checked {CHECKED}. The Creator Academy also says 5 video violations in the
          past 30 days make an account ineligible, and 5 total account violations make
          it permanently ineligible.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What moves your RPM, according to TikTok
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 14px' }}>
          {RPM_FACTORS.map((f) => (
            <section key={f.title} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {f.detail}
              </p>
            </section>
          ))}
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 14px' }}>
          Source:{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support, how rewards work
          </a>
          , checked {CHECKED}.
        </p>
        <section style={{ ...CARD, padding: '18px', margin: '0 0 32px', borderColor: '#5b4720' }}>
          <p
            style={{
              color: '#ffcc66',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Additional Reward
          </p>
          <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 10px' }}>
            The{' '}
            <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
              Creator Academy
            </a>{' '}
            says the Additional Reward launched &ldquo;as of Spring 2025&rdquo;. It is
            added on top of the standard reward for videos TikTok considers well
            crafted, engaging and specialized. According to{' '}
            <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
              TikTok Support
            </a>
            , the well-crafted criterion asks for <strong>1080p or higher</strong>,
            clear visuals, refined editing and a length of more than one minute. Both
            pages checked {CHECKED}.
          </p>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
            Neither of those two pages states the size of this bonus, so we do not
            quote one. The Creator Academy has a separate article on the Additional
            Reward that we did not use as a source here.
          </p>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          When and how TikTok pays
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          Once your balance reaches the minimum payout threshold of{' '}
          <strong>$10</strong> (or the local currency equivalent), TikTok pays on the{' '}
          <strong>15th of each month</strong>.{' '}
          <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Support
          </a>{' '}
          calls PayPal currently the only payment method for creators in the United
          States, South Korea, Brazil, the United Kingdom, France and Germany, names
          Payoneer or bank transfer for Japan, and does not mention Mexico. The{' '}
          <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
            Creator Academy
          </a>{' '}
          also mentions Pix and bank accounts as places a withdrawal can land. Both
          pages checked {CHECKED}. For the YouTube side of the same question, see{' '}
          <a href="/when-does-youtube-pay-you" style={LINK}>
            when YouTube pays you
          </a>
          .
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What happened to the Creator Fund
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          TikTok announced the Creator Fund on July 22, 2020, starting with{' '}
          <strong>$200 million</strong> in the US, and said applications from US
          creators would open in August 2020. An update dated July 29 on the same page
          added that TikTok expected the fund to grow to over{' '}
          <strong>$1 billion</strong> in the US in the next 3 years (
          <a href={NEWSROOM_FUND_URL} rel="noopener noreferrer" style={LINK}>
            TikTok Newsroom
          </a>
          , checked {CHECKED}). That announcement set no minimum video length and gave
          no rate per view. We found no TikTok page that published one (checked{' '}
          {CHECKED}).
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          On November 7, 2023,{' '}
          <a href={TECHCRUNCH_URL} rel="noopener noreferrer" style={LINK}>
            TechCrunch reported
          </a>{' '}
          that the fund would be discontinued starting December 16 in the US, UK,
          France and Germany (the article gives no year; 2023 follows from its
          publication date), in favor of the Creativity Program for videos over one
          minute. TechCrunch also reported that, according to TikTok, eligible
          creators could earn &ldquo;up to 20 times the amount previously offered by
          the Creator Fund&rdquo;. That is a press report attributing the claim to
          TikTok, not a published rate, and we found no TikTok page carrying it
          (checked {CHECKED}).
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          As of {CHECKED}, the{' '}
          <a href={SUPPORT_FUND_URL} rel="noopener noreferrer" style={LINK}>
            old Creator Fund support address
          </a>{' '}
          opens only the &ldquo;Monetize on TikTok&rdquo; menu, which lists the Creator
          Rewards Program, TikTok One and Video Gifts. The Creator Fund is not on it.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The honest takeaway
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Anyone who quotes you a fixed TikTok rate per 1,000 views is quoting an
          estimate. What is fixed is the rulebook: videos over <strong>1 minute</strong>,
          original work, an account with 10,000 followers and 100,000 views in 30 days,
          and an audience inside the 8 program countries. If your videos run under a
          minute, the program pays you nothing no matter how many views they get.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          Comparing platforms? YouTube does publish its revenue share for Shorts. See{' '}
          <a href="/how-much-do-youtube-shorts-pay" style={LINK}>
            how much YouTube Shorts pay
          </a>
          .
        </p>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 40px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Make a narrated video longer than a minute
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Kineo turns one typed idea into a narrated vertical video, with script,
            voiceover, visuals and captions, and it can make films longer than 60
            seconds. That does not make a video eligible: TikTok&rsquo;s rules ask for
            content you produced yourself, and the program pages we checked do not say
            how AI-made video is treated. Whether a given video qualifies is decided by
            TikTok, not by the tool you used. Plans are on the{' '}
            <a href="/pricing" style={LINK}>
              pricing page
            </a>
            .
          </p>
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
            Turn an idea into a video →
          </OrganicCtaLink>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          {FAQ.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {item.a}
              </p>
            </section>
          ))}
        </div>

        <div style={{ ...CARD, padding: 22, margin: '0 0 32px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Try one topic as a narrated video
          </h2>
          <p style={{ color: MUTED, lineHeight: 1.7, fontSize: '0.95rem', margin: '0 0 4px' }}>
            Type one topic below and Kineo drafts the script, the narration, the
            visuals and the captions. The first video from this form is a short one,
            under a minute, so on its own it does not meet the length rule described
            above; longer videos are made in the Studio. No earnings and no program
            eligibility are promised: the views and the review are up to TikTok.
          </p>
          <TopicGeneratorForm
            campaign={STARTER_SOURCE}
            source={STARTER_SOURCE}
            formId={PAYOUT_STARTER_ID}
            examples={[
              'Why Veterans Day is always on November 11',
              'The ship that vanished and came back with no crew',
              'What a $10 bill bought in 1950 versus today',
            ]}
            copy={{
              label: 'What should your video be about?',
              placeholder: 'Type one topic, for example the strangest law still on the books',
              submit: 'Turn this topic into a video →',
              examplesLabel: 'Example topics',
              note: 'Your topic stays attached through signup. Plans are on the pricing page.',
            }}
          />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep going
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={LINK}>
              How much do YouTube Shorts pay?
            </a>{' '}
            The same question for YouTube, with the official 45% revenue share.
          </li>
          <li>
            <a href="/when-does-youtube-pay-you" style={LINK}>
              When does YouTube pay you?
            </a>{' '}
            Payment dates and thresholds on the YouTube side.
          </li>
          <li>
            <a href="/can-you-monetize-ai-videos" style={LINK}>
              Can you monetize AI videos?
            </a>{' '}
            What the platforms say about AI-made content and originality.
          </li>
          <li>
            <a href="/pricing" style={LINK}>
              Kineo pricing
            </a>{' '}
            Plans for making narrated videos from an idea.
          </li>
        </ul>

        <section style={{ ...CARD, padding: '18px', margin: '0 0 24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px' }}>
            Sources checked
          </h2>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 10px' }}>
            All pages below were checked on {CHECKED}. TikTok can change program terms;
            its own pages are the authority when a rule changes. Where this page says
            TikTok does not publish something, it means we did not find it on the
            TikTok pages in this list. The two TikTok Support pages were served to us
            in Portuguese, so their rules appear here in our translation, not as
            quotes.
          </p>
          <ul style={{ color: MUTED, lineHeight: 1.8, fontSize: '0.9rem', paddingLeft: 20, margin: 0 }}>
            <li>
              <a href={SUPPORT_PROGRAM_URL} rel="noopener noreferrer" style={LINK}>
                TikTok Support: Creator Rewards Program
              </a>{' '}
              (official). Eligibility, original content rules, how rewards are calculated.
            </li>
            <li>
              <a href={SUPPORT_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
                TikTok Support: how rewards work
              </a>{' '}
              (official). Qualified views, RPM factors, Additional Reward, $10 minimum
              and the 15th pay day.
            </li>
            <li>
              <a href={ACADEMY_URL} rel="noopener noreferrer" style={LINK}>
                TikTok Creator Academy: Creator Rewards Program
              </a>{' '}
              (official). The 8 countries, excluded formats, search views, violation
              thresholds, the &ldquo;as of Spring 2025&rdquo; Additional Reward launch.
            </li>
            <li>
              <a href={NEWSROOM_REWARDS_URL} rel="noopener noreferrer" style={LINK}>
                TikTok Newsroom: introducing the Creator Rewards Program
              </a>{' '}
              (official, March 18, 2024). The rename and the four core metrics.
            </li>
            <li>
              <a href={NEWSROOM_FUND_URL} rel="noopener noreferrer" style={LINK}>
                TikTok Newsroom: the $200 million Creator Fund
              </a>{' '}
              (official, July 22, 2020, with an update dated July 29). The $200
              million start, applications opening in August, and the $1 billion
              expectation from the update.
            </li>
            <li>
              <a href={TECHCRUNCH_URL} rel="noopener noreferrer" style={LINK}>
                TechCrunch, November 7, 2023
              </a>{' '}
              (press report attributing the claim to TikTok, not an official page).
              Creator Fund closing date and the &ldquo;up to 20 times&rdquo; statement.
            </li>
            <li>
              <a href={THIRD_PARTY_URL} rel="noopener noreferrer nofollow" style={LINK}>
                ttcalculator.net
              </a>{' '}
              (third-party estimate, unverified; {THIRD_PARTY_DATED}). The $0.50 to
              $2.00 US RPM estimate, which the site says is based on creator-reported
              figures without showing a sample or method.
            </li>
          </ul>
        </section>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Updated {UPDATED}. TikTok publishes no dollar rate per view; any dollar
          rate per view on this page is a third-party estimate shown for illustration and is
          not a guarantee of income. Actual rewards depend on TikTok&rsquo;s own
          calculation and program terms, which can change at any time.
        </p>
      </div>
    </main>
  )
}
