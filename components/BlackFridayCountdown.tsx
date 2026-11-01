'use client'
// KINEO-BLACK-FRIDAY-2026 — a contagem regressiva REAL da página /black-friday e o page_view.
// O servidor manda o próprio `nowMs` na renderização; o navegador só soma o tempo que passou desde então (relógio do
// aparelho errado não muda a contagem). Ao cruzar 00:00 de 24/11 (ou o fim), a página se recarrega no servidor, que é
// quem decide o estado.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { BF2026_EVENTS, bf2026Countdown, type Bf2026State } from '@/lib/billing/blackFriday2026'

const pad = (n: number) => String(n).padStart(2, '0')

export default function BlackFridayCountdown({ state, serverNowMs, targetIso }: { state: Bf2026State; serverNowMs: number; targetIso: string }) {
  const router = useRouter()
  const mountedAt = useRef<number | null>(null)
  const refreshed = useRef(false)
  const [now, setNow] = useState(serverNowMs)

  useEffect(() => {
    mountedAt.current = Date.now()
    const id = window.setInterval(() => {
      const elapsed = Date.now() - (mountedAt.current ?? Date.now())
      setNow(serverNowMs + elapsed)
    }, 1000)
    return () => window.clearInterval(id)
  }, [serverNowMs])

  useEffect(() => {
    let from: string | null = null
    try { from = new URLSearchParams(window.location.search).get('from') } catch { from = null }
    void trackEvent(BF2026_EVENTS.pageView, { state, from: from && /^[a-z0-9_]{1,40}$/.test(from) ? from : null })
  }, [state])

  const c = bf2026Countdown(targetIso, now)
  useEffect(() => {
    if (state !== 'after' && c.totalMs === 0 && !refreshed.current) {
      refreshed.current = true
      router.refresh()
    }
  }, [c.totalMs, state, router])

  if (state === 'after') return null
  const label = state === 'before' ? 'Starts in' : 'Ends in'
  const cells: Array<[number, string]> = [[c.days, 'days'], [c.hours, 'hours'], [c.minutes, 'min'], [c.seconds, 'sec']]
  return (
    <div role="timer" aria-live="off" aria-label={`${label} ${c.days} days ${c.hours} hours ${c.minutes} minutes`} data-kineo="bf2026-countdown" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '26px 0 8px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {cells.map(([n, unit]) => (
          <div key={unit} style={{ minWidth: 62, padding: '10px 8px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card)', textAlign: 'center' }}>
            <b style={{ display: 'block', fontSize: 26, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{unit === 'days' ? n : pad(n)}</b>
            <small style={{ fontSize: 11, color: 'var(--muted)' }}>{unit}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
