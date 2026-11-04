'use client'
// KINEO-OFERTA-3H-0411 [fundador 04/11] — a oferta do anual no /pricing, e a linha discreta "Your 50% ends in 2:41:07".
// O fim vem do SERVIDOR (/api/offers/annual-welcome: created_at da conta + 3 h). O navegador só desconta o tempo: o relógio é real e não reinicia.
// Ao zerar, a oferta sai da tela e o cartão volta ao anual normal, sem recarregar.
import { useEffect, useState } from 'react'
import { ANNUAL_WELCOME_API, annualOfferClock, type AnnualOfferKind } from '@/lib/billing/annualWelcomeOffer'

export type AnnualOfferState = { kind: AnnualOfferKind; deadlineMs: number }
const SET_TIMEOUT_MAX_MS = 2_147_000_000

export function useAnnualOffer(): AnnualOfferState | null {
  const [offer, setOffer] = useState<AnnualOfferState | null>(null)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    void fetch(ANNUAL_WELCOME_API, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { nowMs?: unknown; offer?: unknown; endsAtMs?: unknown } | null) => {
        if (!alive || !j || (j.offer !== 'welcome_3h' && j.offer !== 'black_friday_2026')) return
        if (typeof j.nowMs !== 'number' || typeof j.endsAtMs !== 'number') return
        const msLeft = j.endsAtMs - j.nowMs
        if (!(msLeft > 0)) return
        setOffer({ kind: j.offer, deadlineMs: Date.now() + msLeft })
        timer = setTimeout(() => { if (alive) setOffer(null) }, Math.min(msLeft, SET_TIMEOUT_MAX_MS))
      })
      .catch(() => undefined)
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [])
  return offer
}

export function AnnualOfferCountdown({ deadlineMs, percentOff }: { deadlineMs: number; percentOff: number }) {
  const [msLeft, setMsLeft] = useState(() => deadlineMs - Date.now())
  useEffect(() => {
    const tick = () => setMsLeft(deadlineMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineMs])
  if (msLeft <= 0) return null
  return (
    <p data-testid="annual-welcome-countdown" className="-mt-4 mb-7 text-center text-[12.5px] font-semibold tabular-nums text-[var(--muted2)]">
      Your {percentOff}% ends in {annualOfferClock(msLeft)}
    </p>
  )
}
