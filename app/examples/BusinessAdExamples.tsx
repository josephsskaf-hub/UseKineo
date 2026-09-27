import Image from 'next/image'
import Link from 'next/link'
import { BUSINESS_AD_EXAMPLES, businessAdWatchPath } from '@/lib/growth/businessAdExamples'
import styles from './BusinessAdExamples.module.css'

export default function BusinessAdExamples() {
  const examples = BUSINESS_AD_EXAMPLES.flatMap(example => {
    const href = businessAdWatchPath(example.videoUrl)
    return href ? [{ ...example, href }] : []
  })
  if (examples.length === 0) return null
  return <section className={styles.section} aria-labelledby="business-ads-examples-heading">
    <h2 id="business-ads-examples-heading">Business ads</h2>
    <div className={styles.grid}>{examples.map(example => <article key={example.href} className={styles.card}>
      {example.poster?.startsWith('/') && !example.poster.startsWith('//') && <Image src={example.poster} alt={example.business} width={640} height={360} sizes="(max-width: 700px) 100vw, 33vw" />}
      <p>{example.segment}</p><h3>{example.business}</h3>
      <Link href={example.href}>Watch ad →</Link>
    </article>)}</div>
    <Link className={styles.action} href="/ads?utm_source=examples&utm_campaign=gpt24h&utm_content=business_ads">Make your business ad →</Link>
  </section>
}
