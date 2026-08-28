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
import styles from './ChatGptWelcomeBanner.module.css'
import { trackEvent } from '@/lib/analytics'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { STARTER_MO } from '@/lib/marketingPrice'
import {
  CHATGPT_QUICKSTARTS,
  CHATGPT_QUICKSTART_VARIANT,
  type ChatGptQuickstartChoice,
} from '@/lib/growth/chatgptQuickstart'

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
    <ChatGptWelcomeCard
      onSelect={(choice) => {
        try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* best effort */ }
        void trackEvent('chatgpt_quickstart_selected', {
          variant: CHATGPT_QUICKSTART_VARIANT,
          input_type: choice,
          destination: '/studio/create',
        })
      }}
      onDismiss={() => {
        setShow(false)
        try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ok */ }
        void trackEvent('chatgpt_welcome_banner_dismissed', { variant: CHATGPT_QUICKSTART_VARIANT })
      }}
    />
  )
}

export function ChatGptWelcomeCard({
  onSelect,
  onDismiss,
}: {
  onSelect: (choice: ChatGptQuickstartChoice) => void
  onDismiss: () => void
}) {

  return (
    <section
      role="region"
      aria-label="ChatGPT quick start"
      className={styles.quickstart}
    >
      <div className={styles.copy}>
        <div className={styles.eyebrow}>Continue from ChatGPT</div>
        <h2>Turn that answer into a finished Short</h2>
        <p>Choose what ChatGPT gave you. Kineo opens the right studio mode, with no setup to redo.</p>
      </div>
      <div className={styles.options} aria-label="Choose what you have">
          {CHATGPT_QUICKSTARTS.map((option, index) => (
            <Link
              key={option.choice}
              href={option.href}
              className={`${styles.option}${index === 0 ? ` ${styles.optionPrimary}` : ''}`}
              onClick={() => onSelect(option.choice)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              <span className={styles.optionDetail}>{option.detail}</span>
            </Link>
          ))}
      </div>
      <p className={styles.proof}>
        {TRIAL_GRANT_CREDITS_COPY} trial credits already included · no card to start · plans from {STARTER_MO}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className={styles.dismiss}
        onClick={onDismiss}
      >
        ×
      </button>
    </section>
  )
}
