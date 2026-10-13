'use client'

// KINEO-PAGINAS-QUE-VENDEM-2026-10-12 — o botão de compra direta da primeira dobra das páginas citadas pelo ChatGPT.
// Um componente só, reaproveitado nas 6 páginas (ver lib/growth/buyCreatorOffer.ts para o porquê e a origem de cada número).
// Âncora de verdade (<a>, nunca next/link: o destino é a rota GET do checkout, não uma página) e o MESMO lançador de todo
// botão que leva à Stripe (useCheckoutLaunch: trava de clique duplo, "Opening secure checkout…", sondas de resgate e o
// evento checkout_cta_clicked com o mesmo session_id do checkout_attempted do servidor). Clique modificado (nova aba) segue
// a âncora nativa. O botão grátis de cada página continua ao lado, como secundário.
import type { MouseEvent, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  BUY_CREATOR_VERSION,
  buyCreatorCampaign,
  buyCreatorCopy,
  buyCreatorHref,
  buyCreatorPrice,
  type BuyCreatorLang,
} from '@/lib/growth/buyCreatorOffer'

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export default function BuyCreatorCta({
  page,
  lang = 'en',
  align = 'center',
  secondary,
}: {
  /** Nome curto da página (vira intent_campaign=buy_creator_<page>). */
  page: string
  lang?: BuyCreatorLang
  align?: 'center' | 'left'
  /** O botão grátis que já existia na página, renderizado ao lado como secundário. */
  secondary?: ReactNode
}) {
  const href = buyCreatorHref(page)
  const campaign = buyCreatorCampaign(page)
  const copy = buyCreatorCopy(lang)
  const price = buyCreatorPrice()
  const checkout = useCheckoutLaunch(`buy_creator_${page}`)
  const pending = checkout.pending !== null
  const metadata = { version: BUY_CREATOR_VERSION, tier: 'basic', billing: 'monthly', intent_campaign: campaign, welcome20_shown: price.firstMonth !== null }

  return (
    <div data-kineo="buy-creator-cta" style={{ margin: '22px 0 0', textAlign: align }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: align === 'center' ? 'center' : 'flex-start', alignItems: 'center' }}>
        <a
          href={href}
          rel="nofollow"
          aria-busy={pending}
          onClick={(event) => {
            if (isModifiedClick(event)) {
              void trackEvent('buy_creator_cta_clicked', { ...metadata, navigation_mode: 'native_modified' })
              return
            }
            event.preventDefault()
            const started = checkout.launch('basic', href, metadata)
            if (started) void trackEvent('buy_creator_cta_clicked', { ...metadata, navigation_mode: 'protected_same_tab' })
          }}
          style={{ display: 'inline-block', background: '#2997ff', color: '#001b33', fontWeight: 900, padding: '15px 26px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem', lineHeight: 1.3 }}
        >
          {pending ? (lang === 'pt' ? 'Abrindo o checkout seguro…' : lang === 'es' ? 'Abriendo el pago seguro…' : 'Opening secure checkout…') : copy.button}
        </a>
        {secondary}
      </div>
      <p style={{ margin: '10px 0 0', color: '#f5f5f7', fontSize: '.92rem', lineHeight: 1.5 }}>
        {price.firstMonth ? (
          <>
            <s style={{ color: '#86868b' }}>{price.full}</s> <strong>{price.firstMonth}</strong>{' '}
            {lang === 'pt' ? `no 1º mês, depois ${price.full}/mês` : lang === 'es' ? `el primer mes, después ${price.full}/mes` : `for the first month, then ${price.full}/month`}
          </>
        ) : (
          <strong>{copy.priceLine}</strong>
        )}
      </p>
      <p style={{ margin: '4px 0 0', color: '#86868b', fontSize: '.8rem', lineHeight: 1.5 }}>{copy.note}</p>
      {checkout.error && (
        <p role="alert" style={{ margin: '8px 0 0', color: '#ffb454', fontSize: '.85rem' }}>{checkout.error}</p>
      )}
    </div>
  )
}
