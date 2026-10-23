'use client'

// [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"] KINEO-PAGINAS-IA-CLARAS-2110 — quem chega à
// /claude-connector vindo do ChatGPT (utm_source ou referrer com "chatgpt"/"openai") vê a galeria de pedidos como
// "Try it in ChatGPT": o MESMO catálogo, cada botão abre um chat novo do ChatGPT com o pedido. Quem vem de outro lugar vê a
// página de hoje ("Try it in Claude"). A página é estática: o servidor e o 1º quadro saem na versão Claude e a troca acontece
// depois da montagem (mesmo padrão do ?copied= do ConnectPanel). A regra mora em lib/seo/paginasIaClaras2110.ts (vemDoChatgpt).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { CLAUDE_CONNECT_EVENTS, claudeConnectSource } from '@/lib/claudeConnect'
import { vemDoChatgpt } from '@/lib/seo/paginasIaClaras2110'
import ClaudePromptLink from './ClaudePromptLink'

function useVemDoChatgpt(): boolean {
  const [chatgpt, setChatgpt] = useState(false)
  useEffect(() => {
    setChatgpt(vemDoChatgpt(new URLSearchParams(window.location.search).get('utm_source'), document.referrer))
  }, [])
  return chatgpt
}

/** O título e o parágrafo da galeria de pedidos: "Try it in Claude" ou, para quem veio do ChatGPT, "Try it in ChatGPT". */
export function TryItHeading({ h2Style, pStyle }: { h2Style: CSSProperties; pStyle: CSSProperties }) {
  const chatgpt = useVemDoChatgpt()
  if (chatgpt) {
    return (
      <>
        <h2 style={h2Style} data-try-it="chatgpt">Try it in ChatGPT</h2>
        <p style={pStyle}>
          Each &ldquo;Try in ChatGPT&rdquo; opens a new ChatGPT chat with the request already typed in. ChatGPT uses Kineo only
          if Kineo Studio is added and turned on in that chat (steps above, in the ChatGPT tab); every request ends by asking
          ChatGPT to show you how to add it first if it is not.
        </p>
      </>
    )
  }
  return (
    <>
      <h2 style={h2Style}>Try it in Claude</h2>
      <p style={pStyle}>
        Each &ldquo;Try in Claude&rdquo; opens a new Claude chat with the request already typed in. Review it and press
        send. Claude uses Kineo only if the connector is added and turned on in that chat; every request ends by
        asking Claude to help you connect Kineo first if it is not.
      </p>
    </>
  )
}

/** O botão de cada cartão: "Try in Claude ↗" (claude.ai/new?q=…) ou "Try in ChatGPT ↗" (chatgpt.com/?q=…), medido igual. */
export function TryInLink({ claudeHref, chatgptHref, preset, title, style, children }: { claudeHref: string; chatgptHref: string; preset: string; title: string; style: CSSProperties; children: ReactNode }) {
  const chatgpt = useVemDoChatgpt()
  if (!chatgpt) return <ClaudePromptLink href={claudeHref} preset={preset} title={title} style={style}>{children}</ClaudePromptLink>
  return (
    <a
      href={chatgptHref}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      style={style}
      onClick={() => {
        const source = claudeConnectSource(new URLSearchParams(window.location.search).get('src'))
        void trackEvent(CLAUDE_CONNECT_EVENTS.openPrompt, { source, preset, assistant: 'chatgpt' })
      }}
    >
      Try in ChatGPT ↗
    </a>
  )
}
