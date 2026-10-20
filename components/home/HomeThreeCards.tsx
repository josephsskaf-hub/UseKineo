'use client'

// KINEO-HOME-3-CARDS-1910 — os 3 cards de produto da primeira dobra da home: Filmes · Anúncios de Produto · Anúncios UGC.
// Dados, destinos e medição em lib/ui/homeThreeCards.ts (puro); guardião scripts/test-home-3-cards-1910.mjs. Mesma
// linguagem visual das 2 portas (HomeTwoDoors: cantos 18/14, mídia escura, título forte, botão azul da casa) — produto novo
// entra DENTRO da home antiga, no lugar das portas, só para quem o interruptor abre (KineoLanding).
//
// Movimento: o vídeo só toca enquanto o card está na tela (IntersectionObserver); prefers-reduced-motion = pôster parado.
// Sem preço em lugar nenhum (cartão de vídeo = motor/produto + nome). Os botões dos anúncios dizem "grátis" só com a amostra
// no ar (ADS_SAMPLE_LIVE) e na língua da interface (lib/ads/sample.ts, 16 línguas).
import Link from 'next/link'
import { useEffect, useRef, type RefObject } from 'react'
import { UiLabel, useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { ADS_SAMPLE_LIVE, adsSampleCopy } from '@/lib/ads/sample'
import {
  HOME_CARD_BADGE,
  HOME_CARD_COPY,
  HOME_CARD_EVENT,
  HOME_CARD_ORDER,
  homeCardClickMetadata,
  homeCardClip,
  homeCardHref,
  type HomeCardId,
} from '@/lib/ui/homeThreeCards'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export const HOME_THREE_CARDS_CSS = `
.klp .k3c{padding:22px 0 6px}
.k3c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.k3c-card{position:relative;display:flex;flex-direction:column;gap:14px;padding:12px 12px 18px;border-radius:18px;border:1px solid var(--home-line,rgba(255,255,255,.10));background:var(--card,#10141B);color:var(--txt);outline:none;transition:border-color var(--dur-base,250ms) ease,transform var(--dur-base,250ms) var(--ease-swift,ease)}
.k3c-card:hover{border-color:var(--home-action,#0A5CFF);transform:translateY(-2px)}
.k3c-card:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:4px}
.k3c-media{position:relative;direction:ltr;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#0B0E14;isolation:isolate}
.k3c-blur{position:absolute;inset:-12%;width:124%;height:124%;object-fit:cover;filter:blur(22px) brightness(.45) saturate(1.2);transform:translateZ(0)}
.k3c-glow{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 120%,rgba(10,92,255,.30),transparent 70%)}
.k3c-phone{position:absolute;top:8%;bottom:8%;left:50%;transform:translateX(-50%);aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#05070B;box-shadow:0 16px 36px -14px rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.14)}
.k3c-phone video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.k3c-badge{position:absolute;left:10px;top:10px;z-index:2;font-size:11px;font-weight:800;letter-spacing:.08em;padding:5px 8px;border-radius:7px;background:rgba(7,9,13,.72);color:#fff;border:1px solid rgba(255,255,255,.18)}
.k3c-text{display:flex;flex-direction:column;gap:6px;padding:0 6px;flex:1}
.k3c-title{margin:0;font-size:clamp(1.15rem,1.7vw,1.45rem);line-height:1.15;letter-spacing:-.02em;font-weight:780;color:var(--txt)}
.k3c-sub{margin:0;font-size:15px;line-height:1.45;color:var(--muted)}
.k3c-cta{align-self:flex-start;margin:4px 6px 0}
@media (max-width:980px) and (min-width:761px){
.k3c-grid{gap:12px}
.k3c-sub{font-size:14px}
}
@media (max-width:760px){
.klp .k3c{padding-top:14px}
.k3c-grid{grid-template-columns:1fr;gap:12px}
.k3c-card{display:grid;grid-template-columns:112px minmax(0,1fr);grid-template-rows:auto auto;column-gap:14px;row-gap:10px;padding:10px;align-items:center}
.k3c-media{grid-row:1 / span 2;aspect-ratio:9/16;width:112px}
.k3c-phone{inset:0;top:0;bottom:0;left:0;transform:none;width:100%;border-radius:12px;border:0}
.k3c-blur,.k3c-glow{display:none}
.k3c-badge{left:6px;top:6px;font-size:9px;padding:3px 5px;letter-spacing:.06em;max-width:calc(100% - 12px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k3c-text{padding:0;align-self:end}
.k3c-sub{font-size:14px}
.k3c-cta{margin:0;align-self:start}
}
`

/** Toca o vídeo do card só enquanto ele está na tela; reduced-motion = parado no pôster. */
function useCardPlayback(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    const set = (visible: boolean) => {
      root.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
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
  }, [ref])
}

function CardMedia({ card, language }: { card: HomeCardId; language: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const clip = homeCardClip(card, language)
  useCardPlayback(ref)
  return (
    <div className="k3c-media" ref={ref}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="k3c-blur" src={clip.poster} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <span className="k3c-glow" aria-hidden="true" />
      <span className="k3c-phone">
        <video
          key={clip.src}
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
      </span>
      <span className="k3c-badge" aria-hidden="true">{HOME_CARD_BADGE[card]}</span>
    </div>
  )
}

export default function HomeThreeCards({ signedIn }: { signedIn: boolean }) {
  const copy = useUiCopy()
  const language = useInterfaceLanguage()
  // keepalive do trackEvent entrega o POST mesmo com a página saindo pelo link (mesmo padrão das portas).
  const track = (card: HomeCardId) => { void trackEvent(HOME_CARD_EVENT, homeCardClickMetadata(card, signedIn)) }
  const adsCta = ADS_SAMPLE_LIVE ? adsSampleCopy(language).make : copy('Make my ad')
  return (
    <section className="k3c" aria-label={copy('Choose what to make')} data-home-3-cards="1">
      <style dangerouslySetInnerHTML={{ __html: HOME_THREE_CARDS_CSS }} />
      <div className="wrap">
        <div className="k3c-grid">
          {HOME_CARD_ORDER.map((card) => (
            <Link key={card} href={homeCardHref(card, signedIn)} className="k3c-card" data-home-card={card} onClick={() => track(card)}>
              <CardMedia card={card} language={language} />
              <span className="k3c-text">
                <h2 className="k3c-title">{copy(HOME_CARD_COPY[card].title)}</h2>
                <p className="k3c-sub">{copy(HOME_CARD_COPY[card].line)}</p>
              </span>
              <span className="btn btn-blue k3c-cta">{card === 'films' ? <UiLabel>Make my film</UiLabel> : adsCta} →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
