'use client'
// KINEO-FAIXA-S25-2026-10-09 — faixa fina no topo da home anunciando o motor novo (fundador, 09/10, "tudo sim" na pesquisa
// de concorrentes: 7 dos 14 concorrentes fazem do Seedance 2.5 a manchete da home — Higgsfield, Arcads, Krea, PixVerse,
// CapCut, InVideo, Magnific — e a Kineo tinha o 2.5 sem dizer). Leva à página própria do motor, que mostra o que ele faz e
// que ele é dos planos pagos (lib/engineLaunch.ts engineIsPaidPlansOnly); a campanha home_news_bar_s25 mede o clique.
// Fechar vale para este navegador (localStorage com try/catch: sem storage, a faixa volta na próxima visita).
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'
import { useKling4PaidAvailability } from '@/components/Kling4PaidNotice' // KINEO-FAIXA-OFERTA-2910
import { kling4PromoVisible } from '@/lib/kling4PaidPresentation' // KINEO-FAIXA-OFERTA-2910
import { WELCOME20_PERCENT_OFF, WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth' // KINEO-FAIXA-OFERTA-2910
import { halloweenSkinOn } from '@/components/home/HalloweenSkin' // KINEO-FAIXA-UNICA-2910

// KINEO-FAIXA-OFERTA-2910 — fundador 29/10: a faixa azul passa a vender a oferta (Kling 4.0 grátis 30 dias no Creator + o desconto do
// 1º mês que o servidor já aplica). Chave nova: quem fechou a faixa do Seedance volta a ver esta uma vez.
const DISMISS_KEY = 'kineo:home-news-bar:oferta-k4:v1'
export const ENGINE_NEWS_BAR_HREF = '/pricing?intent_campaign=home_news_bar_k4'

// KINEO-FAIXA-UNICA-2910 — fundador 29/10 ("melhora as letras… Kling 4.0 e Halloween, não gostei muito"): as 2 faixas empilhadas viraram UMA,
// escura e discreta, com letra mais leve (500), o destaque em cor em vez de negrito em tudo e os botões em pílula. Halloween entra
// como 1ª metade só até 1º/11 (halloweenSkinOn); no celular fica só a oferta + um atalho 🎃.
const CSS = `
.knb{position:relative;z-index:60;display:flex;align-items:center;justify-content:center;gap:14px;padding:9px 52px 9px 16px;
  background:#0d1220;background-image:linear-gradient(90deg,rgba(255,140,40,.10),rgba(10,92,255,.16) 55%,rgba(255,140,40,.06));
  border-bottom:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.86);font-size:13.5px;line-height:1.35;letter-spacing:.005em}
.knb-part{display:inline-flex;align-items:center;gap:10px;min-width:0}
.knb-text{min-width:0;font-weight:500}
.knb-hi{color:#fff;font-weight:650}
.knb-hi-k{color:#8fc1ff;font-weight:650}
.knb-hi-h{color:#ffb35c;font-weight:650}
.knb-sep{width:1px;height:16px;background:rgba(255,255,255,.18);flex:none}
.knb-cta{flex:none;display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:999px;background:#fff;color:#0d1220 !important;font-size:12.5px;font-weight:650;text-decoration:none !important;white-space:nowrap}
.knb-cta:hover{background:#e8f1ff}
.knb-cta-h{background:rgba(255,179,92,.16);color:#ffcf96 !important;border:1px solid rgba(255,179,92,.35)}
.knb-cta-h:hover{background:rgba(255,179,92,.26)}
.knb-x{position:absolute;top:50%;right:10px;transform:translateY(-50%);display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.7);cursor:pointer}
.knb-x:hover{background:rgba(255,255,255,.10);color:#fff}
.knb :focus-visible{outline:2px solid #fff;outline-offset:2px}
.knb-emoji{display:none}
@media (max-width:900px){.knb-halloween,.knb-sep{display:none}.knb-emoji{display:inline-flex}}
@media (max-width:640px){.knb-sub{display:none}.knb{justify-content:flex-start;gap:8px;padding:8px 44px 8px 12px;font-size:12.5px}.knb-part{gap:8px}}
`

export default function EngineNewsBar() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === '1') setHidden(true) } catch { /* sem storage: a faixa fica */ }
  }, [])
  const kling4Promo = kling4PromoVisible(useKling4PaidAvailability()) // KINEO-FAIXA-OFERTA-2910
  const [halloween, setHalloween] = useState(false) // KINEO-FAIXA-UNICA-2910
  useEffect(() => { setHalloween(halloweenSkinOn(Date.now(), window.location.search)) }, [])
  if (hidden) return null
  return (
    <div className="knb" role="region" aria-label="Offer">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {halloween ? <>{/* KINEO-FAIXA-UNICA-2910 */}
        <span className="knb-part knb-halloween">
          <span className="knb-text"><span aria-hidden="true">🎃 </span><span className="knb-hi-h">Halloween</span> <UiLabel>— turn one photo into a witch or a zombie</UiLabel></span>
          <Link className="knb-cta knb-cta-h" href="/ai-halloween-video" data-home-cta="halloween_bar"><UiLabel>Try it</UiLabel></Link>
        </span>
        <span className="knb-sep" aria-hidden="true" />
      </> : null}
      <span className="knb-part">
        {halloween ? <Link className="knb-emoji" href="/ai-halloween-video" data-home-cta="halloween_bar" aria-label="Halloween effects">🎃</Link> : null}
        <span className="knb-text">{kling4Promo ? <><span className="knb-hi-k">Kling 4.0</span> <UiLabel>free for 30 days with Creator</UiLabel></> : <><span className="knb-hi-k">Kling 4.0</span> <UiLabel>is live</UiLabel></>}{WELCOME20_SITE_OFFER_LIVE ? <span className="knb-sub"> · <span className="knb-hi">{WELCOME20_PERCENT_OFF}% off</span> <UiLabel>your first month</UiLabel></span> : null}</span>
        <Link className="knb-cta" href={ENGINE_NEWS_BAR_HREF}><UiLabel>See plans</UiLabel> →</Link>
      </span>
      <button
        type="button"
        className="knb-x"
        aria-label="Close"
        onClick={() => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* fecha só nesta visita */ } }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  )
}
