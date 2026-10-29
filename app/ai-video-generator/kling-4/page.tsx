import type { Metadata } from 'next'
import Link from 'next/link'
import Kling4PaidEnginePage from '@/components/Kling4PaidEnginePage'
import Footer from '@/components/Footer'
import { KLING4_PAID_LIVE, KLING4_PROMO_SIGNUP_CUTOFF, kling4PromoPolicy, kling4PromoPolicyReason } from '@/lib/kling4PaidPolicy'
import { KLING4_PAID_CREDITS } from '@/lib/kling4PaidPricing'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { GRANT_COUNTRY_CLAUSE, TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { CARD_ENTRY_ONLY } from '@/lib/entryPolicy'
import { TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { buildEngineLandingSignupHref } from '@/lib/growth/engineLandingIntent'

// KINEO-VENDER-3-2910 — a página do Kling 4.0 é a que o ChatGPT e o Google leem. Medido 29/10: o HTML do servidor dizia
// "Kling 4.0 is currently unavailable. You can choose Kling 3" (a disponibilidade só chegava no navegador), e os
// cadastros vindos de páginas de motor citadas pelo ChatGPT caíram de 34/semana (21/09) para 2. Tudo o que um robô lê
// aqui sai dos interruptores do servidor — nenhum número digitado.
const freeFilmIsKling4 = FREE_FILM_ENGINE_NAME === 'Kling 4.0'
const promoOn = KLING4_PAID_LIVE && kling4PromoPolicyReason(kling4PromoPolicy()) === 'ok'
const promoUntil = new Date(Date.parse(KLING4_PROMO_SIGNUP_CUTOFF) - 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const starterPrice = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
const noCard = CARD_ENTRY_ONLY ? '' : ', no credit card'

const title = freeFilmIsKling4 ? 'Kling 4.0 free — your first AI film, no waitlist | Kineo' : 'Try Kling 4.0 — AI films and ads | Kineo'
const description = freeFilmIsKling4
  ? `Make your first ${TRIAL_FREE_FILM_SECONDS}-second Kling 4.0 film free${GRANT_COUNTRY_CLAUSE}${noCard}. Kineo directs the scenes and adds narration, captions and music.`
  : 'Create Kling 4.0 films and ads in Kineo with your narration, captions and music.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.usekineo.com/ai-video-generator/kling-4' },
  openGraph: { title, description, url: 'https://www.usekineo.com/ai-video-generator/kling-4', type: 'website' },
}

const credits = (s: 15 | 30 | 60) => KLING4_PAID_CREDITS[s]
const faq: Array<{ q: string; a: string }> = [
  {
    q: 'Is Kling 4.0 free?',
    a: (freeFilmIsKling4
      ? `On Kineo, new accounts${GRANT_COUNTRY_CLAUSE} get their first ${TRIAL_FREE_FILM_SECONDS}-second film made with Kling 4.0 for free${noCard}. If the day's free Kling 4.0 capacity is used up, the free film is made with Seedance 1.5 instead. `
      : '') +
      `After that, a Kling 4.0 film costs ${credits(15)} credits (15 s), ${credits(30)} (30 s) or ${credits(60)} (60 s).` +
      (promoOn ? ` Subscribe to any plan by ${promoUntil} and Kling 4.0 is free for 30 days — up to 3 films or ads a day, up to 60 seconds each, with no credits used.` : ''),
  },
  {
    q: 'How much does Kling 4.0 cost on Kineo?',
    a: `${credits(15)} credits for a 15-second film, ${credits(30)} for 30 seconds and ${credits(60)} for 60 seconds. Plans start at ${starterPrice}/month` +
      (promoOn ? `, and every plan includes Kling 4.0 free for 30 days (up to 3 films a day) when you subscribe by ${promoUntil}.` : '.'),
  },
  {
    q: 'What does Kineo add on top of Kling 4.0?',
    a: 'Kling 4.0 makes the shots. Kineo writes and directs the scenes from your idea or script, adds narration, captions and music, and delivers a finished vertical film you can post — not loose clips to edit.',
  },
  {
    q: 'What are the current limits?',
    a: 'Kling 4.0 on Kineo makes vertical 9:16 films of 15, 30 or 60 seconds, without face reference photos.',
  },
]

export default function Kling4Page() {
  const href = buildEngineLandingSignupHref({ engine: 'hollywood', campaign: 'seo_engine_kling4' })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return <>
    <Kling4PaidEnginePage serverPaidLive={KLING4_PAID_LIVE} freeFilmIsKling4={freeFilmIsKling4} freeLine={freeFilmIsKling4 ? `Your first ${TRIAL_FREE_FILM_SECONDS}-second Kling 4.0 film is free${GRANT_COUNTRY_CLAUSE} — no waitlist${noCard}.` : null} />
    <section aria-labelledby="kling4-faq" style={{ maxWidth: 900, margin: '0 auto', padding: '0 22px 72px', color: 'var(--text)', overflowWrap: 'anywhere' }}>
      <h2 id="kling4-faq" style={{ fontSize: 28, letterSpacing: '-.02em', margin: '0 0 18px' }}>Kling 4.0 questions</h2>
      {faq.map(({ q, a }) => <div key={q} style={{ padding: '16px 0', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 17, margin: '0 0 6px' }}>{q}</h3>
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--muted2)' }}>{a}</p>
      </div>)}
      <p style={{ marginTop: 24 }}><Link href={href} style={{ fontWeight: 700 }}>{freeFilmIsKling4 ? 'Make your free Kling 4.0 film →' : 'Try Kling 4.0 →'}</Link></p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
    <Footer />
  </>
}
