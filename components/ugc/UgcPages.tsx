// KINEO-PAGINAS-UGC-2010 — as páginas públicas do AI UGC Ads (pilar EN/PT, 12 nichos, termo "AI UGC video generator") e do
// Kit Black Friday (EN/PT). Texto em lib/growth/paginasUgc2010Content.ts; números em lib/growth/paginasUgc2010Facts.ts (das
// funções que cobram); caminhos, hreflang e destinos dos botões em lib/seo/paginasUgc2010.ts. Guardião:
// scripts/test-paginas-ugc-2010.mjs.
//
// Visual: a linguagem dos 3 cards novos da home (mídia escura com cantos de 22 px, selo de vidro com o produto real, botão
// azul da casa) num fundo claro com o tema escuro da casa (html[data-theme=dark]). Vídeo com preload="none" + pôster e play
// só na tela (UgcVideo). Cartão de vídeo/rosto SEM preço: crédito só no bloco "What it costs" e no FAQ.
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import UgcCtaLink from '@/components/ugc/UgcCtaLink'
import UgcVideo from '@/components/ugc/UgcVideo'
import { ADS_V2_PRESENTER_LIBRARY, type AdsV2PresenterEntry } from '@/lib/ads/v2Presenter'
import { ADS_V2_PRESENTER_V2_APPROVED, adsV2PresenterV2Visible } from '@/lib/ads/v2PresenterV2'
import { HOME_CARD_BADGE, HOME_CARD_CLIPS } from '@/lib/ui/homeThreeCards'
import { KIT_BF_CHECKOUT_HREF } from '@/lib/ads/kitBfSale'
import { paginasUgcFacts } from '@/lib/growth/paginasUgc2010Facts'
import { UGC_NICHES, bfCopy, ugcGeneratorCopy, ugcPillarCopy, ugcScriptWords, type UgcFacts, type UgcLang, type UgcQa } from '@/lib/growth/paginasUgc2010Content'
import {
  BF_EN_PATH, BF_PT_PATH, PAGINAS_UGC_BASE, PAGINAS_UGC_CAMPAIGN, PAGINAS_UGC_MARK, PAGINAS_UGC_REVIEWED_ISO, UGC_GENERATOR_PATH,
  UGC_NICHE_SLUGS, UGC_PILLAR_PATH, UGC_PILLAR_PT_PATH, bfCtaHref, paginasUgcAlternates, ugcNichePath, type UgcNicheSlug,
} from '@/lib/seo/paginasUgc2010'

const BASE = PAGINAS_UGC_BASE
/** O vídeo do card "AI UGC Ads" da home (apresentador v2 R3, pedido 84a5d07f, nota 9 do fundador, 17/10): 8,9 s, mudo. */
const HERO_CLIP = HOME_CARD_CLIPS.ugc_ads.default
const HERO_CLIP_SECONDS = 9
const HERO_CLIP_DATE = '2026-10-17'
const HERO_BADGE = HOME_CARD_BADGE.ugc_ads

export const UGC_PAGE_CSS = `
.kug{--bg:#F7F7F5;--card:#FFFFFF;--card2:#F1F1EE;--line:#E4E4E0;--txt:#0E1116;--txt2:#2A2F37;--muted:#5A5F67;--blue:#0A5CFF;--blue-ink:#0A5CFF;--blue-soft:#E8EFFF;--on-blue:#fff;--wash:#EEF3FF;--sh:0 1px 2px #0E111608,0 8px 24px -12px #0E111614;
min-height:100vh;color:var(--txt);background:radial-gradient(ellipse 1100px 620px at 0 0,var(--wash),transparent 72%),var(--bg);font-family:var(--font-sans),Inter,system-ui,-apple-system,sans-serif;overflow-x:clip}
html[data-theme=dark] .kug{--bg:#07090D;--card:#10141B;--card2:#161B24;--line:#1F2530;--txt:#F2F4F7;--txt2:#C9CFD8;--muted:#9AA3B2;--blue:#4D8DFF;--blue-ink:#8DB4FF;--blue-soft:#12203A;--on-blue:#04122E;--wash:#0E1A30;--sh:inset 0 1px 0 #ffffff08,0 8px 30px #00000033}
.kug a{color:inherit}
.kug-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.kug-nav{display:flex;align-items:center;gap:20px;min-height:68px;font-size:14px}
.kug-brand{font-weight:800;font-size:21px;letter-spacing:-.03em;text-decoration:none;margin-right:auto}
.kug-nav a:not(.kug-brand){color:var(--muted);text-decoration:none;font-weight:600}
.kug-nav a:not(.kug-brand):hover{color:var(--txt)}
.kug-crumbs{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 0}
.kug-crumbs a{color:var(--blue-ink);text-decoration:none;font-weight:600}
.kug-hero{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr);gap:56px;align-items:center;padding:28px 0 56px}
.kug-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-ink);background:var(--blue-soft);border-radius:999px;padding:7px 12px;margin:0}
.kug h1{font-size:clamp(2rem,4.1vw,3.35rem);line-height:1.05;letter-spacing:-.035em;font-weight:820;margin:18px 0 0;text-wrap:balance}
.kug-lead{font-size:clamp(1.02rem,1.3vw,1.16rem);line-height:1.6;color:var(--txt2);margin:18px 0 0;max-width:62ch}
.kug-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;margin:26px 0 0}
.kug-cta{display:inline-flex;align-items:center;gap:9px;background:var(--blue);color:var(--on-blue)!important;font-weight:760;font-size:15.5px;padding:15px 24px;border-radius:999px;text-decoration:none;box-shadow:0 1px 2px #0A5CFF33,0 8px 20px -8px #0A5CFF77;transition:transform .2s ease,box-shadow .2s ease}
.kug-cta:hover{transform:translateY(-1px);box-shadow:0 2px 4px #0A5CFF33,0 12px 26px -10px #0A5CFF88}
.kug-cta span{transition:transform .25s ease}.kug-cta:hover span{transform:translateX(3px)}
.kug-link{color:var(--blue-ink)!important;font-weight:650;text-decoration:none}
.kug-link:hover{text-decoration:underline}
.kug-note{font-size:13.5px;color:var(--muted);margin:12px 0 0}
.kug-reviewed{font-size:12.5px;color:var(--muted);margin:14px 0 0}
.kug-media{position:relative;justify-self:center;width:min(100%,360px);aspect-ratio:9/16;border-radius:22px;overflow:hidden;isolation:isolate;background:#0B0E14;border:1px solid var(--line);box-shadow:0 1px 2px rgba(10,14,22,.06),0 26px 54px -28px rgba(10,14,22,.6)}
.kug-media video,.kug-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.kug-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(5,7,11,.36) 0%,rgba(5,7,11,0) 18%,rgba(5,7,11,0) 62%,rgba(5,7,11,.82) 100%)}
.kug-badge{position:absolute;left:14px;top:14px;z-index:2;display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:.11em;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(10,12,18,.46);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.kug-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#7CF0B2;box-shadow:0 0 0 3px rgba(124,240,178,.18)}
.kug-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:16px 16px 15px;color:rgba(255,255,255,.88);font-size:12.5px;line-height:1.45}
.kug-cap b{display:block;color:#fff;font-size:15px;margin-bottom:3px;letter-spacing:-.01em}
.kug-sec{padding:52px 0;border-top:1px solid var(--line)}
.kug h2{font-size:clamp(1.45rem,2.4vw,2rem);line-height:1.15;letter-spacing:-.025em;font-weight:800;margin:0 0 10px}
.kug h3{font-size:1.06rem;line-height:1.3;margin:0 0 6px;font-weight:760;letter-spacing:-.01em}
.kug-sec>.kug-wrap>p,.kug-intro{color:var(--txt2);line-height:1.65;margin:0 0 12px;max-width:72ch}
.kug-summary{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:16px;padding:22px 24px;box-shadow:var(--sh)}
.kug-summary p{margin:0 0 10px;line-height:1.65;color:var(--txt2)}.kug-summary p:last-child{margin:0}
.kug-steps{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:k}
.kug-steps li{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--sh);counter-increment:k}
.kug-steps li::before{content:counter(k);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--blue-soft);color:var(--blue-ink);font-weight:800;margin-bottom:14px}
.kug-steps p,.kug-card p{margin:0;color:var(--muted);line-height:1.55;font-size:15px}
.kug-faces{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:22px 0 0}
.kug-face{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:var(--sh);display:flex;flex-direction:column}
.kug-face figure{margin:0;position:relative;aspect-ratio:3/4;background:#0B0E14}
.kug-face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.kug-face-body{padding:14px 14px 16px;display:flex;flex-direction:column;gap:8px}
.kug-face-body b{font-size:16px}
.kug-face-body span{font-size:13px;color:var(--muted)}
.kug-face audio{width:100%;height:34px}
.kug-examples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:22px 0 0}
.kug-examples .kug-media{width:100%;max-width:320px}
.kug-rules{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:10px;max-width:820px}
.kug-rules li{position:relative;padding:12px 14px 12px 44px;background:var(--card);border:1px solid var(--line);border-radius:14px;line-height:1.5;color:var(--txt2)}
.kug-rules li::before{content:'';position:absolute;left:15px;top:15px;width:16px;height:16px;border-radius:50%;background:var(--blue-soft);box-shadow:inset 0 0 0 5px var(--blue)}
.kug-niches{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:20px 0 0}
.kug-niches a{display:flex;flex-direction:column;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;text-decoration:none;box-shadow:var(--sh);transition:transform .2s ease,border-color .2s ease}
.kug-niches a:hover{transform:translateY(-2px);border-color:var(--blue)}
.kug-niches b{font-size:15.5px}.kug-niches span{font-size:13px;color:var(--muted);line-height:1.45}
.kug-cost{display:grid;gap:10px;max-width:860px}
.kug-cost p{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;line-height:1.6;color:var(--txt2)}
.kug-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0 0}
.kug-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:20px 0 0}
.kug-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 22px;box-shadow:var(--sh)}
.kug-script{display:grid;grid-template-columns:120px minmax(0,1fr);gap:20px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:var(--sh);margin:18px 0 0;max-width:860px}
.kug-script img{width:120px;aspect-ratio:3/4;object-fit:cover;border-radius:14px;display:block;background:#0B0E14}
.kug-script blockquote{margin:0;font-size:1.12rem;line-height:1.55;font-weight:600;letter-spacing:-.01em}
.kug-script blockquote span{display:block}
.kug-script small{display:block;margin-top:10px;color:var(--muted);font-size:13px;line-height:1.5}
.kug-ask{font-size:1.25rem;font-weight:700;letter-spacing:-.015em;line-height:1.4;margin:0;max-width:60ch}
.kug-ask::before{content:'\\201C'}.kug-ask::after{content:'\\201D'}
.kug-table{width:100%;border-collapse:separate;border-spacing:0;margin:18px 0 0;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.kug-table th,.kug-table td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.5;font-size:15px}
.kug-table tr:last-child th,.kug-table tr:last-child td{border-bottom:0}
.kug-table th{width:28%;font-weight:700}
.kug-table td{color:var(--txt2)}
.kug-cal{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kug-cal li{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:var(--sh);border-top:4px solid var(--blue)}
.kug-cal b{display:block;font-size:1.15rem;letter-spacing:-.02em;margin-bottom:6px}
.kug-cal span{color:var(--muted);font-size:14.5px;line-height:1.5}
.kug-src{font-size:12.5px;color:var(--muted);margin:12px 0 0;line-height:1.5}
.kug-faq{display:grid;gap:10px;max-width:880px;margin:16px 0 0}
.kug-faq details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:4px 18px}
.kug-faq summary{cursor:pointer;font-weight:700;padding:13px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}
.kug-faq summary::-webkit-details-marker{display:none}
.kug-faq summary::after{content:'+';color:var(--blue-ink);font-weight:800}
.kug-faq details[open] summary::after{content:'\\2212'}
.kug-faq p{margin:0 0 14px;color:var(--txt2);line-height:1.62}
.kug-related{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0}
.kug-related a{display:inline-flex;padding:9px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);text-decoration:none;font-size:14px;font-weight:600}
.kug-related a:hover{border-color:var(--blue);color:var(--blue-ink)}
.kug-closing{margin:8px 0 64px;border-radius:28px;padding:44px 40px;background:radial-gradient(ellipse 600px 300px at 100% 0,#1B3B8A,transparent 70%),#0B0E14;color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.kug-closing h2{color:#fff;margin:0 0 6px}.kug-closing p{margin:0;color:rgba(255,255,255,.78);max-width:56ch;line-height:1.55}
.kug-closing .kug-cta{background:#4D8DFF;color:#04122E!important}
@media (max-width:980px){.kug-hero{grid-template-columns:1fr;gap:34px;padding-top:18px}.kug-faces{grid-template-columns:repeat(2,minmax(0,1fr))}.kug-cal{grid-template-columns:repeat(2,minmax(0,1fr))}.kug-grid3{grid-template-columns:1fr}}
@media (max-width:760px){
.kug-wrap{padding:0 16px}
.kug-nav{gap:14px;font-size:13px}.kug-nav .kug-hide-sm{display:none}
.kug-sec{padding:40px 0}
.kug-steps,.kug-grid2{grid-template-columns:1fr}
.kug-examples{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:20px -16px 0;padding:0 16px 8px;gap:12px;scrollbar-width:none}
.kug-examples::-webkit-scrollbar{display:none}
.kug-examples .kug-media{flex:0 0 72%;scroll-snap-align:start}
.kug-media{width:min(100%,300px)}
.kug-script{grid-template-columns:84px minmax(0,1fr);gap:14px}.kug-script img{width:84px}
.kug-cal{grid-template-columns:1fr}
.kug-table th{width:36%}
.kug-closing{padding:30px 22px;border-radius:22px}
.kug-cta{width:100%;justify-content:center}
}
@media (prefers-reduced-motion:reduce){.kug-cta,.kug-cta span,.kug-niches a{transition:none}}
`

// ── dados derivados ──────────────────────────────────────────────────────────────────────────────────────────────
/** Os apresentadores que o cliente vê na tela de escolha (os aprovados, lib/ads/v2PresenterV2.ts) — a página segue a lista. */
export function ugcFaces(): AdsV2PresenterEntry[] {
  return ADS_V2_PRESENTER_LIBRARY.filter((p) => adsV2PresenterV2Visible(p.id, false) && ADS_V2_PRESENTER_V2_APPROVED.includes(p.id) && !!p.portrait)
}
const faceById = (id: string) => ADS_V2_PRESENTER_LIBRARY.find((p) => p.id === id) ?? null

function ld(obj: unknown) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
}
const faqLd = (faqs: readonly UgcQa[]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
const crumbsLd = (items: readonly { name: string; path: string }[]) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${BASE}${it.path}` })) })

export function ugcMetadata(path: string, title: string, description: string, locale: 'en_US' | 'pt_BR' = 'en_US'): Metadata {
  const alternates = paginasUgcAlternates(path)
  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: { title, description, url: alternates.canonical, type: 'website', siteName: 'Kineo (usekineo.com)', locale, images: [{ url: `${BASE}${HERO_CLIP.poster}`, width: 720, height: 1280, alt: 'AI presenter holding a product in a Kineo Studio Ads video' }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE}${HERO_CLIP.poster}`] },
  }
}

// ── peças comuns ─────────────────────────────────────────────────────────────────────────────────────────────────
function Nav({ lang }: { lang: UgcLang }) {
  const pt = lang === 'pt'
  return (
    <div className="kug-wrap">
      <nav className="kug-nav" aria-label={pt ? 'Navegação' : 'Main navigation'}>
        <Link className="kug-brand" href="/">Kineo</Link>
        <Link className="kug-hide-sm" href={pt ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH}>{pt ? 'Anúncios UGC' : 'AI UGC Ads'}</Link>
        <Link className="kug-hide-sm" href="/ads">{pt ? 'Anúncios de produto' : 'Product ads'}</Link>
        <Link href={pt ? BF_PT_PATH : BF_EN_PATH}>Black Friday</Link>
        <Link href="/pricing">{pt ? 'Preços' : 'Pricing'}</Link>
      </nav>
    </div>
  )
}

function HeroMedia({ caption, title }: { caption: string; title: string }) {
  return (
    <figure className="kug-media" style={{ margin: 0 }}>
      <UgcVideo src={HERO_CLIP.src} poster={HERO_CLIP.poster} label={title} />
      <span className="kug-shade" aria-hidden="true" />
      <span className="kug-badge" aria-hidden="true">{HERO_BADGE}</span>
      <figcaption className="kug-cap">{caption}</figcaption>
    </figure>
  )
}

function Faq({ heading, faqs }: { heading: string; faqs: readonly UgcQa[] }) {
  return (
    <section className="kug-sec" aria-labelledby="kug-faq">
      <div className="kug-wrap">
        <h2 id="kug-faq">{heading}</h2>
        <div className="kug-faq">{faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
      </div>
    </section>
  )
}

function Related({ heading, links }: { heading: string; links: readonly { href: string; label: string }[] }) {
  return (
    <section className="kug-sec" aria-labelledby="kug-related">
      <div className="kug-wrap">
        <h2 id="kug-related">{heading}</h2>
        <div className="kug-related">{links.map((l) => <Link key={l.href} href={l.href}>{l.label} →</Link>)}</div>
      </div>
    </section>
  )
}

function Shell({ lang, mark, children }: { lang: UgcLang; mark: string; children: ReactNode }) {
  return (
    <main className="kug" lang={lang === 'pt' ? 'pt-BR' : 'en'} data-paginas-ugc={PAGINAS_UGC_MARK} data-ugc-page={mark}>
      <style dangerouslySetInnerHTML={{ __html: UGC_PAGE_CSS }} />
      <Nav lang={lang} />
      {children}
      <Footer />
    </main>
  )
}

function FacesGrid({ lang, tag, voiceLabel }: { lang: UgcLang; tag: Record<string, string>; voiceLabel: string }) {
  return (
    <div className="kug-faces">
      {ugcFaces().map((p) => (
        <article className="kug-face" key={p.id} data-ugc-face={p.id}>
          <figure><img src={p.portrait as string} alt={lang === 'pt' ? `${p.name}, apresentador(a) de IA do Kineo` : `${p.name}, a Kineo AI presenter`} loading="lazy" decoding="async" width={360} height={480} /></figure>
          <div className="kug-face-body">
            <b>{p.name}</b>
            <span>{tag[p.tag] ?? p.tag} · {p.ageMin}–{p.ageMax}</span>
            {p.voiceSample ? <audio controls preload="none" src={p.voiceSample} aria-label={`${voiceLabel}: ${p.name}`} /> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

// ── a pilar (EN e PT) ────────────────────────────────────────────────────────────────────────────────────────────
export function ugcPillarMetadata(lang: UgcLang): Metadata {
  const c = ugcPillarCopy(lang, paginasUgcFacts())
  return ugcMetadata(lang === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH, c.title, c.description, lang === 'pt' ? 'pt_BR' : 'en_US')
}

export function UgcPillarPage({ lang }: { lang: UgcLang }) {
  const f: UgcFacts = paginasUgcFacts()
  const c = ugcPillarCopy(lang, f)
  const pt = lang === 'pt'
  const path = pt ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH
  const campaign = pt ? PAGINAS_UGC_CAMPAIGN.pillarPt : PAGINAS_UGC_CAMPAIGN.pillar
  const cta = f.freeUgcLive ? c.ctaFree : c.ctaPaid
  const clips = ugcFaces().filter((p) => p.clip)
  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: 'Kineo AI UGC Ads', brand: { '@type': 'Brand', name: 'Kineo' },
    description: c.description, image: `${BASE}${HERO_CLIP.poster}`, url: `${BASE}${path}`,
    offers: [
      ...(f.freeUgcLive ? [{ '@type': 'Offer', name: pt ? 'Primeiro anúncio UGC (amostra grátis, com marca-d’água)' : 'First AI UGC ad (free sample, watermarked)', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE}${path}` }] : []),
      { '@type': 'Offer', name: pt ? 'Plano de entrada (mensal), com o Studio Ads' : 'Entry plan (monthly), includes Studio Ads', price: f.starterPriceAmount, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE}/pricing` },
    ],
  }
  const howToLd = { '@context': 'https://schema.org', '@type': 'HowTo', name: c.howToName, step: c.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body, url: `${BASE}${path}#how` })) }
  const videoLd = { '@context': 'https://schema.org', '@type': 'VideoObject', name: c.examples[0].title, description: c.videoCaption, thumbnailUrl: [`${BASE}${HERO_CLIP.poster}`], uploadDate: HERO_CLIP_DATE, duration: `PT${HERO_CLIP_SECONDS}S`, contentUrl: `${BASE}${HERO_CLIP.src}`, embedUrl: `${BASE}${path}` }
  const related = pt
    ? [{ href: BF_PT_PATH, label: 'Anúncios de Black Friday com IA' }, { href: UGC_PILLAR_PATH, label: 'AI UGC Ads (English)' }, { href: '/ads', label: 'Anúncios de produto (Studio Ads)' }, { href: '/pricing', label: 'Preços' }]
    : [{ href: UGC_GENERATOR_PATH, label: 'AI UGC video generator' }, { href: BF_EN_PATH, label: 'Black Friday video ads kit' }, { href: '/ads', label: 'AI Product Ads (Studio Ads)' }, { href: '/vs/arcads-alternative', label: 'Kineo vs Arcads' }, { href: '/vs/creatify-alternative', label: 'Kineo vs Creatify' }, { href: UGC_PILLAR_PT_PATH, label: 'Anúncios UGC com IA (Português)' }, { href: '/pricing', label: 'Pricing' }]
  return (
    <Shell lang={lang} mark={pt ? 'pillar-pt' : 'pillar'}>
      {ld(faqLd(c.faqs))}{ld(howToLd)}{ld(videoLd)}{ld(productLd)}{ld(crumbsLd([{ name: 'Kineo', path: '/' }, { name: c.eyebrow, path }]))}
      <div className="kug-wrap">
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="kug-lead">{c.lead}</p>
            <div className="kug-actions">
              <UgcCtaLink className="kug-cta" campaign={campaign} placement="hero">{cta} <span aria-hidden="true">→</span></UgcCtaLink>
              <a className="kug-link" href="#how">{pt ? 'Como funciona' : 'How it works'}</a>
            </div>
            <p className="kug-note">{c.ctaNote}</p>
            <p className="kug-reviewed">{c.reviewed} {PAGINAS_UGC_REVIEWED_ISO}</p>
          </div>
          <HeroMedia caption={c.videoCaption} title={c.examples[0].title} />
        </header>
      </div>
      <section className="kug-sec" aria-labelledby="kug-summary">
        <div className="kug-wrap">
          <h2 id="kug-summary">{c.summaryHeading}</h2>
          <div className="kug-summary">{c.summary.map((p) => <p key={p}>{p}</p>)}</div>
        </div>
      </section>
      <section className="kug-sec" id="how" aria-labelledby="kug-how">
        <div className="kug-wrap">
          <h2 id="kug-how">{c.stepsHeading}</h2>
          <ol className="kug-steps">{c.steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-faces">
        <div className="kug-wrap">
          <h2 id="kug-faces">{c.facesHeading}</h2>
          <p className="kug-intro">{c.facesIntro}</p>
          <FacesGrid lang={lang} tag={c.faceTag} voiceLabel={c.voiceLabel} />
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-examples">
        <div className="kug-wrap">
          <h2 id="kug-examples">{c.examplesHeading}</h2>
          <p className="kug-intro">{c.examplesIntro}</p>
          <div className="kug-examples">
            <figure className="kug-media" style={{ margin: 0 }}>
              <UgcVideo src={HERO_CLIP.src} poster={HERO_CLIP.poster} label={c.examples[0].title} />
              <span className="kug-shade" aria-hidden="true" />
              <span className="kug-badge" aria-hidden="true">{HERO_BADGE}</span>
              <figcaption className="kug-cap"><b>{c.examples[0].title}</b>{c.examples[0].caption}</figcaption>
            </figure>
            {clips.map((p) => {
              const ex = c.examples.find((e) => e.title.startsWith(p.name)) ?? { title: p.name, caption: '' }
              return (
                <figure className="kug-media" style={{ margin: 0 }} key={p.id}>
                  <UgcVideo src={p.clip as string} poster={p.portrait as string} label={ex.title} />
                  <span className="kug-shade" aria-hidden="true" />
                  <span className="kug-badge" aria-hidden="true">KLING AVATAR</span>
                  <figcaption className="kug-cap"><b>{ex.title}</b>{ex.caption}</figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-rules">
        <div className="kug-wrap">
          <h2 id="kug-rules">{c.rulesHeading}</h2>
          <ul className="kug-rules">{c.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-niches">
        <div className="kug-wrap">
          <h2 id="kug-niches">{c.nichesHeading}</h2>
          <p className="kug-intro">{c.nichesIntro}</p>
          <div className="kug-niches">
            {UGC_NICHE_SLUGS.map((slug) => <Link key={slug} href={ugcNichePath(slug)}><b>{UGC_NICHES[slug].name}</b><span>{UGC_NICHES[slug].angle.heading}</span></Link>)}
          </div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-cost">
        <div className="kug-wrap">
          <h2 id="kug-cost">{c.costHeading}</h2>
          <div className="kug-cost">{c.cost.map((p) => <p key={p}>{p}</p>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-notbest">
        <div className="kug-wrap">
          <h2 id="kug-notbest">{c.notBestHeading}</h2>
          <ul className="kug-rules">{c.notBest.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
      <Faq heading={c.faqHeading} faqs={c.faqs} />
      <Related heading={c.relatedHeading} links={related} />
      <div className="kug-wrap">
        <div className="kug-closing">
          <div><h2>{c.closingHeading}</h2><p>{c.closingText}</p></div>
          <UgcCtaLink className="kug-cta" campaign={campaign} placement="closing">{cta} <span aria-hidden="true">→</span></UgcCtaLink>
        </div>
      </div>
    </Shell>
  )
}

// ── nichos ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** A pergunta comum a todos os nichos (a única repetida; o resto do FAQ é do nicho). */
function nicheSharedFaq(f: UgcFacts): UgcQa {
  return f.freeUgcLive
    ? { q: 'Is the first AI UGC ad free?', a: `Yes: one per account, ${f.sampleSeconds} seconds, with a small watermark${f.noCard ? ' and no card' : ''}. After that a 15-second UGC ad uses ${f.ugcCredits.s15} credits on any paid plan (from ${f.starterPrice} per month).` }
    : { q: 'What does an AI UGC ad cost?', a: `A 15-second UGC ad uses ${f.ugcCredits.s15} credits on any paid plan (from ${f.starterPrice} per month).` }
}
export function ugcNicheFaqs(slug: UgcNicheSlug, f: UgcFacts = paginasUgcFacts()): UgcQa[] {
  return [...UGC_NICHES[slug].faqs, nicheSharedFaq(f)]
}

export function ugcNicheMetadata(slug: UgcNicheSlug): Metadata {
  const n = UGC_NICHES[slug]
  return ugcMetadata(ugcNichePath(slug), n.title, n.description)
}

export function UgcNichePage({ slug }: { slug: UgcNicheSlug }) {
  const f = paginasUgcFacts()
  const n = UGC_NICHES[slug]
  const campaign = PAGINAS_UGC_CAMPAIGN.niche(slug)
  const cta = f.freeUgcLive ? 'Make my first UGC ad free' : 'Make my UGC ad'
  const face = faceById(n.script.presenter)
  const words = ugcScriptWords(n.script.lines)
  const faqs = ugcNicheFaqs(slug, f)
  return (
    <Shell lang="en" mark={`niche:${slug}`}>
      {ld(faqLd(faqs))}{ld(crumbsLd([{ name: 'Kineo', path: '/' }, { name: 'AI UGC Ads', path: UGC_PILLAR_PATH }, { name: n.name, path: ugcNichePath(slug) }]))}
      <div className="kug-wrap">
        <nav className="kug-crumbs" aria-label="Breadcrumb"><Link href="/">Kineo</Link><span aria-hidden="true">/</span><Link href={UGC_PILLAR_PATH}>AI UGC Ads</Link><span aria-hidden="true">/</span><span aria-current="page">{n.name}</span></nav>
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">AI UGC Ads · {n.name}</p>
            <h1>{n.h1}</h1>
            <p className="kug-lead">{n.intro}</p>
            <div className="kug-actions">
              <UgcCtaLink className="kug-cta" campaign={campaign} placement="hero">{cta} <span aria-hidden="true">→</span></UgcCtaLink>
              <Link className="kug-link" href={UGC_PILLAR_PATH}>How AI UGC ads work</Link>
            </div>
            <p className="kug-note">{f.freeUgcLive ? `1 free ad per account · ${f.sampleSeconds} s · small watermark${f.noCard ? ' · no card' : ''}` : 'Included in Studio Ads on paid plans.'}</p>
            <p className="kug-reviewed">Reviewed {PAGINAS_UGC_REVIEWED_ISO}</p>
          </div>
          <HeroMedia caption="Real Studio Ads presenter output (October 17, 2026), shown muted. Your ad uses your product and your presenter." title={`AI UGC ad example for ${n.name.toLowerCase()}`} />
        </header>
      </div>
      <section className="kug-sec" aria-labelledby="kug-angle">
        <div className="kug-wrap">
          <h2 id="kug-angle">{n.angle.heading}</h2>
          <p>{n.angle.body}</p>
          <p className="kug-ask">{n.shopperQuestion}</p>
          <p className="kug-note">The question shoppers in this niche ask most. A good presenter script answers it in the first five seconds.</p>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-formats">
        <div className="kug-wrap">
          <h2 id="kug-formats">Formats that work for {n.name.toLowerCase()}</h2>
          <div className="kug-grid3">{n.formats.map((x) => <div className="kug-card" key={x.name}><h3>{x.name}</h3><p>{x.why}</p></div>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-script">
        <div className="kug-wrap">
          <h2 id="kug-script">Example presenter script</h2>
          <div className="kug-script">
            {face?.portrait ? <img src={face.portrait} alt={`${face.name}, Kineo AI presenter`} loading="lazy" decoding="async" width={120} height={160} /> : <span />}
            <div>
              <blockquote>{n.script.lines.map((l) => <span key={l}>{l}</span>)}</blockquote>
              <small>Presenter: {face?.name ?? n.script.presenter} · {words} words, about 15 seconds of ad · written for a fictional product ({n.script.product}). Kineo writes yours from your own sentence and photos; you see it before anything is charged.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-prep">
        <div className="kug-wrap">
          <div className="kug-grid2">
            <div className="kug-card"><h2 id="kug-prep" style={{ fontSize: '1.25rem' }}>What to upload</h2><p>{n.photos}</p></div>
            <div className="kug-card"><h2 style={{ fontSize: '1.25rem' }}>Check before you post</h2><p>{n.check}</p></div>
          </div>
        </div>
      </section>
      <Faq heading={`AI UGC ads for ${n.name.toLowerCase()}: questions`} faqs={faqs} />
      <Related heading="More niches and guides" links={[
        ...n.related.map((r) => ({ href: ugcNichePath(r), label: `AI UGC ads for ${UGC_NICHES[r].name.toLowerCase()}` })),
        { href: UGC_PILLAR_PATH, label: 'AI UGC Ads: the full guide' },
        { href: BF_EN_PATH, label: 'Black Friday video ads kit' },
      ]} />
      <div className="kug-wrap">
        <div className="kug-closing">
          <div><h2>Your {n.name.toLowerCase()} product, in an AI presenter&apos;s hands</h2><p>Upload the photos, write one sentence, pick the presenter.</p></div>
          <UgcCtaLink className="kug-cta" campaign={campaign} placement="closing">{cta} <span aria-hidden="true">→</span></UgcCtaLink>
        </div>
      </div>
    </Shell>
  )
}

// ── /ai-ugc-video-generator ──────────────────────────────────────────────────────────────────────────────────────
export function ugcGeneratorMetadata(): Metadata {
  const c = ugcGeneratorCopy(paginasUgcFacts())
  return ugcMetadata(UGC_GENERATOR_PATH, c.title, c.description)
}

export function UgcGeneratorPage() {
  const f = paginasUgcFacts()
  const c = ugcGeneratorCopy(f)
  const campaign = PAGINAS_UGC_CAMPAIGN.generator
  return (
    <Shell lang="en" mark="generator">
      {ld(faqLd(c.faqs))}{ld(crumbsLd([{ name: 'Kineo', path: '/' }, { name: 'AI UGC Ads', path: UGC_PILLAR_PATH }, { name: 'AI UGC video generator', path: UGC_GENERATOR_PATH }]))}
      <div className="kug-wrap">
        <nav className="kug-crumbs" aria-label="Breadcrumb"><Link href="/">Kineo</Link><span aria-hidden="true">/</span><Link href={UGC_PILLAR_PATH}>AI UGC Ads</Link><span aria-hidden="true">/</span><span aria-current="page">AI UGC video generator</span></nav>
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            {c.answer.map((p) => <p className="kug-lead" key={p}>{p}</p>)}
            <div className="kug-actions">
              <UgcCtaLink className="kug-cta" campaign={campaign} placement="hero">{c.cta} <span aria-hidden="true">→</span></UgcCtaLink>
              <Link className="kug-link" href={UGC_PILLAR_PATH}>{c.pillarLink}</Link>
            </div>
            <p className="kug-reviewed">Reviewed {PAGINAS_UGC_REVIEWED_ISO}</p>
          </div>
          <HeroMedia caption="A product-in-hand presenter ad: real Studio Ads output (October 17, 2026), shown muted." title="AI UGC video example" />
        </header>
      </div>
      <section className="kug-sec" aria-labelledby="kug-kinds">
        <div className="kug-wrap">
          <h2 id="kug-kinds">{c.kindsHeading}</h2>
          <div className="kug-grid3">{c.kinds.map((k) => <div className="kug-card" key={k.name}><h3>{k.name}</h3><p>{k.what}</p><p style={{ marginTop: 10, fontWeight: 700, color: 'var(--txt)' }}>{k.kineo}</p></div>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-io">
        <div className="kug-wrap">
          <h2 id="kug-io">{c.ioHeading}</h2>
          <table className="kug-table"><tbody>{c.io.map((r) => <tr key={r.k}><th scope="row">{r.k}</th><td>{r.v}</td></tr>)}</tbody></table>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-limits">
        <div className="kug-wrap">
          <h2 id="kug-limits">{c.limitsHeading}</h2>
          <ul className="kug-rules">{c.limits.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
      <Faq heading="Questions" faqs={c.faqs} />
      <Related heading="Related pages" links={[{ href: UGC_PILLAR_PATH, label: 'AI UGC Ads: the full guide' }, { href: '/faceless-video-generator', label: 'AI Faceless Videos' }, { href: '/ads', label: 'AI Product Ads' }, { href: '/vs/arcads-alternative', label: 'Kineo vs Arcads' }]} />
    </Shell>
  )
}

// ── Kit Black Friday (EN e PT) ───────────────────────────────────────────────────────────────────────────────────
export function bfMetadata(lang: UgcLang): Metadata {
  const c = bfCopy(lang, paginasUgcFacts())
  return ugcMetadata(lang === 'pt' ? BF_PT_PATH : BF_EN_PATH, c.title, c.description, lang === 'pt' ? 'pt_BR' : 'en_US')
}

export function BlackFridayPage({ lang }: { lang: UgcLang }) {
  const f = paginasUgcFacts()
  const c = bfCopy(lang, f)
  const pt = lang === 'pt'
  const path = pt ? BF_PT_PATH : BF_EN_PATH
  const campaign = pt ? PAGINAS_UGC_CAMPAIGN.bfPt : PAGINAS_UGC_CAMPAIGN.bf
  // KINEO-KIT-BF-VENDA-2010 no ar: o botão principal compra o kit (GET; sem sessão o checkout leva ao login e retoma); o Studio Ads vira o link de quem já assina.
  const primaryHref = f.kitSale ? KIT_BF_CHECKOUT_HREF : bfCtaHref(campaign)
  const related = pt
    ? [{ href: UGC_PILLAR_PT_PATH, label: 'Anúncios UGC com IA' }, { href: BF_EN_PATH, label: 'Black Friday video ads (English)' }, { href: '/ads', label: 'Studio Ads' }, { href: '/pricing', label: 'Preços' }]
    : [{ href: UGC_PILLAR_PATH, label: 'AI UGC Ads' }, { href: '/ads', label: 'AI Product Ads (Studio Ads)' }, { href: ugcNichePath('beauty-skincare'), label: 'AI UGC ads for skincare' }, { href: ugcNichePath('electronics-gadgets'), label: 'AI UGC ads for gadgets' }, { href: BF_PT_PATH, label: 'Anúncios de Black Friday (Português)' }, { href: '/pricing', label: 'Pricing' }]
  return (
    <Shell lang={lang} mark={pt ? 'bf-pt' : 'bf'}>
      {ld(faqLd(c.faqs))}{ld(crumbsLd([{ name: 'Kineo', path: '/' }, { name: c.eyebrow, path }]))}
      <div className="kug-wrap">
        <header className="kug-hero">
          <div>
            <p className="kug-eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="kug-lead">{c.lead}</p>
            <div className="kug-actions">
              <OrganicCtaLink className="kug-cta" href={primaryHref} source={campaign} placement="hero">{c.cta} <span aria-hidden="true">→</span></OrganicCtaLink>
              {c.studioLink ? <OrganicCtaLink className="kug-link" href={bfCtaHref(campaign)} source={campaign} placement="hero_studio">{c.studioLink}</OrganicCtaLink> : null}
              {c.sampleLink ? <UgcCtaLink className="kug-link" campaign={campaign} placement="hero_sample">{c.sampleLink}</UgcCtaLink> : null}
            </div>
            <p className="kug-note">{c.ctaNote}</p>
            <p className="kug-reviewed">{c.reviewed} {PAGINAS_UGC_REVIEWED_ISO}</p>
          </div>
          <figure className="kug-media" style={{ margin: 0 }}>
            <UgcVideo src={HOME_CARD_CLIPS.product_ads[pt ? 'pt' : 'default']?.src ?? HOME_CARD_CLIPS.product_ads.default.src} poster={HOME_CARD_CLIPS.product_ads[pt ? 'pt' : 'default']?.poster ?? HOME_CARD_CLIPS.product_ads.default.poster} label={pt ? 'Anúncio de produto real do Studio Ads' : 'Real Studio Ads product ad'} />
            <span className="kug-shade" aria-hidden="true" />
            <span className="kug-badge" aria-hidden="true">{HOME_CARD_BADGE.product_ads}</span>
            <figcaption className="kug-cap">{pt ? 'Resultado real do Studio Ads no formato close do produto real (19/10/2026), sem som aqui.' : 'Real Studio Ads output in the close-up-of-your-real-product format (October 19, 2026), muted here.'}</figcaption>
          </figure>
        </header>
      </div>
      <section className="kug-sec" aria-labelledby="kug-cal">
        <div className="kug-wrap">
          <h2 id="kug-cal">{c.calendarHeading}</h2>
          <ol className="kug-cal">{c.calendar.map((d) => <li key={d.date}><b>{d.date}</b><span>{d.what}</span></li>)}</ol>
          <p className="kug-src">{c.calendarSource}</p>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-kit">
        <div className="kug-wrap">
          <h2 id="kug-kit">{c.kitHeading}</h2>
          <div className="kug-grid3">{c.kit.map((k) => <div className="kug-card" key={k.title}><h3>{k.title}</h3><p>{k.body}</p></div>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-bfprice">
        <div className="kug-wrap">
          <h2 id="kug-bfprice">{c.priceHeading}</h2>
          <div className="kug-cost">{c.price.map((p) => <p key={p}>{p}</p>)}</div>
        </div>
      </section>
      <section className="kug-sec" aria-labelledby="kug-bflimits">
        <div className="kug-wrap">
          <h2 id="kug-bflimits">{c.limitsHeading}</h2>
          <ul className="kug-rules">{c.limits.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
      <Faq heading={pt ? 'Perguntas frequentes' : 'Frequently asked questions'} faqs={c.faqs} />
      <Related heading={c.relatedHeading} links={related} />
      <div className="kug-wrap">
        <div className="kug-closing">
          <div><h2>{c.closingHeading}</h2><p>{c.closingText}</p></div>
          <OrganicCtaLink className="kug-cta" href={primaryHref} source={campaign} placement="closing">{c.cta} <span aria-hidden="true">→</span></OrganicCtaLink>
        </div>
      </div>
    </Shell>
  )
}
