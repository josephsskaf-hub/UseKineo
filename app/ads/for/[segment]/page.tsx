import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ADS_SEGMENTS, findAdsSegment, adsSegmentPath, adsSegmentPoster, adsSegmentCta, approvedSegmentExample } from '@/lib/growth/adsSegments'
import { adsSegmentOffer, adsSegmentFaq, adsSegmentFaqSchema } from '@/lib/growth/adsSegmentPresentation'
import { ADS_V2_HOW_IT_WORKS } from '@/lib/ads/v2Screen' // KINEO-ADS-V2-VIRADA-2026-09-29 — os mesmos 4 passos do montador
import styles from './segment.module.css'

type Props = { params: { segment: string } }
const BASE = 'https://www.usekineo.com'

export function generateStaticParams() {
  return ADS_SEGMENTS.map(({ slug }) => ({ segment: slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const segment = findAdsSegment(params.segment)
  if (!segment) return { title: 'Page not found', robots: { index: false, follow: false } }
  const title = `Video ads for ${segment.shortName} | Kineo`
  const url = `${BASE}${adsSegmentPath(segment.slug)}`
  return {
    title: { absolute: title }, description: segment.description,
    alternates: { canonical: url },
    openGraph: { title, description: segment.description, url, type: 'website', images: [{ url: `${BASE}${adsSegmentPoster(segment.slug)}`, width: 1200, height: 630, alt: `Kineo Studio Ads for ${segment.name}` }] },
    twitter: { card: 'summary_large_image', title, description: segment.description, images: [`${BASE}${adsSegmentPoster(segment.slug)}`] },
  }
}

export default function AdsSegmentPage({ params }: Props) {
  const segment = findAdsSegment(params.segment)
  if (!segment) notFound()
  const offer = adsSegmentOffer()
  const faqs = adsSegmentFaq(segment)
  const example = approvedSegmentExample(segment.exampleVideoUrl)
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(adsSegmentFaqSchema(segment)).replace(/</g, '\\u003c') }} />
    <nav className={styles.nav} aria-label="Breadcrumb"><a href="/">Kineo</a><span aria-hidden="true">/</span><a href="/ads">Studio Ads</a><span aria-hidden="true">/</span><span aria-current="page">{segment.shortName}</span></nav>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>YOUR BUSINESS. YOUR STORY.</p>
        <h1>Video ads for {segment.name}<span> — made by AI in minutes.</span></h1>
        {/* KINEO-ADS-V2-VIRADA-2026-09-29 — o produto principal é o anúncio v2: fotos reais em movimento, ~15 s, sem legenda prometida. */}
        <p className={styles.intro}>Your logo and your real photos. Kineo gives them movement and turns them into a vertical ad of about {offer.v2Seconds} seconds, with music, a short voice-over and your logo at the end.</p>
        <a className={styles.cta} href={adsSegmentCta(segment.slug)}>Make your ad <span aria-hidden="true">→</span></a>
        <p className={styles.offer}>Included in any paid plan · from {offer.starterPrice} USD/month · from {offer.v2Credits} credits per {offer.v2Seconds}-second ad.</p>
        <p className={styles.note}>Check your facts before rendering. Generation time varies.</p>
      </div>
      <figure className={styles.preview}>
        <Image src={adsSegmentPoster(segment.slug)} alt={`Studio Ads for ${segment.name}. Placeholder graphic, not a finished ad.`} width={1200} height={630} sizes="(max-width: 760px) 100vw, 45vw" priority />
        <figcaption>{example ? <a href={example}>Watch the example ad →</a> : 'Example video coming soon · this is a placeholder, not a client result.'}</figcaption>
      </figure>
    </header>
    <section className={styles.section} aria-labelledby="why-heading">
      <p className={styles.eyebrow}>MADE FOR YOUR DAY-TO-DAY</p><h2 id="why-heading">Less editing. A clearer message.</h2>
      <ul className={styles.pains}>{segment.pains.map(pain => <li key={pain}>{pain}</li>)}</ul>
    </section>
    <section className={styles.section} aria-labelledby="how-heading">
      <h2 id="how-heading">How it works</h2>
      <ol className={styles.steps}>
        {ADS_V2_HOW_IT_WORKS.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>
    <section className={styles.brief} aria-labelledby="brief-heading">
      <div><p className={styles.eyebrow}>A SIMPLE STARTING POINT</p><h2 id="brief-heading">Bring the real ingredients.</h2><p>{segment.materials}</p></div>
      <div><p className={styles.eyebrow}>ILLUSTRATIVE BRIEF · NOT A CUSTOMER CASE</p><blockquote>{segment.brief}</blockquote><p className={styles.note}>{segment.caution}</p></div>
    </section>
    <section className={styles.section} aria-labelledby="faq-heading"><h2 id="faq-heading">Before you start</h2><div className={styles.faq}>{faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <footer className={styles.footer}><p>Also for:</p><nav aria-label="Other business segments">{ADS_SEGMENTS.filter(item => item.slug !== segment.slug).map(item => <a key={item.slug} href={adsSegmentPath(item.slug)}>{item.shortName}</a>)}</nav><p><a href="/business-video-ads">Explore Kineo for businesses →</a></p></footer>
  </main>
}
