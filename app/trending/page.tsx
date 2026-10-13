// KINEO-TRENDING-2026-10-13 — /trending, "🔥 Trending now": vídeos REAIS feitos na Kineo, 4 blocos (estilos de anúncio,
// efeitos de clipe, temas de filme, motores em ação), cada cartão com o motor real e um "Make mine" que abre a ferramenta
// certa já preenchida. Os dados saem de lib/trending/trendingNow.ts (só leitura das fontes de verdade); nenhum número de
// audiência. A identidade é lida por visita (visitante passa pelo cadastro e volta; logado vai direto), como /examples.
import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect, UiLabel } from '@/components/InterfaceLanguage'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import { parseTrendingToday, trendingBlocks, TRENDING_PATH, TRENDING_TODAY_FILE } from '@/lib/trending/trendingNow'
import TrendingCard from './TrendingCard'
import styles from '../examples/ExamplesGallery.module.css'
import './trending.css'

const URL_PUBLIC = 'https://www.usekineo.com' + TRENDING_PATH
export const metadata: Metadata = {
  title: 'Trending now — real videos made on Kineo | Kineo',
  description: 'The newest ad styles, clip effects, film topics and engines on Kineo, each with a real video made on Kineo and a one-click way to make your own.',
  alternates: { canonical: URL_PUBLIC },
  openGraph: {
    title: 'Trending now on Kineo',
    description: 'Real videos made on Kineo: ad styles, clip effects, film topics and engines. Pick one and make your own.',
    url: URL_PUBLIC,
    images: [{ url: '/videos/example-turkmenistan.jpg', width: 360, height: 640 }],
  },
}

export const dynamic = 'force-dynamic'

/** TODO KINEO-TRENDING-2026-10-13: a pesquisa diária grava este arquivo; ausente ou inválido = dados de sempre. */
function readToday(now: Date) {
  try {
    return parseTrendingToday(fs.readFileSync(path.join(process.cwd(), TRENDING_TODAY_FILE), 'utf8'), now)
  } catch {
    return null
  }
}

export default async function TrendingPage() {
  const { data: { user } } = await createClient().auth.getUser()
  const signedIn = Boolean(user)
  const now = new Date()
  const today = readToday(now)
  const blocks = trendingBlocks({ now, signedIn, today })
  return (
    <main className={`${styles.page} trending-page`}>
      <header className={styles.pageHeader}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}><KineoBrandIcon size={26} />Kineo</Link>
          <nav className={styles.nav} aria-label="Main navigation" data-nav-surface="top" data-nav-area="public">
            {/* KINEO-TRENDING-2026-10-13 — par do topo da home e do /examples: as 2 portas, o Trending (esta página) e o resto. */}
            <Link href="/studio" className={styles.navPrimary} data-nav-item="video"><UiLabel>Make a film</UiLabel></Link>
            <Link href="/ads/new" className={styles.navPrimary} data-nav-item="business"><UiLabel>Product ads</UiLabel></Link>
            <Link href="/images" data-nav-item="image"><UiLabel>Images</UiLabel></Link>
            <Link href="/trending" data-nav-item="more:trending" aria-current="page"><UiLabel>🔥 Trending</UiLabel></Link>
            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
          </nav>
          <div className={styles.headerTools}>
            <InterfaceLanguageSelect />
            <AppearanceSettingsButton compact />
            {signedIn
              ? <Link href="/studio" className={styles.navCta}><UiLabel>Open Studio</UiLabel></Link>
              : <Link href="/signup?utm_source=trending" className={styles.navCta}><UiLabel>{CARD_ENTRY_COPY.ctaShort}</UiLabel></Link>}
          </div>
        </div>
      </header>

      <div className="tr-wrap">
        <section className="tr-hero" aria-labelledby="trending-title">
          <p className="tr-eyebrow"><UiLabel>Made on Kineo</UiLabel></p>
          <h1 id="trending-title"><span aria-hidden="true">🔥 </span><UiLabel>Trending now</UiLabel></h1>
          <p className="tr-lead"><UiLabel>Real videos made on Kineo. Pick one and make your own.</UiLabel></p>
          <p className="tr-note"><UiLabel>No view counts, no fake numbers. Trending here means the newest styles and effects, and today’s picks.</UiLabel></p>
          {today ? <p className="tr-note tr-note-pick"><UiLabel>Picked from today’s research</UiLabel> · <span dir="ltr">{today.date}</span></p> : null}
          <nav className="tr-jump" aria-label="Trending now">
            {blocks.map((b) => <a key={b.id} href={`#${b.id}`}><UiLabel>{b.title}</UiLabel></a>)}
          </nav>
        </section>

        {blocks.map((block) => (
          <section key={block.id} id={block.id} className="tr-block" data-trending-block={block.id} aria-labelledby={`${block.id}-title`}>
            <div className="tr-block-head">
              <h2 id={`${block.id}-title`}><UiLabel>{block.title}</UiLabel></h2>
              <p><UiLabel>{block.sub}</UiLabel></p>
            </div>
            <div className="tr-grid">
              {block.cards.map((card) => <TrendingCard key={card.key} block={block.id} card={card} />)}
            </div>
          </section>
        ))}

        <footer className="tr-footer">
          <Link href="/examples"><UiLabel>Examples</UiLabel> ↗</Link>
          <span>Kineo</span>
        </footer>
      </div>
    </main>
  )
}
