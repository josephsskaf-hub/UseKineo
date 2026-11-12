// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — the public door of Studio Ads (Kineo Empresas, self-serve).
//
// Founder, 24/09 evening: a bakery, a pharmacy or a dentist must be able to buy and make its own ad ALONE —
// upload its photos, clips and logo, get the narration and download the finished ad, with no manual work by Kineo.
// This page sells that and nothing more. It lives OUTSIDE (dashboard) because that layout forces noindex.
//
// SOURCES, NEVER TYPED HERE: the includes/excludes lists come from lib/ads/offer.ts; the 8 models from lib/ads/models.ts; the voices from lib/ads/renderContract.ts.
//
// KINEO-ADS-SEM-PRECO-0411 [fundador 04/11: "Não quero isso mais. /ads tem que ter só o que o cara vai trabalhar, não tem que ter o pricing. Não tem que ter valor."]
// This page shows what Studio Ads makes, how it works, examples and ONE button that opens the flow. No price, no pass, no plan card, no credits.
// The pass is off sale (lib/ads/offer.ts adsPassOnSale); Studio Ads itself stays open and indexed (adsPassLive). Who cannot pay for an ad finds the plans
// at the point of generating, inside /ads/v2 (lib/ads/eligibilityPure adsV2RefusalFor, AdsEligibilityNotice). Guardian: scripts/test-frente-0411.mjs.
// The button: Studio Ads closed and not internal → "Opens soon"; signed in → the maker; not signed in → the maker's guest screen (login comes at the first action that needs it).
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation' // KINEO-ADS-V2-VIRADA-2026-09-29 — go=maker
import Footer from '@/components/Footer'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect } from '@/components/InterfaceLanguage'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { createClient } from '@/lib/supabase/server'
import { footageAdminClient } from '@/lib/userFootage'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { ADS_MODELS, type AdsModel } from '@/lib/ads/models'
import { adsPassCopy, adsPassLive } from '@/lib/ads/offer'
import { ADS_VOICES } from '@/lib/ads/renderContract'
import { ADS_V2_PUBLIC, ADS_V2_TIER_IDS } from '@/lib/ads/v2Tiers' // KINEO-ADS-V2-VIRADA-2026-09-29
import { ADS_V2_HOW_IT_WORKS, ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '@/lib/ads/v2Screen' // KINEO-ADS-V2-VIRADA-2026-09-29
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '@/lib/ads/v2ShotLists' // KINEO-ADS-V2-VIRADA-2026-09-29
import AdsPageBanners, { AdsCtaLink, type AdsDoorCta } from './AdsPageBanners'
import { ANUNCIO_DA_PORTA } from '@/lib/growth/visitanteEscreveAntes' // KINEO-CARDS-ANTES-DO-LOGIN-0411 — sem conta, o botão abre a tela do anúncio
// KINEO-ADS-PAREDE-2026-10-06 — a oferta da parede saiu daqui (KINEO-ADS-SEM-PRECO-0411); só a leitura de "sem sessão" continua.
import { adsPaywallNoSession } from '@/lib/ads/paywall'
import { UGC_PILLAR_PATH } from '@/lib/seo/paginasUgc2010' // KINEO-PAGINAS-UGC-2010 — a porta do menu "Product ads" leva à página do UGC
// KINEO-ADS-AMOSTRA-2026-10-09 — o PRIMEIRO anúncio grátis (lib/ads/sample.ts): a porta explica a amostra embaixo do botão, para quem ela está aberta.
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample'
import { headers } from 'next/headers' // KINEO-ADS-SIMPLES-2810 — o país do pedido para a régua única
import { paisDoRequest } from '@/lib/freeFilmPolicy' // KINEO-ADS-SIMPLES-2810
import { loadAdsEligibility } from '@/lib/ads/eligibility' // KINEO-ADS-SIMPLES-2810 — a régua ÚNICA da amostra (a mesma do /ads/v2 e dos cards)
import { ADS_ESCOLHA_SAMPLE_PHOTOS, ADS_ESCOLHA_SAMPLE_SECONDS } from '@/lib/ads/cena/escolhaSamplePolicy' // KINEO-ADS-SIMPLES-2810 — a copy da amostra nasce dos números reais (8 s, 2 fotos)
// KINEO-ESTILOS-PRODUTO-2026-10-09 — a faixa dos estilos de produto (prévias feitas pelo próprio efeito).
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'
import { AdsStyleStrip } from '@/components/ads/AdsStyles'
import { AdsExemplosGrid } from '@/components/ads/AdsExemplos' // KINEO-ADS-EXEMPLOS-1111
import { ADS_EXEMPLOS_LIVE } from '@/lib/ads/adsExemplos' // KINEO-ADS-EXEMPLOS-1111
// KINEO-COPY-CONTRADICOES-1510 — a pessoa de IA do anúncio v2 existe (lib/ads/v2Presenter.ts, só 9:16, lib/ads/v2Formats.ts);
// a porta passa a dizer isso em "Included" em vez de só listar "Presenter or avatar" em "Not included yet".
import { ADS_V2_PRESENTER_PUBLIC } from '@/lib/ads/v2Presenter'

export const dynamic = 'force-dynamic'

// KINEO-ADS-V2-VIRADA-2026-09-29 — the description sells the v2 ad (real photos in motion, ~15 s), not the v1 narrated ad.
const DESCRIPTION =
  'Your real business photos, brought to life in a vertical video ad of about 15 seconds, with music, a short voice-over and your logo. Included in any paid plan.'

export const metadata: Metadata = {
  title: 'Studio Ads — make your own video ad | Kineo',
  description: DESCRIPTION,
  alternates: { canonical: '/ads' },
  openGraph: { title: 'Studio Ads — make your own video ad', description: DESCRIPTION, url: '/ads', type: 'website' },
  // While Studio Ads is closed the page only says "Opens soon": keep it out of the index (and out of the sitemap). The pass being off sale changes nothing here.
  ...(adsPassLive() ? {} : { robots: { index: false, follow: true } }),
}

// KINEO-ADS-V2-VIRADA-2026-09-29 — the main button opens the ad maker (/ads/v2); the old wizard is the classic option.
const MAKER_HREF = ADS_V2_PUBLIC ? '/ads/v2' : '/ads/new'
const CLASSIC_HREF = '/ads/new?classic=1'
const DFY_HREF = '/business-video-ads'
/** A slow auth or database read must never hold the public door; past this, the page renders the safe default. */
const READ_TIMEOUT_MS = 2500
type Viewer = { signedIn: boolean; gate: 'ok' | 'no_access' | 'closed' | null; internal: boolean }
/** O id (a régua da amostra) e se o getUser CONFIRMOU "sem sessão". ANONYMOUS é também o valor do timeout: ali noSession fica false — leitura que estourou o tempo é "não sei", nunca "anônimo". */
type DoorViewer = Viewer & { userId: string | null; noSession: boolean }
const ANONYMOUS: DoorViewer = { signedIn: false, gate: null, internal: false, userId: null, noSession: false }

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

/** Who is looking: the verified auth e-mail (getUser), never profiles.email. KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — o parceiro ativo entra com gate 'ok' (loadAdsAccess); esta porta não oferece plano a ninguém. */
async function readViewer(): Promise<DoorViewer> {
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    // KINEO-ADS-PAREDE-2026-10-06 — anônimo CONFIRMADO só quando o auth respondeu "sem sessão"; erro de auth é "não sei".
    if (!user) return { ...ANONYMOUS, noSession: adsPaywallNoSession(error) }
    const internal = isAdsInternalEmail(user.email)
    try {
      // KINEO-EQUIPE-BUSINESS-2026-10-10 — o workspace: o membro de uma equipe Business vê a porta do DONO ("Make your ad").
      const { reason } = await loadAdsAccess(user.id, user.email, { workspace: true })
      return { signedIn: true, gate: adsGate(reason), internal, userId: user.id, noSession: false }
    } catch {
      return { signedIn: true, gate: null, internal, userId: user.id, noSession: false }
    }
  } catch {
    return ANONYMOUS
  }
}

function mediaNeeds(model: AdsModel): string {
  const photos = `your logo and at least ${model.inputs.minPhotos} photos`
  if (model.inputs.video === 'required') return `${photos} plus one video clip`
  if (model.inputs.video === 'optional') return `${photos}; video clips optional`
  return `${photos}; photos only`
}

// KINEO-ADS-V2-VIRADA-2026-09-29 — the 3 levels of the v2 ad: name and pitch from ADS_V2_TIER_COPY. KINEO-ADS-SEM-PRECO-0411 — no credits on this page.
const V2_LEVELS = ADS_V2_TIER_IDS.map((id) => ({ id, name: ADS_V2_TIER_COPY[id].name, pitch: ADS_V2_TIER_COPY[id].pitch }))

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

function DoorCta({ cta, placement, href }: { cta: AdsDoorCta; placement: 'hero' | 'end'; href: string }) {
  if (cta === 'open') {
    return (
      <AdsCtaLink href={href} cta="open" placement={placement} className="go ok ads-go">
        Make your ad <span aria-hidden="true">→</span>
      </AdsCtaLink>
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
  // KINEO-ADS-SEM-PRECO-0411 — one button, whatever the account: with Studio Ads open it opens the flow; the plans show up at the point of generating.
  const cta: AdsDoorCta = live || viewer.internal ? 'open' : 'soon'
  // KINEO-ADS-V2-VIRADA-2026-09-29 — the /ads/for/<segment> button carries go=maker (those pages are static and cannot
  // tell who is looking): whoever can already make an ad goes straight to the maker; everyone else stays on this door.
  // REVISÃO 29/09: o redirect leva os utm_* curtos e limpos (o SourceCapture do /ads/v2 grava a origem; sem eles o clique
  // do /ads/for de quem já tem acesso chegava ao montador sem atribuição nenhuma).
  if (ADS_V2_PUBLIC && viewer.gate === 'ok' && first(searchParams?.go) === 'maker') redirect(withCleanUtm(MAKER_HREF, searchParams))

  const from = first(searchParams?.from)
  // KINEO-ADS-SEM-PRECO-0411 — /ads/new (classic, no access) and old links arrive with ?from=new|v2: say why, and where the plans are, with no price on this page.
  const returnedFromWizard = (from === 'new' || from === 'v2') && viewer.signedIn && viewer.gate === 'no_access'
  // KINEO-CARDS-ANTES-DO-LOGIN-0411 — sem conta, o botão abre a tela do anúncio; o login vem na primeira ação que precisa dele.
  const makerHref = ADS_V2_PUBLIC && !viewer.signedIn ? ANUNCIO_DA_PORTA : MAKER_HREF
  // KINEO-ADS-AMOSTRA-2026-10-09 / KINEO-ADS-SIMPLES-2810 — a nota da amostra pergunta à régua ÚNICA (lib/ads/eligibility.ts). A amostra em si não muda. Timeout/erro = sem nota (falha fechada).
  const elegibilidadePorta = live && ADS_SAMPLE_LIVE && ADS_V2_PUBLIC && viewer.signedIn && viewer.gate === 'no_access' && viewer.userId ? await withTimeout(loadAdsEligibility(footageAdminClient(), { id: viewer.userId }, 'none', { requestCountry: paisDoRequest(headers()) }), null) : null
  const sampleOpen = ADS_SAMPLE_LIVE && live && ADS_V2_PUBLIC && (viewer.signedIn ? elegibilidadePorta?.state === 'free_sample_available' : viewer.noSession)
  const copy = adsPassCopy()
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
          <AdsPageBanners live={live} cta={cta} from={from} />
        </Suspense>

        {/* KINEO-ADS-SEM-PRECO-0411 — no offer here: whoever came back from a door without access gets one line pointing to the plans. */}
        {returnedFromWizard ? (
          <div className="ads-banner ads-returned" role="status">
            <p>
              <b>Studio Ads is part of every paid plan.</b> <a href="/pricing?intent_campaign=ads_door">See plans →</a>
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
          {/* KINEO-PAGINA-IGUAL-0411 — fundador 04/11: "tem uma diferença enorme… queria deixar tudo igual". A mesma página para todos, com um botão principal no mesmo lugar. */}
          <div className="ads-cta" data-kineo={sampleOpen ? 'ads-door-sample' : undefined}>
            <DoorCta cta={cta} placement="hero" href={makerHref} />
            {sampleOpen && cta === 'open' ? <p className="gnote">One {ADS_ESCOLHA_SAMPLE_SECONDS}-second ad per account: an AI presenter with your real product, {ADS_ESCOLHA_SAMPLE_PHOTOS} stills to pick from, voice-over and music, with a small usekineo.com watermark. No card needed.</p> : null}
          </div>
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

        {/* KINEO-ADS-EXEMPLOS-1111 — o anúncio PRONTO primeiro (é o que os líderes mostram), o efeito solto depois. Uma linha nova em
            lib/ads/adsExemplos.ts = um anúncio novo aqui. Todos foram feitos à mão pela casa, fora do Studio Ads (os de Natal e os 3 falados): o texto não diz que a ferramenta os fez nem "em um clique". */}
        {ADS_EXEMPLOS_LIVE ? (
          <section className="ads-sec" aria-labelledby="ads-examples" data-kineo="ads-door-examples">
            <h2 id="ads-examples">Ads made with Kineo</h2>
            <p className="ads-lede">Made by the Kineo team with the same AI models you get in Kineo. Products and brands are fictional. Tap one to watch it with sound.</p>
            <AdsExemplosGrid />
          </section>
        ) : null}

        {/* KINEO-ESTILOS-PRODUTO-2026-10-09 — os estilos de produto, com a prévia feita pelo próprio efeito. */}
        {ADS_V2_STYLES_PUBLIC ? (
          <section className="ads-sec" aria-labelledby="ads-styles" data-kineo="ads-door-styles">
            <h2 id="ads-styles">Styles for your product shot</h2>
            <p className="ads-lede">Pick a style for your product shot: {ADS_V2_STYLES.length} effects made from your own product photo. No product photo, no effect — or choose Auto for none.</p>
            <AdsStyleStrip />
          </section>
        ) : null}

        <section className="ads-sec" aria-labelledby="ads-levels">
          <h2 id="ads-levels">{V2_LEVELS.length} levels</h2>
          <p className="ads-lede">Every level starts from your own photos and ends on your logo.</p>
          <ul className="ads-models">
            {V2_LEVELS.map((l) => (
              <li className="card ads-model" key={l.id}>
                <div className="ads-model-top"><b>{l.name}</b></div>
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
                <li>Every shot, the words on screen and the voice-over shown before you generate</li>
                <li>Not happy with a shot? Redo just that one</li>
                {ADS_V2_PRESENTER_PUBLIC ? <li>Optional AI person: holds your product while a voiceover tells the story, always labeled as AI, in vertical 9:16</li> : null}
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
          <p className="ads-lede">Prefer a longer ad with a script written from your brief? The classic maker still makes it from your photos and clips: {ADS_MODELS.length} ad models, {lengthsLabel} seconds. A person checks your first classic ad.</p>
          <p className="ads-classic-link"><a href={CLASSIC_HREF}>Open the classic maker →</a></p>
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

        {/* KINEO-PAGINAS-UGC-2010 — a página do UGC a 1 clique da porta do menu "Product ads". */}
        <p className="ads-fine" data-kineo="ads-ugc-pages"><a href={UGC_PILLAR_PATH}>AI UGC ads: an AI person holds your product</a></p>

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
            <p>A short voice-over is written from your sentence, with music under it. You see it in the plan before you generate, and you can turn it off. The classic maker writes a longer script you can edit line by line, with {ADS_VOICES.length} voices to choose from.</p>
          </details>
          <details>
            <summary>Can I use video clips?</summary>
            <p>The new ad is made from photos: each one gets its own movement. To put your own clips in an ad, use the <a href={CLASSIC_HREF}>classic maker</a>; there the narration and the music replace the original sound of your clips.</p>
          </details>
          <details>
            <summary>I would rather have someone make it for me.</summary>
            <p>That is Kineo Empresas: you send the brief and a person produces the video, in <a href={DFY_HREF}>Express or Pro</a>.</p>
          </details>
        </section>

        {cta === 'open' ? (
          <section className="ads-sec" aria-label="Get started">
            <h2>Your next ad is a few steps away.</h2>
            <div className="ads-cta"><DoorCta cta={cta} placement="end" href={makerHref} /></div>
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
.ads-banner.ads-sample{flex-direction:column;align-items:stretch;gap:0;padding:0 14px 14px}
/* KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — a oferta do Business depois da amostra: o anúncio dela (9:16) ao lado do texto. */
.ads-after-row{display:flex;gap:16px;align-items:flex-start;padding-top:14px;flex-wrap:wrap}
.ads-after-ad{margin:0;flex:0 0 150px;max-width:150px}
.ads-after-ad video{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:10px;background:#000}
.ads-after-ad .ads-after-label{display:block;margin-top:6px;font-size:12px;opacity:.75}
.ads-after-text{flex:1 1 240px;min-width:0}
.ads-after-text p{margin:0 0 10px}
.ads-after-text .ads-after-more{margin:10px 0 0}
@media(max-width:520px){.ads-after-ad{flex-basis:120px;max-width:120px}}
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
/* KINEO-ADS-PAREDE-2026-10-06 — a oferta da parede (app/ads/AdsPaywall.tsx): texto à esquerda, plano à direita, Express embaixo
   do texto; no celular empilha texto → plano → Express (o botão principal vem antes do secundário). Sem Express, uma linha só. */
.stu.ads-door .ads-paywall{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,400px);grid-template-areas:"copy plan" "express plan";gap:18px 44px;align-items:start;margin:22px 0 6px;padding:32px 34px;border-radius:22px;background:var(--card);border:1px solid var(--border2);box-shadow:var(--sh-card)}
.stu.ads-door .ads-paywall.ads-paywall-solo{grid-template-areas:"copy plan";align-items:center}
.ads-paywall-copy{grid-area:copy;align-self:end;min-width:0}
.stu.ads-door .ads-paywall.ads-paywall-solo .ads-paywall-copy{align-self:center}
.stu.ads-door .ads-paywall h2{font-size:clamp(26px,3.4vw,40px);line-height:1.1;letter-spacing:-.03em;margin:0 0 12px}
.ads-paywall-sub{margin:0;max-width:480px;font-size:15px;line-height:1.6;color:var(--muted)}
.ads-paywall-plan{grid-area:plan;min-width:0;padding:20px 20px 14px;border-radius:18px;background:var(--accent-soft);border:1px solid var(--border2)}
.ads-paywall-head{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;margin:0 0 8px}
.ads-paywall-head b{font-size:19px;font-weight:750;letter-spacing:-.01em;color:var(--text)}
.ads-paywall-price{font-size:24px;font-weight:750;letter-spacing:-.02em;color:var(--text);white-space:nowrap}
.ads-paywall-facts{list-style:none;margin:0 0 8px;padding:0}
.ads-paywall-facts li{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:9px 0;border-top:1px solid var(--border2);font-size:14px;line-height:1.4;color:var(--text2)}
.ads-paywall-facts b{flex-shrink:0;font-size:17px;font-weight:800;color:var(--accent)}
.ads-paywall-either{margin:0 0 14px;font-size:12px;line-height:1.45;color:var(--muted2)}
.ads-paywall-express{grid-area:express;align-self:start;min-width:0;padding-top:16px;border-top:1px solid var(--border)}
.ads-paywall-express a{font-size:15px;font-weight:700;line-height:1.45;color:var(--accent);text-decoration:none}
.ads-paywall-express a:hover{text-decoration:underline}
.ads-paywall-express p{margin:4px 0 0;font-size:13px;line-height:1.5;color:var(--muted)}
@media(max-width:900px){
  .stu.ads-door{padding:0 0 12px}
  .ads-door .ads-wrap{padding:0 16px}
  .ads-hero{padding-top:30px}
  .ads-sec{margin:38px 0}
  .ads-get{grid-template-columns:1fr}
  .ads-doors{grid-template-columns:1fr}
  .ads-cta{max-width:none}
  .ads-amount{font-size:34px}
  .stu.ads-door .ads-paywall{grid-template-columns:minmax(0,1fr);grid-template-areas:"copy" "plan" "express";gap:16px;margin-top:16px;padding:22px 16px}
  .stu.ads-door .ads-paywall.ads-paywall-solo{grid-template-areas:"copy" "plan"}
  .ads-paywall-copy{align-self:start}
}
`
