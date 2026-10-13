'use client'

// KINEO-DUAS-PORTAS-2026-10-13 — as 2 portas da primeira dobra da home: FILME NARRADO (o que 11 dos 12 pagantes
// compraram) e ANÚNCIO DE PRODUTO (o plano Business). Dados, destinos e medição em lib/ui/homeTwoDoors.ts (puro);
// guardião scripts/test-duas-portas-1310.mjs. Mesma linguagem visual dos cartões da casa (PromoCards: cantos 14/16,
// mídia escura, título em caixa alta) — produto novo entra DENTRO da home antiga, nunca numa home paralela.
//
// Movimento: o vídeo só toca enquanto a porta está na tela (IntersectionObserver); prefers-reduced-motion = pôster
// parado. Sem layout shift: a mídia tem altura fixa por aspect-ratio. Os números da oferta chegam prontos por props,
// lidos das fontes de preço pela KineoLanding — este arquivo não digita preço nenhum.
import Link from 'next/link'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import {
  HOME_DOOR_ADS_CLIPS,
  HOME_DOOR_EVENTS,
  HOME_DOOR_FILM_TRIOS,
  homeDoorTrioBadge,
  homeDoorClickMetadata,
  homeDoorHref,
  type HomeDoorId,
} from '@/lib/ui/homeTwoDoors'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Uma linha de oferta: frase em inglês com {marcas} (traduzida em lib/ui/refinementCopy.json) + os números lidos das fontes. */
export type HomeDoorLine = { template: string; vars?: Record<string, string> }
/** As linhas de oferta de cada porta, já com os números lidos das fontes (ver KineoLanding). */
export type HomeDoorOffer = {
  /** 1ª linha: o grátis (filme de 15 s com marca d'água / 1º anúncio grátis). */
  free: HomeDoorLine
  /** 2ª linha: o plano que a porta vende (Creator / Business). */
  plan: HomeDoorLine
}

/** Troca {marca} pelo número. split/join (nunca replace com string: "$1" no preço viraria retrovisor). */
export function fillDoorLine(text: string, vars: Record<string, string> = {}): string {
  return Object.entries(vars).reduce((out, [key, value]) => out.split(`{${key}}`).join(value), text)
}

export const HOME_TWO_DOORS_CSS = `
.klp .k2d{padding:22px 0 6px}
.k2d-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.k2d-card{position:relative;display:flex;flex-direction:column;gap:14px;padding:12px 12px 18px;border-radius:18px;border:1px solid var(--home-line,rgba(255,255,255,.10));background:var(--card,#10141B);color:var(--txt);outline:none;transition:border-color var(--dur-base,250ms) ease,transform var(--dur-base,250ms) var(--ease-swift,ease)}
.k2d-card:hover{border-color:var(--home-action,#0A5CFF);transform:translateY(-2px)}
.k2d-card:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:4px}
.k2d-media{position:relative;direction:ltr;aspect-ratio:768/440;border-radius:14px;overflow:hidden;background:#0B0E14;isolation:isolate}
.k2d-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.k2d-phones{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:42px 12% 12px;background:radial-gradient(ellipse at 50% 120%,rgba(10,92,255,.28),transparent 70%)}
.k2d-phone{position:relative;border-radius:12px;overflow:hidden;background:#05070B;box-shadow:0 12px 30px -16px rgba(0,0,0,.8)}
.k2d-reel video{opacity:0;transition:opacity .7s ease}
.k2d-trios .k2d-phones{opacity:0;transition:opacity .7s ease}
.k2d-trios .k2d-phones[data-on]{opacity:1}
.k2d-reel video[data-on]{opacity:1}
.k2d-badge{position:absolute;left:10px;top:10px;z-index:2;font-size:11px;font-weight:800;letter-spacing:.08em;padding:5px 8px;border-radius:7px;background:rgba(7,9,13,.72);color:#fff;border:1px solid rgba(255,255,255,.18)}
.k2d-text{display:flex;flex-direction:column;gap:6px;padding:0 6px;flex:1}
.k2d-eyebrow{font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--home-action,#0A5CFF)}
.k2d-title{margin:0;font-size:clamp(1.25rem,2.1vw,1.7rem);line-height:1.12;letter-spacing:-.02em;font-weight:780;color:var(--txt)}
.k2d-sub{margin:0;font-size:15px;line-height:1.45;color:var(--muted)}
.k2d-offer{display:flex;flex-direction:column;gap:6px;margin:4px 0 0;padding:0;list-style:none;font-size:13.5px;color:var(--txt)}
.k2d-offer li::before{content:'✓ ';color:var(--home-action,#0A5CFF);font-weight:800}
.k2d-cta{align-self:flex-start;margin:6px 6px 0}
@media (max-width:760px){
.klp .k2d{padding-top:14px}
.k2d-grid{grid-template-columns:1fr;gap:14px}
.k2d-media{aspect-ratio:768/522}
.k2d-phones{padding:38px 6% 8px}
.k2d-sub{font-size:14px}
}
`

/** Toca os vídeos de uma porta só quando ela está na tela; reduced-motion = parado no pôster. */
function useDoorPlayback(ref: RefObject<HTMLElement>, selector: string) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    const set = (visible: boolean) => {
      root.dataset.visible = visible ? '1' : '0'
      root.querySelectorAll<HTMLVideoElement>(selector).forEach((video) => {
        if (visible && !reduce) {
          video.muted = true
          video.play().catch(() => { /* autoplay recusado: fica o pôster */ })
        } else {
          video.pause()
        }
      })
    }
    if (typeof IntersectionObserver === 'undefined') { set(true); return }
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => set(entry.isIntersecting)), { threshold: 0.3 })
    io.observe(root)
    return () => io.disconnect()
  }, [ref, selector])
}

/** Porta do filme: 2 trios de filmes verticais reais (lib: HOME_DOOR_FILM_TRIOS) que se alternam quando o vídeo da 1ª tela
 *  TERMINA (onEnded, nunca timer); só o trio visível toca. O selo é calculado dos motores do trio na tela. KINEO-PORTA-FILME-TRIOS-2026-10-13 */
function FilmMedia() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = HOME_DOOR_FILM_TRIOS.length
  useDoorPlayback(ref, '.k2d-phones[data-on] video')
  useEffect(() => {
    const box = ref.current
    if (!box) return
    const trios = Array.from(box.querySelectorAll<HTMLElement>('.k2d-phones'))
    trios[(active + 1) % trios.length]?.querySelectorAll('video').forEach((v) => { v.preload = 'auto' })
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    trios.forEach((trio, i) => trio.querySelectorAll('video').forEach((video) => {
      if (i === active && box.dataset.visible === '1' && !reduce) {
        video.currentTime = 0
        video.play().catch(() => { /* autoplay recusado: fica o pôster */ })
      } else if (i !== active) {
        video.pause()
      }
    }))
  }, [active])
  return (
    <div className="k2d-media k2d-trios" ref={ref}>
      {HOME_DOOR_FILM_TRIOS.map((trio, t) => (
        <span key={trio[0].id} className="k2d-phones" data-on={t === active ? '' : undefined}>
          {trio.map((clip, i) => (
            <span key={clip.src} className="k2d-phone">
              <video
                src={clip.src}
                poster={clip.poster}
                onEnded={i === 0 ? () => setActive((t + 1) % count) : undefined}
                muted
                playsInline
                preload="none"
                disablePictureInPicture
                aria-hidden="true"
                tabIndex={-1}
              />
            </span>
          ))}
        </span>
      ))}
      <span className="k2d-badge" aria-hidden="true">{homeDoorTrioBadge(HOME_DOOR_FILM_TRIOS[active])}</span>
    </div>
  )
}

/** Porta do anúncio: carrossel que troca quando o vídeo TERMINA (onEnded), igual ao card de Ads da casa. */
function AdsMedia() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const count = HOME_DOOR_ADS_CLIPS.length
  useDoorPlayback(ref, 'video[data-on]')
  useEffect(() => {
    const box = ref.current
    if (!box) return
    const videos = Array.from(box.querySelectorAll('video'))
    const next = videos[(active + 1) % videos.length]
    if (next) next.preload = 'auto'
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    const video = videos[active]
    if (video && box.dataset.visible === '1' && !reduce) {
      video.currentTime = 0
      video.play().catch(() => { /* autoplay recusado: fica o pôster */ })
    }
  }, [active])
  return (
    <div className="k2d-media k2d-reel" ref={ref}>
      {HOME_DOOR_ADS_CLIPS.map((clip, i) => (
        <video
          key={clip.src}
          src={clip.src}
          poster={clip.poster}
          data-on={i === active ? '' : undefined}
          onEnded={() => setActive((i + 1) % count)}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
      ))}
    </div>
  )
}

export default function HomeTwoDoors({
  signedIn,
  filmOffer,
  adsOffer,
}: {
  signedIn: boolean
  filmOffer: HomeDoorOffer
  adsOffer: HomeDoorOffer
}) {
  const copy = useUiCopy()
  // keepalive do trackEvent entrega o POST mesmo com a página saindo pelo link (mesmo padrão do PromoCards).
  const line = (l: HomeDoorLine) => fillDoorLine(copy(l.template), l.vars)
  const track = (door: HomeDoorId) => { void trackEvent(HOME_DOOR_EVENTS[door], homeDoorClickMetadata(door, signedIn)) }
  return (
    <section className="k2d" aria-label={copy('Choose what to make')}>
      <style dangerouslySetInnerHTML={{ __html: HOME_TWO_DOORS_CSS }} />
      <div className="wrap">
        <div className="k2d-grid">
          <Link href={homeDoorHref('film', signedIn)} className="k2d-card" data-home-door="film" onClick={() => track('film')}>
            <FilmMedia />
            <span className="k2d-text">
              <span className="k2d-eyebrow"><UiLabel>Narrated film</UiLabel></span>
              <h2 className="k2d-title"><UiLabel>Make a narrated film from one idea</UiLabel></h2>
              <p className="k2d-sub"><UiLabel>Type one idea. Kineo writes the script, narrates, adds music and edits a vertical film.</UiLabel></p>
              <ul className="k2d-offer">
                <li>{line(filmOffer.free)}</li>
                <li>{line(filmOffer.plan)}</li>
              </ul>
            </span>
            <span className="btn btn-blue k2d-cta"><UiLabel>Make my film</UiLabel> →</span>
          </Link>
          <Link href={homeDoorHref('ads', signedIn)} className="k2d-card" data-home-door="ads" onClick={() => track('ads')}>
            <AdsMedia />
            <span className="k2d-text">
              <span className="k2d-eyebrow"><UiLabel>Product ad</UiLabel></span>
              <h2 className="k2d-title"><UiLabel>Make a 15-second product ad from one photo</UiLabel></h2>
              <p className="k2d-sub"><UiLabel>Upload a product photo. Kineo turns it into an ad with voice, music and on-screen text.</UiLabel></p>
              <ul className="k2d-offer">
                <li>{line(adsOffer.free)}</li>
                <li>{line(adsOffer.plan)}</li>
              </ul>
            </span>
            <span className="btn btn-blue k2d-cta"><UiLabel>Make my ad</UiLabel> →</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
