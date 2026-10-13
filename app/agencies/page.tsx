// KINEO-AGENCIAS-2026-10-13 — /agencies: o PROGRAMA DE AGÊNCIAS (fundador 13/10/2026, "tudo sim").
//
// Para quem: agência de social media / tráfego / pequenas empresas. A oferta: revender o plano Business — o cliente da
// agência assina pelo link de parceiro dela, a equipe da agência faz os anúncios nas vagas de equipe do cliente, e a
// agência ganha 30% recorrente em cada cobrança do Business (lib/affiliateCommission.ts, só partner_type = 'agency').
//
// REGRAS DESTA PÁGINA:
//   · Todo número vem de lib/growth/agencyProgram.ts (que lê businessPlan / affiliateCommission / v2Styles). Nada digitado;
//     o guardião scripts/test-agencias-1310.mjs confere.
//   · FAQ honesto com as travas reais do produto: 1 conta = membro ativo de 1 equipe só (ads_team_members_one_team), a
//     amostra grátis é UMA por conta no nível mais simples e tem teto diário global (lib/ads/sample.ts), auto-indicação
//     não paga comissão (webhook), e o 30% só começa depois que o fundador marca a agência.
//   · Os 3 anúncios são prévias REAIS feitas pelo próprio efeito / pelo ator de IA (public/ads-styles), regra da casa.
//   · Componente de SERVIDOR; o formulário é o único pedaço cliente (AgencyApplyForm). Não mexe no menu do topo nem na home.
import type { Metadata } from 'next'
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import Footer from '@/components/Footer'
import { BUSINESS_PAGE_PATH, BUSINESS_PRICE_USD_MINOR } from '@/lib/businessPlan'
import { AGENCY_BUSINESS_COMMISSION_RATE } from '@/lib/affiliateCommission'
import { ADS_V2_STYLES } from '@/lib/ads/v2Styles'
import { ADS_V2_PRESENTER_COPY, ADS_V2_PRESENTER_POSTER, ADS_V2_PRESENTER_PREVIEW, ADS_V2_PRESENTER_PUBLIC } from '@/lib/ads/v2Presenter'
import {
  AGENCIES_PAGE_PATH,
  AGENCY_OFFER,
  AGENCY_SHOWCASE_STYLE_KEYS,
  agencyMonthlyEarningLabel,
} from '@/lib/growth/agencyProgram'
import AgencyApplyForm from './AgencyApplyForm'

const O = AGENCY_OFFER
const TITLE = `Kineo for Agencies — Resell AI Product Video Ads, Earn ${O.commissionPct} Recurring`
const DESCRIPTION =
  `Agency partner program: your clients get ${O.adsPromise} on Kineo Business (${O.priceLabel}/month), your team makes the ads ` +
  `with ${O.seats} seats, and you earn ${O.commissionPct} of every Business payment while the client stays subscribed.`
const URL = `https://www.usekineo.com${AGENCIES_PAGE_PATH}`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: AGENCIES_PAGE_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'Kineo',
    images: [{ url: 'https://www.usekineo.com/og-image.png', width: 1200, height: 630, alt: 'Kineo for agencies' }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://www.usekineo.com/og-image.png'] },
}

type Showcase = { key: string; label: string; line: string; preview: string; poster: string }
const SHOWCASE: Showcase[] = [
  ...AGENCY_SHOWCASE_STYLE_KEYS.map((k) => {
    const s = ADS_V2_STYLES.find((x) => x.key === k)!
    return { key: s.key, label: s.label, line: `${s.oneLine} Best for: ${s.bestFor}.`, preview: s.preview, poster: s.poster }
  }),
  ...(ADS_V2_PRESENTER_PUBLIC
    ? [{ key: 'presenter', label: ADS_V2_PRESENTER_COPY.en.title, line: `${ADS_V2_PRESENTER_COPY.en.line} — optional on any ad.`, preview: ADS_V2_PRESENTER_PREVIEW, poster: ADS_V2_PRESENTER_POSTER }]
    : []),
]

const STEPS = [
  { n: '1', title: 'Apply (2 minutes)', text: 'Tell us about your agency below. We read every application ourselves and reply by email.' },
  { n: '2', title: 'Demo it free', text: `Make a free sample ad from a client's product photo and show it in your pitch — before anyone pays.` },
  { n: '3', title: 'Client subscribes', text: `The client starts Kineo Business through your partner link: ${O.priceLabel}/month, ${O.monthlyCredits} credits ≈ ${O.adsPromise}.` },
  { n: '4', title: 'You run it, you earn', text: `Your team makes the ads with the client's ${O.seats} team seats. You earn ${O.commissionPct} of every Business payment, every month they stay.` },
]

const EARNINGS = [3, 5, 10].map((n) => ({ n, label: agencyMonthlyEarningLabel(n, BUSINESS_PRICE_USD_MINOR, AGENCY_BUSINESS_COMMISSION_RATE) }))

const FAQ = [
  {
    q: 'What exactly do I earn?',
    a: `${O.commissionPct} of every Business payment from a client who subscribed through your partner link, for as long as that client stays subscribed — no cap on months. Regular affiliates earn ${O.standardBusinessPct} on Business; the ${O.commissionPct} is for approved agency partners. If a client picks a creator plan instead, the standard affiliate rate of ${O.otherPlansPct} applies. ${O.payoutTerms}`,
  },
  {
    q: 'When does the agency rate start?',
    a: `After we approve your application and mark your partner account as an agency. Business payments recorded before that earn the regular ${O.standardBusinessPct}, so apply before you send clients.`,
  },
  {
    q: 'Who pays Kineo — me or my client?',
    a: `Your client. The client owns the Business account and pays Kineo directly, and invites your team as teammates. Commission is paid on referred customers only: plans bought on your own account do not earn commission. How much you charge the client for your service is up to you.`,
  },
  {
    q: 'How do the team seats work?',
    a: `Business includes ${O.seats} teammates. The client invites them by email from Studio Ads → Team; each teammate signs in with their own Kineo account and makes ads with the client's credits. Today one Kineo login can be an active teammate in one Business team at a time, so use a separate login (for example a separate work email) for each client you manage.`,
  },
  {
    q: 'What does the client get each month?',
    a: `${O.monthlyCredits} credits. A ${O.adSeconds}-second ad at the Commercial level uses enough credits for ${O.adsPerMonth} of them a month; simpler ads cost less, and the cost is always shown before creating. Each ad starts from one product photo or a product link, with ${O.styles} visual styles, voice, music and on-screen text, and an optional AI person talking about the product. Commercial use is included and credits reset monthly.`,
  },
  {
    q: 'Is the first ad really free?',
    a: 'Every free Kineo account can make one free sample ad — a 15-second ad at the simplest level, made from a product photo, with no credits charged. It is meant to show a client their own product as an ad. Free samples are limited per day across Kineo, so if the daily limit is reached, try again the next day.',
  },
  {
    q: 'Can the client cancel?',
    a: 'Yes, anytime from their account; they keep access until the end of the period they paid for. Commission stops when the payments stop, and refunded payments do not earn commission.',
  },
  {
    q: 'Do you create accounts or contact my clients?',
    a: 'No. Applying does not create any account, and we never contact your clients. You keep the client relationship.',
  },
]

const FAQ_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}).replace(/</g, '\\u003c')

const CSS = `
.kag{max-width:72rem;margin:0 auto;padding:0 20px 80px;color:var(--text)}
.kag-nav{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--border);background:var(--card)}
.kag-nav-in{max-width:72rem;margin:0 auto;height:64px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.kag-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;color:var(--text);text-decoration:none}
.kag-back{font-size:14px;font-weight:600;color:var(--muted);text-decoration:none;padding:8px 12px;border-radius:10px}
.kag-back:hover{color:var(--text);background:var(--card2)}
.kag-hero{padding:72px 0 36px;text-align:center}
.kag-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.kag-hero h1{margin:14px auto 0;max-width:17em;font-size:clamp(2rem,5vw,3.3rem);font-weight:750;line-height:1.08;letter-spacing:-.02em}
.kag-sub{margin:18px auto 0;max-width:42rem;font-size:17px;line-height:1.6;color:var(--muted2,var(--muted))}
.kag-ctas{margin:30px 0 0;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.kag-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:12px;font-size:15px;font-weight:750;text-decoration:none;border:0;cursor:pointer;font-family:inherit}
.kag-btn[disabled]{opacity:.6;cursor:wait}
.kag-primary{background:var(--accent);color:var(--on-accent,#fff)}
.kag-secondary{border:1px solid var(--border2);color:var(--text);background:var(--card)}
.kag-fine{margin:12px 0 0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.kag-facts{margin:28px auto 0;max-width:56rem;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.kag-fact{border:1px solid var(--border);background:var(--card);border-radius:16px;padding:16px;text-align:center}
.kag-fact b{display:block;font-size:26px;font-weight:800;color:var(--accent);line-height:1.1}
.kag-fact span{display:block;margin-top:6px;font-size:13px;line-height:1.4;color:var(--muted2,var(--muted))}
.kag-sec{margin:72px 0 0;scroll-margin-top:84px}
.kag-sec h2{font-size:clamp(1.5rem,3vw,2.1rem);font-weight:750;text-align:center}
.kag-sec-sub{margin:8px auto 0;max-width:38rem;text-align:center;font-size:15px;line-height:1.55;color:var(--muted)}
.kag-steps{margin:28px 0 0;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.kag-step{border:1px solid var(--border);background:var(--card);border-radius:18px;padding:20px}
.kag-step b{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:var(--accent-soft,var(--card2));color:var(--accent);font-size:13px}
.kag-step h3{margin:12px 0 0;font-size:16px;font-weight:700}
.kag-step p{margin:6px 0 0;font-size:14px;line-height:1.55;color:var(--muted2,var(--muted))}
.kag-ads{margin:28px auto 0;max-width:46rem;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.kag-ad{margin:0;border:1px solid var(--border);background:var(--card);border-radius:18px;padding:8px 8px 14px;min-width:0}
.kag-ad video{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px;background:var(--card2,var(--card))}
.kag-ad figcaption{margin:10px 4px 0}
.kag-ad figcaption b{display:block;font-size:14px;font-weight:700}
.kag-ad figcaption span{display:block;margin-top:4px;font-size:12.5px;line-height:1.45;color:var(--muted)}
.kag-earn{margin:28px auto 0;max-width:40rem;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kag-earn div{border:1px solid var(--border2);background:var(--card);border-radius:16px;padding:18px;text-align:center}
.kag-earn b{display:block;font-size:30px;font-weight:800;line-height:1.1}
.kag-earn span{display:block;margin-top:6px;font-size:13px;color:var(--muted)}
.kag-apply{margin:28px auto 0;max-width:46rem;border:1px solid var(--border2);background:var(--card);border-radius:22px;padding:26px}
.kag-form .kag-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.kag-form label{display:grid;gap:6px;font-size:13.5px;font-weight:650;color:var(--text);min-width:0}
.kag-form label em{font-style:normal;font-weight:500;color:var(--muted)}
.kag-form input,.kag-form select{width:100%;min-height:44px;padding:10px 12px;border-radius:10px;border:1px solid var(--border2);background:var(--bg,var(--card));color:var(--text);font:inherit;font-size:15px;box-sizing:border-box}
.kag-form input:focus-visible,.kag-form select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.kag-form .kag-btn{margin-top:18px;width:100%}
.kag-hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
.kag-err{margin:12px 0 0;font-size:14px;color:var(--danger,#d64545)}
.kag-done{text-align:center}
.kag-done b{font-size:18px}
.kag-done p{margin:8px 0 16px;font-size:14.5px;line-height:1.55;color:var(--muted2,var(--muted))}
.kag-faq{margin:28px auto 0;max-width:46rem;display:grid;gap:10px}
.kag-faq details{border:1px solid var(--border);background:var(--card);border-radius:14px;padding:16px 18px}
.kag-faq summary{cursor:pointer;font-weight:700;font-size:15px}
.kag-faq p{margin:10px 0 0;font-size:14px;line-height:1.6;color:var(--muted2,var(--muted))}
.kag-more{display:block;margin:22px auto 0;text-align:center;font-weight:700;color:var(--accent);text-decoration:none}
@media (max-width:900px){.kag-steps{grid-template-columns:1fr 1fr}.kag-facts{grid-template-columns:1fr 1fr}}
@media (max-width:640px){.kag-steps,.kag-form .kag-grid{grid-template-columns:1fr}.kag-ads{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kag-ad{padding:5px 5px 10px}.kag-ad figcaption span{display:none}.kag-hero{padding-top:48px}.kag-apply{padding:18px 16px}.kag-earn b{font-size:24px}}
@media (prefers-reduced-motion:reduce){.kag-ad video{animation:none}}
`

export default function AgenciesPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />
      <nav className="kag-nav" aria-label="Kineo">
        <div className="kag-nav-in">
          <Link href="/" className="kag-brand"><KineoBrandIcon size={30} />Kineo</Link>
          <Link href={BUSINESS_PAGE_PATH} className="kag-back">Kineo Business</Link>
        </div>
      </nav>
      <main className="kag" data-kineo="agencies-1310">
        <header className="kag-hero">
          <div className="kag-eyebrow">Kineo for agencies · partner program</div>
          <h1>Resell AI product video ads to your clients — earn {O.commissionPct} every month</h1>
          <p className="kag-sub">
            Your clients get {O.adsPromise} on Kineo Business. Your team makes them with {O.seats} seats, from one product photo or link.
            You earn {O.commissionPct} of every Business payment, for as long as the client stays.
          </p>
          <div className="kag-ctas">
            <a className="kag-btn kag-primary" href="#apply">Apply as an agency partner</a>
            <a className="kag-btn kag-secondary" href="#ads">See ads it makes</a>
          </div>
          <p className="kag-fine">Business: {O.priceLabel}/month · {O.monthlyCredits} credits · first ad free to demo · client can cancel anytime</p>
        </header>

        <div className="kag-facts" data-testid="agency-facts">
          <div className="kag-fact"><b>{O.commissionPct}</b><span>recurring on every Business payment</span></div>
          <div className="kag-fact"><b>{O.adsPerMonth}</b><span>ads of {O.adSeconds} s per client, per month</span></div>
          <div className="kag-fact"><b>{O.seats}</b><span>team seats to run the account</span></div>
          <div className="kag-fact"><b>1st</b><span>ad free, to show the client first</span></div>
        </div>

        <section id="how" className="kag-sec" aria-labelledby="kag-how-title">
          <h2 id="kag-how-title">How it works</h2>
          <div className="kag-steps">
            {STEPS.map((s) => (
              <div className="kag-step" key={s.n}>
                <b>{s.n}</b>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="ads" className="kag-sec" aria-labelledby="kag-ads-title">
          <h2 id="kag-ads-title">Ads your clients get</h2>
          <p className="kag-sec-sub">Made by Kineo from a single product photo. {O.styles} styles to choose from, plus an optional AI person who talks about the product.</p>
          <div className="kag-ads" data-testid="agency-showcase">
            {SHOWCASE.map((a) => (
              <figure className="kag-ad" key={a.key}>
                <video src={a.preview} poster={a.poster} muted loop playsInline autoPlay preload="metadata" aria-label={`${a.label} — example ad`} />
                <figcaption><b>{a.label}</b><span>{a.line}</span></figcaption>
              </figure>
            ))}
          </div>
          <a className="kag-more" href={`${BUSINESS_PAGE_PATH}#styles`}>See all {O.styles} styles on Kineo Business →</a>
        </section>

        <section id="earnings" className="kag-sec" aria-labelledby="kag-earn-title">
          <h2 id="kag-earn-title">What {O.commissionPct} recurring looks like</h2>
          <p className="kag-sec-sub">Your monthly commission with clients on Business at {O.priceLabel}/month, before any fee you charge for your own service.</p>
          <div className="kag-earn">
            {EARNINGS.map((e) => (
              <div key={e.n}><b>{e.label}</b><span>/month with {e.n} clients</span></div>
            ))}
          </div>
        </section>

        <section id="apply" className="kag-sec" aria-labelledby="kag-apply-title">
          <h2 id="kag-apply-title">Apply as an agency partner</h2>
          <p className="kag-sec-sub">Five fields. We reply by email — no account is created and nothing is charged.</p>
          <div className="kag-apply"><AgencyApplyForm /></div>
        </section>

        <section id="faq" className="kag-sec" aria-labelledby="kag-faq-title">
          <h2 id="kag-faq-title">Questions</h2>
          <div className="kag-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <a className="kag-more" href="/partners">Not an agency? See the creator affiliate program →</a>
        </section>
      </main>
      <Footer showStats={false} />
    </>
  )
}
