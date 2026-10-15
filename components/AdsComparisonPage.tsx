import type { Metadata } from 'next'
import { ADS_COMPARISON_PAGES, adsComparisonAccess, adsComparisonCta, adsComparisonEnrichment, adsComparisonFaqSchema, adsComparisonRows, adsComparisonPath, type AdsComparisonEntry } from '@/lib/growth/adsComparisons'
import { adsSegmentOffer } from '@/lib/growth/adsSegmentPresentation'
import { ADS_SEGMENTS, adsSegmentPath } from '@/lib/growth/adsSegments'
import styles from './AdsComparisonPage.module.css'

export function adsComparisonMetadata(c: AdsComparisonEntry): Metadata {
  const title = `${c.name} alternative for narrated video ads | Kineo`
  const description = `Compare Kineo Studio Ads with ${c.name}: your materials, narrated ads, pricing sources and honest limits. No custom avatar or direct publishing in Kineo.` // KINEO-COPY-CONTRADICOES-1510 — o ator de IA opcional existe; "custom" = avatar da própria pessoa (teto de 155 do guardião)
  const url = `https://www.usekineo.com${adsComparisonPath(c.slug)}`
  return { title: { absolute: title }, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', images: [`https://www.usekineo.com/og/vs-${c.id}.png`] }, twitter: { card: 'summary_large_image', title, description, images: [`https://www.usekineo.com/og/vs-${c.id}.png`] } }
}

export default function AdsComparisonPage({ competitor }: { competitor: AdsComparisonEntry }) {
  const offer = adsSegmentOffer()
  // KINEO-VS-NOVOS-1610 — resumo citável, fatos novos com fonte e data, "when to pick them instead" e FAQ (= JSON-LD), só
  // onde houver leitura própria (Creatify e Arcads, 15/10/2026). As outras comparações seguem idênticas.
  const extra = adsComparisonEnrichment(competitor)
  const faqSchema = adsComparisonFaqSchema(competitor)
  return <main className={styles.page}>
    {faqSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} /> : null}
    <nav className={styles.nav} aria-label="Breadcrumb"><a href="/">Kineo</a><span>/</span><a href="/ads">Studio Ads</a><span>/</span><span>{competitor.name} alternative</span></nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>YOUR ASSETS. A NARRATED AD.</p>
      <h1>{/^[aeiou]/i.test(competitor.name) ? 'An' : 'A'} {competitor.name} alternative.<br /><span>For the story of your business.</span></h1>
      {/* KINEO-VS-NOVOS-1610 (CEO 15/10) — o anúncio de hoje (v2, duração de adsSegmentOffer); antes prometia o clássico de 35/60 s com legenda. */}
      <p className={styles.intro}>Turn your business photos and logo into a vertical ad of about {offer.v2Seconds} seconds: your real photos in motion, music, short on-screen phrases, an optional voice-over and your logo at the end.</p>
      <a className={styles.cta} href={adsComparisonCta(competitor.id)}>Explore Studio Ads <span aria-hidden="true">→</span></a>
      <p className={styles.price}>Included in any paid plan · from {offer.starterPrice} USD/month.</p>
    </header>
    {extra ? <section className={styles.fit} aria-labelledby="summary-heading" data-ads-vs-summary={competitor.id}><h2 id="summary-heading">{extra.name} or Kineo, in three lines</h2><ol className={styles.summary}>{extra.summary.map((line) => <li key={line}>{line}</li>)}</ol></section> : null}
    <section className={styles.fit} aria-labelledby="fit-heading"><h2 id="fit-heading">A different job, not a claim to do everything.</h2><p>Choose Kineo when you want a narrated ad assembled from your business materials. An optional AI presenter, always labeled as AI, can hold your product; if you need a custom avatar of you or direct social publishing, those are not part of Studio Ads. Compare the workflow and allowances, not only the entry price.</p></section>
    <section aria-labelledby="comparison-heading" className={styles.comparison}>
      <h2 id="comparison-heading">What each workflow includes</h2>
      <p className={styles.source}>Competitor facts according to the official page, as recorded in our research. {competitor.accessedOn ? <>Read on {adsComparisonAccess(competitor)}.</> : <>Access window: {adsComparisonAccess(competitor)}. Per-page access dates and some details were not recorded.</>} A missing confirmation is not proof a feature is absent.</p>
      <div className={styles.tableWrap} role="region" aria-label="Workflow comparison, scroll horizontally on small screens" tabIndex={0}><table><caption>Kineo Studio Ads and {competitor.name} · dated feature snapshot</caption><thead><tr><th scope="col">What matters</th><th scope="col">Kineo Studio Ads</th><th scope="col">{competitor.name}</th></tr></thead><tbody>{adsComparisonRows(competitor).map(row => <tr key={row.id} data-comparison-row={row.id}><th scope="row">{row.label}</th><td>{row.kineo}</td><td>{row.competitor}</td></tr>)}</tbody></table></div>
      <p className={styles.source}><a href={competitor.officialUrl} rel="noopener noreferrer">Check {competitor.name}’s official page ↗</a>. Prices and features can change. This is Kineo’s comparison, not an independent review or endorsement.</p>
    </section>
    {extra ? <>
      <section aria-labelledby="fresh-heading" className={styles.comparison} data-ads-vs-fresh={competitor.id}>
        <h2 id="fresh-heading">What {extra.name}’s official page says today</h2>
        <p className={styles.source}>Each {extra.name} fact below links to the page it was read on, with the date. Kineo figures come from the current plans.</p>
        <div className={styles.tableWrap} role="region" aria-label={`${extra.name} official facts and Kineo, scroll horizontally on small screens`} tabIndex={0}><table><caption>{extra.name} and Kineo Studio Ads · official page read {extra.reviewed}</caption><thead><tr><th scope="col">What matters</th><th scope="col">{extra.name}</th><th scope="col">Kineo Studio Ads</th></tr></thead><tbody>{extra.facts.map(row => <tr key={row.id} data-ads-vs-fact={row.id}><th scope="row">{row.label}</th><td>{row.them.text}<span className={styles.source}><br /><a href={row.them.url} rel="nofollow noopener noreferrer">{row.them.label}</a> ({row.them.checkedOn})</span></td><td>{row.kineo}</td></tr>)}</tbody></table></div>
      </section>
      <section className={styles.fit} aria-labelledby="pick-heading"><h2 id="pick-heading">When to pick {extra.name} instead</h2><ul className={styles.summary}>{extra.pickThem.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </> : null}
    <section className={styles.fit}><h2>You check the facts. Kineo assembles the ad.</h2><p>Paste a website link or write a brief, add your authorized media, and review the details and script before rendering. Download the finished ad to publish yourself. No advertising-results guarantee.</p></section>
    {extra ? <section className={styles.fit} aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently asked questions</h2><div className={styles.faq}>{extra.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div><nav className={styles.related} aria-label="Related pages"><a href="/ads/for/online-stores">Video ads for online stores →</a><a href="/ai-video-generator/seedance">Seedance on Kineo →</a><a href="/ai-video-generator/kling-3">Kling on Kineo →</a></nav></section> : null}
    <footer className={styles.footer}><h2>Also for your business</h2><nav aria-label="Business segments">{ADS_SEGMENTS.map(segment => <a key={segment.slug} href={adsSegmentPath(segment.slug)}>{segment.shortName}</a>)}</nav><p>Other comparisons:</p><nav aria-label="Other ad comparisons">{ADS_COMPARISON_PAGES.filter(c => c.id !== competitor.id).map(c => <a key={c.id} href={adsComparisonPath(c.slug)}>{c.name} alternative</a>)}</nav><p><a href="/business-video-ads">Kineo for businesses →</a></p></footer>
  </main>
}
