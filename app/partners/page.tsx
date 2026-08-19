// #486 — Public affiliate-recruiting landing. The page every outreach links to.
// Explains the verified 40% recurring model, first-touch window and how to
// apply through the built-in affiliate dashboard. Static, in sitemap for SEO.
//
// PUSH #101 — COPY DRIFT KILLED. This page used to promise a human review step
// ("Application is reviewed before a link becomes active"). That stopped being
// true when app/api/affiliate/apply/route.ts:110 started inserting new
// affiliates with `status: 'active'` instead of 'pending'. Every claim below is
// now traceable to code:
//   40% commission      → app/api/affiliate/apply/route.ts:111 (commission_rate: 0.4)
//                         read back by app/api/stripe/webhook/route.ts:72-77
//   90-day first touch  → app/a/[code]/route.ts:13 (COOKIE_MAX_AGE) + :58-68
//                         (cookie is only set when absent = first touch wins)
//   link live instantly → app/api/affiliate/apply/route.ts:110 ('active') is
//                         exactly the status app/a/[code]/route.ts:38 requires
//                         before it logs a click and sets the cookie
//   $7–$29/mo           → lib/checkoutPricing.ts (TIER_PRICES), importado aqui.
//                         KINEO-PRICING-V6-2026-08-19: este range estava
//                         DIGITADO como "$9.90–$37.90" e a tabela de ilustração
//                         logo abaixo tinha sido calculada à mão em cima dele.
//                         Uma página que promete comissão sobre preço de lista
//                         não pode ter o preço de lista como texto solto — ela
//                         vira uma promessa de dinheiro errada no dia do
//                         reprice, para um público (afiliados) que checa conta.
//                         Agora o range E a tabela derivam de TIER_PRICES.
//   commissions pending → app/api/stripe/webhook/route.ts:99 inserts
//                         `status: 'pending'` unconditionally; nothing in that
//                         file ever writes 'approved'. Payout review is a
//                         SEPARATE gate from affiliate activation.
// If the insert status is ever reverted to 'pending', the "live the moment you
// apply" copy on this page becomes false again and must be reverted with it.
import type { Metadata } from 'next'
import { TIER_PRICES } from '@/lib/checkoutPricing'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import Footer from '@/components/Footer'

// KINEO-PRICING-V6-2026-08-19 — a ilustração de ganhos é CALCULADA, não
// digitada. 40% é a taxa que app/api/affiliate/apply/route.ts grava
// (commission_rate: 0.4); o piso e o teto são o plano mais barato e o mais caro
// da escada de assinatura (Autopilot fica de fora de propósito: $299/mês num
// exemplo de afiliado infla a promessa com um produto que quase ninguém compra).
const COMMISSION_RATE = 0.4
const CHEAPEST_PLAN_USD = TIER_PRICES.starter.usd / 100
const PRICIEST_PLAN_USD = TIER_PRICES.pro.usd / 100

/** "~$28–$116 / mo" para N clientes indicados, a 40% recorrente. */
function monthlyRange(customers: number): string {
  const money = (usd: number) => '$' + Math.round(customers * COMMISSION_RATE * usd).toLocaleString('en-US')
  return `~${money(CHEAPEST_PLAN_USD)}–${money(PRICIEST_PLAN_USD)} / mo`
}

const PRICE_RANGE = `$${CHEAPEST_PLAN_USD}–$${PRICIEST_PLAN_USD}/month`

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'AI Video Affiliate Program - Earn 40% Recurring | Kineo',
  description:
    'Promote Kineo and earn 40% on recurring payments from referred subscribers. First-touch tracking lasts 90 days and your link goes live the moment you apply.',
  alternates: { canonical: 'https://www.usekineo.com/partners' },
  openGraph: {
    title: 'AI Video Affiliate Program - Earn 40% Recurring | Kineo',
    description: 'Send creators a topic-to-Short workflow and earn 40% on recurring payments while they remain subscribed.',
    url: 'https://www.usekineo.com/partners',
    type: 'website',
  },
}

const CARD = { background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }
// PUSH #101 — was '/signup?redirect=%2Faffiliate&...'. Pointing straight at
// /signup was a wrong door for anyone who already has a Kineo account, and the
// dashboard is public (app/(dashboard)/layout.tsx:32 "No redirect — dashboard
// is public"), so /affiliate serves BOTH cases correctly on its own:
// signed in  → the Apply button (zero fields, link live on click)
// signed out → its "Sign in before applying" card, which offers signup AND
//              login (app/(dashboard)/affiliate/page.tsx:159-186)
// Click attribution does not depend on this query string: <OrganicCtaLink>
// fires organic_cta_clicked with source="partners" (components/OrganicCtaLink.tsx:32-38).
const APPLY = '/affiliate?utm_source=partners&utm_medium=organic&utm_campaign=push33_partner_program'
const SUPPORT = 'mailto:hello@usekineo.com?subject=Kineo%20affiliate%20program%20question'

export default function PartnersPage() {
  const faq = [
    { q: 'Do I have to be approved first?', a: 'No. There is no review queue and no waiting. The moment you submit the application your affiliate link is active — it starts logging clicks and setting the 90-day attribution cookie on the very first visitor you send.' },
    { q: 'How much do I earn?', a: 'Affiliates earn 40% of each eligible payment from customers they refer, including recurring payments while the customer remains subscribed and the affiliate account remains active. First-touch tracking lasts 90 days.' },
    { q: 'Can I test Kineo first?', a: 'Yes. The free Fast workflow requires no card and creates watermarked previews. If you need extra demo access for a specific audience or tutorial, email us and we will sort it out with you.' },
    { q: 'What do I promote?', a: 'Kineo turns one topic or script into a finished 9:16 Short with script structure, AI voice, matched visuals and captions. Paid plans unlock clean exports and recurring-show tools.' },
    { q: 'How is attribution tracked?', a: 'Your Kineo affiliate link records first-touch clicks, signups, payments and renewals in your affiliate dashboard. The first affiliate link a visitor touches wins, and that attribution holds for 90 days.' },
    { q: 'When do I get paid?', a: 'Every commission is recorded automatically the moment a referred customer pays, and lands in your dashboard as pending. Pending commissions are reviewed before they are approved for payout, which is how refunds and failed payments inside the window are filtered out. We contact you to arrange payment details once you have your first approved commission.' },
  ]
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#F1F5F9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>

        <section style={{ marginTop: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', borderRadius: 999, padding: '6px 14px' }}>Affiliate program</div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5.5vw, 2.7rem)', fontWeight: 900, lineHeight: 1.12, margin: '16px 0 0' }}>AI Video Affiliate Program: Earn 40% Recurring</h1>
          <p style={{ fontSize: '1.05rem', color: '#CBD5E1', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 600 }}>
            Send creators a tool that turns one topic into a scripted, voiced and captioned 9:16 Short — and earn <b style={{ color: '#fff' }}>40% of eligible payments</b> while referred customers stay subscribed. Most AI video tools pay affiliates 20–30%; 40% recurring is the highest rate we know of in this niche. 90-day first-touch tracking.
          </p>
          <OrganicCtaLink href={APPLY} source="partners" placement="hero" style={{ display: 'inline-block', marginTop: 22, background: 'linear-gradient(135deg,#2997ff,#2997ff)', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 14, textDecoration: 'none', fontSize: '1.05rem' }}>Apply in Kineo →</OrganicCtaLink>
          <div style={{ marginTop: 14 }}>
            <OrganicCtaLink href="/faceless-video-generator" source="partners" placement="product_demo" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
              Test the product your audience will see →
            </OrganicCtaLink>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#86868b' }}>Free to join. No review queue — your link is live the second you apply, and starts tracking your first click.</div>
        </section>

        {/* Earnings */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>What 40% recurring looks like</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { n: '10', d: 'referred customers', e: monthlyRange(10) },
              { n: '50', d: 'referred customers', e: monthlyRange(50) },
              { n: '200', d: 'referred customers', e: monthlyRange(200) },
            ].map((r) => (
              <div key={r.n} style={{ ...CARD, borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{r.n}</div>
                <div style={{ color: '#86868b', fontSize: '0.82rem', margin: '2px 0 8px' }}>{r.d}</div>
                <div style={{ color: '#2997ff', fontWeight: 800, fontSize: '0.95rem' }}>{r.e}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#64748B', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>Illustration based on 40% of current USD list prices ({PRICE_RANGE}), before taxes, refunds or failed payments. Same price worldwide — there is no discounted first month to erode the first commission.</p>
        </section>

        {/* How */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Apply in Kineo', d: 'Sign in or create your account and hit Apply. No forms, no documents, no interview.' },
              { n: '2', t: 'Get your link instantly', d: 'Your affiliate link appears on the same screen, already active. Copy it and send your first click today.' },
              { n: '3', t: 'Track recurring revenue', d: 'Make a genuine demo with the free Fast path, then follow clicks, signups and eligible commissions in your dashboard.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 14, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.12)', color: '#2997ff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#86868b', lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 18px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontWeight: 800, marginBottom: 6, fontSize: '0.95rem' }}>{f.q}</div>
                <p style={{ margin: 0, color: '#86868b', lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Start earning 40% recurring</h2>
          <p style={{ color: '#CBD5E1', margin: '8px 0 18px', fontSize: '0.95rem' }}>No payment is required to apply, and nothing sits in a review queue. You will be holding a working link about a minute from now.</p>
          <OrganicCtaLink href={APPLY} source="partners" placement="bottom" style={{ display: 'inline-block', background: '#2997ff', color: '#000', fontWeight: 900, padding: '14px 30px', borderRadius: 12, textDecoration: 'none', fontSize: '1.02rem' }}>Apply now →</OrganicCtaLink>
          <div style={{ marginTop: 12, fontSize: '0.78rem' }}><a href={SUPPORT} style={{ color: '#86868b' }}>Questions before applying? Email us.</a></div>
        </section>
      </div>
      <Footer showStats={false} />
    </main>
  )
}
