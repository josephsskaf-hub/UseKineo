// PUSH #96 — /reddit-story-video-generator: the highest-commercial-intent page
// of the keyword-gap roadmap. Targets "reddit story video generator", "AITA
// video maker", "reddit stories youtube shorts". Server component, zero client
// JS except the shared TopicGeneratorForm. Dark theme + FAQ/Breadcrumb JSON-LD
// matching the rest of the acquisition cluster.
//
// Every checkable claim on this page is sourced:
//  - 3-minute Shorts ceiling: support.google.com/youtube/answer/10059070
//  - reused-content wording: support.google.com/youtube/answer/1311392
//    ("content downloaded or copied from another online source without any
//    substantive modifications"), policy renamed to "inauthentic content"
//    on 2025-07-15.
//  - Reddit User Agreement: "You retain any ownership rights you have in Your
//    Content, but you grant Reddit the following license..." — the licence runs
//    to Reddit, not to third parties.
// No invented statistics. Word-count budgets below are arithmetic from a stated
// narration pace, not a claim about measured performance.

import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'push96_reddit_story_generator'
const FORM_ID = 'try-a-reddit-story'
const FORM_ANCHOR = `#${FORM_ID}`
const UPDATED = 'July 2026'

const SHORTS_SPEC = 'https://support.google.com/youtube/answer/10059070?hl=en'
const MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392?hl=en'
const HARASSMENT_POLICY = 'https://support.google.com/youtube/answer/2802268?hl=en'
const AD_FRIENDLY_POLICY = 'https://support.google.com/youtube/answer/6162278?hl=en'
const REDDIT_USER_AGREEMENT = 'https://www.redditinc.com/policies/user-agreement'

export const metadata: Metadata = {
  title: 'Reddit Story Video Generator — Turn a Thread Into a Narrated Short',
  description:
    'Turn an AITA-style Reddit thread into a narrated vertical Short: AI voiceover, matched footage and burned-in captions. Plus the word budget that fits the 3-minute Shorts limit, the copyright problem nobody mentions, and how to keep the video monetizable.',
  alternates: { canonical: `${BASE}/reddit-story-video-generator` },
  openGraph: {
    title: 'Reddit Story Video Generator — Thread In, Narrated Short Out',
    description:
      'The AITA-to-Shorts workflow done properly: a word budget that fits the 3-minute limit, an anonymisation checklist, and the reused-content rule that decides whether the video can earn.',
    url: `${BASE}/reddit-story-video-generator`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reddit Story Video Generator | Kineo',
    description:
      'Turn a Reddit thread into a narrated Short — with the length math, the copyright reality and the monetization rules that apply.',
  },
}

const FORM_EXAMPLES = [
  'AITA for refusing to give up the seat I paid extra for?',
  'My roommate billed me for the electricity his aquarium used',
  'I found out my coworker had two full-time jobs',
] as const

// Narration pace used for every word-count figure on this page. 165 wpm is a
// deliberate, stated assumption — slow enough for captions to keep up, fast
// enough not to drag. All budgets below are arithmetic from this number.
const WPM = 165
const SHORTS_MAX_SECONDS = 180
const SAFE_SECONDS = 150

function wordBudget(seconds: number): number {
  return Math.round((seconds / 60) * WPM)
}

const STEPS: { n: string; t: string; d: string }[] = [
  {
    n: '1',
    t: 'Pick a thread with exactly one dilemma',
    d: 'The threads that survive the cut to 60–90 seconds have a single decision at their centre — one seat, one bill, one invitation. Anything with three subplots and an edit history will not compress. If you cannot state the conflict in one sentence, skip it.',
  },
  {
    n: '2',
    t: 'Rewrite it in your own words, first person, past tense',
    d: 'Do not paste the post. Retell it. This is the step that turns a copy of someone else’s writing into your own narration, and it is also where you cut the 400 words of backstory that kill retention.',
  },
  {
    n: '3',
    t: 'Front-load the dilemma into the first sentence',
    d: 'The original post buries the conflict under context. A Short cannot. Open with the decision and the stake ("I told my sister she could not bring her boyfriend, and my family has not spoken to me since"), then go back and fill in the context.',
  },
  {
    n: '4',
    t: 'Cut to the word budget before you generate',
    d: `At ${WPM} words per minute, ${SAFE_SECONDS} seconds is about ${wordBudget(SAFE_SECONDS)} words. That is the whole script — hook, setup, escalation, verdict. Most AITA posts are several times longer, so this step is a real edit, not a trim.`,
  },
  {
    n: '5',
    t: 'Strip every identifier',
    d: 'Remove usernames, the subreddit name, employers, schools, cities and any detail that would let a viewer find the original poster. Change first names. This protects the people in the story and keeps you clear of YouTube’s harassment and privacy rules.',
  },
  {
    n: '6',
    t: 'Add the thing that makes it yours',
    d: 'A verdict, a counter-argument, a pattern you have seen across ten similar threads, a question to the comments. Narration alone is a reading. Narration plus a point of view is a video, and it is the difference the reused-content policy is actually looking for.',
  },
  {
    n: '7',
    t: 'Generate, then watch it once at full speed',
    d: 'Paste the finished script into Kineo and it narrates it word-for-word, matches footage to each line and burns in captions. Then watch it on a phone with the sound off — if the captions alone do not carry the story, rewrite the hook and regenerate.',
  },
]

const FAILURE_MODES: { title: string; detail: string }[] = [
  {
    title: 'Reading the post verbatim',
    detail:
      'This is the single most common mistake and it fails twice. It fails on retention, because a Reddit post is written to be read at your own pace, not heard at a fixed one. And it fails on policy: YouTube’s monetization rules exclude "content downloaded or copied from another online source without any substantive modifications". A verbatim read with a TTS voice on top is the textbook example.',
  },
  {
    title: 'Running long and getting cut',
    detail: `Shorts are capped at ${SHORTS_MAX_SECONDS} seconds. At ${WPM} words per minute that is a hard ceiling of roughly ${wordBudget(SHORTS_MAX_SECONDS)} spoken words, and you want to land well under it. A 900-word AITA post read straight through runs past five minutes, which is not a Short at all.`,
  },
  {
    title: 'Giving away the verdict in the title',
    detail:
      'If the title says "she was the AH", there is nothing left to watch for. Title the tension, not the resolution. The verdict is the payoff and it belongs in the last five seconds — or in a genuine part two, which you then actually have to publish.',
  },
  {
    title: 'Leaving the acronyms in',
    detail:
      'AITA, NTA, YTA, OP, SO, DH, MIL. A voice model will either spell them out letter by letter or mangle them, and a viewer who does not read the subreddit will not know what they mean either. Expand them in the script: "my husband", "the original poster", "my mother-in-law".',
  },
  {
    title: 'Choosing a thread that cannot carry ads',
    detail:
      'Infidelity, abuse, self-harm, graphic medical detail and sexual content sit under YouTube’s advertiser-friendly guidelines and can be limited or fully demonetized even when the video is allowed to stay up. The most upvoted threads are often the least monetizable ones — check the guidelines before you build a channel on that lane.',
  },
  {
    title: 'One voice, one background, fifty videos',
    detail:
      'Same intro, same TTS voice, same stock loop, only the story swapped. That pattern is what the inauthentic-content policy describes as mass-produced and interchangeable. Vary the structure, the framing and the visuals, or the channel — not the individual video — becomes the problem.',
  },
]

const LENGTH_TIERS: { label: string; seconds: number }[] = [
  { label: 'Tight hook-and-payoff', seconds: 45 },
  { label: 'Standard AITA retelling', seconds: 75 },
  { label: 'Long thread, single part', seconds: SAFE_SECONDS },
  { label: 'Absolute Shorts ceiling', seconds: SHORTS_MAX_SECONDS },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is there an AI that turns Reddit stories into videos?',
    a: 'Yes. Kineo takes the script you paste in and narrates it word-for-word with an AI voice, matches vertical footage to each line and burns in captions, then exports a ready-to-post 9:16 video. It does not scrape Reddit for you, which is deliberate — you choose and rewrite the thread, and that rewriting is what keeps the video original.',
  },
  {
    q: 'How long should a Reddit story Short be?',
    a: `YouTube caps Shorts at ${SHORTS_MAX_SECONDS} seconds. At a ${WPM}-words-per-minute narration pace that is a ceiling of about ${wordBudget(SHORTS_MAX_SECONDS)} spoken words. Most Reddit story Shorts work better between 45 and 90 seconds, which is roughly ${wordBudget(45)} to ${wordBudget(90)} words — enough for a hook, the conflict, an escalation and a verdict.`,
  },
  {
    q: 'Can I legally use someone else’s Reddit post in a video?',
    a: 'Reddit’s User Agreement says you retain ownership of what you post and grant Reddit a licence to use it. That licence runs to Reddit, not to you as a third party — posting something publicly does not put it in the public domain. Retelling a story in your own words with your own framing is a very different act from reproducing someone’s writing verbatim. If you are building a business on this, get your own legal advice; this page is not it.',
  },
  {
    q: 'Can Reddit story channels be monetized on YouTube?',
    a: 'They can be eligible, but the format alone never guarantees approval. YouTube reviews the whole channel and excludes content copied from another source without substantive modification, as well as content that is repetitive or mass-produced. Original retelling, your own commentary or verdict, varied structure and appropriate visuals are what move a Reddit-story channel from "copied" to "transformed".',
  },
  {
    q: 'Do I have to disclose that the voice is AI?',
    a: 'YouTube requires disclosure for realistic altered or synthetic content — making a real person appear to say or do something they did not, or depicting a realistic event that did not happen. A synthetic narrator reading your own script is generally production assistance rather than a realistic depiction of a real person. Read YouTube’s current disclosure guidance and disclose when in doubt; disclosure does not affect monetization eligibility.',
  },
  {
    q: 'What does Kineo cost?',
    a: 'A new account can create, download and share up to 3 watermarked Fast videos every 24 hours without a card. Starter is $4.90 for the first month, then $9.90 per month. Check the pricing page for current plan details.',
  },
]

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }

export default function RedditStoryVideoGeneratorPage() {
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
    name: 'How to turn a Reddit thread into a narrated YouTube Short',
    description:
      'Choose a single-dilemma thread, retell it in your own words inside a spoken word budget, anonymise it, add your own verdict, then generate the narrated vertical video.',
    totalTime: 'PT20M',
    step: STEPS.map((step) => ({
      '@type': 'HowToStep',
      position: Number(step.n),
      name: step.t,
      text: step.d,
      url: `${BASE}/reddit-story-video-generator#step-${step.n}`,
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
        name: 'Reddit Story Video Generator',
        item: `${BASE}/reddit-story-video-generator`,
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
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Reddit Story Video Generator</span>
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
          Story-format guide — updated {UPDATED}
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1.12, margin: '18px 0 0' }}>
          Reddit Story Video Generator
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0' }}>
          Paste a retold thread and Kineo narrates it word-for-word, matches vertical footage to every line and burns in
          the captions — a finished 9:16 Short, usually in 3–7 minutes. The generator is the easy half. The half that
          decides whether the video holds attention and whether it can ever earn is the edit you do first, and that is
          what most of this page is about.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '26px 0 0' }}>
          <OrganicCtaLink
            href={FORM_ANCHOR}
            source={CAMPAIGN}
            placement="hero"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}
          >
            Narrate a story free →
          </OrganicCtaLink>
          <Link
            href="/pricing"
            style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}
          >
            See pricing
          </Link>
        </div>
        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 700, margin: '12px 0 0' }}>
          Up to 3 watermarked Fast videos / 24h · No card · Starter $4.90 first month
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          examples={FORM_EXAMPLES}
          formId={FORM_ID}
          copy={{
            label: 'Paste your retold story (or a one-line premise)',
            placeholder: 'Paste the script you rewrote, or type the dilemma in one sentence',
            submit: 'Turn this story into a Short →',
            examplesLabel: 'Premises to start from',
            note: 'Your text stays attached through signup. Paste a full script and it is narrated verbatim — no card required for the free Fast workflow.',
          }}
        />

        <h2 style={h2}>What a Reddit story Short is actually made of</h2>
        <p style={p}>
          Strip the format down and there are four beats, and they are always in the same order. The{' '}
          <strong style={{ color: '#f5f5f7' }}>hook</strong> is the dilemma stated as a decision already made. The{' '}
          <strong style={{ color: '#f5f5f7' }}>setup</strong> is the minimum context needed for the decision to make
          sense — usually two sentences, never five. The <strong style={{ color: '#f5f5f7' }}>escalation</strong> is the
          reaction from other people, which is the part viewers actually stay for. The{' '}
          <strong style={{ color: '#f5f5f7' }}>payoff</strong> is a verdict, a twist or a direct question to the comments.
        </p>
        <p style={p}>
          The original thread is not written in that shape. It opens with throat-clearing, buries the conflict in
          paragraph three, and resolves in an edit at the bottom that half the readers never reach. Rearranging those
          four beats is the entire craft of this format — and it is also, conveniently, the transformation that makes the
          video yours rather than a copy.
        </p>

        <h2 style={h2}>The length math, because Shorts have a hard ceiling</h2>
        <p style={p}>
          YouTube{' '}
          <a href={SHORTS_SPEC} target="_blank" rel="noopener noreferrer" style={link}>
            caps Shorts at {SHORTS_MAX_SECONDS} seconds
          </a>
          . Narration pace is the variable that turns that into a word count. The table below assumes {WPM} words per
          minute, which is a comfortable clip for a synthetic narrator and slow enough that burned-in captions stay
          readable. Speed the voice up and you buy words at the cost of comprehension.
        </p>
        <div style={{ ...CARD, padding: 4, margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 420 }}>
            <caption style={{ padding: '14px 16px', color: MUTED, fontSize: '0.82rem', textAlign: 'left' }}>
              Spoken-word budget at {WPM} words per minute.
            </caption>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: MUTED, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: MUTED, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Runtime
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: ACCENT, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Script words
                </th>
              </tr>
            </thead>
            <tbody>
              {LENGTH_TIERS.map((tier) => (
                <tr key={tier.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '13px 16px', fontWeight: 700 }}>{tier.label}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: '#d2d2d7' }}>{tier.seconds}s</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>
                    ~{wordBudget(tier.seconds)} words
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={small}>
          A typical AITA post runs several hundred words longer than the {SAFE_SECONDS}-second row. That gap is not a
          formatting problem — it is the edit. Decide what the story is about, then delete everything that is not that.
        </p>

        <h2 style={h2}>The seven-step workflow</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {STEPS.map((s) => (
            <div
              id={`step-${s.n}`}
              key={s.n}
              style={{ display: 'flex', gap: 14, ...CARD, padding: '16px 18px' }}
            >
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

        <h2 style={h2}>Six ways this format breaks</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAILURE_MODES.map((f) => (
            <section key={f.title} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>{f.detail}</p>
            </section>
          ))}
        </div>

        <h2 style={h2}>The honest part: whose story is it?</h2>
        <p style={p}>
          This is the question the rest of the internet skips, so here it is plainly. Reddit&rsquo;s{' '}
          <a href={REDDIT_USER_AGREEMENT} target="_blank" rel="noopener noreferrer" style={link}>
            User Agreement
          </a>{' '}
          states that you retain any ownership rights in the content you post, and that you grant{' '}
          <em>Reddit</em> a broad licence to use it. That licence runs to Reddit and its partners. It is not a licence to
          you. Something being publicly readable is not the same as it being free to reproduce.
        </p>
        <p style={p}>
          YouTube approaches the same problem from the other side. Its{' '}
          <a href={MONETIZATION_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
            channel monetization policies
          </a>{' '}
          exclude &ldquo;content downloaded or copied from another online source without any substantive
          modifications&rdquo;, and on 15 July 2025 the repetitious-content rule was renamed{' '}
          <strong style={{ color: '#f5f5f7' }}>inauthentic content</strong> to describe mass-produced and templated
          uploads more directly. A channel that pastes threads into a text-to-speech tool sits squarely inside both
          descriptions.
        </p>
        <p style={p}>
          The workable version is not a loophole, it is just more work: choose the thread yourself, retell it in your own
          words, cut it to a shape the original did not have, anonymise the people in it, and add a verdict or an
          argument that is yours. Then also read the{' '}
          <a href={HARASSMENT_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
            harassment and cyberbullying policy
          </a>{' '}
          before you name anyone, and the{' '}
          <a href={AD_FRIENDLY_POLICY} target="_blank" rel="noopener noreferrer" style={link}>
            advertiser-friendly content guidelines
          </a>{' '}
          before you pick a thread about infidelity or abuse, because those threads perform well and monetize badly.
        </p>
        <p style={small}>
          None of this is legal advice, and none of it is a promise that a particular video will be approved. Policies
          change; the linked pages are the authority, not this one.
        </p>

        <h2 style={h2}>Where Kineo fits</h2>
        <p style={p}>
          Kineo does the production layer: it narrates your finished script verbatim, finds vertical footage matched to
          each line rather than dropping in one generic loop, burns in captions and exports a 9:16 MP4. It deliberately
          does not scrape Reddit and hand you a script, because the rewriting step is exactly the step that has to be
          yours. You keep the editorial judgement, the anonymisation and the fact-checking; the tool removes the two to
          three hours of voicing and editing.
        </p>

        <section style={{ ...CARD, padding: '20px', margin: '28px 0 0', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>Try it on one story before you plan fifty</h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Rewrite one thread to about {wordBudget(75)} words, paste it in and watch what comes back. That single test
            tells you more about whether the format suits you than any amount of planning.
          </p>
          <OrganicCtaLink
            href={FORM_ANCHOR}
            source={CAMPAIGN}
            placement="mid_cta"
            style={{ display: 'inline-block', background: ACCENT, color: '#000', fontWeight: 700, padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontSize: '0.95rem' }}
          >
            Narrate my first story →
          </OrganicCtaLink>
        </section>

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
            <Link href="/brainrot-video-generator" style={link}>Brainrot video generator</Link> — the split-screen
            format, and why it carries more policy risk than this one.
          </li>
          <li>
            <Link href="/youtube-automation" style={link}>YouTube automation</Link> — what the whole pipeline looks like
            once one video becomes a schedule.
          </li>
          <li>
            <Link href="/how-to-start-a-faceless-youtube-channel" style={link}>How to start a faceless YouTube channel</Link>{' '}
            — the setup steps before your first upload.
          </li>
          <li>
            <Link href="/can-you-monetize-ai-videos" style={link}>Can you monetize AI videos?</Link> — the reused and
            inauthentic content rules in full.
          </li>
          <li>
            <Link href="/how-much-do-youtube-shorts-pay" style={link}>How much do Shorts pay?</Link> — what story volume
            is actually worth.
          </li>
          <li>
            <Link href="/free-ai-shorts/relationships" style={link}>Relationship Shorts generator</Link> and{' '}
            <Link href="/free-ai-shorts/truecrime" style={link}>true crime Shorts generator</Link> — the two niches
            closest to this format.
          </li>
          <li>
            <Link href="/youtube-shorts-from-topic" style={link}>Shorts from a topic</Link> — if you would rather start
            from an idea than a thread.
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
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900 }}>One thread. One finished Short.</div>
          <p style={{ color: MUTED, margin: '8px 0 18px' }}>
            Up to 3 watermarked Fast videos every 24 hours — no card.
          </p>
          <OrganicCtaLink
            href={FORM_ANCHOR}
            source={CAMPAIGN}
            placement="final"
            style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}
          >
            Narrate my story →
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
