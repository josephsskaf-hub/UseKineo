
import KineoBolt from '@/components/KineoBolt'
import type { Metadata } from 'next'
import Link from 'next/link'
import ExamplesGallery from './ExamplesGallery'
import styles from './ExamplesGallery.module.css'
import { EXAMPLES_SELECTION_SEP24 } from '@/lib/ui/examplesSelectionSep24'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-EXAMPLES-LOGADO-2026-08-24 — o fundador abriu /examples LOGADO e viu
// "Start free": a página tratava assinante como estranho. O header agora
// pergunta ao servidor quem está olhando.
import { createClient } from '@/lib/supabase/server'
import ExamplesBusinessProofBridge from './ExamplesBusinessProofBridge'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect, UiLabel } from '@/components/InterfaceLanguage'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const metadata: Metadata = {
  title: 'Real AI Shorts Examples | Kineo',
  description:
    'Watch honest previews cut from real faceless Shorts created with Kineo, then remix the exact format with your own topic.',
  alternates: { canonical: 'https://www.usekineo.com/examples' },
  openGraph: {
    title: 'Real AI Shorts Examples | Kineo',
    description: 'Watch real Kineo output previews and start from the same production format.',
    url: 'https://www.usekineo.com/examples',
    images: [{ url: '/videos/example-turkmenistan.jpg', width: 360, height: 640 }],
  },
}

// Auth stays per-request; the public gallery is an explicit founder selection.
export const dynamic = 'force-dynamic'

export default async function ExamplesPage() {
  // KINEO-EXAMPLES-LOGADO-2026-08-24 — logado vê "Open Studio" (a porta do
  // produto), visitante vê "Start free" (a porta do funil). Mostrar signup a
  // um assinante é pedir para ele criar a conta que já paga.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}><KineoBolt size={26} />Kineo</Link>
          <nav className={styles.nav} aria-label="Main navigation" data-nav-surface="top" data-nav-area="public">
            <Link href="/studio" className={styles.navPrimary} data-nav-item="video"><UiLabel>Video</UiLabel></Link>
            <Link href="/images" data-nav-item="image"><UiLabel>Images</UiLabel></Link>
            <Link href="/ads/new" data-nav-item="business"><UiLabel>For businesses</UiLabel></Link>
            <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
          </nav>
          <div className={styles.headerTools}>
            <InterfaceLanguageSelect />
            <AppearanceSettingsButton compact />
            {isLoggedIn ? (
              <Link
                href="/studio"
                className={styles.navCta}
              >
                <UiLabel>Open Studio</UiLabel>
              </Link>
            ) : (
              <OrganicCtaLink
                href="/signup?utm_source=examples&utm_medium=proof&utm_campaign=push31"
                source="examples_index"
                placement="header"
                className={styles.navCta}
              >
                <UiLabel>{CARD_ENTRY_COPY.ctaShort}</UiLabel>
              </OrganicCtaLink>
            )}
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}><UiLabel>Real product proof</UiLabel></p>
            <h1><UiLabel>Watch what Kineo actually makes.</UiLabel></h1>
            <p><UiLabel>Explore selected previews from films made with Kineo. Find a style, watch it, and start with your own idea.</UiLabel></p>
          </div>
        </div>
        {/* Only explicitly approved, founder-owned public assets enter this collection. */}
        <ExamplesGallery videos={[...EXAMPLES_SELECTION_SEP24]} separateFeatured />

        {/* KINEO-EXAMPLES-REVIEWS-2026-08-24 — pedido do fundador: "coloca
            todos os reviews que temos". Todos = UM (Rick, autorização escrita
            de 19 e 24/08) — e é exatamente por isso que ele entra inteiro e
            com nome, em vez de virar uma parede de estrelas anônimas: quem
            acabou de VER os renders acima lê uma voz real confirmando o que
            os olhos viram. Quando houver 3+, virar strip — não antes (mesma
            regra da home, #304). */}
        <figure className={styles.review}>
          <blockquote>
            “Too many good ideas die in the mind. This is a product that gives them an escape
            route. Stay with it.”
          </blockquote>
          <figcaption>
            — Rick Crossley, subscriber ·{' '}
            <Link href="/reviews">
              <UiLabel>read our honest reviews page →</UiLabel>
            </Link>
          </figcaption>
        </figure>

        <div className={styles.createBand}>
          <div>
            <h2><UiLabel>Bring your own topic.</UiLabel></h2>
            <p><UiLabel>{ft(OFFER, 'Try up to three watermarked Fast videos every 24 hours. No card required.', OFFER.copy.headline)}</UiLabel></p>
          </div>
          {/* Open the public editor directly; auth is requested when needed. */}
          <OrganicCtaLink
            href="/studio?utm_source=examples&utm_medium=proof&utm_campaign=push31"
            source="examples_index"
            placement="footer_band"
            className={styles.navCta}
          >
            <UiLabel>{isLoggedIn ? 'Open Studio →' : 'Create a Fast video →'}</UiLabel>
          </OrganicCtaLink>
        </div>

        <div className={styles.businessBridge}><ExamplesBusinessProofBridge /></div>
      </section>
    </main>
  )
}
