'use client'

// KINEO-CLAUDE-1CLIQUE-2026-09-30 — o "Try in Claude" de cada card da /claude-connector, medido
// (claude_open_prompt_click com a origem da visita e o id do pedido). O destino vem pronto do servidor
// (claudePromptHref em lib/claudeConnect.ts); aqui só se mede o clique.
import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { CLAUDE_CONNECT_EVENTS, claudeConnectSource } from '@/lib/claudeConnect'

export default function ClaudePromptLink({ href, preset, title, style, children }: { href: string; preset: string; title: string; style: CSSProperties; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      style={style}
      onClick={() => {
        const source = claudeConnectSource(new URLSearchParams(window.location.search).get('src'))
        void trackEvent(CLAUDE_CONNECT_EVENTS.openPrompt, { source, preset })
      }}
    >
      {children}
    </a>
  )
}
