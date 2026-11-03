'use client'

// PROVA-SOCIAL-REAL-2026-07-02 — discreet live-stats badge fed exclusively by
// /api/stats/public (real database counts, cached 1h). HONESTY RULE: if the
// API fails, returns nothing, or the real numbers are too small to impress,
// this component renders NOTHING (return null). Better invisible than fake —
// the old fake-name toasts were removed for exactly this reason; never
// reintroduce invented social proof here.
//
// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — thresholds, formatting and the shape
// of the response now live in lib/publicStats.ts (the ONE rule for every
// public counter; the faixa da home and /pricing use the same reading). The
// 600 ms count-up from ZERO is gone: requestAnimationFrame stops in background
// tabs, page readers and screenshots, so the audit of 02/11 caught the badge
// frozen at "0 Shorts created · 0 this week · 0 accounts joined" on engine
// pages and at 77% of the real numbers on the home (2,144 vs 2,778 in the band
// a few hundred pixels below). The badge now paints the real number or nothing.

import { useEffect, useState } from 'react'
import { PUBLIC_STATS_ENDPOINT, parsePublicStats, publicStatsBadgeLine } from '@/lib/publicStats'

export default function LiveStatsBadge({ style }: { style?: React.CSSProperties }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(PUBLIC_STATS_ENDPOINT)
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((raw) => {
        if (cancelled) return
        setLabel(publicStatsBadgeLine(parsePublicStats(raw)))
      })
      .catch(() => {
        // Silent by design — no badge is better than a broken or fake one.
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!label) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12.5,
        fontWeight: 500,
        color: '#86868b',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#30d158',
          flexShrink: 0,
          animation: 'kineoLivePulse 2s ease-out infinite',
        }}
      />
      {/* KINEO-RTL-BIDI-2026-09-21: número + unidade em inglês é uma ilha LTR mesmo em página árabe/urdu */}
      <span lang="en" className="kineo-ltr-island">{label}</span>
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@keyframes kineoLivePulse{0%{box-shadow:0 0 0 0 rgba(48,209,88,.45)}70%{box-shadow:0 0 0 6px rgba(48,209,88,0)}100%{box-shadow:0 0 0 0 rgba(48,209,88,0)}}',
        }}
      />
    </span>
  )
}
