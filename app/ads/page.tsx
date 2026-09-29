// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — the public door of Studio Ads (Kineo Empresas, self-serve).
//
// Founder, 24/09 evening: a bakery, a pharmacy or a dentist must be able to buy and make its own ad ALONE —
// upload its photos, clips and logo, get the narration and download the finished ad, with no manual work by Kineo.
// This page sells that and nothing more. It lives OUTSIDE (dashboard) because that layout forces noindex.
//
// SOURCES, NEVER TYPED HERE: price, credits, days and the includes/excludes lists come from lib/ads/offer.ts; the 8
// models from lib/ads/models.ts; the review cap from lib/ads/events.ts; the voices from lib/ads/renderContract.ts.
//
// KINEO-ADS-PORTA-PLANO-2026-09-27 — whoever cannot open the wizard (anonymous, or signed in without access) sees TWO
// doors in Price: the Starter plan first (price and credits from lib/checkoutPricing.ts, name from lib/growth/planFit.ts,
// ads-per-month from KINEO1_35S_CREDITS) and the pass beside it, untouched. The wizard's no_access redirect now carries
// ?from=new, and that adds a strip above the hero saying that Studio Ads comes with every paid plan. Facts the copy
// leans on: every TIER_CREDITS plan is 'subscriber' in lib/ads/access.ts (ADS_SUBSCRIBER_PLANS), the engine gate is off
// for every account (lib/enginePlanGate.ts ENGINE_GATE_SINCE), and app/api/stripe/portal exists (cancel anytime).
// "Every engine" carries "your balance covers": TIER_CREDITS.starter is below the dearest engine's 60 s cost
// (lib/credits/engineCost.ts creditCostForDuration) — access and sufficient credits are separate (lib/kineoFacts.ts).
// The subscription checkout GET reads tier, billing and intent_campaign; it has NO post-payment return parameter, so
// success lands on /checkout/success like every plan — nothing here pretends otherwise.
//
// KINEO-ADS-V2-VIRADA-2026-09-29 — the v2 ad is public (lib/ads/v2Tiers.ts ADS_V2_PUBLIC). This door now sells what the
// ad maker at /ads/v2 makes: a vertical ad of about 15 s where the business's REAL photos get motion, with music, a short
// voice-over and the real logo; 3 levels priced by adsV2Credits (founder, 28/09: 34/41/51 per 15 s); "How it works" is
// the SAME 4 steps as the maker's side column (lib/ads/v2Screen.ts ADS_V2_HOW_IT_WORKS). The 8 v1 models moved down to
// "Classic narrated ads", with the link to /ads/new?classic=1. No caption promise, no "35 or 60 seconds" as the product.
// ?from=v2 (the maker's no-access redirect) gets the same strip as ?from=new. The pass price and credits are unchanged
// (lib/ads/offer.ts); the price cards only say how many ads of each kind those credits pay for.
//
// THE CTA IS DECIDED ON THE SERVER, in this order:
//   1. signed in and adsGate(...) === 'ok'  → "Make your ad" (MAKER_HREF: /ads/v2)  — pass, paid plan or internal;
//   2. adsPassLive() OR internal account     → "Get Studio Ads · <price>" as a plain <a> to the checkout GET
//      (logged-out people are sent to /login by the checkout and brought back); the same rule the checkout applies;
//   3. otherwise                             → "Opens soon", no button.
// The buy CTA (and only it) closes when the first-ad review queue is full: ads_orders delivered inside REVIEW_WINDOW_MS
// with qa_at null, counted by distinct user, >= ADS_MAX_OPEN_REVIEWS. The window is the operator's review rhythm (since
// 27/09 the page promises no deadline: "A human checks your first ad"), so a review nobody closed can never lock the
// door for good and "come back tomorrow" stays true. A read failure or a
// missing table counts as 0 — the page never hangs or breaks on it (the server side of the cap belongs to the
// render/checkout routes, not to this page).
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation' // KINEO-ADS-V2-VIRADA-2026-09-29 — go=maker
import Footer from '@/components/Footer'
import CreditMinutesSummary from '@/components/CreditMinutesSummary'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect } from '@/components/InterfaceLanguage'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { createClient } from '@/lib/supabase/server'
import { footageAdminClient } from '@/lib/userFootage'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { ADS_MAX_OPEN_REVIEWS } from '@/lib/ads/events'
import { ADS_MODELS, type AdsModel } from '@/lib/ads/models'
import {
  ADS_PASS_ACCESS_DAYS,
  ADS_PASS_CREDITS,
  KINEO1_35S_CREDITS, // KINEO-ADS-REVISAO-2026-09-27: o custo por anúncio da FAQ nasce daqui, nunca digitado
  adsCoverageLine, // KINEO-PASSE-B-2026-09-28: 90 cr = "2 new ads (Photo motion or Commercial), 1 Cinema, or about 30 classic ads of 35 s"
  adsPassCopy,
  adsPassLive,
  adsPassPriceLabel,
} from '@/lib/ads/offer'
import { ADS_VOICES } from '@/lib/ads/renderContract'
import { ADS_V2_PUBLIC, ADS_V2_TIER_IDS, adsV2Credits } from '@/lib/ads/v2Tiers' // KINEO-ADS-V2-VIRADA-2026-09-29
import { ADS_V2_HOW_IT_WORKS, ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '@/lib/ads/v2Screen' // KINEO-ADS-V2-VIRADA-2026-09-29
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '@/lib/ads/v2ShotLists' // KINEO-ADS-V2-VIRADA-2026-09-29
import { TIER_CREDITS, formatCheckoutMoney, getTierPrice } from '@/lib/checkoutPricing' // KINEO-ADS-PORTA-PLANO-2026-09-27
import { planName } from '@/lib/growth/planFit' // KINEO-ADS-PORTA-PLANO-2026-09-27 — the canonical plan name
import AdsPageBanners, { AdsCtaLink, type AdsDoorCta } from './AdsPageBanners'

export const dynamic = 'force-dynamic'

// KINEO-ADS-V2-VIRADA-2026-09-29 — the description sells the v2 ad (real photos in motion, ~15 s), not the v1 narrated ad.
const DESCRIPTION =
  'Your real business photos, brought to life in a vertical video ad of about 15 seconds, with music, a short voice-over and your logo. Included in any paid plan.'

export const metadata: Metadata = {
  title: 'Studio Ads — make your own video ad | Kineo',
  description: DESCRIPTION,
  alternates: { canonical: '/ads' },
  openGraph: { title: 'Studio Ads — make your own video ad', description: DESCRIPTION, url: '/ads', type: 'website' },
  // While the pass is not on sale the page only says "Opens soon": keep it out of the index (and out of the sitemap).
  ...(adsPassLive() ? {} : { robots: { index: false, follow: true } }),
}

const CHECKOUT_HREF = '/api/stripe/checkout?pack=ads_pass'
/** KINEO-ADS-PORTA-PLANO-2026-09-27 — the Starter door: tier, billing and intent_campaign are the GET parameters
 *  app/api/stripe/checkout/route.ts reads (intentCampaignFrom accepts [A-Za-z0-9._~-]{1,100}). Signed out, the checkout
 *  sends the person to /signup carrying this URL and resumes it. */
const STARTER_CHECKOUT_HREF = '/api/stripe/checkout?tier=starter&billing=monthly&intent_campaign=ads_door'
// KINEO-ADS-V2-VIRADA-2026-09-29 — the main button opens the ad maker (/ads/v2); the old wizard is the classic option.
const MAKER_HREF = ADS_V2_PUBLIC ? '/ads/v2' : '/ads/new'
const CLASSIC_HREF = '/ads/new?classic=1'
const DFY_HREF = '/business-video-ads'
/** A slow auth or database read must never hold the public door; past this, the page renders the safe default. */
const READ_TIMEOUT_MS = 2500
/** The operator's review window (an internal rhythm, not a customer promise since 27/09): only ads delivered inside it count toward the review cap. */
const REVIEW_WINDOW_MS = 24 * 3600 * 1000

type Viewer = { signedIn: boolean; gate: 'ok' | 'no_access' | 'closed' | null; internal: boolean }
const ANONYMOUS: Viewer = { signedIn: false, gate: null, internal: false }

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return null
}

function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), READ_TIMEOUT_MS)
    work.then(
      (value) => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); resolve(fallback) },
    )
  })
}

/** Who is looking: the verified auth e-mail (getUser), never profiles.email. */
async function readViewer(): Promise<Viewer> {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return ANONYMOUS
    const internal = isAdsInternalEmail(user.email)
    try {
      const { reason } = await loadAdsAccess(user.id, user.email)
      return { signedIn: true, gate: adsGate(reason), internal }
    } catch {
      return { signedIn: true, gate: null, internal }
    }
  } catch {
    return ANONYMOUS
  }
}

/** Businesses waiting for the human review of an ad delivered inside REVIEW_WINDOW_MS (distinct users; 0 on any failure). */
async function countOpenReviews(): Promise<number> {
  try {
    const since = new Date(Date.now() - REVIEW_WINDOW_MS).toISOString()
    const { data, error } = await footageAdminClient()
      .from('ads_orders')
      .select('user_id')
      .eq('status', 'delivered')
      .is('qa_at', null)
      .gte('delivered_at', since)
      .limit(1000)
    if (error) {
      if (!isMissingAdsTable(error.code)) console.warn('[ads page] open-review count failed:', error.code)
      return 0
    }
    const users = new Set<string>()
    for (const row of (data ?? []) as { user_id?: unknown }[]) if (typeof row.user_id === 'string') users.add(row.user_id)
    return users.size
  } catch {
    return 0
  }
}

function mediaNeeds(model: AdsModel): string {
  const photos = `your logo and at least ${model.inputs.minPhotos} photos`
  if (model.inputs.video === 'required') return `${photos} plus one video clip`
  if (model.inputs.video === 'optional') return `${photos}; video clips optional`
  return `${photos}; photos only`
}

// KINEO-ADS-V2-VIRADA-2026-09-29 — the 3 levels of the v2 ad: name and pitch from ADS_V2_TIER_COPY, credits from adsV2Credits
// (the same function /api/ads/v2/start debits). Never typed here.
const V2_LEVELS = ADS_V2_TIER_IDS.map((id) => ({ id, name: ADS_V2_TIER_COPY[id].name, pitch: ADS_V2_TIER_COPY[id].pitch, credits: adsV2Credits(id, ADS_V2_SCREEN_SECONDS) }))
const V2_DEAREST = Math.max(...V2_LEVELS.map((l) => l.credits))
/** How many new ads a balance pays for at ANY level (the dearest level decides), so the page never promises more. */
function v2AdsAnyLevel(credits: number): number {
  return Math.floor(credits / V2_DEAREST)
}
function newAdsLabel(n: number): string {
  return n === 1 ? '1 new ad at any level' : `${n} new ads at any level`
}

/** REVISÃO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29) — the same rule as /ads/new adsV2Href: only short, clean utm_* travel. */
function withCleanUtm(href: string, searchParams?: SearchParams): string {
  const out = new URLSearchParams()
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const v = first(searchParams?.[key])
    if (v && /^[A-Za-z0-9._~-]{1,100}$/.test(v)) out.set(key, v)
  }
  const s = out.toString()
  return s ? `${href}${href.includes('?') ? '&' : '?'}${s}` : href
}

function DoorCta({ cta, placement, price }: { cta: AdsDoorCta; placement: 'hero' | 'price' | 'end'; price: string }) {
  if (cta === 'open') {
    return (
      <AdsCtaLink href={MAKER_HREF} cta="open" placement={placement} className="go ok ads-go">
        Make your ad <span aria-hidden="true">→</span>
      </AdsCtaLink>
    )
  }
  if (cta === 'buy') {
    return (
      <>
        <AdsCtaLink href={CHECKOUT_HREF} cta="buy" placement={placement} className="go ok ads-go">
          Get Studio Ads · {price}
        </AdsCtaLink>
        <p className="gnote">Secure Stripe checkout. You sign in (or create your account) first.</p>
      </>
    )
  }
  if (cta === 'full') {
    return (
      <div className="ads-closed">
        <p>We are fully booked for new businesses today — come back tomorrow.</p>
        <a href={DFY_HREF}>Need an ad now? We can make it for you →</a>
      </div>
    )
  }
  return (
    <div className="ads-closed">
      <p className="ads-soon">Opens soon</p>
      <a href={DFY_HREF}>Need an ad now? We can make it for you →</a>
    </div>
  )
}

export default async function StudioAdsPage({ searchParams }: { searchParams?: SearchParams }) {
  const live = adsPassLive()
  const viewer = await withTimeout(readViewer(), ANONYMOUS)
  const canBuy = live || viewer.internal
  let cta: AdsDoorCta
  if (viewer.gate === 'ok') cta = 'open'
  else if (!canBuy) cta = 'soon'
  else cta = (await withTimeout(countOpenReviews(), 0)) >= ADS_MAX_OPEN_REVIEWS ? 'full' : 'buy'
  // KINEO-ADS-V2-VIRADA-2026-09-29 — the /ads/for/<segment> button carries go=maker (those pages are static and cannot
  // tell who is looking): whoever can already make an ad goes straight to the maker; everyone else stays on this door.
  // REVISÃO 29/09: o redirect leva os utm_* curtos e limpos (o SourceCapture do /ads/v2 grava a origem; sem eles o clique
  // do /ads/for de quem já tem acesso chegava ao montador sem atribuição nenhuma).
  if (ADS_V2_PUBLIC && cta === 'open' && first(searchParams?.go) === 'maker') redirect(withCleanUtm(MAKER_HREF, searchParams))

  // KINEO-ADS-PORTA-PLANO-2026-09-27 — the plan door only while the pass is live: with it off the whole product says
  // "Opens soon" and adsGate answers 'closed' to subscribers too, so a Starter door would sell a closed room.
  const from = first(searchParams?.from)
  const planOffer = live && viewer.gate !== 'ok'
  // KINEO-ADS-V2-VIRADA-2026-09-29 — /ads/v2 sends no-access people here with ?from=v2: same strip as ?from=new.
  const returnedFromWizard = (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'
  const starterName = planName('starter')
  const starterPrice = formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard'))
  const starterAds35 = Math.floor(TIER_CREDITS.starter / KINEO1_35S_CREDITS)
  const starterV2 = v2AdsAnyLevel(TIER_CREDITS.starter) // KINEO-ADS-V2-VIRADA-2026-09-29
  // KINEO-PASSE-B-2026-09-28 — passe B do fundador (90 cr): o cartão e a FAQ dizem nível a nível o que o passe paga, com os
  // níveis DERIVADOS desta página (V2_LEVELS) — "1 new ad at any level" deixou de ser a frase inteira (90 paga 2 de Photo motion).
  const passCoverage = adsCoverageLine(ADS_PASS_CREDITS, V2_LEVELS)

  const copy = adsPassCopy()
  const price = adsPassPriceLabel()
  const lengths = Array.from(new Set(ADS_MODELS.map((m) => m.seconds))).sort((a, b) => a - b)
  const lengthsLabel = lengths.map((s) => `${s}`).join(' or ')

  return (
    <div className="stu ads-door">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: ADS_DOOR_CSS }} />
      <div className="ads-wrap">
        <nav className="ads-nav" aria-label="Studio Ads navigation">
          <a href="/" className="ads-brand"><KineoBrandIcon size={26} />Kineo<span> / Studio Ads</span></a>
          <div className="ads-nav-actions">
            <a href={DFY_HREF} className="ads-navlink">Have it made for you →</a>
            <InterfaceLanguageSelect />
            <AppearanceSettingsButton />
          </div>
        </nav>

        <Suspense fallback={null}>
          <AdsPageBanners live={live} cta={cta} planOffer={planOffer} from={from} />
        </Suspense>

        {/* KINEO-ADS-PORTA-PLANO-2026-09-27 — sent back by /ads/new (no access): say why, point to the two doors. No promise
            about a saved draft: AdsWizardClient only writes 'kineo:ads:draft:v1' in the anonymous mode (saveDraftAndLogin),
            never for a signed-in account, so there is nothing to bring back here. */}
        {returnedFromWizard ? (
          <div className="ads-banner ads-returned" role="status">
            <p>
              <b>Studio Ads is part of every paid plan.</b> Pick {starterName} or the pass below and open the ad maker again. <a href="#ads-price">See both options →</a>
            </p>
          </div>
        ) : null}

        <header className="ads-hero">
          <p className="ads-eyebrow">STUDIO ADS · KINEO EMPRESAS</p>
          <h1>Your real photos, brought to life. A video ad of about {ADS_V2_SCREEN_SECONDS} seconds.</h1>
          <p className="sub ads-intro">
            Add {ADS_V2_MIN_PHOTOS} to {ADS_V2_MAX_PHOTOS} photos of your business and your logo. Kineo gives your photos movement, adds music,
            a short voice-over and your real logo at the end, and delivers a vertical ad of about {ADS_V2_SCREEN_SECONDS} seconds for Reels, TikTok and Shorts.
          </p>
          <ul className="ads-tiers-line" aria-label="Levels and credits">
            {V2_LEVELS.map((l) => <li key={l.id}><b>{l.name}</b> {l.credits} credits</li>)}
          </ul>
          <div className="ads-cta"><DoorCta cta={cta} placement="hero" price={price} /></div>
          {planOffer ? <p className="ads-plan-line"><a href="#ads-price">Included in any paid plan — from {starterPrice}/month</a></p> : null}
        </header>

        <section className="ads-sec" aria-labelledby="ads-how">
          <h2 id="ads-how">How it works</h2>
          <p className="ads-lede">{ADS_V2_HOW_IT_WORKS.length} steps, all on one page: the same ones you see next to the ad maker. Planning is free.</p>
          <ol className="ads-how">
            {ADS_V2_HOW_IT_WORKS.map((s, i) => (
              <li className="step" key={s.title}>
                <b>{String(i + 1).padStart(2, '0')} · {s.title.toUpperCase()}</b>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ads-sec" aria-labelledby="ads-levels">
          <h2 id="ads-levels">{V2_LEVELS.length} levels</h2>
          <p className="ads-lede">Every level starts from your own photos and ends on your logo. The price shows before anything is charged, and it comes out of the same credits as your videos.</p>
          <ul className="ads-models">
            {V2_LEVELS.map((l) => (
              <li className="card ads-model" key={l.id}>
                <div className="ads-model-top"><b>{l.name}</b><span className="ads-secs">{l.credits} credits</span></div>
                <p className="ads-seg">{l.pitch}</p>
                <ul className="ads-level-list">{ADS_V2_TIER_COPY[l.id].includes.map((item) => <li key={item}>{item}</li>)}</ul>
              </li>
            ))}
          </ul>
        </section>

        <section className="ads-sec" aria-labelledby="ads-get">
          <h2 id="ads-get">What you get</h2>
          <div className="ads-get">
            <div className="card">
              <div className="lab">Included</div>
              <ul className="ads-list ok">
                <li>A vertical 9:16 ad of about {ADS_V2_SCREEN_SECONDS} seconds, made from your own photos</li>
                <li>Music, a short voice-over you can turn off, and your real logo on the last frame</li>
                <li>Every shot, the words on screen and the voice-over shown before you pay: planning is free</li>
                <li>Not happy with a shot? Redo just that one, with the price shown first</li>
              </ul>
            </div>
            <div className="card">
              <div className="lab">Not included yet</div>
              <ul className="ads-list no">
                {copy.excludes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="ads-sec" aria-labelledby="ads-models">
          <h2 id="ads-models">Classic narrated ads</h2>
          <p className="ads-lede">Prefer a longer ad with a script written from your brief? The classic maker still makes it from your photos and clips: {ADS_MODELS.length} ad models, {lengthsLabel} seconds, {KINEO1_35S_CREDITS} credits for a 35-second ad. A person checks your first classic ad.</p>
          <p className="ads-classic-link"><a href={CLASSIC_HREF}>Open the classic maker ({KINEO1_35S_CREDITS} credits) →</a></p>
          <ul className="ads-models">
            {ADS_MODELS.map((m) => (
              <li className="card ads-model" key={m.id}>
                <div className="ads-model-top"><b>{m.name}</b><span className="ads-secs">{m.seconds} s</span></div>
                <p className="ads-seg">{m.segment}</p>
                <p className="hint">Goal: {m.goal}. Needs {mediaNeeds(m)}.</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ads-sec" aria-labelledby="ads-price">
          <h2 id="ads-price">Price</h2>
          {/* KINEO-ADS-PORTA-PLANO-2026-09-27 — two doors for whoever cannot open the wizard: the Starter plan first (it includes
              Studio Ads and costs less than the pass), the pass beside it, untouched. With gate 'ok' the pass card stands alone. */}
          <div className={planOffer ? 'ads-doors' : undefined}>
            {planOffer ? (
              <div className="cost ads-price ads-plan" data-kineo="ads-door-plan">
                <div className="sum">{starterName} plan</div>
                <p className="ads-amount">{starterPrice}<span> /month</span></p>
                <p className="ads-cover">{TIER_CREDITS.starter} credits every month: {newAdsLabel(starterV2)}, or about {starterAds35} classic ads of 35 s.</p>
                <div className="val"><span>Studio Ads</span><b>Included</b></div>
                <div className="val"><span>Video engines</span><b>Every engine your balance covers</b></div>
                <div className="val"><span>Subscription</span><b>Monthly · cancel anytime</b></div>
                <div className="ads-cta">
                  <AdsCtaLink href={STARTER_CHECKOUT_HREF} cta="plan" tier="starter" from={from} placement="price" className="go ok ads-go">
                    Get {starterName} · {starterPrice}/mo
                  </AdsCtaLink>
                  {/* KINEO-COPY-HONESTA-C-2026-09-27 — this door is also shown to signed-in people without access (planOffer = gate !== 'ok');
                      the checkout GET only sends anonymous viewers to /login (app/api/stripe/checkout/route.ts), so the note tells each viewer the truth. */}
                  <p className="gnote">{viewer.signedIn ? 'Secure Stripe checkout.' : 'Secure Stripe checkout. You sign in (or create your account) first.'}</p>
                </div>
                <p className="ads-fine">Shown in US dollars; the checkout may show the amount in your local currency.</p>
              </div>
            ) : null}
            <div className="cost ads-price">
              <div className="sum">{copy.name} pass</div>
              <p className="ads-amount">{price}<span> one-time</span></p>
              <p className="ads-cover">Enough for {passCoverage}.</p>
              <div className="val"><span>Credits</span><b>{ADS_PASS_CREDITS}</b></div>
              <CreditMinutesSummary credits={ADS_PASS_CREDITS} />
              <div className="val"><span>Studio Ads access</span><b>{ADS_PASS_ACCESS_DAYS} days</b></div>
              <div className="val"><span>Subscription</span><b>None</b></div>
              <div className="ads-cta"><DoorCta cta={cta} placement="price" price={price} /></div>
              <p className="ads-fine">Shown in US dollars; the checkout may show the amount in your local currency.</p>
              {live ? <p className="ads-fine">Already on a paid Kineo plan? Studio Ads is open to you with your plan&apos;s credits — sign in and open it.</p> : null}
            </div>
          </div>
        </section>

        <section className="ads-sec ads-faq" aria-labelledby="ads-faq">
          <h2 id="ads-faq">Questions</h2>
          <details open>
            <summary>What format is the ad?</summary>
            <p>Vertical 9:16, made for Reels, TikTok, Shorts and Stories, about {ADS_V2_SCREEN_SECONDS} seconds long. Classic narrated ads follow the model you pick: {lengthsLabel} seconds.</p>
          </details>
          <details>
            <summary>Which files can I upload?</summary>
            <p>{ADS_V2_MIN_PHOTOS} to {ADS_V2_MAX_PHOTOS} photos in JPG, PNG or WebP, and your logo as PNG or JPG. You frame each photo for a vertical screen right on the page. On an iPhone, send photos as JPG (Settings → Camera → Formats → Most Compatible) — HEIC files are not accepted yet. The classic maker also takes MP4, MOV or WebM clips up to 50 MB. Only upload material you have the right to use.</p>
          </details>
          <details>
            <summary>What about the voice-over?</summary>
            <p>A short voice-over is written from your sentence, with music under it. You see it in the plan before anything is charged, and you can turn it off. The classic maker writes a longer script you can edit line by line, with {ADS_VOICES.length} voices to choose from.</p>
          </details>
          <details>
            <summary>Can I use video clips?</summary>
            <p>The new ad is made from photos: each one gets its own movement. To put your own clips in an ad, use the <a href={CLASSIC_HREF}>classic maker</a>; there the narration and the music replace the original sound of your clips.</p>
          </details>
          <details>
            <summary>Do I need a subscription?</summary>
            {/* KINEO-ADS-REVISAO-2026-09-27 — assinante entra sem passe (lib/ads/access.ts ADS_SUBSCRIBER_PLANS); o custo por anúncio vem de lib/ads/offer.ts. */}
            <p>No. Any paid plan includes Studio Ads, with the same credits as your videos: a new ad costs {V2_LEVELS.map((l) => `${l.name} ${l.credits}`).join(', ')} credits, and a classic narrated ad of 35 seconds costs {KINEO1_35S_CREDITS}. The pass is for people without a plan: a single payment of {price} with {ADS_PASS_CREDITS} credits — enough for {passCoverage} — and {ADS_PASS_ACCESS_DAYS} days of Studio Ads. Nothing renews.</p>
          </details>
          <details>
            <summary>I would rather have someone make it for me.</summary>
            <p>That is Kineo Empresas: you send the brief and a person produces the video, in <a href={DFY_HREF}>Express or Pro</a>, one-time payment.</p>
          </details>
        </section>

        {cta === 'buy' || cta === 'open' ? (
          <section className="ads-sec" aria-label="Get started">
            <h2>{cta === 'open' ? 'Your next ad is a few steps away.' : 'Make your first ad today.'}</h2>
            <div className="ads-cta"><DoorCta cta={cta} placement="end" price={price} /></div>
          </section>
        ) : null}
      </div>
      <Footer />
    </div>
  )
}

// Page-only layer on top of the Studio Kit (static CSS, no interpolation). Mobile-first: 16px gutters at <=900px,
// single column at 375px, nothing wider than the viewport.
const ADS_DOOR_CSS = `
.stu.ads-door{position:relative;z-index:1;padding:0 0 12px;background:var(--bg);color:var(--text);--ads-door-error:#b42318;--ads-door-error-soft:#fff1f0;--ads-door-warning-soft:#fff6df;--ads-door-warning-border:#e7c574}
html[data-theme=dark] .stu.ads-door{--ads-door-error:#ff9b9b;--ads-door-error-soft:#38212b;--ads-door-warning-soft:#342c1d;--ads-door-warning-border:#73582d}
.stu.ads-door h1{background:none;color:var(--text);-webkit-text-fill-color:currentColor}
.stu.ads-door .sub,.stu.ads-door .hint,.stu.ads-door .lab,.stu.ads-door .gnote{color:var(--muted)}
.stu.ads-door .card,.stu.ads-door .step{background:var(--card);border-color:var(--border)}
.stu.ads-door .card:hover{border-color:var(--border2)}
.stu.ads-door .step{border-top-color:var(--accent)}
.stu.ads-door .step b,.stu.ads-door .cost .sum,.stu.ads-door .cost .val b{color:var(--accent)}
.stu.ads-door .step p,.stu.ads-door .cost .val span{color:var(--muted)}
.stu.ads-door .cost{background:var(--card);border-color:var(--border2)}
.stu.ads-door .cost::before{background:var(--border2)}
.stu.ads-door .go.ok{background:var(--indigo);color:var(--on-accent);box-shadow:var(--sh-cta)}
.stu.ads-door .go.ok:hover{box-shadow:var(--sh-cta);filter:brightness(1.05)}
.ads-nav-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px 16px}
.ads-door .kineo-interface-language{color:var(--text)!important;background:var(--card)!important;border-color:var(--border)!important;color-scheme:inherit!important}
.ads-door .ads-wrap{max-width:1120px;margin:0 auto;padding:0 34px}
.ads-door p,.ads-door li,.ads-door summary{overflow-wrap:break-word}
.ads-door a:focus-visible,.ads-door summary:focus-visible,.ads-door button:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:8px}
.ads-nav{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 18px;padding:18px 0;border-bottom:1px solid var(--border)}
.ads-brand{display:flex;align-items:center;gap:9px;color:var(--text);text-decoration:none;font-size:21px;font-weight:750;letter-spacing:-.02em}
.ads-brand span{font-size:12px;font-weight:500;color:var(--muted);letter-spacing:0}
.ads-navlink{font-size:13px;color:var(--accent);text-decoration:none;font-weight:600}
.ads-navlink:hover{text-decoration:underline}
.ads-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:16px 0 0;padding:0 6px 0 14px;border-radius:12px;background:var(--accent-soft);border:1px solid var(--border2);color:var(--text);font-size:14px;line-height:1.5}
.ads-banner p{margin:12px 0}
.ads-banner.err{background:var(--ads-door-error-soft);border-color:var(--ads-door-error);color:var(--ads-door-error)}
.ads-x{flex-shrink:0;min-width:44px;min-height:44px;background:none;border:0;color:inherit;font-size:20px;line-height:1;cursor:pointer}
.ads-hero{padding:46px 0 10px;max-width:780px}
.ads-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--accent);margin:0 0 14px}
.stu.ads-door h1{font-size:clamp(31px,5vw,52px);line-height:1.08;letter-spacing:-.03em;margin:0 0 14px}
.ads-intro{font-size:16px;line-height:1.6;max-width:640px;margin:0 0 22px}
.ads-cta{max-width:380px}
.ads-go{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px 22px;text-decoration:none;text-align:center}
.ads-closed p{margin:0 0 8px;font-size:15px;font-weight:700;color:var(--warning)}
.ads-closed .ads-soon{display:inline-block;padding:9px 16px;border-radius:999px;background:var(--ads-door-warning-soft);border:1px solid var(--ads-door-warning-border);color:var(--warning);font-size:14px}
.ads-closed a{display:inline-block;font-size:13px;color:var(--accent);text-decoration:none;font-weight:600;padding:6px 0}
.ads-closed a:hover{text-decoration:underline}
.ads-sec{margin:52px 0}
.stu.ads-door h2{font-size:clamp(22px,3vw,30px);font-weight:700;letter-spacing:-.02em;margin:0 0 6px;color:var(--text)}
.ads-lede{font-size:14px;color:var(--muted);margin:0 0 18px;max-width:680px;line-height:1.55}
.ads-how{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.ads-models{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.ads-model-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.ads-model-top b{font-size:16px;letter-spacing:-.01em}
.ads-secs{flex-shrink:0;font-size:11px;font-weight:800;color:var(--accent);background:var(--accent-soft);border:1px solid var(--border2);border-radius:999px;padding:2px 9px}
.ads-seg{margin:6px 0 0;font-size:13px;color:var(--text2);line-height:1.45}
.ads-tiers-line{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0 0 20px}
.ads-tiers-line li{font-size:13px;color:var(--text2);background:var(--accent-soft);border:1px solid var(--border2);border-radius:999px;padding:5px 12px}
.ads-tiers-line b{color:var(--text)}
.ads-level-list{margin:10px 0 0;padding:0 0 0 18px;font-size:13px;line-height:1.5;color:var(--muted)}
.ads-level-list li{margin:0 0 4px}
.ads-classic-link{margin:0 0 16px;font-size:14px}
.ads-classic-link a{color:var(--accent);text-decoration:none;font-weight:600}
.ads-classic-link a:hover{text-decoration:underline}
.ads-get{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ads-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px}
.ads-list li{position:relative;padding-left:22px;font-size:14px;line-height:1.5;color:var(--text2)}
.ads-list li::before{position:absolute;left:0;top:0;font-weight:800}
.ads-list.ok li::before{content:'✓';color:var(--accent)}
.ads-list.no li{color:var(--muted)}
.ads-list.no li::before{content:'–';color:var(--muted2)}
.ads-price{max-width:520px}
.ads-doors{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;max-width:1000px}
.ads-doors .ads-price{max-width:none}
.ads-plan-line{margin:12px 0 0;font-size:13px;line-height:1.5}
.ads-plan-line a,.ads-returned a{color:var(--accent);text-decoration:none;font-weight:600}
.ads-plan-line a:hover,.ads-returned a:hover{text-decoration:underline}
.ads-amount{margin:2px 0 14px;font-size:40px;font-weight:750;letter-spacing:-.03em;color:var(--text);line-height:1.05}
.ads-amount span{font-size:14px;font-weight:600;color:var(--muted);letter-spacing:0}
.ads-cover{margin:-6px 0 14px;font-size:13px;color:var(--accent);line-height:1.45}
.ads-price .val{gap:14px;margin-bottom:8px}
.ads-price .ads-cta{margin-top:16px}
.ads-fine{margin:12px 0 0;font-size:12px;color:var(--muted2);line-height:1.5}
.ads-faq{max-width:820px}
.ads-faq details{border-bottom:1px solid var(--border);padding:14px 0}
.ads-faq summary{cursor:pointer;font-size:15px;font-weight:700;color:var(--text);min-height:28px}
.ads-faq details p{margin:10px 0 0;font-size:14px;line-height:1.65;color:var(--muted)}
.ads-faq a{color:var(--accent)}
@media(max-width:900px){
  .stu.ads-door{padding:0 0 12px}
  .ads-door .ads-wrap{padding:0 16px}
  .ads-hero{padding-top:30px}
  .ads-sec{margin:38px 0}
  .ads-get{grid-template-columns:1fr}
  .ads-doors{grid-template-columns:1fr}
  .ads-cta{max-width:none}
  .ads-amount{font-size:34px}
}
`
