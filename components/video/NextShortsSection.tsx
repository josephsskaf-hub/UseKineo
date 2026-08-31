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
//
// SPRINT-V1V4 #7 (2026-08-31) — THE CALL TO ACTION WAS INVISIBLE.
// Measured in production: 674 shows to 420 distinct external people since
// 2026-07-30, against 15 picks by 11 people — a 2.6% pick rate per exposed
// person, and ZERO picks in the twelve days from 2026-08-19 to 2026-08-31
// (81 people exposed in that window). For comparison, the /history milestone
// block converts 6 of 23 exposed people (26%) with a tenth of the audience.
// The difference is not the audience and it is not the ideas — it is the
// affordance. Every other "next episode" surface in this product is an
// explicitly labelled button with an arrow. These three cards were unlabelled
// boxes whose ONLY clickability signal was an onMouseEnter border colour,
// which does not exist on a touchscreen. This round gives each card a
// permanently visible "Make this one →" action row and instruments the
// telemetry with is_touch / viewport_w so the next round can prove or bury
// the touch hypothesis instead of guessing.

import { useEffect, useRef, useState } from 'react'

/**
 * Reads the pointing device without ever touching user data. Both fields exist
 * only so the next round can answer one question with a query instead of an
 * opinion: do the people who see these cards have a mouse at all? Guarded for
 * SSR and for browsers that lack matchMedia; never throws, because a telemetry
 * helper must not be able to break the success screen.
 */
function ambienteDePonteiro(): { is_touch: boolean; viewport_w: number } {
  try {
    if (typeof window === 'undefined') return { is_touch: false, viewport_w: 0 }
    const semHover =
      typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches
    const temToque =
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0) ||
      'ontouchstart' in window
    const largura = Math.round(Number(window.innerWidth) || 0)
    return {
      is_touch: Boolean(semHover || temToque),
      viewport_w: largura > 0 && largura < 20000 ? largura : 0,
    }
  } catch {
    return { is_touch: false, viewport_w: 0 }
  }
}

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
        if (list.length > 0) onEvent?.('next_shorts_shown', { count: list.length, ...ambienteDePonteiro() })
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
        background: 'rgba(41,151,255,.06)',
        border: '1px solid rgba(41,151,255,.25)',
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span style={{ fontSize: 18, lineHeight: 1 }}>🗓️</span>
        <div className="text-sm" style={{ color: '#5cb3ff', fontWeight: 700 }}>
          Your next 3 Shorts
        </div>
      </div>
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted2)' }}>
        A channel is a series, not a pile of one-offs. These continue the one you just
        made. Tap one and it lands in the composer — you still press Generate.
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
                onEvent?.('next_shorts_picked', { index: i, angle: idea.angle, ...ambienteDePonteiro() })
                onPick(idea)
              }}
              className="rounded-xl p-4 text-left transition flex flex-col"
              style={{
                background: 'rgba(255,255,255,.035)',
                // Stronger resting border than the neutral .10 it used to have:
                // on a phone this tint is the ONLY thing saying "this is a
                // control", because there is no hover state to discover.
                border: '1px solid rgba(41,151,255,.30)',
                cursor: 'pointer',
                minHeight: 104,
                width: '100%',
                WebkitTapHighlightColor: 'rgba(41,151,255,.28)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.55)'
                e.currentTarget.style.background = 'rgba(41,151,255,.10)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              // Touch has no hover, so it gets its own press feedback. Without
              // this a tap on a phone looks identical to a tap on dead text.
              onTouchStart={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
                e.currentTarget.style.background = 'rgba(41,151,255,.14)'
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
                e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.75)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.30)'
              }}
            >
              {idea.angle ? (
                <div
                  className="mb-2 inline-block rounded-full px-2 py-[3px] text-[9px] font-black uppercase"
                  style={{
                    letterSpacing: '.09em',
                    background: 'rgba(41,151,255,.18)',
                    color: '#5cb3ff',
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
              {/* The whole point of round #7. Every other "next episode" surface
                  in the product carries a named action with an arrow; this one
                  carried none, and it is the one 420 people actually see. The
                  row is permanently visible on purpose — it must not depend on
                  hover, which is exactly what a phone does not have. */}
              <div
                className="mt-3 pt-2 flex items-center gap-1 text-[11px] font-black uppercase"
                style={{
                  marginTop: 'auto',
                  letterSpacing: '.06em',
                  color: '#5cb3ff',
                  borderTop: '1px solid rgba(41,151,255,.16)',
                }}
              >
                Make this one <span aria-hidden="true">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
