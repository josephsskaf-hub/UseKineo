'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — bloco "Créditos avulsos" do /pricing (peça D). A barra de 50 a 2.000 só existia dentro
// do modal do chip da barra lateral e dos 402; quem abria /pricing não sabia que dava para recarregar sem trocar de plano.
//
// FALHA FECHADA, DE PROPÓSITO: a maioria de quem visita /pricing está deslogada ou no free, e o checkout RECUSA recarga
// para eles (canPurchaseCreditTopup) e devolve para /pricing. Mostrar "Comprar" para essa gente seria vitrine oferecendo
// o que o cobrador recusa. Então o botão e o modal só existem com `canBuy` (estado 'eligible', lido de /api/credits, o
// mesmo campo `plan` que o checkout lê); deslogado, free, autopilot, leitura falha ou ainda carregando = texto honesto
// com a faixa e o "a partir de", e um link para os planos. O modal é o MESMO CreditsTopupModal (mesma barra, mesmo
// checkout, preço recalculado no servidor) — nada é reestilizado aqui.
import { useEffect, useRef, useState, type Ref } from 'react'
import CreditsTopupModal from '@/components/CreditsTopupModal'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney, type CheckoutCurrency } from '@/lib/checkoutPricing'
import {
  PRICING_BLOCK_CLICKED_EVENT,
  PRICING_BLOCK_SHOWN_EVENT,
  PRICING_CREDITS_BLOCK_ID,
  PRICING_ONE_TIME_LABEL,
  PRICING_PLANS_HREF,
  PRICING_TOPUP_SURFACE,
  createPricingBlockRecorder,
  observePricingBlockOnce,
  pricingBlockEventMetadata,
  pricingBlockMarker,
  pricingCreditsBlockModel,
  pricingCreditsStateFromRead,
  type PricingBlockCta,
  type PricingCreditsState,
} from '@/lib/growth/pricingOfferBlocks'

// Só dólar no checkout (KINEO-USD-ONLY-2026-08-19); mesmo formatador dos cards de plano.
const CURRENCY: CheckoutCurrency = 'usd'

const recorder = createPricingBlockRecorder({
  send: trackEvent,
  storage: () => (typeof window === 'undefined' ? null : window.sessionStorage),
})

function recordClick(state: PricingCreditsState, cta: PricingBlockCta) {
  void recorder.recordOnce(
    pricingBlockMarker(PRICING_BLOCK_CLICKED_EVENT, 'credits', cta),
    PRICING_BLOCK_CLICKED_EVENT,
    pricingBlockEventMetadata('credits', state, cta),
  )
}

/** Só marcação: o guardião renderiza esta parte com cada estado e com `open` ligado. */
export function PricingCreditsBlockView({
  state,
  open,
  onOpen,
  onClose,
  onChoosePlan,
  sectionRef,
}: {
  state: PricingCreditsState
  open: boolean
  onOpen?: () => void
  onClose?: () => void
  onChoosePlan?: () => void
  sectionRef?: Ref<HTMLElement>
}) {
  const model = pricingCreditsBlockModel(state)
  const canBuy = model.canBuy
  const fromPrice = model.fromPriceMinor === null ? null : formatCheckoutMoney(CURRENCY, model.fromPriceMinor)
  return (
    <section
      id={PRICING_CREDITS_BLOCK_ID}
      ref={sectionRef}
      aria-labelledby={`${PRICING_CREDITS_BLOCK_ID}-title`}
      className="mx-auto mt-14 max-w-3xl scroll-mt-24 text-center"
    >
      <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">{PRICING_ONE_TIME_LABEL}</div>
      <h2 id={`${PRICING_CREDITS_BLOCK_ID}-title`} className="mt-2 text-[1.7rem] font-black tracking-tight text-[#f5f5f7]">
        One-time credits
      </h2>
      <p className="mt-2 text-sm text-[#86868b]">
        Add {model.min.toLocaleString('en-US')} to {model.max.toLocaleString('en-US')} credits in one payment
        {fromPrice ? <>, from <strong className="text-[#f5f5f7]">{fromPrice}</strong></> : null}.
        {canBuy ? ' Your plan stays the same.' : null}
      </p>
      {canBuy ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 rounded-xl bg-[#2997ff] px-5 py-3 font-black text-white"
        >
          Add credits
        </button>
      ) : state === 'loading' ? null : (
        <p data-kineo="pricing-credits-locked" className="mt-3 text-[12.5px] text-[#86868b]">
          {state === 'read_error' ? 'We could not check your plan right now. ' : ''}
          Top-ups are for Starter, Creator and Studio subscribers.{' '}
          <a href={PRICING_PLANS_HREF} onClick={onChoosePlan} className="font-bold text-[#2997ff] hover:underline">
            Choose a plan ↑
          </a>
        </p>
      )}
      {/* Portal no <body>: a seção da página de preços é relative z-10 e o modal (fixed z-90) ficaria atrás da barra
          fixa de planos e do menu (revisão adversarial de 25/09). */}
      {open && canBuy && (typeof document !== 'undefined'
        ? createPortal(<CreditsTopupModal onClose={onClose ?? (() => {})} surface={PRICING_TOPUP_SURFACE} />, document.body)
        : <CreditsTopupModal onClose={onClose ?? (() => {})} surface={PRICING_TOPUP_SURFACE} />)}
    </section>
  )
}

export default function PricingCreditsBlock() {
  const [state, setState] = useState<PricingCreditsState>('loading')
  const [open, setOpen] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const shownMarker = pricingBlockMarker(PRICING_BLOCK_SHOWN_EVENT, 'credits')

  // Leitura só em efeito (nada de rede no render: o guardião test-app-blue-layout renderiza o /pricing offline).
  useEffect(() => {
    let cancelled = false
    void fetch('/api/credits', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        let body: unknown = null
        try {
          body = await r.json()
        } catch {
          body = null
        }
        return { status: r.status, body }
      })
      .then((read) => {
        if (!cancelled) setState(pricingCreditsStateFromRead(read))
      })
      .catch(() => {
        if (!cancelled) setState('read_error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // A impressão só conta depois que o estado resolveu: 'loading' não diz nada sobre quem viu o quê.
  useEffect(() => {
    const target = sectionRef.current
    if (!target || state === 'loading') return
    return observePricingBlockOnce(
      target,
      () => recorder.recordOnce(shownMarker, PRICING_BLOCK_SHOWN_EVENT, pricingBlockEventMetadata('credits', state)),
      () => recorder.wasRecorded(shownMarker),
    )
  }, [state, shownMarker])

  return (
    <PricingCreditsBlockView
      state={state}
      open={open}
      sectionRef={sectionRef}
      onOpen={() => {
        recordClick(state, 'credits_open')
        setOpen(true)
      }}
      onClose={() => setOpen(false)}
      onChoosePlan={() => recordClick(state, 'credits_choose_plan')}
    />
  )
}
