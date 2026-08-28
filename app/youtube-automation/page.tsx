// PUSH #96 — /youtube-automation: the broad-head hub for the keyword-gap
// roadmap. Informational-to-commercial. Its main structural job is internal
// linking: it points at the two format pages and the top-of-funnel page shipped
// in this push, plus the existing money cluster.
//
// Structure is deliberately unlike the two format pages in this push: three
// business models compared, a pipeline table scoring what actually automates,
// the threshold arithmetic, then the hub grid.
//
// Sourced claims:
//  - YPP thresholds (1,000 subscribers + 4,000 valid public watch hours in 12
//    months, OR 1,000 subscribers + 10 million valid public Shorts views in 90
//    days): support.google.com/youtube/answer/72851
//  - "Inauthentic content" rename effective 2025-07-15 and the reused-content
//    wording: support.google.com/youtube/answer/1311392
//  - Automatic AI labels announced 2026-05-27, overlay on Shorts:
//    blog.youtube/news-and-events/improving-ai-labels-viewers-creators/
// The daily-rate figures below are arithmetic on the published thresholds, not
// claims about typical channel performance.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MO } from '@/lib/marketingPrice'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'push96_youtube_automation_hub'
const FORM_ID = 'youtube-automation-first-video'
const UPDATED = 'July 2026'

const YPP_REQUIREMENTS = 'https://support.google.com/youtube/answer/72851?hl=en'
const MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392?hl=en'
const AI_LABEL_ANNOUNCEMENT = 'https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/'
const FTC_BUSINESS_OPPORTUNITY = 'https://consumer.ftc.gov/articles/business-opportunity-scams'

export const metadata: Metadata = {
  title: 'YouTube Automation in 2026 — What It Is, What It Costs, What Breaks',
  description:
    'An honest guide to YouTube automation: the three business models sold under that name, which pipeline steps genuinely automate, the monetization threshold arithmetic nobody prints, and the 2025–2026 policy changes that decide whether an automated channel can earn.',
  alternates: { canonical: `${BASE}/youtube-automation` },
  openGraph: {
    title: 'YouTube Automation in 2026 — What It Is, What It Costs, What Breaks',
    description:
      'Three business models, a pipeline scored step by step, the real threshold math, and the policies that decide whether any of it can be monetized.',
    url: `${BASE}/youtube-automation`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Automation in 2026 | Kineo',
    description:
      'What automates, what does not, what the monetization thresholds actually require per day, and where the scams live.',
  },
}

// Published YPP thresholds. Daily rates below are simple division — they show
// the scale of the requirement, they are not a prediction.
const SHORTS_VIEWS_THRESHOLD = 10_000_000
const SHORTS_WINDOW_DAYS = 90
const WATCH_HOURS_THRESHOLD = 4_000
const WATCH_WINDOW_DAYS = 365
const SUBSCRIBER_THRESHOLD = 1_000

const shortsViewsPerDay = Math.round(SHORTS_VIEWS_THRESHOLD / SHORTS_WINDOW_DAYS)
const watchHoursPerDay = Math.round(WATCH_HOURS_THRESHOLD / WATCH_WINDOW_DAYS)

type Model = {
  name: string
  what: string
  who: string
  reality: string
  risk: 'Lower' | 'Medium' | 'Higher'
}

const MODELS: readonly Model[] = [
  {
    name: 'Solo operator with tools',
    what: 'One person runs one channel and uses software for the steps that are mechanical: drafting, voicing, sourcing visuals, assembling, scheduling.',
    who: 'Anyone starting from zero. This is what most people actually mean when they search the term.',
    reality:
      'The editorial work does not go anywhere — it concentrates. You spend your time on topic selection, angle, accuracy and the hook, and the tools absorb the hours that used to go into voicing and timeline editing.',
    risk: 'Lower',
  },
  {
    name: 'Outsourced production team',
    what: 'A channel owner hires writers, voice talent and editors — often freelancers — and runs the channel as a small publishing operation.',
    who: 'Operators with an audience or a budget who want output beyond one person’s capacity.',
    reality:
      'This is a real business with real management overhead, and the unit cost per video is the number that decides whether it works. It only makes sense once you know what a video earns, which means it is not a starting point.',
    risk: 'Medium',
  },
  {
    name: '“Done-for-you channel” offers',
    what: 'A third party sells you a channel, or a stake in one, and promises to run it for a share of revenue or an up-front fee.',
    who: 'Sold hardest to people who have never uploaded a video.',
    reality:
      'This is where almost all of the term’s bad reputation comes from. Projected earnings in a sales deck are not earnings. Before paying anyone for a channel or a managed-channel investment, read the FTC’s guidance on business-opportunity offers and ask for the disclosure documents it describes.',
    risk: 'Higher',
  },
]

type PipelineStep = {
  step: string
  automates: 'Fully' | 'Mostly' | 'Partly' | 'Barely'
  note: string
}

const PIPELINE: readonly PipelineStep[] = [
  { step: 'Niche and positioning', automates: 'Barely', note: 'A one-time judgement call about what you can sustain for a hundred videos. No tool decides this for you.' },
  { step: 'Topic selection', automates: 'Partly', note: 'Trend data narrows the field; picking the angle that is yours rather than everyone’s is still editorial.' },
  { step: 'Research and fact-checking', automates: 'Barely', note: 'The step people skip and the step that ends channels. Every checkable claim needs a source you actually looked at.' },
  { step: 'Scripting', automates: 'Mostly', note: 'A draft is fast. Making the first two seconds work, and the last two land, is a rewrite you do by hand.' },
  { step: 'Voiceover', automates: 'Fully', note: 'Synthetic narration is production assistance, not a disclosure trigger under YouTube’s rules.' },
  { step: 'Visual sourcing', automates: 'Mostly', note: 'Matching footage per line is automatable. Rights clearance for anything you did not licence is not.' },
  { step: 'Assembly and captions', automates: 'Fully', note: 'Cutting to the voice track and burning in captions is mechanical work. This is where the biggest hour savings sit.' },
  { step: 'Title and thumbnail', automates: 'Partly', note: 'Generated options are a starting point. The choice between them is the highest-leverage decision on the whole video.' },
  { step: 'Publishing and scheduling', automates: 'Fully', note: 'Genuinely solved. Not the bottleneck, and never was.' },
  { step: 'Reading the analytics', automates: 'Barely', note: 'Retention curves tell you where viewers left. Knowing why, and what to change, is the actual skill.' },
]

const AUTOMATES_COLOR: Record<PipelineStep['automates'], string> = {
  Fully: '#30d158',
  Mostly: '#30d158',
  Partly: '#ffb340',
  Barely: '#ff6b6b',
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is YouTube automation?',
    a: 'In practice it means running a channel where you do not appear on camera and where the mechanical production steps — voicing, assembly, captioning, scheduling — are handled by software or by other people. The word "automation" oversells it: topic selection, research, hook writing and analytics reading remain manual, and those are the steps that decide whether the channel works.',
  },
  {
    q: 'Is YouTube automation still profitable in 2026?',
    a: 'A faceless channel can earn. What is no longer true, if it ever was, is that volume alone earns. YouTube’s monetization policies exclude content that is repetitive or mass-produced, and since the July 2025 rename that rule is called the inauthentic content policy. A channel of interchangeable uploads is competing for a smaller and smaller share of distribution while carrying the highest policy risk. A channel with a genuine editorial angle and a repeatable production pipeline is a different proposition entirely.',
  },
  {
    q: 'How many views does an automated channel need to get monetized?',
    a: `The YouTube Partner Program requires ${SUBSCRIBER_THRESHOLD.toLocaleString('en-US')} subscribers plus either ${WATCH_HOURS_THRESHOLD.toLocaleString('en-US')} valid public watch hours in the last 12 months, or ${(SHORTS_VIEWS_THRESHOLD / 1_000_000).toFixed(0)} million valid public Shorts views in the last 90 days. Divided out, the Shorts route averages roughly ${shortsViewsPerDay.toLocaleString('en-US')} views every day for three straight months, and the long-form route averages about ${watchHoursPerDay} watch hours per day for a year. Neither is impossible; both are much larger than the numbers usually quoted alongside the phrase.`,
  },
  {
    q: 'Can an AI-run channel be monetized?',
    a: 'YouTube does not demonetize a video because AI was involved in making it. It denies monetization to content that is inauthentic, mass-produced, repetitious, or reused from another source without substantive modification. Those tests apply identically to human-made content and always have. The practical implication is that automating production is fine and automating judgement is not.',
  },
  {
    q: 'Do automated channels have to disclose AI use?',
    a: 'Disclosure is required for realistic altered or synthetic content — a real person appearing to say or do something they did not, or a realistic depiction of an event that did not happen. Script drafting, caption generation and voiceover assistance are not disclosure triggers. Separately, since 27 May 2026 YouTube automatically applies an AI label where its systems detect significant photorealistic AI use, and on Shorts that label is shown as an overlay on the video.',
  },
  {
    q: 'Should I buy a done-for-you YouTube channel?',
    a: 'Treat it as you would any business-opportunity offer: ask for written earnings substantiation, check who owns the channel and the AdSense account, and read the FTC’s guidance on business-opportunity scams first. The economics of a faceless channel are not secret — you can model them yourself from published RPM ranges and your own production costs before anyone asks you for money.',
  },
]

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

const HUB: { href: string; title: string; blurb: string }[] = [
  { href: '/how-to-start-a-faceless-youtube-channel', title: 'How to start a faceless YouTube channel', blurb: 'The setup, the first ten videos, and what to check before you commit.' },
  { href: '/reddit-story-video-generator', title: 'Reddit story video generator', blurb: 'The narrated-thread format: word budgets, anonymisation, the copyright reality.' },
  { href: '/brainrot-video-generator', title: 'Brainrot video generator', blurb: 'Split-screen: the layout spec and where the background footage can come from.' },
  { href: '/how-much-do-youtube-shorts-pay', title: 'How much do YouTube Shorts pay?', blurb: 'RPM vs CPM and an honestly-labelled payout table from 1K to 10M views.' },
  { href: '/youtube-shorts-rpm-by-niche', title: 'Shorts RPM by niche', blurb: 'Which niches advertisers actually bid on, and why that is the biggest lever.' },
  { href: '/can-you-monetize-ai-videos', title: 'Can you monetize AI videos?', blurb: 'The inauthentic, reused and mass-produced rules, in plain English.' },
  { href: '/faceless-video-generator', title: 'Faceless video generator', blurb: 'The production layer itself: topic in, narrated 9:16 MP4 out.' },
  { href: '/faceless-channel-ideas', title: 'Faceless channel ideas', blurb: 'Ten formats and fifty ideas, compared by research load and policy risk.' },
  { href: '/best-ai-shorts-generators', title: 'Best AI Shorts generators', blurb: 'What the tool landscape actually looks like, including the competition.' },
  { href: '/shorts-money-calculator', title: 'Shorts money calculator', blurb: 'Model your own numbers instead of trusting someone else’s screenshot.' },
]

export default function YouTubeAutomationPage() {
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'YouTube Automation', item: `${BASE}/youtube-automation` },
    ],
  }

  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
  const th: CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    color: MUTED,
    fontWeight: 600,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>YouTube Automation</span>
        </nav>

        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: ACCENT,
            border: '1px solid rgba(41,151,255,0.4)',
            background: 'rgba(41,151,255,0.12)',
            borderRadius: 999,
            padding: '6px 12px',
          }}
        >
          Pipeline guide — updated {UPDATED}
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          YouTube Automation, Honestly
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 780 }}>
          Three quite different businesses get sold under this one phrase, and only one of them is what a beginner is
          looking for. This page separates them, scores every step of the production pipeline by how much of it genuinely
          automates, does the monetization threshold arithmetic that sales pages leave out, and points you at the format
          guides worth reading next.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <OrganicCtaLink
            href={`#${FORM_ID}`}
            source={CAMPAIGN}
            placement="hero"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={FORM_ID}
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make one video free →
          </OrganicCtaLink>
          <Link
            href="/how-to-start-a-faceless-youtube-channel"
            style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}
          >
            Start from zero instead
          </Link>
        </div>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · No card · Starter {STARTER_MO}
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          placement="youtube_automation_inline_form"
          formId={FORM_ID}
          utmSource="seo"
          utmMedium="organic"
          examples={[
            'The automation mistake that makes a faceless channel feel mass-produced',
            'What a human should still decide in an AI video workflow',
            'Why publishing more videos does not automatically grow a channel',
          ]}
          copy={{
            label: 'What should your first faceless Short explain?',
            placeholder: 'Type one topic or paste the script you want to test',
            submit: 'Carry this topic into my first Short →',
            examplesLabel: 'Ideas from this guide',
            note: 'Your topic stays attached through signup. Nothing starts until you submit it.',
          }}
        />

        <h2 style={h2}>Three things called &ldquo;YouTube automation&rdquo;</h2>
        <p style={p}>
          The term is doing too much work. It covers a solo creator using software, a small publishing operation with
          freelancers, and a category of investment offer that has very little to do with either. Deciding which one you
          are looking at is the first useful step.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {MODELS.map((m, i) => (
            <section key={m.name} style={{ ...CARD, padding: '18px 20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 750, margin: 0 }}>
                  {i + 1}. {m.name}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: m.risk === 'Higher' ? '#ff6b6b' : m.risk === 'Medium' ? '#ffb340' : '#30d158',
                  }}
                >
                  {m.risk} risk
                </span>
              </div>
              <p style={{ ...p, fontSize: '0.95rem', margin: '10px 0 8px' }}>{m.what}</p>
              <p style={{ ...small, margin: '0 0 8px' }}>
                <strong style={{ color: '#d2d2d7' }}>Who it suits:</strong> {m.who}
              </p>
              <p style={{ ...small, margin: 0 }}>
                <strong style={{ color: '#d2d2d7' }}>The part that gets left out:</strong> {m.reality}
              </p>
            </section>
          ))}
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          On the third model:{' '}
          <a href={FTC_BUSINESS_OPPORTUNITY} target="_blank" rel="noopener noreferrer" style={link}>
            the FTC&rsquo;s guidance on business-opportunity scams
          </a>{' '}
          is a five-minute read and describes the documentation a legitimate offer has to give you. Nothing here is legal
          or financial advice.
        </p>

        <h2 style={h2}>What actually automates, step by step</h2>
        <p style={p}>
          The honest way to evaluate any tool — including this one — is to ask which of these ten steps it removes from
          your week. The pattern is consistent: everything downstream of a finished script automates well, and everything
          upstream of it barely automates at all.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 620 }}>
            <caption style={{ padding: '14px 16px', color: MUTED, fontSize: '0.82rem', textAlign: 'left' }}>
              A faceless production pipeline, scored by how much of the step software can take.
            </caption>
            <thead>
              <tr>
                <th style={th}>Step</th>
                <th style={th}>Automates</th>
                <th style={th}>Why</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE.map((s) => (
                <tr key={s.step} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '13px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.step}</td>
                  <td style={{ padding: '13px 16px', color: AUTOMATES_COLOR[s.automates], fontWeight: 800, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {s.automates}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#d2d2d7', lineHeight: 1.5, fontSize: '0.9rem' }}>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          Read the red rows as the job description. If a pitch claims to automate niche selection, research and analytics
          interpretation, it is describing something that does not exist.
        </p>

        <h2 style={h2}>The threshold arithmetic</h2>
        <p style={p}>
          You earn nothing from ads until the channel is accepted into the YouTube Partner Program. The{' '}
          <a href={YPP_REQUIREMENTS} target="_blank" rel="noopener noreferrer" style={link}>
            published requirements
          </a>{' '}
          are {SUBSCRIBER_THRESHOLD.toLocaleString('en-US')} subscribers plus one of two view thresholds. Divide them out
          and the scale becomes concrete:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, margin: '0 0 14px' }}>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              Shorts route
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0 4px' }}>
              {shortsViewsPerDay.toLocaleString('en-US')} views / day
            </div>
            <p style={{ ...small, margin: 0 }}>
              {SHORTS_VIEWS_THRESHOLD.toLocaleString('en-US')} valid public Shorts views inside a rolling{' '}
              {SHORTS_WINDOW_DAYS}-day window, averaged out. Sustained for three months, not hit once.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              Long-form route
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, margin: '10px 0 4px' }}>
              ~{watchHoursPerDay} watch hours / day
            </div>
            <p style={{ ...small, margin: 0 }}>
              {WATCH_HOURS_THRESHOLD.toLocaleString('en-US')} valid public watch hours across twelve months. Far more
              reachable for a small channel, which is why many faceless creators run both formats.
            </p>
          </section>
        </div>
        <p style={p}>
          Neither number is out of reach, and neither is a formality. They are the reason &ldquo;post daily and wait for
          the ad revenue&rdquo; is bad advice: at a realistic early-channel view count the Shorts route alone can take a
          very long time, and the long-form route is often the faster door. Once you are through it,{' '}
          <Link href="/youtube-shorts-rpm-by-niche" style={link}>which niche you chose</Link> matters more to your
          earnings than how many videos you published.
        </p>

        <h2 style={h2}>Two policy changes that decide whether this works</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              15 July 2025 — inauthentic content
            </div>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: '10px 0 0' }}>
              YouTube renamed its repetitious-content policy to{' '}
              <strong style={{ color: '#f5f5f7' }}>inauthentic content</strong>. The rule it describes is not new —
              content that is repetitive or mass-produced has never been eligible for monetization, and content
              &ldquo;downloaded or copied from another online source without any substantive modifications&rdquo; has
              never qualified either. What changed is that the name now names the thing. If your plan is to publish
              interchangeable videos at volume, this policy is the plan&rsquo;s ceiling. Read the{' '}
              <a href={MONETIZATION_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
                monetization policies
              </a>{' '}
              in full before you build a workflow around volume.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              27 May 2026 — automatic AI labels
            </div>
            <p style={{ color: '#d2d2d7', lineHeight: 1.65, fontSize: '0.95rem', margin: '10px 0 0' }}>
              YouTube{' '}
              <a href={AI_LABEL_ANNOUNCEMENT} target="_blank" rel="noopener noreferrer" style={link}>
                announced
              </a>{' '}
              that where a creator has not specified whether AI was used, and its systems detect significant
              photorealistic AI use, an AI label is now applied automatically. It also moved the label somewhere viewers
              will see it: directly below the player on long-form, and as an overlay on the video itself for Shorts. This
              does not affect monetization eligibility. It does mean an automated channel should assume its labelling is
              no longer a choice, and should be built to survive a viewer knowing.
            </p>
          </section>
        </div>

        <h2 style={h2}>What a workable version looks like</h2>
        <p style={p}>
          Strip out the promises and the practical shape is unglamorous. You pick one niche you can stand to research for
          a year. You develop a format with a recognisable structure so the channel reads as a show rather than a feed.
          You automate everything downstream of the script and you do not automate the script&rsquo;s judgement. You
          check the retention curve on every upload and change one thing. And you assume the first several months earn
          nothing, because the thresholds above say they will.
        </p>
        <p style={p}>
          That version is a real small media business. The version where you buy a channel, install a tool and collect
          revenue is not one, and the policy page linked above is the reason.
        </p>

        <h2 style={h2}>Read next</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {HUB.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ ...CARD, padding: '16px 18px', textDecoration: 'none', display: 'block' }}
            >
              <div style={{ fontWeight: 750, color: '#f5f5f7', fontSize: '0.98rem' }}>{item.title}</div>
              <div style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.55, marginTop: 6 }}>{item.blurb}</div>
              <div style={{ color: ACCENT, fontSize: '0.85rem', fontWeight: 800, marginTop: 9 }}>Open →</div>
            </Link>
          ))}
        </div>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{item.a}</p>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 44,
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)',
            border: '1px solid rgba(41,151,255,0.25)',
            borderRadius: 18,
            padding: '34px 22px',
          }}
        >
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>Automate the assembly. Keep the judgement.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours — no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={`#${FORM_ID}`}
            source={CAMPAIGN}
            placement="final"
            analyticsEvent="organic_handoff_opened"
            focusTargetId={FORM_ID}
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make my first video →
          </OrganicCtaLink>
        </div>

        <p style={{ ...small, marginTop: 32, marginBottom: 0 }}>
          Threshold figures on this page are YouTube&rsquo;s published Partner Program requirements as of {UPDATED}; the
          per-day numbers are simple division of those thresholds and are not predictions about any channel. Nothing here
          guarantees monetization approval, reach or earnings.
        </p>
      </div>
      <Footer />
    </main>
  )
}
