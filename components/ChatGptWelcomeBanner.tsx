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
    <div
      role="region"
      aria-label="ChatGPT quick start"
      style={{
        background: 'linear-gradient(90deg, rgba(41,151,255,.14), rgba(41,151,255,.05))',
        borderBottom: '1px solid rgba(41,151,255,.35)',
        padding: '10px 46px 10px 16px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 600,
        color: '#f5f5f7',
        position: 'relative',
        lineHeight: 1.5,
      }}
    >
      {/* A frase faz em uma linha o que a home faria em três dobras: nomeia a
          origem (confirmação de que a recomendação era certa), diz o que a
          conta JÁ TEM (sem pedir nada), e ancora que o pago começa barato —
          para o preço, quando aparecer, não ser a primeira notícia. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 12px' }}>
        <span>
          <b>What did ChatGPT give you?</b>{' '}
          Pick the right starting mode. Your account started with {TRIAL_GRANT_CREDITS_COPY} free credits; plans start at {STARTER_MO}.
        </span>
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
          {CHATGPT_QUICKSTARTS.map((option, index) => (
            <Link
              key={option.choice}
              href={option.href}
              onClick={() => {
                try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* best effort */ }
                void trackEvent('chatgpt_quickstart_selected', {
                  variant: CHATGPT_QUICKSTART_VARIANT,
                  input_type: option.choice,
                  destination: '/studio/create',
                })
              }}
              style={{
                display: 'inline-block',
                borderRadius: 999,
                padding: '5px 11px',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 850,
                color: index === 0 ? '#001018' : '#dbeafe',
                background: index === 0 ? '#67e8f9' : 'rgba(255,255,255,.06)',
                border: index === 0 ? '1px solid #67e8f9' : '1px solid rgba(255,255,255,.18)',
              }}
            >
              {option.label}
            </Link>
          ))}
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false)
          try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ok */ }
          void trackEvent('chatgpt_welcome_banner_dismissed', { variant: CHATGPT_QUICKSTART_VARIANT })
        }}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#86868b',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  )
}
