'use client'
// KINEO-BLACK-FRIDAY-2026 — a faixa do topo e o selo do /pricing (aba anual) da Black Friday.
//
// SÓ DENTRO DA JANELA, NO RELÓGIO DO SERVIDOR: o navegador só pergunta a /api/offers/bf2026 quando o PRÓPRIO relógio diz
// que a janela está a menos de 2 dias (antes de 22/11 e depois de 04/12 não sai nenhuma requisição). Quem decide se pinta
// é a resposta do servidor (state === 'open'); relógio do navegador errado nunca acende oferta que o checkout não aplica.
//
// DUAS POSIÇÕES DA FAIXA, UM COMPONENTE (regra dos pares do CLAUDE.md):
//   · placement="site" — montada uma vez em app/layout.tsx, no topo do <body>, para as páginas públicas;
//   · placement="app"  — montada no DashboardShell, dentro da coluna principal (o shell é h-screen/overflow-hidden: uma
//     faixa acima dele empurraria a tela 36 px para fora e ficaria embaixo da Sidebar fixa). A de "site" se cala nas
//     rotas do app (BF2026_APP_ROUTE_PREFIXES em lib/billing/blackFriday2026.ts, conferido contra app/(dashboard) pelo guardião), então ninguém vê duas.
// Sidebar, MobileNav e a home pública (app/KineoLanding.tsx) não mudam: a faixa não é item de menu.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import {
  BF2026_EVENTS,
  BF2026_PAGE_PATH,
  BF2026_PERCENT_OFF,
  bf2026BannerHidden,
  bf2026WorthAsking,
  type Bf2026State,
} from '@/lib/billing/blackFriday2026'

let cached: Promise<Bf2026State | null> | null = null
let cachedAt = 0
function fetchState(): Promise<Bf2026State | null> {
  // 1 pergunta por minuto por aba: navegar entre páginas não repete a requisição, e a virada de 00:00 chega sozinha.
  if (!cached || Date.now() - cachedAt > 60_000) {
    cachedAt = Date.now()
    cached = fetch('/api/offers/bf2026', { cache: 'no-store', credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { state?: unknown } | null) => (j && (j.state === 'before' || j.state === 'open' || j.state === 'after') ? j.state : null))
      .catch(() => null)
  }
  return cached
}

/** true só com a janela aberta segundo o servidor. */
export function useBf2026Open(enabled = true): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!enabled || !bf2026WorthAsking(Date.now())) { setOpen(false); return }
    let alive = true
    void fetchState().then((s) => { if (alive) setOpen(s === 'open') })
    return () => { alive = false }
  }, [enabled])
  return open
}

function onceThisSession(key: string): boolean {
  try {
    if (window.sessionStorage.getItem(key) === '1') return false
    window.sessionStorage.setItem(key, '1')
    return true
  } catch {
    return true
  }
}

const DISMISS_KEY = 'kineo_bf2026_banner_dismissed'

export default function BlackFridayBanner({ placement = 'site' }: { placement?: 'site' | 'app' }) {
  const pathname = usePathname() ?? '/'
  const hidden = bf2026BannerHidden(pathname, placement)
  const open = useBf2026Open(!hidden)
  const [dismissed, setDismissed] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    try { setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1') } catch { /* sem storage: a faixa aparece */ }
  }, [])

  const visible = open && !hidden && !dismissed
  useEffect(() => {
    if (!visible || shownRef.current) return
    shownRef.current = true
    if (onceThisSession(`kineo_bf2026_shown_${placement}`)) void trackEvent(BF2026_EVENTS.bannerShown, { placement, surface: pathname })
  }, [visible, placement, pathname])

  if (!visible) return null
  const href = `${BF2026_PAGE_PATH}?from=banner_${placement}`
  return (
    <div
      role="region"
      aria-label="Black Friday offer"
      data-kineo="bf2026-banner"
      className="relative flex w-full items-center justify-center gap-2 px-10 py-2 text-center text-[13px] font-extrabold"
      style={{ background: 'var(--indigo, #2997ff)', color: 'var(--on-accent, #04122E)' }}
    >
      <Link
        href={href}
        className="underline-offset-2 hover:underline"
        onClick={() => { void trackEvent(BF2026_EVENTS.bannerClicked, { placement, surface: pathname }) }}
      >
        Black Friday: {BF2026_PERCENT_OFF}% off your first year of any annual plan · ends Dec 1 →
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 text-[15px] leading-none opacity-80 hover:opacity-100"
        onClick={() => {
          setDismissed(true)
          try { window.sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* nada */ }
        }}
      >
        ×
      </button>
    </div>
  )
}

/** O selo da aba anual do /pricing. O cupom entra sozinho em todo checkout anual da janela; o selo só conta isso. */
export function Bf2026PricingBadge() {
  const open = useBf2026Open(true)
  const shownRef = useRef(false)
  useEffect(() => {
    if (!open || shownRef.current) return
    shownRef.current = true
    if (onceThisSession('kineo_bf2026_shown_pricing')) void trackEvent(BF2026_EVENTS.bannerShown, { placement: 'pricing', surface: '/pricing' })
  }, [open])
  if (!open) return null
  return (
    <div
      data-kineo="bf2026-pricing-badge"
      className="mx-auto -mt-4 mb-7 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-2.5 text-center text-[13px] font-bold"
      style={{ borderColor: 'var(--indigo, #2997ff)', background: 'var(--accent-soft, rgba(41,151,255,.12))', color: 'var(--text)' }}
    >
      <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'var(--indigo, #2997ff)', color: 'var(--on-accent, #04122E)' }}>BLACK FRIDAY</span>
      <span>{BF2026_PERCENT_OFF}% off the first year, applied at checkout on every annual plan. Ends Dec 1, 11:59 PM ET.</span>
      <Link
        href={`${BF2026_PAGE_PATH}?from=pricing`}
        className="underline underline-offset-2"
        style={{ color: 'var(--indigo, #2997ff)' }}
        onClick={() => { void trackEvent(BF2026_EVENTS.bannerClicked, { placement: 'pricing', surface: '/pricing' }) }}
      >
        See the deal
      </Link>
    </div>
  )
}
