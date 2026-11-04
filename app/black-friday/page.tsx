// KINEO-BLACK-FRIDAY-2026 — /black-friday: qualquer plano anual pelo preço de boas-vindas, de 24/11 a 01/12 (America/New_York).
// KINEO-OFERTA-3H-0411 — sem o cupom de 40%: o checkout cobra ANNUAL_WELCOME_PRICES e a renovação fica nesse preço.
// Renderizada a cada pedido (force-dynamic): o estado (antes / no ar / acabou) é o relógio do SERVIDOR, o mesmo que o
// checkout usa para cobrar o preço. Todo preço sai de lib/checkoutPricing (getAnnualPrice / ANNUAL_WELCOME_PRICES / TIER_PRICES / TIER_CREDITS)
// via bf2026PriceRows; a garantia é a frase única ANNUAL_REFUND_POLICY (Termos §4). Nenhum número de preço digitado aqui.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import BlackFridayCountdown from '@/components/BlackFridayCountdown'
import { ANNUAL_REFUND_POLICY } from '@/lib/checkoutPricing'
import { CHECKOUT_CURRENCY_DISCLOSURE } from '@/lib/marketingPrice'
import {
  BF2026_ENDS_AT,
  BF2026_PAGE_PATH,
  BF2026_PERCENT_OFF,
  BF2026_STARTS_AT,
  bf2026CheckoutHref,
  bf2026PriceRows,
  bf2026State,
  bf2026Usd,
} from '@/lib/billing/blackFriday2026'

export const dynamic = 'force-dynamic'

const TITLE = `Black Friday: ${BF2026_PERCENT_OFF}% Off Annual Plans | Kineo`
const DESCRIPTION = `Black Friday at Kineo: ${BF2026_PERCENT_OFF}% off any annual plan, Nov 24 to Dec 1, 2026 (New York time). One payment for the year, credits every month.`

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `https://www.usekineo.com${BF2026_PAGE_PATH}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://www.usekineo.com${BF2026_PAGE_PATH}` },
}

const card: React.CSSProperties = { padding: 22, border: '1px solid var(--border)', borderRadius: 18, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }
const cta: React.CSSProperties = { marginTop: 14, display: 'block', textAlign: 'center', background: 'var(--indigo, #2997ff)', color: 'var(--on-accent, #04122E)', borderRadius: 12, padding: '13px 18px', fontWeight: 800, textDecoration: 'none' }

export default function BlackFridayPage() {
  const nowMs = Date.now()
  const state = bf2026State(nowMs)
  const rows = bf2026PriceRows()
  const faqs: Array<{ q: string; a: string }> = [
    { q: 'How am I billed?', a: `One payment covers 12 months, at ${BF2026_PERCENT_OFF}% off 12 monthly payments. The plan renews at the same price each year, unless you cancel before then from Account → Manage billing.` },
    { q: 'Do I get all the credits at once?', a: 'No. Like every Kineo annual plan, your credits refill every month for the 12 months. Unused credits do not roll over to the next month.' },
    { q: 'Can I get a refund?', a: ANNUAL_REFUND_POLICY },
    { q: 'Is there a discount on monthly plans?', a: 'No. The Black Friday offer is for annual plans only; monthly plans keep their regular price.' },
    { q: 'I already have a Kineo plan. Can I use it?', a: 'This offer is for starting a new annual plan. If you already subscribe, checkout will point you to the plan switch on the pricing page, and the Black Friday price does not apply to plan switches.' },
    { q: 'Which currency will I pay in?', a: CHECKOUT_CURRENCY_DISCLOSURE },
  ]
  return (
    <>
      <main data-kineo="bf2026-page" data-bf-state={state} style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 20px 80px', color: 'var(--text)', overflowWrap: 'anywhere' }}>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Kineo</Link> · Black Friday 2026
        </p>
        {state === 'after' ? (
          <>
            <h1 style={{ fontSize: 'clamp(36px, 7vw, 64px)', lineHeight: 1.05, letterSpacing: '-.04em', margin: '18px 0' }}>Black Friday has ended</h1>
            <p style={{ maxWidth: 640, fontSize: 19, lineHeight: 1.5, color: 'var(--muted2)' }}>The {BF2026_PERCENT_OFF}% annual offer ran from Nov 24 to Dec 1, 2026. Our regular monthly and annual plans are on the pricing page.</p>
            <Link href="/pricing" style={{ ...cta, display: 'inline-block', marginTop: 24 }}>See plans</Link>
          </>
        ) : (
          <>
            {state === 'before' ? (
              <p style={{ display: 'inline-block', marginTop: 18, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--indigo, #2997ff)', color: 'var(--indigo, #2997ff)', fontSize: 13, fontWeight: 800 }}>Starts Nov 24, 12:00 AM ET</p>
            ) : (
              <p style={{ display: 'inline-block', marginTop: 18, padding: '6px 12px', borderRadius: 999, background: 'var(--indigo, #2997ff)', color: 'var(--on-accent, #04122E)', fontSize: 13, fontWeight: 800 }}>Live now · ends Dec 1, 11:59 PM ET</p>
            )}
            <h1 style={{ fontSize: 'clamp(38px, 7vw, 68px)', lineHeight: 1.04, letterSpacing: '-.04em', margin: '16px 0' }}>{BF2026_PERCENT_OFF}% off any annual plan</h1>
            <p style={{ maxWidth: 680, fontSize: 19, lineHeight: 1.5, color: 'var(--muted2)' }}>
              One payment for 12 months of Kineo, with credits every month for AI films, clips, images and voice. Black Friday is Nov 27 and Cyber Monday Nov 30; the offer runs Nov 24 to Dec 1 (New York time).
            </p>
            <BlackFridayCountdown state={state} serverNowMs={nowMs} targetIso={state === 'before' ? BF2026_STARTS_AT : BF2026_ENDS_AT} />
          </>
        )}

        <section aria-label="Annual plans" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 32 }}>
          {rows.map((r) => (
            <article key={r.tier} data-bf-tier={r.tier} style={card}>
              <h2 style={{ fontSize: 22, margin: 0 }}>{r.name}</h2>
              <p style={{ margin: 0, color: 'var(--muted2)', fontSize: 14 }}>{r.credits} credits every month · annual</p>
              {state === 'after' ? (
                <p style={{ margin: '10px 0 0', fontSize: 15 }}>Regular annual price: <b>{bf2026Usd(r.annualMinor)}</b>/year</p>
              ) : (
                <>
                  <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 14 }}><s>{bf2026Usd(r.twelveMonthlyMinor)}</s> if paid monthly</p>
                  <p style={{ margin: 0 }}><b style={{ fontSize: 34, letterSpacing: '-.02em' }}>{bf2026Usd(r.bfMinor)}</b> <span style={{ color: 'var(--muted2)', fontSize: 14 }}>a year</span></p>
                  <p style={{ margin: 0, color: 'var(--muted2)', fontSize: 13 }}>≈ {bf2026Usd(r.bfPerMonthMinor)}/month · you save {bf2026Usd(r.savedMinor)} · regular annual {bf2026Usd(r.annualMinor)}</p>
                </>
              )}
              {state === 'open' ? (
                <a href={bf2026CheckoutHref(r.tier, 'page')} style={cta} data-bf-cta={r.tier}>Get {r.name} for {bf2026Usd(r.bfMinor)}</a>
              ) : state === 'before' ? (
                <span style={{ ...cta, background: 'var(--card2)', color: 'var(--muted2)', cursor: 'default' }} aria-disabled="true">Available Nov 24</span>
              ) : null}
            </article>
          ))}
        </section>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)' }}>
          Prices in USD. Monthly plans are not included. Your plan renews at the same price each year unless you cancel.
        </p>

        <section aria-label="FAQ" style={{ marginTop: 44, maxWidth: 760 }}>
          <h2 style={{ fontSize: 26, marginBottom: 12 }}>Questions</h2>
          {faqs.map(({ q, a }) => (
            <details key={q} style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{q}</summary>
              <p style={{ margin: '8px 0 0', color: 'var(--muted2)', lineHeight: 1.55 }}>{a}</p>
            </details>
          ))}
        </section>
        <p style={{ marginTop: 32 }}><Link href="/pricing">Compare all plans →</Link></p>
      </main>
      <Footer />
    </>
  )
}
