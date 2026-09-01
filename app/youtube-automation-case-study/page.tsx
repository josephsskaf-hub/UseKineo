import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'

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
  baselineSubs: '12,641',
  baselineVideos: 155,
  publicSubs: '12.5K',
  publicVideos: 170,
  scheduledRuns: 4,
  publishedRuns: 0,
  failedRuns: 1,
  skippedRuns: 3,
  ledgerThrough: 'July 30, 2026',
  lastVerified: 'September 1, 2026',
}

const TITLE = 'Our Public YouTube Autopilot Experiment: 4 Runs, 0 Posts'
const DESCRIPTION =
  `The dated record of Kineo's first public Autopilot experiment: ${CHANNEL.scheduledRuns} scheduled runs, ${CHANNEL.publishedRuns} published posts. What failed, what the public channel shows, and what remains unproven.`
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
            dateModified: '2026-09-01',
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
          Public experiment record · verified September 1, 2026
        </p>
        <h1 className="mt-4 text-balance font-display text-4xl font-black tracking-tight sm:text-5xl">
          Our first public Autopilot test did not publish a video.
        </h1>
        <p className="mt-5 text-base leading-7 text-white/65 sm:text-lg">
          We originally published this page as a live success experiment. The production ledger
          does not support that claim. It records four scheduled runs for this channel through
          July 30: <strong className="text-white/90">zero published, one failed and three skipped</strong>.
          This page now shows that outcome instead of treating an unfinished test as proof.
        </p>

        {/* Public channel snapshot — every figure dated, per AGENTS.md §5. */}
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
                Subscribers · Jul 27
              </dt>
              <dd className="mt-1 font-display text-2xl font-black text-cyan-300">
                {CHANNEL.baselineSubs}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Public snapshot · Sep 1
              </dt>
              <dd className="mt-1 font-display text-2xl font-black">{CHANNEL.publicSubs} subscribers</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Total public videos
              </dt>
              <dd className="mt-1 font-display text-2xl font-black">{CHANNEL.publicVideos}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-white/60">
            The channel had {CHANNEL.baselineVideos} videos at handover and shows {CHANNEL.publicVideos}{' '}
            now. That is a public increase of {CHANNEL.publicVideos - CHANNEL.baselineVideos}, but
            the Autopilot ledger records no published run, so this page does not attribute those
            uploads to Kineo. Niche: {CHANNEL.niche}.
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

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">The production ledger</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ['Scheduled', CHANNEL.scheduledRuns, 'Jul 27–30'],
            ['Published', CHANNEL.publishedRuns, 'No YouTube ID'],
            ['Failed', CHANNEL.failedRuns, 'Jul 27'],
            ['Skipped', CHANNEL.skippedRuns, 'Session unavailable'],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</div>
              <div className="mt-1 font-display text-3xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs leading-5 text-white/50">{note}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-white/60">
          “Session unavailable” means the scheduled job could not use an authenticated YouTube
          session. It was correctly skipped instead of pretending to publish. The ledger is current
          through {CHANNEL.ledgerThrough}; no later run exists for this channel in the product record.
        </p>

        <h2 className="mt-12 font-display text-2xl font-black tracking-tight">What this proves — and does not prove</h2>
        <p className="mt-4 text-base leading-7 text-white/65">
          It proves that Kineo attempted the schedule and recorded the failure state. It does not
          prove daily publishing, channel growth or an Autopilot success story. The experiment is
          paused and remains unvalidated until a new seven-day run publishes at least six of seven
          scheduled Shorts without manual intervention. We will not turn subscriber counts or
          unrelated uploads into an Autopilot claim.
        </p>

        <div className="mt-12 rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6 text-center">
          <h2 className="font-display text-2xl font-black tracking-tight">
            Decide with the failure history visible
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">
            Kineo still offers a paid seven-day Autopilot pilot, but this public test is not proof of
            reliable publishing or results. Review the current pilot and monthly terms before you
            pay, or keep control and test the self-serve generator first.
          </p>
          <OrganicCtaLink
            href="/pricing?intent_campaign=autopilot_case_study_v1#autopilot"
            source="youtube_automation_case_study"
            placement="autopilot_offer"
            className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
          >
            Review the pilot and monthly terms
          </OrganicCtaLink>
          <Link
            href="/signup?utm_source=case_study&utm_medium=proof&utm_campaign=live_channel"
            className="ml-3 mt-3 inline-block rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:border-cyan-200 hover:text-cyan-100 max-sm:ml-0"
          >
            {/* KINEO-TRIAL-BLOCKERS-2026-08-07 — último vazamento de copy do QA
                (item h): este botão estava hardcoded duas linhas abaixo de um
                parágrafo que JÁ passa por ft(), então com a flag ON a mesma
                caixa dizia "Creator trial: 50 credits" no texto e "3 videos a
                day" no botão. Flag OFF devolve o literal byte a byte. */}
            {ft(OFFER, 'Start free — 3 videos a day', `Start free — ${TRIAL_GRANT_CREDITS_COPY} credits, every engine`)}
          </Link>
          <p className="mt-4 text-xs text-white/40">
            Need client videos without managed publishing? <Link href="/ai-shorts-for-agencies" className="underline hover:text-white/70">See one-time agency packs</Link> ·{' '}
            <Link href="/youtube-automation" className="underline hover:text-white/70">YouTube automation guide</Link>
          </p>
        </div>
      </article>
    </main>
  )
}
