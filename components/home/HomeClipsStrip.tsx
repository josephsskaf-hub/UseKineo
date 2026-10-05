// KINEO-HOME-CLIPES-EM-CIMA-2026-10-05 — fundador (05/10): "quero a home do jeito que estava, com os clipes na parte de
// cima e os filmes narrados logo embaixo", oito cartões ("nem que a gente repita um") e SEM o bloco "Turn any photo into
// a video in one click" + caixa de upload ("muito feia"). Esta faixa entra DENTRO da home antiga (KineoLanding), só na
// variante clips_first do A/B, e fala a MESMA língua visual dos cartões antigos do topo (components/PromoCards: mídia
// 512/348 com canto 14px e sombra, título em caixa alta, linha apagada embaixo) — 4 por fileira, 2 fileiras, para os
// filmes narrados aparecerem logo abaixo e não uma tela inteira depois. Os 7 efeitos vêm do catálogo
// (lib/clips/clipEffects, preço da função de cobrança); o 8º cartão é o clipe a partir de texto (o /clips também aceita
// só uma ideia escrita), com um clipe REAL do Kling 2.5 da casa.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { UiLabel } from '@/components/InterfaceLanguage'
import { clipsFirstEffectCards } from '@/components/home/ClipsFirstHome'
import { clipCreditCost } from '@/lib/clips/clipPricing'

const TEXT_CLIP = {
  video: '/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4',
  poster: '/posters/c4e4fbab-0978-4daa-9fcf-119096370210.jpg',
}

// As prévias VERTICAIS (720×1280, feitas com o efeito) num cartão horizontal: que faixa da altura aparece. Conta do
// object-position: a faixa visível começa em p×0,618 da altura e cobre 38% dela — o número põe o assunto no meio.
// As horizontais (casa, 1400×782) ficam no centro.
const FOCUS: Record<string, string> = {
  product_360: '50% 55%',
  zoom_out_earth: '50% 42%',
  restore_old_photo: '50% 14%',
  color_burst: '50% 26%',
}

const CSS = `
.klp .kcs{padding:24px 0 6px}
.klp .kcs .home-business-heading{margin-bottom:6px}
.klp .kcs-sub{margin:0 0 18px;color:var(--muted);font-size:15px;line-height:1.45;max-width:680px}
.klp .kcs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 16px}
.klp .kcs-card{display:flex;flex-direction:column;gap:11px;color:var(--txt);text-decoration:none;border-radius:16px;outline:none}
.klp .kcs-card:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:4px}
.klp .kcs-md{position:relative;aspect-ratio:512/348;border-radius:14px;overflow:hidden;background-color:#10141B;background-repeat:no-repeat;background-size:cover;background-position:var(--kcs-focus,50% 50%);isolation:isolate;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 14px 34px -22px rgba(7,9,13,.55);transition:transform 250ms cubic-bezier(.2,0,0,1),box-shadow 250ms ease}
.klp .kcs-card:hover .kcs-md{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.07) inset,0 22px 44px -24px rgba(7,9,13,.7)}
.klp .kcs-md video{object-position:var(--kcs-focus,50% 50%)}
.klp .kcs-cr{position:absolute;right:10px;top:10px;z-index:2;font-size:11.5px;font-weight:750;letter-spacing:.02em;line-height:1;border-radius:999px;padding:6px 10px;background:rgba(7,9,13,.58);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.klp .kcs-tx{display:flex;flex-direction:column;gap:3px;padding:0 2px}
.klp .kcs-tx b{font-size:15px;line-height:1.25;font-weight:750;letter-spacing:.04em;text-transform:uppercase}
.klp .kcs-tx i{font-style:normal;font-size:14px;line-height:1.4;color:var(--muted)}
@media(max-width:899px){.klp .kcs-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 12px}}
@media(max-width:560px){.klp .kcs{padding-top:16px}.klp .kcs-sub{font-size:14px;margin-bottom:14px}.klp .kcs-card{gap:8px}.klp .kcs-tx b{font-size:12.5px;letter-spacing:.03em}.klp .kcs-tx i{display:none}.klp .kcs-cr{font-size:10.5px;padding:5px 8px;right:7px;top:7px}}
@media(prefers-reduced-motion:reduce){.klp .kcs-md{transition:none}}
`

function mediaStyle(poster: string | undefined, focus: string | undefined): CSSProperties | undefined {
  if (!poster && !focus) return undefined
  const style: Record<string, string> = {}
  if (poster) style.backgroundImage = `url(${poster})`
  if (focus) style['--kcs-focus'] = focus
  return style as CSSProperties
}

export default function HomeClipsStrip({ signedIn }: { signedIn: boolean }) {
  const cards = clipsFirstEffectCards(signedIn).filter((c) => c.effect.preview)
  const clipsHref = signedIn ? '/clips' : `/signup?redirect=${encodeURIComponent('/clips')}`
  const textClipCredits = clipCreditCost('kling', 5)
  return (
    <section className="kcs" aria-labelledby="home-clips-heading" data-home-section="clips">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="home-business-heading">
          <h2 id="home-clips-heading"><UiLabel>Clips</UiLabel></h2>
          <Link href={clipsHref} className="btn btn-ghost" data-home-cta="open_clips"><UiLabel>Open Clips</UiLabel> ↗</Link>
        </div>
        <p className="kcs-sub"><UiLabel>Short clips from a photo or one line — ready in about a minute.</UiLabel></p>
        <div className="kcs-grid">
          {cards.map((c) => (
            <Link
              key={c.effect.key}
              href={c.href}
              className="kcs-card"
              data-clip-effect={c.effect.key}
              data-home-cta="clip_effect"
              aria-label={`${c.effect.title} — ${c.credits} credits`}
            >
              <div className="kcs-md" style={mediaStyle(c.effect.preview?.poster, FOCUS[c.effect.key])}>
                {c.effect.preview ? <WallMedia src={c.effect.preview.video} /> : null}
                <span className="kcs-cr" aria-hidden="true">{c.credits} cr</span>
              </div>
              <div className="kcs-tx">
                <b><UiLabel>{c.effect.title}</UiLabel></b>
                <i><UiLabel>{c.effect.sub}</UiLabel></i>
              </div>
            </Link>
          ))}
          <Link
            href={clipsHref}
            className="kcs-card"
            data-clip-effect="text"
            data-home-cta="clip_text"
            aria-label={`Any idea, as a clip — ${textClipCredits} credits`}
          >
            <div className="kcs-md" style={mediaStyle(TEXT_CLIP.poster, undefined)}>
              <WallMedia src={TEXT_CLIP.video} />
              <span className="kcs-cr" aria-hidden="true">{textClipCredits} cr</span>
            </div>
            <div className="kcs-tx">
              <b><UiLabel>Any idea, as a clip</UiLabel></b>
              <i><UiLabel>No photo? Write one line and get a cinematic scene.</UiLabel></i>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
