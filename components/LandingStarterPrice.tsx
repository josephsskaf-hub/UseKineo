'use client'

// KINEO-REGIONAL-VITRINE-2026-08-19 — o achado da noite (fundador: "vamos
// fazer o starter regional AGORA"): o preço regional JÁ ESTAVA VIVO no
// checkout desde 04/08 ($4.99/₹399/R$24,90, 18 países) e o /pricing já o
// exibia — mas a HOME, a página mais vista do site, mostrava "$9.90/mo"
// CHUMBADO para todo mundo. Medido em 14 dias: Índia = 70 signups, 17
// chegaram ao checkout, ZERO pagaram; Nigéria 28/7/zero. O indiano se
// assustava na vitrine e nunca descobria que a prateleira dele custa ₹399.
//
// Este componente é a ponte: client island minúscula que resolve o /api/geo
// UMA vez (cache de módulo, todas as instâncias compartilham) e mostra o
// preço do Starter na moeda+região do visitante. Enquanto resolve — e para
// crawler/SEO — o fallback é o preço padrão $9.90, então nada "pisca" pra
// quem é standard e o Google segue vendo o preço cheio.
import { useEffect, useState } from 'react'
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getTierPrice,
  type CheckoutCurrency,
  type PriceRegion,
} from '@/lib/checkoutPricing'

type Resolved = { currency: CheckoutCurrency; region: PriceRegion }

// Uma resolução por página, compartilhada entre as instâncias (big + cta).
let geoPromise: Promise<Resolved> | null = null
function resolveGeoOnce(): Promise<Resolved> {
  if (!geoPromise) {
    geoPromise = fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('geo failed')
        const data = (await r.json()) as { currency?: string; region?: string }
        const currency: CheckoutCurrency =
          data.currency === 'brl' || data.currency === 'inr' || data.currency === 'usd' ? data.currency : 'usd'
        return { currency, region: coercePriceRegion(data.region) }
      })
      .catch(() => ({ currency: 'usd' as CheckoutCurrency, region: 'standard' as PriceRegion }))
  }
  return geoPromise
}

export default function LandingStarterPrice({ variant }: { variant: 'big' | 'cta' }) {
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

  // Fallback (e SSR/crawler): preço padrão — na dúvida, preço cheio.
  const price =
    resolved && resolved.region === 'value'
      ? formatCheckoutMoney(resolved.currency, getTierPrice('starter', resolved.currency, resolved.region))
      : resolved
        ? formatCheckoutMoney(resolved.currency, getTierPrice('starter', resolved.currency, 'standard'))
        : '$9.90'

  if (variant === 'cta') return <>Start — {price}/mo</>
  return (
    <>
      {price}
      <span>/mo</span>
    </>
  )
}
