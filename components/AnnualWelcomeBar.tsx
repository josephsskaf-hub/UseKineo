'use client'
// KINEO-OFERTA-3H-0411 [fundador 04/11, via coordenação] — a barra fina das 3 h: "Your 50% annual offer ends in 2:41:07", link para o /pricing no anual.
//
// SEM PULO DE TELA: `initial` vem do servidor (lib/billing/annualWelcomeBarServer.ts), então a barra já está no HTML com a altura dela, ou não existe nunca.
// `initial` null não faz fetch e não pode aparecer depois do 1º desenho. Ela só pode SUMIR.
// O TEMPO VEM DO SERVIDOR: o 1º número é endsAtMs − serverNowMs (igual no HTML e na hidratação); cada leitura de /api/offers/annual-welcome acerta o prazo.
// Some na hora em que a janela fecha; a leitura repetida a cada minuto, ao trocar de página e ao voltar à aba pega o pagamento. Leitura que falha = some.
// Sem preço. Dispensa por cookie de sessão. O /pricing não a mostra (lá já existe a linha discreta).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { ANNUAL_WELCOME_DISCOUNT_PERCENT } from '@/lib/checkoutPricing'
import {
  ANNUAL_WELCOME_API,
  ANNUAL_WELCOME_BAR_CLICKED_EVENT,
  ANNUAL_WELCOME_BAR_DISMISS_COOKIE,
  ANNUAL_WELCOME_BAR_HREF,
  ANNUAL_WELCOME_BAR_SHOWN_EVENT,
  annualOfferClock,
  annualWelcomeBarHidden,
  type AnnualWelcomeBarInitial,
} from '@/lib/billing/annualWelcomeOffer'
import { MONTHLY_FIRST_MONTH_PERCENT_OFF } from '@/lib/billing/monthlyFirstMonthOffer' // KINEO-BARRA-3H-MENSAL-1111
import { barra3hHref, barra3hJanela, barra3hMetadata, barra3hModo } from '@/lib/billing/barra3hMensal1111' // KINEO-BARRA-3H-MENSAL-1111

// KINEO-BARRA-3H-MENSAL-1111 — o que a barra anuncia (o mensal de 30% com o interruptor ligado e a oferta mensal viva; senão o anual).
const MODO = barra3hModo()
const MEDIDA = barra3hMetadata(MODO)

const REREAD_MS = 60_000
const SHOWN_KEY = 'kineo_annual_bar_shown'

function Bar({ initial, placement }: { initial: AnnualWelcomeBarInitial; placement: 'app' | 'home' }) {
  const pathname = usePathname() ?? '/'
  const firstMsLeft = initial.endsAtMs - initial.serverNowMs
  const [msLeft, setMsLeft] = useState(firstMsLeft)
  const [gone, setGone] = useState(false)
  const deadlineRef = useRef<number | null>(null)

  useEffect(() => {
    deadlineRef.current = Date.now() + firstMsLeft
    const tick = () => { if (deadlineRef.current !== null) setMsLeft(deadlineRef.current - Date.now()) }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [firstMsLeft])

  useEffect(() => {
    if (gone) return
    let alive = true
    const read = () => {
      void fetch(ANNUAL_WELCOME_API, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { nowMs?: unknown; offer?: unknown; endsAtMs?: unknown; monthlyOffer?: unknown; monthlyEndsAtMs?: unknown } | null) => {
          if (!alive) return
          // KINEO-BARRA-3H-MENSAL-1111 — a janela da oferta que a barra ANUNCIA (mensal: monthlyOffer; anual: offer). Fechada = some.
          const janela = barra3hJanela(MODO, j)
          if (!janela) { setGone(true); return }
          deadlineRef.current = Date.now() + (janela.endsAtMs - janela.nowMs)
        })
        .catch(() => { if (alive) setGone(true) })
    }
    read()
    const id = setInterval(read, REREAD_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') read() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [pathname, gone])

  const visible = !gone && msLeft > 0 && !annualWelcomeBarHidden(pathname)
  useEffect(() => {
    if (!visible) return
    try {
      if (window.sessionStorage.getItem(SHOWN_KEY) === '1') return
      window.sessionStorage.setItem(SHOWN_KEY, '1')
    } catch { /* sem storage: conta esta vez */ }
    void trackEvent(ANNUAL_WELCOME_BAR_SHOWN_EVENT, { placement, surface: pathname, ...MEDIDA })
  }, [visible, placement, pathname])

  if (!visible) return null
  return (
    <div
      role="region"
      aria-label={MODO === 'monthly' ? 'First month offer' : 'Annual offer'}
      data-kineo="annual-welcome-bar"
      className="relative z-40 flex h-[30px] w-full flex-shrink-0 items-center justify-center whitespace-nowrap px-8 text-center text-[12px] font-bold tabular-nums"
      style={{ background: 'var(--indigo, #2997ff)', color: 'var(--on-accent, #04122E)' }}
    >
      <Link
        href={barra3hHref(MODO, ANNUAL_WELCOME_BAR_HREF)}
        className="underline-offset-2 hover:underline"
        onClick={() => { void trackEvent(ANNUAL_WELCOME_BAR_CLICKED_EVENT, { placement, surface: pathname, ...MEDIDA }) }}
      >
        {MODO === 'monthly'
          ? <>Your {MONTHLY_FIRST_MONTH_PERCENT_OFF}% off the first month ends in {annualOfferClock(msLeft)} →</>
          : <>Your {ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer ends in {annualOfferClock(msLeft)} →</>}
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-[15px] leading-none opacity-80 hover:opacity-100"
        onClick={() => {
          setGone(true)
          try { document.cookie = `${ANNUAL_WELCOME_BAR_DISMISS_COOKIE}=1; path=/; SameSite=Lax` } catch { /* nada */ }
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function AnnualWelcomeBar({ initial, placement }: { initial: AnnualWelcomeBarInitial | null | undefined; placement: 'app' | 'home' }) {
  if (!initial) return null
  return <Bar initial={initial} placement={placement} />
}
