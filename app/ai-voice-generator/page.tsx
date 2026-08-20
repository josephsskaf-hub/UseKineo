// KINEO-SEO-2026-08-18 — captura de 'ai voice generator / text to speech' no
// mesmo padrão do /ai-image-generator (irmãos da mesma rodada de SEO).
// Números conferidos contra app/api/audio/generate/route.ts (a rota que cobra).
import type { Metadata } from 'next'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import Link from 'next/link'
import Footer from '@/components/Footer'

const BASE = 'https://www.usekineo.com'

export const metadata: Metadata = {
  title: 'AI Voice Generator — Text to Speech with 4 Engines (MiniMax, ElevenLabs) | Kineo',
  description:
    'Turn text into natural speech with four AI voice engines: MiniMax Speech HD, ElevenLabs v3, Dia and Kokoro. From 1 credit per 1,000 characters. Use any voice in your videos. 80 free credits on signup.',
  alternates: { canonical: `${BASE}/ai-voice-generator` },
  openGraph: {
    title: 'AI Voice Generator — four TTS engines, one studio',
    description:
      'MiniMax Speech HD, ElevenLabs v3, Dia and Kokoro side by side — and every voice plugs straight into your AI videos.',
    url: `${BASE}/ai-voice-generator`,
  },
}

const FAQS = [
  {
    q: 'Which text-to-speech engines does Kineo include?',
    a: 'Four, side by side: MiniMax Speech HD and ElevenLabs v3 (the premium documentary-grade voices, 2 credits per 1,000 characters) plus Dia and Kokoro (fast, natural and half the price at 1 credit per 1,000 characters). You hear them in the same studio and pick per generation.',
  },
  {
    q: 'How much does AI voiceover cost?',
    a: 'From 1 credit per 1,000 characters — a typical 60-second narration (~1,000 characters) costs 1–2 credits. Every new account gets 80 free credits on signup. Credits are shared with image and video generation on the same balance.',
  },
  {
    q: 'Can I use the voices in my videos?',
    a: 'Yes — that is the whole point. Every audio you generate has a "Use in Studio" button that drops it into the video pipeline, and Kineo\'s video engines already narrate scripts with these same voices, synced to karaoke captions automatically.',
  },
  {
    q: 'Do I own the audio?',
    a: 'Yes. Generated audio is yours to use commercially, same as videos and images — the terms of service state ownership explicitly, and every file is stored in your library for download whenever you need it.',
  },
]

export default function AiVoiceGeneratorPage() {
  return (
    <div style={{ background: '#050506', minHeight: '100vh', color: '#f5f5f7' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '72px 20px 40px' }}>
        <p style={{ color: '#2997ff', fontWeight: 800, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>
          Kineo Voices
        </p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 14 }}>
          Text in. A voice you&apos;d actually publish, out.
        </h1>
        <p style={{ color: '#a1a1a8', fontSize: 16, lineHeight: 1.6, maxWidth: 640, marginBottom: 26 }}>
          Four AI voice engines in one studio — <b style={{ color: '#f5f5f7' }}>MiniMax Speech HD, ElevenLabs v3, Dia and
          Kokoro</b> — from 1 credit per 1,000 characters. Compare them on your own script, keep the takes in your
          library, and drop any voice straight into a Kineo video.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <Link
            href="/signup?utm_source=voice_seo"
            style={{ background: '#2997ff', color: '#fff', fontWeight: 800, padding: '13px 22px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 24px rgba(41,151,255,.35)' }}
          >
            {`Start free — ${TRIAL_GRANT_CREDITS_COPY} credits →`}
          </Link>
          <Link
            href="/login"
            style={{ border: '1px solid rgba(255,255,255,.14)', color: '#f5f5f7', fontWeight: 700, padding: '13px 22px', borderRadius: 12, textDecoration: 'none' }}
          >
            I have an account
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 44 }}>
          {[
            ['🎙 Four engines, your pick', 'Premium documentary voices (MiniMax, ElevenLabs) or fast natural reads (Dia, Kokoro) — compare on the same script.'],
            ['💸 From 1 credit / 1k chars', 'A full 60-second narration costs 1–2 credits. The 80 free credits cover dozens of takes.'],
            ['🎬 Voice → video', 'One click sends any take into the video studio — narration, karaoke captions and score sync automatically.'],
          ].map(([t, d]) => (
            <div key={t} style={{ background: '#131316', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '18px 16px' }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{t}</div>
              <div style={{ color: '#a1a1a8', fontSize: 13.5, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.01em', marginBottom: 14 }}>Common questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
          {FAQS.map((f) => (
            <details key={f.q} style={{ background: '#131316', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 16px' }}>
              <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{f.q}</summary>
              <p style={{ color: '#a1a1a8', fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{f.a}</p>
            </details>
          ))}
        </div>

        <p style={{ color: '#86868b', fontSize: 13 }}>
          Related: <Link href="/ai-image-generator" style={{ color: '#2997ff' }}>AI Images</Link> ·{' '}
          <Link href="/ai-video-upscaler" style={{ color: '#2997ff' }}>Video Upscaler</Link> ·{' '}
          <Link href="/examples" style={{ color: '#2997ff' }}>Examples</Link> ·{' '}
          <Link href="/pricing" style={{ color: '#2997ff' }}>Pricing</Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}
