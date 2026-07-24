'use client'

// Niche Picker quiz — pure in-memory state (no localStorage, no network).
// 5 questions → weighted scores across 12 faceless niches → top pick + 2
// runners-up, each with a niche-tagged CTA into the free generator funnel.

import { useMemo, useState } from 'react'

const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

type NicheId =
  | 'finance'
  | 'stoicism'
  | 'truecrime'
  | 'history'
  | 'geography'
  | 'luxury'
  | 'health'
  | 'animals'
  | 'gaming'
  | 'movies'
  | 'horror'
  | 'foodtravel'

type NicheInfo = {
  name: string
  rpm: string
  why: string
  topics: [string, string, string]
  /** Existing /free-ai-shorts/[niche] slug, verified against NICHES keys. */
  slug: string
  /** Short label used inside the CTA button text. */
  ctaLabel: string
}

const NICHE_INFO: Record<NicheId, NicheInfo> = {
  finance: {
    name: 'Personal Finance & Money',
    rpm: '$8–$15 RPM',
    why: 'You have research time and you prioritized earnings — finance pays the highest ad rates on YouTube because advertisers fight for viewers with money intent. Faceless explainer Shorts with charts and stock footage are the proven format.',
    topics: [
      'The $850,000 mistake most people make in their 30s',
      '$200 a month makes you a millionaire — the exact math',
      'Why your savings account is quietly making you poorer',
    ],
    slug: 'money',
    ctaLabel: 'finance',
  },
  stoicism: {
    name: 'Stoicism & Motivation',
    rpm: '$2–$5 RPM',
    why: 'Low research load, fast to produce, endlessly repeatable — quote-driven scripts over cinematic footage. RPM is modest but volume and shareability are the highest of any faceless niche.',
    topics: [
      'Marcus Aurelius on handling people who disrespect you',
      'The 5 AM rule that rewires your discipline',
      'Why Stoics say your anger is a choice',
    ],
    slug: 'stoicism',
    ctaLabel: 'stoicism',
  },
  truecrime: {
    name: 'True Crime & Mystery',
    rpm: '$4–$8 RPM',
    why: 'You enjoy deep research and can invest real time per video — true crime rewards exactly that with the best watch-time retention on the platform. Faceless narration over case footage is the standard format.',
    topics: [
      'The disappearance nobody solved in 70 years',
      'The photo that was never supposed to exist',
      'The 911 call that broke the case open',
    ],
    slug: 'truecrime',
    ctaLabel: 'true crime',
  },
  history: {
    name: 'History',
    rpm: '$4–$8 RPM',
    why: 'Infinite topic supply, solid RPM, and an audience that binges. Your research comfort and time budget fit the storytelling depth history Shorts need to stand out.',
    topics: [
      'The war that lasted 38 minutes',
      'Why ancient Rome collapsed in 5 steps',
      'The empire that fell in a single day',
    ],
    slug: 'history',
    ctaLabel: 'history',
  },
  geography: {
    name: 'Geography & Countries',
    rpm: '$2–$5 RPM',
    why: 'Ultra-repeatable format ("Why does this border look like this?") with less competition than the giant niches. Maps and satellite footage mean visuals are never a bottleneck.',
    topics: [
      'Why no one is allowed to visit this island',
      'The country that exists inside another country',
      'Why this city was built in the worst possible place',
    ],
    slug: 'geography',
    ctaLabel: 'geography',
  },
  luxury: {
    name: 'Luxury & Business',
    rpm: '$5–$10 RPM',
    why: 'High-value advertisers, aspirational audience, and stock footage of jets, watches and skylines is abundant. A strong pick when you want RPM upside without pure-finance research depth.',
    topics: [
      'Inside the $500M yacht with its own submarine',
      'How Rolex makes you wait years on purpose',
      'The business model behind billionaire private clubs',
    ],
    slug: 'luxury',
    ctaLabel: 'luxury',
  },
  health: {
    name: 'Health & Fitness',
    rpm: '$4–$8 RPM',
    why: 'Evergreen demand, good RPM, and short "one habit / one mistake" scripts that fit your time budget. Faceless works well with gym b-roll and simple visual metaphors.',
    topics: [
      'The 30-second habit that fixes your posture',
      'Why walking beats running for fat loss',
      'The sleep mistake sabotaging your workouts',
    ],
    slug: 'fitness',
    ctaLabel: 'fitness',
  },
  animals: {
    name: 'Animals & Nature',
    rpm: '$1–$3 RPM',
    why: 'The fastest-growth faceless niche — animal facts are universally shareable across every language and age group. RPM is low, so it suits a views-first strategy.',
    topics: [
      'The animal that survives being frozen solid',
      'Why octopuses might be smarter than dogs',
      'The bird that remembers your face for years',
    ],
    slug: 'animals',
    ctaLabel: 'animal facts',
  },
  gaming: {
    name: 'Gaming',
    rpm: '$1–$4 RPM',
    why: 'Massive built-in audience and you already know the topics — minimal research needed. RPM is low but Shorts velocity and community engagement are elite.',
    topics: [
      'The glitch that made this game a legend',
      '5 games that were cancelled days before launch',
      'The hidden detail nobody found for 10 years',
    ],
    slug: 'gaming',
    ctaLabel: 'gaming',
  },
  movies: {
    name: 'Movies & Celebrity',
    rpm: '$2–$4 RPM',
    why: 'Light research, endless trending hooks, and a huge casual audience. Behind-the-scenes facts and "you missed this detail" formats are quick to script and perform reliably.',
    topics: [
      'The scene that was 100% improvised',
      'Why this actor was never the first choice',
      'The movie mistake that made the final cut',
    ],
    slug: 'movies',
    ctaLabel: 'movie',
  },
  horror: {
    name: 'Horror Stories',
    rpm: '$2–$5 RPM',
    why: 'Storytelling over research — scripted scary stories with dark ambient visuals retain viewers to the last second. Great fit for limited time and a growth-first goal.',
    topics: [
      'The knock at 3 AM that kept getting closer',
      'I found a door in my basement that was never there',
      'The last voicemail from the missing hiker',
    ],
    slug: 'horror',
    ctaLabel: 'horror',
  },
  foodtravel: {
    name: 'Food & Travel',
    rpm: '$2–$6 RPM',
    why: 'Visually rich, works in any language, and less saturated than the mega-niches. "Cheapest vs most expensive" and "what $10 buys you in…" formats are proven and repeatable.',
    topics: [
      'What $10 of street food buys you in Bangkok',
      'The $1,000 steak — is it actually worth it?',
      'The country where lunch takes 3 hours',
    ],
    slug: 'food',
    ctaLabel: 'food & travel',
  },
}

const ALL_NICHES = Object.keys(NICHE_INFO) as NicheId[]

type Option = { label: string; sub?: string; scores: Partial<Record<NicheId, number>> }
type Question = { q: string; options: Option[] }

const QUESTIONS: Question[] = [
  {
    q: 'How much time can you put in per day?',
    options: [
      {
        label: 'Under 30 minutes',
        sub: 'I need a niche I can batch fast',
        scores: { stoicism: 3, animals: 3, geography: 2, movies: 2, horror: 1 },
      },
      {
        label: '30–60 minutes',
        sub: 'One solid Short a day',
        scores: { horror: 2, gaming: 2, foodtravel: 2, movies: 2, health: 1, geography: 1 },
      },
      {
        label: '1–2 hours',
        sub: 'I can research and polish',
        scores: { finance: 3, history: 2, truecrime: 2, luxury: 1, health: 1 },
      },
      {
        label: '2+ hours',
        sub: 'This is my main project',
        scores: { truecrime: 3, history: 3, finance: 2, luxury: 2 },
      },
    ],
  },
  {
    q: 'How do you feel about researching facts?',
    options: [
      {
        label: 'I love going deep',
        sub: 'Sources, dates, case files — fun',
        scores: { truecrime: 3, history: 3, finance: 2, geography: 1 },
      },
      {
        label: 'Some research is fine',
        sub: 'A quick fact-check, not a rabbit hole',
        scores: { geography: 2, health: 2, luxury: 2, foodtravel: 2, finance: 1 },
      },
      {
        label: 'Keep it light',
        sub: 'Topics I mostly already know',
        scores: { movies: 3, gaming: 3, foodtravel: 1, animals: 1 },
      },
      {
        label: 'I want zero research',
        sub: 'Writing and vibes over facts',
        scores: { stoicism: 3, horror: 3, animals: 2 },
      },
    ],
  },
  {
    q: 'What matters more: revenue per view or fast growth?',
    options: [
      {
        label: 'Maximum RPM',
        sub: 'Fewer views is fine if each pays more',
        scores: { finance: 3, luxury: 3, health: 2, truecrime: 1, history: 1 },
      },
      {
        label: 'A balance of both',
        sub: 'Decent RPM, decent growth',
        scores: { history: 2, truecrime: 2, geography: 2, health: 1, foodtravel: 1 },
      },
      {
        label: 'Blow up as fast as possible',
        sub: 'Views and subscribers first, money later',
        scores: { animals: 3, gaming: 2, horror: 2, movies: 2, stoicism: 2 },
      },
    ],
  },
  {
    q: 'What audience are you making videos for?',
    options: [
      {
        label: 'English — US-focused',
        sub: 'Highest ad rates, most competition',
        scores: { finance: 2, truecrime: 2, health: 2, luxury: 1 },
      },
      {
        label: 'English — global audience',
        sub: 'Worldwide viewers, broad topics',
        scores: { geography: 2, animals: 2, stoicism: 2, luxury: 2, foodtravel: 1 },
      },
      {
        label: 'My local language',
        sub: 'Smaller pond, way less competition',
        scores: { foodtravel: 2, history: 2, horror: 2, stoicism: 1 },
      },
      {
        label: "Doesn't matter to me",
        sub: 'Whatever the niche needs',
        scores: { gaming: 2, movies: 2, animals: 1, horror: 1 },
      },
    ],
  },
  {
    q: 'How do you feel about competing in crowded niches?',
    options: [
      {
        label: 'Bring it on',
        sub: 'Big niches mean big proven demand',
        scores: { finance: 2, stoicism: 2, gaming: 2, animals: 1, movies: 1 },
      },
      {
        label: 'Medium is my comfort zone',
        sub: 'Proven, but not a bloodbath',
        scores: { truecrime: 2, history: 2, horror: 2, movies: 1, health: 1 },
      },
      {
        label: 'I want an underserved angle',
        sub: 'Less competition beats bigger demand',
        scores: { geography: 3, foodtravel: 2, luxury: 2, health: 1 },
      },
    ],
  },
]

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=niche-picker&utm_medium=tool&utm_campaign=acq5'

function rankNiches(answers: number[]): NicheId[] {
  const totals: Record<NicheId, number> = Object.fromEntries(
    ALL_NICHES.map((n) => [n, 0]),
  ) as Record<NicheId, number>
  answers.forEach((optIdx, qIdx) => {
    const scores = QUESTIONS[qIdx].options[optIdx].scores
    for (const key of Object.keys(scores) as NicheId[]) {
      totals[key] += scores[key] ?? 0
    }
  })
  return [...ALL_NICHES].sort((a, b) => totals[b] - totals[a])
}

export default function QuizClient() {
  const [answers, setAnswers] = useState<number[]>([])
  const [copied, setCopied] = useState(false)

  const done = answers.length === QUESTIONS.length
  const ranked = useMemo(() => (done ? rankNiches(answers) : []), [answers, done])

  const pick = (optIdx: number) => {
    if (!done) setAnswers((a) => [...a, optIdx])
  }

  const restart = () => {
    setAnswers([])
    setCopied(false)
  }

  const copyResult = async () => {
    const [top, ...rest] = ranked
    const text = `My faceless YouTube niche for 2026: ${NICHE_INFO[top].name} (${NICHE_INFO[top].rpm}). Runners-up: ${rest
      .slice(0, 2)
      .map((n) => NICHE_INFO[n].name)
      .join(' and ')}. Find yours free: https://www.usekineo.com/niche-picker`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently.
    }
  }

  if (!done) {
    const qIdx = answers.length
    const question = QUESTIONS[qIdx]
    return (
      <section style={{ ...CARD, padding: '28px 24px', margin: '0 0 48px' }}>
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Question {qIdx + 1} of {QUESTIONS.length}
        </p>
        <div
          style={{
            height: 4,
            background: '#2a2a2d',
            borderRadius: 2,
            overflow: 'hidden',
            margin: '0 0 22px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(qIdx / QUESTIONS.length) * 100}%`,
              background: ACCENT,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 18px', lineHeight: 1.3 }}>
          {question.q}
        </h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              style={{
                background: '#1d1d20',
                border: '1px solid #2a2a2d',
                borderRadius: 12,
                padding: '16px 18px',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#f5f5f7',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 600,
                lineHeight: 1.4,
                width: '100%',
              }}
            >
              {opt.label}
              {opt.sub && (
                <span
                  style={{
                    display: 'block',
                    color: MUTED,
                    fontWeight: 400,
                    fontSize: '0.85rem',
                    marginTop: 4,
                  }}
                >
                  {opt.sub}
                </span>
              )}
            </button>
          ))}
        </div>
        {qIdx > 0 && (
          <button
            type="button"
            onClick={() => setAnswers((a) => a.slice(0, -1))}
            style={{
              background: 'none',
              border: 'none',
              color: MUTED,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              marginTop: 16,
              padding: 0,
            }}
          >
            ← Back
          </button>
        )}
      </section>
    )
  }

  const top = ranked[0]
  const runnersUp = ranked.slice(1, 3)

  const NicheCard = ({ id, isTop }: { id: NicheId; isTop: boolean }) => {
    const n = NICHE_INFO[id]
    return (
      <div
        style={{
          ...CARD,
          padding: isTop ? '26px 24px' : '20px 22px',
          border: isTop ? `1px solid ${ACCENT}` : CARD.border,
        }}
      >
        <p
          style={{
            color: isTop ? ACCENT : MUTED,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}
        >
          {isTop ? 'Your niche' : 'Runner-up'}
        </p>
        <h3 style={{ fontSize: isTop ? '1.5rem' : '1.15rem', fontWeight: 800, margin: '0 0 4px' }}>
          {n.name}
        </h3>
        <p style={{ color: ACCENT, fontWeight: 700, fontSize: '0.9rem', margin: '0 0 12px' }}>
          Expected {n.rpm}
        </p>
        <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: '0 0 14px' }}>
          {n.why}
        </p>
        <p style={{ color: MUTED, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Example video topics
        </p>
        <ul style={{ margin: '0 0 18px', paddingLeft: 18, color: '#d2d2d7', lineHeight: 1.7, fontSize: '0.92rem' }}>
          {n.topics.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <a
          href={CTA_URL}
          style={{
            display: 'inline-block',
            background: isTop ? ACCENT : '#1d1d20',
            border: isTop ? 'none' : '1px solid #2a2a2d',
            color: isTop ? '#000' : '#f5f5f7',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '12px 20px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Generate your first {n.ctaLabel} Short free →
        </a>
        <p style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
          <a href={`/free-ai-shorts/${n.slug}`} style={{ color: MUTED, textDecoration: 'underline' }}>
            See the free {n.ctaLabel} Shorts generator page
          </a>
        </p>
      </div>
    )
  }

  return (
    <section style={{ margin: '0 0 48px', display: 'grid', gap: 14 }}>
      <NicheCard id={top} isTop />
      <div style={{ display: 'grid', gap: 14 }}>
        {runnersUp.map((id) => (
          <NicheCard key={id} id={id} isTop={false} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          type="button"
          onClick={copyResult}
          style={{
            background: '#1d1d20',
            border: '1px solid #2a2a2d',
            borderRadius: 10,
            padding: '10px 18px',
            color: '#f5f5f7',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {copied ? 'Copied to clipboard ✓' : 'Copy my result'}
        </button>
        <button
          type="button"
          onClick={restart}
          style={{
            background: 'none',
            border: '1px solid #2a2a2d',
            borderRadius: 10,
            padding: '10px 18px',
            color: MUTED,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Retake the quiz
        </button>
      </div>
    </section>
  )
}
