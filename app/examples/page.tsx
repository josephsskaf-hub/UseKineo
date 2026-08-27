import type { Metadata } from 'next'
import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { getExamplesBest } from '@/lib/engineWall'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-EXAMPLES-LOGADO-2026-08-24 — o fundador abriu /examples LOGADO e viu
// "Start free": a página tratava assinante como estranho. O header agora
// pergunta ao servidor quem está olhando.
import { createClient } from '@/lib/supabase/server'
// KINEO-CUSTO-NO-CARD-2026-08-24 (pacote noturno, UI#2) — cada card da prova
// ganha o PREÇO em créditos do motor que o fez. Prova de qualidade + prova de
// preço no mesmo pixel: "isto custou ~20 créditos" transforma o catálogo numa
// tabela de custo viva — o argumento que nenhum concorrente mostra. Derivado
// de creditCostFor (a função que o caixa usa, #296) — nunca escrito à mão.
import { creditCostFor, type Quality } from '@/lib/credits/engineCost'

const BADGE_QUALITY: Record<string, Quality> = {
  'KINEO 1': 'fast', 'SEEDANCE 1.5': 'cinematic_ai', 'KLING 2.5': 'cinematic_kling',
  'VEO 3.1': 'cinematic_veo', 'KLING 3': 'cinematic_hollywood', 'MINIMAX H3': 'cinematic_h3',
  'OMNI FLASH': 'cinematic_omni', // KINEO-OMNI-2026-08-25 — pronto pra quando a vitrine ganhar o 1º clipe aprovado
  'AVATAR': 'presenter', 'AI PRESENTER': 'presenter',
}
function costFor(badge: string): number | null {
  const q = BADGE_QUALITY[(badge ?? '').toUpperCase().trim()]
  return q ? creditCostFor(q, true) : null
}

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

// A checagem de auth torna a página por-request — aceitável: ela já lê o
// banco (getExamplesBest) e a vitrine muda com a curadoria de qualquer jeito.
export const dynamic = 'force-dynamic'

export default async function ExamplesPage() {
  const best = await getExamplesBest()
  // KINEO-EXAMPLES-LOGADO-2026-08-24 — logado vê "Open Studio" (a porta do
  // produto), visitante vê "Start free" (a porta do funil). Mostrar signup a
  // um assinante é pedir para ele criar a conta que já paga.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-lg font-semibold tracking-[-.02em] tracking-tight">Kineo</Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-white/70">
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            {isLoggedIn ? (
              <Link
                href="/studio"
                className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white"
              >
                Open Studio
              </Link>
            ) : (
              <OrganicCtaLink
                href="/signup?utm_source=examples&utm_medium=proof&utm_campaign=push31"
                source="examples_index"
                placement="header"
                className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white"
              >
                Start free
              </OrganicCtaLink>
            )}
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
            Six Kineo-owned demo previews, stored with the site and selected for public use. Customer videos stay private; open any sample to watch and remix the format with your own topic.
          </p>
        </div>

        {/* P0 PRIVACY CONTAINMENT (2026-08-27): repository-owned samples only.
            A completed customer render is not publication consent. */}
        <div className="mt-12 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* Modelo aprovado pelo fundador (print 15/08): card menor, video
              LIMPO (as legendas queimadas do proprio render sao a info) e o
              titulo em texto ABAIXO da midia, dentro do card. */}
          {best.map((v) => (
            <Link
              key={v.id}
              href={v.href ?? `/v/${v.id}`}
              className="group block overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-[#2997ff]/60"
            >
              <div className="relative aspect-[9/16] overflow-hidden bg-black">
                <WallMedia src={v.videoUrl} />
                <span className="absolute left-2.5 top-2.5 z-10 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] backdrop-blur">
                  {v.badge}
                </span>
                {/* KINEO-CUSTO-NO-CARD-2026-08-24 — o preço mora ao lado da prova. */}
                {costFor(v.badge) !== null && (
                  <span className="absolute right-2.5 top-2.5 z-10 rounded-md border border-[#2997ff]/40 bg-black/60 px-2 py-0.5 text-[9.5px] font-bold text-[#7cc0ff] backdrop-blur">
                    {costFor(v.badge)} cr
                  </span>
                )}
              </div>
              <p className="p-2.5 text-[11.5px] font-semibold leading-snug text-white/85">{v.title}</p>
            </Link>
          ))}
        </div>

        {/* Dynamic customer renders are intentionally absent until an explicit
            public visibility choice exists in the durable data model. */}
        
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
            href={isLoggedIn ? '/studio?utm_source=examples&utm_medium=proof&utm_campaign=push31' : '/generate?utm_source=examples&utm_medium=proof&utm_campaign=push31'}
            source="examples_index"
            placement="footer_band"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold tracking-[-.02em] text-black transition hover:bg-white sm:mt-0"
          >
            {isLoggedIn ? 'Open Studio →' : 'Create a Fast video →'}
          </OrganicCtaLink>
        </div>
      </section>
    </main>
  )
}
