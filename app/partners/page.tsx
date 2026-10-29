import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine' // KINEO-LLMS-K4-2910

import { KineoBrandIcon } from '@/components/KineoBolt'
import { FREE_FILM_COUNTRY_CLAUSE } from '@/lib/freeFilmPolicy' // KINEO-E4-CONSERTO-2026-09-29: o grant de 10 cr só vale na lista (saída B)
// KINEO-PARTNERS-PACOTE-2026-10-03 — a resposta "Can I test Kineo first?" dizia que os 10 créditos liberavam todos os motores:
// falso. Os créditos de cadastro (TRIAL_CREDITS_SHOWN) pagam TRIAL_SEEDANCE15_FILMS filme(s) Seedance 1.5 de
// TRIAL_FREE_FILM_SECONDS s com marca d'água; Kling/Veo/Studio pedem plano. Tudo derivado das fontes, e o pacote de
// demonstração do parceiro (lib/partnerPack.ts) entra com a verdade do interruptor PARTNER_PACK_LIVE.
import { TRIAL_CREDITS_SHOWN, TRIAL_FREE_FILM_SECONDS, TRIAL_SEEDANCE15_FILMS } from '@/lib/freeTierOffer'
import { PARTNER_PACK_DAYS, PARTNER_PACK_LIVE, PARTNER_PACK_STAGE1_CREDITS, PARTNER_PACK_STAGE2_CREDITS } from '@/lib/partnerPack'
// #486 — Public affiliate-recruiting landing. The page every outreach links to.
// Explains the verified recurring model (rate = AFFILIATE_COMMISSION_PCT, 30% for affiliates who join from 14/10; earlier ones keep 40%), first-touch window and how to
// apply through the built-in affiliate dashboard. Static, in sitemap for SEO.
//
// PUSH #101 — COPY DRIFT KILLED. This page used to promise a human review step
// ("Application is reviewed before a link becomes active"). That stopped being
// true when app/api/affiliate/apply/route.ts:110 started inserting new
// affiliates with `status: 'active'` instead of 'pending'. Every claim below is
// now traceable to code:
//   30% commission      → app/api/affiliate/apply/route.ts grava commission_rate: AFFILIATE_COMMISSION_RATE (0.3,
//                         lib/affiliateCommission.ts); o webhook (recordAffiliateCommission) paga
//                         effectiveAffiliateCommissionRate(linha, created_at): o piso é 40% para quem entrou antes de
//                         14/10 (veterano, mesmo com 0.3 gravado) e 30% depois. KINEO-AFILIADO-30-NOVOS-2026-10-13
//                         (fundador 13/10: novos 30%; era 40% desde KINEO-AFILIADOS-40-2026-10-06).
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
import { AFFILIATE_BONUS_TERMS, AFFILIATE_BUSINESS_TERMS, AFFILIATE_COMMISSION_PCT, AFFILIATE_COMMISSION_RATE, AFFILIATE_PAYOUT_TERMS } from '@/lib/affiliateCommission' // KINEO-BUSINESS-84-2026-10-09: + exceção do Business
import type { Metadata } from 'next'
import { TIER_PRICES } from '@/lib/checkoutPricing'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import AffiliateBusinessRecruitmentCard from '@/components/AffiliateBusinessRecruitmentCard'
import Footer from '@/components/Footer'
import { AFFILIATE_PRESENTATION_CSS } from '@/lib/ui/affiliatePresentation'
import {
  AFFILIATE_COMPARISON_VERIFIED_HUMAN,
  AFFILIATE_PROGRAM_COMPARISON,
} from '@/lib/growth/affiliateProgramComparison'

// KINEO-PARTNERS-CRIADORES-1610 — /partners reescrita como "Kineo Creator Partners" (fundador 16/10, Ação 5 do
// docs/PLANO-TRIPLICAR-VISITANTES-2026-10-16.md), no molde do Creator Partnership da Higgsfield, mas SÓ com o que o
// produto executa hoje. Cada benefício tem fonte no código:
//   comissão          → AFFILIATE_COMMISSION_PCT (lib/affiliateCommission.ts; 30% para quem entra desde 14/10)
//   cortesia + pacote → PARTNER_PACK_* (lib/partnerPack.ts, nível creator_trial); entrega manual enquanto
//                       PARTNER_PACK_LIVE = false — a copy segue o interruptor
//   Seedance 2.5 e Studio Ads para parceiro ativo → lib/partnerAccess.ts (cortesia ativa + afiliado ativo)
//   +créditos pelo 1º post público → app/api/affiliate/partner-post/route.ts + revisão no /admin/partners
//   cupom falado de 50% no 1º mês Creator/Studio mensal → KINEO-AFILIADO-50-2610
//   sem piso de seguidores → app/api/affiliate/apply/route.ts não pede nada além da conta
// O que a Higgsfield promete e a Kineo NÃO executa (crédito mensal automático, vitrine dos melhores posts, acesso
// antecipado, prazo de resposta) ficou FORA — decisão do fundador. Guardião: scripts/test-partners-criadores-1610.mjs.
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import { adsV2Style } from '@/lib/ads/v2Styles'

// KINEO-PRICING-V6-2026-08-19 — a ilustração de ganhos é CALCULADA, não
// digitada. A taxa é a que app/api/affiliate/apply/route.ts grava e o webhook paga
// (AFFILIATE_COMMISSION_RATE, 30% desde 14/10 — 40% de 06/10 a 13/10, 30% de 09/09 a 06/10); o piso e o teto são o plano mais barato e o mais caro
// da escada de assinatura (Autopilot fica de fora de propósito: $299/mês num
// exemplo de afiliado infla a promessa com um produto que quase ninguém compra).
const COMMISSION_RATE = AFFILIATE_COMMISSION_RATE
const CHEAPEST_PLAN_USD = TIER_PRICES.starter.usd / 100
const PRICIEST_PLAN_USD = TIER_PRICES.pro.usd / 100

/** "~$52–$220 / mo" para N clientes indicados, à taxa recorrente da fonte (AFFILIATE_COMMISSION_RATE). */
function monthlyRange(customers: number): string {
  const money = (usd: number) => '$' + Math.round(customers * COMMISSION_RATE * usd).toLocaleString('en-US')
  return `~${money(CHEAPEST_PLAN_USD)}–${money(PRICIEST_PLAN_USD)} / mo`
}

const PRICE_RANGE = `$${CHEAPEST_PLAN_USD}–$${PRICIEST_PLAN_USD}/month`

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: `AI Video Affiliate Program — ${AFFILIATE_COMMISSION_PCT} Recurring, Compared | Kineo`,
  description:
    `Kineo Creator Partners: post the films you make with Kineo and earn ${AFFILIATE_COMMISSION_PCT} recurring. No follower minimum, a courtesy Creator account to create with, a tracked link and a spoken coupon. Compared with OpusClip, InVideo and VEED.`,
  alternates: { canonical: 'https://www.usekineo.com/partners' },
  openGraph: {
    title: `Kineo Creator Partners — Post Your Films, Earn ${AFFILIATE_COMMISSION_PCT} Recurring`,
    description: 'No follower minimum. A courtesy Creator account, a tracked link and a spoken coupon — and recurring commission while your referrals stay subscribed.',
    url: 'https://www.usekineo.com/partners',
    type: 'website',
  },
}

const CARD = { background: 'var(--card)', border: '1px solid var(--border)' }
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

// KINEO-PARTNERS-CRIADORES-1610 — o que postar: mídia REAL da casa, nunca de cliente. O filme vem da lista explícita de
// exemplos do fundador (lib/publicExamples.ts, dono confirmado em 27/08); o anúncio é a prévia real do efeito do Studio Ads
// (lib/ads/v2Styles.ts, a mesma que /agencies mostra).
const FILM_EXAMPLE = PUBLIC_EXAMPLES.find((e) => e.slug === 'north-sentinel-island') ?? PUBLIC_EXAMPLES[0]
const AD_EXAMPLE = adsV2Style('giant_product')

// O pacote do parceiro sai sozinho só com PARTNER_PACK_LIVE ligado; desligado, a equipe põe à mão depois do pedido.
const PACK_DELIVERY = PARTNER_PACK_LIVE ? 'added the moment you join' : 'added by our team — email us after you join'

const PARTNERS_CREATOR_CSS = `
.partners-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:20px auto 0;padding:0;list-style:none}
.partners-chips li{font-size:.8rem;color:var(--text2);background:var(--card);border:1px solid var(--border);border-radius:999px;padding:6px 12px}
.partners-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.partners-post{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.partners-post-media{position:relative;aspect-ratio:9/16;max-height:340px;width:100%;border-radius:12px;overflow:hidden;background:var(--card2);margin-bottom:12px}
.partners-post-media video,.partners-post-media img{width:100%;height:100%;object-fit:cover;display:block}
.partners-post-tag{position:absolute;left:8px;top:8px;font-size:.68rem;font-weight:650;letter-spacing:.04em;text-transform:uppercase;background:rgba(0,0,0,.62);color:#fff;border-radius:999px;padding:4px 9px}
.partners-prompt{aspect-ratio:9/16;max-height:340px;width:100%;border-radius:12px;background:var(--card2);margin-bottom:12px;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:18px}
.partners-prompt-box{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;line-height:1.5;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px}
.partners-prompt-arrow{text-align:center;color:var(--accent);font-weight:650;font-size:.85rem}
.partners-rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0;padding:0;list-style:none}
.partners-rules li{border-radius:12px;padding:14px 16px}
@media(max-width:860px){.partners-steps,.partners-post{grid-template-columns:minmax(0,1fr)}.partners-post-media,.partners-prompt{max-height:420px;max-width:300px;margin-inline:auto}}
@media(max-width:640px){.partners-rules{grid-template-columns:minmax(0,1fr)}}
`

export default function PartnersPage() {
  const faq = [
    { q: 'Who can join?', a: `Anyone with a Kineo account. There is no follower minimum and no fee to join. It works best if you already make videos with Kineo — a film you made yourself is the most convincing thing your audience can see.` },
    { q: 'Do I have to be approved first?', a: 'No. There is no review queue and no waiting. The moment you submit the application your affiliate link is active — it starts logging clicks and setting the 90-day attribution cookie on the very first visitor you send.' },
    { q: 'How much do I earn?', a: `Affiliates earn ${AFFILIATE_COMMISSION_PCT} of each eligible payment from customers they refer, including recurring payments while the customer remains subscribed and the affiliate account remains active. First-touch tracking lasts 90 days. ${AFFILIATE_BUSINESS_TERMS}` },
    { q: 'What is the courtesy Creator account?', a: `If your account has no paid plan, your partner pack gives you ${PARTNER_PACK_STAGE1_CREDITS} credits with Creator-level engines for ${PARTNER_PACK_DAYS} days, ${PACK_DELIVERY}. Share one public post that shows your link or coupon and, after a quick review, you get ${PARTNER_PACK_STAGE2_CREDITS} more. While the courtesy account and your affiliate link are both active, Seedance 2.5 and Studio Ads are open to you too, paid with those credits. If you already pay for a plan, you keep your plan — courtesy never replaces it. When it ends and you are still posting, email us and we can grant it again.` },
    { q: 'Can Kineo make a video for me?', a: 'Only after you join. Once your partnership is active, our team can make your first film with you — on your channel’s topic, inside your own account, so it is yours to post. We do not make videos for people who have not joined.' },
    { q: 'What should I post?', a: 'The film you made with Kineo, in full — it is the demo. A before-and-after of a product ad (the plain photo, then the ad Studio Ads made from it). Or the idea you typed next to the finished film. Kineo turns one topic or script into a finished 9:16 Short with script structure, AI voice, matched visuals and captions.' },
    { q: 'What are the rules?', a: 'Label your posts as AI-made. Share only your real opinion — no fake reviews, no invented results. Say that your link or code is an affiliate link where your platform asks for it. Purchases through your own link or code do not earn commission.' },
    { q: 'How does Kineo compare with other AI video affiliate programs?', a: `Rates are not directly comparable unless duration is included. As verified ${AFFILIATE_COMPARISON_VERIFIED_HUMAN}, Kineo publishes ${AFFILIATE_COMMISSION_PCT} recurring while the referred customer stays subscribed; OpusClip publishes 25% recurring through the first year; InVideo publishes 50% on monthly or 25% on annual purchases for the first billing cycle only; and VEED publishes a 20% recurring base with performance bonuses up to 50%. The comparison on this page links every official source.` },
    { q: 'Can I test Kineo first?', a: `Yes. Every new account${FREE_FILM_COUNTRY_CLAUSE} starts free with ${TRIAL_CREDITS_SHOWN} credits, no card — enough for ${TRIAL_SEEDANCE15_FILMS === 1 ? 'one' : TRIAL_SEEDANCE15_FILMS} watermarked ${TRIAL_FREE_FILM_SECONDS}-second film${TRIAL_SEEDANCE15_FILMS === 1 ? '' : 's'} made with ${FREE_FILM_ENGINE_NAME}. Other engines and longer films need a paid plan. Partners can also get a demo pack to create with: ${PARTNER_PACK_STAGE1_CREDITS} credits with paid-plan engine access for ${PARTNER_PACK_DAYS} days, plus ${PARTNER_PACK_STAGE2_CREDITS} more after you share one public post with your link or coupon and we review it. ${PARTNER_PACK_LIVE ? 'The first part is added when you join.' : 'Email us after you join to get it.'}` }, // KINEO-LLMS-K4-2910
    { q: 'How is attribution tracked?', a: 'Your Kineo affiliate link records first-touch clicks, signups, payments and renewals in your affiliate dashboard. The first affiliate link a visitor touches wins, and that attribution holds for 90 days.' },
    // KINEO-CUPOM-AFILIADO-2026-08-21 — esta pagina prometia SO o link, e link
    // nao existe dentro de um video de TikTok/Reels/Shorts, que e exatamente
    // onde estao os criadores que queremos. O cupom e a outra metade do
    // programa e precisa estar dita em publico, com a mecanica REAL: nao tem
    // janela de 90 dias nem first-touch por clique — a atribuicao acontece no
    // momento do pagamento, quando o codigo e digitado.
    { q: 'What if I promote on TikTok, Reels or Shorts, where links do not work?', a: 'Every affiliate also gets a coupon code, shown next to your link in the affiliate dashboard. Say it out loud in the video — "use code KINEOXXXX" — and your viewer types it at checkout. They get 50% off the first month of Creator or Studio monthly, you get credited, and no link or bio click is needed. Your link applies this discount automatically too. Full monthly price from month two; cannot be combined with another discount. Once someone redeems your code, their renewals keep counting for you for as long as they stay subscribed.' },
    { q: 'Which wins if someone clicks a link and also types a coupon?', a: 'The link. We honour first touch: whoever the visitor reached first owns the referral, and a coupon typed later does not move it. The customer still gets the discount.' },
    // KINEO-AFILIADO-TERMOS-2026-09-09 — os termos saem da fonte única, nunca digitados aqui.
    // KINEO-AFILIADOS-40-2026-10-06 — a resposta terminava com "Add your PayPal e-mail in the affiliate dashboard so the payout
    // can go out": o painel NÃO tem esse campo (nem a API grava payout_*). O repasse já é manual (fundador, PayPal), então a
    // verdade é dizer quem pede o endereço e quando — sem campo inventado.
    { q: 'When do I get paid?', a: `Every commission is recorded automatically the moment a referred customer pays, and lands in your dashboard as pending. ${AFFILIATE_PAYOUT_TERMS} Before your first payout we e-mail you to confirm the PayPal account to pay — there is nothing to set up in the dashboard.` },
    { q: 'Is there a bonus for my first customer?', a: AFFILIATE_BONUS_TERMS },
  ]
  // KINEO-PARTNERS-CRIADORES-1610 — o JSON-LD sai da MESMA lista que a seção visível desenha (faq.map nos dois lados).
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const steps = [
    { n: '1', t: 'Join with your Kineo account', d: 'Sign in and press Apply. No forms, no follower count, no interview. Your link and your coupon code appear on the same screen, already active.' },
    { n: '2', t: 'Get a courtesy account and your link', d: `No paid plan? Your partner pack: ${PARTNER_PACK_STAGE1_CREDITS} credits with Creator-level engines for ${PARTNER_PACK_DAYS} days, ${PACK_DELIVERY}. While you are an active partner, Seedance 2.5 and Studio Ads open too.` },
    { n: '3', t: `Post and earn ${AFFILIATE_COMMISSION_PCT} recurring`, d: `Post what you made, with your link or coupon. Paste the post link in your dashboard for ${PARTNER_PACK_STAGE2_CREDITS} more credits after a quick review. Every subscriber you bring pays you ${AFFILIATE_COMMISSION_PCT} of each eligible payment for as long as they stay.` },
  ]
  const rules = [
    { t: 'Label it as AI', d: 'Everything Kineo makes is AI-generated. Use your platform’s AI label or say it in the caption.' },
    { t: 'Real opinions only', d: 'No fake reviews, no invented results, no posing as a customer you are not.' },
    { t: 'Say you are a partner', d: 'Mention that your link or code is an affiliate link wherever your platform or local rules ask for it.' },
    { t: 'Your own purchases do not count', d: 'Buying through your own link or code earns no commission.' },
  ]
  return (
    <main className="partners-page">
      <style dangerouslySetInnerHTML={{ __html: AFFILIATE_PRESENTATION_CSS + PARTNERS_CREATOR_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="partners-container">
        <Link href="/" className="partners-brand"><KineoBrandIcon size={20} /> Kineo</Link>

        <section className="partners-hero">
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 999, padding: '6px 14px' }}>Kineo Creator Partners</div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', fontWeight: 650, lineHeight: 1.12, margin: '16px 0 0' }}>Post the films you make with Kineo. Earn {AFFILIATE_COMMISSION_PCT} Recurring</h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text2)', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 620 }}>
            For creators who already make videos with Kineo — no follower minimum. You get a courtesy Creator account to create with (if you are not on a paid plan), a tracked link, a coupon your viewers can just type, and <b style={{ color: 'var(--text)' }}>{AFFILIATE_COMMISSION_PCT} of eligible payments</b> while referred customers stay subscribed.
          </p>
          <ul className="partners-chips" aria-label="What partners get">
            <li>No follower minimum</li>
            <li>Link live the moment you join</li>
            <li>Courtesy Creator account</li>
            <li>Spoken coupon for TikTok, Reels and Shorts</li>
          </ul>
          <OrganicCtaLink href={APPLY} source="partners" placement="hero" className="partners-primary" style={{ display: 'inline-block', marginTop: 22, background: 'var(--indigo)', color: 'var(--on-accent)', fontWeight: 650, padding: '15px 32px', borderRadius: 14, textDecoration: 'none', fontSize: '1.05rem' }}>Join as a creator partner →</OrganicCtaLink>
          <div style={{ marginTop: 14 }}>
            <OrganicCtaLink href="/faceless-video-generator" source="partners" placement="product_demo" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
              Test the product your audience will see →
            </OrganicCtaLink>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--muted)' }}>Free to join. No review queue — your link is live the second you apply, and starts tracking your first click.</div>
        </section>

        {/* How — os 3 passos */}
        <section id="how-it-works" style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 18px' }}>How it works</h2>
          <div className="partners-steps">
            {steps.map((s) => (
              <div key={s.n} className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 18 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.55 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* O que postar */}
        <section id="what-to-post">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 8px' }}>What to post</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'center', maxWidth: 610, margin: '0 auto 18px' }}>
            The best post is the video itself. Three formats that show the product without a pitch:
          </p>
          <div className="partners-post">
            <div className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 14 }}>
              <div className="partners-post-media">
                <video src={FILM_EXAMPLE.videoPath} poster={posterWebpPath(FILM_EXAMPLE.posterPath)} autoPlay muted loop playsInline preload="metadata" aria-label={`Preview of a Kineo film: ${FILM_EXAMPLE.shortTitle}`} />
                <span className="partners-post-tag">Made with Kineo</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Your own Kineo film</div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.55 }}>Post the full Short and say it was made with AI from a few lines of text. Above: a {FILM_EXAMPLE.previewDurationSeconds}-second preview of “{FILM_EXAMPLE.shortTitle}”, a {FILM_EXAMPLE.outputDurationSeconds}-second film from the Kineo gallery.</p>
            </div>
            <div className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 14 }}>
              <div className="partners-post-media">
                <video src={AD_EXAMPLE.preview} poster={AD_EXAMPLE.poster} autoPlay muted loop playsInline preload="metadata" aria-label={`Studio Ads example: ${AD_EXAMPLE.label}`} />
                <span className="partners-post-tag">Studio Ads</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Before → after product ad</div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.55 }}>Show the plain product photo first, then the ad Studio Ads made from it. Works for shops, food, beauty and gadgets. Above: the “{AD_EXAMPLE.label}” style.</p>
            </div>
            <div className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 14 }}>
              <div className="partners-prompt" aria-hidden="true">
                <div className="partners-prompt-box">{FILM_EXAMPLE.prompt}</div>
                <div className="partners-prompt-arrow">↓ Kineo</div>
                <div className="partners-prompt-box">A {FILM_EXAMPLE.outputDurationSeconds}-second narrated, captioned 9:16 film</div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Behind the prompt</div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.55 }}>Screen-record the idea you typed, then cut to the finished film. “This whole video came from N words of text” is the hook we use on our own channels.</p>
            </div>
          </div>
        </section>

        {/* Regras */}
        <section id="partner-rules">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 18px' }}>Four short rules</h2>
          <ul className="partners-rules">
            {rules.map((r) => (
              <li key={r.t} className="partners-card" style={{ ...CARD }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{r.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Earnings */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 18px' }}>What {AFFILIATE_COMMISSION_PCT} recurring looks like</h2>
          <div className="partners-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { n: '10', d: 'referred customers', e: monthlyRange(10) },
              { n: '50', d: 'referred customers', e: monthlyRange(50) },
              { n: '200', d: 'referred customers', e: monthlyRange(200) },
            ].map((r) => (
              <div key={r.n} className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 650 }}>{r.n}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '2px 0 8px' }}>{r.d}</div>
                <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.95rem' }}>{r.e}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
Example only, not a promise. Illustration based on {AFFILIATE_COMMISSION_PCT} of current USD list prices ({PRICE_RANGE}), before taxes, refunds or failed payments. Commission always uses the amount actually paid. With your link or coupon, the first month of Creator or Studio monthly is 50% smaller — so is that first commission. Full monthly price applies from month two.</p>
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 8px' }}>A campaign kit, not just a link</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'center', maxWidth: 610, margin: '0 auto 18px' }}>
            Choose the audience you already have. Kineo gives you the matching landing page, a ready-to-post caption and a short speaking script — with your coupon included when available.
          </p>
          <div className="partners-grid partners-campaigns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
            {[
              { t: 'Script-first audience', d: 'Send people who have a topic: Kineo writes the script and makes the free first film.' },
              { t: 'Ready to test video', d: 'Send people who want to judge the complete free Fast workflow.' },
              { t: 'Faceless creators', d: 'Send channel builders to the narration, visuals and captions workflow.' },
            ].map((campaign) => (
              <div key={campaign.t} className="partners-card" style={{ ...CARD, borderRadius: 14, padding: 17 }}>
                <div style={{ color: 'var(--accent)', fontWeight: 650, marginBottom: 6 }}>{campaign.t}</div>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.55 }}>{campaign.d}</p>
              </div>
            ))}
            <AffiliateBusinessRecruitmentCard href={APPLY} />
          </div>
        </section>

        <section id="ai-video-affiliate-program-comparison" style={{ marginTop: 46 }}>
          <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 18px' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 650, fontSize: '0.72rem', letterSpacing: '.09em', textTransform: 'uppercase' }}>Official terms, side by side</div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 650, margin: '8px 0' }}>A high first commission is not always a recurring commission</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              This compares published program structure — not likely earnings or product quality. Every competitor claim links to its official source and carries a verification date.
            </p>
          </div>
          <div className="partners-table" tabIndex={0} style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', background: 'var(--card)', fontSize: '0.85rem', lineHeight: 1.45 }}>
              <thead>
                <tr style={{ background: 'var(--card2)', color: 'var(--text2)', textAlign: 'left' }}>
                  {['Program', 'Published commission', 'How long it pays', 'Activation', 'Distribution'].map((heading) => (
                    <th key={heading} style={{ padding: '13px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AFFILIATE_PROGRAM_COMPARISON.map((row) => (
                  <tr key={row.program} style={{ background: row.kineo ? 'var(--accent-soft)' : 'transparent' }}>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 650, color: row.kineo ? 'var(--accent)' : 'var(--text)' }}>{row.program}{row.kineo ? ' · this program' : ''}</div>
                      <a href={row.sourceUrl} rel={row.kineo ? undefined : 'noopener noreferrer'} target={row.kineo ? undefined : '_blank'} style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{row.sourceLabel} ↗</a>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top', fontWeight: 600, color: 'var(--text)' }}>{row.commission}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--text2)' }}>{row.recurrence}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--muted)' }}>{row.activation}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'top', color: 'var(--muted)' }}>{row.distribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...CARD, marginTop: 14, borderRadius: 14, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontWeight: 650, color: 'var(--text)' }}>Kineo’s wager is retention, not a one-payment headline.</div>
            <p style={{ margin: '6px auto 13px', color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.55, maxWidth: 610 }}>
              You get {AFFILIATE_COMMISSION_PCT} recurring, instant self-serve activation, and both a tracked link and a spoken coupon for TikTok, Reels and Shorts. Terms verified {AFFILIATE_COMPARISON_VERIFIED_HUMAN}; competitor programs can change.
            </p>
            <OrganicCtaLink href={APPLY} source="partners" placement="comparison" className="partners-primary" style={{ display: 'inline-block', background: 'var(--indigo)', color: 'var(--on-accent)', fontWeight: 650, padding: '11px 22px', borderRadius: 11, textDecoration: 'none', fontSize: '0.9rem' }}>Activate my {AFFILIATE_COMMISSION_PCT} recurring link →</OrganicCtaLink>
          </div>
        </section>

        {/* FAQ */}
        <section id="affiliate-program-faq" style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 650, textAlign: 'center', margin: '0 0 18px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.95rem' }}>{f.q}</div>
                <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 18, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 650, margin: 0 }}>Start earning {AFFILIATE_COMMISSION_PCT} recurring</h2>
          <p style={{ color: 'var(--text2)', margin: '8px 0 18px', fontSize: '0.95rem' }}>No payment is required to apply, and nothing sits in a review queue. You will be holding a working link about a minute from now.</p>
          <OrganicCtaLink href={APPLY} source="partners" placement="bottom" className="partners-primary" style={{ display: 'inline-block', background: 'var(--indigo)', color: 'var(--on-accent)', fontWeight: 650, padding: '14px 30px', borderRadius: 12, textDecoration: 'none', fontSize: '1.02rem' }}>Join as a creator partner →</OrganicCtaLink>
          <div style={{ marginTop: 12, fontSize: '0.78rem' }}><a href={SUPPORT} style={{ color: 'var(--muted)' }}>Questions before applying? Email us.</a></div>
        </section>
      </div>
      <Footer showStats={false} />
    </main>
  )
}
