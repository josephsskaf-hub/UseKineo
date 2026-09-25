'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — bloco "Anúncios" do /pricing (peça D). Duas portas, como no /business-video-ads:
// "Make it yourself" (passe do Studio Ads) e "We make it for you" (Express/Pro). Marcação simples de propósito: a pele
// v5 (public/design/polished-v5-20260925/pricing.html) é do Codex, que pode restilizar SEM trocar os hrefs, o
// interruptor do passe nem os nomes dos eventos (o guardião scripts/test-pricing-3-blocos-2026-09-25.mjs trava os três).
// Nenhum preço digitado: tudo sai de lib/growth/pricingOfferBlocks, que lê as fontes únicas.
import { useEffect, useRef, type Ref } from 'react'
import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney, type CheckoutCurrency } from '@/lib/checkoutPricing'
import {
  PRICING_ADS_BLOCK_ID,
  PRICING_BLOCK_CLICKED_EVENT,
  PRICING_BLOCK_SHOWN_EVENT,
  PRICING_ONE_TIME_LABEL,
  createPricingBlockRecorder,
  observePricingBlockOnce,
  pricingAdsBlockModel,
  pricingBlockEventMetadata,
  pricingBlockMarker,
  type PricingAdsBlockModel,
  type PricingBlockCta,
} from '@/lib/growth/pricingOfferBlocks'

// O checkout só cobra em dólar (KINEO-USD-ONLY-2026-08-19; test-checkout-currency-truth trava CURRENCY_DISPLAY = usd).
// Mesmo formatador dos cards de plano ("$" + centavos), não o rótulo "US$…" do adsPassPriceLabel.
const CURRENCY: CheckoutCurrency = 'usd'
const money = (minor: number) => formatCheckoutMoney(CURRENCY, minor)

const recorder = createPricingBlockRecorder({
  send: trackEvent,
  storage: () => (typeof window === 'undefined' ? null : window.sessionStorage),
})

function recordClick(model: PricingAdsBlockModel, cta: PricingBlockCta) {
  void recorder.recordOnce(
    pricingBlockMarker(PRICING_BLOCK_CLICKED_EVENT, 'ads', cta),
    PRICING_BLOCK_CLICKED_EVENT,
    pricingBlockEventMetadata('ads', model.state, cta),
  )
}

/** Só marcação: o guardião renderiza esta parte com modelos simulados (passe desligado, sem degrau, etc.). */
export function PricingAdsBlockView({
  model,
  sectionRef,
  onCtaClick,
}: {
  model: PricingAdsBlockModel
  sectionRef?: Ref<HTMLElement>
  onCtaClick?: (cta: PricingBlockCta) => void
}) {
  if (!model.visible) return null
  const { pass, dfy } = model
  return (
    <section
      id={PRICING_ADS_BLOCK_ID}
      ref={sectionRef}
      aria-labelledby={`${PRICING_ADS_BLOCK_ID}-title`}
      className="mx-auto mt-14 max-w-5xl scroll-mt-24"
    >
      <div className="mb-4 text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">{PRICING_ONE_TIME_LABEL}</div>
        <h2 id={`${PRICING_ADS_BLOCK_ID}-title`} className="mt-2 text-[1.7rem] font-black tracking-tight text-[#f5f5f7]">
          Ads for your business
        </h2>
        <p className="mt-1 text-[12.5px] text-[#86868b]">Not affected by the Monthly / Annual switch above.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pass && (
          <div data-kineo="pricing-ads-pass" className="rounded-2xl border border-[#2b3e52] p-6">
            <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">Make it yourself</div>
            <h3 className="mt-1 text-xl font-black text-[#f5f5f7]">{pass.name}</h3>
            <p className="mt-1 text-sm text-[#86868b]">{pass.headline}</p>
            <p className="mt-3 text-[#f5f5f7]">
              <strong className="text-2xl font-black">{money(pass.priceMinor)}</strong> one-time pass
            </p>
            <p className="text-sm text-[#86868b]">
              {pass.credits} credits · {pass.accessDays} days of access
            </p>
            <p className="mt-2 text-[12.5px] text-[#86868b]">Paid subscription plans already include {pass.name}.</p>
            <a
              href={pass.href}
              onClick={() => onCtaClick?.(pass.cta)}
              className="mt-4 inline-block font-bold text-[#2997ff] hover:underline"
            >
              See {pass.name} →
            </a>
          </div>
        )}
        {dfy.length > 0 && (
          <div data-kineo="pricing-ads-dfy" className="rounded-2xl border border-[#2b3e52] p-6">
            <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">We make it for you</div>
            <h3 className="mt-1 text-xl font-black text-[#f5f5f7]">{dfy.map((t) => t.name).join(' or ')}</h3>
            <p className="mt-1 text-sm text-[#86868b]">A human editor makes the ad from your brief.</p>
            <ul className="mt-3 space-y-3">
              {dfy.map((t) => (
                <li key={t.tier} className="text-[#f5f5f7]">
                  <strong className="font-black">{t.name}</strong> — <strong>{money(t.priceMinor)}</strong> per video
                  <span className="block text-sm text-[#86868b]">
                    {t.hours} h · {t.revisions} {t.revisions === 1 ? 'revision' : 'revisions'} · {t.engines}
                  </span>
                  <a
                    href={t.href}
                    onClick={() => onCtaClick?.(t.cta)}
                    className="mt-1 inline-block font-bold text-[#2997ff] hover:underline"
                  >
                    Choose {t.name} →
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

export default function PricingAdsBlock() {
  const model = pricingAdsBlockModel()
  const sectionRef = useRef<HTMLElement>(null)
  const shownMarker = pricingBlockMarker(PRICING_BLOCK_SHOWN_EVENT, 'ads')

  useEffect(() => {
    const target = sectionRef.current
    if (!target || !model.visible) return
    return observePricingBlockOnce(
      target,
      () => recorder.recordOnce(shownMarker, PRICING_BLOCK_SHOWN_EVENT, pricingBlockEventMetadata('ads', model.state)),
      () => recorder.wasRecorded(shownMarker),
    )
  }, [model.visible, model.state, shownMarker])

  return <PricingAdsBlockView model={model} sectionRef={sectionRef} onCtaClick={(cta) => recordClick(model, cta)} />
}
