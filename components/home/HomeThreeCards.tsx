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
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample' // KINEO-HOME-CARDS-BOTOES-2010 — o rótulo grátis agora vem de homeCardAdsCta
import {
  HOME_CARD_BADGE,
  HOME_CARD_COPY,
  HOME_CARD_EVENT,
  HOME_CARD_ORDER,
  homeCardAdsCta, // KINEO-HOME-CARDS-BOTOES-2010
  homeCardClickMetadata,
  homeCardClip,
  homeCardHref,
  type HomeCardId,
} from '@/lib/ui/homeThreeCards'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export const HOME_THREE_CARDS_CSS = `
.klp .k3c{position:relative;z-index:1;padding:26px 0 8px}
.k3c-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 2px 14px}
.k3c-kicker{margin:0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#5A5F67)}
.k3c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:95%;margin-inline:auto} /* KINEO-HOME-CARDS-BOTOES-2010 — os 3 cards 5% menores no computador */
.k3c-card{position:relative;display:block;aspect-ratio:5/6;border-radius:22px;overflow:hidden;isolation:isolate;background:#0B0E14;color:#fff;outline:none;border:1px solid var(--home-line,rgba(14,17,22,.08));box-shadow:0 1px 2px rgba(10,14,22,.06),0 22px 44px -26px rgba(10,14,22,.55);transition:transform .45s cubic-bezier(.2,.7,.2,1),box-shadow .45s cubic-bezier(.2,.7,.2,1)}
.k3c-card:hover{transform:translateY(-4px);box-shadow:0 2px 4px rgba(10,14,22,.08),0 34px 60px -28px rgba(10,14,22,.62)}
.k3c-card:focus-visible{outline:3px solid var(--home-action,#0A5CFF);outline-offset:4px}
.k3c-media{position:absolute;inset:0;z-index:0}
.k3c-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 42%;display:block;transform:scale(1.001);transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
.k3c-card:hover .k3c-media video{transform:scale(1.045)}
.k3c-card[data-home-card="films"] .k3c-media video{object-position:50% 16%}
.k3c-card[data-home-card="product_ads"] .k3c-media video{object-position:50% 86%}
.k3c-card[data-home-card="ugc_ads"] .k3c-media video{object-position:50% 60%}
.k3c-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(5,7,11,.38) 0%,rgba(5,7,11,0) 16%,rgba(5,7,11,0) 50%,rgba(5,7,11,.55) 68%,rgba(5,7,11,.88) 100%)}
.k3c-glass{position:absolute;left:0;right:0;bottom:0;height:46%;z-index:1;pointer-events:none;-webkit-backdrop-filter:blur(18px) saturate(1.15);backdrop-filter:blur(18px) saturate(1.15);-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 38%);mask-image:linear-gradient(180deg,transparent 0%,#000 38%);background:linear-gradient(180deg,rgba(6,8,13,0) 0%,rgba(6,8,13,.5) 45%,rgba(6,8,13,.72) 100%)}
.k3c-badge{position:absolute;left:16px;top:16px;z-index:2;display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:.11em;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(10,12,18,.46);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.k3c-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#7CF0B2;box-shadow:0 0 0 3px rgba(124,240,178,.18)}
.k3c-body{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:22px 22px 22px}
.k3c-title{margin:0;font-size:clamp(1.3rem,1.75vw,1.7rem);line-height:1.08;letter-spacing:-.025em;font-weight:800;color:#fff;text-shadow:0 1px 12px rgba(0,0,0,.35)}
.k3c-sub{margin:0;max-width:34ch;font-size:15px;line-height:1.42;color:rgba(255,255,255,.84)}
.klp .k3c-cta{margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:11px 16px;font-size:14px;font-weight:750;border-radius:999px}
.k3c-cta .k3c-arrow{display:inline-block;transition:transform .3s ease}
.k3c-card:hover .k3c-arrow{transform:translateX(3px)}
@media (max-width:1100px) and (min-width:761px){
.k3c-grid{gap:14px}
.k3c-card{aspect-ratio:3/4}
.k3c-body{padding:18px}
.k3c-sub{font-size:14px}
}
@media (max-width:760px){
.klp .k3c{padding-top:16px}
.k3c-head{margin:0 0 12px}
.k3c-grid{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -20px;padding:2px 20px 14px;scroll-padding:0 20px}
.k3c-grid{max-width:none} /* KINEO-HOME-CARDS-BOTOES-2010 — no celular a faixa segue rolando de ponta a ponta (o 95% é só do computador) */
.k3c-grid::-webkit-scrollbar{display:none}
.k3c-card{flex:0 0 80%;max-width:340px;scroll-snap-align:start;border-radius:20px}
.k3c-card:hover{transform:none}
.k3c-body{padding:18px}
.k3c-title{font-size:1.4rem}
.k3c-sub{font-size:14px}
}
@media (prefers-reduced-motion:reduce){.k3c-card,.k3c-media video,.k3c-arrow{transition:none}.k3c-card:hover .k3c-media video{transform:none}}
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
  const ref = useRef<HTMLSpanElement>(null)
  const clip = homeCardClip(card, language)
  useCardPlayback(ref)
  return (
    <span className="k3c-media" ref={ref}>
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
  )
}

export default function HomeThreeCards({ signedIn }: { signedIn: boolean }) {
  const copy = useUiCopy()
  const language = useInterfaceLanguage()
  // keepalive do trackEvent entrega o POST mesmo com a página saindo pelo link (mesmo padrão das portas).
  const track = (card: HomeCardId) => { void trackEvent(HOME_CARD_EVENT, homeCardClickMetadata(card, signedIn)) }
  const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, ADS_SAMPLE_LIVE) // KINEO-HOME-CARDS-BOTOES-2010 — um botão diferente por card (fundador 20/10)
  return (
    <section className="k3c" aria-label={copy('Choose what to make')} data-home-3-cards="1">
      <style dangerouslySetInnerHTML={{ __html: HOME_THREE_CARDS_CSS }} />
      <div className="wrap">
        <div className="k3c-head"><p className="k3c-kicker"><UiLabel>Choose what to make</UiLabel></p></div>
        <div className="k3c-grid">
          {HOME_CARD_ORDER.map((card) => (
            <Link key={card} href={homeCardHref(card, signedIn)} className="k3c-card" data-home-card={card} onClick={() => track(card)}>
              <CardMedia card={card} language={language} />
              <span className="k3c-shade" aria-hidden="true" />
              <span className="k3c-glass" aria-hidden="true" />
              <span className="k3c-badge" aria-hidden="true">{HOME_CARD_BADGE[card]}</span>
              <span className="k3c-body">
                <h2 className="k3c-title">{copy(HOME_CARD_COPY[card].title)}</h2>
                <p className="k3c-sub">{copy(HOME_CARD_COPY[card].line)}</p>
                <span className="btn btn-blue k3c-cta">{card === 'films' ? <UiLabel>Make my film</UiLabel> : adsCta(card)} <span className="k3c-arrow" aria-hidden="true">→</span></span>{/* KINEO-HOME-CARDS-BOTOES-2010 */}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
