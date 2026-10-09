'use client'
// KINEO-WELCOME20-FAIXA-2026-10-09 — a oferta de boas-vindas (WELCOME20: 20% no 1º mês, Creator/Studio mensal) numa faixa
// no topo do /pricing, no lugar do pop-up e do selo no cartão. Fundador (09/10, com o print da faixa amarela de um
// concorrente): "quero algo assim de 20% off", "no topo superior da tela", não "esse quadradinho" no cartão.
// O botão só leva ao mensal e aos planos: quem aplica o cupom é o botão do cartão (handleBuy), no recorte que o servidor aceita.
// Fechar vale para este navegador (localStorage, com try/catch: sem storage, a faixa só volta na próxima visita).
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'kineo:pricing-deal-bar:welcome20:v1'

const CSS = `
.kdb{position:relative;z-index:60;display:flex;align-items:center;gap:12px;padding:9px 16px;
  background:linear-gradient(90deg,#FFE135 0%,#FFE135 55%,#FFD43B 100%);color:#111;font-family:var(--font-sans)}
.kdb-tag{display:inline-flex;align-items:center;gap:6px;flex:none;border-radius:6px;padding:4px 9px;background:#0A5CFF;color:#fff;font-size:12px;font-weight:700}
.kdb-text{flex:1;min-width:0;font-size:14px;font-weight:600;line-height:1.35}
.kdb-cta{flex:none;border:0;border-radius:999px;padding:8px 16px;background:#111;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.kdb-cta:hover{background:#2a2a2a}
.kdb-x{flex:none;display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#111;cursor:pointer}
.kdb-x:hover{background:rgba(0,0,0,.08)}
.kdb :focus-visible{outline:2px solid #111;outline-offset:2px}
@media (max-width:640px){.kdb{flex-wrap:wrap;gap:8px 10px;padding:10px 44px 10px 12px}.kdb-text{flex:1 1 100%;font-size:13px}.kdb-cta{padding:7px 14px;font-size:13px}.kdb-x{position:absolute;top:6px;right:6px}}
`

export default function PricingDealBar({ percent, onClaim }: { percent: number; onClaim: () => void }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === '1') setHidden(true) } catch { /* sem storage: a faixa fica */ }
  }, [])
  if (hidden) return null
  return (
    <div className="kdb" role="region" aria-label="Special offer">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="kdb-tag">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 13V8M8 13V3M13 13V6" /></svg>
        Special offer
      </span>
      <span className="kdb-text">{percent}% off your first month on Creator and Studio monthly plans</span>
      <button type="button" className="kdb-cta" onClick={onClaim}>Get {percent}% off</button>
      <button
        type="button"
        className="kdb-x"
        aria-label="Close offer"
        onClick={() => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* fecha só nesta visita */ } }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  )
}
