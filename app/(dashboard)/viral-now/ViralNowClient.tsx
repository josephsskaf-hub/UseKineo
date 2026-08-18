'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ViralTopic } from '@/lib/viralTopics'
import { getNextRefreshMs } from '@/lib/viralTopics'
import { trackEvent } from '@/lib/analytics'

// KINEO-SEASONS-2026-08-18 (roubo com critério da fileira 'Black Friday' do
// InVideo): temporadas por janela de data — o calendário vira merchandising.
const SEASONS: { window: [string, string]; title: string; emoji: string; topics: string[] }[] = [
  {
    window: ['08-01', '10-31'], title: 'Halloween early birds', emoji: '🎃',
    topics: [
      'The true story behind the world’s most haunted doll',
      'Why this abandoned asylum is sealed until 2050',
      '3 real cases that inspired horror movies',
    ],
  },
  {
    window: ['11-01', '11-30'], title: 'Black Friday season', emoji: '🛍️',
    topics: [
      'The psychology tricks stores use on Black Friday',
      'How Black Friday actually started — the dark history',
      '5 Black Friday “deals” that are never deals',
    ],
  },
  {
    window: ['12-01', '12-26'], title: 'Holiday season', emoji: '🎄',
    topics: [
      'The billion-dollar business of Christmas music',
      'Why Coca-Cola invented the modern Santa',
      'The island where Christmas is illegal',
    ],
  },
]
function activeSeason() {
  const now = new Date()
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return SEASONS.find((s) => mmdd >= s.window[0] && mmdd <= s.window[1]) ?? null
}
function SeasonRow() {
  const s = activeSeason()
  if (!s) return null
  return (
    <div style={{ margin: '18px 0 6px', padding: '14px 16px', borderRadius: 14, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.25)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fdba74', marginBottom: 10 }}>
        {s.emoji} Season: {s.title}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {s.topics.map((t) => (
          <a key={t} href={`/studio?prompt=${encodeURIComponent(t)}`}
            style={{ fontSize: 12.5, fontWeight: 600, color: '#f5f5f7', textDecoration: 'none', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {t} →
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Vertical color map ───────────────────────────────────────────────────────
const VERTICAL_COLORS: Record<string, string> = {
  billionaire: '#2997ff',
  money:       '#2997ff',
  mystery:     '#2997ff',
  country:     '#2997ff',
  learning:    '#2997ff',
  ai:          '#2997ff',
  psychology:  '#2997ff',
  history:     '#2997ff',
  science:     '#2997ff',
  health:      '#2997ff',
  space:       '#2997ff',
  nature:      '#2997ff',
  technology:  '#2997ff',
  crime:       '#2997ff',
}

// ── Badge styles ─────────────────────────────────────────────────────────────
// ONDA6 (14/08) — 1 acento so, como manda a marca: badges todas em azul.
const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'Hot':           { bg: 'rgba(41,151,255,0.13)', color: '#2997ff' },
  'Trending':      { bg: 'rgba(41,151,255,0.13)', color: '#2997ff' },
  'High Retention':{ bg: 'rgba(41,151,255,0.13)', color: '#2997ff' },
  'Viral':         { bg: 'rgba(41,151,255,0.13)', color: '#2997ff' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return '0h 0m'
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m}m`
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 18,
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 210,
      animation: 'pulse 1.6s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 90, height: 22, borderRadius: 6, background: 'var(--border)' }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 40, height: 22, borderRadius: 6, background: 'var(--border)' }} />
        <div style={{ width: 60, height: 22, borderRadius: 6, background: 'var(--border)' }} />
      </div>
      <div style={{ width: '85%', height: 18, borderRadius: 6, background: 'var(--border)' }} />
      <div style={{ width: '100%', height: 14, borderRadius: 6, background: 'var(--border)' }} />
      <div style={{ width: '70%', height: 14, borderRadius: 6, background: 'var(--border)' }} />
      <div style={{ width: '50%', height: 12, borderRadius: 6, background: 'var(--border)', marginTop: 4 }} />
      <div style={{ width: '100%', height: 38, borderRadius: 8, background: 'var(--border)', marginTop: 'auto' }} />
    </div>
  )
}

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ topic, onGenerate }: { topic: ViralTopic; onGenerate: (t: ViralTopic) => void }) {
  const vertColor = VERTICAL_COLORS[topic.vertical] ?? '#2997ff'
  const badge = BADGE_STYLES[topic.badge] ?? BADGE_STYLES['Trending']

  return (
    <div id={`topic-${topic.id}`} style={{
      background: 'var(--card)',
      border: `1px solid var(--border)`,
      borderRadius: 18,
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      // KINEO-HIGGSFIELD-20D dia 10 (13/08) — mesmo lift da landing e do
      // DashboardClient (par obrigatorio): transform + sombra, curva swift.
      transition: 'transform .25s cubic-bezier(.2,0,0,1), border-color .25s ease, box-shadow .25s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = vertColor
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 34px rgba(0,0,0,.4)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {/* Label pill */}
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          padding: '3px 9px',
          borderRadius: 20,
          background: vertColor + '22',
          color: vertColor,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
        }}>
          {topic.label}
        </span>
        <span style={{ flex: 1 }} />
        {/* Viral score */}
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--muted2)',
        }}>
          🔥 {topic.viralScore}
        </span>
        {/* Badge pill */}
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 20,
          background: badge.bg,
          color: badge.color,
          whiteSpace: 'nowrap',
        }}>
          {topic.badge}
        </span>
      </div>

      {/* Title */}
      <p style={{
        margin: 0,
        fontSize: '1.05rem',
        fontWeight: 650,
        lineHeight: 1.25,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
      }}>
        {topic.title}
      </p>

      {/* Hook */}
      <p style={{
        margin: 0,
        fontSize: '0.8rem',
        fontStyle: 'italic',
        color: 'var(--muted2)',
        lineHeight: 1.45,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        {topic.hook}
      </p>

      {/* Description */}
      <p style={{
        margin: 0,
        fontSize: '0.72rem',
        color: 'var(--muted)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 1,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        {topic.description}
      </p>

      {/* CTA button */}
      <button
        onClick={() => onGenerate(topic)}
        style={{
          marginTop: 'auto',
          padding: '10px 0',
          width: '100%',
          borderRadius: 13,
          border: 'none',
          background: '#f5f5f7',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.82rem',
          letterSpacing: '0.01em',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      >
        Create this Short free →
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ViralNowClient({
  isLoggedIn,
  initialTopics,
}: {
  isLoggedIn: boolean
  initialTopics: ViralTopic[]
}) {
  const router = useRouter()
  const [topics, setTopics] = useState<ViralTopic[]>(initialTopics)
  const [loading, setLoading] = useState(initialTopics.length === 0)
  const [countdown, setCountdown] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const viewTrackedRef = useRef(false)

  // One anonymous-safe actor per browser session is used by the recovery
  // dashboard. No prompt, email or other personal data is recorded.
  useEffect(() => {
    if (viewTrackedRef.current) return
    viewTrackedRef.current = true
    void trackEvent('viral_now_viewed', {
      source: 'viral_now_public',
      campaign: 'push39_viral_now',
      topics_count: initialTopics.length,
      logged_in: isLoggedIn,
    }, '/viral-now')
  }, [initialTopics.length, isLoggedIn])

  // Fetch topics
  useEffect(() => {
    async function load() {
      try {
        if (initialTopics.length === 0) setLoading(true)
        const res = await fetch('/api/viral-now', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (Array.isArray(data.topics) && data.topics.length > 0) {
          setTopics(data.topics)
        }
      } catch (err) {
        console.error('[ViralNowClient] fetch error:', err)
        if (initialTopics.length === 0) setError('Could not load topics. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [initialTopics.length])

  // Countdown timer — updates every 30s
  useEffect(() => {
    function tick() {
      const ms = getNextRefreshMs()
      setCountdown(formatCountdown(ms))
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const handleGenerate = useCallback((topic: ViralTopic) => {
    const generateParams = new URLSearchParams({
      viral_topic: topic.id,
      autoanalyze: '1',
      duration: String(topic.duration),
      utm_source: 'viral_now',
      utm_medium: 'organic',
      utm_campaign: 'push39_viral_now',
      utm_content: topic.id,
    })
    const generateUrl = `/generate?${generateParams.toString()}`

    void trackEvent('viral_now_topic_clicked', {
      source: 'viral_now_public',
      campaign: 'push39_viral_now',
      topic_id: topic.id,
      vertical: topic.vertical,
      logged_in: isLoggedIn,
    }, '/viral-now')

    if (!isLoggedIn) {
      const signupParams = new URLSearchParams({
        redirect: generateUrl,
        intent_campaign: 'push39_viral_now',
      })
      router.push(`/signup?${signupParams.toString()}`)
      return
    }
    router.push(generateUrl)
  }, [router, isLoggedIn])

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.6rem',
            fontWeight: 650,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>
            🔥 Viral Now: Trending YouTube Shorts Ideas
          </h1>
          {/* Pulsing red dot */}
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 0 0 rgba(239,68,68,0.6)',
              animation: 'viralPulse 1.8s ease-out infinite',
            }} />
          </span>
        </div>
        {/* KINEO-SEASONS-2026-08-18 */}
        <SeasonRow />
        <p style={{
          margin: 0,
          fontSize: '0.82rem',
          color: 'var(--muted)',
        }}>
          8 ready-to-create ideas &middot; Refreshes in{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
            {countdown || '…'}
          </span>
        </p>
        <p style={{
          margin: '10px 0 0',
          maxWidth: 680,
          fontSize: '0.92rem',
          color: 'var(--muted2)',
          lineHeight: 1.5,
        }}>
          Pick a trending topic and create a free watermarked faceless Short—no card required.
          Your exact idea stays selected through signup.
        </p>
      </div>

      {/* ── Grid ── */}
      {error ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#ef4444',
          fontSize: '0.9rem',
          background: 'rgba(239,68,68,0.08)',
          borderRadius: 12,
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {error}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onGenerate={handleGenerate}
                />
              ))
          }
        </div>
      )}

      {/* ── Footer ── */}
      <p style={{
        marginTop: 32,
        textAlign: 'center',
        fontSize: '0.72rem',
        color: 'var(--muted)',
      }}>
        {topics.length} topics &middot; Refreshes every 4 hours &middot; Powered by Kineo
      </p>

      {/* ── Keyframes via style tag ── */}
      <style>{`
        @keyframes viralPulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
