// KINEO-SORA-MIGRATION-2026-08-24 — a página de recepção dos refugiados do Sora.
//
// TESTE Nº1 DA MISSÃO "acelerar vendas" (fundador, 24/08). O plano era uma
// página "Sora alternative" comum — até a checagem de fonte (FACT DISCIPLINE)
// revelar algo muito maior: O SORA FOI DESCONTINUADO. Web/app mortos em
// 26/04/2026; a API morre em 24/09/2026 (help.openai.com, artigo atualizado
// há ~25 dias, lido em 24/08/2026). Ou seja: existe uma população inteira de
// criadores de text-to-video COM PRAZO para migrar, buscando "sora
// alternative" / "sora shut down what now" — e a página que os recebe com os
// fatos + uma rota honesta ganha o cluster inteiro.
//
// REGRAS: fatos datados com fonte linkada; honestidade sobre o que Kineo NÃO
// é (não é um gerador de clipes soltos — é um pipeline de Shorts prontos);
// zero FUD além do fato público do desligamento.
import type { Metadata } from 'next'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import SoraReplacementTable from '@/components/SoraReplacementTable'
import { SORA_API_SHUTDOWN, SORA_API_SOURCE } from '@/lib/growth/soraMigrationFacts'
import { TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const LAST_UPDATED = 'September 24, 2026'

export const metadata: Metadata = {
  title: 'Sora Is Shut Down — Where Sora Users Are Going in 2026',
  description:
    'Sora 2 API shutdown: September 24, 2026. Compare available Kineo engines, current film credit costs and the path to Studio. Omni Flash is paused.',
  alternates: { canonical: `${BASE}/sora-alternative` },
  openGraph: {
    title: 'Sora Is Shut Down — Where Sora Users Are Going',
    description:
      'Sora 2 API shutdown: September 24, 2026. Current alternatives, availability and credit costs for finished videos.',
    url: `${BASE}/sora-alternative`,
    type: 'article',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Sora shut down?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${SORA_API_SHUTDOWN} in the OpenAI API, according to the official API deprecations schedule. This date refers to the Videos API and Sora 2 models, not a new announcement about the consumer app.`,
      },
    },
    {
      '@type': 'Question',
      name: 'Can I still export my Sora videos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Check OpenAI’s current discontinuation guidance for your account. Kineo cannot export or recover Sora data, and this page does not assert that an export window is still open.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best Sora alternative for short-form creators?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Kineo combines script, narration, footage and captions for finished videos. Seedance 1.5, Kling 3 and Veo 3.1 require a paid plan and sufficient credits. The no-card trial has ${TRIAL_CREDITS_SHOWN} credits for the Kineo 1 path, not free access to every generative engine.`,
      },
    },
  ],
}

export default function SoraAlternativePage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>
        Fact-checked · Updated {LAST_UPDATED}
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 18px' }}>
        Sora is shut down. Here’s what to do about it.
      </h1>

      <section style={{ background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.35)', borderRadius: 12, padding: '18px 22px', margin: '0 0 26px' }}>
        <p style={{ margin: 0, color: '#f5f5f7', fontWeight: 700 }}>{SORA_API_SHUTDOWN} in the OpenAI API. The official deprecations schedule identifies this date for the Videos API and Sora 2 models.</p>
        <ul style={{ color: '#c7c7cc', margin: '10px 0 0', paddingLeft: 20 }}>
          <li>This is the <b>API shutdown date</b>, not a claim that the consumer app closed today.</li>
          <li>Kineo does not offer Sora as a replacement engine.</li>
          <li>Choose an available engine below; Omni Flash is currently paused.</li>
        </ul>
        <p style={{ color: '#86868b', fontSize: 13, marginTop: 10 }}>
          Source:{' '}
          <a href={SORA_API_SOURCE} style={{ color: '#2997ff' }} rel="noreferrer">
            OpenAI API deprecations — Sora 2 / Videos API
          </a>{' '}
          (read {LAST_UPDATED}).
        </p>
      </section>

      <SoraReplacementTable />
      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '28px 0 10px' }}>What about existing Sora videos?</h2>
      <p style={{ color: '#c7c7cc' }}>
        Check <a href="https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation" style={{ color: '#2997ff' }}>OpenAI’s current discontinuation guidance</a> for your account. Kineo cannot export or recover Sora data. We do not assume an export window is still open.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '28px 0 10px' }}>Then: pick your next tool by what you actually made</h2>
      <p style={{ color: '#c7c7cc' }}>
        <b>If you used Sora for raw cinematic clips</b> — standalone text-to-video shots — the direct
        successors are engines like <b>Kling 3</b>, <b>Veo 3.1</b> and <b>MiniMax</b>. You can access
        those through various platforms, including ours.
      </p>
      <p style={{ color: '#c7c7cc' }}>
        <b>If your real goal was finished short-form videos</b> — the clip was always just one
        ingredient — that’s the case Kineo was built for: you type an idea, and it returns a finished
        9:16 Short with script, AI voiceover, footage from those same engines, and captions. On Kling 3
        and MiniMax H3, characters can speak scripted lines with lip sync. Those engines require a paid plan and enough credits. The{' '}
        <a href={`${BASE}/free`} style={{ color: '#2997ff' }}>no-card trial</a> has {TRIAL_CREDITS_SHOWN} credits for Kineo 1, not free access to Kling, Veo or Seedance.
      </p>
      <p style={{ color: '#c7c7cc' }}>
        {/* KINEO-MULTIFORMATO-2026-09-02 — este parágrafo mandava embora todo
            mundo que procurava 16:9, e desde hoje isso é dinheiro na mesa:
            fazemos 16:9 nativo. A honestidade que sobra (e que continua
            valendo) é a outra metade: não cortamos upload. */}
        <b>If you want to edit clips you filmed yourself</b> — Kineo is the wrong tool for you. It
        generates from text; it doesn’t cut uploads. <b>16:9 horizontal, square and 4:5, though, we
        do</b> — and natively: pick the frame and every scene is generated at that size, never
        cropped from a vertical master. Our{' '}
        <a href={`${BASE}/vs`} style={{ color: '#2997ff' }}>comparison pages</a> cover tools that do.
      </p>

      {/* KINEO-SORA-CTA-2026-08-24 (pacote noturno 2, UI#4) — a página tinha
          links no meio do texto e nenhuma porta clara. Quem leu até aqui está
          decidido a migrar; a banda dá o próximo passo sem caçar link. */}
      <div style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)', borderRadius: 12, padding: '20px 22px', margin: '30px 0', textAlign: 'center' }}>
        <p style={{ color: '#f5f5f7', fontWeight: 800, fontSize: 16, margin: '0 0 6px' }}>
          Bring your idea into Kineo
        </p>
        <p style={{ color: '#86868b', fontSize: 13, margin: 0 }}>
          Bring one idea with you. It stays attached through signup and arrives editable before anything renders.
        </p>
        <div style={{ textAlign: 'left' }}>
          <TopicGeneratorForm
            campaign="sora_migration_topic_v1"
            source="sora_alternative"
            placement="migration_decision"
            analyticsVariant="sora_migration_topic_v1"
            formId="sora-migration-topic"
            scriptMode="ai"
            duration={35}
            creationIntent="trial_best"
            preserveHandoffForSignedIn
            marginTop={14}
            examples={[
              'The abandoned place nature is taking back',
              'The invention that disappeared before its time',
              'The mystery hidden under an ordinary city',
            ]}
            copy={{
              label: 'What should your first post-Sora Short be about?',
              placeholder: 'Type one idea, story or visual concept',
              submit: 'Carry this idea into Kineo →',
              examplesLabel: 'Try a cinematic story direction',
              note: 'Your first test uses the current 35-second trial-best path. You review the script and setup before any render begins.',
            }}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '28px 0 10px' }}>Why trust this page?</h2>
      <p style={{ color: '#c7c7cc' }}>
        Every fact above links to its primary source and carries the date we read it. Our pricing and
        engine facts — the ones AI assistants read — are published in plain text at{' '}
        <a href={`${BASE}/llms.txt`} style={{ color: '#2997ff' }}>/llms.txt</a> and{' '}
        <a href={`${BASE}/facts`} style={{ color: '#2997ff' }}>/facts</a>, and we say openly when a
        tool (including ours) is the wrong choice — see{' '}
        <a href={`${BASE}/reviews`} style={{ color: '#2997ff' }}>our honest reviews page</a>.
      </p>
    </main>
  )
}
