'use client'

// KINEO-KIT-BF-VENDA-2010 — o cartão "Kit Black Friday — US$ 49" (Studio Ads e /pricing) e o selo da oferta antecipada do anual (/pricing).
// Quem decide se aparece é o SERVIDOR (/api/offers/black-friday: relógio, plano Business). Venda fechada = nada; Business = "incluído no seu
// plano" no lugar do botão; o resto = o botão do checkout (GET ?pack=kit_bf; o preço nunca vai na URL). Números e frases: lib/ads/kitBfSale.ts.
// O selo do anual só pinta num plano em que "2 meses grátis" baixa o preço de verdade — com os preços de hoje, em nenhum (lib/billing/annualEarlyOffer.ts).
import { useEffect, useState } from 'react'
import { KIT_BF_CHECKOUT_HREF, kitBfCardText } from '@/lib/ads/kitBfSale'

type Badge = { priceMinor: number; savedMinor: number; daysLeft: number } | null
interface BfOffers {
  nowMs: number
  kit: { state: 'buy' | 'included' | 'closed'; endsAt: string; daysLeft: number }
  annual: { open: boolean; endsAt: string; tiers: Record<string, { winner: string; badge: Badge }> }
}

let pending: Promise<BfOffers | null> | null = null
function loadOffers(): Promise<BfOffers | null> {
  if (!pending) {
    pending = fetch('/api/offers/black-friday', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? (r.json() as Promise<BfOffers>) : null))
      .catch(() => null)
  }
  return pending
}
function useBfOffers(): BfOffers | null {
  const [o, setO] = useState<BfOffers | null>(null)
  useEffect(() => {
    let alive = true
    void loadOffers().then((v) => { if (alive) setO(v) })
    return () => { alive = false }
  }, [])
  return o
}

const CSS = `
.kitbf{margin:12px 0;padding:14px 16px;border:1px solid #FFD400;border-radius:14px;background:linear-gradient(135deg,rgba(255,212,0,.10),rgba(255,212,0,.02));color:inherit}
.kitbf h4{margin:0;font-size:15px;font-weight:800;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline}
.kitbf h4 span{font-size:13px;font-weight:700;color:#FFD400}
.kitbf ul{margin:8px 0 0;padding:0 0 0 18px;font-size:13px;line-height:1.45}
.kitbf .kitbf-row{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:10px 0 0}
.kitbf a.kitbf-cta{display:inline-block;padding:9px 14px;border-radius:10px;background:#FFD400;color:#111;font-weight:800;font-size:14px;text-decoration:none}
.kitbf .kitbf-ends{font-size:12px;opacity:.8}
.kitbf .kitbf-inc{font-size:13px;font-weight:700;color:#FFD400}
`

/** O cartão do kit. `lang` = a língua da interface (16; desconhecida = inglês). */
export function KitBfBuyCard({ lang = 'en', surface }: { lang?: string; surface: 'ads' | 'pricing' }) {
  const o = useBfOffers()
  if (!o || o.kit.state === 'closed') return null
  const t = kitBfCardText(lang, o.kit.daysLeft)
  const included = o.kit.state === 'included'
  return (
    <section className="kitbf" id="kit-bf" data-kineo="kit-bf-buy" data-surface={surface} data-state={o.kit.state} aria-label={t.title}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h4>{t.title}<span>{included ? t.included : t.priceLine}</span></h4>
      <ul>{t.bullets.slice(0, included ? 2 : 3).map((b) => <li key={b}>{b}</li>)}</ul>
      <div className="kitbf-row">
        {included
          ? <span className="kitbf-inc" data-kineo="kit-bf-included">{t.includedNote}</span>
          : <><a className="kitbf-cta" data-kineo="kit-bf-cta" href={`${KIT_BF_CHECKOUT_HREF}&surface=${surface}`}>{t.cta}</a><span className="kitbf-ends">{t.ends}</span></>}
      </div>
    </section>
  )
}

const PLAN_NAME: Record<string, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** O selo da oferta antecipada do anual (/pricing, inglês como a página). Nada quando nenhum plano baixa de preço (o caso de hoje). */
export function AnnualEarlyOfferBadge() {
  const o = useBfOffers()
  if (!o || !o.annual.open) return null
  const rows = Object.entries(o.annual.tiers).filter(([, v]) => v.badge)
  if (!rows.length) return null
  return (
    <p data-kineo="annual-early-offer" style={{ margin: '8px auto 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FFD400' }}>
      {rows.map(([tier, v]) => `${PLAN_NAME[tier] ?? tier} annual: 2 months free — $${((v.badge as NonNullable<Badge>).priceMinor / 100).toFixed(0)}/yr`).join(' · ')}
      {` · until Nov 21 · ${(rows[0][1].badge as NonNullable<Badge>).daysLeft} days left`}
    </p>
  )
}
