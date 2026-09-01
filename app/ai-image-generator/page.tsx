// KINEO-SEO-2026-08-18 (pedido do fundador: "mexer no SEO pra vir mais gente
// qualificada do Google e do ChatGPT") — página pública de captura para
// 'ai image generator' no MESMO padrão comprovado do /ai-video-upscaler
// (KINEO-CEO-HOUR #1): honesta (motores e créditos reais das rotas que
// cobram), FAQ com JSON-LD (rich results + answer engines), CTA → signup.
import type { Metadata } from 'next'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { buildProductSurfaceSignupHref } from '@/lib/growth/productSurfaceIntent'
// KINEO-PRICING-V6-2026-08-19 — preço E grant derivados de TIER_PRICES/
// TIER_CREDITS. Esta linha errava os DOIS ($9.90 e 60 créditos) porque foram
// digitados juntos: quando a escada desceu para $7/40, nada aqui apontava
// para a tabela que cobra, então a página seguiu vendendo o plano antigo.
import { STARTER_MONTH, STARTER_CREDITS } from '@/lib/marketingPrice'

const BASE = 'https://www.usekineo.com'
const IMAGE_SIGNUP_HREF = buildProductSurfaceSignupHref({
  surface: 'images',
  campaign: 'seo_image_studio',
  utmSource: 'img_seo',
})

export const metadata: Metadata = {
  title: 'AI Image Generator — 6 Engines, One Studio (FLUX, Seedream, Grok, Recraft) | Kineo',
  description:
    `Generate images with six AI engines in one place: FLUX Schnell & Dev, Seedream, Grok, Recraft and Nano Banana Pro. Edit with instructions, upscale to HD. ${TRIAL_GRANT_CREDITS_COPY} free credits on signup, no card.`,
  alternates: { canonical: `${BASE}/ai-image-generator` },
  openGraph: {
    title: 'AI Image Generator — six engines, one studio',
    description:
      'FLUX, Seedream, Grok, Recraft and Nano Banana Pro side by side. Instruction-based editing and HD upscale included.',
    url: `${BASE}/ai-image-generator`,
  },
}

const FAQS = [
  {
    q: 'Which AI image engines does Kineo include?',
    a: 'Six, side by side in one studio: FLUX Schnell (fastest, 1 credit per image), FLUX Dev (2 credits), Seedream (3), Grok (3), Recraft (4, strongest for design and vector-style art) and Nano Banana Pro (5, the photorealism flagship). You pick the engine per generation — no separate subscriptions.',
  },
  {
    q: 'Can I edit an image after generating it?',
    a: 'Yes — instruction-based editing (powered by FLUX Kontext) lets you type what to change ("make the sky stormy", "remove the text") for 3 credits, and an ESRGAN upscale to high resolution costs 1 credit. Every image you generate is saved to your library automatically.',
  },
  {
    q: 'How much does it cost?',
    a: `Images cost 1–5 credits depending on the engine. Every new account gets ${TRIAL_GRANT_CREDITS_COPY} free credits — enough to try every engine. Paid plans start at ` + STARTER_MONTH + ' for ' + STARTER_CREDITS + ' credits, charged in USD worldwide, and credits are shared across images, voice and video.',
  },
  {
    q: 'Can I turn my images into videos?',
    a: 'Yes — that is the point of having everything in one studio. Generate an image, then animate it or use it as a reference frame in a cinematic video engine (Seedance, Kling, Veo). One account, one credit balance, image to film in the same workflow.',
  },
]

export default function AiImageGeneratorPage() {
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
          Kineo Images
        </p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 14 }}>
          One AI image studio. Six engines to choose from.
        </h1>
        <p style={{ color: '#a1a1a8', fontSize: 16, lineHeight: 1.6, maxWidth: 640, marginBottom: 26 }}>
          Stop juggling subscriptions. Kineo puts <b style={{ color: '#f5f5f7' }}>FLUX Schnell, FLUX Dev, Seedream, Grok,
          Recraft and Nano Banana Pro</b> in one studio — generate from 1 credit per image, edit with plain-English
          instructions, upscale to HD, and reuse any image inside a cinematic AI video.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <Link
            href={IMAGE_SIGNUP_HREF}
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
            ['⚡ Six engines, one picker', 'FLUX for speed, Nano Banana Pro for photorealism, Recraft for design — pick per image, from 1 credit.'],
            ['✏️ Edit by instruction', 'Type what to change — "remove the text", "golden hour light" — and the edit engine does it. 3 credits.'],
            ['🎬 Image → film', 'Any image becomes a reference frame for the video engines. One studio, one credit balance.'],
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
          Related: <Link href="/ai-voice-generator" style={{ color: '#2997ff' }}>AI Voices</Link> ·{' '}
          <Link href="/ai-video-upscaler" style={{ color: '#2997ff' }}>Video Upscaler</Link> ·{' '}
          <Link href="/examples" style={{ color: '#2997ff' }}>Examples</Link> ·{' '}
          <Link href="/pricing" style={{ color: '#2997ff' }}>Pricing</Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}
