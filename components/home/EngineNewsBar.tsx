'use client'
// KINEO-FAIXA-S25-2026-10-09 — faixa fina no topo da home anunciando o motor novo (fundador, 09/10, "tudo sim" na pesquisa
// de concorrentes: 7 dos 14 concorrentes fazem do Seedance 2.5 a manchete da home — Higgsfield, Arcads, Krea, PixVerse,
// CapCut, InVideo, Magnific — e a Kineo tinha o 2.5 sem dizer). Leva à página própria do motor, que mostra o que ele faz e
// que ele é dos planos pagos (lib/engineLaunch.ts engineIsPaidPlansOnly); a campanha home_news_bar_s25 mede o clique.
// Fechar vale para este navegador (localStorage com try/catch: sem storage, a faixa volta na próxima visita).
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'

const DISMISS_KEY = 'kineo:home-news-bar:s25:v1'
export const ENGINE_NEWS_BAR_HREF = '/ai-video-generator/seedance-2-5?intent_campaign=home_news_bar_s25'

const CSS = `
.knb{position:relative;z-index:60;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 48px 8px 16px;
  background:linear-gradient(90deg,#0A2A6B 0%,#0A5CFF 50%,#0A2A6B 100%);color:#fff;font-size:14px;line-height:1.35}
.knb-tag{flex:none;border-radius:6px;padding:3px 8px;background:#fff;color:#0A2A6B;font-size:11.5px;font-weight:800;letter-spacing:.04em}
.knb-text{min-width:0;font-weight:550}
.knb-text b{font-weight:800}
.knb-cta{flex:none;color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.knb-cta:hover{opacity:.85}
.knb-x{position:absolute;top:50%;right:8px;transform:translateY(-50%);display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#fff;cursor:pointer}
.knb-x:hover{background:rgba(255,255,255,.14)}
.knb :focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (max-width:640px){.knb-sub{display:none}.knb{flex-wrap:wrap;justify-content:flex-start;gap:6px 10px;padding:9px 44px 9px 12px;font-size:13px}}
`

export default function EngineNewsBar() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === '1') setHidden(true) } catch { /* sem storage: a faixa fica */ }
  }, [])
  if (hidden) return null
  return (
    <div className="knb" role="region" aria-label="New engine">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="knb-tag">NEW</span>
      <span className="knb-text"><b>Seedance 2.5</b> <UiLabel>is live on Kineo.</UiLabel><span className="knb-sub"> <UiLabel>ByteDance’s newest video model.</UiLabel></span></span>
      <Link className="knb-cta" href={ENGINE_NEWS_BAR_HREF}><UiLabel>See what it makes</UiLabel></Link>
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
