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
}: {
  /** Onde a parede mora, para a telemetria: 'generate_upgrade_modal' | 'studio_clip_402' … */
  surface: string
  tone?: Tone
  /** Oferece a recarga existente (CreditsTopupModal) quando o cobrador aceita. false onde a parede já mostra os pacotes. */
  topup?: boolean
  /** "Keep creating →" depois da troca: devolve o saldo novo (ou null) para a tela. */
  onDone?: ((balance: number | null) => void) | null
}) {
  const ui = useUiCopy()
  const [state, setState] = useState<PlanSwitchState | null>(null)
  const [phase, setPhase] = useState<'idle' | 'switching' | 'done'>('idle')
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topupOpen, setTopupOpen] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    let alive = true
    void fetchPlanSwitchState().then((s) => { if (alive) setState(s) })
    return () => { alive = false }
  }, [])

  const current = state ?? PLAN_SWITCH_EMPTY
  const plan = planFromSwitchState(current)
  const offer = subscriberUpgradeOffer({
    state: current,
    credits: TIER_CREDITS,
    pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd },
    topupAllowed: canPurchaseCreditTopup(plan),
  })
  const visible = offer.kind === 'switch' || (offer.kind === 'topup_only' && topup)
  const topupHere = topup && (offer.kind === 'topup_only' || (offer.kind === 'switch' && offer.topup))
  const fromTier = offer.kind === 'none' ? null : offer.from
  const toTier = offer.kind === 'switch' ? offer.to : null
  const offerKey = `${offer.kind}:${fromTier ?? ''}>${toTier ?? ''}`

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
      })
    } catch { /* telemetria nunca derruba a parede */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, offerKey])

  function track(choice: 'switch' | 'topup' | 'plans') {
    try {
      void trackEvent(SUBSCRIBER_UPGRADE_CLICKED_EVENT, {
        version: SUBSCRIBER_UPGRADE_VERSION,
        surface,
        choice,
        from: fromTier,
        to: toTier,
      })
    } catch { /* ignore */ }
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
  const topupModal = topupOpen ? <CreditsTopupModal surface={`subscriber_upgrade_${surface}`} onClose={() => setTopupOpen(false)} /> : null

  return (
    <div
      data-kineo="subscriber-upgrade"
      data-version={SUBSCRIBER_UPGRADE_VERSION}
      data-kind={offer.kind}
      style={{ margin: '12px 0', padding: '12px 13px', borderRadius: 12, background: c.card, border: `1px solid ${c.border}`, textAlign: 'left' }}
    >
      {offer.kind === 'switch' && phase === 'done' ? (
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
          {offer.kind === 'switch' && (
            <>
              <button type="button" data-kineo="subscriber-upgrade-switch" disabled={phase === 'switching'} onClick={() => void onSwitch()} style={primary}>
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
