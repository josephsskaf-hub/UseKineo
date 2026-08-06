// PUSH #96 — /how-to-start-a-faceless-youtube-channel: top-of-funnel entry
// point for the keyword-gap cluster. Its job is to funnel into the format pages
// (/reddit-story-video-generator, /brainrot-video-generator) and the pipeline
// hub (/youtube-automation), plus the existing money cluster.
//
// Structured as a phased plan with checklists — deliberately unlike the other
// three PUSH #96 pages, which use step cards, spec tables and a hub grid.
//
// Sourced claims:
//  - YPP thresholds: support.google.com/youtube/answer/72851
//  - Shorts cap of 3 minutes: support.google.com/youtube/answer/10059070
//  - Inauthentic / reused content wording, renamed 2025-07-15:
//    support.google.com/youtube/answer/1311392
//  - AI disclosure scope (what does and does not require disclosure; disclosure
//    does not affect monetization eligibility):
//    support.google.com/youtube/answer/14328491
//  - Automatic AI labels from 2026-05-27, overlay on Shorts:
//    blog.youtube/news-and-events/improving-ai-labels-viewers-creators/
// No invented statistics. Time estimates are described as planning assumptions.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'push96_start_faceless_channel'
const UPDATED = 'July 2026'

const YPP_REQUIREMENTS = 'https://support.google.com/youtube/answer/72851?hl=en'
const MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392?hl=en'
const SHORTS_SPEC = 'https://support.google.com/youtube/answer/10059070?hl=en'
const AI_DISCLOSURE = 'https://support.google.com/youtube/answer/14328491?hl=en'
const AI_LABEL_ANNOUNCEMENT = 'https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/'

export const metadata: Metadata = {
  title: 'How to Start a Faceless YouTube Channel (2026 Step-by-Step Plan)',
  description:
    'A phased plan for starting a faceless YouTube channel: the three decisions you only make once, a ten-video test, what to measure instead of views, the real monetization thresholds, and the AI disclosure rules that apply from day one.',
  alternates: { canonical: `${BASE}/how-to-start-a-faceless-youtube-channel` },
  openGraph: {
    title: 'How to Start a Faceless YouTube Channel (2026 Step-by-Step Plan)',
    description:
      'Three decisions, a ten-video test, the metrics that matter before subscribers do, and an honest account of how long the monetization thresholds take.',
    url: `${BASE}/how-to-start-a-faceless-youtube-channel`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Start a Faceless YouTube Channel (2026)',
    description:
      'A phased, honest plan — decisions, a ten-video test, real thresholds and the disclosure rules.',
  },
}

const SUBSCRIBER_THRESHOLD = 1_000
const WATCH_HOURS_THRESHOLD = 4_000
const SHORTS_VIEWS_THRESHOLD = 10_000_000
const SHORTS_MAX_SECONDS = 180

type Phase = {
  label: string
  title: string
  goal: string
  tasks: readonly string[]
}

const PHASES: readonly Phase[] = [
  {
    label: 'Phase 0',
    title: 'Decide before you build anything',
    goal: 'Leave this phase with a format you could still be making in six months.',
    tasks: [
      'Write down ten episode titles in your chosen format. If you struggle past six, the format is too narrow — pick again now, not after the channel art.',
      'Check that visuals exist for it. A format about a topic with no footage, no maps, no diagrams and no archive material will become an editing problem every single week.',
      'Check that you can verify it. If every episode needs a claim you cannot source, you are choosing between being slow and being wrong.',
      'Decide the length. Shorts are capped at three minutes; long-form has no ceiling and a completely different monetization route. Many faceless channels end up running both, but start with one.',
    ],
  },
  {
    label: 'Phase 1',
    title: 'Set the channel up in an afternoon',
    goal: 'Everything here is reversible except the habits, so do not spend a week on it.',
    tasks: [
      'Create the channel on a Google account you will still control in three years, and turn on two-step verification before you upload anything.',
      'Name it after the subject, not after yourself. A faceless channel that grows gets handed to a topic-led search result, not to a personal brand.',
      'Write a channel description a stranger can parse in one line: what the videos are about and how often they arrive.',
      'Set a banner and an avatar that are legible at thumbnail size. You will replace both once you know what the channel actually is.',
      'Do not buy anything yet. No course, no channel, no logo package, no "done-for-you" arrangement.',
    ],
  },
  {
    label: 'Phase 2',
    title: 'Make ten videos before you judge anything',
    goal: 'Ten is the number where your own process stops being the variable.',
    tasks: [
      'Build one repeatable structure and reuse the structure, not the script. A recognisable shape is what turns uploads into a show.',
      'Write the hook last. It is the only sentence with an outsized effect on whether anything else gets watched, and it is easier to write once you know what the payoff is.',
      'Keep a source line for every checkable claim, even if you never publish them. This is the habit that separates a channel that lasts from one that gets a correction in the comments.',
      'Time your production. If a video takes six hours, the schedule you are imagining is not real. Automate the mechanical steps until the number is one you can repeat.',
      'Publish on a cadence you can hold on a bad week, not a good one.',
    ],
  },
  {
    label: 'Phase 3',
    title: 'Read the data, change one thing',
    goal: 'Views are the output. Retention is the input you can actually act on.',
    tasks: [
      'Open the retention curve, not the view count. The first drop tells you whether the hook worked; a mid-video cliff tells you where the script sags.',
      'Compare your ten videos against each other, not against someone else’s channel. The only useful comparison is your own baseline.',
      'Change one variable per batch — hook style, or length, or thumbnail treatment. Change three and you learn nothing.',
      'Read the comments for the questions people ask. Those questions are your next five episodes and they are free.',
    ],
  },
  {
    label: 'Phase 4',
    title: 'Only now think about money',
    goal: 'Ad revenue is a milestone, not a starting condition.',
    tasks: [
      'Check the current Partner Program requirements yourself rather than trusting a number in a video.',
      'Assume the first months earn nothing. Build the channel so that is survivable.',
      'Understand that your niche affects earnings more than your upload count does once you are monetized.',
      'Treat brand deals, affiliate links and your own product as the part of the income that you control.',
    ],
  },
]

type Decision = { question: string; options: string; how: string }

const DECISIONS: readonly Decision[] = [
  {
    question: 'Shorts, long-form, or both?',
    options: 'Shorts reach faster and pay less per view. Long-form reaches slower and reaches monetization on a much smaller number.',
    how: 'Pick the one that matches the material. A topic that resolves in ninety seconds is a Short; a topic that needs build-up is not, and forcing it into three minutes ruins both.',
  },
  {
    question: 'Narrated, text-on-screen, or documentary-style?',
    options: 'Narration carries story and argument. Text-on-screen carries lists and facts. Documentary-style needs footage you can actually license.',
    how: 'Choose the one whose weekly workload you can sustain, then keep it fixed for at least ten videos so you can tell whether the format or the topic was the problem.',
  },
  {
    question: 'One niche or a broad channel?',
    options: 'A narrow channel is easier to recommend and easier to run out of ideas in. A broad one is the opposite.',
    how: 'Start narrow enough that ten episode titles come easily, and broad enough that a hundred are conceivable. If both are true, that is your niche.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Can you actually start a YouTube channel without showing your face?',
    a: 'Yes, and it is an ordinary way to run a channel rather than a workaround. A faceless channel combines a written script, narration, licensed or generated visuals and captions. YouTube has no policy requiring a creator to appear on camera; what it has policies about is originality, accuracy and rights.',
  },
  {
    q: 'How many videos should I make before deciding whether it is working?',
    a: 'Ten in the same format is a reasonable minimum, because before that your own production process is still the largest variable. What you are looking for at ten is not a hit — it is whether your retention curve has improved, whether production time has fallen, and whether you still want to make the eleventh.',
  },
  {
    q: 'How long does it take to get monetized?',
    a: `Honestly: longer than most videos on the subject suggest, and it varies too much to put a number on. The requirements are ${SUBSCRIBER_THRESHOLD.toLocaleString('en-US')} subscribers plus either ${WATCH_HOURS_THRESHOLD.toLocaleString('en-US')} valid public watch hours in twelve months or ${(SHORTS_VIEWS_THRESHOLD / 1_000_000).toFixed(0)} million valid public Shorts views in ninety days. Plan the channel so that the first several months earning nothing does not stop you.`,
  },
  {
    q: 'Will using AI stop my faceless channel being monetized?',
    a: 'No. YouTube does not deny monetization because AI was used. It denies monetization to content that is inauthentic, mass-produced, repetitious, or reused from another source without substantive modification — tests that apply to human-made content identically. The rule of thumb that follows is simple: automate production, not judgement.',
  },
  {
    q: 'Do I need to disclose AI narration or AI visuals?',
    a: 'YouTube requires disclosure for realistic altered or synthetic content — making a real person appear to say or do something they did not, or depicting a realistic event that did not happen. Script writing, caption generation and voiceover assistance are listed as production help that does not require disclosure. Separately, since 27 May 2026 YouTube applies an AI label automatically where its systems detect significant photorealistic AI use, shown as an overlay on Shorts. Disclosure does not affect monetization eligibility.',
  },
  {
    q: 'How long can a faceless Short be?',
    a: `YouTube caps Shorts at ${SHORTS_MAX_SECONDS} seconds. Most faceless Shorts work well below that — the ceiling is rarely the constraint that matters, and a script padded to reach it usually loses the viewer before it gets there.`,
  },
]

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

const NEXT_STEPS: { href: string; title: string; blurb: string }[] = [
  { href: '/reddit-story-video-generator', title: 'The narrated story format', blurb: 'Word budgets, anonymisation and the copyright question, for AITA-style retellings.' },
  { href: '/brainrot-video-generator', title: 'The split-screen format', blurb: 'The 9:16 layout spec and where the background loop can legally come from.' },
  { href: '/youtube-automation', title: 'The full production pipeline', blurb: 'Ten steps scored by how much of each one software can genuinely take.' },
  { href: '/faceless-channel-ideas', title: 'Ten formats compared', blurb: 'Research load, visual availability, repeatability and policy risk, side by side.' },
]

export default function HowToStartAFacelessYouTubeChannelPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to start a faceless YouTube channel',
    description:
      'A five-phase plan: choose a sustainable format, set the channel up, publish ten videos in one structure, read retention rather than views, and only then plan for monetization.',
    step: PHASES.map((phase, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: phase.title,
      text: phase.goal,
      url: `${BASE}/how-to-start-a-faceless-youtube-channel#phase-${index}`,
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'How to Start a Faceless YouTube Channel',
        item: `${BASE}/how-to-start-a-faceless-youtube-channel`,
      },
    ],
  }

  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>How to Start a Faceless YouTube Channel</span>
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
          Beginner plan — updated {UPDATED}
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          How to Start a Faceless YouTube Channel
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 780 }}>
          Not appearing on camera removes one obstacle and none of the others. This is the plan that assumes that: five
          phases, three decisions you only get to make once cheaply, ten videos before you judge anything, and an honest
          account of what the monetization thresholds actually require. Everything here is doable in evenings.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <OrganicCtaLink
            href="/signup?create_intent=fast&intent_campaign=push96_start_faceless_channel"
            source={CAMPAIGN}
            placement="hero"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make video one free →
          </OrganicCtaLink>
          <Link
            href="/niche-picker"
            style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}
          >
            Pick a niche first
          </Link>
        </div>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · No card · Starter $4.90 first month
        </p>

        <h2 style={h2}>The three decisions you make once</h2>
        <p style={p}>
          These are cheap to get right now and expensive to change at video forty. Everything in the phase plan below
          assumes you have answered them.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {DECISIONS.map((d, i) => (
            <section key={d.question} style={{ ...CARD, padding: '18px 20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 750, margin: 0 }}>
                {i + 1}. {d.question}
              </h3>
              <p style={{ ...small, margin: '10px 0 8px' }}>
                <strong style={{ color: '#d2d2d7' }}>The trade-off:</strong> {d.options}
              </p>
              <p style={{ ...small, margin: 0 }}>
                <strong style={{ color: '#d2d2d7' }}>How to decide:</strong> {d.how}
              </p>
            </section>
          ))}
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          Undecided on the third one?{' '}
          <Link href="/niche-picker" style={link}>The niche picker</Link> and{' '}
          <Link href="/faceless-channel-ideas" style={link}>ten formats compared by workload</Link> exist for exactly
          this. On the first, note that Shorts are{' '}
          <a href={SHORTS_SPEC} target="_blank" rel="noopener noreferrer" style={link}>
            capped at {SHORTS_MAX_SECONDS} seconds
          </a>
          , which rules some topics out before you start writing.
        </p>

        <h2 style={h2}>The five phases</h2>
        {PHASES.map((phase, index) => (
          <section key={phase.title} id={`phase-${index}`} style={{ ...CARD, padding: '20px 22px', margin: '0 0 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              {phase.label}
            </div>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', fontWeight: 800, margin: '8px 0 6px' }}>{phase.title}</h3>
            <p style={{ ...small, margin: '0 0 12px' }}>
              <strong style={{ color: '#d2d2d7' }}>Goal:</strong> {phase.goal}
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {phase.tasks.map((task) => (
                <li key={task} style={{ marginBottom: 8 }}>{task}</li>
              ))}
            </ul>
          </section>
        ))}

        <h2 style={h2}>What the monetization thresholds really say</h2>
        <p style={p}>
          Phase 4 above deliberately comes last, and this is why. The{' '}
          <a href={YPP_REQUIREMENTS} target="_blank" rel="noopener noreferrer" style={link}>
            YouTube Partner Program requirements
          </a>{' '}
          are {SUBSCRIBER_THRESHOLD.toLocaleString('en-US')} subscribers plus <em>either</em>{' '}
          {WATCH_HOURS_THRESHOLD.toLocaleString('en-US')} valid public watch hours in the last twelve months from
          long-form and live content, <em>or</em> {SHORTS_VIEWS_THRESHOLD.toLocaleString('en-US')} valid public Shorts
          views in the last ninety days. You also have to live in an eligible country and follow the monetization
          policies.
        </p>
        <p style={p}>
          Read those two options next to each other and one thing jumps out: they are not equivalent. The Shorts route
          asks for a view count most channels never reach, sustained across a rolling window. The long-form route asks
          for a fraction as much attention in absolute terms. That asymmetry is why a lot of faceless creators use Shorts
          for discovery and long-form for the threshold, and it is worth knowing before you decide Shorts-only.
        </p>
        <p style={small}>
          The{' '}
          <Link href="/youtube-automation" style={link}>pipeline hub</Link> works this arithmetic out per day, and{' '}
          <Link href="/how-much-do-youtube-shorts-pay" style={link}>the payout page</Link> covers what the views are worth
          once you are through.
        </p>

        <h2 style={h2}>The honest part</h2>
        <p style={p}>
          Three things are true at once, and most guides only tell you the first. Faceless channels genuinely work —
          there is no policy against them and no algorithmic penalty for not being on camera. Producing them has got
          dramatically cheaper, which is real leverage for one person working evenings. And precisely because of that,
          the volume of near-identical faceless uploads has risen, and YouTube has spent the last two years writing rules
          about it.
        </p>
        <p style={p}>
          On 15 July 2025 the repetitious-content policy was renamed{' '}
          <strong style={{ color: '#f5f5f7' }}>inauthentic content</strong>, describing mass-produced and templated
          uploads directly; the{' '}
          <a href={MONETIZATION_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
            monetization policies
          </a>{' '}
          also exclude anything &ldquo;downloaded or copied from another online source without any substantive
          modifications&rdquo;. On 27 May 2026 YouTube{' '}
          <a href={AI_LABEL_ANNOUNCEMENT} target="_blank" rel="noopener noreferrer" style={link}>
            began applying AI labels automatically
          </a>{' '}
          when its systems detect significant photorealistic AI use, displayed as an overlay on Shorts. Neither change
          bans anything you are planning to do. Both change what &ldquo;good enough&rdquo; means.
        </p>
        <p style={p}>
          The practical conclusion is not discouraging, it is just specific: the cheap part of this business is now
          production, so the scarce part is judgement. Pick topics nobody else picked. Verify what you claim. Write a
          hook a person would actually say out loud. Then let software do the voicing, the matching and the captioning,
          because none of those were ever the thing that made a channel worth subscribing to.
        </p>
        <p style={small}>
          Not legal advice, and not a guarantee of monetization, reach or income. The linked YouTube pages are the
          authority and they change; check them yourself before you rely on anything here.
        </p>

        <h2 style={h2}>Where Kineo fits</h2>
        <p style={p}>
          Kineo is the production layer in Phase 2. Type one topic — or paste a script you wrote — and it produces the
          script structure, the AI voiceover, footage matched line by line and burned-in captions, exported as a
          ready-to-post 9:16 MP4, usually in two to four minutes. You keep the niche decision, the research, the angle
          and the hook, which are the four things that decide whether the channel works. {ft(OFFER, 'A new account can create up to three watermarked Fast videos every 24 hours without a card, which is enough to find out whether your format survives contact with a real video.', OFFER.copy.sentence + ' That is enough to find out whether your format survives contact with a real video.')}
        </p>
        <p style={small}>
          On disclosure: script drafting, caption generation and voiceover assistance are{' '}
          <a href={AI_DISCLOSURE} target="_blank" rel="noopener noreferrer" style={link}>
            listed by YouTube
          </a>{' '}
          as production help that does not require disclosure, and disclosure does not affect monetization eligibility in
          any case. Realistic depictions of real people or real events that did not happen are a different matter.
        </p>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((item) => (
            <section key={item.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{item.a}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>Pick your format next</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {NEXT_STEPS.map((item) => (
            <Link key={item.href} href={item.href} style={{ ...CARD, padding: '16px 18px', textDecoration: 'none', display: 'block' }}>
              <div style={{ fontWeight: 750, color: '#f5f5f7', fontSize: '0.98rem' }}>{item.title}</div>
              <div style={{ color: MUTED, fontSize: '0.88rem', lineHeight: 1.55, marginTop: 6 }}>{item.blurb}</div>
              <div style={{ color: ACCENT, fontSize: '0.85rem', fontWeight: 800, marginTop: 9 }}>Open →</div>
            </Link>
          ))}
        </div>

        <h2 style={h2}>Keep going</h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 32px' }}>
          <li>
            <Link href="/can-you-monetize-ai-videos" style={link}>Can you monetize AI videos?</Link> — the policy
            questions in Phase 4, in full.
          </li>
          <li>
            <Link href="/youtube-shorts-rpm-by-niche" style={link}>Shorts RPM by niche</Link> — the niche decision, seen
            from the earnings side.
          </li>
          <li>
            <Link href="/ai-shorts-without-filming" style={link}>Shorts without filming</Link> — the no-camera workflow
            in detail.
          </li>
          <li>
            <Link href="/faceless-video-generator" style={link}>Faceless video generator</Link> — the tool itself.
          </li>
          <li>
            <Link href="/shorts-money-calculator" style={link}>Shorts money calculator</Link> — model your own numbers
            before you believe anyone else&rsquo;s.
          </li>
        </ul>

        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)',
            border: '1px solid rgba(41,151,255,0.25)',
            borderRadius: 18,
            padding: '34px 22px',
          }}
        >
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>Phase 2 starts with one video.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours — no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href="/signup?create_intent=fast&intent_campaign=push96_start_faceless_channel"
            source={CAMPAIGN}
            placement="final"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Make my first video →
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
