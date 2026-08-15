import type { Metadata } from 'next'
import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { getExamplesBest } from '@/lib/engineWall'
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

export default async function ExamplesPage() {
  const best = await getExamplesBest()
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
            The 20 best renders in the building — hand-picked from real user output across every engine. The badge on each card is the exact model that made it. Open one to watch and remix the format.
          </p>
        </div>

        {/* KINEO-BEST20-2026-08-15 — pedido do fundador: "os 20 melhores que a
            gente tem". Grade unica, curada a dedo (mesma curadoria do hero +
            Fast + Avatar), selo do motor real em cada card. */}
        <div className="mt-12 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {best.map((v) => (
            <Link
              key={v.id}
              href={`/v/${v.id}`}
              className="group relative block overflow-hidden rounded-[18px] border border-white/10 bg-black transition hover:-translate-y-1 hover:border-[#2997ff]/60"
              style={{ aspectRatio: '9 / 16' }}
            >
              <WallMedia src={v.videoUrl} />
              <span className="absolute left-2.5 top-2.5 z-10 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] backdrop-blur">
                {v.badge}
              </span>
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-2.5 pt-8">
                <p className="text-[11.5px] font-semibold leading-tight">{v.title}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* KINEO-EXPLORE-2026-08-15 — pedido do fundador: 20+ exemplos.
            10 locais curados acima + os renders REAIS do banco por motor
            abaixo, cada um com o selo do modelo que o gerou (mesma honestidade
            da Engine Wall da home). */}
        
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
