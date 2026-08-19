'use client'

// KINEO-VITRINE-MOEDA-2026-08-19 — a vitrine falava DUAS MOEDAS ao mesmo tempo.
//
// PERGUNTA DO FUNDADOR (brasileiro, olhando o próprio site): "o preço que eu
// enxergo é em dólar; a pessoa só sabe que o preço cai quando clica em pagar?
// isso tira credibilidade." Fui conferir e é pior do que ele descreveu.
//
// O QUE UM BRASILEIRO VIA NO BLOCO DE PLANOS DA HOME, hoje de manhã:
//     Starter  R$ 24,90   ← regional, correto (push 192, hoje cedo)
//     Creator  $19.90     ← CHUMBADO em dólar
//     Studio   $39.90     ← CHUMBADO em dólar
// Ou seja: real ao lado de dólar, na mesma tabela, lado a lado. Isso é PIOR
// do que tudo em dólar — o visitante não consegue nem comparar os planos
// entre si sem fazer câmbio de cabeça, e o degrau de cima parece mais barato
// que o de baixo dependendo de como ele leia.
//
// E o dano é mensurável na direção contrária à intuição: o Creator brasileiro
// custa R$79,90 no checkout. Mostrando "$19.90", o visitante faz a conta a
// ~R$5,5 e lê ~R$110 — 38% ACIMA do que a gente ia cobrar dele. A vitrine
// estava assustando o cliente com um número que nem é nosso, e quem desiste
// nessa hora nunca chega ao checkout para descobrir que era mais barato.
//
// Isso importa hoje mais que qualquer coisa: o fundador já fechou, em estudo
// repetido, que o vazamento do checkout É PREÇO (ver CLAUDE.md). Uma vitrine
// que mente o preço para cima é exatamente o ferimento que ele diagnosticou,
// só que auto-infligido.
//
// Este componente substitui LandingStarterPrice e serve QUALQUER tier. Uma
// única resolução de /api/geo por página (cache de módulo compartilhado entre
// as instâncias) e o preço sai de getTierPrice() na moeda + região do
// visitante — nunca string digitada à mão. Enquanto resolve, e para
// crawler/SEO, o fallback é o preço padrão em USD: na dúvida, preço cheio.
import { useEffect, useState } from 'react'
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getTierPrice,
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
const USD_FALLBACK: Record<CheckoutTier, string> = {
  starter: '$7.00',
  basic: '$15.00',
  pro: '$29.00',
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

  // getTierPrice já sabe que só `starter` e `basic` têm preço regional — o
  // Studio em região `value` cai no padrão sozinho, sem `if` aqui.
  const price = resolved
    ? formatCheckoutMoney(resolved.currency, getTierPrice(tier, resolved.currency, resolved.region))
    : USD_FALLBACK[tier]

  if (variant === 'cta') return <>{ctaLabel ?? 'Start'} — {price}/mo</>
  return (
    <>
      {price}
      <span>/mo</span>
    </>
  )
}
