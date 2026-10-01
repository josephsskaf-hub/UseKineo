import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MRR_SHOWCASE_ENABLED, MRR_SHOWCASE_VERSION } from '@/lib/growth/mrrShowcase'
import { UiLabel, InterfaceLanguageSelect } from '@/components/InterfaceLanguage'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { KineoBrandIcon } from '@/components/KineoBolt'
import ShowcaseExperience from './ShowcaseExperience'
import styles from '@/app/examples/ExamplesGallery.module.css'

export const metadata: Metadata = {
  title: 'Showcase — real Kineo films',
  description: 'Watch selected previews from Kineo films and bring your own idea to the Studio.',
  alternates: { canonical: 'https://www.usekineo.com/showcase' },
}

export default function ShowcasePage() {
  if (!MRR_SHOWCASE_ENABLED) notFound()
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div className={styles.headerInner}>
      <Link className={styles.brand} href="/"><KineoBrandIcon size={26} />Kineo</Link>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/studio"><UiLabel>Video</UiLabel></Link>
        <Link href="/pricing"><UiLabel>Pricing</UiLabel></Link>
      </nav>
      <div className={styles.headerTools}><InterfaceLanguageSelect /><AppearanceSettingsButton compact /></div>
    </div></header>
    <section className={styles.content}>
      <div className={styles.intro}><div>
        <p className={styles.eyebrow}><UiLabel>Real product proof</UiLabel></p>
        <h1><UiLabel>Your idea could be the next film.</UiLabel></h1>
        <p><UiLabel>Watch previews from films made by Kineo’s founder. Choose a style, then bring your own topic to the Studio.</UiLabel></p>
      </div></div>
      <ShowcaseExperience />
      <div className={styles.createBand}><div>
        <h2><UiLabel>Start with your own idea.</UiLabel></h2>
        <p><UiLabel>Review your engine, film length and exact credit cost before generating.</UiLabel></p>
      </div><Link className={styles.navCta} href={`/studio?utm_source=showcase&utm_medium=product_proof&utm_campaign=${MRR_SHOWCASE_VERSION}`}>
        <UiLabel>Open Studio →</UiLabel>
      </Link></div>
    </section>
  </main>
}
