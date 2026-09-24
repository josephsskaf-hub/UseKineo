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
          <Link href="/" className={styles.brand}><span className={styles.brandIcon} aria-hidden="true">ϟ</span>Kineo</Link>
          <nav className={styles.nav} aria-label="Main navigation">
            <Link href="/examples" aria-current="page" className={styles.exploreLink}>Explore</Link>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            {isLoggedIn ? (
              <Link
                href="/studio"
                className={styles.navCta}
              >
                Open Studio
              </Link>
            ) : (
              <OrganicCtaLink
                href="/signup?utm_source=examples&utm_medium=proof&utm_campaign=push31"
                source="examples_index"
                placement="header"
                className={styles.navCta}
              >
                {CARD_ENTRY_COPY.ctaShort}
              </OrganicCtaLink>
            )}
          </nav>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>Real product proof</p>
            <h1>Watch what Kineo actually makes.</h1>
            <p>Explore selected previews from films made with Kineo. Find a style, watch it, and start with your own idea.</p>
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
        <figure className="mx-auto mt-14 max-w-2xl text-center">
          <blockquote className="text-balance text-lg italic leading-8 text-white/80 sm:text-xl">
            “Too many good ideas die in the mind. This is a product that gives them an escape
            route. Stay with it.”
          </blockquote>
          <figcaption className="mt-3 text-sm text-white/50">
            — Rick Crossley, subscriber ·{' '}
            <Link href="/reviews" className="text-[#2997ff] transition hover:text-white">
              read our honest reviews page →
            </Link>
          </figcaption>
        </figure>

        <div className="mt-12 rounded-[22px] border border-[#2997ff]/25 bg-[#2997ff]/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-.02em]">Bring your own topic.</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">{ft(OFFER, 'Try up to three watermarked Fast videos every 24 hours. No card required.', OFFER.copy.headline)}</p>
          </div>
          {/* KINEO-EXAMPLES-LOGADO-2026-08-24 — logado vai direto ao Studio
              (a porta única do #301); visitante segue o funil de sempre. */}
          <OrganicCtaLink
            href={isLoggedIn ? '/studio?utm_source=examples&utm_medium=proof&utm_campaign=push31' : '/studio/create?utm_source=examples&utm_medium=proof&utm_campaign=push31'}
            source="examples_index"
            placement="footer_band"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold tracking-[-.02em] text-black transition hover:bg-white sm:mt-0"
          >
            {isLoggedIn ? 'Open Studio →' : 'Create a Fast video →'}
          </OrganicCtaLink>
        </div>

        <ExamplesBusinessProofBridge />
      </section>
    </main>
  )
}
