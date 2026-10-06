'use client'

// KINEO-ADS-PAREDE-2026-10-06 — a oferta que /ads mostra a quem bateu na parede do Studio Ads (ver lib/ads/paywall.ts: quem vê,
// por que, e de onde vem cada número). Esta peça só PINTA o que o servidor calculou e MEDE:
//   · ads_paywall_viewed — UMA vez por montagem (ref, não render), com o retrato do que foi mostrado (plano, preço, créditos,
//     contagens, se o Express apareceu, se a conta é 'region_paid_only', logado ou não);
//   · ads_paywall_clicked {choice: 'plan' | 'express'} — o primeiro gesto, gravado antes de navegar (keepalive do trackEvent),
//     com a língua da interface já assentada.
// Os dois nomes estão na lista fechada lib/ads/events.ts (navegador). Copy na língua da interface: cada frase é chave de
// lib/ui/refinementCopy.json (16 línguas) e passa por useUiCopy(); os marcadores são preenchidos DEPOIS da tradução.
// Nenhum preço digitado aqui. Links simples (<a>, nunca <Link>, que pré-buscaria o GET do checkout).
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { ADS_OFFER_VERSION } from '@/lib/ads/offer'
import {
  ADS_PAYWALL_CLICKED_EVENT,
  ADS_PAYWALL_COPY as COPY,
  ADS_PAYWALL_VIEWED_EVENT,
  adsPaywallFill as fill,
  adsPaywallShown,
  type AdsPaywallOffer,
} from '@/lib/ads/paywall'

export default function AdsPaywall({
  offer,
  from,
  signedIn,
  regionPaidOnly,
}: {
  offer: AdsPaywallOffer
  /** A porta da parede por onde a pessoa chegou (já conferida no servidor contra ADS_PAYWALL_DOORS). */
  from: string
  signedIn: boolean
  regionPaidOnly: boolean
}) {
  const ui = useUiCopy()
  const language = useInterfaceLanguage()
  const viewedRef = useRef(false)
  const shown = adsPaywallShown(offer, { from, signedIn, regionPaidOnly })

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    try {
      void trackEvent(ADS_PAYWALL_VIEWED_EVENT, { ...shown, ads_offer_version: ADS_OFFER_VERSION })
    } catch {
      /* telemetry never breaks the page */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clicked(choice: 'plan' | 'express') {
    try {
      void trackEvent(ADS_PAYWALL_CLICKED_EVENT, { ...shown, ads_offer_version: ADS_OFFER_VERSION, choice, language })
    } catch {
      /* ignore */
    }
  }

  const price = offer.priceLabel
  return (
    <section
      className={offer.express ? 'ads-paywall' : 'ads-paywall ads-paywall-solo'}
      data-kineo="ads-paywall"
      data-version={offer.version}
      aria-labelledby="ads-paywall-title"
    >
      <div className="ads-paywall-copy">
        <h2 id="ads-paywall-title">{ui(COPY.title)}</h2>
        <p className="ads-paywall-sub">{ui(COPY.sub)}</p>
      </div>
      <div className="ads-paywall-plan">
        <div className="ads-paywall-head">
          <b>{offer.planName}</b>
          <span className="ads-paywall-price">{fill(ui(COPY.perMonth), { price })}</span>
        </div>
        <ul className="ads-paywall-facts">
          <li><span>{ui(COPY.credits)}</span><b>{offer.credits}</b></li>
          {offer.newAds > 0 ? <li><span>{fill(ui(COPY.newAds), { s: offer.newAdSeconds })}</span><b>{offer.newAds}</b></li> : null}
          {offer.classicAds > 0 ? <li><span>{fill(ui(COPY.classicAds), { s: offer.classicAdSeconds })}</span><b>{offer.classicAds}</b></li> : null}
        </ul>
        {offer.newAds > 0 && offer.classicAds > 0 ? <p className="ads-paywall-either">{ui(COPY.either)}</p> : null}
        <a href={offer.checkoutHref} className="go ok ads-go" data-kineo="ads-paywall-plan" onClick={() => clicked('plan')}>
          {fill(ui(COPY.cta), { plan: offer.planName, price })}
        </a>
        <p className="gnote">{ui(signedIn ? COPY.note : COPY.noteAnon)}</p>
      </div>
      {offer.express ? (
        <div className="ads-paywall-express">
          <a href={offer.express.href} data-kineo="ads-paywall-express" onClick={() => clicked('express')}>
            {fill(ui(COPY.express), { name: offer.express.name, price: offer.express.priceLabel, hours: offer.express.hours })} <span aria-hidden="true">→</span>
          </a>
          <p>{ui(COPY.expressNote)}</p>
        </div>
      ) : null}
    </section>
  )
}
