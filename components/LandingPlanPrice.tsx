'use client'

// KINEO-USD-ONLY-2026-08-19 — o checkout e a vitrine usam USD para todos os
// países. O lookup permanece porque a rota compartilhada também devolve a
// região e conserva o contrato dos callers, mas não escolhe outra moeda.
// Preço e fallback saem da fonte canônica; nenhuma string pode prometer
// conversão local.
import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getTierPrice,
  TIER_PRICES,
  type CheckoutCurrency,
  type CheckoutTier,
  type PriceRegion,
} from '@/lib/checkoutPricing'

type Resolved = { currency: CheckoutCurrency; region: PriceRegion }

// Uma resolução por página, compartilhada por todas as instâncias (são 6 no
// bloco de planos: 3 preços grandes + 3 CTAs).
let geoPromise: Promise<Resolved> | null = null
function resolveGeoOnce(): Promise<Resolved> {
  if (!geoPromise) {
    geoPromise = fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('geo failed')
        const data = (await r.json()) as { currency?: string; region?: string }
        const currency: CheckoutCurrency =
          'usd' // KINEO-USD-ONLY-2026-08-19
        return { currency, region: coercePriceRegion(data.region) }
      })
      .catch(() => ({ currency: 'usd' as CheckoutCurrency, region: 'standard' as PriceRegion }))
  }
  return geoPromise
}

// Fallback de SSR/crawler: o preço padrão em USD. Deliberadamente restrito aos
// três tiers da vitrine — o Autopilot ($299) não tem preço regional nem card
// nesta grade, e deixá-lo fora do tipo impede que alguém o adicione aqui sem
// perceber que getTierPrice() nem o aceita.
// KINEO-PLANOS-9-19-29-2026-09-08 — o fallback SSR era digitado ($7/$15) e
// mentia na home até o /api/geo responder. Agora sai da fonte única.
const USD_FALLBACK: Record<CheckoutTier, string> = {
  starter: formatCheckoutMoney('usd', TIER_PRICES.starter.usd),
  basic: formatCheckoutMoney('usd', TIER_PRICES.basic.usd),
  pro: formatCheckoutMoney('usd', TIER_PRICES.pro.usd),
}

export default function LandingPlanPrice({
  tier,
  variant,
  ctaLabel,
}: {
  tier: CheckoutTier
  variant: 'big' | 'cta'
  /** Verbo do botão: "Start", "Go Creator", "Go Studio". */
  ctaLabel?: string
}) {
  const [resolved, setResolved] = useState<Resolved | null>(null)

  useEffect(() => {
    let cancelled = false
    void resolveGeoOnce().then((r) => {
      if (!cancelled) setResolved(r)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // getTierPrice mantém a API histórica, hoje com uma única região e moeda.
  const price = resolved
    ? formatCheckoutMoney(resolved.currency, getTierPrice(tier, resolved.currency, resolved.region))
    : USD_FALLBACK[tier]

  if (variant === 'cta') return <><UiLabel>{ctaLabel ?? 'Start'}</UiLabel> — {price}<UiLabel>/mo</UiLabel></>
  return (
    <>
      {price}
      <span><UiLabel>/mo</UiLabel></span>
    </>
  )
}
