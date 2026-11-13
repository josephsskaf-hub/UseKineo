// SEO / citações: /how-much-do-instagram-reels-pay. Irmã de
// /how-much-do-youtube-shorts-pay (mesmo molde: server component, force-static,
// tema escuro, FAQPage + BreadcrumbList + Article JSON-LD espelhando o texto
// visível, starter da casa como porta para o produto).
//
// A DIFERENÇA DE FUNDO em relação à irmã: o YouTube publica a regra do rateio
// (45%) e a página de lá estima uma faixa. A Meta NÃO publica valor por 1.000
// views de Reels no Instagram. Então esta página NÃO tem faixa, NÃO tem
// calculadora e NÃO tem tabela de "views x dólares": inventar uma faixa aqui
// seria afirmar o que nenhuma fonte primária diz. A resposta citável é
// exatamente essa ausência, com a fonte ao lado.
//
// REGRA DOS NÚMEROS: cada número do texto tem a fonte primária e a data da
// consulta (13 de novembro de 2026). O que veio da imprensa (fim do Reels Play)
// está marcado como imprensa citando porta-voz, nunca como página oficial.
// Valores por 1.000 views que circulam em blogs NÃO são repetidos aqui: não
// foram conferidos em fonte primária.
//
// REGRA DO "NÃO EXISTE": a página só afirma ausência dentro do que foi lido
// ("the pages checked on 13 November 2026 ..."), nunca "never" nem "the only".
//
// Central de Ajuda: os artigos de bônus ("About Instagram's bonus program
// rules" e "About bonuses on Instagram") e o de requisitos de Subscriptions
// foram conferidos na versão en_US em 13/11/2026, e o texto usa a redação em
// inglês da fonte. O artigo de Gifts foi lido em pt-BR e conferido em en_US na
// revisão do mesmo dia.

import type { Metadata } from 'next'
import OrganicCtaLink from '@/components/OrganicCtaLink'
// O MESMO componente da home e da página irmã, nunca uma cópia.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

const STARTER_SOURCE = 'starter_reels_pay'
const REELS_STARTER_ID = 'reels-start-a-short'

export const dynamic = 'force-static'

const UPDATED = 'November 13, 2026'
const CHECKED = '13 November 2026'
const DATE_PUBLISHED = '2026-11-13'
const DATE_MODIFIED = '2026-11-13'
const CANONICAL_URL = 'https://www.usekineo.com/how-much-do-instagram-reels-pay'

// Fontes primárias (Meta) e a única fonte de imprensa usada.
// Os números do bônus moram DENTRO dos artigos, não no índice
// (help.instagram.com/183392733628561 só mostra títulos recolhidos). Por isso
// a página cita a URL direta de cada artigo e o nomeia no texto.
const IG_BONUS_RULES_URL = 'https://help.instagram.com/708013994693013'
const IG_BONUSES_ABOUT_URL = 'https://help.instagram.com/331274061770840'
const IG_BONUS_RULES_LABEL = "Instagram Help Center, 'About Instagram's bonus program rules'"
const IG_BONUSES_ABOUT_LABEL = "Instagram Help Center, 'About bonuses on Instagram'"
const YOUTUBE_SHORTS_POLICY_URL = 'https://support.google.com/youtube/answer/12504220?hl=en'
// A imagem padrão da casa (a mesma do layout raiz): o openGraph da página
// substitui o do layout inteiro, então sem isto o cartão grande sai sem imagem.
const OG_IMAGE_URL = 'https://www.usekineo.com/og-card.png?v=claro-1001b'
const IG_BONUSES_CREATORS_URL = 'https://creators.instagram.com/earn-money/bonuses'
const IG_EARN_MONEY_URL = 'https://creators.instagram.com/earn-money'
const IG_GIFTS_HELP_URL = 'https://help.instagram.com/738469380549477'
const IG_SUBSCRIPTIONS_HELP_URL = 'https://help.instagram.com/478012211024479'
const META_BONUS_2023_URL =
  'https://about.fb.com/news/2023/11/giving-creators-more-ways-to-earn-money-on-facebook-and-instagram/'
const META_FB_MONETIZATION_2024_URL =
  'https://about.fb.com/news/2024/10/monetize-content-facebooks-new-streamlined-program/'
const META_FAST_TRACK_2026_URL =
  'https://about.fb.com/news/2026/03/creator-fast-track-grow-your-audience-earn-money-on-facebook/'
const TUBEFILTER_REELS_PLAY_URL = 'https://tubefilter.com/2023/03/10/meta-ending-reels-play-bonus-payouts/'

const TITLE = 'How Much Do Instagram Reels Pay Per 1,000 Views in 2026?'

export const metadata: Metadata = {
  title: TITLE,
  description:
    'Instagram publishes no pay rate per 1,000 Reels views. What Meta officially confirms in 2026: invite-only bonuses, Gifts at $0.01 per Star, and Subscriptions.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: TITLE,
    description:
      'Instagram publishes no per-view rate for Reels. See what Meta confirms: invite-only bonuses, Gifts, Subscriptions, and the Facebook programs people confuse with it.',
    url: CANONICAL_URL,
    type: 'article',
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'Kineo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Much Do Instagram Reels Pay in 2026?',
    description:
      'Instagram publishes no rate per 1,000 views. What Meta confirms: invite-only bonuses, Gifts at $0.01 per Star, Subscriptions, and Facebook programs.',
    images: [OG_IMAGE_URL],
  },
}

// A resposta de 2 frases do topo. Uma constante só, usada no texto visível e
// no JSON-LD, para os dois nunca divergirem.
const SHORT_ANSWER =
  'Instagram does not publish a pay rate per 1,000 Reels views, and the Instagram pages checked on 13 November 2026 list no open program that pays every creator by the view. The only view-based payments those pages describe are invite-only bonus tests for select creators in Japan, South Korea and the United States, where Instagram estimates earnings from qualified views and adjusts them for audience demographics and engagement.'

type SourceLink = { label: string; url: string }

const PAY_ROWS: {
  program: string
  where: string
  who: string
  pays: string
  perThousand: string
  sources: SourceLink[]
}[] = [
  {
    program: 'Instagram bonuses (Reels bonus)',
    where: 'Instagram',
    who: 'Invite only. Instagram says bonuses are invite-only for select creators in Japan, South Korea and the United States. For the bonus for reels: at least 5 million views within the previous 3 consecutive calendar months when Instagram checks eligibility, age 18 or older, located and with tax status in one of those countries, and not an aggregator account.',
    pays: 'An amount Instagram estimates from qualified views, adjusted for audience demographics and engagement. Repeat views are excluded at this time.',
    perThousand: 'No official rate published; invited creators see their own Average RPM',
    sources: [
      { label: IG_BONUS_RULES_LABEL, url: IG_BONUS_RULES_URL },
      { label: IG_BONUSES_ABOUT_LABEL, url: IG_BONUSES_ABOUT_URL },
      { label: 'Instagram for Creators', url: IG_BONUSES_CREATORS_URL },
    ],
  },
  {
    program: 'Reels Play bonus',
    where: 'Instagram and Facebook, press-reported in 2023',
    who: 'Press-reported: in March 2023 a Meta spokesperson said Meta would stop extending new and renewed Reels Play deals on Facebook and, "at this time", for US creators on Instagram. No official Meta page checked on 13 November 2026 lists Reels Play.',
    pays: 'Not listed on the Meta pages checked on 13 November 2026.',
    perThousand: 'Not applicable',
    sources: [{ label: 'Tubefilter, quoting a Meta spokesperson (press, not an official page)', url: TUBEFILTER_REELS_PLAY_URL }],
  },
  {
    program: 'Gifts on Reels',
    where: 'Instagram',
    who: 'Professional account, age 18 or older, at least 500 followers, a payout account, and being in a country where Gifts are available. The United States is on the list.',
    pays: '$0.01 for each Star fans send, paid out monthly. This is fan money, not a payment for views.',
    perThousand: 'Not paid per view',
    sources: [{ label: 'Instagram Help Center', url: IG_GIFTS_HELP_URL }],
  },
  {
    program: 'Subscriptions',
    where: 'Instagram',
    who: 'Professional account with at least 10,000 followers, age 18 or older, and being in a country where Subscriptions are available. The United States is on the list.',
    pays: 'Money from followers who subscribe. The eligibility page states no price and does not tie it to Reels views.',
    perThousand: 'Not paid per view',
    sources: [
      { label: 'Instagram Help Center, eligibility requirements for Subscriptions', url: IG_SUBSCRIPTIONS_HELP_URL },
      { label: 'Instagram for Creators', url: IG_EARN_MONEY_URL },
    ],
  },
  {
    program: 'Brand deals and partnership ads',
    where: 'Instagram',
    who: 'Instagram lists its creator marketplace and partnership ads as ways to earn. Each has its own eligibility rules, which this page does not cover.',
    pays: 'Set between you and the brand. The page checked states no rate.',
    perThousand: 'No official rate published',
    sources: [{ label: 'Instagram for Creators, earn money', url: IG_EARN_MONEY_URL }],
  },
  {
    program: 'Facebook Content Monetization',
    where: 'Facebook, not Instagram',
    who: "Launched in beta on October 2, 2024, starting with invitations to one million creators. As of Meta's March 18, 2026 post it is still invite only, and creators can express interest through their Professional Dashboard in the Facebook mobile app.",
    pays: 'Performance-based payouts for Reels, longer videos, photos and text posts published on Facebook.',
    perThousand: 'No official rate published',
    sources: [
      { label: 'Meta Newsroom, October 2, 2024', url: META_FB_MONETIZATION_2024_URL },
      { label: 'Meta Newsroom, March 18, 2026', url: META_FAST_TRACK_2026_URL },
    ],
  },
  {
    program: 'Creator Fast Track',
    where: 'Facebook, not Instagram',
    who: 'Announced on March 18, 2026 for creators in the program with at least 100,000 followers on Instagram, TikTok or YouTube who share eligible reels on Facebook. We did not confirm whether it is still accepting creators on 13 November 2026.',
    pays: 'Meta says it was announced with three months of what it calls guaranteed pay: $1,000 per month with at least 100,000 followers, $3,000 per month with more than 1 million. A flat monthly amount.',
    perThousand: 'Not paid per view',
    sources: [{ label: 'Meta Newsroom, March 18, 2026', url: META_FAST_TRACK_2026_URL }],
  },
]

const BONUS_RULES: { title: string; detail: string }[] = [
  {
    title: 'It is a test, and it is invite only',
    detail:
      "In 'About bonuses on Instagram', Instagram says it is testing bonuses: by invitation only, for a limited time, with availability in different countries, and with an element of random selection. The page describes no public application. Instagram says it will announce when it is ready to offer public eligibility.",
  },
  {
    title: 'Invite only, and a high bar to be considered',
    detail:
      "In 'About Instagram's bonus program rules', Instagram says bonuses are invite-only for select creators in Japan, South Korea and the United States. There are two: a bonus for reels and a bonus for photo and carousel posts. For the bonus for reels you must have at least 5 million views within the previous 3 consecutive calendar months when Instagram checks eligibility, be at least 18, be located and have tax status in Japan, South Korea or the US, and not be an aggregator account. Instagram also says not all eligible creators will be selected. The same article lists monthly view minimums for the photo and carousel bonus (Japan 500K, South Korea 1M, US 5M, for 3 consecutive months) and also for other regions (UK, Australia, Canada, New Zealand, Sweden, Denmark, Finland, Norway, Ireland, South Africa), so the country list is not fully consistent in Instagram's own text.",
  },
  {
    title: 'The amount is an estimate, and the rate is not public',
    detail:
      'Instagram says it estimates your approximate earnings from the number of qualified views, then adjusts for audience demographics and engagement. Repeat views are excluded at this time. Invited creators see an Average RPM in their dashboard, which Instagram defines as the average rewards per 1,000 qualified views. Instagram publishes no value for it and says the earnings rate may vary over time.',
  },
  {
    title: 'What counts and what does not',
    detail:
      'Each reel or post can earn for up to 28 days after it is shared. The most recent 150 pieces of content are eligible in each 2-week bonus period. For the reels bonus only original content is counted. Branded content, boosted content and collaborative reels and posts are excluded.',
  },
  {
    title: 'It can end',
    detail:
      'Instagram says it may end bonus programs as it tests and learns, and that you get a notification if the program you are in ends.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much do Instagram Reels pay per 1,000 views in 2026?',
    a: 'There is no official number. Instagram does not publish a pay rate per 1,000 Reels views, and the Instagram pages checked on 13 November 2026 list no open program that pays every creator by the view. The only view-based payments those pages describe are invite-only bonus tests for select creators in Japan, South Korea and the United States. Invited creators see an Average RPM in their dashboard, which Instagram defines as the average rewards per 1,000 qualified views, but Instagram publishes no value for it and says the earnings rate may vary over time.',
  },
  {
    q: 'Does Instagram pay you for Reels views?',
    a: 'Only if you were invited to a bonus program. Instagram says it is testing bonuses by invitation only, for a limited time, with availability in different countries, and the pages checked on 13 November 2026 describe no public application. Those pages describe no payment for Reels views without an invite.',
  },
  {
    q: 'How many views do you need to get paid for Instagram Reels?',
    a: 'To be eligible for an invitation to the bonus for reels, Instagram requires at least 5 million views within the previous 3 consecutive calendar months when it checks eligibility, plus being at least 18, being located and having tax status in Japan, South Korea or the US, and not being an aggregator account. Meeting those conditions does not guarantee an invite: Instagram says not all eligible creators will be selected.',
  },
  {
    q: 'How much do Instagram Reels pay for 1 million views?',
    a: 'Instagram publishes no figure for 1 million views, so any exact dollar amount you see is not an official rate. Amounts shared online are creator-reported or third-party estimates, and no Meta page checked on 13 November 2026 states one.',
  },
  {
    q: 'Is the Reels Play bonus still available?',
    a: 'According to press coverage, not for US creators. In March 2023 a Meta spokesperson told the press that Meta would stop extending new and renewed Reels Play deals for creators on Facebook and, "at this time", for US creators on Instagram. That statement was reported by Tubefilter on March 10, 2023; it is press coverage of a spokesperson, not an official Meta page. We found no Meta page on 13 November 2026 that offers Reels Play, and no official statement on its current status.',
  },
  {
    q: 'How much do Instagram Gifts pay?',
    a: 'Instagram pays creators $0.01 for each Star received from fans on reels, paid out monthly. You need a professional account, to be 18 or older, at least 500 followers, a payout account, and to be in a country where Gifts are available, which includes the United States. Gifts are money from fans, not a payment for views.',
  },
  {
    q: 'Is Facebook Reels pay the same as Instagram Reels pay?',
    a: 'No. Facebook Content Monetization and Creator Fast Track are Facebook programs for content published on Facebook. Meta says Creator Fast Track, announced on March 18, 2026, was offered with three months of what it calls guaranteed pay for sharing eligible reels on Facebook: $1,000 per month for creators in the program with at least 100,000 followers on Instagram, TikTok or YouTube and $3,000 per month for those with more than 1 million. We did not confirm whether it is still accepting creators on 13 November 2026. Neither program is a per-view payment for Reels posted on Instagram.',
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
const TD = { padding: '14px 16px', color: '#d2d2d7', verticalAlign: 'top', lineHeight: 1.55 } as const

export default function HowMuchDoInstagramReelsPayPage() {
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
        name: 'How Much Do Instagram Reels Pay',
        item: CANONICAL_URL,
      },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Much Do Instagram Reels Pay Per 1,000 Views? (2026)',
    description: metadata.description,
    abstract: SHORT_ANSWER,
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
    about: ['Instagram Reels earnings', 'Instagram bonuses', 'Instagram Gifts', 'Creator monetization'],
    citation: [
      IG_BONUS_RULES_URL,
      IG_BONUSES_ABOUT_URL,
      IG_BONUSES_CREATORS_URL,
      IG_EARN_MONEY_URL,
      IG_GIFTS_HELP_URL,
      IG_SUBSCRIPTIONS_HELP_URL,
      META_BONUS_2023_URL,
      META_FB_MONETIZATION_2024_URL,
      META_FAST_TRACK_2026_URL,
      TUBEFILTER_REELS_PLAY_URL,
      YOUTUBE_SHORTS_POLICY_URL,
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
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>How Much Do Instagram Reels Pay</span>
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
          How Much Do Instagram Reels Pay Per 1,000 Views? (2026)
        </h1>
        <p style={{ color: '#d2d2d7', fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          {SHORT_ANSWER}
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 18px' }}>
          No figure on this page is a promise of earnings. Every number below links to
          the page it came from, checked on {CHECKED}.
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
            Verified against Meta pages · {UPDATED}
          </p>
          <h2 id="verified-answer" style={{ fontSize: '1.25rem', fontWeight: 750, margin: '0 0 14px' }}>
            What Meta confirms, and what it does not say
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Official:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Instagram is testing bonuses by invitation only, for a limited time.
                Instagram says bonuses are invite-only for select creators in Japan,
                South Korea and the United States.{' '}
                <a href={IG_BONUSES_ABOUT_URL} rel="noopener noreferrer" style={LINK}>
                  {IG_BONUSES_ABOUT_LABEL}
                </a>{' '}
                and{' '}
                <a href={IG_BONUS_RULES_URL} rel="noopener noreferrer" style={LINK}>
                  {IG_BONUS_RULES_LABEL}
                </a>
                , checked on {CHECKED}.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Official:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Invited creators see an Average RPM in their dashboard, which Instagram
                defines as the average rewards per 1,000 qualified views. Instagram
                publishes no value for it and says the earnings rate may vary over time.{' '}
                <a href={IG_BONUS_RULES_URL} rel="noopener noreferrer" style={LINK}>
                  {IG_BONUS_RULES_LABEL}
                </a>
                , checked on {CHECKED}.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Official:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Gifts pay creators $0.01 for each Star fans send on reels. That is fan
                money, not a payment for views.{' '}
                <a href={IG_GIFTS_HELP_URL} rel="noopener noreferrer" style={LINK}>
                  Instagram Help Center, gifts
                </a>
                , checked on {CHECKED}.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Not published:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                A dollar amount per 1,000 Reels views. None of the Meta pages listed at
                the bottom of this page states one.
              </span>
            </div>
            <div>
              <strong style={{ color: '#f5f5f7' }}>Unverified:</strong>{' '}
              <span style={{ color: '#d2d2d7', lineHeight: 1.65 }}>
                Per-view figures on blogs and social posts are creator-reported or
                third-party estimates. No Meta page checked on {CHECKED} states them, so
                this page does not repeat them.
              </span>
            </div>
          </div>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Why there is no public per-view rate for Reels
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          YouTube publishes how it shares Shorts ad revenue with eligible partner
          program creators (
          <a href={YOUTUBE_SHORTS_POLICY_URL} rel="noopener noreferrer" style={LINK}>
            YouTube Help, Shorts monetization policies
          </a>
          , checked on {CHECKED}). On the Instagram pages we checked, we found no
          equivalent ad revenue sharing program for Instagram Reels that is open to all
          creators.{' '}
          <a href={IG_EARN_MONEY_URL} rel="noopener noreferrer" style={LINK}>
            Instagram&rsquo;s own list of ways to earn
          </a>{' '}
          is bonuses, subscriptions, gifts, the creator marketplace for brand work,
          partnership ads and badges, checked on {CHECKED}. None of them is described
          as a fixed payment per view.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          So the honest answer to &ldquo;how much per 1,000 views&rdquo; is that
          Instagram gives no public answer. What the pages describe is a set of separate
          programs, each with its own entry rule, and the only ones that look at views
          are the invite-only bonuses.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          Programs people mean by &ldquo;Reels pay&rdquo;, and what each source says
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Every row links to its source. All sources were checked on {CHECKED}.
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={TH}>Program</th>
                <th style={TH}>Who can get it</th>
                <th style={TH}>What it pays</th>
                <th style={{ ...TH, color: ACCENT, fontWeight: 700 }}>Rate per 1,000 views</th>
                <th style={TH}>Source</th>
              </tr>
            </thead>
            <tbody>
              {PAY_ROWS.map((row) => (
                <tr key={row.program} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ ...TD, color: '#f5f5f7', fontWeight: 700 }}>
                    {row.program}
                    <span style={{ display: 'block', color: MUTED, fontWeight: 400, fontSize: '0.82rem', marginTop: 4 }}>
                      {row.where}
                    </span>
                  </td>
                  <td style={TD}>{row.who}</td>
                  <td style={TD}>{row.pays}</td>
                  <td style={{ ...TD, color: ACCENT, fontWeight: 700 }}>{row.perThousand}</td>
                  <td style={{ ...TD, fontSize: '0.85rem' }}>
                    {row.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        rel="noopener noreferrer"
                        style={{ ...LINK, display: 'block', marginBottom: 6 }}
                      >
                        {s.label}
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          &ldquo;No official rate published&rdquo; means the source describes the program
          but gives no dollar amount per view. It does not mean the program pays nothing.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How the invite-only Reels bonus works
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          All five points come from two Help Center articles, read in English (US):{' '}
          <a href={IG_BONUS_RULES_URL} rel="noopener noreferrer" style={LINK}>
            {IG_BONUS_RULES_LABEL}
          </a>{' '}
          for the numbers, and{' '}
          <a href={IG_BONUSES_ABOUT_URL} rel="noopener noreferrer" style={LINK}>
            {IG_BONUSES_ABOUT_LABEL}
          </a>{' '}
          for the test and invitation rules, both checked on {CHECKED}.{' '}
          <a href={IG_BONUSES_CREATORS_URL} rel="noopener noreferrer" style={LINK}>
            Instagram for Creators
          </a>{' '}
          repeats that bonuses are limited-time and invite only.
        </p>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 20px' }}>
          {BONUS_RULES.map((rule, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{rule.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {rule.detail}
              </p>
            </section>
          ))}
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          The three countries are not new. In November 2023 Meta announced an
          invite-only bonus on Instagram for creators in the United States, South Korea
          and Japan, paid on reels plays and photo views during the bonus period, and its
          April 3, 2024 update kept the program invite only in the same three countries.{' '}
          <a href={META_BONUS_2023_URL} rel="noopener noreferrer" style={LINK}>
            Meta Newsroom
          </a>
          , checked on {CHECKED}. The same post has a February 5, 2024 update about a
          test of Instagram Ads on Profile in the United States, Canada, Australia,
          South Korea and Japan, where a select group of invited creators could earn
          from ad placements on their profile. We found no current status for that test
          on the pages checked.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What a Meta spokesperson said about Reels Play in 2023
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Reels Play was an earlier Reels bonus. In March 2023 a Meta spokesperson said
          the company would stop extending new and renewed Reels Play deals for creators
          on Facebook and, &ldquo;at this time&rdquo;, for US creators on Instagram. We
          found no Meta page in November 2026 that offers Reels Play, and no official
          statement on its current status.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Source:{' '}
          <a href={TUBEFILTER_REELS_PLAY_URL} rel="noopener noreferrer" style={LINK}>
            Tubefilter, March 10, 2023
          </a>
          , quoting a Meta spokesperson. This is press coverage, not an official Meta
          page, checked on {CHECKED}. The statement is more than three years old, so
          this page only repeats what the spokesperson said then and does not state what
          Reels Play is today.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Money that does not depend on views
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 32px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>Gifts on Reels</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: '0 0 8px' }}>
              Fans buy Stars and send gifts on your reels. Instagram pays you $0.01 for
              each Star received, once a month. To qualify you need a professional
              account, to be 18 or older, at least 500 followers, a payout account, and
              to be in a country where Gifts are available, which includes the United
              States.
              Collaborative posts and accounts with content made for children are
              excluded.
            </p>
            <p style={{ color: MUTED, lineHeight: 1.55, fontSize: '0.9rem', margin: 0 }}>
              Instagram takes a share when the viewer buys the Stars, and the mobile app
              store charges its own in-app purchase fee, which Instagram says is
              typically 30%.{' '}
              <a href={IG_GIFTS_HELP_URL} rel="noopener noreferrer" style={LINK}>
                Instagram Help Center
              </a>
              , checked on {CHECKED}.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>Subscriptions</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Instagram describes Subscriptions as a way to monetize your video and audio
              content. It requires a professional account with at least 10,000
              followers, age 18 or older, and being in a country where Subscriptions are
              available, which includes the United States. The eligibility page states
              no price.{' '}
              <a href={IG_SUBSCRIPTIONS_HELP_URL} rel="noopener noreferrer" style={LINK}>
                Instagram Help Center, eligibility requirements for Subscriptions
              </a>
              , checked on {CHECKED}.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>Brand work</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Instagram lists its creator marketplace and partnership ads as ways to earn
              by working with brands. Each has its own eligibility rules, which this page
              does not cover. The page checked states no rate for it.{' '}
              <a href={IG_EARN_MONEY_URL} rel="noopener noreferrer" style={LINK}>
                Instagram for Creators
              </a>
              , checked on {CHECKED}.
            </p>
          </section>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          Facebook Reels are a different program
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Facebook has its own programs, and they are not Instagram programs. On
          October 2, 2024 Meta launched Facebook Content Monetization in beta, merging
          In-stream ads, Ads on Reels and the Performance Bonus into one program with
          performance-based payouts. It started with invitations to one million
          creators. As of Meta&rsquo;s March 18, 2026 post it is still invite only, and
          creators can express interest through their Professional Dashboard in the
          Facebook mobile app.{' '}
          <a href={META_FB_MONETIZATION_2024_URL} rel="noopener noreferrer" style={LINK}>
            Meta Newsroom, October 2, 2024
          </a>{' '}
          and{' '}
          <a href={META_FAST_TRACK_2026_URL} rel="noopener noreferrer" style={LINK}>
            Meta Newsroom, March 18, 2026
          </a>
          , checked on {CHECKED}.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Meta said in the October 2024 post that Facebook had paid creators more than $2
          billion in the past year, and said in March 2026 that Facebook paid creators
          nearly $3 billion in 2025. Those are Facebook totals across all creators.
          Neither post gives an amount per view.{' '}
          <a href={META_FB_MONETIZATION_2024_URL} rel="noopener noreferrer" style={LINK}>
            Meta Newsroom, October 2, 2024
          </a>{' '}
          and{' '}
          <a href={META_FAST_TRACK_2026_URL} rel="noopener noreferrer" style={LINK}>
            Meta Newsroom, March 18, 2026
          </a>
          , checked on {CHECKED}.
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
            A flat monthly offer on Facebook, not Instagram
          </p>
          <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.65, margin: '0 0 10px' }}>
            Meta says Creator Fast Track, announced on March 18, 2026, was offered with
            three months of what it calls guaranteed pay to creators in the program. It
            is for eligible reels shared on Facebook, not Instagram, and it requires at
            least 100,000 followers on Instagram, TikTok or YouTube. Meta stated $1,000
            per month at that level and $3,000 per month for creators with more than 1
            million followers on at least one of those platforms. We did not confirm
            whether it is still accepting creators on {CHECKED}.
          </p>
          <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            It is a flat monthly amount, not a rate per 1,000 views, and this page does
            not suggest you would be accepted. The announcement does not list eligible
            countries.{' '}
            <a href={META_FAST_TRACK_2026_URL} rel="noopener noreferrer" style={LINK}>
              Meta Newsroom
            </a>
            , checked on {CHECKED}.
          </p>
        </section>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The honest takeaway
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          If you are planning around a number per 1,000 Reels views, you are planning
          around a number that does not appear on any Instagram page checked on{' '}
          {CHECKED}. Unless you were invited to a bonus, the pages checked describe no
          payment for Reels views on Instagram, so treat those views as reach, not
          revenue. Any money would come from what the reach leads to: fans who send
          gifts or subscribe, brands that pay for access to your audience, or the same
          video posted where a published revenue share exists.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          That last point is practical. A vertical video made for Reels can also be
          posted as a YouTube Short, and YouTube does publish its rules. See{' '}
          <a href="/how-much-do-youtube-shorts-pay" style={LINK}>
            how much YouTube Shorts pay
          </a>
          ,{' '}
          <a href="/when-does-youtube-pay-you" style={LINK}>
            when YouTube pays you
          </a>{' '}
          and{' '}
          <a href="/can-you-monetize-ai-videos" style={LINK}>
            whether AI videos can be monetized
          </a>
          .
        </p>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 40px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            One idea, one vertical video, more than one platform
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Kineo turns one typed idea into a narrated vertical Short, with script,
            voiceover, visuals and captions. You can post the same file to Reels and to
            Shorts. Whether it earns anything depends on the platform rules above and on
            your audience, not on the tool.
          </p>
          <OrganicCtaLink
            href={`#${REELS_STARTER_ID}`}
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
            Turn an idea into a Short →
          </OrganicCtaLink>
          <a
            href="/pricing"
            style={{ ...LINK, display: 'inline-block', marginLeft: 16, fontSize: '0.95rem' }}
          >
            See pricing
          </a>
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

        <div style={{ ...CARD, padding: 22, margin: '0 0 32px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Views come first, on any platform
          </h2>
          <p style={{ color: MUTED, lineHeight: 1.7, fontSize: '0.95rem', margin: '0 0 4px' }}>
            Every program on this page starts with an audience: followers for Gifts and
            Subscriptions, views to be considered for a bonus invite. Kineo turns a topic into a
            finished narrated vertical Short, so you can test ideas without filming.
            Type a topic to start.
          </p>
          <TopicGeneratorForm
            campaign={STARTER_SOURCE}
            source={STARTER_SOURCE}
            formId={REELS_STARTER_ID}
            examples={[
              'Why the Statue of Liberty turned green',
              'How lighthouses worked before electricity',
              'Why some US states have no sales tax',
            ]}
            copy={{
              label: 'Start a Short from one topic',
              placeholder: 'Type one topic, for example why the US has no national language law',
              submit: 'Turn this topic into a Short →',
              examplesLabel: 'Topic starters',
              note: 'Your topic stays attached through signup.',
            }}
          />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep going
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={LINK}>
              How much do YouTube Shorts pay
            </a>
            : the published revenue share and an estimated range per 1,000 views.
          </li>
          <li>
            <a href="/when-does-youtube-pay-you" style={LINK}>
              When does YouTube pay you
            </a>
            : payment dates and thresholds.
          </li>
          <li>
            <a href="/can-you-monetize-ai-videos" style={LINK}>
              Can you monetize AI videos
            </a>
            : what the platform rules say about AI-made content.
          </li>
          <li>
            <a href="/pricing" style={LINK}>
              Kineo pricing
            </a>
          </li>
        </ul>

        <section style={{ ...CARD, padding: '18px', margin: '0 0 24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px' }}>
            Sources checked
          </h2>
          <p style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 10px' }}>
            All pages checked on {CHECKED}. Meta can change program terms at any time;
            these links are the authority when a rule changes. The Instagram Help Center
            bonus and Subscriptions articles were read in English (US).
          </p>
          <ul style={{ color: MUTED, lineHeight: 1.8, fontSize: '0.9rem', paddingLeft: 20, margin: 0 }}>
            <li>
              <a href={IG_BONUS_RULES_URL} rel="noopener noreferrer" style={LINK}>
                {IG_BONUS_RULES_LABEL}
              </a>
              . Official. Invite-only for select creators in Japan, South Korea and the
              United States, the 5 million view requirement for the reels bonus, the
              photo and carousel view minimums by region, how earnings are estimated,
              the Average RPM definition, the 28-day and 150-content rules.
            </li>
            <li>
              <a href={IG_BONUSES_ABOUT_URL} rel="noopener noreferrer" style={LINK}>
                {IG_BONUSES_ABOUT_LABEL}
              </a>
              . Official. Bonuses are a test, by invitation only, for a limited time,
              with an element of random selection, and may end.
            </li>
            <li>
              <a href={IG_BONUSES_CREATORS_URL} rel="noopener noreferrer" style={LINK}>
                Instagram for Creators: bonuses
              </a>
              . Official. Limited time and invite only.
            </li>
            <li>
              <a href={IG_EARN_MONEY_URL} rel="noopener noreferrer" style={LINK}>
                Instagram for Creators: earn money
              </a>
              . Official. The list of ways to earn.
            </li>
            <li>
              <a href={IG_GIFTS_HELP_URL} rel="noopener noreferrer" style={LINK}>
                Instagram Help Center: gifts
              </a>
              . Official. $0.01 per Star, the 500 follower requirement, the 30% app store
              fee.
            </li>
            <li>
              <a href={IG_SUBSCRIPTIONS_HELP_URL} rel="noopener noreferrer" style={LINK}>
                Instagram Help Center: subscriptions
              </a>
              . Official. The 10,000 follower requirement and the list of countries.
            </li>
            <li>
              <a href={META_BONUS_2023_URL} rel="noopener noreferrer" style={LINK}>
                Meta Newsroom, November 6, 2023, updated April 3, 2024
              </a>
              . Official. The invite-only Instagram bonus in the US, South Korea and
              Japan, and the February 5, 2024 update on the Ads on Profile test.
            </li>
            <li>
              <a href={META_FB_MONETIZATION_2024_URL} rel="noopener noreferrer" style={LINK}>
                Meta Newsroom, October 2, 2024
              </a>
              . Official. Facebook Content Monetization, the one million invitations
              and the $2 billion figure.
            </li>
            <li>
              <a href={META_FAST_TRACK_2026_URL} rel="noopener noreferrer" style={LINK}>
                Meta Newsroom, March 18, 2026
              </a>
              . Official. Creator Fast Track, $1,000 and $3,000 per month, and the nearly
              $3 billion figure for 2025.
            </li>
            <li>
              <a href={TUBEFILTER_REELS_PLAY_URL} rel="noopener noreferrer" style={LINK}>
                Tubefilter, March 10, 2023
              </a>
              . Press quoting a Meta spokesperson, not an official page. The March 2023
              statement on new and renewed Reels Play deals.
            </li>
            <li>
              <a href={YOUTUBE_SHORTS_POLICY_URL} rel="noopener noreferrer" style={LINK}>
                YouTube Help: Shorts monetization policies
              </a>
              . Official. Used only for the comparison with YouTube Shorts ad revenue
              sharing.
            </li>
          </ul>
        </section>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Updated {UPDATED}. Nothing on this page is a guarantee of income. Instagram and
          Facebook program terms, eligibility and availability can change at any time,
          and an invite to a bonus program is decided by Instagram.
        </p>
      </div>
    </main>
  )
}
