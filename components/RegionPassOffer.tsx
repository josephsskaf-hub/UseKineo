'use client'

// KINEO-SAIDA-REGIAO-2026-10-07 (b) — o cartão do passe avulso na moeda local, para quem nasce 'region_paid_only'.
//
// Quem decide é o SERVIDOR (app/api/region-pass, régua e preço em lib/regionPass.ts): a montagem pergunta, o servidor
// confere a conta (região, has_paid === false, plano grátis, interruptor REGION_PASS_OFFER_LIVE), grava o
// region_pass_offer_shown e devolve o preço NA MOEDA EM QUE A STRIPE VAI COBRAR (BRL pela fórmula da casa; USD no resto).
// Enquanto a resposta não chega, nada é pintado; conta fora da régua (ou erro) recebe o `fallback` — o cartão que a tela
// já mostrava antes — para que a troca nunca deixe a tela com DOIS passes nem com nenhum.
// O botão navega para /api/region-pass?…&go=1 (o clique vira evento de servidor) e segue para o checkout de sempre do
// pack, devolvendo ao Studio. Nenhum preço digitado aqui.
import { useEffect, useState, type ReactNode } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { WALL_V1_PACK_BALANCE_KEY } from '@/lib/growth/wallV1'
import { REGION_PASS_COPY, REGION_PASS_VERSION, type RegionPassOffer as Offer, type RegionPassSurface } from '@/lib/regionPass'

const panel = { border: '1px solid var(--accent)', borderRadius: 14, padding: 16, background: 'var(--card2)', marginBottom: 18 } as const
const button = { border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 16px', fontWeight: 750, cursor: 'pointer' } as const

function isOffer(d: unknown): d is Offer {
  const o = d as Partial<Offer> | null
  return Boolean(o && o.eligible === true && typeof o.href === 'string' && o.price && typeof o.price.label === 'string' && typeof o.price.currency === 'string')
}

export default function RegionPassOffer({
  surface,
  fallback = null,
  beforeBuy,
  onDecided,
}: {
  surface: RegionPassSurface
  /** O que a tela mostrava antes, para quem não é da régua. */
  fallback?: ReactNode
  /** Do pai: guardar o rascunho antes de sair para o checkout (a volta é /studio/create?resume=wall_v1&pack=…). */
  beforeBuy?: () => void
  /** Do pai: o servidor respondeu (true = este cartão está na tela). */
  onDecided?: (eligible: boolean) => void
}) {
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined)
  const language = useInterfaceLanguage()
  const checkout = useCheckoutLaunch(`region_pass_${surface}`)

  useEffect(() => {
    let alive = true
    fetch(`/api/region-pass?surface=${surface}`, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        if (!alive) return
        const ok = isOffer(d)
        setOffer(ok ? d : null)
        onDecided?.(ok)
      })
      .catch(() => {
        if (!alive) return
        setOffer(null)
        onDecided?.(false)
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface])

  if (offer === undefined) return null
  if (offer === null) return <>{fallback}</>

  const copy = pickInterfaceCopy(REGION_PASS_COPY, language)
  const price = offer.price.label
  const pending = checkout.pending !== null
  return (
    <div data-region-pass={REGION_PASS_VERSION} data-surface={surface} data-currency={offer.price.currency} style={panel}>
      <p style={{ margin: '0 0 5px', fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>{copy.kicker}</p>
      <strong style={{ display: 'block', fontSize: 21, lineHeight: 1.25, color: 'var(--text)' }}>
        {surface === 'after_film' ? copy.afterFilmTitle(price) : copy.title(price)}
      </strong>
      <p style={{ margin: '8px 0', lineHeight: 1.5, color: 'var(--text)' }}>{copy.body(offer.price.seconds, offer.price.credits)}</p>
      {offer.price.currency !== 'usd' ? (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' }}>{copy.chargedIn(offer.price.currency.toUpperCase())}</p>
      ) : null}
      <button
        type="button"
        data-testid="region-pass-buy"
        disabled={pending}
        style={{ ...button, width: '100%', background: 'var(--accent)', color: 'var(--on-accent)', opacity: pending ? 0.6 : 1 }}
        onClick={() => {
          try { beforeBuy?.() } catch { /* o rascunho nunca impede a compra */ }
          try {
            if (typeof offer.balance === 'number') sessionStorage.setItem(WALL_V1_PACK_BALANCE_KEY, String(offer.balance))
          } catch { /* storage bloqueado: a volta mede sem régua */ }
          checkout.launch(`region_pass_${surface}`, offer.href, {
            surface,
            currency: offer.price.currency,
            amount_minor: offer.price.amountMinor,
            version: REGION_PASS_VERSION,
          })
        }}
      >
        {pending ? '…' : copy.cta(price)}
      </button>
      {checkout.error ? <p role="alert" style={{ marginTop: 8, fontSize: 12, color: 'var(--danger, #d43b3b)' }}>{checkout.error}</p> : null}
    </div>
  )
}
