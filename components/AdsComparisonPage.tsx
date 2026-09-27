import type { Metadata } from 'next'
import { ADS_COMPARISONS, ADS_COMPARISON_ACCESS, adsComparisonCta, adsComparisonRows, adsComparisonPath, type AdsCompetitor } from '@/lib/growth/adsComparisons'
import { adsSegmentOffer } from '@/lib/growth/adsSegmentPresentation'
import { ADS_SEGMENTS, adsSegmentPath } from '@/lib/growth/adsSegments'
import styles from './AdsComparisonPage.module.css'

export function adsComparisonMetadata(c: AdsCompetitor): Metadata {
  const title = `${c.name} alternative for narrated video ads | Kineo`
  const description = `Compare Kineo Studio Ads with ${c.name}: your materials, narrated ads, pricing sources and honest limits. No avatar or direct social publishing in Kineo.`
  const url = `https://www.usekineo.com${adsComparisonPath(c.slug)}`
  return { title: { absolute: title }, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', images: [`https://www.usekineo.com/og/vs-${c.id}.png`] }, twitter: { card: 'summary_large_image', title, description, images: [`https://www.usekineo.com/og/vs-${c.id}.png`] } }
}

export default function AdsComparisonPage({ competitor }: { competitor: AdsCompetitor }) {
  const offer = adsSegmentOffer()
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Breadcrumb"><a href="/">Kineo</a><span>/</span><a href="/ads">Studio Ads</a><span>/</span><span>{competitor.name} alternative</span></nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>YOUR ASSETS. A NARRATED AD.</p>
      <h1>A {competitor.name} alternative.<br /><span>For the story of your business.</span></h1>
      <p className={styles.intro}>Turn your logo, photos and clips into a narrated {offer.durations}-second ad with a script, captions, music and a final card.</p>
      <a className={styles.cta} href={adsComparisonCta(competitor.id)}>Explore Studio Ads <span aria-hidden="true">→</span></a>
      <p className={styles.price}>Included in any paid plan · from {offer.starterPrice} USD/month.</p>
    </header>
    <section className={styles.fit} aria-labelledby="fit-heading"><h2 id="fit-heading">A different job, not a claim to do everything.</h2><p>Choose Kineo when you want a narrated ad assembled from your business materials. If you need an avatar or direct social publishing, those are not part of Studio Ads. Compare the workflow and allowances, not only the entry price.</p></section>
    <section aria-labelledby="comparison-heading" className={styles.comparison}>
      <h2 id="comparison-heading">What each workflow includes</h2>
      <p className={styles.source}>Competitor facts according to the official page, as recorded in our research. Access window: {ADS_COMPARISON_ACCESS}. Per-page access dates and some details were not recorded. A missing confirmation is not proof a feature is absent.</p>
      <div className={styles.tableWrap} role="region" aria-label="Workflow comparison, scroll horizontally on small screens" tabIndex={0}><table><caption>Kineo Studio Ads and {competitor.name} · dated feature snapshot</caption><thead><tr><th scope="col">What matters</th><th scope="col">Kineo Studio Ads</th><th scope="col">{competitor.name}</th></tr></thead><tbody>{adsComparisonRows(competitor).map(row => <tr key={row.id} data-comparison-row={row.id}><th scope="row">{row.label}</th><td>{row.kineo}</td><td>{row.competitor}</td></tr>)}</tbody></table></div>
      <p className={styles.source}><a href={competitor.officialUrl} rel="noopener noreferrer">Check {competitor.name}’s official page ↗</a>. Prices and features can change. This is Kineo’s comparison, not an independent review or endorsement.</p>
    </section>
    <section className={styles.fit}><h2>You check the facts. Kineo assembles the ad.</h2><p>Paste a website link or write a brief, add your authorized media, and review the details and script before rendering. Download the finished ad to publish yourself. No advertising-results guarantee.</p></section>
    <footer className={styles.footer}><h2>Also for your business</h2><nav aria-label="Business segments">{ADS_SEGMENTS.map(segment => <a key={segment.slug} href={adsSegmentPath(segment.slug)}>{segment.shortName}</a>)}</nav><p>Other comparisons:</p><nav aria-label="Other ad comparisons">{ADS_COMPARISONS.filter(c => c.id !== competitor.id).map(c => <a key={c.id} href={adsComparisonPath(c.slug)}>{c.name} alternative</a>)}</nav><p><a href="/business-video-ads">Kineo for businesses →</a></p></footer>
  </main>
}
