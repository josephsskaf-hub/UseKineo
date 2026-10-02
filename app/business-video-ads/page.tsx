import type { Metadata } from 'next'
import Image from 'next/image'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { DFY_SERVICE_FACT } from '@/lib/growth/dfyServiceFacts'
import { adsSegmentOffer } from '@/lib/growth/adsSegmentPresentation'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import BusinessAdsOffers from './BusinessAdsOffers'
// KINEO-NUVEM-A4-2026-10-02 — card "Kineo Business" (o Studio para empresas; sem preço novo). Página estática: só aparece
// com KINEO_BUSINESS_CARD_LIVE=true (o preview da casa mora no /ads, que é dinâmico).
import { KINEO_BUSINESS_CARD_LIVE, kineoBusinessOffer } from '@/lib/growth/kineoBusiness'
import { TIER_CREDITS, formatCheckoutMoney, getTierPrice } from '@/lib/checkoutPricing'
import { planName } from '@/lib/growth/planFit'
import { characterLimitFor } from '@/lib/characterLimits'
import { ADS_VARIACOES_PUBLIC } from '@/lib/ads/v2Variations'
import { SPACES_PUBLIC } from '@/lib/spaces/spaces'
import styles from './businessAds.module.css'

export const dynamic = 'force-static'
export const metadata: Metadata = {
  title: 'Business Video Ads — Create or Order | Kineo',
  description: 'Make your own video ad with Studio Ads, included in any paid plan. Or order an Express or Pro video made from your brief by Kineo Empresas.',
  alternates: { canonical: DFY_SERVICE_FACT.url },
  openGraph: { title: 'Your business. Your next video ad.', description: 'Make it yourself with Studio Ads, or choose an operated Express or Pro production.', url: DFY_SERVICE_FACT.url, type: 'website' },
}

// Brief sources: anonymized completed-video requests, 11 and 17 Sep 2026.
// Clinic: founder-approved fictional demonstration, 24 Sep; not a customer result.
const BRIEFS = [
  { label: 'Restaurant', tag: 'Anonymized real brief', title: 'Give a family a reason to choose your restaurant.', text: 'A cinematic restaurant ad: a family chooses where to eat, arrives and enjoys the atmosphere. Keep the same characters across scenes and finish with the restaurant’s approved call to action.' },
  { label: 'Clinic', tag: 'Fictional demonstration · Clínica Exemplo', title: 'Introduce a future practice, honestly.', text: 'Use the founder’s footage of an unfinished space to introduce a fictional future dental clinic. Label it as a demonstration, not an operating clinic. No invented professionals, qualifications, patients or treatment results.' },
  { label: 'App', tag: 'Anonymized real brief', title: 'Explain what your app does in a short story.', text: 'An ad for a mobile-service app: explain choosing a network, entering a phone number and selecting a plan. Use the supplied logo, clearly approved facts and a final call to action. No real customer phone numbers.' },
]

export default function BusinessVideoAdsPage() {
  const offer = adsSegmentOffer()
  const business = KINEO_BUSINESS_CARD_LIVE
    ? kineoBusinessOffer({
        priceLabel: formatCheckoutMoney('usd', getTierPrice('pro', 'usd', 'standard')),
        planName: planName('pro'),
        credits: TIER_CREDITS.pro,
        characters: characterLimitFor('pro', true),
        variationsOpen: ADS_VARIACOES_PUBLIC,
        spacesOpen: SPACES_PUBLIC,
      })
    : null
  return <div className={styles.surface}><main className={styles.page}>
    <nav className={styles.nav} aria-label="Business video navigation"><a href="/" className={styles.brand}><KineoBrandIcon size={33} />Kineo<span> / empresas</span></a><a href="/ads">Explore Studio Ads ↗</a></nav>
    <header className={styles.hero} data-kineo="business-self-service-first">
      <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>STUDIO ADS · MAKE IT YOURSELF</p>
      <h1>Your business.<br /><em>Your next video ad.</em></h1>
      <p className={styles.intro}>Make it yourself in minutes. Paste your website link or write a brief, add your logo and authorized photos or clips, and check the facts before creating your ad.</p>
      <OrganicCtaLink className={styles.primary} href="/ads?from=business_ads&utm_source=business_video_ads&utm_campaign=gpt24h&utm_content=self_service" source="business_video_ads" placement="self_service_hero">Make my business ad <span aria-hidden="true">→</span></OrganicCtaLink>
      <p className={styles.note}>Included in any paid plan · from {offer.starterPrice} USD/month · {offer.credits} credits per {offer.seconds} s ad. Generation time can vary.</p>
      </div>
      <div className={styles.composition}>
        <figure className={styles.art}>
          <span className={styles.visualLabel}><i aria-hidden="true" />RESTAURANT · VISUAL CONCEPT</span>
          <Image src="/design/business-ads-20260924/restaurant-concept.png" alt="Restaurant advertising concept: a chef serves a plated meal while guests dine in the background." width={1536} height={1024} priority sizes="(max-width: 700px) calc(100vw - 62px), (max-width: 1000px) 45vw, 650px" />
          <figcaption>AI-generated concept · not a client result</figcaption>
        </figure>
        <div className={styles.mediaMeta}><span>Restaurant / Creative direction</span><span>Concept still ↗</span></div>
        <div className={styles.workflow} aria-label="Production steps">
          <span><b>Your brief</b>Link or idea</span>
          <span><b>Check the facts</b>Review your script</span>
          <span><b>Your ad</b>Download and post</span>
        </div>
        <div className={styles.diagram} aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </div>
    </header>
    {business ? (
      <section className={styles.section} aria-labelledby="kineo-business-heading" data-kineo="kineo-business-card">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>FOR BUSINESSES · MAKE IT YOURSELF</p><h2 id="kineo-business-heading">{business.name}</h2><p>{business.planLine}</p></div>
        <div className={styles.offers}>
          <article className={styles.offer}>
            <div className={styles.offerTop}><h3>{business.name}</h3><span>Monthly · cancel anytime</span></div>
            <p className={styles.price}>{business.priceLabel}<small> /month</small></p>
            <ul className={styles.detail}>{business.includes.map((item) => <li key={item}>{item}</li>)}</ul>
            {/* <a> simples, nunca <Link>: o checkout é um GET e o prefetch do Link abriria sessão de pagamento. A atribuição vai no
                intent_campaign=kineo_business que o checkout grava. */}
            <a className={styles.buy} href={business.href}>{business.ctaLabel}</a>
            <small>Secure Stripe checkout. Shown in US dollars.</small>
          </article>
        </div>
      </section>
    ) : null}
    <section className={styles.section} aria-labelledby="packages-heading">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>OR, HAVE US MAKE IT</p><h2 id="packages-heading">Prefer a done-for-you video?</h2><p>Kineo Empresas is a separate service operated by a human. Choose Express or Pro; the package sets the delivery time and revisions.</p></div>
      <BusinessAdsOffers />
    </section>
    <section className={styles.split} aria-label="Delivery and materials">
      <div><p className={styles.eyebrow}>EXPRESS / PRO PRODUCTION</p><h2>What you receive</h2><p>{DFY_SERVICE_FACT.delivery}</p><p>A human prepares the script and production. The selected package sets the engines, delivery time and included revisions.</p></div>
      <div><p className={styles.eyebrow}>AFTER PAYMENT</p><h2>Send the ingredients.</h2><ol>{DFY_SERVICE_FACT.requirements.map(item => <li key={item}>{item}</li>)}</ol><p>Follow the instructions in your order confirmation. Include the phone number, website or call to action exactly as it should appear. Only send material you have permission to use.</p></div>
    </section>
    <section className={styles.section} aria-labelledby="briefs-heading">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>START WITH THE BUSINESS, NOT THE TOOL</p><h2 id="briefs-heading">What a useful brief looks like.</h2><p>These are brief summaries, not finished-video samples or testimonials. They do not promise a particular generated result.</p></div>
      <div className={styles.briefs}>{BRIEFS.map((brief, index) => <article className={styles.brief} key={brief.label}><span className={styles.briefIcon} aria-hidden="true">{['◉', '✧', '▣'][index]}</span><span className={styles.category}>{brief.label}</span><small>{brief.tag}</small><h3>{brief.title}</h3><p>{brief.text}</p></article>)}</div>
    </section>
    <section className={styles.faq} aria-labelledby="faq-heading"><h2 id="faq-heading">Choose your workflow</h2>
      <details open><summary>Can I make the ad myself?</summary><p>Yes. <a href="/ads">Studio Ads</a> creates an ad from your link or brief and authorized materials, with narration, captions, music and a final card. You check the facts and script, then download it to post yourself. It is included in any paid plan; a one-time pass is also available. Express and Pro below are separate human-operated services, not the self-service editor.</p></details>
      <details><summary>When will my Express or Pro order arrive?</summary><p>{DFY_SERVICE_FACT.tiers.map(tier => `${tier.name}: ${tier.hours} hours, with ${tier.revisions} ${tier.revisions === 1 ? 'revision' : 'revisions'}.`).join(' ')} Send your brief and authorized materials promptly after payment. Missing material or an out-of-scope request needs human review; we do not promise an impossible deadline.</p></details>
      <details><summary>What if my brief does not fit?</summary><p>{DFY_SERVICE_FACT.refund} For example, missing permission to use footage, unsupported clinical claims or an impossible deadline can make a brief unsuitable.</p></details>
      <details><summary>Can you include my logo, photos and professional details?</summary><p>Yes, where the format allows, using material and facts you supply and approve. We do not invent qualifications, endorsements, patient stories or results. Medical and other regulated claims must be verified by you before publication.</p></details>
      <details><summary>Does this include posting, ads or guaranteed sales?</summary><p>No. You receive the video to publish yourself. Advertising spend, channel management and sales guarantees are not included. This is a one-time service, separate from Kineo subscriptions and credits.</p></details>
    </section>
    <footer className={styles.footer}><p>Create it yourself. Or let us help.</p><a href="#packages">View Express and Pro ↑</a><span>Kineo Empresas · Updated September 27, 2026</span></footer>
  </main></div>
}
