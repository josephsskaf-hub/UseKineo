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
// KINEO-HOME-TEXTOS-2026-10-12 — o 1º mês com 20% (WELCOME20 automático do servidor no Creator/Studio mensal) é calculado
// pela MESMA função que o checkout grava em public_promo_first_charge_minor: nenhum $15.92/$43.92 digitado aqui.
import { publicPromoFirstChargeMinor, WELCOME20_PERCENT_OFF } from '@/lib/growth/publicPromoTruth'

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
  welcomeFirstMonth = false,
}: {
  tier: CheckoutTier
  /** 'then' (KINEO-HOME-TEXTOS-2026-10-12) = a linha de baixo do preço com 1º mês: "20% off your first month · then $X/mo". */
  variant: 'big' | 'cta' | 'then'
  /** Verbo do botão: "Start", "Go Creator", "Go Studio". */
  ctaLabel?: string
  /** KINEO-HOME-TEXTOS-2026-10-12 — só no 'big': mostra o 1º mês com 20% e o preço cheio riscado. O chamador passa o
   *  interruptor único (WELCOME20_SITE_OFFER_LIVE); o Starter nunca recebe o desconto, mesmo se alguém passar true. */
  welcomeFirstMonth?: boolean
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
  if (variant === 'then') return <><UiLabel>{`${WELCOME20_PERCENT_OFF}% off your first month · then `}</UiLabel>{price}<UiLabel>/mo</UiLabel></>
  // KINEO-HOME-TEXTOS-2026-10-12 — mesma regra do servidor (welcome20AutoSkipReason): só Creator ('basic') e Studio ('pro').
  const currency: CheckoutCurrency = resolved?.currency ?? 'usd'
  const fullMinor = resolved ? getTierPrice(tier, resolved.currency, resolved.region) : TIER_PRICES[tier].usd
  const firstMinor = welcomeFirstMonth && (tier === 'basic' || tier === 'pro')
    ? publicPromoFirstChargeMinor('welcome_first_month_20', fullMinor)
    : null
  if (firstMinor !== null) {
    return (
      <>
        <s className="pr-was">{price}</s>
        {formatCheckoutMoney(currency, firstMinor)}
        <span><UiLabel>/first month</UiLabel></span>
      </>
    )
  }
  return (
    <>
      {price}
      <span><UiLabel>/mo</UiLabel></span>
    </>
  )
}
