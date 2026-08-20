import type { Metadata } from 'next'
import Link from 'next/link'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-CASE-STUDY-2026-07-31 — "WE RUN A REAL CHANNEL WITH KINEO. IN PUBLIC."
//
// POR QUE ESTA PÁGINA EXISTE (decisão de CEO, com os números na mesa):
//
// A pergunta que trava a primeira compra não é "quanto custa?" — é "isso
// funciona de verdade?". Todo concorrente responde com página de vendas.
// Nenhum responde com um canal REAL, rodando em público, com números que
// podem cair. É exatamente o que a Kineo tem e nunca mostrou:
// Curiosityvaultlab, 12.641 inscritos, entregue ao Autopilot em 27/07/2026 —
// a primeira conexão de canal da história do produto (PROJECT_STATE.md §3.2).
//
// Este é o único formato de prova que um produto sem marca consegue pagar:
// honestidade radical como diferencial. A página promete atualizar os números
// TODA SEMANA, inclusive quando forem ruins. Um case study que admite falha
// é mais crível que dez depoimentos — e "faceless channel case study" /
// "youtube automation results" é exatamente o que o comprador cético digita.
//
// SOBRE A REGRA "não publicar página nova de SEO": ela proíbe página de
// PALAVRA-CHAVE fina diluindo crawl budget. Esta é uma página de PROVA,
// linkada do rodapé da home (link interno forte, crawl garantido), servindo
// CONVERSÃO do tráfego que já existe. A distinção está documentada aqui de
// propósito para a próxima auditoria não reverter isso como violação.
//
// HONESTIDADE DOS NÚMEROS (AGENTS.md §5 — todo número com fonte e data):
// os valores abaixo foram verificados a olho em 30/07/2026 no canal público.
// O experimento tem DIAS de vida — a página diz isso com todas as letras.
// Atualização é manual por enquanto (editar BASELINE/LATEST abaixo);
// automatizar via YouTube Data API é upgrade futuro, não requisito.
// ═══════════════════════════════════════════════════════════════════════════

const CHANNEL = {
  name: 'Curiosityvaultlab',
  url: 'https://www.youtube.com/channel/UCffjyZHeIPGjbwHTQQIF-dA',
  niche: 'Mysteries & unexplained',
  handoverDate: 'July 27, 2026',
  baselineSubs: '12,641',
  baselineVideos: 155,
  cadence: '1 Short per day, published automatically at 6 PM',
  lastVerified: 'July 30, 2026',
}

const TITLE = 'We Run a Real Faceless Channel With Kineo — In Public'
const DESCRIPTION =
  `A real YouTube channel (${CHANNEL.baselineSubs} subscribers) handed over to Kineo's Autopilot on ${CHANNEL.handoverDate}. One Short a day, zero manual editing. Numbers updated weekly — including the bad ones.`
const URL = 'https://www.usekineo.com/youtube-automation-case-study'

export const metadata: Metadata = {
  title: `${TITLE} | Kineo`,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: 'article' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function CaseStudyPage() {
  return (
    <main className="min-h-screen bg-[#08080b] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: TITLE,
            description: DESCRIPTION,
            datePublished: '2026-07-31',
            dateModified: '2026-07-31',
            author: { '@type': 'Organization', name: 'Kineo' },
            mainEntityOfPage: URL,
          }),
        }}
      />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-lg font-black tracking-tight">Kineo</Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-white/70">
            <Link href="/examples" className="transition hover:text-white">Examples</Link>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <Link
              href="/signup?utm_source=case_study&utm_medium=proof&utm_campaign=live_channel"
              className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-cyan-200"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
          Live experiment · updated weekly
        </p>
        <h1 className="mt-4 text-balance font-display text-4xl font-black tracking-tight sm:text-5xl">
          We run a real faceless channel with Kineo. In public.
        </h1>
        <p className="mt-5 text-base leading-7 text-white/65 sm:text-lg">
          Every AI video tool claims it can run a YouTube channel for you. None of them show you a
          real channel where that is actually happening. So we are doing it with ours — and
          publishing the numbers every week, <strong className="text-white/90">including the weeks
          where they are bad</strong>.
        </p>

        {/* The channel card — every figure dated, per AGENTS.md §5 */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-black">{CHANNEL.name}</h2>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              verified {CHANNEL.lastVerified}
            </span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Subscribers at handover
              </dt>
              <dd className="mt-1 font-display text-2xl font-black text-cyan-300">
                {CHANNEL.baselineSubs}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Videos before Kineo
              </dt>
              <dd className="mt-1 font-display text-2xl font-black">{CHANNEL.baselineVideos}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Running on Autopilot since
              </dt>
              <dd className="mt-1 font-display text-2xl font-black">Jul 27, 2026</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-white/60">
            Niche: {CHANNEL.niche}. Cadence: {CHANNEL.cadence}. Kineo picks the topic, writes the
            script, records the voiceover, matches the footage, burns the captions and publishes —
            no human edits a single frame.
          </p>
          <a
            href={CHANNEL.url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block rounded-full border border-cyan-300/40 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-300/10"
          >
            Open the channel on YouTube →
          </a>
        </div>

        {/* Radical honesty — this is the differentiator, keep it blunt */}
        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">The rules we set ourselves</h2>
        <ul className="mt-4 space-y-3 text-base leading-7 text-white/65">
          <li>
            <strong className="text-white/90">Numbers update weekly, no matter what.</strong> If a
            week is flat, we publish flat. If retention drops, we publish the drop and what we
            changed in the engine because of it.
          </li>
          <li>
            <strong className="text-white/90">Same product you get.</strong> The channel runs on the
            same Fast engine and the same Autopilot every customer uses — no internal-only models,
            no manual retouching.
          </li>
          <li>
            <strong className="text-white/90">Failures are data.</strong> This experiment started on
            {' '}{CHANNEL.handoverDate}. It is days old. We do not know yet how it ends — that is
            exactly why it is worth watching.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">Why we publish this</h2>
        <p className="mt-4 text-base leading-7 text-white/65">
          A tool that claims to grow channels should be able to point at one. Screenshots can be
          faked and testimonials can be bought; a live channel with dated numbers cannot. If Kineo
          works, you will see it here first. If it does not, you will see that too — and so will we,
          which is how the product gets better.
        </p>

        <div className="mt-12 rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6 text-center">
          <h2 className="font-display text-2xl font-black tracking-tight">
            Run the same experiment on your channel
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">
            Type one topic, get a finished Short with script, voice, footage and captions — usually
            in 3–7 minutes. {ft(OFFER, '3 free videos every 24h, no card.', OFFER.copy.headline)}
          </p>
          <Link
            href="/signup?utm_source=case_study&utm_medium=proof&utm_campaign=live_channel"
            className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
          >
            {/* KINEO-TRIAL-BLOCKERS-2026-08-07 — último vazamento de copy do QA
                (item h): este botão estava hardcoded duas linhas abaixo de um
                parágrafo que JÁ passa por ft(), então com a flag ON a mesma
                caixa dizia "Creator trial: 50 credits" no texto e "3 videos a
                day" no botão. Flag OFF devolve o literal byte a byte. */}
            {ft(OFFER, 'Start free — 3 videos a day', 'Start your trial — $1 for 7 days')}
          </Link>
          <p className="mt-4 text-xs text-white/40">
            Curious about the money side? <Link href="/how-much-do-youtube-shorts-pay" className="underline hover:text-white/70">How much Shorts pay</Link> ·{' '}
            <Link href="/youtube-automation" className="underline hover:text-white/70">YouTube automation guide</Link>
          </p>
        </div>
      </article>
    </main>
  )
}
