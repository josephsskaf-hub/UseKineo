import type { Metadata } from 'next'
import Image from 'next/image'
import KineoBolt from '@/components/KineoBolt'
import { DFY_SERVICE_FACT } from '@/lib/growth/dfyServiceFacts'
import BusinessAdsOffers from './BusinessAdsOffers'
import styles from './businessAds.module.css'

export const dynamic = 'force-static'
export const metadata: Metadata = {
  title: 'Business Video Ads, Made for You | Kineo Empresas',
  description: 'A human-operated AI video service for your business. Send your brief, logo and authorized photos; get a video with narration, captions and music. Express and Pro, no subscription.',
  alternates: { canonical: DFY_SERVICE_FACT.url },
  openGraph: { title: 'Your business. A video made for you.', description: DFY_SERVICE_FACT.description, url: DFY_SERVICE_FACT.url, type: 'website' },
}

// Brief sources: anonymized completed-video requests, 11 and 17 Sep 2026.
// Clinic: founder-approved fictional demonstration, 24 Sep; not a customer result.
const BRIEFS = [
  { label: 'Restaurant', tag: 'Anonymized real brief', title: 'Give a family a reason to choose your restaurant.', text: 'A cinematic restaurant ad: a family chooses where to eat, arrives and enjoys the atmosphere. Keep the same characters across scenes and finish with the restaurant’s approved call to action.' },
  { label: 'Clinic', tag: 'Fictional demonstration · Clínica Exemplo', title: 'Introduce a future practice, honestly.', text: 'Use the founder’s footage of an unfinished space to introduce a fictional future dental clinic. Label it as a demonstration, not an operating clinic. No invented professionals, qualifications, patients or treatment results.' },
  { label: 'App', tag: 'Anonymized real brief', title: 'Explain what your app does in a short story.', text: 'An ad for a mobile-service app: explain choosing a network, entering a phone number and selecting a plan. Use the supplied logo, clearly approved facts and a final call to action. No real customer phone numbers.' },
]

export default function BusinessVideoAdsPage() {
  return <div className={styles.surface}><main className={styles.page}>
    <nav className={styles.nav} aria-label="Business video navigation"><a href="/" className={styles.brand}><KineoBolt size={33} />Kineo<span> / empresas</span></a><a href="/studio">Make it yourself in Studio ↗</a></nav>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>YOUR BRIEF. OUR PRODUCTION.</p>
      <h1>Your business.<br /><em>A video made for you.</em></h1>
      <p className={styles.intro}>You know your business. We turn your brief into a video ad with AI tools and a human behind the work — ready for you to post on your social channels.</p>
      <a className={styles.primary} href="#packages">Choose your video <span aria-hidden="true">↓</span></a>
      <p className={styles.note}>Human-operated · One-time purchase · No subscription required</p>
      </div>
      <div className={styles.composition}>
        <figure className={styles.art}>
          <span className={styles.visualLabel}><i aria-hidden="true" />RESTAURANT · VISUAL CONCEPT</span>
          <Image src="/design/business-ads-20260924/restaurant-concept.png" alt="Restaurant advertising concept: a chef serves a plated meal while guests dine in the background." width={1536} height={1024} priority sizes="(max-width: 700px) calc(100vw - 62px), (max-width: 1000px) 45vw, 650px" />
          <figcaption>AI-generated concept · not a client result</figcaption>
        </figure>
        <div className={styles.mediaMeta}><span>Restaurant / Creative direction</span><span>Concept still ↗</span></div>
        <div className={styles.workflow} aria-label="Production steps">
          <span><b>01 · Brief</b>Your business</span>
          <span><b>02 · Production</b>AI + human</span>
          <span><b>03 · Delivery</b>Finished MP4</span>
        </div>
        <div className={styles.diagram} aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </div>
    </header>
    <section className={styles.section} aria-labelledby="packages-heading">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>TWO WAYS TO GET IT MADE</p><h2 id="packages-heading">Choose the production that fits.</h2></div>
      <BusinessAdsOffers />
    </section>
    <section className={styles.split} aria-label="Delivery and materials">
      <div><p className={styles.eyebrow}>THE FINISHED PIECE</p><h2>What you receive</h2><p>{DFY_SERVICE_FACT.delivery}</p><p>A human prepares the script and production. The selected package sets the engines, delivery time and included revisions.</p></div>
      <div><p className={styles.eyebrow}>AFTER PAYMENT</p><h2>Send the ingredients.</h2><ol>{DFY_SERVICE_FACT.requirements.map(item => <li key={item}>{item}</li>)}</ol><p>Follow the instructions in your order confirmation. Include the phone number, website or call to action exactly as it should appear. Only send material you have permission to use.</p></div>
    </section>
    <section className={styles.section} aria-labelledby="briefs-heading">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>START WITH THE BUSINESS, NOT THE TOOL</p><h2 id="briefs-heading">What a useful brief looks like.</h2><p>These are brief summaries, not finished-video samples or testimonials. They do not promise a particular generated result.</p></div>
      <div className={styles.briefs}>{BRIEFS.map((brief, index) => <article className={styles.brief} key={brief.label}><span className={styles.briefIcon} aria-hidden="true">{['◉', '✧', '▣'][index]}</span><span className={styles.category}>{brief.label}</span><small>{brief.tag}</small><h3>{brief.title}</h3><p>{brief.text}</p></article>)}</div>
    </section>
    <section className={styles.faq} aria-labelledby="faq-heading"><h2 id="faq-heading">Before you order</h2>
      <details open><summary>Is this an automatic ad generator?</summary><p>No. Kineo Empresas is operated by a human using AI tools. You buy the production of a video, not access to a self-service editor. If you prefer to create your own film, use <a href="/studio">Kineo Studio</a>.</p></details>
      <details><summary>When will I receive it?</summary><p>{DFY_SERVICE_FACT.tiers.map(tier => `${tier.name}: ${tier.hours} hours, with ${tier.revisions} ${tier.revisions === 1 ? 'revision' : 'revisions'}.`).join(' ')} Send your brief and authorized materials promptly after payment. Missing material or an out-of-scope request needs human review; we do not promise an impossible deadline.</p></details>
      <details><summary>What if my brief does not fit?</summary><p>{DFY_SERVICE_FACT.refund} For example, missing permission to use footage, unsupported clinical claims or an impossible deadline can make a brief unsuitable.</p></details>
      <details><summary>Can you include my logo, photos and professional details?</summary><p>Yes, where the format allows, using material and facts you supply and approve. We do not invent qualifications, endorsements, patient stories or results. Medical and other regulated claims must be verified by you before publication.</p></details>
      <details><summary>Does this include posting, ads or guaranteed sales?</summary><p>No. You receive the video to publish yourself. Advertising spend, channel management and sales guarantees are not included. This is a one-time service, separate from Kineo subscriptions and credits.</p></details>
    </section>
    <footer className={styles.footer}><p>Bring a clear brief. Let us make the video.</p><a href="#packages">View Express and Pro ↑</a><span>Kineo Empresas · Updated September 24, 2026</span></footer>
  </main></div>
}
