'use client'

// KINEO-PROMO-CARDS-2026-09-30 — fileira de cards grandes logo abaixo do menu da home. Dados e selo honesto em
// lib/ui/promoCards.ts; guardião scripts/test-promo-cards-2026-09-30.mjs.
//
// Movimento: tudo entra quando o card APARECE na tela (IntersectionObserver marca data-play) e o vídeo só toca
// enquanto o card está visível. prefers-reduced-motion: nenhuma animação e o vídeo fica parado no pôster.
// Sem layout shift: a mídia tem altura fixa por aspect-ratio.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { PROMO_CLICK_EVENT, promoClickMetadata, type PromoCard } from '@/lib/ui/promoCards'
import { trackEvent } from '@/lib/analytics'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export const PROMO_CARDS_CSS = `
.klp .kpc{padding:22px 0 4px}
.kpc-track{display:flex;gap:16px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain;padding:4px 2px 8px}
.kpc-track::-webkit-scrollbar{display:none}
.kpc-card{flex:0 0 clamp(200px,calc((100% - 48px) / 4),420px);scroll-snap-align:start;display:flex;flex-direction:column;gap:12px;color:var(--txt);outline:none;border-radius:16px}
.kpc-card:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:4px}
.kpc-media{position:relative;direction:ltr;aspect-ratio:512/348;border-radius:14px;overflow:hidden;background:#10141B;isolation:isolate;container-type:inline-size;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 14px 34px -22px rgba(7,9,13,.55);transition:transform var(--dur-base,250ms) var(--ease-swift,ease),box-shadow var(--dur-base,250ms) ease}
.kpc-card:hover .kpc-media{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.07) inset,0 22px 44px -24px rgba(7,9,13,.7)}
.kpc-text{display:flex;flex-direction:column;gap:3px;padding:0 2px}
.kpc-title{font-size:15px;line-height:1.25;font-weight:750;letter-spacing:.04em;text-transform:uppercase;color:var(--txt)}
.kpc-sub{font-size:14px;line-height:1.4;color:var(--muted)}
.kpc-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .7s ease}
.kpc-video video[data-on]{opacity:1}
.kpc-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,9,13,.30) 0%,transparent 30%,transparent 52%,rgba(7,9,13,.74) 100%);pointer-events:none}
.kpc-lower{position:absolute;left:3.6cqw;bottom:3.6cqw;display:flex}
.kpc-band{display:block;white-space:nowrap;font-weight:780;letter-spacing:-.01em;line-height:1;font-size:max(12px,4.4cqw);padding:1.5cqw 2.6cqw;border-radius:8px}
.kpc-lower[data-tone=cobalt] .kpc-band{background:var(--home-action,#0A5CFF);color:#fff;box-shadow:0 8px 22px -10px rgba(10,92,255,.7)}
.kpc-lower[data-tone=glass] .kpc-band{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.38);backdrop-filter:blur(10px) saturate(160%);-webkit-backdrop-filter:blur(10px) saturate(160%)}
.kpc-lower[data-tone=paper] .kpc-band{background:#F7F7F5;color:#0E1116;box-shadow:0 8px 22px -12px rgba(7,9,13,.6)}
.kpc-new{position:absolute;left:3.6cqw;top:3.6cqw;padding:5px 10px;border-radius:999px;background:var(--home-action,#0A5CFF);color:#fff;font-size:11px;font-weight:800;letter-spacing:.12em;box-shadow:0 6px 18px -6px rgba(10,92,255,.8)}
@media (prefers-reduced-motion: no-preference){
.kpc-card:not([data-play]) .kpc-new{opacity:0;transform:scale(.6)}
.kpc-card:not([data-play]) .kpc-band{opacity:0;transform:translateY(8px)}
.kpc-card[data-play] .kpc-band{animation:kpcUp .7s cubic-bezier(.16,1,.3,1) .2s both}
.kpc-card[data-play] .kpc-new{animation:kpcPop .55s cubic-bezier(.34,1.56,.64,1) .2s both}
.kpc-card:hover .kpc-video video[data-on]{transform:scale(1.03)}
.kpc-video video{transition:opacity .7s ease,transform .6s cubic-bezier(.16,1,.3,1)}
}
@keyframes kpcUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes kpcPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (max-width:1100px){
.kpc-card{flex-basis:clamp(200px,calc((100% - 32px) / 3),420px)}
}
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
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const count = art.clips.length

  // Troca quando o vídeo ativo TERMINA (onEnded, nunca timer fixo — os vídeos têm durações diferentes). O próximo
  // só toca se o card ainda está na tela (data-visible, marcado pelo IntersectionObserver da fileira).
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const videos = Array.from(box.querySelectorAll('video'))
    const video = videos[active]
    const next = videos[(active + 1) % videos.length]
    if (next && next !== video) next.preload = 'auto'
    const card = box.closest<HTMLElement>('[data-promo-card]')
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    if (video && card?.dataset.visible === '1' && !reduce) {
      video.currentTime = 0
      video.play().catch(() => { /* autoplay recusado: fica o pôster */ })
    }
  }, [active])

  return (
    <div className="kpc-media kpc-video" ref={boxRef}>
      {art.clips.map((clip, i) => (
        <video
          key={clip.src}
          src={clip.src}
          poster={clip.poster}
          data-on={i === active ? '' : undefined}
          onEnded={() => setActive((i + 1) % count)}
          muted
          playsInline
          loop={count === 1}
          preload="none"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
      ))}
      <span className="kpc-scrim" aria-hidden="true" />
      {art.bands?.length ? (
        <span className="kpc-lower" data-tone={art.bandTone ?? 'cobalt'} aria-hidden="true">
          {art.bands.map((band) => <span key={band} className="kpc-band">{band}</span>)}
        </span>
      ) : null}
      {art.badge ? <span className="kpc-new"><UiLabel>{art.badge}</UiLabel></span> : null}
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
      el.dataset.visible = visible ? '1' : '0'
      // Só o vídeo ATIVO do carrossel toca; os outros esperam o onEnded dele.
      const video = el.querySelector<HTMLVideoElement>('video[data-on]')
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
