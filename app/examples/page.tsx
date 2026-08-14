import type { Metadata } from 'next'
import Link from 'next/link'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from './ExampleLiveMedia'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

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

export default function ExamplesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-lg font-semibold tracking-[-.02em] tracking-tight">Kineo</Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-white/70">
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <OrganicCtaLink
              href="/signup?utm_source=examples&utm_medium=proof&utm_campaign=push31"
              source="examples_index"
              placement="header"
              className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white"
            >
              Start free
            </OrganicCtaLink>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[-.02em] uppercase tracking-[0.18em] text-[#2997ff]">Real product proof</p>
          <h1 className="mt-4 text-balance font-display text-4xl font-semibold tracking-[-.02em] tracking-tight sm:text-6xl">
            Watch what Kineo actually makes.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            These are five-second preview cuts from longer Kineo exports—not stock mockups and not performance claims. Open one to watch, inspect the format and remix the prompt.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_EXAMPLES.map((example) => (
            <Link
              key={example.slug}
              href={`/examples/${example.slug}`}
              className="group overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] transition hover:-translate-y-1 hover:border-[#2997ff]/60"
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-black">
                {/* KINEO-HIGGSFIELD-20D dia 19 (13/08) — catalogo vivo: o
                    card toca em viewport, mesmas regras da galeria da home. */}
                <ExampleLiveMedia
                  videoPath={example.videoPath}
                  posterPath={posterWebpPath(example.posterPath)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" />
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[10px] font-semibold tracking-[-.02em] uppercase tracking-wider backdrop-blur">
                  Real output preview
                </span>
                <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-lg text-black shadow-2xl transition group-hover:scale-110" aria-hidden>
                  ▶
                </span>
                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-lg font-semibold tracking-[-.02em] leading-tight">{example.shortTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-white/65">
                    5s preview · {example.outputDurationSeconds}s export
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-[22px] border border-[#2997ff]/25 bg-[#2997ff]/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-.02em]">Bring your own topic.</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">{ft(OFFER, 'Try up to three watermarked Fast videos every 24 hours. No card required.', OFFER.copy.headline)}</p>
          </div>
          <OrganicCtaLink
            href="/generate?utm_source=examples&utm_medium=proof&utm_campaign=push31"
            source="examples_index"
            placement="footer_band"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold tracking-[-.02em] text-black transition hover:bg-white sm:mt-0"
          >
            Create a Fast video →
          </OrganicCtaLink>
        </div>
      </section>
    </main>
  )
}
