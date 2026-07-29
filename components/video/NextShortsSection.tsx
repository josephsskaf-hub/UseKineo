'use client'

// KINEO-SPRINT-12H-2026-07-29 — "YOUR NEXT 3 SHORTS"
//
// Rendered on the success screen, directly under the finished video, ABOVE the
// upsell. Placement is the point: production counts taken on 2026-07-29 show
// 173 of 212 activated users (82%) finished exactly one video and never
// returned. The only forward action on this screen was "Generate Another
// Short", which resets to an empty textarea — it asks the user to do the one
// job Kineo does not do for them, at the exact moment they are most likely to
// leave.
//
// Three named episodes, one tap each, turn "make another one" from a blank page
// into a choice. A channel is a series, not a pile of one-offs, and this is the
// only place in the product that says so.
//
// FAILS INVISIBLY BY DESIGN. /api/next-shorts always answers 200 with
// {ideas: []} — no auth, no key, bad JSON, timeout, all of it. When the list is
// empty this component renders null. The success screen must never show an
// error: the user already has the video they spent a credit on.

import { useEffect, useRef, useState } from 'react'

export interface NextShortIdea {
  title: string
  prompt: string
  angle: string
}

interface Props {
  /** The topic/script of the Short that just finished. */
  topic: string
  title: string
  niche: string
  hook: string
  /**
   * Loads the chosen idea into the composer and returns the user to the top of
   * the flow. The parent owns the reset because only it can clear the render
   * state machine safely.
   */
  onPick: (idea: NextShortIdea) => void
  /** Fire-and-forget telemetry; the parent supplies the app's tracker. */
  onEvent?: (name: string, meta?: Record<string, unknown>) => void
}

export default function NextShortsSection({ topic, title, niche, hook, onPick, onEvent }: Props) {
  const [ideas, setIdeas] = useState<NextShortIdea[]>([])
  const [loading, setLoading] = useState(true)
  // One fetch per finished render. The generate screen is force-dynamic and
  // re-renders often; without this guard a remount would re-bill the model and
  // — worse — swap the cards out from under a user mid-click.
  const requestedRef = useRef(false)

  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/next-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, title, niche, hook }),
        })
        const data = (await res.json()) as { ideas?: NextShortIdea[] }
        if (cancelled) return
        const list = Array.isArray(data.ideas) ? data.ideas.slice(0, 3) : []
        setIdeas(list)
        if (list.length > 0) onEvent?.('next_shorts_shown', { count: list.length })
      } catch {
        if (!cancelled) setIdeas([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing to show and nothing to apologise for.
  if (!loading && ideas.length === 0) return null

  return (
    <div
      className="gv-card rounded-2xl p-5 mb-6"
      style={{
        background: 'rgba(124,92,255,.06)',
        border: '1px solid rgba(124,92,255,.25)',
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span style={{ fontSize: 18, lineHeight: 1 }}>🗓️</span>
        <div className="font-black text-sm" style={{ color: '#b39dff' }}>
          Your next 3 Shorts
        </div>
      </div>
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted2)' }}>
        A channel is a series, not a pile of one-offs. These continue the one you just
        made — pick any and it drops straight into the composer.
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.07)',
                minHeight: 104,
                opacity: 0.5,
              }}
            >
              <div
                style={{
                  height: 10,
                  width: '70%',
                  borderRadius: 5,
                  background: 'rgba(255,255,255,.10)',
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  height: 8,
                  width: '92%',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,.06)',
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 8,
                  width: '60%',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,.06)',
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {ideas.map((idea, i) => (
            <button
              key={`${i}-${idea.title}`}
              type="button"
              onClick={() => {
                onEvent?.('next_shorts_picked', { index: i, angle: idea.angle })
                onPick(idea)
              }}
              className="rounded-xl p-4 text-left transition"
              style={{
                background: 'rgba(255,255,255,.035)',
                border: '1px solid rgba(255,255,255,.10)',
                cursor: 'pointer',
                minHeight: 104,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(124,92,255,.55)'
                e.currentTarget.style.background = 'rgba(124,92,255,.10)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.10)'
                e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
            >
              {idea.angle ? (
                <div
                  className="mb-2 inline-block rounded-full px-2 py-[3px] text-[9px] font-black uppercase"
                  style={{
                    letterSpacing: '.09em',
                    background: 'rgba(124,92,255,.18)',
                    color: '#b39dff',
                  }}
                >
                  {idea.angle}
                </div>
              ) : null}
              <div className="font-bold text-[13px] leading-snug mb-1" style={{ color: 'var(--text, #fff)' }}>
                {idea.title}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: 'var(--muted2)' }}>
                {idea.prompt.length > 96 ? `${idea.prompt.slice(0, 96)}…` : idea.prompt}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
