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
// ───────────────────────────────────────────────────────────────────────────
// KINEO-NEXTSHORTS-VISTO-2026-09-01 — sprint v1->v4, rodada #9
//
// THE NUMBER: in 7 days this surface fired 102 events and `next_shorts_picked`
// came back ZERO. Not low — zero, with ~16 impressions a day. On 2026-08-11 the
// same surface converted at 2.8%. It went to 0%.
//
// The sprint's round #1 assumed the click was being refused because it looked
// expensive ("another 3-minute render, another credit"). Reading the caller
// killed that theory: GenerateClient's onPick does handleReset() + setPrompt()
// + scrollTo(top) and deliberately does NOT auto-generate. The tap is already
// free. So the hypothesis was wrong about the price — and, worse, we could not
// even tell whether anyone was LOOKING at the cards, because
// `next_shorts_shown` fires when the fetch resolves, not when a human sees the
// section. On a success screen that is video + full text package + this + the
// tracking nudge + the upsell, "loaded" and "seen" are very different numbers.
//
// TWO CHANGES, BOTH CHEAP:
//  1. TRUTH — `next_shorts_seen` fires only when the section actually enters
//     the viewport (IntersectionObserver, once, with a fallback that fires
//     immediately when the API is missing so we never lose the metric).
//     `next_shorts_shown` is left exactly as it was so the historical series
//     stays comparable. seen/shown answers the only question that matters
//     next: is this a PLACEMENT problem or a CONTENT problem?
//  2. PRICE, SAID OUT LOUD — the copy now states that tapping costs nothing
//     and that the finished video stays saved. A user who has not downloaded
//     yet (only 36.7% do) reads a big blue card as "this replaces my video".
//     Free has to be written down, not implied.
// ───────────────────────────────────────────────────────────────────────────

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
  // Visibility instrumentation (see KINEO-NEXTSHORTS-VISTO header).
  const rootRef = useRef<HTMLDivElement | null>(null)
  const seenRef = useRef(false)
  const loadedAtRef = useRef(0)

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
        if (list.length > 0) {
          loadedAtRef.current = Date.now()
          onEvent?.('next_shorts_shown', { count: list.length })
        }
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

  // Did a human ever get here? `next_shorts_shown` above only proves the API
  // answered. This fires once, when at least a third of the card is really on
  // screen. Never throws, never blocks paint, disconnects after the first hit.
  useEffect(() => {
    if (ideas.length === 0) return
    const marcarVisto = () => {
      if (seenRef.current) return
      seenRef.current = true
      const ms = loadedAtRef.current ? Date.now() - loadedAtRef.current : 0
      onEvent?.('next_shorts_seen', {
        count: ideas.length,
        seconds_after_load: Math.round(ms / 1000),
      })
    }
    const el = rootRef.current
    // No element or no API (old browser, SSR edge): count it as seen rather
    // than silently losing the metric. A slightly generous number beats a
    // blind one — the comparison we need is seen vs picked, not seen vs load.
    if (!el || typeof IntersectionObserver === 'undefined') {
      marcarVisto()
      return
    }
    let io: IntersectionObserver | null = null
    try {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              marcarVisto()
              io?.disconnect()
              return
            }
          }
        },
        { threshold: [0, 0.35, 1] },
      )
      io.observe(el)
    } catch {
      marcarVisto()
    }
    return () => {
      try {
        io?.disconnect()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas.length])

  // Nothing to show and nothing to apologise for.
  if (!loading && ideas.length === 0) return null

  return (
    <div
      ref={rootRef}
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
        {/* Says the price out loud. The tap has always been free — the card
            just never looked it, and zero people out of 102 impressions took
            the risk of finding out. */}
        <div
          className="rounded-full px-2 py-[3px] text-[9px] font-black uppercase"
          style={{
            letterSpacing: '.09em',
            background: 'rgba(60,220,140,.15)',
            color: '#5fe0a4',
            border: '1px solid rgba(60,220,140,.30)',
          }}
        >
          Free · 0 credits
        </div>
      </div>
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted2)' }}>
        A channel is a series, not a pile of one-offs. These continue the one you just
        made — tapping one only fills the composer. <strong style={{ color: 'var(--text, #fff)' }}>
        Nothing is generated and no credit is spent until you press Generate</strong>, and the
        video you just finished stays saved in My Videos.
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
                e.currentTarget.style.borderColor = 'rgba(41,151,255,.55)'
                e.currentTarget.style.background = 'rgba(41,151,255,.10)'
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
              {/* Names the verb. "Load", not "generate" — the whole point is
                  that this button does not start a render. */}
              <div
                className="mt-2 text-[10px] font-bold"
                style={{ color: '#5cb3ff', letterSpacing: '.02em' }}
              >
                Load into the composer →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
