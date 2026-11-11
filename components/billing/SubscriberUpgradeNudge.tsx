'use client'

// KINEO-ASSINANTE-SOBE-2026-10-06 — o empurrão do assinante sem crédito. Mostra o PRÓXIMO degrau pela troca que já
// existe (lib/growth/planSwitch → POST /api/stripe/change-plan; nunca o checkout, que recusa a segunda assinatura) e,
// onde o cobrador aceita e a parede ainda não mostra os pacotes, a recarga que já existe (CreditsTopupModal).
// A decisão é pura e mora em lib/billing/subscriberUpgrade.ts; aqui só se lê o estado do servidor, se passam as
// fontes e se pinta:
//   · quem é assinante quem diz é o SERVIDOR (GET /api/stripe/change-plan: perfil com assinatura Stripe e plano
//     starter/basic/pro). Não assinante, PayPal, autopilot, leitura que falhou ou ainda lendo → nada é pintado;
//   · números só das fontes: TIER_CREDITS / TIER_PRICES (lib/checkoutPricing) e PLANS[t].name (lib/pricing);
//   · confirmação antes de trocar (o mesmo padrão do /pricing), com preço, créditos e o rateio por extenso;
//   · textos pelo useUiCopy (16 línguas em lib/ui/refinementCopy.json).
// Telemetria: subscriber_upgrade_shown (1x por montagem, só quando pinta) · subscriber_upgrade_clicked (switch, topup,
// plans) · plan_switch_clicked (a troca confirmada: o MESMO evento do /pricing, com surface própria) · e o servidor
// grava plan_changed com o desfecho.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import CreditsTopupModal from '@/components/CreditsTopupModal'
import { useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { RECARGA_ASSINANTE_1111 } from '@/lib/credits/creditSlider' // KINEO-RECARGA-ASSINANTE-1111 — o botão e a barra: uma fonte
import { PLANS } from '@/lib/pricing'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'
import { PLAN_SWITCH_EMPTY, fetchPlanSwitchState, planSwitchErrorText, switchPlan, type PlanSwitchState } from '@/lib/growth/planSwitch'
import {
  SUBSCRIBER_UPGRADE_CLICKED_EVENT,
  SUBSCRIBER_UPGRADE_COPY as COPY,
  SUBSCRIBER_UPGRADE_PLANS_HREF,
  SUBSCRIBER_UPGRADE_SHOWN_EVENT,
  SUBSCRIBER_UPGRADE_VERSION,
  fillCopy,
  planFromSwitchState,
  subscriberUpgradeOffer,
} from '@/lib/billing/subscriberUpgrade'
import {
  RECARGA_ASSINANTE_1111_RELEASE,
  RECARGA_ASSINANTE_API,
  RECARGA_ASSINANTE_COPY,
  recargaAssinanteBack,
  recargaAssinanteFill,
  type RecargaAssinanteOffer,
} from '@/lib/billing/recargaAssinante' // KINEO-RECARGA-ASSINANTE-1111 — a recarga do assinante que zerou: o SERVIDOR decide quem vê (GET /api/billing/recarga-assinante)

export { SUBSCRIBER_UPGRADE_ENABLED } from '@/lib/billing/subscriberUpgrade'

type Tone = 'theme' | 'dark'

// 'theme' segue o tema claro/escuro da tela (cockpit do Studio); 'dark' é para a casca escura fixa do modal do /studio/create.
const TONES: Record<Tone, { card: string; border: string; text: string; muted: string; primary: string; onPrimary: string; outline: string; link: string }> = {
  theme: { card: 'var(--card2)', border: 'var(--border)', text: 'var(--text)', muted: 'var(--muted)', primary: 'var(--indigo)', onPrimary: 'var(--on-accent, #fff)', outline: 'var(--border)', link: 'var(--accent)' },
  dark: { card: 'rgba(41,151,255,.08)', border: 'rgba(41,151,255,.55)', text: '#fff', muted: '#a1a1a8', primary: '#2997ff', onPrimary: '#fff', outline: 'rgba(255,255,255,.22)', link: '#5cb3ff' },
}

export default function SubscriberUpgradeNudge({
  surface,
  tone = 'theme',
  topup = false,
  onDone = null,
  onShown = null,
  onChoice = null,
  idea = null,
}: {
  /** Onde a parede mora, para a telemetria: 'generate_upgrade_modal' | 'studio_clip_402' … */
  surface: string
  tone?: Tone
  /** Oferece a recarga existente (CreditsTopupModal) quando o cobrador aceita. false onde a parede já mostra os pacotes. */
  topup?: boolean
  /** "Keep creating →" depois da troca: devolve o saldo novo (ou null) para a tela. */
  onDone?: ((balance: number | null) => void) | null
  /** KINEO-RECARGA-PAGANTE-0111 — avisa quem montou que o empurrão PINTOU (1x por montagem): a parede mede a própria
   *  impressão (subscriber_out_of_credits_offer_shown) sem adivinhar se o assinante tinha degrau ou recarga. */
  onShown?: ((info: { kind: 'switch' | 'topup_only' | 'recarga'; from: string | null; to: string | null; topup: boolean }) => void) | null
  /** KINEO-RECARGA-PAGANTE-0111 — avisa quem montou o clique (switch | topup | plans | recarga), antes da confirmação. */
  onChoice?: ((choice: 'switch' | 'topup' | 'plans' | 'recarga' | 'recarga_more') => void) | null
  /** KINEO-RECARGA-ASSINANTE-1111 — a ideia que a tela tem na caixa: volta na URL (?prompt=) depois de pagar a recarga. */
  idea?: string | null
}) {
  const ui = useUiCopy()
  const [state, setState] = useState<PlanSwitchState | null>(null)
  const [phase, setPhase] = useState<'idle' | 'switching' | 'done'>('idle')
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topupOpen, setTopupOpen] = useState(false)
  const shownRef = useRef(false)
  // KINEO-RECARGA-ASSINANTE-1111 — a oferta da recarga (null = não há; o servidor decide) e a volta depois de pagar.
  const [recarga, setRecarga] = useState<RecargaAssinanteOffer | null>(null)
  const [recargaPaid, setRecargaPaid] = useState<'waiting' | 'done' | 'late' | null>(null)
  const [recargaGoing, setRecargaGoing] = useState(false)

  useEffect(() => {
    let alive = true
    void fetchPlanSwitchState().then((s) => { if (alive) setState(s) })
    return () => { alive = false }
  }, [])

  // KINEO-RECARGA-ASSINANTE-1111 — interruptor 'off' = nenhuma leitura a mais (o comportamento da main).
  useEffect(() => {
    if (RECARGA_ASSINANTE_1111_RELEASE === 'off') return
    let alive = true
    void fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        const o = d as Partial<RecargaAssinanteOffer> | null
        if (alive && o && o.show === true && typeof o.go === 'string' && typeof o.price === 'string' && typeof o.credits === 'number' && typeof o.button === 'boolean') setRecarga(o as RecargaAssinanteOffer)
      })
      .catch(() => { /* sem oferta: o aviso segue como antes */ })
    return () => { alive = false }
  }, [surface])

  // KINEO-RECARGA-ASSINANTE-1111 — voltou da Stripe (?recarga=paid&session_id=): espera o webhook creditar (até ~30 s),
  // avisa a tela pelo onDone/creditsChanged e diz a verdade se demorar. Nada é cobrado aqui.
  useEffect(() => {
    if (RECARGA_ASSINANTE_1111_RELEASE === 'off' || typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('recarga') !== 'paid' || !sp.get('session_id')) return
    setRecargaPaid('waiting')
    let alive = true
    let first: number | null = null
    let tries = 0
    const tick = async () => {
      tries++
      try {
        const r = await fetch('/api/credits', { cache: 'no-store', credentials: 'same-origin' })
        const d = r.ok ? ((await r.json()) as { credits?: unknown }) : null
        const c = typeof d?.credits === 'number' ? d.credits : null
        if (c !== null && first === null) first = c
        if (c !== null && first !== null && c > first) {
          if (!alive) return
          setRecargaPaid('done')
          setRecarga(null)
          try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* ignore */ }
          try { onDone?.(c) } catch { /* ignore */ }
          return
        }
      } catch { /* tenta de novo */ }
      if (!alive) return
      if (tries >= 12) { setRecargaPaid('late'); return }
      setTimeout(() => { void tick() }, 2500)
    }
    void tick()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = state ?? PLAN_SWITCH_EMPTY
  const plan = planFromSwitchState(current)
  const offer = subscriberUpgradeOffer({
    state: current,
    credits: TIER_CREDITS,
    pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd },
    topupAllowed: canPurchaseCreditTopup(plan),
  })
  const visible = offer.kind === 'switch' || (offer.kind === 'topup_only' && topup) || recarga !== null || recargaPaid !== null // KINEO-RECARGA-ASSINANTE-1111 — o Studio (topo da escada) passa a ver a recarga
  const topupHere = recarga === null && topup && (offer.kind === 'topup_only' || (offer.kind === 'switch' && offer.topup)) // KINEO-RECARGA-ASSINANTE-1111 — com a recarga nova, o botão da antiga some
  const shownKind: 'switch' | 'topup_only' | 'recarga' = recarga !== null ? 'recarga' : offer.kind === 'switch' ? 'switch' : 'topup_only' // KINEO-RECARGA-ASSINANTE-1111
  const fromTier = offer.kind === 'none' ? null : offer.from
  const toTier = offer.kind === 'switch' ? offer.to : null
  const offerKey = `${offer.kind}:${fromTier ?? ''}>${toTier ?? ''}:${recarga ? 'recarga' : ''}`

  useEffect(() => {
    if (!visible || shownRef.current) return
    shownRef.current = true
    try {
      void trackEvent(SUBSCRIBER_UPGRADE_SHOWN_EVENT, {
        version: SUBSCRIBER_UPGRADE_VERSION,
        surface,
        kind: offer.kind,
        from: fromTier,
        to: toTier,
        credits_today: offer.kind === 'switch' ? offer.creditsToday : 0,
        price_minor: offer.kind === 'switch' ? offer.priceMinor : null,
        topup: topupHere,
        recarga: recarga !== null, // KINEO-RECARGA-ASSINANTE-1111
      })
    } catch { /* telemetria nunca derruba a parede */ }
    try { onShown?.({ kind: shownKind, from: fromTier, to: toTier, topup: topupHere }) } catch { /* idem */ } // KINEO-RECARGA-PAGANTE-0111 · KINEO-RECARGA-ASSINANTE-1111 — 'recarga' quando a recarga nova pinta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, offerKey])

  function track(choice: 'switch' | 'topup' | 'plans' | 'recarga' | 'recarga_more') {
    try {
      void trackEvent(SUBSCRIBER_UPGRADE_CLICKED_EVENT, {
        version: SUBSCRIBER_UPGRADE_VERSION,
        surface,
        choice,
        from: fromTier,
        to: toTier,
      })
    } catch { /* ignore */ }
    try { onChoice?.(choice) } catch { /* ignore */ } // KINEO-RECARGA-PAGANTE-0111
  }

  async function onSwitch() {
    if (offer.kind !== 'switch' || phase !== 'idle') return
    track('switch')
    const name = PLANS[offer.to].name
    const price = formatCheckoutMoney('usd', offer.priceMinor)
    if (typeof window !== 'undefined' && !window.confirm(fillCopy(ui(COPY.confirm), { plan: name, price, credits: offer.creditsToday }))) return
    setPhase('switching')
    setError(null)
    try {
      void trackEvent('plan_switch_clicked', { from: offer.from, to: offer.to, status: current.status, surface: `subscriber_upgrade_${surface}`, version: SUBSCRIBER_UPGRADE_VERSION })
    } catch { /* ignore */ }
    const result = await switchPlan(offer.to)
    if (result.ok) {
      setBalance(result.credits)
      setPhase('done')
      try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* o saldo da tela relê no próximo evento */ }
      return
    }
    setPhase('idle')
    setError(planSwitchErrorText(result.error))
  }

  // KINEO-RECARGA-ASSINANTE-1111 — o clique vai à rota da oferta, que re-decide no servidor e leva ao checkout (ou, na
  // conferência da casa, volta sem cobrar). A volta é o endereço de agora, com a ideia, sem os parâmetros que disparam render.
  function onRecarga() {
    if (!recarga || recargaGoing || typeof window === 'undefined') return
    track('recarga')
    setRecargaGoing(true)
    const back = recargaAssinanteBack(`${window.location.pathname}${window.location.search}`, idea)
    window.location.href = `${recarga.go}&back=${encodeURIComponent(back)}`
  }

  if (!visible) return null
  const c = TONES[tone]
  const name = offer.kind === 'switch' ? PLANS[offer.to].name : ''
  const price = offer.kind === 'switch' ? formatCheckoutMoney('usd', offer.priceMinor) : ''
  const primary: CSSProperties = {
    display: 'block', width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', background: c.primary,
    color: c.onPrimary, fontSize: '0.92rem', fontWeight: 900, textAlign: 'left', cursor: phase === 'switching' ? 'wait' : 'pointer',
    opacity: phase === 'switching' ? 0.7 : 1,
  }
  const secondary: CSSProperties = {
    display: 'block', width: '100%', marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'transparent',
    border: `1px solid ${c.outline}`, color: c.text, fontSize: '0.84rem', fontWeight: 800, textAlign: 'center', cursor: 'pointer',
  }
  // KINEO-RECARGA-ASSINANTE-1111 — com a oferta da recarga, o MESMO pop-up abre como a barra do assinante (60 a 3.700).
  const recargaModal = recarga && typeof window !== 'undefined'
    ? { go: recarga.go, qa: recarga.qa, back: recargaAssinanteBack(`${window.location.pathname}${window.location.search}`, idea) }
    : null
  const topupModal = topupOpen ? <CreditsTopupModal surface={`subscriber_upgrade_${surface}`} onClose={() => setTopupOpen(false)} recarga={recargaModal} /> : null

  return (
    <div
      data-kineo="subscriber-upgrade"
      data-version={SUBSCRIBER_UPGRADE_VERSION}
      data-kind={offer.kind}
      style={{ margin: '12px 0', padding: '12px 13px', borderRadius: 12, background: c.card, border: `1px solid ${c.border}`, textAlign: 'left' }}
    >
      {recargaPaid !== null ? (
        <p role="status" data-kineo="recarga-assinante-paid" style={{ margin: 0, color: c.text, fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.45 }}>
          {recargaAssinanteFill(recargaPaid === 'waiting' ? RECARGA_ASSINANTE_COPY.paidWaiting : recargaPaid === 'done' ? RECARGA_ASSINANTE_COPY.paidDone : RECARGA_ASSINANTE_COPY.paidLate, { credits: recarga?.credits ?? RECARGA_ASSINANTE_1111.credits })}
        </p>
      ) : offer.kind === 'switch' && phase === 'done' ? (
        <>
          <p role="status" style={{ margin: 0, color: c.text, fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.45 }}>
            {fillCopy(ui(COPY.done), { plan: name, credits: balance ?? '—' })}
          </p>
          {onDone && (
            <button type="button" data-kineo="subscriber-upgrade-done" onClick={() => onDone(balance)} style={{ ...primary, marginTop: 10, textAlign: 'center' }}>
              {ui(COPY.keepCreating)}
            </button>
          )}
        </>
      ) : (
        <>
          {recarga && (
            <>
              {recarga.qa && (
                <span data-kineo="recarga-assinante-qa" style={{ display: 'block', marginBottom: 6, color: '#d93025', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  {RECARGA_ASSINANTE_COPY.qa}
                </span>
              )}
              {recarga.button && (
                <>
                  <button type="button" data-kineo="recarga-assinante-cta" data-qa={recarga.qa ? '1' : undefined} disabled={recargaGoing} onClick={onRecarga} style={{ ...primary, textAlign: 'center', ...(recarga.qa ? { outline: '2px dashed #d93025', outlineOffset: 2 } : {}) }}>
                    {recargaAssinanteFill(RECARGA_ASSINANTE_COPY.cta, { price: recarga.price, credits: recarga.credits })}
                  </button>
                  <span style={{ display: 'block', marginTop: 6, color: c.muted, fontSize: '0.74rem', fontWeight: 600, lineHeight: 1.4 }}>
                    {RECARGA_ASSINANTE_COPY.terms}
                  </span>
                </>
              )}
              {/* KINEO-RECARGA-ASSINANTE-1111 — a barra (60 a 3.700 créditos, US$ 9 a US$ 500), aberta só daqui nesta versão. */}
              <button type="button" data-kineo="recarga-assinante-more" onClick={() => { track('recarga_more'); setTopupOpen(true) }} style={{ display: 'block', marginTop: 6, padding: 0, border: 'none', background: 'transparent', color: c.link, fontSize: '0.78rem', fontWeight: 800, textAlign: 'left', cursor: 'pointer' }}>
                {RECARGA_ASSINANTE_COPY.more}
              </button>
            </>
          )}
          {offer.kind === 'switch' && (
            <>
              <button type="button" data-kineo="subscriber-upgrade-switch" disabled={phase === 'switching'} onClick={() => void onSwitch()} style={recarga ? secondary : primary}>
                {phase === 'switching' ? ui(COPY.switching) : fillCopy(ui(COPY.switchCta), { plan: name, credits: offer.creditsToday })}
              </button>
              <span style={{ display: 'block', marginTop: 6, color: c.muted, fontSize: '0.74rem', fontWeight: 600, lineHeight: 1.4 }}>
                {fillCopy(ui(COPY.terms), { price })}
              </span>
            </>
          )}
          {topupHere && (
            <button
              type="button"
              data-kineo="subscriber-upgrade-topup"
              onClick={() => { track('topup'); setTopupOpen(true) }}
              style={offer.kind === 'switch' ? secondary : { ...primary, textAlign: 'center' }}
            >
              {ui(COPY.addCredits)}
            </button>
          )}
          {offer.kind === 'switch' && (
            <a
              href={SUBSCRIBER_UPGRADE_PLANS_HREF}
              data-kineo="subscriber-upgrade-plans"
              onClick={() => track('plans')}
              style={{ display: 'inline-block', marginTop: 8, color: c.link, fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none' }}
            >
              {ui(COPY.comparePlans)}
            </a>
          )}
          {error && (
            <p role="alert" style={{ margin: '8px 0 0', color: '#ff6b6b', fontSize: '0.76rem', fontWeight: 600, lineHeight: 1.4 }}>
              {ui(error)}
            </p>
          )}
        </>
      )}
      {/* Portal no <body>: no cockpit do Studio há ancestral com backdrop-filter, que prenderia o position:fixed do modal. */}
      {topupModal && (typeof document !== 'undefined' ? createPortal(topupModal, document.body) : topupModal)}
    </div>
  )
}
