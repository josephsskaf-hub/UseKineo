'use client'

// KINEO-PROMO-CARDS-2026-09-30 — fileira de cards grandes logo abaixo do menu da home. Dados e selo honesto em
// lib/ui/promoCards.ts; guardião scripts/test-promo-cards-2026-09-30.mjs.
//
// Movimento: tudo entra quando o card APARECE na tela (IntersectionObserver marca data-play) e o vídeo só toca
// enquanto o card está visível. prefers-reduced-motion: nenhuma animação e o vídeo fica parado no pôster.
// Sem layout shift: a mídia tem altura fixa por aspect-ratio.
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { PROMO_CLICK_EVENT, promoClickMetadata, type PromoCard } from '@/lib/ui/promoCards'
import { trackEvent } from '@/lib/analytics'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export const PROMO_CARDS_CSS = `
.klp .kpc{padding:22px 0 4px}
.kpc-track{display:flex;gap:16px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain;padding:4px 2px 8px}
.kpc-track::-webkit-scrollbar{display:none}
.kpc-card{flex:0 0 clamp(200px,calc((100% - 32px) / 3),512px);scroll-snap-align:start;display:flex;flex-direction:column;gap:12px;color:var(--txt);outline:none;border-radius:16px}
.kpc-card:focus-visible{outline:2px solid var(--home-action,#2997ff);outline-offset:4px}
.kpc-media{position:relative;direction:ltr;aspect-ratio:512/348;border-radius:14px;overflow:hidden;background:#0c1521;isolation:isolate;container-type:inline-size;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 14px 34px -22px rgba(2,8,18,.55);transition:transform var(--dur-base,250ms) var(--ease-swift,ease),box-shadow var(--dur-base,250ms) ease}
.kpc-card:hover .kpc-media{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.07) inset,0 22px 44px -24px rgba(2,8,18,.7)}
.kpc-text{display:flex;flex-direction:column;gap:3px;padding:0 2px}
.kpc-title{font-size:15px;line-height:1.25;font-weight:750;letter-spacing:.04em;text-transform:uppercase;color:var(--txt)}
.kpc-sub{font-size:14px;line-height:1.4;color:var(--muted)}
.kpc-poster{background:radial-gradient(120% 90% at 85% 10%,#17324f 0%,transparent 60%),radial-gradient(90% 80% at 0% 100%,#10263d 0%,transparent 70%),#0a1420}
.kpc-bands{position:absolute;inset:-18% -12%;display:flex;flex-direction:column;justify-content:center;gap:2.2cqw;transform:rotate(-9deg)}
.kpc-float{display:flex;flex-direction:column;gap:2.2cqw}
.kpc-band{display:block;white-space:nowrap;font-weight:820;letter-spacing:-.045em;line-height:.86;padding:1.6cqw 14cqw 1.2cqw}
.kpc-band--1{background:#2997ff;color:#071a2c;font-size:18cqw;padding-left:18cqw}
.kpc-band--2{background:#eef5fe;color:#0a1420;font-size:22cqw;padding-left:26cqw}
.kpc-band--3{background:transparent;color:transparent;-webkit-text-stroke:1.5px #91c9ff;font-size:7.1cqw;letter-spacing:.02em;padding-left:17cqw}
.kpc-sheen{position:absolute;top:-20%;bottom:-20%;left:-60%;width:38%;background:linear-gradient(100deg,transparent,rgba(145,201,255,.34),rgba(255,255,255,.18),transparent);transform:skewX(-16deg);pointer-events:none;opacity:0}
.kpc-tag{position:absolute;right:3.4cqw;bottom:3.2cqw;font-size:max(10px,2.1cqw);font-weight:700;letter-spacing:.14em;color:#c4d4e7;text-transform:uppercase}
.kpc-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.kpc-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,16,28,.34) 0%,transparent 30%,transparent 55%,rgba(7,16,28,.72) 100%);pointer-events:none}
.kpc-new{position:absolute;left:3.6cqw;top:3.6cqw;padding:5px 10px;border-radius:999px;background:#2997ff;color:#fff;font-size:11px;font-weight:800;letter-spacing:.12em;box-shadow:0 6px 18px -6px rgba(41,151,255,.8)}
.kpc-durs{position:absolute;left:3.6cqw;bottom:3.6cqw;display:flex;align-items:center;gap:6px}
.kpc-dur{display:inline-flex;align-items:baseline;gap:1px;padding:6px 11px;border-radius:999px;background:rgba(7,16,28,.52);border:1px solid rgba(238,245,254,.28);color:#eef5fe;font-size:max(13px,3.2cqw);font-weight:780;letter-spacing:-.01em;line-height:1;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.kpc-dur small{font-size:.72em;font-weight:650;opacity:.85}
@media (prefers-reduced-motion: no-preference){
.kpc-card:not([data-play]) .kpc-band--1{transform:translateX(-115%)}
.kpc-card:not([data-play]) .kpc-band--2{transform:translateX(115%)}
.kpc-card:not([data-play]) .kpc-band--3,.kpc-card:not([data-play]) .kpc-tag{opacity:0}
.kpc-card:not([data-play]) .kpc-new{opacity:0;transform:scale(.6)}
.kpc-card:not([data-play]) .kpc-dur{opacity:0;transform:translateY(10px)}
.kpc-card[data-play] .kpc-band--1{animation:kpcInL .95s cubic-bezier(.16,1,.3,1) .1s both}
.kpc-card[data-play] .kpc-band--2{animation:kpcInR .95s cubic-bezier(.16,1,.3,1) .3s both}
.kpc-card[data-play] .kpc-band--3{animation:kpcUp .8s cubic-bezier(.16,1,.3,1) .6s both}
.kpc-card[data-play] .kpc-tag{animation:kpcUp .7s ease .9s both}
.kpc-card[data-play] .kpc-sheen{animation:kpcSheen 6s cubic-bezier(.2,0,0,1) 1.1s infinite}
.kpc-card[data-play] .kpc-float{animation:kpcFloat 7s ease-in-out 1.4s infinite alternate}
.kpc-card[data-play] .kpc-new{animation:kpcPop .55s cubic-bezier(.34,1.56,.64,1) .2s both}
.kpc-card[data-play] .kpc-dur{animation:kpcUp .6s cubic-bezier(.16,1,.3,1) both,kpcPick 4.8s ease-in-out infinite}
.kpc-card[data-play] .kpc-dur:nth-child(1){animation-delay:.45s,1.6s}
.kpc-card[data-play] .kpc-dur:nth-child(2){animation-delay:.57s,2.8s}
.kpc-card[data-play] .kpc-dur:nth-child(3){animation-delay:.69s,4s}
.kpc-card[data-play] .kpc-dur:nth-child(4){animation-delay:.81s,5.2s}
.kpc-card:hover .kpc-video video{transform:scale(1.03)}
.kpc-video video{transition:transform .6s cubic-bezier(.16,1,.3,1)}
}
@keyframes kpcInL{from{transform:translateX(-115%)}to{transform:none}}
@keyframes kpcInR{from{transform:translateX(115%)}to{transform:none}}
@keyframes kpcUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes kpcPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes kpcSheen{0%{left:-60%;opacity:1}24%{left:130%;opacity:1}25%,100%{left:130%;opacity:0}}
@keyframes kpcFloat{from{transform:translateY(1.2cqw)}to{transform:translateY(-1.2cqw)}}
@keyframes kpcPick{0%,18%,100%{background:rgba(7,16,28,.52);border-color:rgba(238,245,254,.28)}6%,12%{background:#2997ff;border-color:#2997ff}}
@media (max-width:760px){
.klp .kpc{padding-top:16px}
.kpc-track{margin-inline:calc(-1 * clamp(24px,4vw,76px));padding-inline:clamp(24px,4vw,76px);scroll-padding-inline:clamp(24px,4vw,76px);gap:12px}
.kpc-card{flex-basis:82vw;max-width:420px}
.kpc-title{font-size:14px}
.kpc-sub{font-size:13px}
}
`

function PromoArt({ card }: { card: PromoCard }) {
  const art = card.art
  if (art.kind === 'poster') {
    return (
      <div className="kpc-media kpc-poster" aria-hidden="true">
        <div className="kpc-bands">
          <div className="kpc-float">
            {art.bands.map((band, i) => (
              <span key={band} className={`kpc-band kpc-band--${Math.min(i + 1, 3)}`}>{band}</span>
            ))}
          </div>
        </div>
        <span className="kpc-sheen" />
        <span className="kpc-tag">Connector · MCP</span>
      </div>
    )
  }
  return (
    <div className="kpc-media kpc-video">
      <video
        src={art.src}
        poster={art.poster}
        muted
        playsInline
        loop
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      />
      <span className="kpc-scrim" aria-hidden="true" />
      {art.badge ? <span className="kpc-new"><UiLabel>{art.badge}</UiLabel></span> : null}
      {art.chips?.length ? (
        <span className="kpc-durs" aria-hidden="true">
          {art.chips.map((chip, i) => (
            <span key={chip} className="kpc-dur">
              {chip}
              {i === art.chips!.length - 1 && art.chipUnit ? <small>&nbsp;{art.chipUnit}</small> : null}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  )
}

export default function PromoCards({ cards }: { cards: PromoCard[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const copy = useUiCopy()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-promo-card]'))
    const show = (el: HTMLElement, visible: boolean) => {
      // data-play fica de vez: a entrada roda uma vez; depois só o loop suave.
      if (visible) el.setAttribute('data-play', '')
      const video = el.querySelector('video')
      if (!video) return
      if (visible && !reduce) {
        video.muted = true
        video.play().catch(() => { /* autoplay recusado: fica o pôster */ })
      } else {
        video.pause()
      }
    }
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => show(el, true))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => show(entry.target as HTMLElement, entry.isIntersecting)),
      { threshold: 0.35 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [cards.length])

  if (!cards.length) return null
  return (
    <section className="kpc" aria-label={copy('New at Kineo')}>
      <style dangerouslySetInnerHTML={{ __html: PROMO_CARDS_CSS }} />
      <div className="wrap">
        <div className="kpc-track" ref={rootRef}>
          {cards.map((card, i) => (
            <Link
              key={card.id}
              href={card.href}
              className="kpc-card"
              data-promo-card={card.id}
              // Decisão do fundador 30/09 ("concordo com as 2 faixas"): medir cliques por card em 7 dias.
              // keepalive do trackEvent entrega o POST mesmo com a página saindo pelo link.
              onClick={() => { void trackEvent(PROMO_CLICK_EVENT, promoClickMetadata(card, i)) }}
            >
              <PromoArt card={card} />
              <span className="kpc-text">
                <span className="kpc-title">{card.title}</span>
                <span className="kpc-sub"><UiLabel>{card.subtitle}</UiLabel></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
