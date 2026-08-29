// #289 — KINEO-SEO-FALA-2026-08-23. Página de intenção alta para o cluster
// "ai video with talking characters / lip sync / ai actors that speak".
//
// POR QUE ESTA PÁGINA EXISTE, e por que ela é diferente das outras 40:
// as páginas de SEO que já temos vendem o que TODO concorrente vende (faceless,
// sem filmar, texto→vídeo). Hoje (23/08) o produto ganhou algo que nenhum dos
// 27 concorrentes listados em /alternatives faz: a cena de diálogo com fala
// nativa e lip sync ALTERNANDO com narração de documentário, dirigida em
// código pelo planner (o motor decide a boca; nós decidimos QUEM fala e QUANDO).
// Diferencial sem página é diferencial invisível para a busca.
//
// Honestidade (regra do selo honesto): a página nomeia os DOIS motores em que
// isso funciona (Kling 3 e MiniMax H3) e diz o preço em créditos de cada um.
// Nenhuma promessa que o produto não entregue hoje.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { STARTER_MONTH } from '@/lib/marketingPrice'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { buildProductSurfaceSignupHref } from '@/lib/growth/productSurfaceIntent'

const BASE = 'https://www.usekineo.com'
const INTENT_CAMPAIGN = 'seo_talking_characters'
const H3_60_CREDITS = creditCostForDuration('cinematic_h3', true, 60)
const KLING3_60_CREDITS = creditCostForDuration('cinematic_hollywood', true, 60)
const TALKING_CHARACTERS_SIGNUP_HREF = buildProductSurfaceSignupHref({
  surface: 'h3',
  campaign: INTENT_CAMPAIGN,
  utmSource: 'seo',
})

export const metadata: Metadata = {
  title: 'AI Video With Talking Characters — Lip Sync + Narrator | Kineo',
  description:
    'Make AI videos where the character on screen actually speaks — real lip sync — while a documentary narrator carries the rest of the story. Two engines, one script, a finished 9:16 MP4.',
  alternates: { canonical: `${BASE}/ai-video-with-talking-characters` },
  openGraph: {
    title: 'AI video with talking characters — lip sync and a narrator, in one film',
    description:
      'Most AI video tools give you b-roll with a single robotic voice. Kineo alternates dialogue scenes (lip sync) with narration, directed scene by scene.',
    url: `${BASE}/ai-video-with-talking-characters`,
    type: 'website',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video With Talking Characters | Kineo',
    description: 'Lip-synced dialogue scenes + documentary narration, from one script.',
    images: [`${BASE}/og-image.png`],
  },
}

const HOW: { n: string; t: string; d: string }[] = [
  { n: '1', t: 'Write (or paste) one script', d: 'Your words are kept exactly as written. The director splits them into scenes in code — no model rewrites your lines, so facts and names survive into the film.' },
  { n: '2', t: 'The director decides who speaks', d: 'Some beats become dialogue scenes: a character on screen delivers that exact line, with lip sync and their own voice. The rest become narrated scenes, where a documentary narrator speaks over the footage.' },
  { n: '3', t: 'One finished vertical film', d: 'Karaoke captions follow whoever is speaking — transcribed from the character on dialogue scenes, word-timed on narration. Music, cuts and export to 9:16 MP4 are done for you.' },
]

const WHY: { t: string; d: string }[] = [
  { t: 'A scene, not a slideshow', d: 'A face saying the words holds attention differently than stock footage under a voiceover. Alternating the two is how documentaries have always worked — talking head, then evidence, then talking head.' },
  { t: 'One narrator, many characters', d: 'The narrator voice is picked to match the subject (a history film gets a documentary voice, not a synthetic assistant), and stays the same from first frame to last.' },
  { t: 'Your script, word for word', d: 'Choose "Use my script as is" and the spoken lines are yours — including what the character says on camera. Nothing is invented to fill time.' },
  { t: 'Nothing to configure', d: 'There is no avatar to pick, no voice to clone, no lip-sync step to run. You write; the pipeline directs.' },
]

const ENGINES: { name: string; credits: string; d: string }[] = [
  { name: 'Kling 3', credits: `${KLING3_60_CREDITS} credits / 60s`, d: 'Native audio, the strongest dialogue scenes, cinematic look. The premium option when the film is the product.' },
  { name: 'MiniMax H3', credits: `${H3_60_CREDITS} credits / 60s`, d: 'Same directed dialogue-plus-narration structure at roughly a third of the cost. The everyday choice for a channel posting daily.' },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'Can AI make a video where the character actually talks?', a: 'Yes. On Kling 3 and MiniMax H3, Kineo renders dialogue scenes where a character on screen speaks a specific line with lip sync, and narrated scenes where a voiceover carries the story. Both come from the same script, in one finished video.' },
  { q: 'Is this an avatar or talking-head generator?', a: 'No. Avatar tools put one presenter in front of a static background for the whole video. Here the talking character is one type of scene inside a film that also has cinematic b-roll, narration, captions and music — the character appears when the story needs a face, not for 60 straight seconds.' },
  { q: 'Do I need to record or clone a voice?', a: 'No. The character speaks with a voice generated at render time, and the narrator uses a voice matched to the subject of your script. Nothing to record, nothing to upload, no voice cloning step.' },
  { q: 'Will the character say exactly what I wrote?', a: 'If you choose "Use my script as is", yes — the spoken lines come from your text, split into scenes in code rather than rewritten by a model. If you prefer, the AI can structure a one-line idea into a full script first.' },
  { q: 'Which engine should I use for talking characters?', a: 'MiniMax H3 at 45 credits is the everyday choice and covers dialogue plus narration. Kling 3 at 150 credits gives the strongest dialogue scenes and the most cinematic look. Every video is labelled with the engine that actually rendered it.' },
  { q: 'How much does it cost?', a: `A 60-second MiniMax H3 film costs ${H3_60_CREDITS} credits; Kling 3 costs ${KLING3_60_CREDITS}. A new account receives ${TRIAL_GRANT_CREDITS_COPY} trial credits, which does not cover a full 60-second H3 film by itself. Paid plans start at ${STARTER_MONTH}, and the Studio shows the exact engine cost before submission.` },
]

export default function TalkingCharactersPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to make an AI video with talking characters and a narrator',
    description: 'Turn one script into a film that alternates lip-synced dialogue scenes with documentary narration.',
    totalTime: 'PT20M',
    step: HOW.map((s) => ({
      '@type': 'HowToStep',
      position: Number(s.n),
      name: s.t,
      text: s.d,
      url: `${BASE}/ai-video-with-talking-characters#step-${s.n}`,
    })),
  }
  const h2: CSSProperties = { fontSize: 'clamp(1.3rem, 3.5vw, 1.7rem)', fontWeight: 800, margin: '44px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#86868b', lineHeight: 1.65, margin: '0 0 12px' }
  const card: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          Talking Characters
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', fontWeight: 900, lineHeight: 1.12, margin: '18px 0 0' }}>
          AI Video Where the Character Actually Speaks
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#86868b', lineHeight: 1.6, margin: '16px 0 0' }}>
          Most AI video tools hand you stock footage under one synthetic voice. Kineo directs a film: some scenes are
          <strong style={{ color: '#f5f5f7' }}> dialogue — a character on screen delivering your line with lip sync</strong> — and the
          rest are narrated by a documentary voice matched to your subject. One script in, one finished 9:16 MP4 out.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '26px 0 0' }}>
          <OrganicCtaLink href={TALKING_CHARACTERS_SIGNUP_HREF} source={INTENT_CAMPAIGN} placement="hero" style={{ background: '#f5f5f7', color: '#000', fontWeight: 800, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}>Open MiniMax H3 →</OrganicCtaLink>
          <Link href="/pricing" style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 700, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}>See pricing</Link>
        </div>
        <p style={{ fontSize: 13, color: '#2997ff', fontWeight: 700, margin: '12px 0 0' }}>
          Works on Kling 3 and MiniMax H3 · No avatar to pick · No voice cloning
        </p>
        <p style={{ fontSize: 12.5, color: '#86868b', lineHeight: 1.55, margin: '8px 0 0', maxWidth: 650 }}>
          Your {TRIAL_GRANT_CREDITS_COPY} trial credits apply to your account. A 60-second MiniMax H3 film costs {H3_60_CREDITS} credits, so this specific engine needs additional balance; the Studio shows the selected engine and cost before you submit.
        </p>

        <h2 style={h2}>How a talking-character film is built</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {HOW.map((s) => (
            <div id={`step-${s.n}`} key={s.n} style={{ ...card, display: 'flex', gap: 14, scrollMarginTop: 24 }}>
              <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.18)', color: '#2997ff', fontWeight: 800, display: 'grid', placeItems: 'center' }}>{s.n}</span>
              <div>
                <h3 style={{ margin: '2px 0 6px', fontSize: '1.02rem', fontWeight: 800 }}>{s.t}</h3>
                <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Why alternate dialogue with narration</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {WHY.map((w) => (
            <div key={w.t} style={card}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800 }}>{w.t}</h3>
              <p style={{ ...p, margin: 0, fontSize: '0.94rem' }}>{w.d}</p>
            </div>
          ))}
        </div>

        <h2 style={h2}>The two engines that speak</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {ENGINES.map((e) => (
            <div key={e.name} style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>{e.name}</h3>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2997ff' }}>{e.credits}</span>
              </div>
              <p style={{ ...p, margin: '6px 0 0', fontSize: '0.95rem' }}>{e.d}</p>
            </div>
          ))}
        </div>
        <p style={{ ...p, fontSize: 13, marginTop: 12 }}>
          Every finished video is labelled with the engine that rendered it — the badge is never decorative.{' '}
          <Link href="/ai-video-generator" style={{ color: '#2997ff' }}>Compare all six engines</Link>.
        </p>

        <h2 style={h2}>Questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((f) => (
            <div key={f.q} style={card}>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.98rem', fontWeight: 800 }}>{f.q}</h3>
              <p style={{ ...p, margin: 0, fontSize: '0.94rem' }}>{f.a}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44, padding: 24, background: '#101012', border: '1px solid #2a2a2d', borderRadius: 18, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(1.25rem, 4vw, 1.6rem)', fontWeight: 900 }}>
            Write one script. Get a film that talks back.
          </h2>
          <p style={{ ...p, margin: '0 auto 18px', maxWidth: 520 }}>
            The Studio opens with MiniMax H3 selected and shows the cost before submission. Your {TRIAL_GRANT_CREDITS_COPY} trial credits apply; a 60-second H3 film costs {H3_60_CREDITS}. Paid plans start at {STARTER_MONTH}.
          </p>
          <OrganicCtaLink href={TALKING_CHARACTERS_SIGNUP_HREF} source={INTENT_CAMPAIGN} placement="footer" style={{ background: '#2997ff', color: '#fff', fontWeight: 800, padding: '14px 28px', borderRadius: 980, textDecoration: 'none', display: 'inline-block' }}>
            Open MiniMax H3 →
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
