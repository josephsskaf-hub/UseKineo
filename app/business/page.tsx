// KINEO-BUSINESS-84-2026-10-09 — /business: a página de venda do plano Business (anúncios de produto para empresas).
//
// Decisão do fundador (09/10/2026, "sim pra as 4"): Business a US$ 84/mês (15% abaixo do mercado de anúncio por IA),
// 500 créditos ≈ N anúncios de 15 s no nível Commercial, self-serve no Studio Ads, e o "feito para você" (Kineo
// Empresas: Express / Pro) continua como extra de pagamento único.
//
// REGRAS DESTA PÁGINA:
//   · Todo número vem de lib/businessPlan.ts (preço, créditos, anúncios por mês, variações) e de
//     lib/growth/dfyServiceFacts.ts (degraus Express/Pro). Nada digitado. O guardião
//     scripts/test-business-84-2026-10-09.mjs confere.
//   · Cores só pelos tokens do site (var(--text), var(--card), var(--accent)…): seguem o tema claro/escuro como o
//     /pricing. CSS por <style dangerouslySetInnerHTML>.
//   · Componente de SERVIDOR, sem estado. O menu do topo e a home NÃO mudam (congelados pelo fundador): a página tem
//     só a barra mínima do /pricing (marca + voltar).
//   · "Make your first ad free" leva ao /ads (o fluxo da amostra grátis está sendo construído em outra branch).
//   · KINEO-TROCA-BUSINESS-2026-10-10 — quem JÁ assina outro plano não compra uma 2ª assinatura nem escreve ao
//     suporte: a linha embaixo do botão leva ao bloco Business do /pricing (BUSINESS_SWITCH_HREF), onde a troca
//     self-serve mostra a diferença de preço e os créditos antes de confirmar.
import type { Metadata } from 'next'
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import {
  BUSINESS_AB_VARIATIONS,
  BUSINESS_AD_CREDITS,
  BUSINESS_AD_SECONDS,
  BUSINESS_ADS_PER_MONTH,
  BUSINESS_ADS_PROMISE,
  BUSINESS_BULLETS,
  BUSINESS_CHECKOUT_HREF,
  BUSINESS_DFY_HREF,
  BUSINESS_MONTHLY_CREDITS,
  BUSINESS_PAGE_PATH,
  BUSINESS_PRICE_LABEL,
  BUSINESS_SWITCH_HREF, // KINEO-TROCA-BUSINESS-2026-10-10
  BUSINESS_TEAM_HREF, // KINEO-EQUIPE-BUSINESS-2026-10-10
  BUSINESS_TEAM_SEATS, // KINEO-EQUIPE-BUSINESS-2026-10-10
} from '@/lib/businessPlan'
import { DFY_SERVICE_FACT } from '@/lib/growth/dfyServiceFacts'
// KINEO-ESTILOS-PRODUTO-2026-10-09 — a faixa dos estilos de produto (as prévias são feitas pelo próprio efeito).
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'
import { AdsStyleStrip } from '@/components/ads/AdsStyles'

const TITLE = 'Kineo Business — AI Product Video Ads for Companies'
const DESCRIPTION =
  `Turn one product photo or link into a ready 15-second video ad for TikTok, Reels and Shorts. ` +
  `Business: ${BUSINESS_PRICE_LABEL}/month for ${BUSINESS_ADS_PROMISE}, commercial use, cancel anytime.`
const URL = `https://www.usekineo.com${BUSINESS_PAGE_PATH}`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: BUSINESS_PAGE_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'Kineo',
    images: [{ url: 'https://www.usekineo.com/og-image.png', width: 1200, height: 630, alt: 'Kineo Business' }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://www.usekineo.com/og-image.png'] },
}

const STEPS = [
  { n: '1', title: 'Add your product', text: 'Upload a product photo or paste the link to your product page. Add your logo if you have one.' },
  { n: '2', title: 'Kineo makes the ad', text: `It writes the script, adds a voice, music and on-screen text, and edits a ${BUSINESS_AD_SECONDS}-second vertical ad.` },
  { n: '3', title: 'Test and post', text: `Check the facts, make up to ${BUSINESS_AB_VARIATIONS} variations to A/B test, download and post on TikTok, Reels or Shorts.` },
]

const FAQ = [
  {
    q: 'Who is Business for?',
    a: 'Shops, brands, restaurants, clinics, apps and agencies that need short product video ads every month and prefer to make them in minutes instead of hiring an editor.',
  },
  {
    q: 'What counts as an ad?',
    a: `Your plan includes ${BUSINESS_MONTHLY_CREDITS} credits a month. A ${BUSINESS_AD_SECONDS}-second ad at the Commercial level uses ${BUSINESS_AD_CREDITS} credits, so the plan covers ${BUSINESS_ADS_PER_MONTH} of them. Simpler or longer ads use fewer or more credits — you always see the cost before you create. Credits reset each month.`,
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Business is billed monthly and you can cancel from your account at any time; you keep access until the end of the period you paid for.',
  },
  {
    q: 'Can I use the ads commercially?',
    a: 'Yes. Ads you make on a paid plan can be used in your own organic posts and paid campaigns. Use only photos, logos and claims you have the right to use.',
  },
]

const CSS = `
.kbz{max-width:72rem;margin:0 auto;padding:0 20px 80px;color:var(--text)}
.kbz-nav{position:sticky;top:0;z-index:20;border-bottom:1px solid var(--border);background:var(--card)}
.kbz-nav-in{max-width:72rem;margin:0 auto;height:64px;padding:0 20px;display:flex;align-items:center;justify-content:space-between}
.kbz-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;color:var(--text);text-decoration:none}
.kbz-back{font-size:14px;font-weight:600;color:var(--muted);text-decoration:none;padding:8px 12px;border-radius:10px}
.kbz-back:hover{color:var(--text);background:var(--card2)}
.kbz-hero{padding:72px 0 40px;text-align:center}
.kbz-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.kbz-hero h1{margin:14px auto 0;max-width:15em;font-size:clamp(2rem,5vw,3.4rem);font-weight:750;line-height:1.08;letter-spacing:-.02em}
.kbz-sub{margin:18px auto 0;max-width:40rem;font-size:17px;line-height:1.6;color:var(--muted2,var(--muted))}
.kbz-ctas{margin:30px 0 0;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.kbz-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:12px;font-size:15px;font-weight:750;text-decoration:none}
.kbz-primary{background:var(--accent);color:var(--on-accent,#fff)}
.kbz-secondary{border:1px solid var(--border2);color:var(--text);background:var(--card)}
.kbz-fine{margin:14px 0 0;font-size:12.5px;color:var(--muted)}
.kbz-steps{margin:32px 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.kbz-step{border:1px solid var(--border);background:var(--card);border-radius:18px;padding:22px}
.kbz-step b{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:var(--accent-soft,var(--card2));color:var(--accent);font-size:13px}
.kbz-step h3{margin:12px 0 0;font-size:16px;font-weight:700}
.kbz-step p{margin:6px 0 0;font-size:14px;line-height:1.55;color:var(--muted2,var(--muted))}
.kbz-sec{margin:72px 0 0;scroll-margin-top:84px}
.kbz-sec h2{font-size:clamp(1.5rem,3vw,2.1rem);font-weight:750;text-align:center}
.kbz-sec-sub{margin:8px auto 0;max-width:36rem;text-align:center;font-size:15px;color:var(--muted)}
.kbz-plan{margin:28px auto 0;max-width:46rem;display:grid;grid-template-columns:1.1fr .9fr;gap:24px;align-items:center;border:1px solid var(--border2);background:var(--card);border-radius:22px;padding:28px}
.kbz-plan ul{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}
.kbz-plan li{display:flex;gap:10px;font-size:14px;line-height:1.45}
.kbz-plan li::before{content:"✓";font-weight:800;color:var(--accent)}
.kbz-promise{font-size:16px;font-weight:700;color:var(--accent)}
.kbz-buy{text-align:center;border:1px solid var(--border);background:var(--card2,var(--card));border-radius:18px;padding:22px}
.kbz-price{font-size:46px;font-weight:800;line-height:1}
.kbz-price small{font-size:15px;font-weight:600;color:var(--muted)}
.kbz-buy .kbz-btn{width:100%;margin-top:16px}
.kbz-dfy{margin:28px auto 0;max-width:46rem;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.kbz-dfy-card{border:1px solid var(--border);background:var(--card);border-radius:18px;padding:22px}
.kbz-dfy-card h3{font-size:17px;font-weight:750;display:flex;justify-content:space-between;gap:12px}
.kbz-dfy-card h3 span{color:var(--accent)}
.kbz-dfy-card p{margin:8px 0 0;font-size:13.5px;line-height:1.55;color:var(--muted2,var(--muted))}
.kbz-dfy-link{display:block;margin:18px auto 0;text-align:center;font-weight:700;color:var(--accent);text-decoration:none}
.kbz-styles{margin:28px 0 0;min-width:0}
.kbz-faq{margin:28px auto 0;max-width:46rem;display:grid;gap:10px}
.kbz-faq details{border:1px solid var(--border);background:var(--card);border-radius:14px;padding:16px 18px}
.kbz-faq summary{cursor:pointer;font-weight:700;font-size:15px}
.kbz-faq p{margin:10px 0 0;font-size:14px;line-height:1.6;color:var(--muted2,var(--muted))}
@media (max-width:760px){.kbz-steps,.kbz-plan,.kbz-dfy{grid-template-columns:1fr}.kbz-hero{padding-top:48px}.kbz-plan{padding:20px 16px}}
`

export default function BusinessPage() {
  const dfyTiers = DFY_SERVICE_FACT.tiers
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="kbz-nav" aria-label="Kineo">
        <div className="kbz-nav-in">
          <Link href="/" className="kbz-brand"><KineoBrandIcon size={30} />Kineo</Link>
          <Link href="/pricing" className="kbz-back">All plans</Link>
        </div>
      </nav>
      <main className="kbz" data-kineo="business-84">
        <header className="kbz-hero">
          <div className="kbz-eyebrow">Kineo Business · product video ads</div>
          <h1>Turn one product photo into a ready video ad</h1>
          <p className="kbz-sub">
            Upload a photo or paste your product link — Kineo writes, voices and edits a 15-second ad for TikTok, Reels and Shorts.
          </p>
          <div className="kbz-ctas">
            <a className="kbz-btn kbz-primary" href="/ads?from=business_page">Make your first ad free →</a>
            <a className="kbz-btn kbz-secondary" href="#plan">See Business plan</a>
          </div>
          <p className="kbz-fine">{BUSINESS_PRICE_LABEL}/month for {BUSINESS_ADS_PROMISE} · commercial use · cancel anytime</p>
        </header>

        <div className="kbz-steps">
          {STEPS.map((s) => (
            <div className="kbz-step" key={s.n}>
              <b>{s.n}</b>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>

        {ADS_V2_STYLES_PUBLIC ? (
          <section id="styles" className="kbz-sec" aria-labelledby="kbz-styles-title" data-kineo="business-styles">
            <h2 id="kbz-styles-title">Styles your ads can use</h2>
            <p className="kbz-sec-sub">Pick a style for your product shot — {ADS_V2_STYLES.length} effects made from your own product photo, included in the price. Or keep it simple with no effect.</p>
            <div className="kbz-styles"><AdsStyleStrip /></div>
          </section>
        ) : null}

        <section id="plan" className="kbz-sec" aria-labelledby="kbz-plan-title">
          <h2 id="kbz-plan-title">The Business plan</h2>
          <p className="kbz-sec-sub">Make your product ads yourself, every month, in Studio Ads.</p>
          <div className="kbz-plan">
            <div>
              <div className="kbz-promise">{BUSINESS_ADS_PROMISE}</div>
              <ul>
                {BUSINESS_BULLETS.map((b) => <li key={b}>{b}</li>)}
              </ul>
              {/* KINEO-EQUIPE-BUSINESS-2026-10-10 — a equipe: o dono convida colegas em Studio Ads → Team. */}
              <p className="kbz-fine" data-testid="business-team-line">
                Bring your team: invite up to {BUSINESS_TEAM_SEATS} teammates. They sign in with their own account and make ads with the company&apos;s credits. <a href={BUSINESS_TEAM_HREF} style={{ color: 'var(--accent)', fontWeight: 700 }}>Manage your team</a>
              </p>
            </div>
            <div className="kbz-buy">
              <div className="kbz-price">{BUSINESS_PRICE_LABEL}<small>/mo</small></div>
              <p className="kbz-fine">{BUSINESS_MONTHLY_CREDITS} credits a month · billed monthly · cancel anytime</p>
              <a className="kbz-btn kbz-primary" href={BUSINESS_CHECKOUT_HREF}>Get Business →</a>
              <p className="kbz-fine" data-testid="business-switch-line">
                Already on a Kineo plan? <a href={BUSINESS_SWITCH_HREF} style={{ color: 'var(--accent)', fontWeight: 700 }}>Switch to Business</a> — you pay only the price difference, no need to cancel.
              </p>
            </div>
          </div>
        </section>

        {dfyTiers.length > 0 ? (
          <section id="done-for-you" className="kbz-sec" aria-labelledby="kbz-dfy-title">
            <h2 id="kbz-dfy-title">Prefer we make it for you?</h2>
            <p className="kbz-sec-sub">Kineo Empresas: a person prepares the ad from your brief. One-time payment, no subscription.</p>
            <div className="kbz-dfy">
              {dfyTiers.map((t) => (
                <div className="kbz-dfy-card" key={t.tier}>
                  <h3>{t.name}<span>{t.priceLabel}</span></h3>
                  <p>{t.hours} hours · {t.revisions} {t.revisions === 1 ? 'revision' : 'revisions'}</p>
                  <p>{t.detail}</p>
                </div>
              ))}
            </div>
            <a className="kbz-dfy-link" href={BUSINESS_DFY_HREF}>See the done-for-you options →</a>
          </section>
        ) : null}

        <section id="faq" className="kbz-sec" aria-labelledby="kbz-faq-title">
          <h2 id="kbz-faq-title">Questions</h2>
          <div className="kbz-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
