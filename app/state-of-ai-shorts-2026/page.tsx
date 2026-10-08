// KINEO-DATA-PR-2026-07-24 (PUSH #87) — "State of AI Shorts 2026" study.
// KINEO-LIVE-STUDY-2026-08-05 — o estudo virou VIVO (lia o banco uma vez por dia por lib/studyStats.ts).
// KINEO-GEO-RODADA2-2026-10-08 — o estudo virou EDIÇÃO MENSAL (sessão CEO 08/10, item 2 da rodada 2 de GEO).
//
// O QUE MUDOU E POR QUÊ
// ─────────────────────
// Em produção a leitura diária estava caindo no FALLBACK de 05/08 havia dois meses (as RPCs tinham teto de 5 s): a página
// dizia "updated daily · last read August 5, 2026", publicava 472 vídeos e uma curva mensal que parava em agosto — e as
// sessões vindas do ChatGPT caíram de 53 para 22 por semana. "Página que cai por envelhecer perde citação."
//
// Agora a página lê a edição do mês (data/state-of-ai-shorts/<AAAA-MM>.json, gravado verbatim da consulta .sql ao lado) e
// segue a REGRA DO ÍNDICE V2 (/ai-video-index): SEM VOLUME ABSOLUTO DE CLIENTE — só medianas, percentis e taxas; a amostra só
// como faixa, e só na metodologia. Todo texto com número sai de lib/seo/stateOfAiShorts.ts buildStateView: este arquivo não
// digita número. Estática (sem banco, sem request): edição nova = deploy novo, com o selo "Updated <mês>" e a data da leitura.
//
// O que ficou de propósito: o H1, a ponte roteiro → Seedance acima de "Key findings", o formulário do estudo depois dos
// achados (mesma campanha e variante medidas desde 28/08), a ponte de agências e o link para o estudo irmão por motor.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import { CARD_ENTRY_COPY } from '@/lib/entryPolicy'
// KINEO-STARTER-EM-ARTIGO-2026-08-15 — o MESMO componente que a home e as 13
// páginas de intenção usam, nunca uma cópia. Ver o bloco de comentário no corpo.
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import AgencyVolumeBridge from '@/components/AgencyVolumeBridge'
// KINEO-PONTE-ACIMA-DA-DOBRA-2026-09-23 — ponte roteiro → Seedance acima da dobra (fundador 23/09, jogada 3).
import ScriptToSeedanceBridge from '@/components/ScriptToSeedanceBridge'
import { ENGINES } from '@/lib/growth/enginePageCatalog'
import { enginePaused } from '@/lib/engineLaunch'
import { STATE_EDITION } from '@/lib/seo/stateOfAiShortsEdition'
import { buildStateView, STATE_CANONICAL, STATE_LICENSE, STATE_LICENSE_LABEL } from '@/lib/seo/stateOfAiShorts'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

// Estática: os números vêm da edição versionada (nenhuma leitura de banco no build ou no request).
export const dynamic = 'force-static'

const CANONICAL = STATE_CANONICAL
const VIEW = buildStateView(STATE_EDITION)

export async function generateMetadata(): Promise<Metadata> {
  // KINEO-GEO-RODADA2-2026-10-08 — título e descrição da edição: sem volume absoluto (regra v2), com o selo do mês.
  const title = VIEW.metaTitle
  const description = VIEW.metaDescription
  return {
    title,
    description,
    alternates: { canonical: CANONICAL },
    openGraph: { title, description, url: CANONICAL, siteName: 'Kineo (usekineo.com)', type: 'article' },
    twitter: { card: 'summary_large_image', title: 'State of AI Shorts 2026', description },
  }
}

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function StateOfAiShortsPage() {
  // KINEO-PONTE-ACIMA-DA-DOBRA-2026-09-23 — medido 23/09: esta é a página mais citada pelo ChatGPT (238 sessões
  // em 60 d) e a que menos converte (26 contas, 0 pagantes). A ponte roteiro → Seedance nasce aqui, logo antes do
  // bloco do formulário, e é renderizada no TOPO do conteúdo (depois do lead, antes de "Key findings"). Título, H1,
  // lead e JSON-LD intocados. Some se o Seedance estiver pausado.
  const seedanceBridge = !enginePaused(ENGINES.seedance.param) ? <ScriptToSeedanceBridge from="state_of_ai" /> : null

  // KINEO-GROWTH-STATE-STARTER-2026-08-28 — production evidence showed the
  // embedded starter converts when it is reached, but it sat after the entire
  // study. Keep one starter and one campaign; move that same useful action to
  // the first natural decision point, immediately after the key findings.
  // `placement` and `analyticsVariant` distinguish the new position without
  // changing the historical campaign or counting mirrored events as people.
  // KINEO-GEO-RODADA2-2026-10-08 — as três ideias de exemplo são as dos três nichos que lideram ESTA edição (derivadas da
  // posição na edição), então "three leading niches in this study" continua verdade quando o ranking muda de um mês ao outro.
  const starterSection = (
    <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 48px', borderColor: ACCENT }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
        Test the data yourself — free
      </h2>
      <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 4px' }}>
        Start with one of the three leading niches in this study — or type your own topic.
        {VIEW.time ? ` Expect about ${VIEW.time.median}.` : ''} {ft(OFFER, 'Up to 3 watermarked videos every 24 hours, no card.', OFFER.copy.headline)}
      </p>
      <TopicGeneratorForm
        campaign="starter_state_of_ai_shorts"
        source="starter_state_of_ai_shorts"
        placement="after_key_findings"
        analyticsVariant="state_study_starter_after_findings_2026_08_28"
        formId="study-start-a-short"
        examples={VIEW.starterExamples}
        copy={{
          label: 'Start with one of the top niches — or your own topic',
          placeholder: 'Type one topic — e.g. the empire that collapsed in a single generation',
          submit: 'Turn this topic into a Short →',
          examplesLabel: 'Top-ranked niches from this study',
          note: `${VIEW.time ? `Median finish time in the data above is ${VIEW.time.median} for AI-generated scenes. ` : ''}Your topic stays attached through signup. ${CARD_ENTRY_COPY.noFreeTier}`,
        }}
      />
    </section>
  )

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily: 'var(--font-sans), Arial, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.article).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.dataset).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(VIEW.jsonLd.faq).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <p
          data-kineo="state-seal"
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Original research · {VIEW.seal}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          State of AI Shorts 2026
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          {VIEW.lead}
        </p>
        <p data-kineo="state-source" style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          {VIEW.sourceLine} Free to cite with a link to this page. Medians and rates only — no counts and no individual
          creator data.
        </p>

        {seedanceBridge && <div style={{ margin: '-16px 0 40px' }}>{seedanceBridge}</div>}

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>Key findings</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
            margin: '0 0 48px',
          }}
        >
          {VIEW.findings.map((f) => (
            <section key={f.label} style={{ ...CARD, padding: '18px 18px' }}>
              <p style={{ color: ACCENT, fontSize: '1.9rem', fontWeight: 800, margin: '0 0 4px' }}>
                {f.stat}
              </p>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 8px' }}>{f.label}</h3>
              <p style={{ color: '#d2d2d7', fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>
                {f.detail}
              </p>
            </section>
          ))}
        </div>

        {starterSection}

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          How long an AI Short actually takes
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Every tool in this category advertises a time and almost none publish a distribution. Here is ours, measured from
          the moment the request reaches the server to the moment the finished film is saved — script, scenes, narration,
          captions and final assembly included — on the engines that generate every scene.
        </p>
        {VIEW.time ? (
          <div style={{ ...CARD, padding: '18px 20px', margin: '0 0 48px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
              <div>
                <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>{VIEW.time.median}</p>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>median (half finish faster)</p>
              </div>
              <div>
                <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>{VIEW.time.p90}</p>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>90th percentile</p>
              </div>
              <div>
                <p style={{ color: ACCENT, fontSize: '1.6rem', fontWeight: 800, margin: '0 0 2px' }}>{VIEW.time.reliability}</p>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>of renders that started were delivered</p>
              </div>
            </div>
            <p style={{ color: '#d2d2d7', fontSize: '0.88rem', lineHeight: 1.55, margin: '16px 0 0' }}>
              {VIEW.time.caption} Engine by engine:{' '}
              <Link href="/ai-video-index" style={{ color: ACCENT, fontWeight: 700 }}>Kineo AI Video Index</Link>.
            </p>
          </div>
        ) : null}

        {VIEW.length ? (
          <>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>How long finished Shorts run</h2>
            <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>{VIEW.length.caption}</p>
            <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 8 }}>
              {VIEW.length.bars.map((b) => (
                <li key={b.label} style={{ ...CARD, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 170 }}>{b.label}</span>
                  <div style={{ height: 8, flex: `0 1 ${Math.max(4, Math.round(b.pct))}%`, background: ACCENT, borderRadius: 4, opacity: 0.85 }} />
                  <span style={{ color: '#d2d2d7', fontSize: '0.85rem', fontWeight: 600 }}>{b.text}</span>
                </li>
              ))}
            </ol>
            <p style={{ color: '#d2d2d7', fontSize: '0.88rem', lineHeight: 1.55, margin: '0 0 48px' }}>
              Writing for a full minute? Check a script against the one-minute mark with the free{' '}
              <Link href="/tiktok-creator-rewards-length-checker" style={{ color: ACCENT, fontWeight: 700 }}>TikTok Creator Rewards length checker</Link>.
            </p>
          </>
        ) : null}

        <AgencyVolumeBridge entry="state_report" />

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          What creators make: the faceless niche ranking
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Niches ranked by the share of creators whose ideas match them in {VIEW.windowLabel}. Neighbors a few creators apart
          are effectively tied — read the tiers first.
        </p>
        <div style={{ display: 'grid', gap: 14, margin: '0 0 48px' }}>
          {VIEW.nicheTiers.map((t) => (
            <section key={t.tier} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>{t.title}</h3>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 10px' }}>{t.rule}</p>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {t.items.map((it) => (
                  <li key={it.key} style={{ border: '1px solid #2a2a2d', borderRadius: 999, padding: '6px 12px', fontSize: '0.88rem' }}>
                    <span style={{ color: ACCENT, fontWeight: 800 }}>#{it.rank}</span>{' '}
                    {it.path ? (
                      <Link href={it.path} style={{ color: '#f5f5f7', textDecoration: 'none', fontWeight: 700 }}>{it.label}</Link>
                    ) : (
                      <span style={{ fontWeight: 700 }}>{it.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          What this means if you are starting a channel now
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 48px' }}>
          {VIEW.insights.map((ins) => (
            <section key={ins.title} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{ins.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>{ins.body}</p>
            </section>
          ))}
          <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.92rem', margin: '4px 0 0' }}>
            {/* KINEO-BENCHMARK-MOTORES-2026-09-23 — liga a página de dados irmã (sem link interno ela nasce órfã). */}
            Choosing an engine? <Link href="/seedance-vs-veo-vs-kling" style={{ color: ACCENT, fontWeight: 700 }}>Seedance vs Veo vs Kling, measured</Link>
            {' · '}
            <Link href="/ai-video-generator/seedance" style={{ color: ACCENT, fontWeight: 700 }}>Seedance 1.5: price per video and the free film</Link>
          </p>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>Questions</h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 48px' }}>
          {VIEW.faq.map((f) => (
            <section key={f.q} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{f.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.92rem', margin: 0 }}>{f.a}</p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>Methodology</h2>
        <ul style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 16px', paddingLeft: 20 }}>
          {VIEW.methodology.map((m) => (
            <li key={m} style={{ margin: '0 0 8px' }}>{m}</li>
          ))}
        </ul>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7 }}>
          Citing this study: {VIEW.citeLine} Free to cite under{' '}
          <a href={STATE_LICENSE} rel="noopener noreferrer" target="_blank" style={{ color: ACCENT }}>{STATE_LICENSE_LABEL}</a>{' '}
          with a link to this page. Press &amp; data questions: hello@usekineo.com.
        </p>
      </div>
    </main>
  )
}
