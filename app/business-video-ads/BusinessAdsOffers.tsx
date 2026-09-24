'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { dfyPaymentLink } from '@/lib/growth/dfyOffer'
import { BUSINESS_ADS_VERSION, DFY_SERVICE_FACT } from '@/lib/growth/dfyServiceFacts'
import styles from './businessAds.module.css'

export default function BusinessAdsOffers() {
  const [identity, setIdentity] = useState<{ id: string; email?: string } | null>(null)
  const viewed = useRef(false)
  useEffect(() => {
    let alive = true
    try {
      void createClient().auth.getUser().then(({ data }) => {
        if (alive && data.user) setIdentity({ id: data.user.id, email: data.user.email })
      }).catch(() => { /* Anonymous checkout remains available. */ })
    } catch { /* Public page remains usable without an authenticated session. */ }
    if (!viewed.current) {
      viewed.current = true
      void trackEvent('business_ads_page_viewed', { business_ads_page_viewed: true, version: BUSINESS_ADS_VERSION })
    }
    return () => { alive = false }
  }, [])

  return <div className={styles.offers} id="packages">
    {DFY_SERVICE_FACT.tiers.map(tier => {
      const href = dfyPaymentLink({ tier: tier.tier, userId: identity?.id, email: identity?.email, source: 'page_business_ads' })
      if (!href) return null
      return <article className={styles.offer} key={tier.tier}>
        <div className={styles.offerTop}><h3>{tier.name}</h3><span>One video · one-time payment</span></div>
        <p className={styles.price}>{tier.priceLabel}</p>
        <p className={styles.terms}>{tier.hours} hours · {tier.revisions} {tier.revisions === 1 ? 'revision' : 'revisions'}</p>
        <p className={styles.engines}>{tier.engines}</p>
        <p className={styles.detail}>{tier.detail}</p>
        <a className={styles.buy} href={href} target="_blank" rel="noopener noreferrer" onClick={() => {
          void trackEvent('business_ads_cta_clicked', { tier: tier.tier, version: BUSINESS_ADS_VERSION })
        }}>Order {tier.name}<span aria-hidden="true"> ↗</span></a>
        <small>Secure Stripe checkout. Opens in a new tab.</small>
      </article>
    })}
    {DFY_SERVICE_FACT.tiers.length === 0 && <p>New orders are temporarily unavailable.</p>}
  </div>
}
