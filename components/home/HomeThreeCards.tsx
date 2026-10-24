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
import { useEffect, useState } from 'react' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import { UiLabel, useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample' // KINEO-HOME-CARDS-BOTOES-2010 — o rótulo grátis agora vem de homeCardAdsCta
import {
  // HOME_CARD_BADGE saiu do import — KINEO-HOME-CARDS-CLAROS-2010: o selo do motor não aparece mais nos cards (fundador 21/10: "pode tirar o motor de todos os cards desses 4 primeiros")
  HOME_CARD_COPY,
  HOME_CARD_EVENT,
  HOME_CARD_ORDER,
  homeCardAdsCta, // KINEO-HOME-CARDS-BOTOES-2010
  homeCardClickMetadata,
  homeCardClip,
  homeCardHref,
  type HomeCardId,
} from '@/lib/ui/homeThreeCards'
import HomeProductAdsReel from '@/components/home/HomeProductAdsReel' // KINEO-BEBE-QUE-FALA-2010 — o reel do card de produto no modo 4 cards
import HomeKidsCard from '@/components/home/HomeKidsCard' // KINEO-BEBE-QUE-FALA-2010 — o 4º card (AI Kids Cartoons), só com o interruptor
import { HOME_CARDS_AJUSTE_CSS, HOME_KIDS_CARD_CSS } from '@/lib/ui/homeKidsCard' // KINEO-BEBE-QUE-FALA-2010 — a grade de 4 colunas mora num <style> próprio, emitido só com o card ligado
import { UGC_PILLAR_PATH, UGC_PILLAR_PT_PATH } from '@/lib/seo/paginasUgc2010' // KINEO-PAGINAS-UGC-2010 — o guia do AI UGC Ads ao lado do título dos cards
import { vemDoChatgpt } from '@/lib/seo/paginasIaClaras2110' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]

import HomeCardCycleMedia, { HOME_CARD_CYCLE_CSS } from '@/components/home/HomeCardCycleMedia' // KINEO-CARDS-GIRO-2410

export const HOME_THREE_CARDS_CSS = `
.klp .k3c{position:relative;z-index:1;padding:26px 0 8px}
.k3c-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 2px 14px}
.k3c-kicker{margin:0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#5A5F67)}
.k3c-more{font-size:13px;font-weight:700;color:var(--home-action,#0A5CFF);text-decoration:none;white-space:nowrap} /* KINEO-PAGINAS-UGC-2010 */
.k3c-more:hover{text-decoration:underline} /* KINEO-PAGINAS-UGC-2010 */
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
.k3c-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(5,7,11,.12) 0%,rgba(5,7,11,0) 14%,rgba(5,7,11,0) 62%,rgba(5,7,11,.28) 80%,rgba(5,7,11,.5) 100%)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 (fundador 21/10: "ainda está com problema na parte de baixo, parece uma sombra"): só um degradê curto e leve atrás do texto */
.k3c-glass{display:none} /* KINEO-HOME-CARDS-CLAROS-2010 — v2: o vidro fosco saiu (o desfoque virava mancha escura); o vídeo fica nítido até embaixo */
.k3c-card[data-home-card="films"] .k3c-media video{object-position:50% 0% !important;transform-origin:50% 0;transform:scale(1.1)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão (farol: o letreiro de baixo, a ~70% do vídeo, sai do quadro) */
.k3c-card[data-home-card="films"]:hover .k3c-media video{transform:scale(1.14)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão */
.k3c-card[data-home-card="product_ads"] .k3c-media video:not([data-trio]){object-position:50% 0% !important;transform-origin:50% 0;transform:scale(1.12)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão (LUME: o letreiro de baixo, a ~70–77%, sai; o de cima, a ~18–27%, fica inteiro no meio do card) */
.k3c-card[data-home-card="product_ads"]:hover .k3c-media video:not([data-trio]){transform:scale(1.16)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão */
.k3c-card[data-home-card="kids_cartoon"] .k3c-media video{object-position:50% 70% !important} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão (desenho: o letreiro, a ~55–62% do vídeo, sobe inteiro para cima do título) */
@media (max-width:760px){.k3c-card[data-home-card="kids_cartoon"] .k3c-media video{object-position:50% 100% !important}} /* KINEO-HOME-CARDS-CLAROS-2010 — v2 letreiro: sem o vidro, o letreiro queimado do vídeo não pode cair cortado atrás do título/botão (no celular o card é 5:6: o letreiro sobe ainda mais, para cima do título) */
.k3c-badge{position:absolute;left:16px;top:16px;z-index:2;display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:.11em;padding:7px 10px;border-radius:999px;color:#fff;background:rgba(10,12,18,.46);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.k3c-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:#7CF0B2;box-shadow:0 0 0 3px rgba(124,240,178,.18)}
.k3c-body{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:22px 22px 22px}
.k3c-title{margin:0;font-size:clamp(1.3rem,1.75vw,1.7rem);line-height:1.08;letter-spacing:-.025em;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.45),0 2px 18px rgba(0,0,0,.55)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2: a leitura vem da sombra do texto, não de laje nem de vidro */
.k3c-sub{margin:0;max-width:34ch;font-size:15px;line-height:1.42;color:rgba(255,255,255,.88);text-shadow:0 1px 3px rgba(0,0,0,.45),0 2px 18px rgba(0,0,0,.55)} /* KINEO-HOME-CARDS-CLAROS-2010 — v2: era .84 sem sombra */
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

// KINEO-CARDS-GIRO-2410 — all cards share the event-driven double buffer.
function CardMedia({ card, language }: { card: HomeCardId; language: string }) {
  return <HomeCardCycleMedia card={card} language={language} />
}

export default function HomeThreeCards({ signedIn, kidsCard = false }: { signedIn: boolean; kidsCard?: boolean }) { // KINEO-BEBE-QUE-FALA-2010 — + kidsCard (o 4º card); era: export default function HomeThreeCards({ signedIn }: { signedIn: boolean }) {
  const copy = useUiCopy()
  const language = useInterfaceLanguage()
  const [chatgptArrival, setChatgptArrival] = useState(false) // KINEO-PAGINAS-IA-CLARAS-2110 — SSR e primeira hidratação usam a mesma ordem.
  useEffect(() => { // KINEO-PAGINAS-IA-CLARAS-2110 — regra compartilhada pela home e pelas páginas de entrada; sem persistir origem.
    setChatgptArrival(vemDoChatgpt(new URLSearchParams(window.location.search).get('utm_source'), document.referrer))
  }, []) // KINEO-PAGINAS-IA-CLARAS-2110
  const cardOrder: readonly (HomeCardId | 'kids_cartoon')[] = kidsCard // KINEO-PAGINAS-IA-CLARAS-2110
    ? chatgptArrival ? ['kids_cartoon', ...HOME_CARD_ORDER] : [...HOME_CARD_ORDER, 'kids_cartoon'] // KINEO-PAGINAS-IA-CLARAS-2110
    : HOME_CARD_ORDER // KINEO-PAGINAS-IA-CLARAS-2110 — interruptor desligado mantém os três cards de sempre.
  // keepalive do trackEvent entrega o POST mesmo com a página saindo pelo link (mesmo padrão das portas).
  const track = (card: HomeCardId, position: number) => { void trackEvent(HOME_CARD_EVENT, { ...homeCardClickMetadata(card, signedIn), position }) } // KINEO-PAGINAS-IA-CLARAS-2110 — posição real, inclusive quando o Cartoon vem primeiro.
  const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, ADS_SAMPLE_LIVE) // KINEO-HOME-CARDS-BOTOES-2010 — um botão diferente por card (fundador 20/10)
  return (
    <section className="k3c" aria-label={copy('Choose what to make')} data-home-3-cards="1">
      <style dangerouslySetInnerHTML={{ __html: HOME_THREE_CARDS_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: HOME_CARDS_AJUSTE_CSS }} />{/* KINEO-BEBE-QUE-FALA-2010 — enquadramento dos cards de hoje (letreiro do vídeo nunca cortado na borda; UGC mais claro), sempre */}
      {kidsCard ? <style dangerouslySetInnerHTML={{ __html: HOME_KIDS_CARD_CSS }} /> : null}{/* KINEO-BEBE-QUE-FALA-2010 — desligado: nem o <style> nasce */}
      <style dangerouslySetInnerHTML={{ __html: HOME_CARD_CYCLE_CSS }} />{/* KINEO-CARDS-GIRO-2410 */}
      <div className="wrap">
        <div className="k3c-head"><p className="k3c-kicker"><UiLabel>Choose what to make</UiLabel></p><Link className="k3c-more" href={language === 'pt' ? UGC_PILLAR_PT_PATH : UGC_PILLAR_PATH} data-home-ugc-guide="1"><UiLabel>How AI UGC ads work</UiLabel> →</Link></div>{/* KINEO-PAGINAS-UGC-2010 */}
        <div className="k3c-grid" data-k3c-cols={kidsCard ? '4' : undefined}>{/* KINEO-BEBE-QUE-FALA-2010 — undefined = o atributo nem é emitido (home de hoje); era: <div className="k3c-grid"> */}
          {cardOrder.map((card, index) => card === 'kids_cartoon' ? ( // KINEO-PAGINAS-IA-CLARAS-2110 — ordem DOM e teclado seguem a ordem visual; chaves estáveis.
            <HomeKidsCard key={card} signedIn={signedIn} position={index + 1} /> // KINEO-PAGINAS-IA-CLARAS-2110
          ) : (
            <Link key={card} href={homeCardHref(card, signedIn)} className="k3c-card" data-home-card={card} onClick={() => track(card, index + 1)}>
              {kidsCard && card === 'product_ads' ? <HomeProductAdsReel language={language} /> : <CardMedia card={card} language={language} />}{/* KINEO-BEBE-QUE-FALA-2010 — modo 4 cards: o reel Lume + 3 trios no card de produto; era: <CardMedia card={card} language={language} /> */}
              <span className="k3c-shade" aria-hidden="true" />
              <span className="k3c-glass" aria-hidden="true" />
              {/* KINEO-HOME-CARDS-CLAROS-2010 — sem o selo do motor (fundador 21/10: "pode tirar o motor de todos os cards desses 4 primeiros"); era: <span className="k3c-badge" aria-hidden="true">{HOME_CARD_BADGE[card]}</span> */}
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
