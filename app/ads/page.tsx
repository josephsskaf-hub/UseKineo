// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — the public door of Studio Ads (Kineo Empresas, self-serve).
//
// Founder, 24/09 evening: a bakery, a pharmacy or a dentist must be able to buy and make its own ad ALONE —
// upload its photos, clips and logo, get the narration and download the finished ad, with no manual work by Kineo.
// This page sells that and nothing more. It lives OUTSIDE (dashboard) because that layout forces noindex.
//
// SOURCES, NEVER TYPED HERE: price, credits, days and the includes/excludes lists come from lib/ads/offer.ts; the 8
// models from lib/ads/models.ts; the review cap from lib/ads/events.ts; the voices from lib/ads/renderContract.ts.
//
// THE CTA IS DECIDED ON THE SERVER, in this order:
//   1. signed in and adsGate(...) === 'ok'  → "Open Studio Ads" (/ads/new)          — pass, paid plan or internal;
//   2. adsPassLive() OR internal account     → "Get Studio Ads · <price>" as a plain <a> to the checkout GET
//      (logged-out people are sent to /login by the checkout and brought back); the same rule the checkout applies;
//   3. otherwise                             → "Opens soon", no button.
// The buy CTA (and only it) closes when the first-ad review queue is full: ads_orders delivered IN THE LAST 24 HOURS
// with qa_at null, counted by distinct user, >= ADS_MAX_OPEN_REVIEWS. The 24-hour window is the promised review window,
// so a review nobody closed can never lock the door for good and "come back tomorrow" stays true. A read failure or a
// missing table counts as 0 — the page never hangs or breaks on it (the server side of the cap belongs to the
// render/checkout routes, not to this page).
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Footer from '@/components/Footer'
import KineoBolt from '@/components/KineoBolt'
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
  adsCoveredByPass,
  adsPassCopy,
  adsPassLive,
  adsPassPriceLabel,
} from '@/lib/ads/offer'
import { ADS_VOICES } from '@/lib/ads/renderContract'
import AdsPageBanners, { AdsCtaLink, type AdsDoorCta } from './AdsPageBanners'

export const dynamic = 'force-dynamic'

const DESCRIPTION =
  'Make your own vertical video ad from your photos, clips and logo. Approve the script and voice, download the MP4. A human editor checks your first ad.'

export const metadata: Metadata = {
  title: 'Studio Ads — make your own video ad | Kineo',
  description: DESCRIPTION,
  alternates: { canonical: '/ads' },
  openGraph: { title: 'Studio Ads — make your own video ad', description: DESCRIPTION, url: '/ads', type: 'website' },
  // While the pass is not on sale the page only says "Opens soon": keep it out of the index (and out of the sitemap).
  ...(adsPassLive() ? {} : { robots: { index: false, follow: true } }),
}

const CHECKOUT_HREF = '/api/stripe/checkout?pack=ads_pass'
const WIZARD_HREF = '/ads/new'
const DFY_HREF = '/business-video-ads'
/** A slow auth or database read must never hold the public door; past this, the page renders the safe default. */
const READ_TIMEOUT_MS = 2500
/** The promised review window: only ads delivered inside it count toward the review cap. */
const REVIEW_WINDOW_MS = 24 * 3600 * 1000

type Viewer = { signedIn: boolean; gate: 'ok' | 'no_access' | 'closed' | null; internal: boolean }
const ANONYMOUS: Viewer = { signedIn: false, gate: null, internal: false }

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

/** Businesses waiting for the human review of an ad delivered in the last 24 hours (distinct users; 0 on any failure). */
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

const HOW_IT_WORKS: { step: string; text: string }[] = [
  { step: 'Brief', text: 'Your business, the offer, the call to action and how customers reach you. A couple of minutes.' },
  { step: 'Your media', text: 'Upload your own photos, video clips and logo straight from your phone or computer.' },
  { step: 'Pick a model', text: `${ADS_MODELS.length} ad structures that small businesses use every day, each with its own rhythm.` },
  { step: 'Script and voice', text: 'Pick one of the script versions written from your brief, edit any line, listen to the voices and choose one.' },
  { step: 'Render and download', text: 'Your photos, narration, captions, music and end card become a vertical MP4. Download it and post it.' },
]

function DoorCta({ cta, placement, price }: { cta: AdsDoorCta; placement: 'hero' | 'price' | 'end'; price: string }) {
  if (cta === 'open') {
    return (
      <AdsCtaLink href={WIZARD_HREF} cta="open" placement={placement} className="go ok ads-go">
        Open Studio Ads <span aria-hidden="true">→</span>
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

export default async function StudioAdsPage() {
  const live = adsPassLive()
  const viewer = await withTimeout(readViewer(), ANONYMOUS)
  const canBuy = live || viewer.internal
  let cta: AdsDoorCta
  if (viewer.gate === 'ok') cta = 'open'
  else if (!canBuy) cta = 'soon'
  else cta = (await withTimeout(countOpenReviews(), 0)) >= ADS_MAX_OPEN_REVIEWS ? 'full' : 'buy'

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
          <a href="/" className="ads-brand"><KineoBolt size={26} />Kineo<span> / Studio Ads</span></a>
          <a href={DFY_HREF} className="ads-navlink">Have it made for you →</a>
        </nav>

        <Suspense fallback={null}>
          <AdsPageBanners live={live} cta={cta} />
        </Suspense>

        <header className="ads-hero">
          <p className="ads-eyebrow">STUDIO ADS · KINEO EMPRESAS</p>
          <h1>Your photos. Your logo. A narrated video ad, made by you.</h1>
          <p className="sub ads-intro">
            Write a short brief, upload your own photos, clips and logo, pick one of {ADS_MODELS.length} ad models,
            approve the script and the voice, and download a vertical MP4 ready for Reels, TikTok and Shorts.
          </p>
          <div className="ads-cta"><DoorCta cta={cta} placement="hero" price={price} /></div>
        </header>

        <section className="ads-sec" aria-labelledby="ads-how">
          <h2 id="ads-how">How it works</h2>
          <p className="ads-lede">Five steps, all on one page. You stay in control of every word and every photo.</p>
          <ol className="ads-how">
            {HOW_IT_WORKS.map((s, i) => (
              <li className="step" key={s.step}>
                <b>{String(i + 1).padStart(2, '0')} · {s.step.toUpperCase()}</b>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ads-sec" aria-labelledby="ads-models">
          <h2 id="ads-models">{ADS_MODELS.length} ad models</h2>
          <p className="ads-lede">Each model is a proven structure with a hook, a proof and a last frame with your logo and call to action. Every shot comes from your own photos and clips. {lengthsLabel} seconds.</p>
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

        <section className="ads-sec" aria-labelledby="ads-get">
          <h2 id="ads-get">What you get</h2>
          <div className="ads-get">
            <div className="card">
              <div className="lab">Included</div>
              <ul className="ads-list ok">
                {copy.includes.map((item) => <li key={item}>{item}</li>)}
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

        <section className="ads-sec ads-review" aria-labelledby="ads-review">
          <h2 id="ads-review">A person checks your first ad</h2>
          <p>A human editor reviews your first ad within 24 hours and sends a corrected version if anything is off.</p>
        </section>

        <section className="ads-sec" aria-labelledby="ads-price">
          <h2 id="ads-price">Price</h2>
          <div className="cost ads-price">
            <div className="sum">{copy.name} pass</div>
            <p className="ads-amount">{price}<span> one-time</span></p>
            <p className="ads-cover">About {adsCoveredByPass(35)} ads of 35 s or {adsCoveredByPass(60)} ads of 60 s.</p>
            <div className="val"><span>Credits</span><b>{ADS_PASS_CREDITS}</b></div>
            <div className="val"><span>Studio Ads access</span><b>{ADS_PASS_ACCESS_DAYS} days</b></div>
            <div className="val"><span>Subscription</span><b>None</b></div>
            <div className="ads-cta"><DoorCta cta={cta} placement="price" price={price} /></div>
            <p className="ads-fine">Shown in US dollars; the checkout may show the amount in your local currency.</p>
            {live ? <p className="ads-fine">Already on a paid Kineo plan? Studio Ads is open to you with your plan&apos;s credits — sign in and open it.</p> : null}
          </div>
        </section>

        <section className="ads-sec ads-faq" aria-labelledby="ads-faq">
          <h2 id="ads-faq">Questions</h2>
          <details open>
            <summary>What format is the ad?</summary>
            <p>Vertical 9:16, made for Reels, TikTok, Shorts and Stories. The length follows the model you pick: {lengthsLabel} seconds. The narration sets the final cut, so it can run a few seconds longer; it is never cut mid-sentence.</p>
          </details>
          <details>
            <summary>Which files can I upload?</summary>
            <p>JPG, PNG, MP4, MOV or WebM, up to 50 MB each. On an iPhone, send photos as JPG (Settings → Camera → Formats → Most Compatible) — HEIC, WebP, GIF and SVG files are not accepted yet. Send your logo as PNG or JPG. Only upload material you have the right to use.</p>
          </details>
          <details>
            <summary>What about the narration?</summary>
            <p>The script is written from your brief in the language you choose, and you can edit every line. You pick the narrator from {ADS_VOICES.length} voices and hear a short preview before you render.</p>
          </details>
          <details>
            <summary>Will my clips keep their own sound?</summary>
            <p>No. The narration and the music replace the original sound of your clips. Ads that keep your clip&apos;s original audio are coming next.</p>
          </details>
          <details>
            <summary>Do I need a subscription?</summary>
            <p>No. The pass is a single payment of {price} with {ADS_PASS_CREDITS} credits and {ADS_PASS_ACCESS_DAYS} days of Studio Ads. Nothing renews.</p>
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
.stu.ads-door{padding:0 0 12px}
.ads-door .ads-wrap{max-width:1120px;margin:0 auto;padding:0 34px}
.ads-door p,.ads-door li,.ads-door summary{overflow-wrap:break-word}
.ads-door a:focus-visible,.ads-door summary:focus-visible,.ads-door button:focus-visible{outline:3px solid #80c2ff;outline-offset:3px;border-radius:8px}
.ads-nav{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.ads-brand{display:flex;align-items:center;gap:9px;color:#fff;text-decoration:none;font-size:21px;font-weight:750;letter-spacing:-.02em}
.ads-brand span{font-size:12px;font-weight:500;color:rgba(255,255,255,.55);letter-spacing:0}
.ads-navlink{font-size:13px;color:#8fc6ff;text-decoration:none;font-weight:600}
.ads-navlink:hover{text-decoration:underline}
.ads-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:16px 0 0;padding:0 6px 0 14px;border-radius:12px;background:rgba(41,151,255,.08);border:1px solid rgba(41,151,255,.35);color:#dbeafe;font-size:14px;line-height:1.5}
.ads-banner p{margin:12px 0}
.ads-banner.err{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.45);color:#fecaca}
.ads-x{flex-shrink:0;min-width:44px;min-height:44px;background:none;border:0;color:inherit;font-size:20px;line-height:1;cursor:pointer}
.ads-hero{padding:46px 0 10px;max-width:780px}
.ads-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;color:#5cb3ff;margin:0 0 14px}
.stu.ads-door h1{font-size:clamp(31px,5vw,52px);line-height:1.08;letter-spacing:-.03em;margin:0 0 14px}
.ads-intro{font-size:16px;line-height:1.6;max-width:640px;margin:0 0 22px}
.ads-cta{max-width:380px}
.ads-go{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px 22px;text-decoration:none;text-align:center}
.ads-closed p{margin:0 0 8px;font-size:15px;font-weight:700;color:#fde68a}
.ads-closed .ads-soon{display:inline-block;padding:9px 16px;border-radius:999px;background:rgba(255,180,40,.12);border:1px solid rgba(255,180,40,.4);color:#ffb428;font-size:14px}
.ads-closed a{display:inline-block;font-size:13px;color:#8fc6ff;text-decoration:none;font-weight:600;padding:6px 0}
.ads-closed a:hover{text-decoration:underline}
.ads-sec{margin:52px 0}
.stu.ads-door h2{font-size:clamp(22px,3vw,30px);font-weight:700;letter-spacing:-.02em;margin:0 0 6px;color:#fff}
.ads-lede{font-size:14px;color:rgba(255,255,255,.58);margin:0 0 18px;max-width:680px;line-height:1.55}
.ads-how{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.ads-models{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.ads-model-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.ads-model-top b{font-size:16px;letter-spacing:-.01em}
.ads-secs{flex-shrink:0;font-size:11px;font-weight:800;color:#8fc6ff;background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.3);border-radius:999px;padding:2px 9px}
.ads-seg{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.72);line-height:1.45}
.ads-get{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ads-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px}
.ads-list li{position:relative;padding-left:22px;font-size:14px;line-height:1.5;color:rgba(255,255,255,.8)}
.ads-list li::before{position:absolute;left:0;top:0;font-weight:800}
.ads-list.ok li::before{content:'✓';color:#5cb3ff}
.ads-list.no li{color:rgba(255,255,255,.58)}
.ads-list.no li::before{content:'–';color:rgba(255,255,255,.4)}
.ads-review{padding:20px 18px;border-radius:16px;border:1px solid rgba(41,151,255,.35);background:rgba(41,151,255,.06)}
.ads-review p{margin:0;font-size:15px;line-height:1.55;color:rgba(255,255,255,.85)}
.ads-price{max-width:520px}
.ads-amount{margin:2px 0 14px;font-size:40px;font-weight:750;letter-spacing:-.03em;color:#fff;line-height:1.05}
.ads-amount span{font-size:14px;font-weight:600;color:rgba(255,255,255,.6);letter-spacing:0}
.ads-cover{margin:-6px 0 14px;font-size:13px;color:#8fc6ff;line-height:1.45}
.ads-price .val{gap:14px;margin-bottom:8px}
.ads-price .ads-cta{margin-top:16px}
.ads-fine{margin:12px 0 0;font-size:12px;color:rgba(255,255,255,.5);line-height:1.5}
.ads-faq{max-width:820px}
.ads-faq details{border-bottom:1px solid rgba(255,255,255,.09);padding:14px 0}
.ads-faq summary{cursor:pointer;font-size:15px;font-weight:700;color:#fff;min-height:28px}
.ads-faq details p{margin:10px 0 0;font-size:14px;line-height:1.65;color:rgba(255,255,255,.66)}
.ads-faq a{color:#8fc6ff}
@media(max-width:900px){
  .stu.ads-door{padding:0 0 12px}
  .ads-door .ads-wrap{padding:0 16px}
  .ads-hero{padding-top:30px}
  .ads-sec{margin:38px 0}
  .ads-get{grid-template-columns:1fr}
  .ads-cta{max-width:none}
  .ads-amount{font-size:34px}
}
`
