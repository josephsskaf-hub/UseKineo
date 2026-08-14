'use client'

// ONDA4 #4 (14/08) — a pagina que E o loop viral nao tinha botao de
// compartilhar: quem recebia o link no WhatsApp nao tinha como repassa-lo, e o
// loop morria no primeiro salto. navigator.share no celular, copy-link no
// desktop — sempre preservando os params de atribuicao da URL atual.
import { useState } from 'react'

export default function ShareVideoButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        /* usuario cancelou — cai no copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard bloqueado — nada util a fazer */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      style={{
        display: 'inline-block',
        marginLeft: 10,
        background: 'transparent',
        color: '#2997ff',
        fontWeight: 800,
        padding: '13px 20px',
        borderRadius: 12,
        border: '1px solid rgba(41,151,255,0.45)',
        fontSize: '0.95rem',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Link copied' : 'Send to a friend'}
    </button>
  )
}
