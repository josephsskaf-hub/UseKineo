'use client'

// ═══ KINEO-CHATGPT-WELCOME-2026-08-22 ══════════════════════════════════════
//
// O PÚBLICO, medido antes de escrever uma linha (22/08):
//   150 pessoas chegaram com utm_source=chatgpt.com. Elas são o DOBRO dos
//   outros grupos em todo passo do funil — 31% baixam vídeo (outros: 15%),
//   22% usam motor premium (outros: 10%), 14% abrem checkout (outros: 6-10%)
//   — e ZERO pagaram. Todas.
//
// O DIAGNÓSTICO que esta faixa ataca: elas caem por LINK PROFUNDO direto no
// /generate. Nunca veem a home, a vitrine de motores, os exemplos nem a
// âncora de preço. Chegam com a instrução do ChatGPT ("esta ferramenta faz
// vídeo grátis"), usam, e quando o preço aparece é a PRIMEIRA notícia de que
// existe preço — 21 abriram o checkout e nenhuma tentou uma segunda vez.
// A narrativa de valor do site inteiro é pulada; esta faixa entrega o
// essencial dela em uma linha, ANTES do choque.
//
// POR QUE UMA FAIXA E NÃO UM MODAL: a pessoa veio EXECUTAR uma tarefa que o
// ChatGPT prometeu. Bloquear a execução com overlay no primeiro segundo é o
// jeito mais rápido de contradizer a promessa. Faixa informa sem cobrar.
//
// COMO DETECTA: lê o FIRST-TOUCH que lib/analytics já persiste (localStorage
// `kineo_src` + cookie) — a mesma fonte da atribuição de aquisição. Isso
// resolve o problema do utm se perder no redirect de signup/OAuth: não
// importa em qual página a pessoa está agora, importa de onde ela CHEGOU.
// Nenhuma captura nova, nenhuma chave nova de storage para envelhecer.
//
// Números DERIVADOS (TRIAL_GRANT_CREDITS_COPY, STARTER_MO) — a lição
// permanente das copies que mentiram depois de cada reprice.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { STARTER_MO } from '@/lib/marketingPrice'
import { CHATGPT_QUICKSTARTS, CHATGPT_QUICKSTART_VARIANT } from '@/lib/growth/chatgptQuickstart'

const DISMISS_KEY = 'kineo_chatgpt_welcome_dismissed'
const SHOWN_EVENT_KEY = `${CHATGPT_QUICKSTART_VARIANT}:shown`

function firstTouchIsChatGpt(): boolean {
  try {
    const raw = localStorage.getItem('kineo_src')
    if (raw) {
      const src = JSON.parse(raw) as { utm_source?: string; referrer?: string }
      if ((src.utm_source ?? '').includes('chatgpt')) return true
      if ((src.referrer ?? '').includes('chatgpt')) return true
    }
  } catch { /* cai para o cookie */ }
  try {
    const m = document.cookie.match(/(?:^|;\s*)kineo_src=([^;]+)/)
    if (m) {
      const src = JSON.parse(decodeURIComponent(m[1])) as { utm_source?: string; referrer?: string }
      if ((src.utm_source ?? '').includes('chatgpt')) return true
      if ((src.referrer ?? '').includes('chatgpt')) return true
    }
  } catch { /* sem fonte legível = sem faixa */ }
  // Último degrau: o utm ainda está na URL (primeiro pageview, antes de
  // qualquer persistência ter rodado).
  try {
    return (new URLSearchParams(window.location.search).get('utm_source') ?? '').includes('chatgpt')
  } catch {
    return false
  }
}

export default function ChatGptWelcomeBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    } catch { /* sem sessionStorage a faixa reaparece por navegação — chato, não grave */ }
    if (!firstTouchIsChatGpt()) return
    setShow(true)
    try {
      if (sessionStorage.getItem(SHOWN_EVENT_KEY) === '1') return
      sessionStorage.setItem(SHOWN_EVENT_KEY, '1')
    } catch { /* analytics best effort */ }
    void trackEvent('chatgpt_welcome_banner_shown', { variant: CHATGPT_QUICKSTART_VARIANT })
  }, [])

  if (!show) return null

  return (
    <section
      role="region"
      aria-label="ChatGPT quick start"
      className="cgpt-quickstart"
    >
      <div className="cgpt-copy">
        <div className="cgpt-eyebrow">Continue from ChatGPT</div>
        <h2>Turn that answer into a finished Short</h2>
        <p>Choose what ChatGPT gave you. Kineo opens the right studio mode, with no setup to redo.</p>
      </div>
      <div className="cgpt-options" aria-label="Choose what you have">
          {CHATGPT_QUICKSTARTS.map((option, index) => (
            <Link
              key={option.choice}
              href={option.href}
              className={`cgpt-option${index === 0 ? ' cgpt-option-primary' : ''}`}
              onClick={() => {
                try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* best effort */ }
                void trackEvent('chatgpt_quickstart_selected', {
                  variant: CHATGPT_QUICKSTART_VARIANT,
                  input_type: option.choice,
                  destination: '/studio/create',
                })
              }}
            >
              <span className="cgpt-option-label">{option.label}</span>
              <span className="cgpt-option-detail">{option.detail}</span>
            </Link>
          ))}
      </div>
      <p className="cgpt-proof">
        {TRIAL_GRANT_CREDITS_COPY} trial credits already included · no card to start · plans from {STARTER_MO}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="cgpt-dismiss"
        onClick={() => {
          setShow(false)
          try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ok */ }
          void trackEvent('chatgpt_welcome_banner_dismissed', { variant: CHATGPT_QUICKSTART_VARIANT })
        }}
      >
        ×
      </button>
      <style jsx>{`
        .cgpt-quickstart {
          position: relative;
          display: grid;
          grid-template-columns: minmax(230px, 0.72fr) minmax(420px, 1.28fr);
          gap: 14px 22px;
          margin: 14px 16px 0;
          padding: 18px 48px 14px 20px;
          overflow: hidden;
          color: #f5f5f7;
          background:
            radial-gradient(circle at 8% 0%, rgba(103, 232, 249, .18), transparent 38%),
            linear-gradient(135deg, rgba(10, 30, 43, .98), rgba(12, 16, 26, .98));
          border: 1px solid rgba(103, 232, 249, .34);
          border-radius: 18px;
          box-shadow: 0 12px 38px rgba(0, 0, 0, .22);
        }
        .cgpt-copy { align-self: center; min-width: 0; }
        .cgpt-eyebrow {
          margin-bottom: 5px;
          color: #67e8f9;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        h2 { margin: 0; font-size: 18px; line-height: 1.22; letter-spacing: -.02em; }
        .cgpt-copy p { margin: 7px 0 0; color: #a9b8c7; font-size: 12px; line-height: 1.45; }
        .cgpt-options { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .cgpt-option {
          display: flex;
          min-width: 0;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          min-height: 64px;
          padding: 11px 14px;
          color: #dbeafe;
          text-decoration: none;
          background: rgba(255, 255, 255, .055);
          border: 1px solid rgba(255, 255, 255, .16);
          border-radius: 13px;
          transition: transform .15s ease, border-color .15s ease, background .15s ease;
        }
        .cgpt-option:hover { transform: translateY(-1px); border-color: rgba(103, 232, 249, .68); background: rgba(103, 232, 249, .10); }
        .cgpt-option-primary { color: #001018; background: linear-gradient(135deg, #67e8f9, #38bdf8); border-color: #67e8f9; }
        .cgpt-option-primary:hover { background: linear-gradient(135deg, #a5f3fc, #67e8f9); }
        .cgpt-option-label { font-size: 13px; font-weight: 900; line-height: 1.25; }
        .cgpt-option-detail { color: #91a6ba; font-size: 10px; font-weight: 650; line-height: 1.3; }
        .cgpt-option-primary .cgpt-option-detail { color: rgba(0, 16, 24, .68); }
        .cgpt-proof {
          grid-column: 1 / -1;
          margin: 0;
          color: #7890a4;
          font-size: 10px;
          line-height: 1.35;
          text-align: right;
        }
        .cgpt-dismiss {
          position: absolute;
          top: 9px;
          right: 10px;
          padding: 5px;
          color: #7890a4;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
          background: none;
          border: 0;
        }
        .cgpt-dismiss:hover { color: #f5f5f7; }
        @media (max-width: 860px) {
          .cgpt-quickstart { grid-template-columns: 1fr; margin: 10px 10px 0; padding: 17px 38px 14px 16px; }
          .cgpt-options { grid-template-columns: 1fr; }
          .cgpt-proof { text-align: left; }
        }
      `}</style>
    </section>
  )
}
