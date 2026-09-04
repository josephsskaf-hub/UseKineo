'use client'

// Push #076 — Standalone /pricing page (real route, not just an anchor).
// Mirrors the Cyber Blue theme used by HomePageClient.
//
// Push #097 — added launch-offer banner with live countdown, a "Most
// Popular" badge on Basic, and a cancel/instant-access/money-back trust
// row directly under the plan cards. The countdown is a UX/urgency
// device; the underlying Stripe discount is the open 50%-off-first-month
// launch offer.

import { S25_PUBLIC } from '@/lib/engineLaunch'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { trackCheckoutClick } from '@/lib/trackClick'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { createClient } from '@/lib/supabase/client'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import WelcomeOfferModal from '@/components/WelcomeOfferModal' // KINEO-WELCOME20-2026-08-25
// KINEO-CLIPES-2026-08-19 — anunciar filme PRONTO e a cena que o compõe. O
// porquê (e o que NÃO copiar do Higgsfield) está no bloco em lib/marketingPrice.
import {
  creditsPerReferenceVideo,
  CHECKOUT_CURRENCY_DISCLOSURE,
  filmsAndScenes,
  formatResultCount,
  videosPerMonth,
} from '@/lib/marketingPrice'
import CostCalculatorLink from '@/components/CostCalculatorLink'
import AgencyVolumeBridge from '@/components/AgencyVolumeBridge'
import PricingBusinessPathTelemetry from '@/components/PricingBusinessPathTelemetry'
import { PRICING_BUSINESS_PATH_TARGET_ID } from '@/lib/growth/pricingBusinessPath'
import PricingSavedCheckout from '@/components/PricingSavedCheckout'
import PricingJourneyProof from '@/components/growth/PricingJourneyProof'
import AutopilotBreakEvenCalculator from './AutopilotBreakEvenCalculator'
import {
  // KINEO-PILOT-99-2026-07-26 — preço e duração do piloto vêm da mesma fonte que
  // o checkout cobra. Retipar "$99" aqui é como os outros três leaks começaram.
  AUTOPILOT_PILOT_DAYS,
  AUTOPILOT_PILOT_PRICES,
  AUTOPILOT_PRICES,
  INTRO_CREDITS,
  TIER_CREDITS,
  // KINEO-REGIONAL-PRICING-2026-08-04 — TIER_PRICES / INTRO_PRICES /
  // ANNUAL_PRICES saíram: uma tabela indexada só por moeda não consegue
  // responder "quanto ESTE visitante paga". Tudo passa pelos getters de região.
  coercePriceRegion,
  formatCheckoutMoney,
  getAnnualPrice,
  getIntroPrice,
  getTierPrice,
  hasIntroOffer,
  type CheckoutCurrency as DisplayCurrency,
  type CheckoutPlanTier as BuyableTier,
  type CheckoutTier as PaidTier,
  type PriceRegion,
} from '@/lib/checkoutPricing'
import { useFreeTierOffer } from '@/components/FreeTierOfferProvider'
import { swapFreeTierCopy as ft, TRIAL_GRANT_CREDITS_COPY, type FreeTierOffer } from '@/lib/freeTierOffer'
import { CHECKOUT_PAYMENT_GUIDANCE_COMPACT } from '@/lib/growth/checkoutPaymentGuidance'
import {
  buildPricingPlanChoiceAttribution,
  sanitizePricingIntentCampaign,
} from '@/lib/growth/pricingPlanChoiceAttribution'
import {
  buildPricingTierHandoffAttribution,
  pricingTierCardId,
  pricingTierHandoffStorageKey,
  sanitizePricingTierHandoff,
  type PricingTierHandoffTier,
} from '@/lib/growth/pricingTierHandoff'
import {
  mobileStickyExposureKey,
  mobileStickyPlanLabel,
  mobileStickyTelemetry,
  type MobileStickyTier,
} from '@/lib/growth/mobileStickyBillingTruth'
import {
  checkoutSetupFailureStorageKey,
  checkoutSetupFailureTelemetry,
  readCheckoutSetupFailureFromSearch,
  type CheckoutSetupFailureReturnContext,
} from '@/lib/growth/checkoutSetupFailureReturn'

// PAYPAL-DISABLED-2026-07-06 — PayPal checkout is hidden on pricing until it's
// verified working end-to-end (business account still needs verification). All
// "pay with PayPal" buttons are gated behind this flag. Flip to `true` to
// re-enable everywhere at once. Stripe checkout is unaffected.
const PAYPAL_ENABLED = false

// Push #099 — FAQ entries shown below the pricing comparison table. Pure
// content array so the accordion renders from one source of truth.
// [KINEO-TRIAL-SWAP-2026-08-07] — virou função da oferta: a resposta sobre o
// free tier troca junto com a flag (OFF = literais antigos byte a byte).
const buildFaqs = (OFFER: FreeTierOffer): { q: string; a: string }[] => [
  {
    // KINEO-FAQ-NOCARD-2026-07-13 — a resposta antiga ("Yes, a card is
    // required... charged immediately") CONTRADIZIA a oferta de previews sem
    // cartão três telas acima. Conversion-killer clássico: o FAQ
    // é onde o indeciso vai tirar a última dúvida antes de clicar.
    // KINEO-SPRINT-OFFER-2026-07-14 — dropped the "$4.90 one-time pack"
    // mention: the pack has no public CTA anymore (single-offer cleanup),
    // so naming it here would advertise a product the page doesn't sell.
    q: 'Do I need a credit card to start?',
    a: `No. ${ft(OFFER, 'A new free account can create, watch, download and share up to 3 Fast videos with a watermark every 24 hours, with no card. Free access grants no credits and no premium AI Generated videos.', OFFER.copy.sentence + ' The residual free plan grants no credits and no premium AI Generated videos.')} Subscribe only when you want a clean, watermark-free MP4. ${CHECKOUT_CURRENCY_DISCLOSURE}`,
  },
  {
    // [KINEO-COMMERCIAL-LICENSE-2026-08-12] — a pergunta nº 1 de qualquer
    // freelancer/agência, e até hoje sem resposta na página onde ela nasce.
    // Cada frase abaixo tem lastro: "lawful, personal or commercial purposes"
    // e "You retain ownership of the videos you generate" (/terms §2 e §3);
    // "You may not copy, resell or redistribute the Service itself" (§5). A
    // ressalva do stock NÃO vem dos nossos termos e sim da licença do provedor
    // (Pixabay Content License, que proíbe redistribuir o clipe em si) — por
    // isso está escrita como limite, nunca como promessa. Texto idêntico byte
    // a byte ao do FAQ visível em app/KineoLanding.tsx e ao FAQPage JSON-LD em
    // components/StructuredData.tsx: JSON-LD que não bate com a página é sinal
    // de spam. Se mudar aqui, mudar nos três.
    q: 'Can I use the videos commercially, or for client work?',
    a: 'Yes. Our terms let you use Kineo for lawful personal or commercial purposes and confirm that you keep ownership of the videos you generate, so you can post them, monetize them and deliver them to a client as part of your own paid service. No extra license, no per-video royalty. Two limits come from the same terms: you cannot resell or redistribute Kineo itself, and the stock clips inside a render are licensed for use in your finished video, not for re-upload as standalone stock footage. Paid plans export the clean, watermark-free MP4.',
  },
  {
    q: 'How fast are videos generated?',
    a: 'Each AI video renders in about 3–5 minutes. We use AI to write, voice, and edit everything automatically.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, cancel from your account settings at any time. No contracts, no commitments.',
  },
  {
    q: 'Is there a money-back guarantee?',
    a: 'Yes — Starter, Creator, and Studio come with a 7-day money-back guarantee. If you\'re not satisfied, email us within 7 days of your purchase and we\'ll refund 100%. No questions asked.',
  },
  {
    q: 'What happens if a video fails to generate?',
    a: 'Your credits are refunded automatically, the moment the render fails — no support ticket needed. You only ever pay for videos you actually receive.',
  },
  {
    q: 'What’s the difference between AI Generated and Cinematic AI?',
    // KINEO-REBASE-2026-07-10 — 2:1 rebase (Seedance 20, Kling 45) + universal
    // engines: every engine is on every paid plan now (no Studio exclusivity).
    a: `AI Generated uses the Seedance engine (great quality, ${creditsPerReferenceVideo('cinematic_ai')} credits per 60-second video). Cinematic AI uses the premium Kling engine for top-tier cinematic motion (${creditsPerReferenceVideo('cinematic_kling')} credits per 60-second video). Every paid plan can access every engine once its balance covers the full cost; you can add extra credits when needed. Fast Mode uses smart stock footage.`,
  },
  {
    q: 'How do credits work?',
    // KINEO-PRICING-V3B-2026-07-10 — Creator 150 credits, Kling 50 credits.
    // KINEO-PRICING-V3D-2026-07-26 — the discounted first month of Creator
    // grants 50 credits, not 150. Stating it here as well as on the card is
    // the difference between a discount and a bait-and-switch.
    a: `Think in 60-second films: Seedance = ${creditsPerReferenceVideo('cinematic_ai')} credits, Kling 2.5 = ${creditsPerReferenceVideo('cinematic_kling')}, Veo 3.1 = ${creditsPerReferenceVideo('cinematic_veo')}, Kling 3 or Omni Flash = ${creditsPerReferenceVideo('cinematic_hollywood')}. One image = 1-5 credits, one voiceover = 1-2, one HD enhance = 10. Starter includes ${TIER_CREDITS.starter} credits/month (≈${formatResultCount(videosPerMonth('starter', 'cinematic_ai'), 'Seedance film')}), Creator includes ${TIER_CREDITS.basic} (≈${formatResultCount(videosPerMonth('basic', 'cinematic_ai'), 'Seedance film')}), Studio includes ${TIER_CREDITS.pro} (≈${formatResultCount(videosPerMonth('pro', 'cinematic_ai'), 'Seedance film')}, or ${formatResultCount(videosPerMonth('pro', 'cinematic_hollywood'), 'Kling 3 film')}); Autopilot includes ${TIER_CREDITS.autopilot} on top of the daily Short we publish for you. Credits reset each month (no rollover).`,
  },
  {
    // KINEO-AUTOPILOT-299-2026-07-26
    q: 'What exactly does Autopilot do?',
    a: 'You connect your YouTube channel once and choose what time of day to post. From then on Kineo picks a topic, writes the script, generates the voiceover, matches the footage, burns in the captions, writes the title and description, and uploads the finished Short to your channel — one per day, every day, without you opening the app. You can pause it, change the posting time, or cancel at any moment. It costs $299/month; a human editing agency charges $495/month for 16 Shorts and $2,400/month for 30.',
  },
  {
    // KINEO-AUTOPILOT-299-2026-07-26
    q: 'Do I still get to make my own videos on Autopilot?',
    a: 'Yes. Autopilot includes 400 credits a month that you can spend on any engine — Seedance, Kling, Hollywood, AI Presenter — completely separately from the daily Short we publish for you. The daily Short uses Fast Mode so it is quick, reliable and cheap to run every single day.',
  },
]

// Push #267 — removed Free card. Pricing page now shows only paid plans.
// Free tier still exists for new signups via /signup, but is not shown here
// to avoid users exploiting the $0 entry point.
// Push #339 — added Starter plan at $2.90/mo (15 credits).
// KINEO-REGIONAL-PRICING-2026-08-04 — `region` é parâmetro obrigatório: um
// default aqui seria a forma mais silenciosa possível de a página inteira
// voltar ao preço americano se alguém acrescentar uma chamada nova.
function buildPricing(currency: DisplayCurrency, region: PriceRegion) {
  // Push #404 — 3 plans: Starter (Fast) · Creator (Seedance, popular) · Studio (Kling).
  //
  // ═══ KINEO-VALUE-LADDER-FLIP-2026-08-19 ═════════════════════════════════
  // O selo segue a REGIÃO. Até hoje "Most Popular" estava cravado no Creator
  // em toda parte, o que na região `value` significava apontar o holofote
  // para ₹1.299/mês num mercado onde a nossa porta de entrada é ₹399. O
  // funil de 7 dias mediu o preço disso: 44 pessoas chegaram ao checkout,
  // TODAS tentaram 2+ vezes, e ZERO assinaram — 16 delas da Índia, olhando
  // para ₹1.299 e saindo antes de digitar o cartão (`customer_country: null`
  // nas sessões expiradas).
  //
  // KINEO-PRICING-V6-2026-08-19 — a região morreu no mesmo dia. Com uma
  // tabela só ($7/$15/$29 para todo mundo), o selo volta a ser uma decisão de
  // posicionamento e não de geografia: "Most Popular" fica no Creator, que é
  // o primeiro passo certo agora que ele custa $15 e não $19,90.
  void region
  const valueRegion = false
  return [
    {
      tier: 'starter',
      name: 'Starter',
      price: formatCheckoutMoney(currency, getTierPrice('starter', currency, region)),
      priceSub: '/ month',
      // KINEO-REBASE-2026-07-10 — 50 → 25 credits (2:1 rebase, USD unchanged).
      // KINEO-SHOWCASE-2026-07-10 — V3C wording: Fast = 1 credit per video for
      // paid accounts (25 credits ≈ 25 Fast videos), engines universal.
      // KINEO-PRICING-CLARITY-2026-08-03 — vender CADÊNCIA, não crédito.
      // O crédito é mecânica interna; o comprador decide por "quantos vídeos
      // por mês eu consigo postar".
      // KINEO-PRICING-MINIMAL-2026-08-03 — o array `features` foi REMOVIDO
      // (não era mais renderizado depois do card de 4 blocos). Se voltar a
      // precisar da lista, ela pertence à tabela comparativa, não ao card:
      // duplicar a mesma informação em dois lugares é exatamente o que fez os
      // grants de crédito derivarem antes (ver KINEO-PRICING-V3D).
      // KINEO-PRICING-V5-2026-08-17 — 60cr: o card fala em RESULTADO.
      outcome: `Every engine unlocked. ${videosPerMonth('starter', 'fast')} quick videos or ${videosPerMonth('starter', 'cinematic_ai')} Seedance film — voice, captions and score included.`,
      videosPerMonth: filmsAndScenes('starter'),
      storageLine: '100 projects · 90-day storage',
      cta: { label: 'Get Started', href: '#checkout' },
      // Na região `value` o Starter é a porta de entrada real, e é ele que
      // ganha o realce azul de "Best Value".
      highlight: valueRegion,
    },
    {
      tier: 'basic',
      name: 'Creator',
      price: formatCheckoutMoney(currency, getTierPrice('basic', currency, region)),
      priceSub: '/ month',
      // KINEO-PRICING-V3B-2026-07-10 — $24.90/150cr: 1 Hollywood film every
      // month included (150 cr), or ~7 AI-generated videos (20 cr each).
      // KINEO-PRICING-CLARITY-2026-08-03 — o degrau do Creator não é "mais
      // créditos": é MUDANÇA DE NATUREZA (cenas geradas por IA em vez de stock).
      // É esse salto que o usuário free já prova de graça no hook do 1º vídeo.
      // KINEO-PRICING-V5-2026-08-17 — 140cr a $19.90 (InVideo Plus cobra $25
      // sem NENHUM motor premium; Higgsfield entrega clipe cru sem edição).
      outcome: 'Every scene generated by AI — films arrive finished: voice, karaoke captions, score.',
      videosPerMonth: filmsAndScenes('basic'),
      storageLine: '500 projects · forever storage',
      cta: { label: 'Get Started', href: '#checkout' },
      // Em `value` o Creator cede a fita e o realce ao Starter, mas continua
      // na página como o degrau de cima — não some, não muda de preço.
      highlight: !valueRegion,
      popular: !valueRegion,
    },
    {
      tier: 'pro',
      name: 'Studio',
      price: formatCheckoutMoney(currency, getTierPrice('pro', currency, region)),
      priceSub: '/ month',
      // KINEO-STUDIO-400-2026-07-06 — Studio's extra value: more credits, Kling
      // at 1080p, priority render queue, and premium voices.
      // KINEO-REBASE-2026-07-10 — 400 → 200 credits (2:1 rebase, USD unchanged);
      // engines are UNIVERSAL now (no "Studio only" lock — any paid plan).
      // KINEO-PRICING-CLARITY-2026-08-03 — Studio = qualidade cinema (Kling
      // 1080p), não "33% mais créditos". Comparação numérica com o Creator sai
      // do card e vive na tabela comparativa.
      // KINEO-PRICING-V5-2026-08-17 — 320cr: volume + Kling 3 todo mês +
      // 2 Enhance HD grátis (Topaz) + storage ilimitado.
      outcome: 'Volume tier: a Kling 3 film every month, 2 free HD enhances, unlimited forever storage.',
      videosPerMonth: filmsAndScenes('pro'),
      storageLine: 'Unlimited projects · forever storage',
      cta: { label: 'Get Started', href: '#checkout' },
    },
  ]
}

function trackPricingEvent(name: string, metadata?: Record<string, unknown>): void {
  void trackEvent(name, metadata)
}

export default function PricingClient() {
  // [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier via contexto (client).
  const OFFER = useFreeTierOffer()
  const FAQS = buildFaqs(OFFER)

  // Push #099 — open FAQ index for the accordion (null = all collapsed). First
  // question is open by default so the section reads as scannable, not empty.
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  // Push #114 — CTA state. `purchasing` is the tier whose button shows
  // "Loading…" while the API call is in flight; `checkoutError` surfaces
  // any server-returned error below the cards.
  // KINEO-CHECKOUT-IDEMPOTENCY-2026-07-15 — state alone is not a synchronous
  // click lock: a fast double-click can run the handler twice before React
  // paints the disabled button. Keep an immediate ref guard as the client-side
  // half of the server idempotency protection.
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — that ref latch + its pageshow release
  // now live in useCheckoutLaunch, shared with every other checkout surface,
  // and it adds the missing piece: a watchdog that turns a redirect that never
  // happens into a visible English error instead of silence.
  const checkout = useCheckoutLaunch('pricing_page')
  const purchasing = checkout.pending

  // ONDA1 #7 (13/08) — o botao de compra fala a verdade: sem sessao, o rotulo
  // avisa que o proximo passo e criar conta ("Sign up & continue"), em vez de
  // prometer checkout e entregar o seletor do Google sem aviso.
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.session))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  const checkoutError = checkout.error
  const setCheckoutError = checkout.setError
  // Push #171 — show a friendly "already subscribed" info banner instead of
  // silently redirecting to /generate when the API blocks a duplicate purchase.
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency | null>(null)
  // KINEO-REGIONAL-PRICING-2026-08-04 — região separada da moeda. Default
  // 'standard' (preço cheio) até o /api/geo responder: errar para cima é uma
  // surpresa boa no checkout, errar para baixo é uma promessa quebrada.
  const [displayRegion, setDisplayRegion] = useState<PriceRegion>('standard')
  const currencyTrackedRef = useRef(false)
  const mobileStickyRef = useRef<HTMLDivElement | null>(null)
  const [requestedTier, setRequestedTier] = useState<PricingTierHandoffTier | null>(null)
  const [pricingIntentCampaign, setPricingIntentCampaign] = useState<string | null>(null)
  const [checkoutSetupFailure, setCheckoutSetupFailure] = useState<CheckoutSetupFailureReturnContext | null>(null)

  // KINEO-SPRINT-OFFER-2026-07-14 — ROI slider state removed with the widget
  // (unverifiable "estimated views/month" promise — see note at the old block).
  // Push #117 — sticky mobile CTA bar shows after 300px scroll so phone
  // users always have the "Basic / Pro" choice in reach without
  // scrolling back up to the cards.
  const [showStickyCta, setShowStickyCta] = useState<boolean>(false)

  // #381 — monthly vs annual billing toggle. Annual ≈ 2 months free.
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const resolvedCurrency = displayCurrency ?? 'usd'
  const resolvedRegion = displayRegion
  const annualPrices = (['starter', 'basic', 'pro'] as PaidTier[]).reduce((result, tier) => {
    const totalMinor = getAnnualPrice(tier, resolvedCurrency, resolvedRegion)
    result[tier] = {
      total: formatCheckoutMoney(resolvedCurrency, totalMinor),
      perMonth: formatCheckoutMoney(resolvedCurrency, totalMinor / 12),
    }
    return result
  }, {} as Record<PaidTier, { total: string; perMonth: string }>)

  // ═════════════════════════════════════════════════════════════════════════
  // KINEO-REGIONAL-PRICING-2026-08-04 — "preço de entrada" ≠ "preço do 1º mês".
  // ═════════════════════════════════════════════════════════════════════════
  // Fora da região de menor renda os dois são diferentes ($4.90 no 1º mês,
  // $9.90 depois) e a página vende o desconto. Na região `value` eles são o
  // MESMO número, porque o preço de lista já é o preço de entrada — e aí toda
  // frase construída em cima de "first month" tem de mudar de forma, não só de
  // número. Estas duas funções são o único lugar onde essa diferença mora.
  const entryPriceMinor = (tier: 'starter' | 'basic'): number =>
    hasIntroOffer(tier, resolvedCurrency, resolvedRegion)
      ? getIntroPrice(tier, resolvedCurrency, resolvedRegion)
      : getTierPrice(tier, resolvedCurrency, resolvedRegion)

  const entryPriceLabel = (tier: 'starter' | 'basic'): string =>
    formatCheckoutMoney(resolvedCurrency, entryPriceMinor(tier))

  const starterMonthlyLabel = formatCheckoutMoney(
    resolvedCurrency,
    getTierPrice('starter', resolvedCurrency, resolvedRegion),
  )
  const headline = hasIntroOffer('starter', resolvedCurrency, resolvedRegion)
    ? `Start for ${entryPriceLabel('starter')}. Keep creating for ${starterMonthlyLabel}/mo.`
    // Sem intro o gancho não é "o 1º mês é barato", é "TODO mês é barato" — o
    // que, na região, é literalmente verdade e é o argumento mais forte.
    : `${starterMonthlyLabel}/mo. Every month, not just the first.`

  // Conversion — exit-intent modal extracted to <ExitIntentOffer />
  // (components/ExitIntentOffer.tsx): Starter Pack rescue offer, once per
  // session, desktop mouseleave + mobile inactivity/scroll-up triggers.

  // ═══ KINEO-PROMO-CONTRADICTS-PAGE-2026-08-13 ══════════════════════════════
  //
  // Quem chega aqui com `?promo=` veio de um e-mail de win-back que prometeu um
  // desconto de VÁRIOS meses. A letra miúda desta página afirma o contrário —
  // "first month is discounted … both renew at the full monthly price in 30
  // days" — e afirma também um grant menor no 1º mês. As DUAS são falsas para
  // essa pessoa, e são verificáveis por ela na tela seguinte:
  //
  //   · duração — `/api/stripe/checkout` resolve o `?promo=` ANTES do intro
  //     (`intro && !resolvedPromo`, linha ~1010): o cupom do e-mail vence, e a
  //     duração dele é a do cupom, não os 30 dias do intro;
  //   · créditos — `plan_credits` só cai para `INTRO_CREDITS[tier]` DENTRO do
  //     bloco do intro (linha ~1051). Sem intro, quem assina Creator com promo
  //     recebe os 150 do plano no mês 1, não os 50 que esta linha promete.
  //
  // Ou seja: a página SUBVENDE exatamente a oferta que o e-mail acabou de
  // fazer, para a única coorte com intenção comprovada (a de trial expirado,
  // que gastou 18,8 dos 40 créditos e converteu 1 em 32).
  //
  // A correção é DEIXAR DE AFIRMAR, não afirmar outra coisa: nenhum percentual,
  // nenhum nome de cupom e nenhuma duração entram na página — a ordem do
  // fundador (06/08) é que o 50% off existe SÓ dentro dos e-mails D5/D10, nunca
  // em superfície pública. A linha neutra que fica no lugar é verdadeira para
  // qualquer código, inclusive um inválido, porque quem exibe o valor final é o
  // Stripe. Ver PROMPT-DIARIO 06/08 §3: afirmação sobre estado nunca é impressa
  // incondicionalmente.
  //
  // Lido em `useEffect` (e não no render) de propósito: `window.location` no
  // corpo do componente é hydration mismatch, e `useSearchParams()` exigiria
  // Suspense em volta desta página.
  const [arrivedWithPromo, setArrivedWithPromo] = useState(false)

  // KINEO-PRICING-VIEW-2026-07-15 — admin/funnel and admin/metrics already
  // query this event; the pricing page simply never emitted it before.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const intentCampaign = sanitizePricingIntentCampaign(params.get('intent_campaign'))
    setPricingIntentCampaign(intentCampaign)
    setRequestedTier(sanitizePricingTierHandoff(params.get('tier')))
    if (intentCampaign) rememberSignupCampaign(intentCampaign)
    setArrivedWithPromo((params.get('promo') ?? '').trim().length > 0)
    void trackEvent('pricing_view', intentCampaign ? { source: intentCampaign } : undefined)
  }, [])

  // KINEO-PRICING-TIER-HANDOFF-2026-08-31 — warm recovery links already name
  // a plan and carry ?tier=starter|basic|pro. Pricing used to discard that
  // decision and restart the buyer at a generic three-card comparison. Keep
  // every option visible, but bring the requested card into view and measure
  // only after at least 35% of that card was actually exposed.
  useEffect(() => {
    if (!requestedTier) return

    const card = document.getElementById(pricingTierCardId(requestedTier))
    if (!card) return

    const params = new URLSearchParams(window.location.search)
    const attribution = buildPricingTierHandoffAttribution({
      requestedTier,
      intentCampaign: params.get('intent_campaign'),
    })
    if (!attribution) return

    const storageKey = pricingTierHandoffStorageKey(attribution)
    let eventSettled = false
    let observer: IntersectionObserver | null = null

    const visibleRatio = () => {
      const rect = card.getBoundingClientRect()
      if (rect.height <= 0) return 0
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
      )
      return Math.min(1, visibleHeight / rect.height)
    }

    const revealRequestedCard = () => {
      const explicitHash = window.location.hash
      if (explicitHash && explicitHash !== '#plans') return
      if (visibleRatio() >= 0.35) return
      card.scrollIntoView({ block: 'center', behavior: 'auto' })
    }

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry || eventSettled || entry.intersectionRatio < 0.35) return
      eventSettled = true
      observer?.disconnect()

      try {
        if (sessionStorage.getItem(storageKey) === '1') return
      } catch {
        // Storage is optional; the in-memory guard still prevents remount spam.
      }

      void trackEvent('pricing_tier_intent_viewed', attribution).then((stored) => {
        if (!stored) return
        try {
          sessionStorage.setItem(storageKey, '1')
        } catch {
          // Analytics succeeded; storage failure must not affect pricing.
        }
      })
    }, { threshold: [0.35] })
    observer.observe(card)

    const initialRevealTimer = window.setTimeout(revealRequestedCard, 160)
    // Owner-scoped proof can load above the grid after first paint. One bounded
    // settle pass restores the same target without creating a scroll loop.
    const settledRevealTimer = window.setTimeout(revealRequestedCard, 900)

    return () => {
      window.clearTimeout(initialRevealTimer)
      window.clearTimeout(settledRevealTimer)
      observer?.disconnect()
    }
  }, [requestedTier])

  // Resolve only the display currency. Checkout repeats the lookup on the
  // server and never accepts a currency override from the browser.
  useEffect(() => {
    let cancelled = false

    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('geo lookup failed')
        return response.json() as Promise<{ country?: string; currency?: string; region?: string }>
      })
      .then(({ country, currency, region }) => {
        if (cancelled) return
        const safeCurrency: DisplayCurrency =
          'usd' // KINEO-USD-ONLY-2026-08-19
        const safeRegion = coercePriceRegion(region)
        setDisplayCurrency(safeCurrency)
        setDisplayRegion(safeRegion)
        if (!currencyTrackedRef.current) {
          currencyTrackedRef.current = true
          void trackEvent('pricing_currency_resolved', {
            currency: safeCurrency,
            price_region: safeRegion,
            country: String(country || 'unknown').slice(0, 2).toUpperCase(),
          })
        }
      })
      .catch(() => {
        if (!cancelled) setDisplayCurrency('usd')
      })

    return () => { cancelled = true }
  }, [])

  // Push #173 — iOS Safari blocks window.location.href inside async/await
  // (user gesture chain is severed after the first await). Fix: navigate
  // directly to the GET checkout endpoint which does a server-side 302
  // redirect to Stripe. No fetch(), no await, no gesture breakage.
  function handleBuy(tier: BuyableTier, placement: 'card' | 'mobile_sticky' = 'card') {
    // KINEO-AUTOPILOT-299-2026-07-26 — Autopilot has no annual SKU and no
    // intro month; the server enforces both, this just avoids sending params
    // that would be silently dropped.
    const billingParam = billing === 'annual' && tier !== 'autopilot' ? '&billing=annual' : ''
    // #453 — forward a ?promo= code (e.g. /pricing?promo=FOUNDING50 from the
    // win-back emails) into checkout so the discount auto-applies on plan click.
    const pricingParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const promo = pricingParams?.get('promo') ?? null
    const promoParam = promo ? `&promo=${encodeURIComponent(promo)}` : ''
    const rawIntentCampaign = pricingParams?.get('intent_campaign')
    const intentCampaign = sanitizePricingIntentCampaign(rawIntentCampaign)
    const intentParam = intentCampaign ? `&intent_campaign=${encodeURIComponent(intentCampaign)}` : ''
    // KINEO-INTRO-MONTH-2026-07-13 — Starter/Creator monthly levam o 1º mês
    // com desconto ($4.90/$9.90). O servidor valida elegibilidade (1 por
    // cliente) e ignora o param em annual/pro — aqui só pedimos.
    const introParam = billing === 'monthly' && (tier === 'starter' || tier === 'basic') ? '&intro=1' : ''
    const effectiveBilling = tier === 'autopilot' ? 'monthly' : billing
    const started = checkout.launch(
      tier,
      `/api/stripe/checkout?tier=${tier}${billingParam}${promoParam}${introParam}${intentParam}`,
      { tier, billing: effectiveBilling, intro: introParam !== '', pricing_surface: 'pricing_page' },
    )
    // A suppressed duplicate click must not double-count the funnel or fire a
    // second TikTok InitiateCheckout.
    if (!started) return
    if (placement === 'mobile_sticky' && tier !== 'autopilot') {
      void trackEvent(
        'pricing_mobile_sticky_checkout_clicked',
        mobileStickyTelemetry({ billing: effectiveBilling, tier: tier as MobileStickyTier }),
      )
    }
    const eventName = tier === 'pro'
      ? 'pro_checkout_clicked'
      : tier === 'starter'
        ? 'starter_checkout_clicked'
        : tier === 'autopilot'
          ? 'autopilot_checkout_clicked'
          : 'basic_checkout_clicked'
    const attribution = buildPricingPlanChoiceAttribution({
      tier,
      billing: effectiveBilling,
      intentCampaign: rawIntentCampaign,
    })
    trackPricingEvent(eventName, attribution ?? undefined)
    // KINEO-PILOT-99-2026-07-26 — o guard `if (tier !== 'autopilot')` saiu: a
    // união em lib/trackClick.ts já aceita 'autopilot', então o SKU de maior
    // ARPU deixa de ser invisível em /admin/click-stats.
    trackCheckoutClick(tier)
    // #457 — TikTok Pixel: InitiateCheckout = purchase intent (warmest retargeting audience)
    try {
      const ttq = (window as unknown as { ttq?: { track: Function } }).ttq
      if (ttq && typeof ttq.track === 'function') ttq.track('InitiateCheckout', { content_name: tier })
    } catch { /* non-blocking */ }
  }

  // KINEO-PILOT-99-2026-07-26 — o piloto é uma compra ÚNICA (?pack=…), não um
  // tier de assinatura, então não passa por handleBuy: nada de billing, promo,
  // intro ou annual se aplica a ele. Mesmo launcher, mesma trava anti-duplo-clique.
  function handleBuyAutopilotPilot() {
    const started = checkout.launch(
      'autopilot_pilot',
      '/api/stripe/checkout?pack=autopilot_pilot',
      { sku: 'autopilot_pilot', pricing_surface: 'pricing_page' },
    )
    if (!started) return
    trackPricingEvent('autopilot_pilot_checkout_clicked')
    trackCheckoutClick('autopilot_pilot')
    try {
      const ttq = (window as unknown as { ttq?: { track: Function } }).ttq
      if (ttq && typeof ttq.track === 'function') ttq.track('InitiateCheckout', { content_name: 'autopilot_pilot' })
    } catch { /* non-blocking */ }
  }

  function handleCheckoutSetupRetry() {
    if (!checkoutSetupFailure) return
    const telemetry = checkoutSetupFailureTelemetry(checkoutSetupFailure)
    const retryKey = `setup_retry:${checkoutSetupFailure.selection}`
    const started = checkout.launch(
      retryKey,
      checkoutSetupFailure.destination,
      { ...telemetry, pricing_surface: 'checkout_setup_failure_return' },
    )
    if (!started) return
    void trackEvent('checkout_setup_failure_retry_clicked', telemetry)
  }

  // Push #173 — read checkout_error / already_subscribed from URL params
  // set by the GET checkout handler when it can't create a Stripe session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const err = params.get('checkout_error')
    // URLSearchParams already decodes values. Calling decodeURIComponent a
    // second time turned a legitimate '%' in any provider message into a
    // URIError and replaced the checkout explanation with a page crash.
    if (err) setCheckoutError(err)
    if (params.get('already_subscribed') === '1') setAlreadySubscribed(true)

    const setupFailure = readCheckoutSetupFailureFromSearch(window.location.search)
    setCheckoutSetupFailure(setupFailure)
    if (!setupFailure) return

    const storageKey = checkoutSetupFailureStorageKey(setupFailure)
    try {
      if (sessionStorage.getItem(storageKey) === '1') return
    } catch {
      // Analytics dedupe is optional; the retry itself must stay available.
    }

    void trackEvent(
      'checkout_setup_failure_return_viewed',
      checkoutSetupFailureTelemetry(setupFailure),
    ).then((stored) => {
      if (!stored) return
      try {
        sessionStorage.setItem(storageKey, '1')
      } catch {
        // Event is stored; unavailable browser storage changes no behavior.
      }
    })
  }, [])

  useEffect(() => {
    if (!showStickyCta || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
    const node = mobileStickyRef.current
    if (!node) return

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.6) return
      const storageKey = mobileStickyExposureKey(billing)
      try {
        if (sessionStorage.getItem(storageKey)) {
          observer.disconnect()
          return
        }
        sessionStorage.setItem(storageKey, '1')
      } catch {
        // Privacy modes can deny storage; visibility and checkout stay usable.
      }
      void trackEvent('pricing_mobile_sticky_billing_viewed', mobileStickyTelemetry({ billing }))
      observer.disconnect()
    }, { threshold: 0.6 })

    observer.observe(node)
    return () => observer.disconnect()
  }, [billing, showStickyCta])

  // Push #117 — show the sticky mobile CTA only after the user scrolls
  // past the hero. We pin the listener to passive so it never blocks
  // scroll on slower phones.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => {
      setShowStickyCta(window.scrollY > 300)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans">
      {/* Subtle cyber-blue glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-[300px] -right-[200px] h-[800px] w-[800px] rounded-full opacity-[0.07]"
        style={{ background: '#2997ff', filter: 'blur(140px)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-[400px] -left-[200px] h-[700px] w-[700px] rounded-full opacity-[0.05]"
        style={{ background: '#2997ff', filter: 'blur(160px)' }}
      />

      {/* ───────── Top Nav (simple) ───────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#161618]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#161618] border border-[#2997ff]/40 text-lg shadow-[0_0_14px_rgba(41,151,255,.35)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#2997ff" stroke="#2997ff" strokeWidth="0.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-extrabold tracking-tight text-white">
                Kineo
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[.04] transition"
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* ───────── Exit-intent modal (Starter Pack rescue offer) ───────── */}
      <ExitIntentOffer />
      {/* KINEO-WELCOME20-2026-08-25 — quem está OLHANDO O PREÇO recebe o
          convite com nome mais rápido (1.5s): é o momento de maior intenção. */}
      <WelcomeOfferModal delayMs={1500} surface="pricing" />

      {/* ───────── Pricing ───────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <div className="mb-10 text-center">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#2997ff]">
            Pricing
          </div>
          <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl text-[#f5f5f7]">
            {displayCurrency ? headline : 'Simple monthly plans. Cancel anytime.'}
          </h1>
          {/* KINEO-SHOWCASE-2026-07-10 — Joseph: parágrafo comparativo removido
              ("texto sujo") — os CARDS de preço são a estrela do hero. */}

          {/* ROBO1-PRICE-2026-06-28 — honest trust row. Replaced the
              unverifiable "300+ Shorts created" + "4.8 / 5 average rating"
              with real, checkable signals: 3 watermarked Fast videos / 24h,
              cancel anytime, and the 7-day money-back guarantee. */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {/* KINEO-PRICING-CLARITY-2026-08-03 — 3 selos viraram 2. Excesso de
                reversão de risco lê como insegurança, não como confiança; e o
                "3 grátis / 24h" saiu daqui porque a cota do free não é argumento
                para quem já está decidindo QUAL plano pagar. */}
            {['Cancel anytime', '7-day money-back guarantee'].map((label) => (
              <div key={label} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#86868b]">
                <span aria-hidden="true" style={{ color: '#2997ff' }}>✓</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* KINEO-ORDEM5-PROOF-2026-08-03 — Ordem 5: prova social com números
              REAIS no ponto de decisão. Cada número é conferível no banco COM o
              filtro de contas internas (04/08 14:50Z: 915 perfis ext, 456 vídeos
              completed ext — era 896/432 em 03/08). Piso hardcoded ("+") —
              atualizar semanalmente com o placar, nunca inflar. TAAFT entra como
              "featured" (fato), não como nota. Métrica: pricing_view → checkout_started. */}
          <p className="mt-3 text-center text-[12px] font-semibold text-[#6e6e73]">
            900+ creators · 450+ Shorts rendered · featured on There&apos;s An AI For That
          </p>
        </div>

        {/* KINEO-SPRINT-OFFER-2026-07-14 — ROI slider REMOVED. The
            "estimated N views/month" math and "any plan pays for itself
            with just 1 viral Short" were unverifiable promises (nobody can
            guarantee views) sitting right above the buy buttons — classic
            trust-killer for the skeptical buyer. The plan cards remain the
            offer; the owner-scoped journey bridge below only appears when it
            can ground that offer in the visitor's actual product experience. */}

        <PricingSavedCheckout />
        <PricingJourneyProof signedIn={signedIn} intentCampaign={pricingIntentCampaign} />

        {/* Push #267 — Free banner removed with Free card */}

        {/* #381 — monthly / annual billing toggle */}
        <div className="mb-7 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-4 py-1.5 text-[13px] font-extrabold transition ${
                billing === 'monthly' ? 'bg-[#2997ff] text-white' : 'text-[#86868b] hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold transition ${
                billing === 'annual' ? 'bg-[#2997ff] text-white' : 'text-[#86868b] hover:text-white'
              }`}
            >
              Annual
              <span className="rounded-full bg-[#2997ff]/20 px-2 py-0.5 text-[10px] font-black text-[#2997ff]">
                2 MONTHS FREE
              </span>
            </button>
          </div>
        </div>
        <p className="-mt-4 mb-7 text-center text-[11.5px] font-semibold text-[#86868b]">
          {CHECKOUT_CURRENCY_DISCLOSURE}
        </p>

        {/* KINEO-SPRINT-OFFER-2026-07-14 — SINGLE OFFER cleanup. Three stacked
            competing offers used to sit here (FOUNDING50 "50% for life" banner,
            the Starter-intro strip, and — pre-13/07 — the $4.90 one-time pack).
            A buyer arriving saw 3 different "deals" before the cards. Now the
            plan cards ARE the offer (intro badge lives on each card); the only
            thing above them is the honest free-video nudge. The one-time pack
            endpoint (?pack=starter) still exists for the watermark unlock flow —
            it just has no public CTA here. */}
        <div
          className="mx-auto mb-7 max-w-2xl rounded-2xl px-5 py-4 text-center"
          style={{ background: 'rgba(41,151,255,0.07)', border: '1px solid rgba(41,151,255,0.4)' }}
        >
          <p className="text-[12.5px] font-semibold text-[#86868b]">
            Not sure yet? <Link href="/signup" className="font-bold text-[#2997ff] hover:text-[#2997ff]">{ft(OFFER, 'Create up to 3 Fast videos free every 24h', 'Start free — your first video is on us')}</Link>{ft(OFFER, ' — no card; download and share with a watermark.', `; new accounts get ${TRIAL_GRANT_CREDITS_COPY} credits with every engine unlocked, no card — films are watermarked until you upgrade.`)}
          </p>
          <CostCalculatorLink
            placement="pricing_pre_cards"
            className="mt-2 inline-block text-[12.5px] font-extrabold text-[#2997ff] hover:underline"
          >
            Calculate the exact monthly cost for your output →
          </CostCalculatorLink>
        </div>

        {/* KINEO-HOME-POLISH-R2-2026-07-27 — so forma. gap 5 -> 7 e um respiro
            de topo (pt-5) para as fitas "Most Popular"/"Best Value", que ficam
            em -top-3 e antes encostavam no bloco de cima. Nenhum numero,
            rotulo ou plano mudou. */}
        <div id="plans" className="scroll-mt-24 grid grid-cols-1 gap-7 md:grid-cols-3 max-w-5xl mx-auto pt-5 items-stretch">
          {buildPricing(resolvedCurrency, resolvedRegion).map((p) => {
            const isPaid = p.tier === 'starter' || p.tier === 'basic' || p.tier === 'pro'
            // KINEO-2026-07-06 — cleaner pricing UI: same blue CTA on every card,
            // labeled with the plan name ("Choose Starter/Creator/Studio") so the
            // action is specific. The card displays; the button acts.
            const ctaLabel = `Choose ${p.name}`
            // KINEO-HOME-POLISH-R2-2026-07-27 — SO FORMA, nenhum numero ou palavra.
            // O plano recomendado usava exatamente o mesmo fundo (#161618) dos
            // outros dois: o unico sinal era a borda azul, que some assim que o
            // visitante rola. Agora ele usa as tres formas que um plano
            // recomendado usa para vencer — fundo proprio em gradiente, um nivel
            // a mais de elevacao, e um passo de escala no desktop. Os outros dois
            // ganharam a mesma sombra de card do resto do sistema, para pararem
            // de flutuar sem peso sobre o preto.
            return (
              <div
                key={p.tier}
                id={isPaid ? pricingTierCardId(p.tier as PricingTierHandoffTier) : undefined}
                data-pricing-tier-requested={requestedTier === p.tier ? 'true' : undefined}
                className={`group relative flex flex-col rounded-2xl border p-7 transition-all duration-200 ${
                  p.highlight
                    ? 'border-[#2997ff] bg-gradient-to-b from-[#1e1e22] to-[#151517] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(41,151,255,0.35),0_24px_60px_-24px_rgba(41,151,255,0.5)] md:-translate-y-2 md:scale-[1.025]'
                    : 'border-white/[0.08] bg-[#161618] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_18px_44px_-30px_rgba(0,0,0,0.95)] hover:-translate-y-1 hover:border-[#2997ff]/60 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_26px_60px_-28px_rgba(0,0,0,1)]'
                } ${requestedTier === p.tier ? 'ring-2 ring-[#62b3ff] ring-offset-4 ring-offset-black' : ''} scroll-mt-24`}
              >
                {/* Push #116 — Pro now carries the amber "MOST POPULAR"
                    flag instead of the blue "Best Value" pill. Popular
                    takes precedence when both are set so we don't paint
                    two stacked badges. */}
                {/* ONDA6 #9 (14/08) — hierarquia estava INVERTIDA: o selo mais
                    importante (Most Popular) era translucido e o secundario
                    (Best Value) era azul solido. Trocados; emoji fora (nenhum
                    selo da landing tem emoji). */}
                {requestedTier === p.tier ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2997ff] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-[0_6px_20px_-6px_rgba(41,151,255,.85)]">
                    Your choice
                  </div>
                ) : p.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2997ff] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-[0_6px_20px_-6px_rgba(41,151,255,.85)]">
                    Most Popular
                  </div>
                ) : p.highlight ? (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.12em]"
                    style={{
                      background: 'rgba(41,151,255,.15)',
                      border: '1px solid rgba(41,151,255,.4)',
                      color: '#2997ff',
                    }}
                  >
                    Best Value
                  </div>
                ) : null}
                <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
                  {p.name}
                </div>
                {/* ONDA6 #10 (14/08) — o card abria direto no preco; agora tem
                    o nome grande como na landing (.nm). */}
                <div className="mt-1.5 text-[1.34rem] font-semibold tracking-[-.018em] text-[#f5f5f7]">
                  {p.name}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[2.4rem] font-black leading-none tracking-tight text-[#f5f5f7]">
                    {billing === 'annual'
                      ? annualPrices[p.tier as PaidTier].perMonth
                      : p.price}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] font-semibold text-[#2997ff]">
                  {billing === 'annual'
                    ? `/ month · billed annually (${displayCurrency ? annualPrices[p.tier as PaidTier].total : '—'}/yr)`
                    : p.priceSub}
                </div>
                {/* KINEO-INTRO-MONTH-2026-07-13 — badge do 1º mês com desconto
                    (monthly only). Starter $4.90 / Creator $9.90 na 1ª fatura;
                    o checkout aplica via ?intro=1 (handleBuy). */}
                {/* KINEO-SPRINT-OFFER-2026-07-14 — renewal made explicit on the
                    badge itself (price + when it renews + cancel anytime), so
                    the intro can never read as the permanent price. */}
                {/* ═══════════════════════════════════════════════════════
                    KINEO-PRICING-MINIMAL-2026-08-03 — CARD DE 4 BLOCOS.

                    Decisão do fundador ao ver o card lado a lado com uma versão
                    enxuta: "gostei mais do modelo mais simples, com o número de
                    vídeos que gera em cada card".

                    O card agora responde só as duas perguntas que alguém faz em
                    5 segundos no celular: QUANTO CUSTA e QUANTO EU LEVO. Preço →
                    vídeos/mês → uma frase do que muda → botão → letra miúda.

                    O que saiu (e para onde): a lista de 4 bullets desce para a
                    tabela "ver comparação completa" (é lá que o comprador que
                    pesquisa a fundo vai olhar, e é onde a mecânica de crédito
                    pertence); o selo do 1º mês vira a linha miúda sob o botão,
                    onde o preço já foi decidido. Nada foi deletado da página —
                    só parou de disputar atenção no instante da decisão. */}
                {'videosPerMonth' in p && p.videosPerMonth ? (
                  <div className="mt-5 text-[17px] font-black tracking-tight text-[#2997ff]">
                    {p.videosPerMonth}
                  </div>
                ) : null}
                {'outcome' in p && p.outcome ? (
                  <p className="mt-1.5 mb-3 text-[13px] leading-relaxed text-[#a1a1a8]">
                    {p.outcome}
                  </p>
                ) : null}
                {/* ═══ KINEO-CARD-QUANTIDADES-2026-08-25 (pedido do fundador,
                    referência Higgsfield) — "quando a pessoa bater o olho, ela
                    vê que está comprando BASTANTE coisa". A linha genérica
                    "all included" vira NÚMEROS por tier, todos derivados de
                    TIER_CREDITS ÷ creditCostFor (a mesma régua do caixa, #296)
                    — se um preço de motor mudar, os cards mudam sozinhos.
                    "up to" nos itens de custo variável (imagem 1-5cr) para o
                    número grande ser honesto. */}
                {isPaid && 'tier' in p && (p.tier === 'starter' || p.tier === 'basic' || p.tier === 'pro') && (() => {
                  const cr = p.tier === 'starter' ? TIER_CREDITS.starter : p.tier === 'basic' ? TIER_CREDITS.basic : TIER_CREDITS.pro
                  // ═══ KINEO-CARD-PILHA-2026-08-25 (fundador, referência
                  // Higgsfield v2: "encher os cards, ficar maior, a pessoa dar
                  // mais valor ao que está comprando") — cada MOTOR com nome e
                  // quantidade mensal, e as linhas que NÃO cabem no tier
                  // aparecem BLOQUEADAS com o plano que destrava (inveja
                  // vende; esconder o topo do catálogo não). Tudo derivado de
                  // TIER_CREDITS ÷ creditCostFor — régua do caixa, #296.
                  const costFast = creditsPerReferenceVideo('fast')
                  const costSeed = creditsPerReferenceVideo('cinematic_ai')
                  const costH3 = creditsPerReferenceVideo('cinematic_h3')
                  const costKling25 = creditsPerReferenceVideo('cinematic_kling')
                  const costVeo = creditsPerReferenceVideo('cinematic_veo')
                  const costFlag = creditsPerReferenceVideo('cinematic_hollywood')
                  const costPres = creditsPerReferenceVideo('presenter')
                  const tierFor = (cost: number) => cost <= TIER_CREDITS.starter ? 'Starter' : cost <= TIER_CREDITS.basic ? 'Creator' : 'Studio'
                  const engineRows: { ic: string; name: string; cost: number; note?: string }[] = [
                    { ic: '⚡', name: 'Kineo 1 quick videos', cost: costFast },
                    { ic: '🎬', name: 'Seedance 1.5 films', cost: costSeed },
                    { ic: '🎥', name: 'MiniMax H3 films · lip-sync', cost: costH3 },
                    { ic: '🎞', name: 'Kling 2.5 films', cost: costKling25 },
                    { ic: '🧑‍🎤', name: 'AI Presenter videos', cost: costPres },
                    { ic: '🌐', name: 'Veo 3.1 films', cost: costVeo },
                    { ic: '🏆', name: S25_PUBLIC ? 'Kling 3 · Omni Flash · Seedance 2.5' : 'Kling 3 · Omni Flash (#1 ranked)', cost: costFlag },
                  ]
                  return (
                    <div className="mb-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[.14em] text-[#5a5a60]">
                        Your {cr} credits every month =
                      </div>
                      <div className="flex flex-col gap-[3px]">
                        {engineRows.map((r) => {
                          const n = Math.floor(cr / r.cost)
                          const locked = n < 1
                          return (
                            <span
                              key={r.name}
                              className="flex items-baseline justify-between text-[11.5px] font-semibold"
                              style={{ color: locked ? '#5a5a60' : '#c7c7cc' }}
                            >
                              <span>{r.ic} {r.name}</span>
                              {locked ? (
                                <span className="text-[9.5px] font-black uppercase" style={{ color: '#fb923c' }}>{tierFor(r.cost)} plan</span>
                              ) : (
                                <b style={{ color: '#2997ff' }}>{n}×</b>
                              )}
                            </span>
                          )
                        })}
                        <span className="flex items-baseline justify-between text-[11.5px] font-semibold text-[#c7c7cc]">
                          <span>🎨 AI images · 6 engines</span><b style={{ color: '#2997ff' }}>up to {cr}</b>
                        </span>
                        <span className="flex items-baseline justify-between text-[11.5px] font-semibold text-[#c7c7cc]">
                          <span>🎙 AI voiceovers · 4 voices</span><b style={{ color: '#2997ff' }}>{Math.floor(cr / 2)}×</b>
                        </span>
                        <span className="flex items-baseline justify-between text-[11.5px] font-semibold text-[#c7c7cc]">
                          <span>✨ HD Enhance{p.tier === 'pro' ? ' (+2 free)' : ''}</span><b style={{ color: '#2997ff' }}>{Math.floor(cr / 10)}×</b>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-[2px] text-[10.5px] text-[#86868b]">
                        <span>✓ 1080×1920 Full HD master on every film</span>
                        <span>✓ Script, voiceover, karaoke captions &amp; soundtrack included</span>
                        <span>✓ Characters that speak your lines with lip sync (Kling 3 · H3)</span>
                        <span>✓ Character Lock — same face in every video</span>
                        <span>✓ Animate a Photo · AI Thumbnails · Viral Now topics</span>
                      </div>
                    </div>
                  )
                })()}
                {isPaid && (
                  <p className="mb-2 text-[10.5px] text-[#5a5a60]">
                    Mix &amp; match — one credit pool covers everything
                  </p>
                )}
                {/* KINEO-PRICING-V5-2026-08-17 — storage é entitlement visível */}
                {'storageLine' in p && p.storageLine ? (
                  <p className="mb-6 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#86868b]">
                    🗂 {p.storageLine}
                  </p>
                ) : null}
                {/* Push #114 — paid tiers go through /api/stripe/checkout
                    (button + POST) so the route can pick BRL based on
                    x-vercel-ip-country. Free tier keeps the plain anchor
                    to /signup. */}
                <button
                  type="button"
                  disabled={purchasing === p.tier}
                  onClick={() => handleBuy(p.tier as PaidTier)}
                  className="mt-auto block w-full rounded-xl bg-[#2997ff] px-4 py-3 text-center text-[14px] font-extrabold text-white shadow-[0_8px_24px_rgba(41,151,255,.35)] transition hover:bg-[#1f86ee] hover:shadow-[0_10px_30px_rgba(41,151,255,.45)] disabled:opacity-60"
                >
                  {purchasing === p.tier ? 'Opening secure checkout…' : signedIn === false ? 'Sign up & continue →' : `${ctaLabel} →`}
                </button>
                {/* PAYPAL-2026-07-06 — alternate rail for international buyers
                    (US audit 06/07: USD abandoners want a no-card option).
                    Same GET-redirect pattern as handleBuy, zero Stripe changes.
                    USD-only — PayPal converts for the buyer.
                    Hidden until verified working (PAYPAL_ENABLED). */}
                {PAYPAL_ENABLED && isPaid && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      trackPricingEvent(`${p.tier}_paypal_checkout_clicked`)
                      const billingParam = billing === 'annual' ? '&billing=annual' : ''
                      window.location.href = `/api/paypal/checkout?tier=${p.tier}${billingParam}`
                    }}
                    className="mt-2 block w-full rounded-xl border border-white/[0.08] px-4 py-2 text-center text-[12.5px] font-bold text-[#f5f5f7] transition hover:bg-white/5 hover:border-[#2997ff]/40"
                  >
                    or pay with <span style={{ color: '#009cde', fontWeight: 900 }}>Pay</span><span style={{ color: '#2997ff', fontWeight: 900 }}>Pal</span> (USD)
                  </button>
                )}
                {isPaid && (
                  <p className="mt-2 text-center text-[11px] font-semibold text-[#a1a1a8]">
                    {CHECKOUT_PAYMENT_GUIDANCE_COMPACT}
                  </p>
                )}
                {/* Marker: KINEO-CHECKOUT-TRUST-2026-07-05 — trust cues at the buy button (billed by Kineo after Stripe name fix) */}
                {isPaid && (
                  <p className="mt-1.5 text-center text-[11.5px] font-semibold leading-relaxed text-[#86868b]">
                    {billing === 'monthly' && (p.tier === 'starter' || p.tier === 'basic') && displayCurrency
                      && hasIntroOffer(p.tier as 'starter' | 'basic', resolvedCurrency, resolvedRegion)
                      ? `First month ${entryPriceLabel(p.tier as 'starter' | 'basic')} · cancel anytime`
                      : 'Cancel anytime'}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* ONDA1 #11 (13/08) — o erro de checkout aparece ONDE a pessoa esta
            olhando (logo abaixo dos planos), nao 250 linhas depois. */}
        {checkoutError && checkoutSetupFailure ? (
          <div
            role="alert"
            className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[#2997ff]/35 bg-[#2997ff]/[0.08] px-5 py-4 text-center"
          >
            <p className="text-[13px] font-bold text-[#f5f5f7]">{checkoutError}</p>
            <p className="mt-1 text-[12px] font-medium text-[#a1a1a8]">
              No payment was created. Retry the same selection when you are ready.
            </p>
            <button
              type="button"
              disabled={Boolean(purchasing)}
              onClick={handleCheckoutSetupRetry}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2997ff] px-5 text-[13px] font-extrabold text-white transition hover:bg-[#147ce5] disabled:cursor-wait disabled:opacity-60"
            >
              {purchasing === `setup_retry:${checkoutSetupFailure.selection}`
                ? 'Opening secure checkout…'
                : 'Try secure checkout again'}
            </button>
          </div>
        ) : checkoutError ? (
          <p role="alert" className="mx-auto mt-4 max-w-2xl text-center text-[13px] font-semibold text-[#f87171]">
            {checkoutError}
          </p>
        ) : null}

        {/* KINEO-CEO-HOUR-2026-08-17 (#5) — o tradutor de creditos VISIVEL,
            nao so no FAQ: uma fita de precos por resultado. */}
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/[0.08] bg-[#131316] px-5 py-4">
          <p className="mb-2.5 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#2997ff]">What one credit buys</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12.5px] font-semibold text-[#a1a1a8]">
            <span>🎬 Film (Seedance) — <b className="text-[#f5f5f7]">{creditsPerReferenceVideo('cinematic_ai')} cr</b></span>
            <span>🎥 Kling 2.5 — <b className="text-[#f5f5f7]">{creditsPerReferenceVideo('cinematic_kling')} cr</b></span>
            <span>🌐 Veo 3.1 — <b className="text-[#f5f5f7]">{creditsPerReferenceVideo('cinematic_veo')} cr</b></span>
            <span>🎞 Kling 3 — <b className="text-[#f5f5f7]">{creditsPerReferenceVideo('cinematic_hollywood')} cr</b></span>
            <span>🖼 Image — <b className="text-[#f5f5f7]">1-5 cr</b></span>
            <span>🎙 Voiceover — <b className="text-[#f5f5f7]">1-2 cr</b></span>
            <span>✨ HD Enhance — <b className="text-[#f5f5f7]">10 cr</b></span>
          </div>
        </div>

        {/* [KINEO-COMMERCIAL-LICENSE-2026-08-12] — a primeira pergunta de
            qualquer agência ("posso vender isso pro meu cliente?") não tinha
            resposta em lugar nenhum desta página. A linha abaixo NÃO promete
            nada além do que os /terms já concedem hoje: uso comercial (seção
            2), propriedade do output (seções 3 e 5) — e diz o limite que a
            MESMA seção 5 impõe (não revender o Serviço em si). Vale para todos
            os planos, por isso vive abaixo da grade inteira e não dentro de um
            card. Sem preço, sem desconto, sem entitlement: só licença. */}
        <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] font-semibold leading-relaxed text-[#86868b]">
          <span aria-hidden="true" style={{ color: '#2997ff' }}>✓</span> Commercial use is included
          on every plan: the videos you generate are yours to post, monetize or deliver to a client.
          What you cannot resell is Kineo itself —{' '}
          <Link href="/terms" className="font-bold text-[#2997ff] hover:underline">
            see the terms
          </Link>
          .
        </p>

        <div id={PRICING_BUSINESS_PATH_TARGET_ID} className="mx-auto max-w-3xl">
          <PricingBusinessPathTelemetry />
          <AgencyVolumeBridge entry="pricing" />
        </div>

        {/* KINEO-PRICING-CLARITY-2026-08-03 — TODA a letra miúda que saiu dos
            cards vive aqui, uma vez só, abaixo da grade. Mantém a divulgação
            obrigatória (renovação + grant menor no 1º mês, proteção contra
            chargeback) sem poluir a decisão. */}
        {/* KINEO-PROMO-CONTRADICTS-PAGE-2026-08-13 — ver o bloco de comentário
            em `arrivedWithPromo`. Com um `?promo=` na URL o intro não é o que
            se aplica, então esta letra miúda deixa de ser divulgação e vira
            afirmação falsa sobre duração E sobre créditos do 1º mês. */}
        {billing === 'monthly' && !arrivedWithPromo && (
          <p className="mx-auto mt-5 max-w-2xl text-center text-[11.5px] leading-relaxed text-[#86868b]">
            Plans renew monthly — cancel anytime. Starter includes{' '}
            {TIER_CREDITS.starter} credits a month and Creator {TIER_CREDITS.basic};
            credits reset each month (no rollover).
          </p>
        )}
        {billing === 'monthly' && arrivedWithPromo && (
          <p
            className="mx-auto mt-5 max-w-2xl rounded-xl px-4 py-3 text-center text-[13px] font-bold leading-relaxed"
            style={{ background: 'rgba(52,211,153,.10)', border: '1px solid rgba(52,211,153,.4)', color: '#34d399' }}
          >
            {/* 2ª passada: a 1ª versão dizia "your code IS APPLIED" — afirmação
                sobre o RESULTADO, falsa se o código estiver expirado ou não
                cobrir o plano clicado. A frase abaixo afirma só o que ESTE
                sistema faz (encaminhar o código) e devolve a verificação para
                onde ela é sempre verdadeira: o total do Stripe antes do
                pagamento. Nenhuma promessa que dependa do Stripe aceitar. */}
            Your code goes to checkout automatically — you&apos;ll see the exact amount
            before you pay. Cancel anytime.
          </p>
        )}

        {/* ══════════════════════════════════════════════════════════════
            KINEO-AUTOPILOT-299-2026-07-26 — DONE-FOR-YOU TIER.

            Deliberately OUTSIDE the 3-card grid. Dropped into that row, $299
            next to $37.90 reads as a mistake. Standing alone, next to what a
            human editing agency charges for the same output, it reads as a
            bargain — which, at 30 Shorts/month, it is:
              VidChops     $495/mo   for 16 shorts  → $30.94 per short
              Tasty Edits  $2,400/mo for 30 shorts  → $80.00 per short
              Kineo Autopilot $299/mo for 30 shorts → $9.97 per short
            The comparison is honest about what differs (an agency gives you a
            human editor; we give you a machine that never misses a day), so
            the claim survives contact with a prospect who checks it.

            Monthly only — no annual toggle applies to this card.
            ══════════════════════════════════════════════════════════════ */}
        {/* KINEO-PAID-NOT-ENTITLED-2026-08-06 — âncora de aterrissagem. Quem
            chega de /autopilot clicando "See what Autopilot adds" já sabe o que
            quer; sem o id ele caía no topo, numa grade de 3 cards que de
            propósito NÃO contém o Autopilot. Mesmo degrau de desistência que o
            #paste do /wall resolveu ontem. */}
        <div id="autopilot" className="mx-auto mt-14 max-w-5xl scroll-mt-24">
          <div className="mb-4 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
              Or don&apos;t make videos at all
            </div>
            <h2 className="mt-2 text-[1.7rem] font-black tracking-tight text-[#f5f5f7]">
              Autopilot — we run your channel for you
            </h2>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
            style={{
              borderColor: 'rgba(41,151,255,0.35)',
              background: 'linear-gradient(135deg, rgba(41,151,255,0.07) 0%, #161618 55%)',
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-[0_4px_18px_rgba(41,151,255,.45)] bg-[#2997ff]">
              Done for you
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[2.8rem] font-black leading-none tracking-tight text-[#f5f5f7]">
                    {displayCurrency ? formatCheckoutMoney(resolvedCurrency, AUTOPILOT_PRICES[resolvedCurrency]) : '—'}
                  </span>
                  <span className="text-[13px] font-semibold text-[#2997ff]">/ month</span>
                </div>
                <p className="mt-3 text-[14px] leading-snug text-[#f5f5f7]">
                  You connect your YouTube channel once. We publish one Short to it
                  every single day — script, voiceover, footage, captions, title,
                  description and upload. You do nothing.
                </p>
                <p className="mt-3 text-[12.5px] leading-snug text-[#86868b]">
                  That is 30 Shorts a month, about{' '}
                  {displayCurrency
                    ? formatCheckoutMoney(resolvedCurrency, Math.round(AUTOPILOT_PRICES[resolvedCurrency] / 30))
                    : 'a tenth of the agency rate'}{' '}
                  each. A human editing agency charges USD $495/month for 16 Shorts, or
                  USD $2,400/month for 30. Autopilot does not give you a human editor —
                  it gives you a machine that has never missed a day.
                </p>
                <p className="mt-3 text-[12px] font-semibold text-[#86868b]">
                  Includes {TIER_CREDITS.autopilot} credits/month for videos you want to
                  make yourself, on any engine. Cancel anytime.
                </p>
              </div>

              <div>
                <ul className="flex flex-col gap-2.5">
                  {[
                    '📺 Your YouTube channel, connected once — we publish directly',
                    '🗓️ One Short published every day, automatically',
                    '🧠 Topics chosen for you and never repeated',
                    '✍️ Script, AI voiceover, footage, captions — all handled',
                    `✨ ${TIER_CREDITS.autopilot} credits/month for your own videos, any engine`,
                    '⏸️ Pause, change the posting time, or cancel whenever you want',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] text-[#f5f5f7]">
                      <span className="mt-[3px] text-[#2997ff]">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={purchasing === 'autopilot'}
                  onClick={() => handleBuy('autopilot')}
                  className="mt-6 block w-full rounded-xl bg-[#2997ff] px-4 py-3.5 text-center text-[14px] font-extrabold text-white shadow-[0_8px_24px_rgba(41,151,255,.35)] transition hover:bg-[#1f86ee] hover:shadow-[0_10px_30px_rgba(41,151,255,.45)] disabled:opacity-60"
                >
                  {purchasing === 'autopilot' ? 'Opening secure checkout…' : 'Start Autopilot →'}
                </button>
                <p className="mt-2 text-center text-[12px] font-semibold text-[#86868b]">
                  🔒 Secure Stripe checkout · billed by Kineo · cancel anytime · 7-day money-back
                </p>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                KINEO-PILOT-99-2026-07-26 — $99 / 7-DAY PILOT.

                Attached to the Autopilot card, not a fourth tier in the grid.
                A fourth column turns a choice into a comparison exercise; this
                is the same product with a smaller first step, so it belongs
                under the product it steps into.

                Why it exists: 713 signups, 3 paying customers, and 82% of
                activated users made exactly one video and left. The $299 buyer
                is not in that base — so the ask is $99 once, and the $299
                upgrade becomes a decision to NOT interrupt something already
                running on the customer's own channel.

                Copy discipline: it promises exactly what the cron delivers —
                7 Shorts, one per day, at the hour the customer picks. No
                "grow your channel", no view counts, no revenue claims.
                ══════════════════════════════════════════════════════════════ */}
            <div
              className="mt-7 rounded-xl border border-dashed p-5 sm:p-6"
              style={{ borderColor: 'rgba(41,151,255,0.42)', background: 'rgba(41,151,255,0.05)' }}
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#2997ff]">
                    Not ready for {displayCurrency ? formatCheckoutMoney(resolvedCurrency, AUTOPILOT_PRICES[resolvedCurrency]) : 'the monthly'}/month?
                  </div>
                  <h3 className="mt-1.5 text-[1.15rem] font-black tracking-tight text-[#f5f5f7]">
                    Try it for one week —{' '}
                    {displayCurrency ? formatCheckoutMoney(resolvedCurrency, AUTOPILOT_PILOT_PRICES[resolvedCurrency]) : '—'}, once
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-snug text-[#f5f5f7]">
                    {AUTOPILOT_PILOT_DAYS} Shorts published to your YouTube channel,
                    one per day, at the time you pick. If you don&apos;t want to
                    continue, the videos are yours and that&apos;s it.
                  </p>
                  <p className="mt-2 text-[12px] leading-snug text-[#86868b]">
                    One-time payment — not a subscription, nothing to cancel. It ends
                    on its own after {AUTOPILOT_PILOT_DAYS} days. A human editing agency
                    would charge you roughly USD $217 for {AUTOPILOT_PILOT_DAYS} Shorts
                    at their $30.94-per-Short rate.
                  </p>
                </div>

                <div className="md:w-[230px]">
                  <button
                    type="button"
                    disabled={purchasing === 'autopilot_pilot'}
                    onClick={handleBuyAutopilotPilot}
                    className="block w-full rounded-xl border border-[#2997ff] px-4 py-3 text-center text-[13.5px] font-extrabold text-[#2997ff] transition hover:bg-[#2997ff] hover:text-white disabled:opacity-60"
                  >
                    {purchasing === 'autopilot_pilot'
                      ? 'Opening secure checkout…'
                      : `Start the ${AUTOPILOT_PILOT_DAYS}-day pilot →`}
                  </button>
                  <p className="mt-2 text-center text-[11.5px] font-semibold text-[#86868b]">
                    🔒 Stripe · one-time · no auto-renew
                  </p>
                </div>
              </div>
            </div>

            <AutopilotBreakEvenCalculator
              currency={resolvedCurrency}
              pending={purchasing}
              onStartMonthly={() => handleBuy('autopilot')}
              onStartPilot={handleBuyAutopilotPilot}
            />
          </div>
        </div>

        {/* ROBO-ENTRY-490 — the one-time $4.90 Starter Pack was moved UP to a
            featured entry offer above the plans; the duplicate secondary button
            that used to sit here was removed to avoid a repeated adjacent CTA. */}

        {/* KINEO-2026-07-06 — Pix/Mercado Pago (BR) section removed at Joseph's request. */}


        {/* Push #171 — "already subscribed" info banner. Shown instead of
            the old silent redirect so users understand their plan is active. */}
        {alreadySubscribed && (
          <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-[#2997ff]/30 bg-[#2997ff]/[0.07] px-5 py-4 text-center">
            <p className="text-[13px] font-bold text-[#2997ff]">
              ✅ You already have an active subscription!
            </p>
            <p className="mt-1 text-[12px] text-[#86868b]">
              Your plan is active. If your credits look low, they may still be syncing.
            </p>
            <a
              href="/studio"
              className="mt-3 inline-block rounded-lg bg-[#2997ff] px-5 py-2 text-[13px] font-extrabold text-white shadow-[0_4px_14px_rgba(41,151,255,.35)] transition hover:bg-[#2997ff]"
            >
              Go to Dashboard →
            </a>
          </div>
        )}

        {/* Push #097 — Guarantee row directly under the plan cards.
            Reinforces buyer confidence between the CTA and the comparison
            table below. */}
        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13.5px] font-bold text-[#f5f5f7]">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[#2997ff]">✓</span> Cancel anytime
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[#2997ff]">✓</span> Instant access
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[#2997ff]">✓</span> 7-day money-back guarantee
          </span>
        </div>

        {/* ROBO1-PRICE-2026-06-28 — replaced three fabricated 5-star
            testimonials (invented names + invented view/subscriber numbers)
            with honest "what you actually get" cards. Same spot, same job:
            answer "does this really work?" before the comparison table —
            but with real product facts instead of fake proof. */}
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            {
              icon: '🎬',
              title: 'A finished Short, per idea',
              body: 'One topic in → hook, script, AI voice, captions and B-roll out. Built deliberately for that idea, not re-clipped from a long video.',
            },
            {
              icon: '🆓',
              title: 'Try before you pay',
              body: ft(OFFER, 'Create, watch, download and share up to 3 watermarked Fast videos every 24h, no card. Free access grants no credits or premium AI Generated videos.', OFFER.copy.planCardBody),
            },
            {
              icon: '📲',
              title: 'Ready to post anywhere',
              body: 'Paid plans export a clean, watermark-free 9:16 MP4 — download and upload straight to YouTube Shorts, TikTok and Reels.',
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
              }}
            >
              <div className="text-[18px] mb-2" aria-hidden>
                {c.icon}
              </div>
              <p className="text-[13.5px] font-bold text-[#f5f5f7] leading-snug mb-1.5">
                {c.title}
              </p>
              <p className="text-[12.5px] text-[#86868b] leading-snug">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        {/* Push #087 — feature comparison table. Makes the Fast vs.
            Cinematic split explicit so users understand exactly what
            they're paying for at each tier. Scrolls horizontally on
            small viewports so the table never breaks layout. */}
        <div className="mt-16">
          <div className="mb-6 text-center">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#2997ff]">
              Compare plans
            </div>
            <h2 className="text-balance text-2xl font-black tracking-tight sm:text-3xl text-[#f5f5f7]">
              What you get at each tier
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#161618]">
            <table className="w-full min-w-[700px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-5 py-4 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
                    Feature
                  </th>
                  <th className="px-5 py-4 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
                    Free
                  </th>
                  {/* KINEO-SPRINT-OFFER-2026-07-14 — column emphasis moved
                      Studio → Creator so the table agrees with the cards
                      ("Most Popular" = Creator is the primary CTA). */}
                  <th className="px-5 py-4 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
                    Starter
                  </th>
                  <th className="px-5 py-4 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#2997ff]">
                    Creator
                  </th>
                  <th className="px-5 py-4 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#86868b]">
                    Studio
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  // #409 — table rebuilt for the 3-tier ladder (was still 2-plan).
                  // KINEO-SHOWCASE-2026-07-10 — synced to the V3C economy
                  // (rebase 2:1 + universal engines): credits 25/150/200, AI Gen
                  // 20cr, Kling 50cr, Presenter 70cr, Hollywood 150cr. Engines
                  // unlock for ANY paid plan (balance permitting).
                  // ⚠️ KINEO-TABELA-2026-08-20 — ESTA TABELA ESTAVA DUAS VERSÕES
                  // ATRÁS e foi pega no teste do fluxo: dizia "Fast 1 cr"
                  // (custa 5 desde hoje) e "Monthly credits 25/150/200" (é
                  // 40/90/180 desde a V6, ontem). Ou seja: a página que mais
                  // vende era a que mais mentia. Agora TODO número aqui deriva
                  // — creditCostFor para motor, TIER_CREDITS para grant. Se um
                  // preço mudar amanhã, esta tabela acompanha sozinha.
                  // A coluna FREE também mudou de significado: o trial agora
                  // abre TODOS os motores (KINEO-TETO), então ela deixa de ser
                  // uma coluna de "—" e passa a dizer o que de fato acontece —
                  // roda tudo, sai com marca d'água.
                  {
                    label: 'Fast mode (smart stock)',
                    free: ft(OFFER, 'Up to 3 / 24h · watermark', '✅ watermark'),
                    starter: `✅ ${creditsPerReferenceVideo('fast')} cr`,
                    basic: `✅ ${creditsPerReferenceVideo('fast')} cr`,
                    pro: `✅ ${creditsPerReferenceVideo('fast')} cr`,
                  },
                  {
                    label: `AI Generated videos (Seedance, ${creditsPerReferenceVideo('cinematic_ai')} cr)`,
                    free: ft(OFFER, '— Paid only', '✅ watermark'),
                    starter: '✅',
                    basic: '✅',
                    pro: '✅',
                  },
                  {
                    label: `MiniMax H3 — cinematic (${creditsPerReferenceVideo('cinematic_h3')} cr)`,
                    free: ft(OFFER, '—', '✅ watermark'),
                    starter: '—',
                    basic: '✅',
                    pro: '✅',
                  },
                  {
                    label: `Cinematic AI videos (Kling, ${creditsPerReferenceVideo('cinematic_kling')} cr)`,
                    free: ft(OFFER, '—', '✅ watermark'),
                    starter: '—',
                    basic: '✅',
                    pro: '✅ 1080p',
                  },
                  {
                    label: `🎬 AI Presenter — talking avatar (${creditsPerReferenceVideo('presenter')} cr)`,
                    free: ft(OFFER, '—', '✅ watermark'),
                    starter: '—',
                    basic: '✅',
                    pro: '✅',
                  },
                  {
                    label: `🎥 Kling 3 — top cinematic (${creditsPerReferenceVideo('cinematic_hollywood')} cr)`,
                    free: ft(OFFER, '—', 'Unlocked · needs credits'),
                    starter: '—',
                    basic: '—',
                    pro: '✅ 1/mo',
                  },
                  {
                    label: '🎭 Saved characters (same face every video)',
                    free: '1',
                    starter: '12',
                    basic: '12',
                    pro: '12',
                  },
                  {
                    label: 'Monthly credits',
                    free: ft(OFFER, '0', `${TRIAL_GRANT_CREDITS_COPY} free, once`),
                    starter: String(TIER_CREDITS.starter),
                    basic: String(TIER_CREDITS.basic),
                    pro: String(TIER_CREDITS.pro),
                  },
                  {
                    label: 'Render time',
                    free: 'Usually 3–7 min (Fast)',
                    starter: 'Usually 3–7 min',
                    basic: '~3-5 min',
                    pro: '~3-5 min',
                  },
                  {
                    label: 'Watermark-free MP4',
                    free: '— Watermarked MP4',
                    starter: '✅',
                    basic: '✅',
                    pro: '✅',
                  },
                  {
                    label: 'Priority support',
                    free: '—',
                    starter: 'Email',
                    basic: 'Email',
                    pro: 'Priority',
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-[#f5f5f7]">{row.label}</td>
                    <td className="px-5 py-3.5 text-center text-[#86868b]">{row.free}</td>
                    <td className="px-5 py-3.5 text-center text-[#86868b]">{row.starter}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-[#2997ff]">{row.basic}</td>
                    <td className="px-5 py-3.5 text-center text-[#86868b]">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-[12px] text-[#86868b]">
            {ft(OFFER, 'Free access lets you create, watch, download and share up to 3 watermarked Fast videos per 24h; it includes no credits or premium AI Generated videos.', OFFER.copy.planCardBody)} Every paid plan unlocks clean, watermark-free MP4s and can access every engine when its balance covers the full credit cost.
          </p>
        </div>

        {/* ═══ #288 — KINEO-PROVA-NO-PRECO-2026-08-23 ══════════════════════
            A vitrine de filmes reais existia na home, no /examples e em todo
            modal de venda — em TODA superfície menos a página onde a pessoa
            decide pagar. Quem chega aqui por link direto (e-mail, diretório,
            afiliado) vê uma tabela de preços sem nunca ter visto o produto
            funcionando: é pedir dinheiro por uma promessa em texto.
            Dois filmes reais, com o selo do motor que os fez (regra do selo
            honesto), logo antes do FAQ — o último quadro antes da decisão.
            Clipes leves da curadoria (104-244KB), muted/loop/playsInline,
            preload=metadata; some no celular (`hidden md:grid`) porque não se
            paga 2 vídeos de banda numa tela de 380px. */}
        <div className="mt-16">
          <div className="mb-6 text-center">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#2997ff]">
              MADE WITH KINEO
            </div>
            <h2 className="text-balance text-2xl font-black tracking-tight sm:text-3xl text-[#f5f5f7]">
              This is what a plan buys
            </h2>
            <p className="mt-2 text-[13px] text-[#86868b]">
              Both films below were made on Kineo, start to finish, and are labelled with the engine that rendered them.
            </p>
          </div>
          <div className="mx-auto hidden max-w-3xl grid-cols-2 gap-4 md:grid">
            {[
              // IDs conferidos em disco (public/previews) — os MESMOS clipes
              // leves que os modais de venda usam. Arquivo inexistente aqui =
              // quadro preto na página de preço, então nada de id de memória.
              { id: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba', engine: 'VEO 3.1', cap: 'Made with Kineo' },
              { id: '26d25419-6719-47ab-b24b-df214e007fbd', engine: 'KLING 2.5', cap: 'Made with Kineo' },
            ].map((f) => (
              <div key={f.id} className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]" style={{ aspectRatio: '16 / 10' }}>
                <video
                  src={`/previews/${f.id}.mp4`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-[3px] text-[9px] font-black tracking-[.1em] text-white">
                  {f.engine}
                </span>
                <span className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,.9)' }}>
                  {f.cap}
                </span>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[12px] text-[#86868b]">
            On Kling 3 and MiniMax H3, characters on screen speak their own lines with lip sync while a narrator carries the story.
          </p>
        </div>

        {/* Push #099 — FAQ accordion. Five evergreen objections lifted from
            support tickets and the homepage CRO copy. Pure client-side
            useState toggle so the page stays static-renderable. */}
        {/* KINEO-QUOTE-PRICING-2026-08-24 (pacote noturno, UI#5) — a voz real
            na página onde 44 pessoas morreram no preço. Quem hesita no valor
            lê um assinante de verdade, com nome e link verificável (mesmas
            regras da home #304: só citação autorizada, sem parede de estrelas). */}
        <figure className="mx-auto mt-14 max-w-2xl text-center">
          <blockquote className="text-balance text-lg italic leading-8 text-white/80">
            “Too many good ideas die in the mind. This is a product that gives them an escape
            route.”
          </blockquote>
          <figcaption className="mt-3 text-sm text-white/50">
            — Rick Crossley, subscriber ·{' '}
            <a href="/reviews" className="text-[#2997ff] transition hover:text-white">
              our honest reviews →
            </a>
          </figcaption>
        </figure>

        <div className="mt-16">
          <div className="mb-6 text-center">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#2997ff]">
              FAQ
            </div>
            <h2 className="text-balance text-2xl font-black tracking-tight sm:text-3xl text-[#f5f5f7]">
              💬 Frequently Asked Questions
            </h2>
          </div>

          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161618]">
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={item.q}
                  className="border-b border-white/[0.06] last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[.02]"
                  >
                    <span className="text-[14.5px] font-bold text-[#f5f5f7]">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[#2997ff] transition-transform duration-200 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                      style={{ fontSize: 16, lineHeight: 1 }}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 -mt-1">
                      <p className="text-[13.5px] leading-relaxed text-[#86868b]">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-5 text-center text-[12.5px] text-[#86868b]">
            Still have questions?{' '}
            <a
              href="mailto:support@usekineo.com"
              className="font-bold text-[#2997ff] hover:text-[#2997ff]"
            >
              Email us →
            </a>
          </p>
        </div>

        {/* Push #116 — explicit 7-day money-back guarantee callout under
            the FAQ. The trust row at the top of the page mentions the
            guarantee in passing; this spells out the terms so the buyer
            who scrolled all the way through gets the reassurance
            without leaving the page. */}
        <div
          className="mx-auto mt-12 max-w-3xl rounded-2xl p-5 sm:p-6"
          style={{
            background: 'rgba(41,151,255,.06)',
            border: '1px solid rgba(41,151,255,.35)',
            boxShadow: '0 0 40px rgba(41,151,255,.10)',
          }}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              aria-hidden
              style={{
                fontSize: '1.6rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div>
              <div className="text-[14px] font-black text-[#f5f5f7] mb-1">
                7-day money-back guarantee — all plans
              </div>
              <p className="text-[13px] text-[#86868b] leading-relaxed m-0">
                If you&apos;re not happy in the first 7 days, email us and we&apos;ll refund 100%. No questions asked. Works for all plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Push #117 — spacer so the sticky bar below doesn't cover the
          last bit of the FAQ on mobile. Desktop ignores it. */}
      {showStickyCta && <div aria-hidden className="h-24 md:hidden" />}

      {/* Push #117 — sticky mobile checkout bar. Only renders on
          small viewports (md:hidden), only after 300 px of scroll, and
          uses backdrop-blur + the safe-area class so the bar clears the
          iOS home-indicator. Buttons go through the same handleBuy used
          by the cards above. */}
      {showStickyCta && (
        <div
          ref={mobileStickyRef}
          className="mobile-sticky-cta md:hidden"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(10,10,15,0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,.08)',
            padding: '12px 16px',
            display: 'flex',
            gap: 8,
            zIndex: 50,
          }}
        >
          {/* #409 — Starter added to the sticky bar (was missing after the 3-tier launch) */}
          {/* KINEO-SPRINT-OFFER-2026-07-14 — primary (filled blue) button moved
              Studio → Creator so the sticky bar matches the card hierarchy
              ("Most Popular" = Creator). Studio goes neutral. */}
          <button
            type="button"
            disabled={purchasing === 'starter'}
            onClick={() => handleBuy('starter', 'mobile_sticky')}
            style={{
              flex: 1,
              padding: '12px 6px',
              borderRadius: 10,
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.12)',
              color: '#f5f5f7',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            {purchasing === 'starter'
              ? 'Opening secure checkout…'
              : mobileStickyPlanLabel({
                  tier: 'starter',
                  billing,
                  monthlyLabel: entryPriceLabel('starter'),
                  annualTotalLabel: annualPrices.starter.total,
                })}
          </button>
          <button
            type="button"
            disabled={purchasing === 'basic'}
            onClick={() => handleBuy('basic', 'mobile_sticky')}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: 10,
              background: '#2997ff',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: 48,
              border: 'none',
              boxShadow: '0 8px 22px rgba(41,151,255,.35)',
            }}
          >
            {purchasing === 'basic'
              ? 'Opening secure checkout…'
              : mobileStickyPlanLabel({
                  tier: 'basic',
                  billing,
                  monthlyLabel: entryPriceLabel('basic'),
                  annualTotalLabel: annualPrices.basic.total,
                })}
          </button>
          <button
            type="button"
            disabled={purchasing === 'pro'}
            onClick={() => handleBuy('pro', 'mobile_sticky')}
            style={{
              flex: 1,
              padding: '12px 6px',
              borderRadius: 10,
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.12)',
              color: '#f5f5f7',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            {purchasing === 'pro'
              ? 'Opening secure checkout…'
              : mobileStickyPlanLabel({
                  tier: 'pro',
                  billing,
                  monthlyLabel: formatCheckoutMoney(resolvedCurrency, getTierPrice('pro', resolvedCurrency, resolvedRegion)),
                  annualTotalLabel: annualPrices.pro.total,
                })}
          </button>
        </div>
      )}

      {/* ───────── Footer ───────── */}
      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#161618] border border-[#2997ff]/40 text-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#2997ff" />
              </svg>
            </div>
            <span className="text-[13px] font-bold text-[#f5f5f7]">
              Kineo
            </span>
          </div>
          <p className="text-[11.5px] text-[#86868b]">© 2026 Kineo</p>
        </div>
        {/* Push #116 — legal + contact strip. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-6 sm:px-6">
          <Link href="/terms" className="text-[11.5px] font-medium text-[#86868b] hover:text-[#f5f5f7]">Terms of Service</Link>
          <span aria-hidden className="text-[11.5px] text-[#86868b] opacity-40">·</span>
          <Link href="/privacy" className="text-[11.5px] font-medium text-[#86868b] hover:text-[#f5f5f7]">Privacy Policy</Link>
          <span aria-hidden className="text-[11.5px] text-[#86868b] opacity-40">·</span>
          <a href="mailto:support@usekineo.com" className="text-[11.5px] font-medium text-[#86868b] hover:text-[#f5f5f7]">Contact</a>
        </div>
      </footer>
    </div>
  )
}
