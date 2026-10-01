'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MRR_SHOWCASE_ENABLED, MRR_SHOWCASE_VERSION, showcasePlanValue } from '@/lib/growth/mrrShowcase'
import { SEEDANCE_15S_PUBLIC } from '@/lib/engineLaunch'
import { formatCheckoutMoney } from '@/lib/checkoutPricing'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import { UiLabel } from '@/components/InterfaceLanguage'
import styles from '@/app/examples/ExamplesGallery.module.css'

export default function ShowcaseExperience() {
  const [seconds, setSeconds] = useState<15 | 35 | 60>(35)
  const impression = useRef(false)
  const firstGesture = useRef(false)
  const panel = useRef<HTMLDivElement>(null)
  const value = showcasePlanValue('starter', seconds)
  useEffect(() => {
    if (!MRR_SHOWCASE_ENABLED || !panel.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting) || impression.current) return
      impression.current = true
      void trackEvent('mrr_showcase_viewed', { version: MRR_SHOWCASE_VERSION, surface: 'film_value' })
      observer.disconnect()
    }, { threshold: 0.25 })
    observer.observe(panel.current)
    return () => observer.disconnect()
  }, [])
  const recordGesture = () => {
    if (firstGesture.current) return
    firstGesture.current = true
    void trackEvent('mrr_showcase_first_gesture', { version: MRR_SHOWCASE_VERSION, surface: 'film_value' })
  }
  if (!MRR_SHOWCASE_ENABLED) return null
  return <div ref={panel} className="sc-section-inner" onClickCapture={event => { if ((event.target as HTMLElement).closest('a,button,select,input')) recordGesture() }} onChangeCapture={recordGesture} data-mrr-showcase={MRR_SHOWCASE_VERSION}>
    <section className={styles.createBand} aria-labelledby="showcase-film-value">
      <div>
        <h2 id="showcase-film-value"><UiLabel>What does a month of films look like?</UiLabel></h2>
        <p><UiLabel>Choose a Seedance 1.5 film length to see what the Starter plan includes.</UiLabel></p>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <UiLabel>Film length</UiLabel>
          <select value={seconds} onChange={e => setSeconds(Number(e.target.value) as 15 | 35 | 60)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', colorScheme: 'inherit' }}>
            {SEEDANCE_15S_PUBLIC && <option value={15}>15s</option>}
            <option value={35}>35s</option><option value={60}>60s</option>
          </select>
        </label>
        <p aria-live="polite"><strong>{value.films} <UiLabel>films / month</UiLabel></strong> · {formatCheckoutMoney('usd', value.monthlyPriceMinor)} USD / <UiLabel>month</UiLabel></p>
        <p>{value.credits} <UiLabel>monthly credits</UiLabel> ÷ {value.cost} <UiLabel>credits per film</UiLabel>.
          {' '}<UiLabel>Using all monthly credits for this format, without extras. Other engines and lengths use different credits.</UiLabel></p>
        <p><UiLabel>Standard monthly price. Available offers and full plan details are shown on Pricing.</UiLabel></p>
      </div>
      <Link className={styles.navCta} href="/pricing" data-showcase-action="pricing"
        onClick={() => { rememberSignupCampaign(MRR_SHOWCASE_VERSION); void trackEvent('mrr_showcase_plans_clicked', { version: MRR_SHOWCASE_VERSION, seconds }) }}>
        <UiLabel>See plans →</UiLabel>
      </Link>
    </section>
  </div>
}
