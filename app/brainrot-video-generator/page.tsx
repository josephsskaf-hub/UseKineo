// PUSH #96 — /brainrot-video-generator: high-volume, lower-intent page for the
// split-screen + TTS format. Deliberately structured differently from the other
// PUSH #96 pages (layout spec table, footage-rights table, label section) so the
// cluster does not read as one template with the noun swapped.
//
// Sourced claims:
//  - Shorts cap of 3 minutes and 1080p max upload resolution:
//    support.google.com/youtube/answer/10059070
//  - Minecraft commercial-video permission and its conditions:
//    minecraft.net/en-us/usage-guidelines
//  - Automatic AI labels, announced 2026-05-27, shown as an overlay on Shorts:
//    blog.youtube/news-and-events/improving-ai-labels-viewers-creators/
//  - Disclosure does not affect monetization eligibility, and the list of things
//    that do NOT require disclosure: support.google.com/youtube/answer/14328491
//  - "Inauthentic content" rename effective 2025-07-15:
//    support.google.com/youtube/answer/1311392
// No invented statistics anywhere on this page.

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
const CAMPAIGN = 'push96_brainrot_generator'
const FORM_ID = 'try-a-brainrot-script'
const FORM_ANCHOR = `#${FORM_ID}`
const UPDATED = 'July 2026'

const SHORTS_SPEC = 'https://support.google.com/youtube/answer/10059070?hl=en'
const MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392?hl=en'
const AI_DISCLOSURE = 'https://support.google.com/youtube/answer/14328491?hl=en'
const AI_LABEL_ANNOUNCEMENT = 'https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/'
const MINECRAFT_GUIDELINES = 'https://www.minecraft.net/en-us/usage-guidelines'
const COPYRIGHT_BASICS = 'https://support.google.com/youtube/answer/2797466?hl=en'

export const metadata: Metadata = {
  title: 'Brainrot Video Generator — Split-Screen Shorts, Done Properly',
  description:
    'Make split-screen brainrot Shorts: AI narration on top, a satisfying loop underneath, captions burned in. Includes the 9:16 layout spec, where the background footage can legally come from, and what YouTube’s automatic AI labels changed in May 2026.',
  alternates: { canonical: `${BASE}/brainrot-video-generator` },
  openGraph: {
    title: 'Brainrot Video Generator — Split-Screen Shorts, Done Properly',
    description:
      'The 9:16 split spec, the footage-rights question everyone skips, and the policy changes that make this the highest-risk faceless format of 2026.',
    url: `${BASE}/brainrot-video-generator`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brainrot Video Generator | Kineo',
    description:
      'Split-screen Shorts with AI narration — the layout spec, the footage-rights reality and the 2026 AI-label rules.',
  },
}

const FORM_EXAMPLES = [
  'Three things about the deep ocean that sound made up',
  'Why aeroplane windows are round',
  'The bank rule that quietly costs people money',
] as const

// 9:16 at 1080p — the frame YouTube accepts for Shorts. Splits below are
// expressed against a 1920px tall canvas so the numbers are directly usable.
const CANVAS_H = 1920
const CANVAS_W = 1080

const SPLITS: { name: string; top: number; use: string }[] = [
  { name: 'Even split', top: 50, use: 'Text or narration visuals on top, gameplay loop underneath. The default, and the most over-used.' },
  { name: 'Content-led', top: 65, use: 'When the top half carries real information — diagrams, footage, an explainer. The loop is background texture only.' },
  { name: 'Loop-led', top: 35, use: 'When the loop is the reason people stop scrolling and the narration is the payoff. Captions have to move to the top third.' },
]

const FOOTAGE_SOURCES: { source: string; verdict: string; detail: string }[] = [
  {
    source: 'Gameplay you recorded yourself',
    verdict: 'Usually workable',
    detail:
      'Depends entirely on the publisher. Mojang’s Minecraft usage guidelines explicitly permit ad revenue on gameplay videos provided you "add enough of your own unique content to the video or stream to make it reasonable for you to make money" and every video is free to view. Most publishers are quieter about it. Read the specific game’s terms before you build a channel on it.',
  },
  {
    source: 'Gameplay ripped from another creator',
    verdict: 'Do not',
    detail:
      'This is the most common shortcut in the format and it is straightforwardly someone else’s video. It exposes you to a copyright strike from the recorder on top of anything the publisher might do, and it is exactly the "copied from another online source" case YouTube’s monetization policies exclude.',
  },
  {
    source: 'Licensed stock loops',
    verdict: 'Clean',
    detail:
      'Slow-motion, macro and abstract stock footage does the same job as a parkour clip for retention purposes and comes with a licence you can point to. Less recognisable, which cuts both ways — no borrowed familiarity, no borrowed liability.',
  },
  {
    source: 'AI-generated background',
    verdict: 'Clean, but label-aware',
    detail:
      'No third-party rights to worry about. If the result is photorealistic, assume it may be labelled as AI — YouTube began applying labels automatically in May 2026 when its systems detect significant photorealistic AI use, even where the creator did not declare it.',
  },
  {
    source: 'Trending music from the Shorts library',
    verdict: 'Read the terms',
    detail:
      'Popular tracks frequently carry Content ID claims that redirect revenue to the rights holder. The video stays up and the views still count; the money goes elsewhere. Check the claim status before you assume a hit is earning.',
  },
]

const BUILD: { n: string; t: string; d: string }[] = [
  {
    n: '1',
    t: 'Write for the ear, not the eye',
    d: 'Short sentences. One idea per sentence. No subordinate clauses, no parentheses, no numbers a listener has to hold in their head. If you would not say it out loud to a friend, a voice model reading it will sound like a voice model reading it.',
  },
  {
    n: '2',
    t: 'Put a real payoff at the end',
    d: 'The format’s reputation for being empty comes from scripts that stop rather than land. Decide the last sentence first, then write towards it. A fact, a reversal, a number that recontextualises the whole clip — anything that makes the previous 40 seconds worth having watched.',
  },
  {
    n: '3',
    t: 'Choose the split before you choose the footage',
    d: `Fix the layout against a ${CANVAS_W}×${CANVAS_H} frame, then pick a loop that survives being cropped to that band. A wide gameplay recording squeezed into the bottom 35% loses everything that made it satisfying.`,
  },
  {
    n: '4',
    t: 'Size the captions for the smaller half',
    d: 'Captions belong in the half carrying the narration, not floating across the seam. If they sit over the loop, they compete with the motion; if they straddle the join, they read as a mistake. Test on an actual phone, at arm’s length, muted.',
  },
  {
    n: '5',
    t: 'Source the background legally, once',
    d: 'Pick a footage source you can defend and reuse it deliberately. Doing this once at the start is cheap. Doing it after a claim lands on a channel with 200 uploads is not.',
  },
  {
    n: '6',
    t: 'Vary something every video',
    d: 'Same intro, same voice, same loop, same structure, only the topic swapped is the pattern YouTube describes as mass-produced and interchangeable. Rotate the structure, the opening device, the visual treatment. The individual video is rarely the problem — the channel-level sameness is.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is a brainrot video?',
    a: 'It is the split-screen short-form format: narration or on-screen text in one half of a 9:16 frame and a looping "satisfying" clip — parkour gameplay, slicing, pressure-washing, sand — in the other, with burned-in captions. The name is affectionate and slightly self-deprecating; the underlying idea is that the second stream of motion keeps a scrolling viewer in place long enough for the narration to land.',
  },
  {
    q: 'Can Kineo make brainrot-style videos?',
    a: 'Kineo generates the narrated half: script, AI voiceover, scene-matched vertical visuals and burned-in captions, exported as a 9:16 MP4. You compose that export against your own background loop in any editor, which also means the background footage is a source you chose and can account for, rather than one a tool picked for you.',
  },
  {
    q: 'How long can a brainrot Short be?',
    a: 'YouTube caps Shorts at three minutes and accepts a maximum upload resolution of 1080p. In practice this format lives well under the cap — the whole premise is that a viewer decided in the first second or two not to scroll, and a two-minute payoff asks a lot of a decision made that quickly.',
  },
  {
    q: 'Is the background gameplay footage legal to use?',
    a: 'It depends on the game and on who recorded it. Mojang publishes usage guidelines that permit monetized Minecraft videos when you add enough of your own content and the videos are free to view; many publishers publish nothing at all. Using another creator’s recording is a separate problem again — that is their video regardless of the publisher’s stance. Licensed stock or AI-generated backgrounds avoid the question entirely.',
  },
  {
    q: 'Do I have to disclose that the video is AI-generated?',
    a: 'YouTube requires disclosure for realistic altered or synthetic content — a real person appearing to say something they did not, or a realistic depiction of an event that did not happen. Script writing, caption generation and voiceover assistance are listed as not requiring disclosure. Separately, since May 2026 YouTube automatically applies an AI label when its systems detect significant photorealistic AI use, and on Shorts that label appears as an overlay on the video. Disclosure itself does not affect monetization eligibility.',
  },
  {
    q: 'Can a brainrot channel be monetized?',
    a: 'It can be eligible, but this is the faceless format most exposed to the inauthentic-content rules. YouTube renamed its repetitious-content policy to "inauthentic content" on 15 July 2025 to describe mass-produced and templated uploads, and a channel of identically-structured split-screens with one variable swapped is close to the description. Varying structure, writing scripts with a genuine payoff and owning your footage sources are what put distance between your channel and that policy.',
  },
]

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const VERDICT_COLOR: Record<string, string> = {
  'Do not': '#ff6b6b',
  'Read the terms': '#ffb340',
  'Usually workable': '#ffb340',
  Clean: '#30d158',
  'Clean, but label-aware': '#30d158',
}

export default function BrainrotVideoGeneratorPage() {
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
      { '@type': 'ListItem', position: 2, name: 'Brainrot Video Generator', item: `${BASE}/brainrot-video-generator` },
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

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 20px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Brainrot Video Generator</span>
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
          Split-screen format guide — updated {UPDATED}
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1.12, margin: '18px 0 0' }}>
          Brainrot Video Generator
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0' }}>
          The split-screen format — narration and captions in one half of a vertical frame, a looping satisfying clip in
          the other. Kineo generates the narrated half from a typed idea: script, AI voice, matched visuals and burned-in
          captions, exported as a 9:16 MP4 you compose against your own background loop. Below: the layout spec, where
          that background can legally come from, and the two policy changes that made this the riskiest faceless format
          to run at scale.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '26px 0 0' }}>
          <OrganicCtaLink
            href={FORM_ANCHOR}
            source={CAMPAIGN}
            placement="hero"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}
          >
            Generate the narrated half →
          </OrganicCtaLink>
          <Link
            href="/pricing"
            style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}
          >
            See pricing
          </Link>
        </div>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos / 24h', OFFER.copy.chip)} · No card · Starter {STARTER_MO}
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          examples={FORM_EXAMPLES}
          formId={FORM_ID}
          copy={{
            label: 'What should the narration be about?',
            placeholder: 'Type one idea, or paste the script you already wrote',
            submit: 'Generate the narrated half →',
            examplesLabel: 'Ideas that survive a 40-second cut',
            note: 'Your text stays attached through signup. Paste a full script and it is narrated verbatim — no card required for the free Fast workflow.',
          }}
        />

        <h2 style={h2}>Why the second half of the frame is there at all</h2>
        <p style={p}>
          The looping clip is not decoration and it is not a joke. Short-form feeds are scrolled with a thumb that has
          already decided, roughly, that nothing is worth stopping for. A second stream of continuous motion gives the
          eye somewhere to rest while the ear catches up with a sentence — which is why the loops that work are always
          the ones with predictable, uninterrupted movement and no cuts. A clip with editing in it competes with your
          narration. A clip with none of it supports the narration.
        </p>
        <p style={p}>
          That also explains the format&rsquo;s failure state. When the narration has nothing in it, the loop is doing
          one hundred percent of the work, and the viewer leaves the moment the motion stops being novel. The half of the
          frame you are generating is the half that has to carry an actual idea.
        </p>

        <h2 style={h2}>The layout spec</h2>
        <p style={p}>
          Shorts are vertical and{' '}
          <a href={SHORTS_SPEC} target="_blank" rel="noopener noreferrer" style={link}>
            accept a maximum upload resolution of 1080p
          </a>
          , which makes {CANVAS_W}×{CANVAS_H} the frame worth composing against. Fix the split first; everything else
          follows from it.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 520 }}>
            <caption style={{ padding: '14px 16px', color: MUTED, fontSize: '0.82rem', textAlign: 'left' }}>
              Three splits that work, measured against a {CANVAS_H}px tall canvas.
            </caption>
            <thead>
              <tr>
                <th style={th}>Split</th>
                <th style={{ ...th, textAlign: 'right' }}>Top band</th>
                <th style={{ ...th, textAlign: 'right' }}>Bottom band</th>
                <th style={th}>When to use it</th>
              </tr>
            </thead>
            <tbody>
              {SPLITS.map((s) => (
                <tr key={s.name} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '13px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.name}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: ACCENT, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {Math.round((CANVAS_H * s.top) / 100)}px
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: '#d2d2d7', whiteSpace: 'nowrap' }}>
                    {Math.round((CANVAS_H * (100 - s.top)) / 100)}px
                  </td>
                  <td style={{ padding: '13px 16px', color: '#d2d2d7', lineHeight: 1.5, fontSize: '0.9rem' }}>{s.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          Keep captions inside one band. Text that crosses the seam reads as a rendering error, and text sitting over a
          moving loop is unreadable on a phone in daylight.
        </p>

        <h2 style={h2}>Where the background footage can come from</h2>
        <p style={p}>
          This is the part of the format that gets skipped, and it is the part that eventually costs someone a channel.
          Every option below is viable; they are not equally safe, and the difference is worth ten minutes of reading
          before you commit.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {FOOTAGE_SOURCES.map((f) => (
            <section key={f.source} style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{f.source}</h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: VERDICT_COLOR[f.verdict] ?? MUTED,
                  }}
                >
                  {f.verdict}
                </span>
              </div>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '8px 0 0' }}>{f.detail}</p>
            </section>
          ))}
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          Primary sources worth reading in full:{' '}
          <a href={MINECRAFT_GUIDELINES} target="_blank" rel="noopener noreferrer" style={link}>
            Minecraft usage guidelines
          </a>{' '}
          and{' '}
          <a href={COPYRIGHT_BASICS} target="_blank" rel="noopener noreferrer" style={link}>
            YouTube&rsquo;s copyright basics
          </a>
          . Neither this page nor any generator is legal advice.
        </p>

        <h2 style={h2}>Two policy changes that reshaped this format</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              15 July 2025
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '8px 0' }}>&ldquo;Repetitious&rdquo; became &ldquo;inauthentic&rdquo;</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
              YouTube renamed the policy that governs mass-produced and templated uploads. The underlying rule was not new
              — content that is repetitive or mass-produced has never been eligible for monetization — but the new name
              describes the split-screen upload farm precisely. Read the{' '}
              <a href={MONETIZATION_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
                channel monetization policies
              </a>{' '}
              yourself; it is a short page and it is the one that matters.
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>
              27 May 2026
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '8px 0' }}>AI labels became automatic, and visible on Shorts</h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
              YouTube{' '}
              <a href={AI_LABEL_ANNOUNCEMENT} target="_blank" rel="noopener noreferrer" style={link}>
                announced
              </a>{' '}
              that where a creator does not specify whether AI was used but its systems detect significant photorealistic
              AI use, a label is applied automatically — and that on Shorts the label appears as an overlay on the video
              itself rather than tucked into a description nobody expands. Plan for the label being visible. It does not
              affect monetization eligibility, but it does affect what a viewer sees in the first second.
            </p>
          </section>
        </div>
        <p style={{ ...small, marginTop: 14 }}>
          Worth knowing what is <em>not</em> covered:{' '}
          <a href={AI_DISCLOSURE} target="_blank" rel="noopener noreferrer" style={link}>
            YouTube&rsquo;s disclosure guidance
          </a>{' '}
          lists script writing, caption generation and voiceover assistance as production help that does not require
          disclosure. The requirement is aimed at realistic depictions of real people and real events that did not happen.
        </p>

        <h2 style={h2}>Building one that is worth watching</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {BUILD.map((s) => (
            <div id={`step-${s.n}`} key={s.n} style={{ display: 'flex', gap: 14, ...CARD, padding: '16px 18px' }}>
              <span
                style={{
                  flex: 'none',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'rgba(41,151,255,0.18)',
                  color: ACCENT,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {s.n}
              </span>
              <div>
                <div style={{ fontWeight: 700, color: '#f5f5f7' }}>{s.t}</div>
                <div style={{ fontSize: 14, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>The honest assessment</h2>
        <p style={p}>
          Of the faceless formats worth naming, this is the one with the shortest shelf life and the thinnest margin for
          error. The visual language is imitable in an afternoon, which is why there is so much of it, which is in turn
          why a channel built on nothing but the format has very little to hold on to when the format stops being novel.
          It is also the format that sits closest to the inauthentic-content description — not because AI was involved,
          but because sameness at volume is the thing being described.
        </p>
        <p style={p}>
          Nothing in that means the format cannot work. It means the loop is not the product. If the narration teaches
          something, argues something or lands a genuine payoff, the split-screen is just an effective delivery
          mechanism and the channel survives the trend that carried it. If the narration is filler, the channel has a
          ceiling measured in months.
        </p>
        <p style={small}>
          Nothing on this page guarantees monetization approval, reach or earnings, and platform policies change. The
          linked YouTube and publisher pages are the authority.
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

        <h2 style={h2}>Keep going</h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 32px' }}>
          <li>
            <Link href="/reddit-story-video-generator" style={link}>Reddit story video generator</Link> — the narrated
            format with a longer shelf life.
          </li>
          <li>
            <Link href="/youtube-automation" style={link}>YouTube automation</Link> — what running any of this on a
            schedule actually involves.
          </li>
          <li>
            <Link href="/how-to-start-a-faceless-youtube-channel" style={link}>How to start a faceless YouTube channel</Link>{' '}
            — start here if this is your first channel.
          </li>
          <li>
            <Link href="/can-you-monetize-ai-videos" style={link}>Can you monetize AI videos?</Link> — the inauthentic
            and reused content rules explained in full.
          </li>
          <li>
            <Link href="/youtube-shorts-rpm-by-niche" style={link}>Shorts RPM by niche</Link> — why the topic on top of
            the loop decides what the views are worth.
          </li>
          <li>
            <Link href="/free-ai-shorts/gaming" style={link}>Gaming Shorts generator</Link> and{' '}
            <Link href="/free-ai-shorts/facts" style={link}>facts Shorts generator</Link> — the two niches this format
            leans on most.
          </li>
          <li>
            <Link href="/text-to-video-shorts" style={link}>Text to video Shorts</Link> — if you already have the script
            written.
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
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>Make the top half worth the bottom half.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            {ft(OFFER, 'Up to 3 watermarked Fast videos every 24 hours — no card.', OFFER.copy.headline)}
          </p>
          <OrganicCtaLink
            href={FORM_ANCHOR}
            source={CAMPAIGN}
            placement="final"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Generate my narration →
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
