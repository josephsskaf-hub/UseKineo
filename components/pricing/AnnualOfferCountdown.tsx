'use client'
// KINEO-OFERTA-3H-0411 [fundador 04/11] — a oferta do anual no /pricing, e a linha discreta "Your 50% ends in 2:41:07".
// O fim vem do SERVIDOR (/api/offers/annual-welcome: created_at da conta + 3 h). O navegador só desconta o tempo: o relógio é real e não reinicia.
// Ao zerar, a oferta sai da tela e o cartão volta ao anual normal, sem recarregar.
import { useEffect, useState } from 'react'
import { ANNUAL_WELCOME_API, annualOfferClock, type AnnualOfferKind } from '@/lib/billing/annualWelcomeOffer'
import { MONTHLY_FIRST_MONTH_OFFER_KIND } from '@/lib/billing/monthlyFirstMonthOffer' // KINEO-MENSAL-3H-0911

export type AnnualOfferState = { kind: AnnualOfferKind; deadlineMs: number }
/** KINEO-MENSAL-3H-0911 — os 30% do 1º mês: o fim no relógio deste navegador (reancorado no tempo do servidor). `ended` = a janela fechou com a página aberta. */
export type MonthlyOfferState = { deadlineMs: number | null; ended: boolean }
export type WelcomeOffersState = { annual: AnnualOfferState | null; monthly: MonthlyOfferState }
const SET_TIMEOUT_MAX_MS = 2_147_000_000

/** UMA leitura de /api/offers/annual-welcome para as duas ofertas das 3 h: o anual (50%) e o 1º mês do mensal (30%). Mesmo relógio, mesma resposta. */
export function useWelcomeOffers(): WelcomeOffersState {
  const [offer, setOffer] = useState<AnnualOfferState | null>(null)
  const [monthly, setMonthly] = useState<MonthlyOfferState>({ deadlineMs: null, ended: false })
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let monthlyTimer: ReturnType<typeof setTimeout> | undefined
    void fetch(ANNUAL_WELCOME_API, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { nowMs?: unknown; offer?: unknown; endsAtMs?: unknown; monthlyOffer?: unknown; monthlyEndsAtMs?: unknown } | null) => {
        if (!alive || !j) return
        // KINEO-MENSAL-3H-0911 — o mensal lê o mesmo relógio do servidor; ao zerar, sai da tela e deixa o aviso de que acabou.
        if (j.monthlyOffer === MONTHLY_FIRST_MONTH_OFFER_KIND && typeof j.nowMs === 'number' && typeof j.monthlyEndsAtMs === 'number') {
          const monthlyLeft = j.monthlyEndsAtMs - j.nowMs
          if (monthlyLeft > 0) {
            setMonthly({ deadlineMs: Date.now() + monthlyLeft, ended: false })
            monthlyTimer = setTimeout(() => { if (alive) setMonthly({ deadlineMs: null, ended: true }) }, Math.min(monthlyLeft, SET_TIMEOUT_MAX_MS))
          }
        }
        if (j.offer !== 'welcome_3h' && j.offer !== 'black_friday_2026') return
        if (typeof j.nowMs !== 'number' || typeof j.endsAtMs !== 'number') return
        const msLeft = j.endsAtMs - j.nowMs
        if (!(msLeft > 0)) return
        setOffer({ kind: j.offer, deadlineMs: Date.now() + msLeft })
        timer = setTimeout(() => { if (alive) setOffer(null) }, Math.min(msLeft, SET_TIMEOUT_MAX_MS))
      })
      .catch(() => undefined)
    return () => { alive = false; if (timer) clearTimeout(timer); if (monthlyTimer) clearTimeout(monthlyTimer) }
  }, [])
  return { annual: offer, monthly }
}

export function useAnnualOffer(): AnnualOfferState | null {
  return useWelcomeOffers().annual
}

/** `what` (KINEO-MENSAL-3H-0911): o nome da oferta na frase; sem ele, "Your 50%" como sempre. */
export function AnnualOfferCountdown({ deadlineMs, percentOff, what, testId = 'annual-welcome-countdown' }: { deadlineMs: number; percentOff: number; what?: string; testId?: string }) {
  const [msLeft, setMsLeft] = useState(() => deadlineMs - Date.now())
  useEffect(() => {
    const tick = () => setMsLeft(deadlineMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineMs])
  if (msLeft <= 0) return null
  return (
    <p data-testid={testId} className="-mt-4 mb-7 text-center text-[12.5px] font-semibold tabular-nums text-[var(--muted2)]">
      {what ?? `Your ${percentOff}%`} ends in {annualOfferClock(msLeft)}
    </p>
  )
}
