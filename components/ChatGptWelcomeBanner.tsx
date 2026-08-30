'use client'

// ═══ KINEO-CHATGPT-WELCOME-2026-08-22 ══════════════════════════════════════
//
// O PÚBLICO, medido antes de escrever uma linha (22/08):
//   150 pessoas chegaram com utm_source=chatgpt.com. Elas são o DOBRO dos
// outros grupos em todo passo do funil e ZERO pagaram.
//
// KINEO-CHATGPT-QUICKSTART-V5-2026-08-30 — a versão v4 escondia o campo de
// texto até a pessoa classificar o que tinha. Em produção, por pessoa, 11
// viram a v4, 5 colaram/avançaram e as 5 escolheram roteiro completo; nenhuma
// escolheu "só ideia". A v5 remove essa decisão anterior ao trabalho: o campo
// aparece imediatamente, "usar este roteiro" é primário e autoria por IA
// continua explícita como alternativa. Nenhum clique daqui gera ou debita.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ChatGptWelcomeBanner.module.css'
import { trackEvent } from '@/lib/analytics'
import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { STARTER_MO } from '@/lib/marketingPrice'
import {
  CHATGPT_QUICKSTART_INPUT_LIMIT,
  CHATGPT_QUICKSTART_VARIANT,
  buildChatGptQuickstartHref,
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
  try {
    return (new URLSearchParams(window.location.search).get('utm_source') ?? '').includes('chatgpt')
  } catch {
    return false
  }
}

export default function ChatGptWelcomeBanner() {
  const [show, setShow] = useState(false)
  const router = useRouter()

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
      onSelect={(choice, input) => {
        const href = buildChatGptQuickstartHref(choice, input)
        if (!href) return
        try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* best effort */ }
        void trackEvent('chatgpt_quickstart_selected', {
          variant: CHATGPT_QUICKSTART_VARIANT,
          input_type: choice,
          input_length: input.trim().length,
          destination: '/studio/create',
        })
        router.push(href)
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
  onSelect: (choice: ChatGptQuickstartChoice, input: string) => void
  onDismiss: () => void
}) {
  const [input, setInput] = useState('')
  const inputOpenedTracked = useRef(false)
  const ready = input.trim().length > 0

  const trackInputOpened = () => {
    if (inputOpenedTracked.current) return
    inputOpenedTracked.current = true
    void trackEvent('chatgpt_quickstart_input_opened', {
      variant: CHATGPT_QUICKSTART_VARIANT,
      input_type: 'unclassified',
    })
  }

  return (
    <section role="region" aria-label="ChatGPT quick start" className={styles.quickstart}>
      <div className={styles.copy}>
        <div className={styles.eyebrow}>Continue from ChatGPT</div>
        <h2>Paste the answer. Make the Short.</h2>
        <p>Use the script as written, or let Kineo turn a rough idea into the hook, scenes and payoff.</p>
      </div>
      <div className={styles.editor}>
        <label htmlFor="chatgpt-quickstart-input">Paste the answer from ChatGPT</label>
        <textarea
          id="chatgpt-quickstart-input"
          value={input}
          maxLength={CHATGPT_QUICKSTART_INPUT_LIMIT}
          rows={3}
          placeholder="Paste the script, outline or idea here…"
          onFocus={trackInputOpened}
          onChange={(event) => setInput(event.target.value)}
        />
        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.continueButton}
            disabled={!ready}
            onClick={() => onSelect('finished_script', input)}
          >
            Use this script →
          </button>
          <button
            type="button"
            className={styles.ideaButton}
            disabled={!ready}
            onClick={() => onSelect('idea', input)}
          >
            I only have an idea — write the script
          </button>
        </div>
        <span>Your text stays editable in Studio before anything is generated.</span>
      </div>
      <p className={styles.proof}>
        {TRIAL_GRANT_CREDITS_COPY} trial credits already included · no card to start · plans from {STARTER_MO}
      </p>
      <button type="button" aria-label="Dismiss" className={styles.dismiss} onClick={onDismiss}>
        ×
      </button>
    </section>
  )
}
