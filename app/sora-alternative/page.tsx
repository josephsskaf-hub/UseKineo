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

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const LAST_UPDATED = 'August 24, 2026'

export const metadata: Metadata = {
  title: 'Sora Is Shut Down — Where Sora Users Are Going in 2026',
  description:
    "OpenAI discontinued the Sora app on April 26, 2026, and the Sora API shuts down September 24, 2026. What that means, how to export your Sora content, and the honest options for text-to-video creators — including when Kineo fits and when it doesn't.",
  alternates: { canonical: `${BASE}/sora-alternative` },
  openGraph: {
    title: 'Sora Is Shut Down — Where Sora Users Are Going',
    description:
      'Sora app: discontinued April 26, 2026. Sora API: ends September 24, 2026. Export steps and honest alternatives for text-to-video creators.',
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
        text: 'Yes. OpenAI discontinued the Sora web and app experiences on April 26, 2026. The Sora API will be discontinued on September 24, 2026, per OpenAI’s help center.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I still export my Sora videos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'OpenAI provides an export at sora.chatgpt.com/sunset. After the final export window passes, OpenAI states it will permanently delete Sora data — so export as soon as possible.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best Sora alternative for short-form creators?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on what you used Sora for. For raw cinematic clips, engines like Kling and Veo are direct successors. If your goal was finished vertical Shorts — script, voiceover, footage and captions in one pipeline — Kineo runs Kling 3, Veo 3.1, Seedance and MiniMax H3 under one roof and delivers a finished 9:16 video, with a free tier that needs no card.',
      },
    },
  ],
}

export default function SoraAlternativePage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif', lineHeight: 1.65 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <p style={{ color: '#86868b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800 }}>
        Fact-checked · Updated {LAST_UPDATED}
      </p>
      <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.15, margin: '10px 0 18px' }}>
        Sora is shut down. Here’s what to do about it.
      </h1>

      <section style={{ background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.35)', borderRadius: 12, padding: '18px 22px', margin: '0 0 26px' }}>
        <p style={{ margin: 0, color: '#f5f5f7', fontWeight: 700 }}>The verified facts, from OpenAI’s own help center:</p>
        <ul style={{ color: '#c7c7cc', margin: '10px 0 0', paddingLeft: 20 }}>
          <li>The Sora <b>web and app</b> were discontinued on <b>April 26, 2026</b>.</li>
          <li>The Sora <b>API</b> will be discontinued on <b>September 24, 2026</b>.</li>
          <li>After the export window, OpenAI says it will <b>permanently delete</b> Sora data.</li>
        </ul>
        <p style={{ color: '#86868b', fontSize: 13, marginTop: 10 }}>
          Source:{' '}
          <a href="https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation" style={{ color: '#2997ff' }} rel="nofollow noreferrer">
            “What to know about the Sora discontinuation” — OpenAI Help Center
          </a>{' '}
          (read {LAST_UPDATED}).
        </p>
      </section>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: '28px 0 10px' }}>First: export your Sora content now</h2>
      <p style={{ color: '#c7c7cc' }}>
        Go to <b>sora.chatgpt.com/sunset</b> and click Export — you’ll get an email when it’s ready.
        Don’t wait: once the final window closes, OpenAI states the data is permanently deleted.
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
        and MiniMax H3, characters on screen speak the scripted lines with lip sync. There’s a{' '}
        <a href={`${BASE}/free`} style={{ color: '#2997ff' }}>free tier with no card</a> to check the
        claim in minutes.
      </p>
      <p style={{ color: '#c7c7cc' }}>
        <b>And if you need 16:9 horizontal videos or want to edit clips you filmed yourself</b> —
        Kineo is the wrong tool for you. It’s 9:16 vertical only and generates from text; it doesn’t
        cut uploads. Our{' '}
        <a href={`${BASE}/vs`} style={{ color: '#2997ff' }}>comparison pages</a> cover tools that do.
      </p>

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
