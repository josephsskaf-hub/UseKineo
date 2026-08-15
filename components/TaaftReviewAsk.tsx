'use client'

// KINEO-TAAFT-REVIEW-2026-07-14 — TAAFT review ask for the post-generation
// success screen ("Your video is ready" in GenerateClient). TAAFT drives
// ~72% of our signups but the listing sits at 3.0 stars with only 2 reviews,
// so a single honest 5-star review from a real user is the highest-leverage
// growth ask we can make — and the only fair moment to make it is right
// after a render SUCCEEDS (peak-happiness moment), and only to users who
// actually signed up via TAAFT.
//
// KINEO-TAAFT-REVIVE-2026-07-31 — the ask was DEAD: 11 shown, 0 clicked in
// its whole life, while TAAFT surged back to ~94% of the 48h signup wave.
// Three causes, three fixes:
//   · The once-per-browser flag was burned AT SHOW TIME — one scroll-past
//     killed the ask forever. Now the flag only goes terminal on an ACTION
//     (CTA click or explicit × dismiss); a silent ignore re-asks on a later
//     success screen, capped at 3 total shows per browser.
//   · renderCount >= 2 gated the ask to the ~19% who make a second video.
//     The original reason (competing with the upsell on render #1) died when
//     the success screen was rebuilt download-first on 30/07. Now >= 1.
//   · The copy gave no reason and the CTA was styled as a ghost link. The
//     copy now names the stakes honestly and the CTA is a primary button.
//
// Modeled on <ReferralMiniCard/> (the house pattern for win-moment cards):
// fully self-contained, degrades to null (renders nothing) on ANY failure —
// missing column, 401, storage blocked, fetch error — so it can never break
// the success screen. Show conditions (ALL must hold):
//   1. profiles.signup_utm_source === 'taaft' (via /api/me/plan, cached at
//      module level so repeat renders in one session never refetch)
//   2. render completed successfully (parent only mounts this inside the
//      `phase === 'done' && finalVideoUrl` branch)
//   3. not answered before (flag 'kineo_taaft_review_asked' = '1' means
//      clicked or dismissed) and fewer than 3 lifetime shows in this browser
//   4. renderCount >= 1 — the ask belongs to the delivery moment
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

// #rw_cont anchor drops the visitor directly at the review form on our
// TAAFT listing — no scrolling/hunting, keeps the "30 seconds" promise true.
const TAAFT_REVIEW_URL = 'https://theresanaiforthat.com/ai/kineo/#rw_cont'
const STORAGE_KEY = 'kineo_taaft_review_asked'
const MAX_SHOWS = 3

// Module-level cache: /generate keeps GenerateClient mounted, but the
// success screen (and therefore this card's mount) can come and go across
// multiple renders in one session. One roundtrip per page lifetime is
// enough — the signup source never changes for a logged-in user.
let signupSourcePromise: Promise<string | null> | null = null

function fetchSignupSource(): Promise<string | null> {
  if (!signupSourcePromise) {
    signupSourcePromise = fetch('/api/me/plan')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        d && typeof d.signup_utm_source === 'string' && d.signup_utm_source
          ? String(d.signup_utm_source).toLowerCase()
          : null,
      )
      .catch(() => null)
  }
  return signupSourcePromise
}

// KINEO-ORFAOS-CLIQUE-2026-08-14 — o maior órfão de clique da casa: 129 eventos
// e 88 PESSOAS, 100% sem `session_id`. É o pedido de review no TAAFT, ou seja, a
// engrenagem de prova social do diretório onde o fundador considera gastar $347
// — e era impossível dizer de que origem vinha quem aceita fazer review.
// `trackEvent` anexa session_id + UTMs de first-touch. Nenhum nome muda.
function trackReviewAskEvent(name: string): void {
  try {
    void trackEvent(name, { source: 'post_video_success' })
  } catch {
    // ignore — tracking must never throw into the success screen
  }
}

// Terminal flag: the user ANSWERED (clicked through or explicitly dismissed).
// Storage failures are swallowed — worst case is one extra ask next session.
function markAnswered(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

export default function TaaftReviewAsk({ renderCount = 0 }: { renderCount?: number }) {
  // Starts hidden and only flips visible after ALL gates pass in the mount
  // effect below — hidden-by-default means SSR/hydration always agree and
  // every failure mode lands on "success UI exactly as before".
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Gate 4 (KINEO-TAAFT-REVIVE-2026-07-31): from the 1st successful render.
    // Default 0 → parents that don't pass the prop never show the card.
    if (renderCount < 1) return
    // Gate 3: answered before ('1' = clicked/dismissed, kept back-compatible
    // with the pre-31/07 value) or already shown MAX_SHOWS times → stay
    // hidden. If storage itself throws (private mode / blocked), we bail
    // hidden: we can't honor the caps without storage, so we never show.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === '1') return
      const shows = raw ? parseInt(raw.replace('shown:', ''), 10) || 0 : 0
      if (raw && !raw.startsWith('shown:')) return // unknown value → be safe
      if (shows >= MAX_SHOWS) return
    } catch {
      return
    }
    // Gate 1: confirmed TAAFT signup. null/unknown/non-taaft → stay hidden.
    fetchSignupSource().then((source) => {
      if (cancelled || source !== 'taaft') return
      // Count the show (KINEO-TAAFT-REVIVE-2026-07-31: counting, not
      // terminating — the terminal flag now belongs to the user's action).
      // Re-check + set inside one try so a concurrent mount or a storage
      // failure both resolve to "don't show".
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === '1') return
        const shows = raw ? parseInt(raw.replace('shown:', ''), 10) || 0 : 0
        if (shows >= MAX_SHOWS) return
        window.localStorage.setItem(STORAGE_KEY, `shown:${shows + 1}`)
      } catch {
        return
      }
      setVisible(true)
      trackReviewAskEvent('taaft_review_ask_shown')
    })
    return () => {
      cancelled = true
    }
    // renderCount is a dep: the parent feeds it asynchronously (localStorage
    // read in an effect), so the first mount can see 0 and the real value
    // arrives one render later.
  }, [renderCount])

  if (!visible) return null

  return (
    <div
      className="relative rounded-2xl px-5 py-4 mt-6 w-full"
      style={{
        maxWidth: 480,
        background: '#161618',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Close (×) — an explicit "no": persists the terminal flag so we
          never ask this browser again. */}
      <button
        type="button"
        aria-label="Dismiss review ask"
        onClick={() => {
          markAnswered()
          setVisible(false)
        }}
        className="absolute"
        style={{
          top: 10,
          right: 12,
          background: 'transparent',
          border: 'none',
          color: '#86868b',
          fontSize: '1rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
      <div className="text-sm font-black" style={{ color: '#f5f5f7', paddingRight: 24 }}>
        Did Kineo deliver? ⭐
      </div>
      <p className="text-xs mt-1.5" style={{ color: '#86868b', lineHeight: 1.55 }}>
        You found us on There&apos;s An AI For That. We&apos;re a tiny team — an honest
        30-second review there decides who finds us next, and it helps more than
        you&apos;d guess.
      </p>
      <div className="mt-3">
        <a
          href={TAAFT_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackReviewAskEvent('taaft_review_ask_clicked')
            markAnswered()
            setVisible(false)
          }}
          className="inline-block rounded-xl px-4 py-2 text-xs font-bold"
          style={{
            background: '#2997ff',
            border: '1px solid #2997ff',
            color: '#0b0b0d',
            textDecoration: 'none',
          }}
        >
          Rate Kineo on TAAFT →
        </a>
      </div>
    </div>
  )
}
