// KINEO-MCP-PAGINA-2026-09-30 — os "azulejos" de cliente do hero e os ícones das abas da /claude-connector.
// Desenho PRÓPRIO em SVG inline (faísca, balão, seta, terminal, tomada): nenhum arquivo de logo de terceiros, nenhuma
// marca reproduzida. Sem 'use client' e sem estado — serve tanto à página (servidor) quanto ao painel (cliente).
import { MCP_PALETTE as C } from './palette'

export type ClientKey = 'claude' | 'claude_code' | 'cursor' | 'other' | 'chatgpt'

export function ClientGlyph({ kind, size = 22 }: { kind: ClientKey; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  if (kind === 'claude') {
    // faísca de 8 raios
    return (
      <svg {...common} stroke={C.glyphClaude} strokeWidth={2.4} strokeLinecap="round">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      </svg>
    )
  }
  if (kind === 'claude_code') {
    // terminal >_
    return (
      <svg {...common} stroke={C.glyphCode} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4" width="19" height="16" rx="3" />
        <path d="M7 10l3 2.5L7 15M12.5 15.5H17" />
      </svg>
    )
  }
  if (kind === 'cursor') {
    // seta de ponteiro
    return (
      <svg {...common} stroke={C.glyphCursor} strokeWidth={2} strokeLinejoin="round">
        <path d="M5 3.5l13.5 7.2-5.8 1.6-2.6 5.9L5 3.5z" fill={C.glyphCursor} fillOpacity={0.18} />
      </svg>
    )
  }
  if (kind === 'chatgpt') {
    // balão de conversa
    return (
      <svg {...common} stroke={C.glyphChatgpt} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5v-8z" />
        <path d="M8.5 10h7" />
      </svg>
    )
  }
  // other: tomada (qualquer cliente MCP)
  return (
    <svg {...common} stroke={C.glyphOther} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0V8zM12 17v4" />
    </svg>
  )
}
