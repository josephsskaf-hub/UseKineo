import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { CARD_ENTRY_ONLY } from '@/lib/entryPolicy'
import { clipEffectByKey } from '@/lib/clips/clipEffects'
import { effectPagePath, effectSlug } from '@/lib/clips/clipEffectPages'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'

// KINEO-HALLOWEEN-PAGE-2910 — fundador 29/10 ("precisamos de mais fluxo"). 60% dos cadastros dos últimos 7 dias vieram do
// ChatGPT citando páginas que respondem a busca da semana; Halloween é 31/10. Esta página responde "free AI Halloween video"
// com o que existe de verdade hoje: os efeitos de bruxa e zumbi (prévias feitas com o próprio efeito) e o 1º filme grátis.
// Tudo derivado dos interruptores; nenhum número digitado além do que as fontes já dizem.
const BASE = 'https://www.usekineo.com'
const PATH = '/ai-halloween-video'
const noCard = CARD_ENTRY_ONLY ? '' : ', no credit card'
const title = 'Free AI Halloween Video — Turn Your Photo Into a Witch or Zombie | Kineo'
const description = `Upload one photo and become a witch or a zombie in about a minute, or make a ${TRIAL_FREE_FILM_SECONDS}-second Halloween horror short — your first film is free${GRANT_COUNTRY_CLAUSE}, made with ${FREE_FILM_ENGINE_NAME}.`

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: BASE + PATH },
  openGraph: { title, description, url: BASE + PATH, type: 'website', images: [{ url: BASE + '/posters/efeito-witch.webp', alt: 'AI witch transformation made from one photo' }] },
  twitter: { card: 'summary_large_image', title, description, images: [BASE + '/posters/efeito-witch.webp'] },
}

const EFFECT_KEYS = ['witch', 'zombie', 'dust_away', 'figurine_3d'] as const

const faq = [
  {
    q: 'Is there a free AI Halloween video generator?',
    a: `Yes. On Kineo your first ${TRIAL_FREE_FILM_SECONDS}-second film is free${GRANT_COUNTRY_CLAUSE}${noCard}, made with ${FREE_FILM_ENGINE_NAME}: type a Halloween idea ("a kid in a werewolf costume knocks on the last door…") and Kineo writes, narrates, adds captions and music. The photo effects (witch, zombie) use credits from any plan.`,
  },
  {
    q: 'How do I turn my photo into a witch or a zombie with AI?',
    a: 'Open the Witch or Zombie effect, upload a clear photo of your face (front-facing, waist up works best) and generate. You get a 5-second vertical clip in about a minute, ready for Reels, TikTok or Shorts. Your face stays recognizable in the close-up.',
  },
  {
    q: 'Can I make a short Halloween horror film with AI?',
    a: 'Yes — write one or two sentences of a spooky story and pick 15, 30 or 60 seconds. Kineo plans the scenes, renders them, narrates the story and edits a finished vertical film; no editing step.',
  },
  {
    q: 'Can I post the result on TikTok, Instagram and YouTube?',
    a: 'Yes. Clips and films are vertical 9:16 MP4 files. Free-trial films carry a small Kineo watermark; any paid plan exports clean, watermark-free files.',
  },
]

export default function HalloweenPage() {
  const filmHref = buildEngineLandingSignupHref({ engine: 'hollywood', campaign: 'seo_halloween_2910' })
  const effects = EFFECT_KEYS.map((k) => clipEffectByKey(k)).filter((e): e is NonNullable<typeof e> => !!e && !!e.preview)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return (
    <>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 20px 40px', color: 'var(--text)', overflowWrap: 'anywhere' }}>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Kineo · Halloween</p>
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 58px)', lineHeight: 1.06, letterSpacing: '-.03em', margin: '14px 0' }}>Free AI Halloween video</h1>
        <p style={{ maxWidth: 680, fontSize: 19, lineHeight: 1.5, color: 'var(--muted2)' }}>
          Turn one photo into a witch or a zombie in about a minute — or type a spooky idea and get a finished, narrated horror short.
          Your first {TRIAL_FREE_FILM_SECONDS}-second film is free{GRANT_COUNTRY_CLAUSE}{noCard}.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '22px 0 30px' }}>
          <Link href={filmHref} style={{ background: 'var(--accent, #0A5CFF)', color: '#fff', borderRadius: 12, padding: '14px 22px', fontWeight: 700, textDecoration: 'none' }}>Make a free Halloween film</Link>
          <Link href={effectPagePath('witch')} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 22px', color: 'inherit', textDecoration: 'none' }}>Try the witch effect</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {effects.map((e) => (
            <Link key={e.key} href={effectPagePath(effectSlug(e))} style={{ position: 'relative', display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', color: 'inherit', textDecoration: 'none' }}>
              <video src={`${e.preview!.video}#t=1.6`} poster={e.preview!.poster} autoPlay muted loop playsInline preload="none" aria-label={e.title} style={{ display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', maxWidth: '100%' }} />
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 12px 12px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.78))', color: '#fff', fontWeight: 700, fontSize: 14 }}>{e.title}</span>
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Previews made with each effect from an AI-generated photo.</p>
        <section aria-labelledby="halloween-faq" style={{ marginTop: 40 }}>
          <h2 id="halloween-faq" style={{ fontSize: 26, margin: '0 0 12px' }}>Halloween AI video — questions</h2>
          {faq.map(({ q, a }) => (
            <div key={q} style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 17, margin: '0 0 6px' }}>{q}</h3>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--muted2)' }}>{a}</p>
            </div>
          ))}
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
      <Footer />
    </>
  )
}
