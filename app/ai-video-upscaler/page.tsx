// KINEO-CEO-HOUR-2026-08-17 (#1 AQUISICAO) — pagina SEO "AI Video Upscaler":
// a jogada Higgsfield-Sora invertida a nosso favor. Quem gerou um video em
// QUALQUER ferramenta (InVideo, Sora, Runway...) e achou mole/borrado busca
// exatamente estes termos — e sai daqui com conta Kineo. Honesta: o Enhance
// (Topaz Proteus) existe, custa 10 creditos e roda em 1 clique no My Videos;
// para video de fora, o caminho e gerar/importar no Kineo (sem promessa de
// upload avulso que nao existe — CTA leva pro signup + Studio).
import type { Metadata } from 'next'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import Link from 'next/link'
import Footer from '@/components/Footer'

const BASE = 'https://www.usekineo.com'

export const metadata: Metadata = {
  title: 'AI Video Upscaler & Enhancer — Make AI Videos Sharper (Topaz-Powered) | Kineo',
  description:
    'AI videos looking soft or blurry? Kineo Enhance runs professional Topaz film restoration on your generated videos: compression cleanup, detail recovery and fine film grain — one click, HD out.',
  alternates: { canonical: `${BASE}/ai-video-upscaler` },
  openGraph: {
    title: 'AI Video Upscaler — one-click HD film polish',
    description:
      'Topaz-powered enhancement for AI-generated videos: sharper detail, no compression artifacts, cinematic grain.',
    url: `${BASE}/ai-video-upscaler`,
  },
}

const FAQS = [
  {
    q: 'Why do AI-generated videos look blurry or soft?',
    a: 'Most AI video engines render at heavy compression, and every re-encode (captions, voiceover, editing) costs sharpness. The result reads as "digital" instead of "filmed". Professional studios fix this with an enhancement pass — detail recovery, compression-artifact removal and fine film grain — which is exactly what Kineo Enhance runs.',
  },
  {
    q: 'How does Kineo Enhance work?',
    a: 'One click on any video in My Videos. Your film is processed with Topaz Proteus — the same restoration technology Hollywood uses to remaster footage — recovering detail, removing compression artifacts and adding subtle film grain. It costs 10 credits and takes a few minutes; the Studio plan includes 2 free enhances every month.',
  },
  {
    q: 'Can I enhance a video I made in another tool?',
    a: 'The fastest path is to remake it in Kineo — type the same idea, pick a cinematic engine (Seedance, Kling, Veo), and the film comes out finished with voice, karaoke captions and score. Then one click of Enhance gives it the HD film polish. New accounts get 80 free credits, every engine unlocked.',
  },
  {
    q: 'How much does it cost?',
    a: 'Enhance is 10 credits per video (about $1.50 on the Creator plan). Generating a full film starts at 20 credits with Seedance. Every new account gets 80 free credits on signup.',
  },
]

export default function AiVideoUpscalerPage() {
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
          Kineo Enhance
        </p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 14 }}>
          AI video looking soft? Give it the HD film polish.
        </h1>
        <p style={{ color: '#a1a1a8', fontSize: 16, lineHeight: 1.6, maxWidth: 640, marginBottom: 26 }}>
          Kineo Enhance runs professional <b style={{ color: '#f5f5f7' }}>Topaz film restoration</b> on your generated
          videos: compression artifacts removed, fine detail recovered, subtle cinematic grain added. One click in{' '}
          <b style={{ color: '#f5f5f7' }}>My Videos</b> — a few minutes later your film plays in crisp HD.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <Link
            href="/signup?utm_source=upscaler"
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
            ['🔍 Detail recovery', 'Hair, water, texture — the fine detail your engine generated but compression smeared.'],
            ['🧹 Artifact cleanup', 'The "cheap digital blur" of heavy compression, removed frame by frame.'],
            ['🎞 Film grain', 'A fine grain layer that reads as expensive cinema camera, not AI render.'],
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
          Related: <Link href="/studio" style={{ color: '#2997ff' }}>Studio</Link> ·{' '}
          <Link href="/images" style={{ color: '#2997ff' }}>AI Images</Link> ·{' '}
          <Link href="/audio" style={{ color: '#2997ff' }}>Text to Speech</Link> ·{' '}
          <Link href="/pricing" style={{ color: '#2997ff' }}>Pricing</Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}
