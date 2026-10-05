// KINEO-HOME-CLIPS-FIRST-2026-10-05 — variante "clips-first" da home (A/B em lib/growth/homeClipsFirst.ts).
//
// Sessão CEO em nome do fundador (04/10): a Kineo passa a ter 2 produtos. PRODUTO 1 = CLIPES, a porta de entrada no estilo
// dos concorrentes de clipe (foto → efeito de 1 clique → clipe em ~1 min). PRODUTO 2 = FILME NARRADO, o premium.
// Esta página põe o produto 1 no PRIMEIRO QUADRO (galeria de efeitos + "Upload a photo" grande) e o produto 2 logo abaixo,
// na MESMA página, com filmes da casa e o botão do Studio.
//
// A home atual (app/KineoLanding.tsx + lib/engineWall.ts, curadoria do fundador) NÃO é tocada: esta é uma página nova,
// escolhida num único ponto do servidor (app/page.tsx). Com HOME_CLIPS_FIRST='off' ninguém a vê.
//
// REGRAS DA CASA AQUI DENTRO:
// · Preço de cada efeito = clipCreditCost(effect.engine, effect.seconds) — a mesma função que o /clips cobra. Nenhum número
//   digitado à mão (lição KINEO-CREDITO-VITRINE-2026-08-27).
// · Selo honesto: prévia só quando o catálogo aponta um clipe da casa; senão placeholder MARCADO ("Preview coming soon").
//   O motor do selo é o motor real do efeito; a nota da prévia diz o que a prévia é de verdade.
// · Mesmos rastreadores da home atual (homepage_view com variant própria, conversão de cadastro do Ads em ?signup=1,
//   convite welcome20, faixa "continue de onde parou") — o A/B compara a PRIMEIRA TELA, não a oferta.
// · Mobile-first: 2 colunas de efeito no celular, botão de foto em largura cheia, nenhuma rolagem lateral.
import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { InterfaceLanguageSelect, UiLabel } from '@/components/InterfaceLanguage'
import NavCreditsBadge from '@/components/NavCreditsBadge'
import Footer from '@/components/Footer'
import WallMedia from '@/components/WallMedia'
import ResumeStrip from '@/components/ResumeStrip'
import LandingViewTracker from '@/components/LandingViewTracker'
import SignupConversionTracker from '@/components/SignupConversionTracker'
import WelcomeOfferModal from '@/components/WelcomeOfferModal'
import { CLIP_EFFECTS, type ClipEffect } from '@/lib/clips/clipEffects'
import { clipCreditCost } from '@/lib/clips/clipPricing'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { ENGINE_PAGE_LEAD, FOUNDER_SHOWCASE, type FounderShowcaseExample } from '@/lib/publicExamples'
import { engineLabelFor } from '@/lib/engineLabel'
import { creditCostFor } from '@/lib/credits/engineCost'
import {
  clipEffectEntryHref,
  clipUploadEntryHref,
  clipsFirstFilmHref,
} from '@/lib/growth/homeClipsFirst'

/** homepage_view.metadata.variant desta página (a atual grava 'kineo_landing_v3'). */
export const CLIPS_FIRST_LANDING_VARIANT = 'clips_first_v1'

/** Filmes da casa do cartão do produto 2: o "100%" do fundador + os 2 primeiros da vitrine dele (ordem dele). */
export const CLIPS_FIRST_FILMS: readonly FounderShowcaseExample[] = [
  ...ENGINE_PAGE_LEAD.slice(0, 1),
  ...FOUNDER_SHOWCASE.slice(0, 2),
]

export interface ClipsFirstEffectCard {
  effect: ClipEffect
  credits: number
  engineLabel: string
  href: string
}

/** A galeria inteira, derivada do catálogo (ordem do catálogo, preço da função de cobrança). */
export function clipsFirstEffectCards(signedIn: boolean): ClipsFirstEffectCard[] {
  return CLIP_EFFECTS.map((effect) => ({
    effect,
    credits: clipCreditCost(effect.engine, effect.seconds),
    engineLabel: CLIP_ENGINES[effect.engine].label,
    href: clipEffectEntryHref(effect.key, signedIn),
  }))
}

const KCF_CSS = `
.kcf{--bg:#F7F7F5;--card:#FFFFFF;--card2:#F1F1EE;--line:#E4E4E0;--line2:#D2D2CD;--txt:#0E1116;--txt2:#2A2F37;--muted:#5A5F67;--action:#0A5CFF;--on-action:#fff;--action-soft:#E8EFFF;--wash:#EEF3FF;--nav:rgba(255,255,255,.86);--sh:0 1px 2px #0E111608,0 8px 24px -12px #0E111614;--sh-h:0 14px 34px -12px #0E111624;--warn:#8A5A00;--warn-bg:#FFF4D6;color-scheme:light;background:radial-gradient(ellipse 1100px 650px at 0 0,var(--wash),transparent 72%),var(--bg);color:var(--txt);font-family:var(--font-inter),'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5;min-height:100vh;overflow-x:clip}
html[data-theme=dark] .kcf{--bg:#07090D;--card:#10141B;--card2:#161B24;--line:#1F2530;--line2:#2A3240;--txt:#F2F4F7;--txt2:#C9CFD8;--muted:#9AA3B2;--action:#4D8DFF;--on-action:#04122E;--action-soft:#12203A;--wash:#0E1A30;--nav:rgba(7,9,13,.86);--sh:inset 0 1px 0 #ffffff08,0 8px 30px #00000033;--sh-h:inset 0 1px 0 #ffffff0d,0 12px 36px #0000004d;--warn:#FFD27A;--warn-bg:#2B2210;color-scheme:dark}
.kcf *{box-sizing:border-box;margin:0;padding:0}
.kcf a{color:inherit;text-decoration:none}
.kcf .w{width:100%;max-width:1240px;margin:0 auto;padding:0 16px}
.kcf nav{position:sticky;top:0;z-index:40;background:var(--nav);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);border-bottom:1px solid var(--line)}
.kcf .nv{display:flex;align-items:center;gap:12px;min-height:60px}
.kcf .lg{display:inline-flex;align-items:center;gap:7px;font-weight:800;font-size:21px;letter-spacing:-.8px}
.kcf .lg .mk{width:23px;height:27px;color:var(--action)}
.kcf .nl{display:none;gap:22px;margin-left:18px;font-size:14px;font-weight:600;color:var(--txt2)}
.kcf .nl a:hover{color:var(--txt)}
.kcf .nr{margin-left:auto;display:flex;align-items:center;gap:10px}
.kcf .lgn{display:none;font-size:14px;font-weight:600;color:var(--txt2)}
.kcf .bt{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;font-weight:700;font-size:14px;padding:10px 16px;background:var(--action);color:var(--on-action);border:1px solid transparent;transition:transform 150ms cubic-bezier(.2,0,0,1),box-shadow 150ms ease;white-space:nowrap}
.kcf .bt:hover{transform:translateY(-1px);box-shadow:0 8px 20px -10px var(--action)}
.kcf .bt:focus-visible,.kcf .ef:focus-visible,.kcf .up:focus-visible,.kcf .fl:focus-visible{outline:2px solid var(--action);outline-offset:3px}
.kcf .bt.gh{background:transparent;color:var(--txt);border-color:var(--line2)}
.kcf .hero{padding:22px 0 8px}
.kcf .eb{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--action);background:var(--action-soft);border-radius:999px;padding:6px 10px}
.kcf h1{margin-top:10px;font-size:clamp(1.7rem,6.4vw,3rem);line-height:1.06;letter-spacing:-.03em;font-weight:800;max-width:820px}
.kcf .sb{margin-top:8px;color:var(--muted);font-size:15px;max-width:640px}
.kcf .up{margin-top:16px;display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;border-radius:20px;border:1.5px dashed var(--action);background:var(--action-soft);box-shadow:var(--sh);transition:transform 150ms cubic-bezier(.2,0,0,1),box-shadow 150ms ease}
.kcf .up:hover{transform:translateY(-1px);box-shadow:var(--sh-h)}
.kcf .up-ic{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:var(--action);color:var(--on-action)}
.kcf .up b{display:block;font-size:19px;letter-spacing:-.01em}
.kcf .up i{display:block;font-style:normal;color:var(--muted);font-size:13px}
.kcf .gh2{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:22px 0 10px}
.kcf h2{font-size:clamp(1.2rem,4.4vw,1.75rem);letter-spacing:-.02em;line-height:1.15;font-weight:800}
.kcf .gh2 span{font-size:12px;color:var(--muted)}
.kcf .gr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.kcf .ef{position:relative;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--card);border:1px solid var(--line);box-shadow:var(--sh);transition:transform 150ms cubic-bezier(.2,0,0,1),box-shadow 150ms ease}
.kcf .ef:hover{transform:translateY(-2px);box-shadow:var(--sh-h)}
.kcf .md{position:relative;aspect-ratio:3/4;background:#0b0e13 center/cover no-repeat}
.kcf .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;color:#C9CFD8;background:radial-gradient(circle at 30% 20%,#1d3a7a 0,transparent 55%),radial-gradient(circle at 80% 90%,#4a1d6b 0,transparent 50%),#0b0e13}
.kcf .ph-ic{font-size:30px;line-height:1}
.kcf .tag{position:absolute;left:8px;top:8px;z-index:2;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:4px 8px;background:rgba(0,0,0,.62);color:#fff;backdrop-filter:blur(6px)}
.kcf .tag.soon{background:var(--warn-bg);color:var(--warn)}
.kcf .pr{position:absolute;right:8px;top:8px;z-index:2;font-size:11px;font-weight:800;border-radius:999px;padding:4px 8px;background:#fff;color:#0E1116}
.kcf .tx{padding:10px 11px 12px;display:flex;flex-direction:column;gap:3px}
.kcf .tx b{font-size:14px;line-height:1.25;letter-spacing:-.01em}
.kcf .tx i{font-style:normal;font-size:12px;color:var(--muted);line-height:1.35}
.kcf .tx em{font-style:normal;font-size:11px;color:var(--muted);opacity:.9}
.kcf .p2{margin:34px 0 8px;border-radius:24px;background:var(--card);border:1px solid var(--line);box-shadow:var(--sh);padding:18px 16px;display:grid;gap:16px}
.kcf .p2 p{color:var(--muted);font-size:14px;max-width:560px}
.kcf .fls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.kcf .fl{position:relative;display:block;aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#0b0e13 center/cover no-repeat}
.kcf .fl span{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:22px 8px 8px;font-size:11px;font-weight:700;line-height:1.25;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.78))}
.kcf .fl small{display:block;font-weight:600;opacity:.8}
.kcf .p2a{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.kcf .p2a .bt{padding:13px 20px;font-size:15px}
.kcf .p2a small{color:var(--muted);font-size:12px}
.kcf .pv{margin-top:10px;display:inline-block;font-size:11px;font-weight:800;color:var(--warn);background:var(--warn-bg);border-radius:8px;padding:4px 8px}
@media(min-width:720px){
.kcf .w{padding:0 28px}
.kcf .nl,.kcf .lgn{display:inline-flex}
.kcf .hero{padding:40px 0 10px}
.kcf .up{max-width:620px;padding:20px 22px}
.kcf .gr{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kcf .p2{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);align-items:center;padding:28px}
}
@media(prefers-reduced-motion:reduce){.kcf .ef,.kcf .up,.kcf .bt{transition:none}}
`

function EffectMedia({ effect }: { effect: ClipEffect }) {
  if (!effect.preview) {
    return (
      <div className="md">
        <div className="ph" aria-hidden="true">
          <span className="ph-ic">✦</span>
        </div>
        <span className="tag soon"><UiLabel>Preview coming soon</UiLabel></span>
      </div>
    )
  }
  return (
    <div
      className="md"
      style={effect.preview.poster ? { backgroundImage: `url(${effect.preview.poster})` } : undefined}
    >
      <WallMedia src={effect.preview.video} />
      <span className="tag" title={effect.preview.note}><UiLabel>House sample</UiLabel></span>
    </div>
  )
}

export default function ClipsFirstHome({
  signedIn,
  resume = null,
  preview = false,
}: {
  signedIn: boolean
  resume?: { title: string; episode: number; videoId: string } | null
  /** Prévia da casa (?home_variant=clips_first): mostra um selo, não grava exposição. */
  preview?: boolean
}) {
  const cards = clipsFirstEffectCards(signedIn)
  const minCredits = Math.min(...cards.map((c) => c.credits))
  const filmCredits = creditCostFor('cinematic_ai', true)
  const signupHref = '/signup?utm_source=home_clips_first_nav'

  return (
    <>
      <main className="kcf" data-home-variant="clips_first">
        <style dangerouslySetInnerHTML={{ __html: KCF_CSS }} />
        <LandingViewTracker signedIn={signedIn} variant={CLIPS_FIRST_LANDING_VARIANT} />
        <WelcomeOfferModal surface="home" />
        {/* KINEO-POUSO-VITRINE-2026-08-25 — o pouso pós-cadastro pode ser esta página: a conversão do Ads (?signup=1) fica. */}
        <SignupConversionTracker />
        {resume ? <ResumeStrip title={resume.title} episode={resume.episode} videoId={resume.videoId} /> : null}

        <nav aria-label="Main">
          <div className="w nv">
            <Link href="/" className="lg">
              <KineoBrandIcon className="mk" size={26} />
              Kineo
            </Link>
            <div className="nl" data-nav-surface="top" data-nav-area="public">
              <Link href={signedIn ? '/clips' : clipUploadEntryHref(false)} data-nav-item="more:clips"><UiLabel>Clips</UiLabel></Link>
              <Link href={clipsFirstFilmHref(signedIn)} data-nav-item="video"><UiLabel>Narrated films</UiLabel></Link>
              <Link href="/examples" data-nav-item="examples"><UiLabel>Examples</UiLabel></Link>
              <Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>
            </div>
            <div className="nr">
              <InterfaceLanguageSelect />
              {signedIn ? (
                <>
                  <NavCreditsBadge />
                  <Link className="bt" href="/studio"><UiLabel>Dashboard</UiLabel></Link>
                </>
              ) : (
                <>
                  <Link className="lgn" href="/login" data-nav-item="login"><UiLabel>Log in</UiLabel></Link>
                  <Link className="bt" href={signupHref}><UiLabel>Sign up</UiLabel></Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <header className="hero">
          <div className="w">
            <span className="eb"><UiLabel>One-click video effects</UiLabel></span>
            <h1><UiLabel>Turn any photo into a video in one click</UiLabel></h1>
            <p className="sb">
              <UiLabel>Pick an effect, upload a photo and get a short clip in about a minute. No prompt to write.</UiLabel>
            </p>
            {preview ? <span className="pv"><UiLabel>House preview — visitors do not see this page yet</UiLabel></span> : null}
            <Link className="up" href={clipUploadEntryHref(signedIn)} data-home-cta="upload_photo">
              <span className="up-ic" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              </span>
              <span>
                <b><UiLabel>Upload a photo</UiLabel></b>
                <i>{`From ${minCredits} credits per clip`}</i>
              </span>
            </Link>
          </div>
        </header>

        <section aria-labelledby="kcf-effects" className="w">
          <div className="gh2">
            <h2 id="kcf-effects"><UiLabel>Choose an effect</UiLabel></h2>
            <span>{`${cards.length} effects`}</span>
          </div>
          <div className="gr">
            {cards.map(({ effect, credits, engineLabel, href }) => (
              <Link key={effect.key} className="ef" href={href} data-effect={effect.key} aria-label={`${effect.title} — ${credits} credits`}>
                <EffectMedia effect={effect} />
                <span className="pr">{`${credits} cr`}</span>
                <span className="tx">
                  <b>{effect.title}</b>
                  <i>{effect.sub}</i>
                  <em>{`${engineLabel} · ${effect.seconds} s`}</em>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="kcf-films" className="w">
          <div className="p2" data-home-product="narrated_film">
            <div>
              <span className="eb"><UiLabel>Want the whole story?</UiLabel></span>
              <h2 id="kcf-films" style={{ marginTop: 10 }}><UiLabel>Narrated films: an idea becomes a 60-second film</UiLabel></h2>
              <p style={{ marginTop: 8 }}>
                <UiLabel>Script, voice, captions and cinematic scenes, made in the Studio. These are real films from our own channel.</UiLabel>
              </p>
              <div className="p2a" style={{ marginTop: 14 }}>
                <Link className="bt" href={clipsFirstFilmHref(signedIn)} data-home-cta="open_studio"><UiLabel>Open the Studio</UiLabel></Link>
                <small>{`Seedance 1.5 film: ${filmCredits} credits`}</small>
              </div>
            </div>
            <div className="fls">
              {CLIPS_FIRST_FILMS.map((film) => (
                <Link
                  key={film.id}
                  className="fl"
                  href={clipsFirstFilmHref(signedIn)}
                  style={{ backgroundImage: `url(${film.posterPath})` }}
                  aria-label={film.title}
                >
                  <WallMedia src={film.previewPath} />
                  <span>
                    {film.title}
                    <small>{engineLabelFor(film.engine) ?? ''}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer showStats={false} />
    </>
  )
}
